#!/bin/bash
# update_and_deploy.sh
# Run after hormuz-monitor writes to MONITOR_LOG.md
# Generates data.json from monitor data and pushes to GitHub → Vercel auto-deploys

set -e

REPO="$HOME/hormuz-website"
SCRIPT="$REPO/scripts/update_website_data.py"
DATA_FILE="$REPO/website/public/data.json"

# 1. Generate data.json
echo "📊 Generating data.json from MONITOR_LOG.md..."
python3 "$SCRIPT"

# 2. Git commit & push (only if data changed)
cd "$REPO"
if git diff --quiet "$DATA_FILE" 2>/dev/null; then
    echo "✅ No changes in data.json, skip push"
else
    git add "$DATA_FILE"
    git commit -m "auto: update monitor data $(date -u +%Y-%m-%dT%H:%MZ)"
    git push origin main
    echo "✅ Pushed to GitHub → Vercel will auto-deploy"
fi
