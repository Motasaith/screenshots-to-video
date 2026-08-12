#!/bin/bash
#
# Deploy narrashot.
#
# Ordering matters: the schema is pushed after the build and before the
# restart, so the new code never starts against an old schema. That mismatch is
# what produced the "Failed query: insert into `steps` ..." error, where the
# code expected a column the table did not have.
#
set -euo pipefail

cd /var/www/narrashot

# This script is version controlled, so `git pull` can rewrite the very file
# bash is executing. Bash reads a script incrementally, which means a pull that
# changes the line count can make it resume at the wrong byte offset and run
# nonsense. Pull first, then hand over to the freshly pulled copy, so the rest
# of the deploy always runs the version that was just fetched.
if [ "${DEPLOY_REEXEC:-0}" != "1" ]; then
  echo "⬇️  Pulling latest code..."
  git pull
  DEPLOY_REEXEC=1 exec bash "$0" "$@"
fi

echo "📦 Installing dependencies..."
npm install

echo "🔧 Fixing ffmpeg..."
# npm install can replace node_modules/ffmpeg-static, so the symlink is
# recreated every deploy rather than assumed to have survived.
if [ ! -x /usr/bin/ffmpeg ]; then
  echo "❌ /usr/bin/ffmpeg not found. Install it with: apt install ffmpeg"
  exit 1
fi
rm -f node_modules/ffmpeg-static/ffmpeg
ln -s /usr/bin/ffmpeg node_modules/ffmpeg-static/ffmpeg

echo "🏗️  Building..."
npm run build

echo "🗄️  Applying database schema..."
# `drizzle-kit push` diffs db/schema.ts against the live database and applies
# the difference. Adding a column is silent and safe. Dropping or retyping one
# is a data-loss statement, and push asks before doing it.
#
# stdin is closed deliberately. With no terminal to prompt, a data-loss change
# makes push fail instead of hanging the deploy waiting for input that will
# never come. `set -e` then stops here, before pm2 restarts, so the running app
# is left untouched and you can go and look.
#
# --force is NOT used on purpose: its own help says it "may truncate your
# tables and data". Nothing should be able to truncate production just because
# a deploy ran. If push stops here and the change is genuinely intended, apply
# it deliberately and re-run this script.
if npm run db:push < /dev/null; then
  echo "   schema up to date"
else
  echo ""
  echo "❌ Schema push failed or needs confirmation. Nothing was restarted."
  echo "   The app is still running the previous version."
  echo "   Inspect the diff, apply the change deliberately, then re-run:"
  echo "     cd /var/www/narrashot && npx drizzle-kit push --verbose"
  exit 1
fi

echo "🔄 Restarting..."
# startOrReload, not restart: the render worker is now a second process defined in
# ecosystem.config.cjs, and this creates it on the first deploy after the split
# instead of failing because there is nothing called narrashot-worker yet.
#
# Reload rather than restart so the API stays up through the swap, and so the
# worker gets its SIGTERM drain window to finish the render in flight.
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

echo ""
echo "   Processes:"
pm2 list | grep -E "narrashot|name" || true

echo "✅ Deploy complete!"
