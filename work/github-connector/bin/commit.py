#!/usr/bin/env python3
"""Push the local clone's new/modified/deleted files as ONE commit via the
GitHub Git Data API (no git push needed — SSH is blocked on this VM, and
the API goes over HTTPS through the proxy).

Usage: commit.py <clone-dir> <commit-message>

- Reads `git status --porcelain` in the clone for changed paths.
- Text files under 1 MiB become blobs (base64); anything bigger, binary,
  or unreadable is skipped and reported, never committed.
- Creates blobs -> tree (on top of the base tree) -> commit -> updates
  refs/heads/main, all as Metrobumiayu via the noreply address so GitHub
  attributes the commit to the account.
- Exits 0 with "no changes" when there is nothing to commit.

The credential never appears in this file, in arguments, or in logs: it
reaches requests only as a surrogate that the runtime swaps for the real
token.
"""
import base64
import json
import subprocess
import sys
import urllib.request

sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import add_surrogate_to_request, read_json_response

OWNER = "Metrobumiayu"
REPO = "ai-agent-workflows"
BRANCH = "main"
AUTHOR = {"name": "Metrobumiayu", "email": "103846260+Metrobumiayu@users.noreply.github.com"}
MAX_BYTES = 1 * 1024 * 1024


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        raise RuntimeError("redirect refused, verify the endpoint")


def api(method, path, payload=None):
    body = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(
        f"https://api.github.com{path}",
        data=body,
        method=method,
        headers={
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "muse-custom-github",
        },
    )
    add_surrogate_to_request(request, "custom.github", allowed_hosts=["api.github.com"])
    with urllib.request.build_opener(NoRedirect()).open(request, timeout=60) as response:
        return read_json_response(response)


def git_status(clone_dir):
    out = subprocess.run(
        ["git", "-C", clone_dir, "status", "--porcelain", "-uall", "--", "."],
        capture_output=True, text=True, check=True,
    ).stdout
    entries = []
    for line in out.splitlines():
        if not line.strip():
            continue
        code = line[:2]
        path = line[3:].strip().strip('"')
        if " -> " in path:  # rename: take the new path
            path = path.split(" -> ", 1)[1].strip().strip('"')
        entries.append((code, path))
    return entries


def main():
    clone_dir, message = sys.argv[1], sys.argv[2]
    ref = api("GET", f"/repos/{OWNER}/{REPO}/git/ref/heads/{BRANCH}")
    base_commit_sha = ref["object"]["sha"]
    base_commit = api("GET", f"/repos/{OWNER}/{REPO}/git/commits/{base_commit_sha}")
    base_tree_sha = base_commit["tree"]["sha"]

    changed = git_status(clone_dir)
    tree_entries = []
    skipped = []
    for code, path in changed:
        if "D" in code:
            tree_entries.append({"path": path, "mode": "100644", "type": "blob", "sha": None})
            continue
        try:
            with open(f"{clone_dir}/{path}", "rb") as f:
                data = f.read()
        except (OSError, UnicodeError):
            skipped.append(path)
            continue
        if len(data) > MAX_BYTES or b"\x00" in data[:8192]:
            skipped.append(path)
            continue
        blob = api("POST", f"/repos/{OWNER}/{REPO}/git/blobs",
                   {"content": base64.b64encode(data).decode(), "encoding": "base64"})
        tree_entries.append({"path": path, "mode": "100644", "type": "blob", "sha": blob["sha"]})

    if not tree_entries:
        print(json.dumps({"result": "no changes", "skipped": skipped}))
        return

    tree = api("POST", f"/repos/{OWNER}/{REPO}/git/trees",
               {"base_tree": base_tree_sha, "tree": tree_entries})
    commit = api("POST", f"/repos/{OWNER}/{REPO}/git/commits",
                 {"message": message, "tree": tree["sha"],
                  "parents": [base_commit_sha], "author": AUTHOR, "committer": AUTHOR})
    api("PATCH", f"/repos/{OWNER}/{REPO}/git/refs/heads/{BRANCH}",
        {"sha": commit["sha"], "force": False})
    print(json.dumps({"result": "committed", "sha": commit["sha"],
                      "url": commit.get("html_url"), "files": len(tree_entries),
                      "skipped": skipped}, indent=2))


if __name__ == "__main__":
    main()
