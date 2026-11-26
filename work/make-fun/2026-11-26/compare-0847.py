import json, os, re, sys
base = '/home/hatch/workspace/make-fun/2026-11-26/'
def read(f):
    try:
        with open(base+f) as fh: return fh.read()
    except Exception: return None
def J(f):
    t = read(f)
    if t is None: return None
    try: return json.loads(t)
    except Exception: return {'__raw__': t[:200]}
def short(v, n=160):
    s = json.dumps(v, ensure_ascii=False)
    return s if len(s) <= n else s[:n] + '...[trunc]'

# 1. account files
for f in ['me.json','wallets.json','agents-me.json']:
    a, b = read(f'20261126-0847-{f}'), read(f'20261126-0817-{f}')
    print(f, ':', 'IDENTICAL' if a==b else ('MISSING' if a is None or b is None else 'DIFFERS'))

# 2. competitions list
def listmap(stamp):
    m = {}
    for p in ['','-p2','-p3','-p4','-p5','-p6']:
        j = J(f'20261126-{stamp}-competitions{p}.json')
        if not j: continue
        for c in (j.get('competitions') or j.get('items') or j.get('data') or []):
            m[c.get('slug') or c.get('id')] = c
    return m
m47, m17 = listmap('0847'), listmap('0817')
print('competitions slugs: 0817=%d 0847=%d' % (len(m17), len(m47)))
for s in sorted(set(m47)-set(m17)): print('NEW SLUG:', s)
for s in sorted(set(m17)-set(m47)): print('GONE SLUG:', s)
keys = ['status','winner','winner_handle','prizesPaid','submissionCount','acceptingSubmissions','resolvedAt','announcement']
for slug, c in sorted(m47.items()):
    o = m17.get(slug)
    if not o: continue
    d = []
    for k in keys:
        if json.dumps(c.get(k)) != json.dumps(o.get(k)):
            d.append(f'{k}: {short(o.get(k))} -> {short(c.get(k))}')
    # payouts length
    pa, pb = c.get('payouts'), o.get('payouts')
    if isinstance(pa, list) and isinstance(pb, list) and len(pa) != len(pb):
        d.append(f'payouts len: {len(pb)} -> {len(pa)}')
    if d: print('LIST-DIFF', slug, '::', ' | '.join(d))

# 3. detail files: scalar key diffs only
detkeys = ['status','winner','winner_handle','prizesPaid','submissionCount','acceptingSubmissions','resolvedAt']
for f in sorted(os.listdir(base)):
    if not f.startswith('20261126-0847-detail-'): continue
    old = f.replace('0847','0817')
    if read(old) is None:
        print('NEW DETAIL FILE:', f); continue
    a, b = J(f), J(old)
    if a == b: continue
    d = []
    for k in detkeys:
        if json.dumps((a or {}).get(k)) != json.dumps((b or {}).get(k)):
            d.append(f'{k}: {short((b or {}).get(k))} -> {short((a or {}).get(k))}')
    pa, pb = (a or {}).get('payouts'), (b or {}).get('payouts')
    if isinstance(pa, list) and isinstance(pb, list) and len(pa) != len(pb):
        d.append(f'payouts len: {len(pb)} -> {len(pa)}')
    print('DETAIL-DIFF', f, '::', ' | '.join(d) if d else '(other fields only)')

# 4. substatus/results/rounds: scalar diffs, arrays summarized by length
def flat(o, pre='', acc=None):
    if acc is None: acc = {}
    if isinstance(o, dict):
        for k, v in o.items(): flat(v, pre+k+'.', acc)
    elif isinstance(o, list):
        acc[pre[:-1]] = f'<array len {len(o)}>'
    else:
        acc[pre[:-1]] = o
    return acc
for f in sorted(os.listdir(base)):
    if not (f.startswith('20261126-0847-') and ('substatus' in f or 'results-' in f or 'rounds-' in f)): continue
    old = f.replace('0847','0817')
    if read(old) is None:
        print('NEW FILE:', f); continue
    a, b = J(f), J(old)
    if a == b: continue
    fa, fb = flat(a), flat(b)
    d = []
    for k in sorted(set(fa) | set(fb)):
        if json.dumps(fa.get(k)) != json.dumps(fb.get(k)):
            d.append(f'{k}: {short(fb.get(k),120)} -> {short(fa.get(k),120)}')
    print('EXTRA-DIFF', f, '::', ' | '.join(d[:15]), ('... +%d more' % (len(d)-15)) if len(d)>15 else '')

# 5. leaderboard rank checks for our entries (parse JSON)
ours = {
 '01a1eb9c-fa66-7142-9a92-53b5f81e0332':'chess-v4',
 '01a211f6-c0c7-71eb-a714-98c229815e49':'?',
 '01a20ba8-cab0-76f2-9430-3cb3935ee4f8':'?',
 '01a201a4-baf8-71b0-80e9-f792e5f47765':'tsvm',
 '01a203c1-9562-755e-a72f-b06fd6002bf5':'?',
 '01a204b1-68ce-70f6-8c52-1e6b71e90d0f':'card',
 '01a1fd7b-c971-712d-954d-07d29eebd68c':'?',
 '01a1fc27-ed66-74b3-9189-1b679618ddb8':'?',
 '01a1ed4b-81d2-7374-84b2-8594a38ca982':'gta6-v4',
 '01a1e974-7842-76d1-aa3f-81450100e186':'gta6-v2',
}
def lb_ranks(stamp):
    out = {}
    for f in sorted(os.listdir(base)):
        if not (f.startswith(f'20261126-{stamp}-') and 'leaderboard' in f): continue
        j = J(f)
        if not j: continue
        entries = j.get('entries') or j.get('leaderboard') or j.get('submissions') or []
        if isinstance(entries, dict): entries = entries.get('entries') or []
        for e in entries:
            if isinstance(e, dict) and e.get('id') in ours:
                out[(f, e['id'])] = e.get('rank')
    return out
r47, r17 = lb_ranks('0847'), lb_ranks('0817')
for k in sorted(set(r47)|set(r17)):
    if r47.get(k) != r17.get(k):
        print('LB-RANK', k[0].replace('20261126-0847-',''), ours.get(k[1],'?'), k[1][:8], ':', r17.get(k), '->', r47.get(k))
print('LB rank check done; total our-entry rows 0817=%d 0847=%d' % (len(r17), len(r47)))
