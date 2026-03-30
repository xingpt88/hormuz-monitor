---
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
- Web search: "\ت\ن\گ\ه \ه\ر\م\ز \ک\ش\ت\ی" (Farsi: Hormuz strait ships)
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
\�\� **Hormuz Monitor Update** [timestamp]
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
