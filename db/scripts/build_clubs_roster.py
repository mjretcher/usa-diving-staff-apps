"""Build boundary-studio/clubs-roster.json from a Webpoint club export.

Usage:  python3 db/scripts/build_clubs_roster.py <Webpoint club export .xls> [export date YYYY-MM-DD]

The Webpoint club export carries contact names, phone numbers, street
addresses, emails and coach names. NONE of that is written out: the repository
is public. Only the club's name, association, city, state, 5-digit ZIP,
country and membership end date are kept -- enough to place the club's pin.
Never commit the export itself.

ZIPs are read as text (Webpoint drops leading zeros when a sheet tool reads
them as numbers); 4- and 8-digit values get their leading zero back, ZIP+4 is
cut to 5 digits. A ZIP that does not exist is kept as written and flagged
(zip_valid=false) so the Clubs tab can say so instead of guessing.
"""
import json, re, sys, os
import pandas as pd

src = sys.argv[1]
exported = sys.argv[2] if len(sys.argv) > 2 else None
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.abspath(os.path.join(here, '..', '..'))
zips = json.load(open(os.path.join(root, 'boundary-studio', 'clubs-zip.json')))['zips']

KEEP = ['Club Name', 'Association', 'City', 'State', 'Zip', 'Country', 'Mem End Date']
d = pd.read_html(src, header=0, converters={c: str for c in KEEP})[0].fillna('')
d = d[KEEP]   # every other column (contacts, phones, addresses, emails) dropped here

def z5(z):
    s = re.sub(r'\D', '', z)
    if len(s) in (4, 8):
        s = '0' + s
    return s[:5] if len(s) >= 5 else ''

out = []
for _, r in d.iterrows():
    name = r['Club Name'].strip()
    if not name:
        continue
    z = z5(r['Zip'])
    out.append({
        'name': name, 'assoc': r['Association'].strip(), 'city': r['City'].strip(),
        'state': r['State'].strip().upper(), 'zip': z, 'zip_valid': z in zips,
        'country': r['Country'].strip(), 'mem_end': r['Mem End Date'].strip(),
    })
names = [c['name'] for c in out]
assert len(names) == len(set(names)), 'duplicate club names in export'
doc = {'source': os.path.basename(src), 'exported': exported, 'clubs': sorted(out, key=lambda c: c['name'].lower())}
json.dump(doc, open(os.path.join(root, 'boundary-studio', 'clubs-roster.json'), 'w'), separators=(',', ':'))
bad = [c for c in out if not c['zip_valid']]
print(f'{len(out)} clubs written; {len(bad)} with a ZIP that does not exist:', [(c['name'], c['zip']) for c in bad])
