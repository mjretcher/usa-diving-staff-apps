#!/usr/bin/env python3
"""
Zoho Analytics open-view client for scoresandmore.live (Dive Live / AAU).

scoresandmore.live is a WordPress shell around public Zoho Analytics "open
views". Each view is queryable with a SQL-like ZOHO_CRITERIA URL parameter.
Data is served as JSON by two endpoints (reverse-engineered 2026-07-17 via
Playwright network capture, see app_meta.config keys sm_pw_6925 /
sm_pw_event_37602):

  POST /reportsapi/AnalysisViewJSON?SUBREQUEST=XMLHTTP&_ZVER_=101
       body: OBJID=<view>&INCLUDEGRAPHAREA=true[&privatelink=<key>]&ZOHO_CRITERIA=<enc>
       -> column metadata: viewConfigJSON.ZAViewColInst[] with VCID + DISPLAY_NAME

  POST /ZDBReportAction.ma?ZDBACTION=SHOWREPORT&OBJID=<view>[&privatelink=<key>]
       &ZOHO_CRITERIA=<enc>&CONFIGASXML=true&SUBREQUEST=XMLHTTP&_ZVER_=101
       body: static XML <DBSVRequest><tvc cinfo='false' jt='1'><tvf></tvf></tvc></DBSVRequest>
       -> grid_param.dataColOrder (VCID order) + dataText rows + navigInfo counts

Cookies from a plain GET of the open-view page are required first. A
requests-based path is tried; on any failure the client falls back to headless
Chromium (Playwright), which replicates the browser exactly.

Known views (all belong to workspace/DBID 2617098000000138087):
  meets catalog   view 2617098000000741055 key 793da3400c28dc854eeb15d5cb31e6f2  table q_meets
  meet events     view 2617098000006333644 key None                              table q_meet_event_results
  event results   view 2617098000000747415 key 7b2ce79e8b26de608f192acdd4a52f6f  table q_event_result
  team points     view 2617098000014053579 key None                              table _team_points_from_schema
  coach points    view 2617098000014105060 key 75edfa47c54b0ff3dea7fbdf33228d8a  table _team_points_from_schema
"""
import html
import json
import re
import time
import urllib.parse

BASE = "https://analytics.zoho.com"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
SHOWREPORT_XML = ("<DBSVRequest >\n<tvc  cinfo='false'  jt='1' >\n<tvf >\n\n"
                  "</tvf>\n \n</tvc>\n \n</DBSVRequest>\n ")

VIEWS = {
    "meets":         {"view": "2617098000000741055", "key": "793da3400c28dc854eeb15d5cb31e6f2", "table": "q_meets"},
    "meet_events":   {"view": "2617098000006333644", "key": None,                               "table": "q_meet_event_results"},
    "event_results": {"view": "2617098000000747415", "key": "7b2ce79e8b26de608f192acdd4a52f6f", "table": "q_event_result"},
    "team_points":   {"view": "2617098000014053579", "key": None,                               "table": "_team_points_from_schema"},
    "coach_points":  {"view": "2617098000014105060", "key": "75edfa47c54b0ff3dea7fbdf33228d8a", "table": "_team_points_from_schema"},
}


def clean(v):
    """Normalize a raw Zoho cell value: &hyp; is Zoho's hyphen escape; then
    standard HTML entity unescape; nbsp -> space; strip."""
    if v is None:
        return None
    if not isinstance(v, str):
        return v
    v = v.replace("&hyp;", "-")
    v = html.unescape(v)
    v = v.replace("\xa0", " ").strip()
    return v if v != "" else None


