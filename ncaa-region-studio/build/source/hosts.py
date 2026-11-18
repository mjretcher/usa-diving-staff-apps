# Zone meet host sites 2015-2027. Years from divemeets.meets (2015-2026) and the NCAA's 2027 dates-and-sites sheet.
# sid = school id when the site is that school's campus pool; off-campus venues carry their own coordinates.
from schools import S
H = [
 ("buffalo","Buffalo",2150,None,"Zone A 2015"),
 ("navy","Navy",2595,None,"Zone A 2016, 2019, 2022, 2026"),
 ("christiansburg","Christiansburg Aquatic Center (Virginia Tech)",None,("Christiansburg","VA",37.14,-80.40),"Zone A 2017"),
 ("rutgers","Rutgers",2757,None,"Zone A 2018, 2025"),
 ("wvu","West Virginia (Mylan Park)",2750,None,"Zone A 2020, 2023, 2027"),
 ("greensboro","Greensboro Aquatic Center",None,("Greensboro","NC",36.06,-79.83),"Zones A and B 2021"),
 ("princeton","Princeton",2491,None,"Zone A 2024"),
 ("georgia","Georgia",2168,None,"Zone B 2015, 2020, 2024, 2026"),
 ("gatech","Georgia Tech",2861,None,"Zone B 2016, 2022"),
 ("auburn","Auburn",2300,None,"Zone B 2017, 2019, 2025"),
 ("tennessee","Tennessee",2598,None,"Zone B 2018, 2023, 2027"),
 ("ohiostate","Ohio State",2275,None,"Zone C 2015, 2018, 2025"),
 ("purdue","Purdue",2142,None,"Zone C 2016, 2019, 2027"),
 ("indiana","Indiana",1136,None,"Zone C 2017, 2023"),
 ("kentucky","Kentucky",2306,None,"Zone C 2020, 2021; Zone D 2021"),
 ("michigan","Michigan",2358,None,"Zone C 2022"),
 ("louisville","Louisville",2304,None,"Zone C 2024"),
 ("emu","Eastern Michigan",2365,None,"Zone C 2026"),
 ("iowa","Iowa",2276,None,"Zone D 2015, 2025"),
 ("tamu","Texas A&M",2693,None,"Zone D 2016, 2026"),
 ("missouri","Missouri",2572,None,"Zone D 2017"),
 ("minnesota","Minnesota",2151,None,"Zone D 2018, 2023"),
 ("texas","Texas",4141,None,"Zone D 2019, 2027"),
 ("smu","SMU",2701,None,"Zone D 2020"),
 ("wisconsin","Wisconsin",2360,None,"Zone D 2022"),
 ("houston","Houston",2416,None,"Zone D 2024"),
 ("airforce","Air Force",2569,None,"Zone E 2015"),
 ("nau","Northern Arizona",2949,None,"Zone E 2016 to 2019, 2021, 2022, 2024, 2026, 2027"),
 ("federalway","King County Aquatic Center, Federal Way",None,("Federal Way","WA",47.31,-122.31),"Zone E 2020, 2023, 2025"),
]
def hosts():
    out=[]
    for k,n,sid,loc,y in H:
        if sid: _,c,s,la,lo=S[sid]
        else: c,s,la,lo=loc
        out.append(dict(k=k,n=n,c=c,s=s,la=la,lo=lo,y=y,sid=sid))
    return out
if __name__=='__main__':
    import re
    n=0
    for h in hosts():
        for part in h['y'].split(';'):
            yrs=re.findall(r'\d{4}',part); m=re.search(r'(\d{4}) to (\d{4})',part)
            c=len(yrs)+(int(m.group(2))-int(m.group(1))-1 if m else 0)
            n+=c*(2 if 'Zones A and B' in part else 1)
    print('host sites',len(H),'zone-meet years covered',n,'(expected 65: 13 seasons x 5 zones)')
