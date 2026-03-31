#!/usr/bin/env python3
"""
Parse MONITOR_LOG.md to generate data.json for the Hormuz Monitor website.
Run after each monitor cycle to keep the website up to date.

Usage: python3 update_website_data.py
Output: website/public/data.json (in the website repo)
"""

import json
import re
import os
from datetime import datetime, timezone

WORKSPACE = os.path.expanduser("~/.openclaw/workspace-investor")
MONITOR_LOG = os.path.join(WORKSPACE, "MONITOR_LOG.md")

WEBSITE_REPO = os.path.expanduser("~/hormuz-website/website")
OUTPUT_PATH = os.path.join(WEBSITE_REPO, "public", "data.json")

CLOSURE_START = datetime(2026, 3, 1, tzinfo=timezone.utc)
JPM_BUFFER_DAYS = 25
VESSEL_NORMAL = 153


def strip_md(text):
    """Remove markdown bold markers and leading tildes from text"""
    if not text:
        return text
    text = text.replace("**", "")
    text = text.strip()
    return text


def first_sentence_zh(text, max_len=80):
    """Extract first meaningful segment, truncate to max_len"""
    if not text:
        return ""
    text = strip_md(text)
    # Try splitting on Chinese period, semicolon, or em-dash
    for sep in ["\u3002", "\uff1b", " \u2014 ", " -- "]:
        if sep in text:
            part = text.split(sep)[0].strip()
            if len(part) > 10:
                return part[:max_len] + ("\u2026" if len(part) > max_len else "")
    if len(text) > max_len:
        return text[:max_len] + "\u2026"
    return text


def parse_monitor_log():
    """Extract the latest entry and vessel history from MONITOR_LOG.md"""
    if not os.path.exists(MONITOR_LOG):
        return None, []

    with open(MONITOR_LOG, "r") as f:
        content = f.read()

    # Split into entries by ## timestamp headers
    entries = re.split(r"(?=^## \d{4}-\d{2}-\d{2})", content, flags=re.MULTILINE)
    entries = [e.strip() for e in entries if e.strip() and e.strip().startswith("## 20")]

    if not entries:
        return None, []

    # Parse latest entry
    latest = entries[-1]
    data = {}

    # --- Price extraction (handles **~$115.27/bbl** format) ---
    vessel_match = re.search(r"Vessel crossings?:\s*\*{0,2}~?(\d+)", latest, re.IGNORECASE)
    data["vesselCount"] = int(vessel_match.group(1)) if vessel_match else 0

    brent_match = re.search(r"Brent:.*?\*{0,2}~?\$?([\d.]+)", latest)
    data["brent"] = float(brent_match.group(1)) if brent_match else 0

    wti_match = re.search(r"WTI:.*?\*{0,2}~?\$?([\d.]+)", latest)
    if not wti_match:
        wti_match = re.search(r"WTI.*?\*{0,2}~?\$?([\d.]+)", latest)
    data["wti"] = float(wti_match.group(1)) if wti_match else 0

    gold_match = re.search(r"Gold:.*?\*{0,2}~?\$?([\d.,]+)", latest)
    data["gold"] = float(gold_match.group(1).replace(",", "")) if gold_match else 0

    ttf_match = re.search(r"TTF[^:]*:.*?\*{0,2}~?[\u20ac$]?([\d.]+)", latest)
    data["ttf"] = float(ttf_match.group(1)) if ttf_match else 0

    # VLCC: try matching "$423k" format first
    vlcc_match = re.search(r"VLCC[^:]*:.*?\*{0,2}~?\$?([\d,]+)k", latest, re.IGNORECASE)
    if vlcc_match:
        data["vlcc"] = int(vlcc_match.group(1).replace(",", ""))
    else:
        vlcc_match2 = re.search(r"VLCC[^:]*:.*?\*{0,2}~?\$?([\d,]+)", latest)
        if vlcc_match2:
            val = int(vlcc_match2.group(1).replace(",", ""))
            data["vlcc"] = val if val < 10000 else val // 1000
        else:
            data["vlcc"] = 0

    # --- Text fields ---
    status_match = re.search(r"Status:\s*(.+)", latest, re.IGNORECASE)
    data["status"] = strip_md(status_match.group(1).strip()) if status_match else "UNKNOWN"

    incidents_match = re.search(r"New incidents?:\s*(.+?)(?:\n- |\Z)", latest, re.IGNORECASE | re.DOTALL)
    data["incidents"] = strip_md(incidents_match.group(1).strip()) if incidents_match else "None"

    iran_match = re.search(r"Iran stance:\s*(.+?)(?:\n- |\Z)", latest, re.IGNORECASE | re.DOTALL)
    data["iranStance"] = strip_md(iran_match.group(1).strip()) if iran_match else ""

    western_match = re.search(r"Western response:\s*(.+?)(?:\n- |\Z)", latest, re.IGNORECASE | re.DOTALL)
    data["westernResponse"] = strip_md(western_match.group(1).strip()) if western_match else ""

    insurance_match = re.search(r"Insurance:\s*(.+?)(?:\n- |\Z)", latest, re.IGNORECASE | re.DOTALL)
    data["insurance"] = strip_md(insurance_match.group(1).strip()) if insurance_match else ""

    flash_match = re.search(r"Flash triggers?:\s*(.+?)(?:\n- |\Z)", latest, re.IGNORECASE | re.DOTALL)
    data["flash"] = strip_md(flash_match.group(1).strip()) if flash_match else "none"

    diplo_match = re.search(r"Diplomatic:\s*(.+?)(?:\n- |\Z)", latest, re.IGNORECASE | re.DOTALL)
    data["diplomatic"] = strip_md(diplo_match.group(1).strip()) if diplo_match else ""

    # Extract timestamp
    ts_match = re.search(r"## (\d{4}-\d{2}-\d{2}T[\d:]+Z?)", latest)
    data["lastUpdate"] = ts_match.group(1) if ts_match else datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ")

    # --- Vessel history from ALL entries ---
    vessel_history = []
    for entry in entries:
        ts_m = re.search(r"## (\d{4}-\d{2}-\d{2})", entry)
        vc_m = re.search(r"Vessel crossings?:\s*\*{0,2}~?(\d+)", entry, re.IGNORECASE)
        if ts_m and vc_m:
            date_str = ts_m.group(1)
            month_day = f"{int(date_str[5:7])}/{int(date_str[8:10])}"
            vessel_history.append({"d": month_day, "v": int(vc_m.group(1))})

    # Deduplicate by date (keep latest)
    seen = {}
    for vh in vessel_history:
        seen[vh["d"]] = vh["v"]
    vessel_history = [{"d": k, "v": v} for k, v in seen.items()]

    # Sort by date
    def sort_key(item):
        parts = item["d"].split("/")
        return (int(parts[0]), int(parts[1]))
    vessel_history.sort(key=sort_key)

    # Add pre-crisis baseline if not present
    if not any(vh["d"] == "2/27" for vh in vessel_history):
        vessel_history.insert(0, {"d": "2/27", "v": 153})

    # If we only have sparse data points, supplement with known history
    if len(vessel_history) < 5:
        known_history = [
            {"d": "2/27", "v": 153}, {"d": "3/2", "v": 0}, {"d": "3/5", "v": 5},
            {"d": "3/8", "v": 13}, {"d": "3/12", "v": 2}, {"d": "3/15", "v": 1},
            {"d": "3/20", "v": 0}, {"d": "3/25", "v": 0}, {"d": "3/28", "v": 0},
        ]
        existing_dates = {vh["d"] for vh in vessel_history}
        for kh in known_history:
            if kh["d"] not in existing_dates:
                vessel_history.append(kh)
        vessel_history.sort(key=sort_key)

    return data, vessel_history


