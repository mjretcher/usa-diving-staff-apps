import csv, json, collections, sys
sys.path.insert(0,'.')
from schools import S, MERGE, ZONE_BY_STATE
from coaches_match import result
from hosts import hosts
import optimize_adj
R=list(csv.DictReader(open('zone_results.csv')))   # pulled from Neon, see README; not committed
def ev(t):
    t=t.lower()
    if 'team event' in t: return None
    return ('W' if t.startswith('women') else 'M', '1m' if ' 1m' in t else '3m' if ' 3m' in t else 'PL')
YEARS=list(range(2015,2027)); SY=list(range(2022,2027)); EVS=('W1m','W3m','WPL','M1m','M3m','MPL')
div=collections.defaultdict(set); evc=collections.Counter(); sc=collections.defaultdict(list)
for x in R:
    e=ev(x['title'])
    if not e or x['round']!='1': continue
    k=MERGE.get(int(x['team_id']),int(x['team_id'])); y=int(x['yr']); g,b=e
    div[(k,y,g)].add(x['profile_id']); evc[(k,y,g+b)]+=1
    if y>=2022: sc[(k,y,g+b)].append(round(float(x['score']),1))
by_id,new,_=result()
CONFIRMED={9877:'ASUN'}   # Queens University of Charlotte: not on the coaches list, confirmed by Mike
LEAVING={2365}   # Eastern Michigan: diving in 2026-27, no divers after (Susan Bromberg via Mike, 2026-11-21)
schools=[]
for k,(name,city,st,la,lo) in S.items():
    info=by_id.get(k)
    if k in CONFIRMED: info=dict(nodive=False,conf=CONFIRMED[k])   # Mike, 2026-11-18: treat as having diving
    status='on' if info and not info['nodive'] else 'nodive' if info else 'unlisted'
    if k in LEAVING and status=='on': status='leaving'
    schools.append(dict(id=k,n=name,c=city,s=st,la=la,lo=lo,cf=(info['conf'] if info else ''),st=status,
        w=[len(div.get((k,y,'W'),())) for y in YEARS], m=[len(div.get((k,y,'M'),())) for y in YEARS],
        e={c:[evc.get((k,y,c),0) for y in YEARS] for c in EVS},
        sc={c:[sorted(sc.get((k,y,c),[])) for y in SY] for c in EVS}))
nid=900001
for x in new:
    z=[0]*12
    schools.append(dict(id=nid,n=x['n'],c=x['c'],s=x['s'],la=x['la'],lo=x['lo'],cf=x['conf'],st=('nodive' if x['nodive'] else 'new'),
        w=z[:],m=z[:],e={c:z[:] for c in EVS},sc={c:[[] for _ in SY] for c in EVS})); nid+=1
schools.sort(key=lambda s:s['n'])
# checks
for s in schools:
    for c in EVS:
        for i,y in enumerate(SY): assert len(s['sc'][c][i])==s['e'][c][y-2015],(s['n'],c,y)
HY={'A':{2022:'navy',2023:'wvu',2024:'princeton',2025:'rutgers',2026:'navy'},'B':{2022:'gatech',2023:'tennessee',2024:'georgia',2025:'auburn',2026:'georgia'},
    'C':{2022:'michigan',2023:'indiana',2024:'louisville',2025:'ohiostate',2026:'emu'},'D':{2022:'wisconsin',2023:'minnesota',2024:'houston',2025:'iowa',2026:'tamu'},
    'E':{2022:'nau',2023:'federalway',2024:'nau',2025:'federalway',2026:'nau'}}
hk={h['k'] for h in hosts()}
for z in HY:
    for y,k in HY[z].items(): assert k in hk
zi={'A':0,'B':1,'C':2,'D':3,'E':4}
out=dict(years=YEARS,schools=schools,zone={s:zi[z] for s,z in ZONE_BY_STATE.items()},
         hostYears=[[HY[z][y] for y in SY] for z in 'ABCDE'],adj={a:sorted(b) for a,b in optimize_adj.ADJ.items()})
json.dump(out,open('../data.json','w'),separators=(',',':'))
print('schools',len(schools),'statuses',collections.Counter(s['st'] for s in schools),'bytes',len(open('../data.json').read()))
print('score rows 2022-26',sum(len(v) for v in sc.values()))
