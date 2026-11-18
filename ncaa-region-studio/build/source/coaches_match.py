# Match the 2026-27 coaches list (Mike's file) to the school table built from zone results.
import json, re, sys
sys.path.insert(0,'.')
from schools import S, ZONE_BY_STATE
L=json.load(open('coaches_status.json'))   # institution, zone, conference, no-diving flag only: no coach names or emails
ALIAS={  # list name -> team id
'Duquesne University':2722,'Fordham University':2724,'George Mason University':2596,'George Washington University':2725,'La Salle University':2731,
'Massachusetts, Amherst':2738,'Rhode Island':2741,'Richmond':2875,'St. Bonaventure University':2743,'Boston College':2713,'Pittsburgh':2303,'Virginia':2868,
'Virginia Polytechnic Institute & State University':2380,'Binghamton University':2712,'Maine, Orono':2735,'Maryland, Baltimore County':2737,'Vermont':2761,
'Bryant University':2896,'Liberty University':5431,'Connecticut':2718,'Georgetown University':2726,'Providence College':2740,'Seton Hall University':2742,
'Villanova University':2284,'Pennsylvania State University':2359,'Rutgers, State University of New Jersey, New Brunswick':2757,'West Virginia University':2750,
'Delaware':2720,'Drexel University':2721,'Northeastern University':2756,'Towson University':2748,'Stony Brook':2746,'Brown University':2714,
'Columbia University-Barnard College':2353,'Cornell University':2719,'Dartmouth College':2599,'Harvard University':2727,'Pennsylvania':2348,'Princeton University':2491,
'Yale University':2752,'Canisius College':2716,'Fairfield University':2723,'Iona College':2730,'Marist College':2736,'Niagara University':2739,'Rider University':2141,
'Siena College':2759,'University at Buffalo, the State University of New York':2150,'Central Connecticut State University':2500,'Sacred Heart University':2758,
'Wagner College':2762,'Howard University':2729,'American University':2711,'Boston University':2392,'Bucknell University':2715,'Colgate University':2717,
'College of the Holy Cross':2728,'Lafayette College':2732,'Lehigh University':2733,'Loyola University Maryland':2734,'U.S. Military Academy':2749,'U.S. Naval Academy':2595,
'James Madison University':2422,'Old Dominion University':2867,'Marshall University':2354,'Davidson College':2857,'East Carolina University':2859,
'Florida Atlantic University':1376,'Florida International University':2131,'Duke University':2858,'Florida State University':2289,'Georgia Institute of Technology':2861,
'Miami (Florida)':1102,'North Carolina State University':2864,'North Carolina, Chapel Hill':2865,'Florida Gulf Coast University':2585,'North Carolina, Wilmington':2866,
'Alabama':2278,'Auburn University':2300,'Florida':2575,'Georgia':2168,'South Carolina, Columbia':2280,'Tennessee, Knoxville':2598,'Georgia Southern University':2152,
'Louisville':2304,'Notre Dame':2277,'Illinois, Champaign':2578,'Indiana University, Bloomington':1136,'Michigan':2358,'Northwestern University':2287,'Purdue University':2142,
'The Ohio State University':2275,'Cincinnati':2363,'Cleveland State University':2308,'Indiana University - Indianapolis':9801,'Oakland University':2368,
'Youngstown State University':2593,'Akron':2386,'Ball State University':2361,'Bowling Green State University':2283,'Eastern Michigan University':2365,
'Miami University (Ohio)':2296,'Ohio University':2369,'Toledo':2301,'Illinois State University':2347,'Indiana State University':7767,'Evansville':2366,
'Illinois at Chicago':2367,'Southern Illinois University at Carbondale':2381,'Kentucky':2306,'Southern Indiana University':8667,'Saint Louis University':2692,
'North Texas':2376,'UTRGV':9797,'Rice University':2700,'Southern Methodist University':2701,'Tulane University':3559,'Houston':2416,'Iowa State University':2597,
'Iowa':2276,'Minnesota, Twin Cities':2151,'Nebraska, Lincoln':2698,'Wisconsin, Madison':2360,'Kansas':2697,'Texas at Austin':4141,'Texas Christian University':2694,
'Wisconsin-Green Bay':2372,'Wisconsin, Milwaukee':2373,'University of the Incarnate Word':8363,'Arkansas at Little Rock':2696,'Northern Iowa':2699,
'Missouri State University':2355,'Arkansas, Fayetteville':2695,'Louisiana State University':2862,'Missouri, Columbia':2572,'Texas A&M University, College Station':2693,
'Nebraska Omaha':2351,'South Dakota':2681,'South Dakota State University':2682,'Brigham Young University':2933,'California State University, Bakersfield':2688,
'California, Davis':2936,'Hawaii, Manoa':2143,'Pacific':2940,'Pepperdine University':2415,'San Diego':2951,'Colorado State University':2944,'Nevada':2947,
'New Mexico':2411,'San Diego State University':2952,'San Jose State University':2953,'Nevada, Las Vegas':2939,'U.S. Air Force Academy':2569,'Wyoming':2588,
'California State University, Fresno':3561,'Arizona':2932,'Arizona State University':2279,'California, Berkeley':2568,'California, Los Angeles':2574,
'Southern California':2941,'Stanford University':2305,'Utah':2282,'Denver':2281,'Cal Baptist University':5430,'Grand Canyon University':2901,'Idaho':2945,
'New Mexico State University':2948,'Northern Arizona University':2949,'Northern Colorado':2579,
}
NEW={  # on the list, never at a zone meet 2015-2026: (short name, city, state, lat, lon)
'New Hampshire':("New Hampshire","Durham","NH",43.13,-70.93),'New Jersey Institute of Technology':("NJIT","Newark","NJ",40.74,-74.18),
'Virginia Military Institute':("VMI","Lexington","VA",37.79,-79.44),'Mount St. Mary\'s University':("Mount St. Mary's","Emmitsburg","MD",39.68,-77.35),
'North Carolina, Asheville':("UNC Asheville","Asheville","NC",35.62,-82.57),'Saint Thomas':("St. Thomas","St. Paul","MN",44.94,-93.19),
'Monmouth University':("Monmouth","West Long Branch","NJ",40.28,-74.01),'College of William and Mary':("William & Mary","Williamsburg","VA",37.27,-76.71),
'Manhattan College':("Manhattan","Bronx","NY",40.89,-73.90),"Saint Peter's University":("Saint Peter's","Jersey City","NJ",40.73,-74.07),
'Long Island University-Brooklyn Campus':("LIU","Brooklyn","NY",40.69,-73.98),'Saint Francis University (Pennsylvania)':("Saint Francis (PA)","Loretto","PA",40.50,-78.64),
'North Florida':("North Florida","Jacksonville","FL",30.27,-81.51),'Gardner-Webb University':("Gardner-Webb","Boiling Springs","NC",35.25,-81.67),
'Campbell University':("Campbell","Buies Creek","NC",35.41,-78.74),'Vanderbilt University':("Vanderbilt","Nashville","TN",36.14,-86.80),
'Bellarmine':("Bellarmine","Louisville","KY",38.22,-85.70),'Butler University':("Butler","Indianapolis","IN",39.84,-86.17),'Xavier University':("Xavier","Cincinnati","OH",39.15,-84.47),
'Valparaiso University':("Valparaiso","Valparaiso","IN",41.46,-87.04),'Eastern Illinois University':("Eastern Illinois","Charleston","IL",39.48,-88.18),
'California, San Diego':("UC San Diego","La Jolla","CA",32.88,-117.23),'California, Santa Barbara':("UC Santa Barbara","Santa Barbara","CA",34.41,-119.85),
'Loyola Marymount University':("Loyola Marymount","Los Angeles","CA",33.97,-118.42),'Washington State University':("Washington State","Pullman","WA",46.73,-117.16),
'Seattle University':("Seattle U","Seattle","WA",47.61,-122.32),
}
CONF={'Big10':'Big Ten','Big 10':'Big Ten','Big12':'Big 12','AAC':'American','MW':'Mountain West','Pac12':'Pac-12','MAC/MVC':'MAC (women) / MVC (men)',
      'MW/WAC':'Mountain West (women) / WAC (men)','MW/Big West':'Mountain West','A10':'Atlantic 10','Ivy':'Ivy League','Patriot':'Patriot League',
      'Summit':'Summit League','Horizon':'Horizon League','MVC':'Missouri Valley','MAC':'MAC','NEC':'NEC','MAAC':'MAAC','CAA':'CAA','ASUN':'ASUN','MPSF':'MPSF',
      'America East':'America East','Big East':'Big East','ACC':'ACC','SEC':'SEC','Big 12':'Big 12','Big West':'Big West','Sun Belt':'Sun Belt',None:''}
