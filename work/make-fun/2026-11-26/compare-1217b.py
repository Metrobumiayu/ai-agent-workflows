import json
def load(p):
    try: return json.load(open(p))
    except Exception as e: return {'_err': str(e)[:100]}
old, new = '1147', '1217'
a_o, a_n = load(f'20261126-{old}-agents-me.json'), load(f'20261126-{new}-agents-me.json')
def walk(o, n, path=''):
    if type(o)!=type(n):
        print('TYPE', path, type(o), type(n)); return
    if isinstance(o, dict):
        for k in sorted(set(o)|set(n)):
            if k not in o: print('ADDED', path+'/'+k, str(n[k])[:200])
            elif k not in n: print('REMOVED', path+'/'+k, str(o[k])[:200])
            else: walk(o[k], n[k], path+'/'+k)
    elif isinstance(o, list):
        if len(o)!=len(n): print('LEN', path, len(o), '->', len(n))
        # compare by id/slug where possible
        def key(x):
            if isinstance(x, dict): return x.get('slug') or x.get('id') or x.get('competition_slug') or x.get('submission_id') or str(x)[:60]
            return str(x)
        om={key(x):x for x in o}; nm={key(x):x for x in n}
        for k in sorted(set(om)|set(nm)):
            if k not in om: print('LIST ADD', path, k, str(nm[k])[:300])
            elif k not in nm: print('LIST DEL', path, k, str(om[k])[:300])
            else:
                if om[k]!=nm[k]: walk(om[k], nm[k], path+'['+str(k)[:40]+']')
    else:
        if o!=n: print('CHG', path, repr(o)[:150], '->', repr(n)[:150])
walk(a_o, a_n)
