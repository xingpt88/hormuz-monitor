#!/usr/bin/env python3
"""
Parse MONITOR_LOG.md and MEMORY.md to generate data.json for the Hormuz Monitor website.
Run after each monitor cycle to keep the website up to date.

Usage: python3 update_website_data.py
Output: public/data.json (in the website repo)
"""

import json
import re
import os
from datetime import datetime, timezone

WORKSPACE = os.path.expanduser("~/.openclaw/workspace-investor")
MONITOR_LOG = os.path.join(WORKSPACE, "MONITOR_LOG.md")
MEMORY_MD = os.path.join(WORKSPACE, "MEMORY.md")

# Where your website repo's public/ folder is
# Adjust this path to match your actual website repo location
WEBSITE_REPO = os.path.expanduser("~/hormuz-website")
OUTPUT_PATH = os.path.join(WEBSITE_REPO, "public", "data.json")

CLOSURE_START = datetime(2026, 3, 1, tzinfo=timezone.utc)
JPM_BUFFER_DAYS = 25
VESSEL_NORMAL = 153

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

    # Extract values with regex
    vessel_match = re.search(r"Vessel crossings?:\s*~?(\d+)", latest, re.IGNORECASE)
    data["vesselCount"] = int(vessel_match.group(1)) if vessel_match else 0

    brent_match = re.search(r"Brent:\s*\$?([\d.]+)", latest)
    data["brent"] = float(brent_match.group(1)) if brent_match else 0

    wti_match = re.search(r"WTI:\s*\$?([\d.]+)", latest)
    data["wti"] = float(wti_match.group(1)) if wti_match else 0

    gold_match = re.search(r"Gold:\s*\$?([\d.,]+)", latest)
    data["gold"] = float(gold_match.group(1).replace(",", "")) if gold_match else 0

    ttf_match = re.search(r"TTF[^:]*:\s*[€$]?([\d.]+)", latest)
    data["ttf"] = float(ttf_match.group(1)) if ttf_match else 0

    vlcc_match = re.search(r"VLCC[^:]*:\s*\$?([\d,]+)", latest)
    data["vlcc"] = int(vlcc_match.group(1).replace(",", "")) // 1000 if vlcc_match else 0

    # Extract status
    status_match = re.search(r"Status:\s*(.+)", latest, re.IGNORECASE)
    data["status"] = status_match.group(1).strip() if status_match else "UNKNOWN"

    # Extract incidents
    incidents_match = re.search(r"New incidents?:\s*(.+)", latest, re.IGNORECASE)
    data["incidents"] = incidents_match.group(1).strip() if incidents_match else "None"

    # Extract Iran stance
    iran_match = re.search(r"Iran stance:\s*(.+)", latest, re.IGNORECASE)
    data["iranStance"] = iran_match.group(1).strip() if iran_match else ""

    # Extract Western response
    western_match = re.search(r"Western response:\s*(.+)", latest, re.IGNORECASE)
    data["westernResponse"] = western_match.group(1).strip() if western_match else ""

    # Extract insurance
    insurance_match = re.search(r"Insurance:\s*(.+)", latest, re.IGNORECASE)
    data["insurance"] = insurance_match.group(1).strip() if insurance_match else ""

    # Extract flash triggers
    flash_match = re.search(r"Flash triggers?:\s*(.+)", latest, re.IGNORECASE)
    data["flash"] = flash_match.group(1).strip() if flash_match else "none"

    # Extract timestamp
    ts_match = re.search(r"## (\d{4}-\d{2}-\d{2}T[\d:]+Z?)", latest)
    data["lastUpdate"] = ts_match.group(1) if ts_match else datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ")

    # Build vessel history from all entries
    vessel_history = []
    for entry in entries:
        ts_m = re.search(r"## (\d{4}-\d{2}-\d{2})", entry)
        vc_m = re.search(r"Vessel crossings?:\s*~?(\d+)", entry, re.IGNORECASE)
        if ts_m and vc_m:
            date_str = ts_m.group(1)
            month_day = f"{int(date_str[5:7])}/{int(date_str[8:10])}"
            vessel_history.append({"d": month_day, "v": int(vc_m.group(1))})

    # Deduplicate by date (keep latest)
    seen = {}
    for vh in vessel_history:
        seen[vh["d"]] = vh["v"]
    vessel_history = [{"d": k, "v": v} for k, v in seen.items()]

    # Add pre-crisis baseline if not present
    if not any(vh["d"] == "2/27" for vh in vessel_history):
        vessel_history.insert(0, {"d": "2/27", "v": 153})

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

    # Build timeline from latest entry events
    timeline = []
    ts = latest.get("lastUpdate", now.strftime("%Y-%m-%dT%H:%MZ"))
    date_prefix = datetime.fromisoformat(ts.replace("Z", "+00:00")).strftime("%b %d %H:%M") if "T" in ts else ts

    if latest.get("incidents") and latest["incidents"] != "None":
        timeline.append({"time": date_prefix, "tag": "ATTACK", "text": latest["incidents"]})
    if latest.get("iranStance"):
        timeline.append({"time": date_prefix, "tag": "IRAN", "text": latest["iranStance"]})
    if latest.get("westernResponse"):
        timeline.append({"time": date_prefix, "tag": "EVENT", "text": latest["westernResponse"]})
    if latest.get("flash") and latest["flash"].lower() != "none":
        timeline.append({"time": date_prefix, "tag": "ALERT", "text": latest["flash"]})

    # Calculate price changes
    brent_chg = f"+{((latest['brent'] / 73) - 1) * 100:.0f}% since pre-crisis" if latest["brent"] > 0 else ""
    gold_chg = f"{((latest['gold'] / 5602) - 1) * 100:.1f}% from ATH" if latest["gold"] > 0 else ""

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
        "insurance": latest.get("insurance", ""),
        "scenarios": [
            {"label": "快速解决 (2周内)", "pct": 5 if phase >= 3 else 15, "trend": "↓"},
            {"label": "持续中断 (1-3月)", "pct": 30, "trend": "→"},
            {"label": "结构性升级 (3月+)", "pct": 45 if phase >= 3 else 35, "trend": "↑"},
            {"label": "全面危机 (地面战)", "pct": 20 if phase >= 4 else 10, "trend": "↑" if phase >= 3 else "→"},
        ],
        "thingsToWatch": [],
        "situationSummary": f"海峡通行量{latest['vesselCount']}艘/日，Brent ${latest['brent']}，封锁第{days_since}天。{latest.get('incidents', '')} {latest.get('iranStance', '')}",
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

    # Build thingsToWatch from key data points
    watches = []
    if jpm_buffer <= 0:
        watches.append({"icon": "⚫", "text": f"JPM 25天储存缓冲已耗尽（第{days_since}天），海湾产油国被迫减产"})
    elif jpm_buffer <= 5:
        watches.append({"icon": "🔴", "text": f"JPM 25天储存缓冲仅剩{jpm_buffer}天，临界点迫近"})
    else:
        watches.append({"icon": "🟡", "text": f"JPM 25天储存缓冲剩余{jpm_buffer}天"})

    if latest["brent"] >= 100:
        watches.append({"icon": "🛢️", "text": f"Brent突破$100（当前${latest['brent']}），通胀压力加大"})
    if latest.get("incidents") and latest["incidents"] != "None":
        watches.append({"icon": "💥", "text": latest["incidents"]})
    if latest.get("iranStance"):
        watches.append({"icon": "🇮🇷", "text": latest["iranStance"][:60]})

    data["thingsToWatch"] = watches[:5]

    return data


if __name__ == "__main__":
    data = build_website_data()
    if data:
        os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✅ data.json updated: {OUTPUT_PATH}")
        print(f"   Phase {data['phase']}: {data['phaseName']}")
        print(f"   Vessels: {data['vesselCount']}/day | Brent: ${data['brent']}")
        print(f"   History points: {len(data['vesselHistory'])}")
    else:
        print("⚠️ No data to update")
