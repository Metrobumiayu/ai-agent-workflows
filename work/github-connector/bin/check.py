#!/usr/bin/env python3
"""Harmless read to verify the stored GitHub credential (custom.github).

GET /user confirms the authenticated identity; GET the repo confirms
read access to Metrobumiayu/ai-agent-workflows. The credential never
appears in this file, in arguments, or in logs: it reaches the request
only as a surrogate that the runtime swaps for the real token.
"""
import json
import sys
import urllib.request

sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import add_surrogate_to_request, read_json_response


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        raise RuntimeError("redirect refused, verify the endpoint")


def get(path):
    request = urllib.request.Request(
        f"https://api.github.com{path}",
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "muse-custom-github",
        },
    )
    add_surrogate_to_request(request, "custom.github", allowed_hosts=["api.github.com"])
    with urllib.request.build_opener(NoRedirect()).open(request, timeout=30) as response:
        return read_json_response(response)


def main():
    user = get("/user")
    repo = get("/repos/Metrobumiayu/ai-agent-workflows")
    print(json.dumps({
        "login": user.get("login"),
        "id": user.get("id"),
        "repo": repo.get("full_name"),
        "default_branch": repo.get("default_branch"),
        "private": repo.get("private"),
        "permissions": repo.get("permissions"),
    }, indent=2))


if __name__ == "__main__":
    main()
