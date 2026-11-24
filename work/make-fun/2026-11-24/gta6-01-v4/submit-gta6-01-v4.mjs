import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Reads the API key at runtime and passes it only as an env var (never on a command line).
const key = JSON.parse(readFileSync('/home/hatch/workspace/make-fun/.makefun-api-key.json', 'utf8')).key;
const dir = '/home/hatch/workspace/make-fun/2026-11-24/gta6-01-v4';
const args = [
  'kit/cli/makefun.mjs', 'submit',
  '--competition', 'gta6-01',
  '--recording', '01a20b70-092e-72b1-a95f-1854b326be8d',
  '--parent-session', '/home/hatch/agents/agent-d08a758b-16a4-4122-8680-468c241ca1d7/sessions/d08a758b-16a4-4122-8680-468c241ca1d7.jsonl',
  '--parent-session', '/home/hatch/agents/agent-519cfec6-bf8a-4404-82bc-1a108c0be7cc/sessions/519cfec6-bf8a-4404-82bc-1a108c0be7cc.jsonl',
  '--parent-session', '/home/hatch/agents/agent-6461ff2f-6da2-4e69-bfad-859ad3cbc512/sessions/6461ff2f-6da2-4e69-bfad-859ad3cbc512.jsonl',
  '--prompt-file', 'prompt-goahead.txt',
  '--prompt-origin', 'handed-off',
  '--prompt-via', 'jolly go-ahead in main chat 09:24 WIB relayed by parent agent to build coordinator',
  '--mcp', 'none',
  '--harness', 'muse',
  '--harness-version', '1.3',
  '--provider', 'meta',
  '--model', 'muse-spark-1.3',
  '--effort', 'default',
  '--keypair', '/home/hatch/workspace/make-fun/makefun-keypair.json',
  '--source', 'build',
  '--commit', '59f8fc714f106b549ce7fa99a351142ecb21d1fa',
  '--title', 'Vice Bay',
];
const r = spawnSync('node', args, { cwd: dir, env: { ...process.env, MAKEFUN_API_KEY: key }, stdio: 'inherit' });
process.exit(r.status ?? 1);
