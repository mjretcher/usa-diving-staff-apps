import json
REG=['East','Great Lakes','Midwest','South','West']
def by_state(spec):
    m={}
    for r,sts in spec.items():
        for s in sts.split(): m[s]=r
    return m
JULY=by_state({'East':'CT DC DE MD MA NJ NC SC VA RI','Great Lakes':'KY ME MI NH OH PA TN VT NY WV',
  'Midwest':'AR IL IN IA KS MN MO NE SD ND WI','South':'AL FL GA LA MS OK TX','West':'AK AZ CA CO HI ID MT NV NM OR UT WA WY'})
E_NY=[2724,2353,2730,2749,2746,2762]   # Final proposal received 2026-11-21 (same boundaries as the July 2026 draft). Fordham, Columbia, Iona, Army, Stony Brook, Wagner (the proposal's E New York list; Manhattan has no zone results)
PRESETS={
 'current':dict(label='Current zones A to E',names=['Zone A','Zone B','Zone C','Zone D','Zone E'],states=None,over={}),
 'july':dict(label='NCAA region proposal, final version',names=REG,states=JULY,over={**{str(i):'East' for i in E_NY},'2304':'Midwest'}),
}
if __name__=='__main__':
    d=json.load(open('data.json')); Z=d['zoneByState']
    for key,p in PRESETS.items():
        st=p['states'] or {s:'Zone '+z for s,z in Z.items()}
        tot={n:[0,0,0,0,0,0,0] for n in p['names']}
        for s in d['schools']:
            r=p['over'].get(str(s['id'])) or st[s['s']]
            t=tot[r]; t[0]+=sum(s['w'][-3:])/3; t[1]+=sum(s['m'][-3:])/3; t[2]+=s['w'][-1]; t[3]+=s['m'][-1]
            t[4]+=s['e']['W1m'][-1]; t[5]+=s['e']['M1m'][-1]; t[6]+= 1 if (sum(s['w'][-3:])+sum(s['m'][-3:]))>0 else 0
        print('\n'+p['label']); print(f"{'':14s}  W avg  M avg | W 2026  M 2026 | W 1m 2026  M 1m 2026 | schools")
        for n,t in tot.items(): print(f'{n:14s} {t[0]:6.1f} {t[1]:6.1f} | {t[2]:6d} {t[3]:6d} | {t[4]:9d} {t[5]:9d} | {t[6]:5d}')
        w=[t[0] for t in tot.values()]; m=[t[1] for t in tot.values()]
        print(f"women largest {max(w):.1f} smallest {min(w):.1f} gap {max(w)-min(w):.1f} | men largest {max(m):.1f} smallest {min(m):.1f} gap {max(m)-min(m):.1f}")
