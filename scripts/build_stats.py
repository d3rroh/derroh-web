#!/usr/bin/env python3
"""Build-time GitHub stats for the site.

Fetches public data from the GitHub REST API, writes data/stats.json and
bakes the values into index.html so they render without JavaScript.

Panels in index.html ship with the `hidden` attribute and are only revealed
here, after their data has been fetched. If this script fails (or never
runs), the page keeps those panels hidden instead of showing zeros.

Usage:
  GITHUB_TOKEN=... python3 scripts/build_stats.py [--html index.html] [--out data/stats.json]
"""
import argparse
import html
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

OWNER = "d3rroh"
RUN_REPOS = ["derroh-web", "milestone", "kimberley-web"]
RUN_COUNT = 3
API = "https://api.github.com"


def log(msg):
    print(f"[build_stats] {msg}", file=sys.stderr)


def get(path, params=None):
    url = API + path + ("?" + urllib.parse.urlencode(params) if params else "")
    req = urllib.request.Request(url, headers={
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": f"{OWNER}-site-build",
    })
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.load(resp)


def parse_ts(ts):
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def fetch_runs():
    runs = []
    for repo in RUN_REPOS:
        try:
            data = get(f"/repos/{OWNER}/{repo}/actions/runs",
                       {"status": "completed", "per_page": RUN_COUNT})
        except urllib.error.HTTPError as e:
            # 404 = private repo the token can't see, or no such repo.
            log(f"skipping {OWNER}/{repo}: HTTP {e.code}")
            continue
        for r in data.get("workflow_runs", []):
            started, completed = r.get("run_started_at"), r.get("updated_at")
            if not (started and completed and r.get("conclusion")):
                continue
            runs.append({
                "repo": f"{OWNER}/{repo}",
                "run_number": r["run_number"],
                "branch": r.get("head_branch") or "",
                "duration_s": max(0, int((parse_ts(completed) - parse_ts(started)).total_seconds())),
                "conclusion": r["conclusion"],
                "completed_at": completed,
            })
    runs.sort(key=lambda r: r["completed_at"], reverse=True)
    return runs[:RUN_COUNT]


def collect():
    stats = {"generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
    try:
        stats["public_repos"] = int(get(f"/users/{OWNER}")["public_repos"])
    except Exception as e:  # noqa: BLE001 - any failure just drops the stat
        log(f"public_repos unavailable: {e}")
    try:
        q = f"author:{OWNER} type:pr is:public"
        stats["public_prs"] = int(get("/search/issues", {"q": q, "per_page": 1})["total_count"])
    except Exception as e:  # noqa: BLE001
        log(f"public_prs unavailable: {e}")
    try:
        stats["recent_runs"] = fetch_runs()
    except Exception as e:  # noqa: BLE001
        log(f"recent_runs unavailable: {e}")
        stats["recent_runs"] = []
    return stats


# ── Baking into HTML ─────────────────────────────────────────────

def fmt_duration(s):
    m, s = divmod(s, 60)
    return f"{m}m {s:02d}s" if m else f"{s}s"


def fmt_abs(ts):
    return parse_ts(ts).strftime("%Y-%m-%d %H:%M UTC")


def time_tag(ts):
    # Absolute time without JS; home.js swaps in a relative time ("3h ago").
    return f'<time datetime="{ts}" data-rel>{fmt_abs(ts)}</time>'


CONCLUSION = {
    "success": ("dot--green", "crr-pass", "passed"),
    "failure": ("dot--red", "crr-fail", "failed"),
}


def render_runs(runs):
    rows = []
    for r in runs:
        dot, cls, label = CONCLUSION.get(r["conclusion"], ("dot--yellow", "amber-text", r["conclusion"]))
        rows.append(
            '\n              <div class="cicd-run-row">'
            f'\n                <span class="crr-dot dot {dot}" aria-hidden="true"></span>'
            f'\n                <span class="crr-id">#{r["run_number"]}</span>'
            f'\n                <span class="crr-ref">{html.escape(r["branch"])} · {html.escape(r["repo"])} · {time_tag(r["completed_at"])}</span>'
            f'\n                <span class="crr-time">{fmt_duration(r["duration_s"])}</span>'
            f'\n                <span class="crr-status {cls}">{html.escape(label)}</span>'
            '\n              </div>'
        )
    return "".join(rows) + "\n              "


def fill(doc, name, value):
    start, end = f"<!--stats:{name}-->", f"<!--/stats:{name}-->"
    i, j = doc.find(start), doc.find(end)
    if i < 0 or j < 0:
        raise ValueError(f"marker {start} not found")
    return doc[:i + len(start)] + value + doc[j:]


def reveal(doc, name):
    attr = f'data-stats="{name}" hidden'
    if attr not in doc:
        raise ValueError(f"{attr!r} not found")
    return doc.replace(attr, f'data-stats="{name}"')


def bake(doc, stats):
    shown = []
    if "public_repos" in stats:
        doc = reveal(fill(doc, "repos", str(stats["public_repos"])), "repos")
        shown.append("repos")
    if stats.get("public_prs"):  # a zero count isn't worth a stat tile
        doc = reveal(fill(doc, "prs", str(stats["public_prs"])), "prs")
        shown.append("prs")
    if shown:
        doc = reveal(doc, "activity")
        doc = reveal(fill(doc, "generated", time_tag(stats["generated_at"])), "generated")
    if stats.get("recent_runs"):
        doc = reveal(fill(doc, "runs", render_runs(stats["recent_runs"])), "runs")
        shown.append("runs")
    return doc, shown


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--html", default="index.html", help="page to bake values into (in place)")
    ap.add_argument("--html-out", help="write the baked page here instead of in place")
    ap.add_argument("--out", default="data/stats.json")
    args = ap.parse_args()

    stats = collect()
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w") as f:
        json.dump(stats, f, indent=2)
        f.write("\n")
    log(f"wrote {args.out}")

    with open(args.html) as f:
        doc, shown = bake(f.read(), stats)
    if not shown:
        log("no stats available; panels stay hidden")
        return 1
    out = args.html_out or args.html
    tmp = out + ".tmp"
    with open(tmp, "w") as f:
        f.write(doc)
    os.replace(tmp, out)
    log(f"baked {', '.join(shown)} into {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