def result():
    by_id={}; new=[]; unmatched=[]
    for o in L:
        nd=o['nodive']
        conf=CONF[o['conf']]
        if o['inst'] in ALIAS:
            by_id[ALIAS[o['inst']]]=dict(nodive=nd,conf=conf,zone=o['zone'])
        elif o['inst'] in NEW:
            n,c,s,la,lo=NEW[o['inst']]; new.append(dict(n=n,c=c,s=s,la=la,lo=lo,nodive=nd,conf=conf,zone=o['zone']))
        else: unmatched.append(o['inst'])
    return by_id,new,unmatched
if __name__=='__main__':
    by_id,new,un=result()
    print('list rows',len(L),'| matched to results',len(by_id),'| on list, never at zones',len(new),'| unmatched',un)
    assert len(set(ALIAS.values()))==len(ALIAS)
    for k,v in by_id.items():
        assert ZONE_BY_STATE[S[k][2]]==v['zone'],(S[k][0],v['zone'])
    for x in new: assert ZONE_BY_STATE[x['s']]==x['zone'],x
    print('zone on the list agrees with state for every school')
    d=json.load(open('../data.json')); D={s['id']:s for s in d['schools']}
    print('\nIn zone results but NOT on the 2026-27 list:')
    for k,(n,c,st,la,lo) in sorted(S.items(),key=lambda kv:kv[1][0]):
        if k not in by_id:
            s=D[k]; yrs=[y for y,(a,b) in zip(d['years'],zip(s['w'],s['m'])) if a+b>0]
            print(f"  {n} ({st}) last at zones {max(yrs)}, 2024-26 avg {sum(s['w'][-3:])/3:.1f} W / {sum(s['m'][-3:])/3:.1f} M")
    print('\nNO DIVING on the list but with zone results:')
    for k,v in by_id.items():
        if v['nodive']:
            s=D[k]; yrs=[y for y,(a,b) in zip(d['years'],zip(s['w'],s['m'])) if a+b>0]
            print(f"  {S[k][0]} last at zones {max(yrs)}, 2024-26 avg {sum(s['w'][-3:])/3:.1f} W / {sum(s['m'][-3:])/3:.1f} M")
    print('\nOn the list WITH diving, no zone divers 2015-2026:',[x['n'] for x in new if not x['nodive']])
    print('On the list with diving, no zone divers 2024-2026:',[S[k][0] for k,v in by_id.items() if not v['nodive'] and sum(D[k]['w'][-3:])+sum(D[k]['m'][-3:])==0])
    from collections import Counter
    c=Counter(); 
    for k,v in by_id.items(): c[(v['zone'],v['nodive'])]+=1
    for x in new: c[(x['zone'],x['nodive'])]+=1
    print('\nlist by zone (with diving / no diving):',{z:(c[(z,False)],c[(z,True)]) for z in 'ABCDE'})
