#!/usr/bin/env python3
"""
Read the published Regionals -> Zones "Qualifying Score" for every event from the
DiveMeets zone qualifier pages (qualify-<year>-summer-JO[-new].php?zone=A..F) and
write db/seeds/divemeets_zone_bars_<year>.json. The bar is national per event,
so every zone page should show the same value for an event; any disagreement is
reported and the file is not written.
"""
import json, re, sys, urllib.request

year = sys.argv[1]
pages = [f"https://secure.meetcontrol.com/divemeets/system/qualify-{year}-summer-JO-new.php?zone={z}" for z in "ABCDEF"] \
      + [f"https://secure.meetcontrol.com/divemeets/system/qualify-{year}-summer-JO.php?zone={z}" for z in "ABCDEF"]
pat = re.compile(r"(Group [A-D] (?:Boys|Girls) (?:1m|3m|Platform)[^<]*)</(?:strong|b)>.{0,400}?Qualifying Score\*?:\s*([0-9]+(?:\.[0-9]+)?)", re.S | re.I)
bars, seen, conflicts = {}, {}, []
for url in pages:
    try:
        html = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=60).read().decode("utf-8", "replace")
    except Exception as e:
        print("skip", url, e); continue
    found = pat.findall(html)
    print(url, len(found), "events")
    for name, val in found:
        m = re.match(r"Group ([A-D]) (Boys|Girls) (1m|3m|Platform)", name)
        key = f"Group {m.group(1)} {m.group(2)} {m.group(3).upper() if m.group(3) != 'Platform' else 'Platform'}"
        v = float(val)
        if key in bars and abs(bars[key] - v) > 1e-6:
            conflicts.append((key, bars[key], v, url))
        bars.setdefault(key, v); seen.setdefault(key, []).append(url.split("?")[1])
print(json.dumps(bars, indent=1, sort_keys=True))
if conflicts:
    print("CONFLICTS", conflicts); sys.exit(1)
if not bars:
    sys.exit("no bars found")
json.dump({"year": int(year), "source": pages[0].replace("zone=A", "zone=<A-F>"), "bars": bars,
           "zones_seen": seen}, open(f"db/seeds/divemeets_zone_bars_{year}.json", "w"), indent=1, sort_keys=True)
