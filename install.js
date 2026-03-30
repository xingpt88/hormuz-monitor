#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");

const SKILL_CONTENT = `---
name: hormuz-monitor
description: >
  Monitor Strait of Hormuz shipping traffic from JMIC, Iranian sources,
  and news aggregation every 24 hours. Write findings to MONITOR_LOG.md.
version: 1.1.0
---

# Hormuz Strait Shipping Monitor

## Purpose
Monitor shipping traffic through the Strait of Hormuz from multiple sources
and send a summary alert.

## Sources to check

### Tier 1 - Primary data sources
- Web fetch: https://www.ukmto.org/partner-products/jmic-products (JMIC updates)
- Web fetch: https://windward.ai/blog/ (Daily maritime intelligence)

### Tier 2 - Iranian sources
- Web fetch: https://www.tasnimnews.ir/en/ (search for "Hormuz" or "strait")
- Web fetch: https://www.farsnews.ir/en (search for "Hormuz")

### Tier 3 - News & market data
- Web search: "Strait of Hormuz shipping traffic today"
- Web search: "\\u062A\\u0646\\u06AF\\u0647 \\u0647\\u0631\\u0645\\u0632 \\u06A9\\u0634\\u062A\\u06CC" (Farsi: Hormuz strait ships)
- Web search: "Brent crude oil gold price today"
- Web search: "VLCC tanker rate Hormuz insurance today"

## Workflow
1. Fetch Tier 1 URLs and extract latest updates
2. Fetch Tier 2 Iranian sources for new articles
3. Run Tier 3 web searches for breaking developments and prices
4. Append new timestamped entry to MONITOR_LOG.md
5. Trim entries older than 7 days
6. Send alert summary to user

## Alert format
\\ud83d\\udea2 **Hormuz Monitor Update** [timestamp]
- **Vessel crossings (last 24h):** [number]
- **Status:** [open/restricted/closed]
- **Brent:** $[X] | **Gold:** $[X] | **VLCC rate:** $[X]/day
- **New incidents:** [summary]
- **Iran stance:** [latest IRGC/Tasnim statement]
- **Western response:** [CENTCOM/JMIC update]
- **Insurance:** [status]
- **Sources updated:** [list]

## Flash Alert Triggers
- Oil price moved >5% since last entry
- Vessel count changed >50%
- Ceasefire, diplomatic breakthrough, or major attack detected
- Brent crossed $100 (up) or $75 (down)

## MONITOR_LOG.md entry format

## [YYYY-MM-DDThh:mmZ] - [NORMAL/ALERT]
- Vessel crossings: [number]/day
- Status: [open/restricted/closed]
- Brent: $[X]/bbl | WTI: $[X]/bbl
- Gold: $[X]/oz
- TTF Gas: [X] EUR/MWh
- VLCC rate: $[X]/day
- New incidents: [summary or "None"]
- Iran stance: [latest statement]
- Western response: [latest summary]
- Insurance: [status]
- Sources checked: [list]
- Flash triggers: [none / list any triggered]
`;

const command = process.argv[2];

if (command === "install") {
  const home = os.homedir();
  const defaultWorkspace = path.join(home, ".openclaw", "workspace");
  const targetDir = path.join(defaultWorkspace, "skills", "hormuz-monitor");
  const targetFile = path.join(targetDir, "SKILL.md");

  if (!fs.existsSync(defaultWorkspace)) {
    console.error("\\u274C OpenClaw workspace not found at ~/.openclaw/workspace");
    console.error("   Make sure OpenClaw is installed: npx openclaw onboard");
    process.exit(1);
  }

  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(targetFile, SKILL_CONTENT);

  console.log("\\ud83d\\udea2 Hormuz Monitor skill installed!");
  console.log("");
  console.log("   Location: " + targetFile);
  console.log("");
  console.log("   Next steps:");
  console.log("   1. Restart gateway:  openclaw gateway restart");
  console.log("   2. Set up daily cron:");
  console.log("      openclaw cron add --name hormuz-monitor \\\\");
  console.log("        --cron \\"0 1 * * *\\" --tz Asia/Shanghai \\\\");
  console.log("        --message \\"Run hormuz-monitor skill\\" \\\\");
  console.log("        --session isolated --timeout-seconds 900");
  console.log("");

} else if (command === "uninstall") {
  const home = os.homedir();
  const targetDir = path.join(home, ".openclaw", "workspace", "skills", "hormuz-monitor");

  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true });
    console.log("\\ud83d\\uddd1\\ufe0f  Hormuz Monitor skill removed.");
  } else {
    console.log("Skill not found. Nothing to remove.");
  }

} else {
  console.log("\\ud83d\\udea2 Hormuz Monitor - Strait of Hormuz Crisis Tracker for OpenClaw");
  console.log("");
  console.log("Usage:");
  console.log("  npx @xingpt/hormuz-monitor install      Install skill");
  console.log("  npx @xingpt/hormuz-monitor uninstall     Remove skill");
  console.log("");
  console.log("More info: https://github.com/xingpt/hormuz-monitor");
}
