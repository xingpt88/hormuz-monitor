#!/bin/bash
# update_and_deploy.sh
# Run after hormuz-monitor writes to MONITOR_LOG.md
# Generates data.json from monitor data and pushes to GitHub → Vercel auto-deploys

set -e

WEBSITE_REPO="$HOME/hormuz-website"
SCRIPT_PATH="$HOME/hormuz-website/scripts/update_website_data.py"

# 1. Generate data.json
echo "📊 Generating data.json from MONITOR_LOG.md..."
python3 "$SCRIPT_PATH"

# 2. Git commit & push
cd "$WEBSITE_REPO"
if git diff --quiet public/data.json 2>/dev/null; then
    echo "✅ No changes in data.json, skip push"
else
    git add public/data.json
    git commit -m "auto: update monitor data $(date -u +%Y-%m-%dT%H:%MZ)"
    git push origin main
    echo "✅ Pushed to GitHub → Vercel will auto-deploy"
fi
