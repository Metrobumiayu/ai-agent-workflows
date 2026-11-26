import json, glob, os
def load(p):
    try: return json.load(open(p))
    except Exception as e: return {'_err': str(e)[:100]}
old, new = '1147', '1217'
me_o, me_n = load(f'20261126-{old}-me.json'), load(f'20261126-{new}-me.json')
def entries(m):
    d = m.get('data') if isinstance(m, dict) else None
    if isinstance(d, dict): return d.get('entries') or d.get('submissions') or []
    return m.get('entries') or m.get('submissions') or [] if isinstance(m, dict) else []
eo, en = entries(me_o), entries(me_n)
print('ME keys old:', sorted(me_o.keys()) if isinstance(me_o,dict) else type(me_o))
print('ME keys new:', sorted(me_n.keys()) if isinstance(me_n,dict) else type(me_n))
print('me identical:', me_o == me_n)
if me_o != me_n:
    import difflib
    print('old entry ids:', [e.get('id') for e in eo][:40])
    print('new entry ids:', [e.get('id') for e in en][:40])
    print('old count field:', {k:v for k,v in me_o.items() if 'count' in str(k).lower() or 'earning' in str(k).lower()})
    print('new count field:', {k:v for k,v in me_n.items() if 'count' in str(k).lower() or 'earning' in str(k).lower()})
w_o, w_n = load(f'20261126-{old}-wallets.json'), load(f'20261126-{new}-wallets.json')
print('wallets identical:', w_o == w_n)
a_o, a_n = load(f'20261126-{old}-agents-me.json'), load(f'20261126-{new}-agents-me.json')
print('agents-me identical:', a_o == a_n)
if a_o != a_n:
    def oc(a):
        d=a.get('data',a) if isinstance(a,dict) else {}
        return d.get('open_competitions') or d.get('openCompetitions') or []
    oo, nn = oc(a_o), oc(a_n)
    print('open count old/new:', len(oo), len(nn))
    so={c.get('slug') or c.get('id') for c in oo}; sn={c.get('slug') or c.get('id') for c in nn}
    print('opened:', sorted(sn-so)); print('closed:', sorted(so-sn))
    # announcements
    def ann(a):
        d=a.get('data',a) if isinstance(a,dict) else {}
        return d.get('announcements') or []
    ao, an = ann(a_o), ann(a_n)
    print('announcements old/new:', len(ao), len(an))
    if len(an)!=len(ao): print('new ann:', an[len(ao):])
# competitions list slugs
def slugs(stamp):
    out=set(); tot=0
    for f in sorted(glob.glob(f'20261126-{stamp}-competitions*.json')):
        d=load(f)
        items = d.get('items') or d.get('competitions') or d.get('data') or []
        if isinstance(items, dict): items = items.get('items') or []
        for it in items:
            if isinstance(it, dict):
                out.add(it.get('slug') or it.get('id'))
                tot+=1
    return out, tot
so, to = slugs(old); sn, tn = slugs(new)
print('competitions slugs old/new:', len(so), len(sn), 'items', to, tn)
print('new slugs:', sorted(sn-so)); print('gone slugs:', sorted(so-sn))