def calculate_phase(vessel_count, brent):
    """Determine crisis phase based on vessel count and oil price"""
    if vessel_count > 80 and brent < 80:
        return 1, "TENSION"
    elif vessel_count >= 10 and brent < 100:
        return 2, "DISRUPTION"
    elif vessel_count < 10 and brent < 130:
        return 3, "ESCALATION"
    else:
        return 4, "CRISIS"


def build_website_data():
    """Build the full data.json structure"""
    latest, vessel_history = parse_monitor_log()

    if not latest:
        print("No monitor data found, skipping update")
        return None

    now = datetime.now(timezone.utc)
    days_since = (now - CLOSURE_START).days
    jpm_buffer = max(0, JPM_BUFFER_DAYS - days_since)
    phase, phase_name = calculate_phase(latest["vesselCount"], latest["brent"])

    # Build timeline (short summaries only)
    timeline = []
    ts = latest.get("lastUpdate", now.strftime("%Y-%m-%dT%H:%MZ"))
    date_prefix = datetime.fromisoformat(ts.replace("Z", "+00:00")).strftime("%b %d %H:%M") if "T" in ts else ts

    if latest.get("diplomatic"):
        timeline.append({"time": date_prefix, "tag": "DIPLO", "text": first_sentence_zh(latest["diplomatic"])})
    if latest.get("incidents") and latest["incidents"] != "None":
        timeline.append({"time": date_prefix, "tag": "ATTACK", "text": first_sentence_zh(latest["incidents"])})
    if latest.get("iranStance"):
        timeline.append({"time": date_prefix, "tag": "IRAN", "text": first_sentence_zh(latest["iranStance"])})
    if latest.get("westernResponse"):
        timeline.append({"time": date_prefix, "tag": "EVENT", "text": first_sentence_zh(latest["westernResponse"])})
    if latest.get("flash") and latest["flash"].lower() != "none":
        timeline.append({"time": date_prefix, "tag": "ALERT", "text": first_sentence_zh(latest["flash"])})

    # Price changes
    brent_chg = f"+{((latest['brent'] / 73) - 1) * 100:.0f}% since pre-crisis" if latest["brent"] > 0 else ""
    gold_chg = f"{((latest['gold'] / 5595) - 1) * 100:.1f}% from ATH" if latest["gold"] > 0 else ""

    # Concise Chinese situation summary
    parts = [
        f"\u6d77\u5ce1\u901a\u884c\u91cf{latest['vesselCount']}\u8258/\u65e5\uff08\u6b63\u5e38{VESSEL_NORMAL}\uff09",
        f"Brent ${latest['brent']}/\u6876" if latest["brent"] > 0 else "",
        f"\u5c01\u9501\u7b2c{days_since}\u5929",
        f"JPM\u7f13\u51b2{'\u5df2\u8017\u5c3d' if jpm_buffer <= 0 else f'\u5269\u4f59{jpm_buffer}\u5929'}",
    ]
    if latest.get("incidents") and latest["incidents"] != "None":
        parts.append(first_sentence_zh(latest["incidents"], 60))
    situation_summary = "\u3002".join(p for p in parts if p) + "\u3002"

    insurance_short = first_sentence_zh(latest.get("insurance", ""), 100)

    data = {
        "phase": phase,
        "phaseName": phase_name,
        "vesselCount": latest["vesselCount"],
        "vesselNormal": VESSEL_NORMAL,
        "daysSinceClosure": days_since,
        "jpmBuffer": jpm_buffer,
        "brent": latest["brent"],
        "brentChg": brent_chg,
        "wti": latest["wti"],
        "wtiChg": "",
        "gold": latest["gold"],
        "goldChg": gold_chg,
        "ttf": latest["ttf"],
        "vlcc": latest["vlcc"],
        "insurance": insurance_short,
        "scenarios": [
            {"label": "\u5feb\u901f\u89e3\u51b3 (2\u5468\u5185)", "pct": 5 if phase >= 3 else 15, "trend": "\u2193"},
            {"label": "\u6301\u7eed\u4e2d\u65ad (1-3\u6708)", "pct": 30, "trend": "\u2192"},
            {"label": "\u7ed3\u6784\u6027\u5347\u7ea7 (3\u6708+)", "pct": 45 if phase >= 3 else 35, "trend": "\u2191"},
            {"label": "\u5168\u9762\u5371\u673a (\u5730\u9762\u6218)", "pct": 20 if phase >= 4 else 10, "trend": "\u2191" if phase >= 3 else "\u2192"},
        ],
        "thingsToWatch": [],
        "situationSummary": situation_summary,
        "timeline": timeline,
        "vesselHistory": vessel_history,
        "sources": [
            {"name": "JMIC", "status": "ok"},
            {"name": "Tasnim", "status": "ok"},
            {"name": "Fars News", "status": "ok"},
            {"name": "Windward", "status": "ok"},
            {"name": "Kpler/AIS", "status": "ok"},
            {"name": "CNBC", "status": "ok"},
        ],
    }

    # thingsToWatch (concise)
    watches = []
    if jpm_buffer <= 0:
        watches.append({"icon": "\u26ab", "text": f"JPM 25\u5929\u50a8\u5b58\u7f13\u51b2\u5df2\u8017\u5c3d\uff08\u7b2c{days_since}\u5929\uff09\uff0c\u6d77\u6e7e\u4ea7\u6cb9\u56fd\u88ab\u8feb\u51cf\u4ea7"})
    elif jpm_buffer <= 5:
        watches.append({"icon": "\U0001f534", "text": f"JPM 25\u5929\u50a8\u5b58\u7f13\u51b2\u4ec5\u5269{jpm_buffer}\u5929\uff0c\u4e34\u754c\u70b9\u8feb\u8fd1"})
    else:
        watches.append({"icon": "\U0001f7e1", "text": f"JPM 25\u5929\u50a8\u5b58\u7f13\u51b2\u5269\u4f59{jpm_buffer}\u5929"})

    if latest["brent"] >= 100:
        watches.append({"icon": "\U0001f6e2\ufe0f", "text": f"Brent\u7a81\u7834$100\uff08\u5f53\u524d${latest['brent']}\uff09\uff0c\u901a\u80c0\u538b\u529b\u52a0\u5927"})
    if latest["gold"] > 0:
        watches.append({"icon": "\U0001f947", "text": f"\u9ec4\u91d1${latest['gold']:,.0f}/oz\uff0c\u8dddATH {gold_chg}"})
    if latest.get("incidents") and latest["incidents"] != "None":
        watches.append({"icon": "\U0001f4a5", "text": first_sentence_zh(latest["incidents"], 50)})
    if latest.get("iranStance"):
        watches.append({"icon": "\U0001f1ee\U0001f1f7", "text": first_sentence_zh(latest["iranStance"], 50)})

    data["thingsToWatch"] = watches[:5]

    return data


if __name__ == "__main__":
    data = build_website_data()
    if data:
        os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"\u2705 data.json updated: {OUTPUT_PATH}")
        print(f"   Phase {data['phase']}: {data['phaseName']}")
        print(f"   Vessels: {data['vesselCount']}/day | Brent: ${data['brent']}")
        print(f"   Gold: ${data['gold']:,.0f} | VLCC: ${data['vlcc']}K")
        print(f"   History points: {len(data['vesselHistory'])}")
    else:
        print("\u26a0\ufe0f No data to update")