class ZohoOpenView:
    """Fetches parsed rows (as dicts keyed by column DISPLAY_NAME) from one
    public Zoho Analytics open view."""

    def __init__(self, view_id, key=None):
        self.view_id = view_id
        self.key = key
        self._session = None          # requests.Session once primed
        self._requests_dead = False   # flip to True -> use Playwright forever
        self._pw = None               # (playwright, browser, context) tuple
        self._colnames = None         # VCID -> DISPLAY_NAME

    # ------------------------------------------------------------------ URLs
    def open_view_url(self, criteria):
        path = f"/open-view/{self.view_id}"
        if self.key:
            path += f"/{self.key}"
        return f"{BASE}{path}?ZOHO_CRITERIA={urllib.parse.quote(criteria, safe='')}"

    def _showreport_url(self, criteria):
        q = f"ZDBACTION=SHOWREPORT&OBJID={self.view_id}"
        if self.key:
            q += f"&privatelink={self.key}"
        q += (f"&ZOHO_CRITERIA={urllib.parse.quote(criteria, safe='')}"
              "&CONFIGASXML=true&SUBREQUEST=XMLHTTP&_ZVER_=101")
        return f"{BASE}/ZDBReportAction.ma?{q}"

    def _viewjson_body(self, criteria):
        body = f"OBJID={self.view_id}&INCLUDEGRAPHAREA=true"
        if self.key:
            body += f"&privatelink={self.key}"
        body += f"&ZOHO_CRITERIA={urllib.parse.quote(criteria, safe='')}"
        return body

    # ------------------------------------------------------- requests path
    def _req_session(self, criteria):
        import requests
        if self._session is None:
            s = requests.Session()
            s.headers.update({"User-Agent": UA,
                              "Accept-Language": "en-US,en;q=0.9"})
            r = s.get(self.open_view_url(criteria), timeout=60)
            r.raise_for_status()
            self._session = s
        return self._session

    def _fetch_requests(self, url, body, content_type):
        s = self._session
        r = s.post(url, data=body.encode(),
                   headers={"Content-Type": content_type,
                            "X-Requested-With": "XMLHttpRequest",
                            "Referer": f"{BASE}/open-view/{self.view_id}"},
                   timeout=90)
        r.raise_for_status()
        return r.json()

    # ------------------------------------------------------ playwright path
    def _pw_context(self):
        if self._pw is None:
            from playwright.sync_api import sync_playwright
            p = sync_playwright().start()
            browser = p.chromium.launch()
            ctx = browser.new_context(user_agent=UA)
            self._pw = (p, browser, ctx)
        return self._pw[2]

    def _fetch_playwright(self, criteria):
        """Load the open-view page in Chromium and capture the two JSON
        responses the client makes. Slow but exactly mirrors the browser."""
        ctx = self._pw_context()
        page = ctx.new_page()
        out = {"view": None, "report": None, "chart": None}

        def on_response(resp):
            u = resp.request.url
            try:
                if "AnalysisViewJSON" in u:
                    out["view"] = resp.json()
                elif "ZDBACTION=SHOWREPORT" in u:
                    out["report"] = resp.json()
                elif "ZAChartView.ve" in u:
                    out["chart"] = resp.json()
            except Exception:
                pass

        page.on("response", on_response)
        page.goto(self.open_view_url(criteria),
                  wait_until="domcontentloaded", timeout=60000)
        for _ in range(40):  # up to 20s
            if out["view"] is not None and (out["report"] is not None or out["chart"] is not None):
                break
            page.wait_for_timeout(500)
        page.close()
        if out["report"] is None and out["chart"] is None:
            raise RuntimeError(f"Playwright capture got no SHOWREPORT/ZAChartView for view {self.view_id}")
        return out

    def close(self):
        if self._pw:
            p, browser, _ = self._pw
            browser.close()
            p.stop()
            self._pw = None


    def chart_rows(self, criteria, dispname=""):
        """Fetch a chart-type open view (e.g. team/coach points pies) via
        ZAChartView.ve. Returns list of (label, value, raw_row) tuples from
        seriesdata.chartdata[0].data[0]."""
        crit_xml = criteria.replace("&", "&amp;").replace('"', "&quot;").replace("'", "&apos;")
        q = (f"CHARTVIEWACTION=CHARTVIEW&height=567&width=1278&legend=true"
             f"&OBJID={self.view_id}")
        if self.key:
            q += f"&privatelink={self.key}"
        q += ("&STANDALONE=true&EDITMODE=false&LP=LEFT&CHANGESLIDERBOUNDS=true"
              "&ISAXISDRILL=false&RESETSORT=true&FIELDSCHANGED=false"
              "&SUBREQUEST=XMLHTTP&_ZVER_=101")
        url = f"{BASE}/ZAChartView.ve?{q}"
        body = (f"<zadata  zoho_criteria='{crit_xml}' >\n"
                f"<dbobj   dispname='{dispname}'  desc=''  type='AnalysisView' >"
                "<zaav  gt='PIE'  sgt='DEF'  title=''  merge='true'  lp='LEFT'  "
                "lt=''  ltm='false'  lf='true'  cinfo='false'  jt='1' >"
                "<zavrfv  currentSelValue='{}'  currentChildSelValue='{}' />\n\n"
                "</zaav>\n <zataginfo >\n</zataginfo>\n \n</dbobj>\n \n</zadata>\n ")
        data = None
        if not self._requests_dead:
            try:
                self._req_session(criteria)
                data = self._fetch_requests(url, body, "text/plain; charset=UTF-8")
            except Exception as e:
                print(f"[sm_zoho] requests path failed for ZAChartView "
                      f"({e!r}); falling back to Playwright")
                self._requests_dead = True
        if data is None:
            data = self._fetch_playwright(criteria)["chart"]
            if data is None:
                raise RuntimeError(f"no ZAChartView captured for view {self.view_id}")
        series = data["chartJSON"]["seriesdata"]["chartdata"]
        if not series:
            return []
        rows = series[0].get("data") or []
        flat = rows[0] if rows and isinstance(rows[0], list) and rows[0] and isinstance(rows[0][0], list) else rows
        out = []
        for r in flat:
            label = clean(r[0]) if r else None
            value = r[1] if len(r) > 1 else None
            out.append((label, value, r))
        return out

    # ----------------------------------------------------------- public API
    def columns(self, criteria):
        """VCID -> DISPLAY_NAME map (fetched once per view)."""
        if self._colnames is not None:
            return self._colnames
        data = None
        if not self._requests_dead:
            try:
                self._req_session(criteria)
                data = self._fetch_requests(
                    f"{BASE}/reportsapi/AnalysisViewJSON?SUBREQUEST=XMLHTTP&_ZVER_=101",
                    self._viewjson_body(criteria),
                    "application/x-www-form-urlencoded; charset=UTF-8")
            except Exception as e:
                print(f"[sm_zoho] requests path failed for AnalysisViewJSON "
                      f"({e!r}); falling back to Playwright")
                self._requests_dead = True
        if data is None:
            data = self._fetch_playwright(criteria)["view"]
            if data is None:
                raise RuntimeError("no AnalysisViewJSON captured")
        cols = data["data"]["viewConfigJSON"]["ZAViewColInst"]
        self._colnames = {c["VCID"]: c["DISPLAY_NAME"] for c in cols}
        return self._colnames

    def rows(self, criteria):
        """Return (rows, header) where rows is a list of dicts keyed by
        DISPLAY_NAME with cleaned raw values. Raises loudly if Zoho reports
        more total rows than were returned (pagination not implemented) —
        partial data must never be ingested silently."""
        colnames = self.columns(criteria)
        report = None
        if not self._requests_dead:
            try:
                self._req_session(criteria)
                report = self._fetch_requests(
                    self._showreport_url(criteria), SHOWREPORT_XML,
                    "text/plain; charset=UTF-8")
            except Exception as e:
                print(f"[sm_zoho] requests path failed for SHOWREPORT "
                      f"({e!r}); falling back to Playwright")
                self._requests_dead = True
        if report is None:
            report = self._fetch_playwright(criteria)["report"]

        order = report["grid_param"]["dataColOrder"]
        header = [colnames.get(vcid, vcid) for vcid in order]
        nav = report.get("navigInfo") or []
        fetched = nav[1] if len(nav) > 1 else None
        total = nav[5] if len(nav) > 5 else None

        rows = []
        for entry in report.get("dataText", []):
            if isinstance(entry, dict):      # section header block
                continue
            cells = [c for c in entry if isinstance(c, list)]
            if len(cells) != len(order):
                raise RuntimeError(
                    f"cell count {len(cells)} != column count {len(order)} "
                    f"for view {self.view_id} criteria {criteria!r}")
            rows.append({header[i]: clean(cells[i][0] if cells[i] else None)
                         for i in range(len(order))})

        if total is not None and fetched is not None and fetched != total:
            raise RuntimeError(
                f"PAGINATION NEEDED: fetched {fetched} of {total} rows for "
                f"view {self.view_id} criteria {criteria!r} — refusing partial data")
        # Zoho's grid caps a fetch at 200 rows AND reports navigInfo total==200
        # in that case (observed on q_meets), so total==fetched cannot be
        # trusted at the cap. Treat exactly-200 as likely truncation: callers
        # must narrow criteria (e.g. date windows) until under the cap.
        if len(rows) >= 200:
            raise RuntimeError(
                f"GRID CAP HIT: {len(rows)} rows (>=200) for view {self.view_id} "
                f"criteria {criteria!r} — result may be truncated; narrow the "
                f"criteria (navigInfo total is unreliable at the cap)")
        if total is not None and len(rows) != total:
            raise RuntimeError(
                f"parsed {len(rows)} rows but navigInfo says {total} for "
                f"view {self.view_id} criteria {criteria!r}")
        return rows, header


def view(name):
    cfg = VIEWS[name]
    return ZohoOpenView(cfg["view"], cfg["key"]), cfg["table"]


def parse_int(v):
    if v is None:
        return None
    m = re.search(r"\d+", str(v))
    return int(m.group()) if m else None


def parse_num(v):
    if v in (None, ""):
        return None
    try:
        return float(str(v).replace(",", ""))
    except ValueError:
        return None


def parse_date(v):
    """Zoho raw dates look like '15 Jul 2026 00:00:00.000'."""
    if not v:
        return None
    from datetime import datetime
    for fmt in ("%d %b %Y %H:%M:%S.%f", "%d %b %Y", "%d-%b-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(str(v).strip(), fmt).date().isoformat()
        except ValueError:
            continue
    return None
