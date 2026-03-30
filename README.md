# 🚢 Hormuz Monitor

Strait of Hormuz crisis monitoring skill for [OpenClaw](https://github.com/openclaw/openclaw).

Tracks shipping traffic, military incidents, oil prices, and diplomatic developments from JMIC, Iranian sources, and global news. Delivers alerts to Telegram, Discord, or Slack.

## Install

### Option 1: npx (recommended)
```bash
npx @xingpt/hormuz-monitor install
```

### Option 2: Tell your agent
```
请安装 hormuz-monitor skill
```

### Option 3: Manual
```bash
mkdir -p ~/.openclaw/workspace/skills/hormuz-monitor
# Copy SKILL.md from this repo into the directory
```

## Setup cron (daily monitoring)

```bash
openclaw cron add \
  --name "hormuz-monitor" \
  --cron "0 1 * * *" \
  --tz "Asia/Shanghai" \
  --message "Run hormuz-monitor skill. Collect latest Hormuz shipping, incident, and price data. Write to MONITOR_LOG.md." \
  --session isolated \
  --timeout-seconds 900
```

## Data sources

| Source | Tier | Coverage |
|--------|------|----------|
| JMIC | 1 | Official vessel transit data |
| Windward | 1 | Maritime intelligence |
| Tasnim News | 2 | IRGC statements (Iranian) |
| Fars News | 2 | Iranian military updates |
| Web search (EN) | 3 | Breaking news, oil prices |
| Web search (FA) | 3 | Persian-language reports |

## Alert example

```
🚢 Hormuz Monitor 2026-03-30 01:00 UTC — ALERT
通行量: 0 艘/日 (正常 153)
Brent: $114.75 (+55% MTD) | Gold: $4,500
新事件: Trump称要"take the oil"；胡塞武装向以色列发射导弹
伊朗: 运营人民币收费站，中俄船只付费通行
保险: 主要承保商全面撤出，战争险区域扩大至阿曼
⚡ Flash: 通行量归零，JPM储存缓冲耗尽
```

## Flash Alert triggers

Immediate push if:
- Oil price moves >5% since last check
- Vessel count changes >50%
- Ceasefire or major escalation detected
- Brent crosses $100 or $75

## Companion skills

- **hormuz-investment** — Daily macro/asset allocation report
- **commodity-ta** — 4H technical analysis for oil & gold (on-demand)

## Live dashboard

[hormuz.xingpt.com](https://hormuz.xingpt.com) (or your Vercel deployment URL)

## License

MIT

## Author

[@xingpt](https://x.com/xingpt)
