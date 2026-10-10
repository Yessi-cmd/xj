#!/usr/bin/env bash
set -Eeuo pipefail
export PATH="/opt/xuanjian-updater/node/bin:$PATH"
export TZ=Asia/Shanghai
export NODE_OPTIONS=--max-old-space-size=384
export WRANGLER_SEND_METRICS=false
source_dir=/opt/xuanjian-updater/source
site_dir=/var/www/xj.norliva.top
state_dir=/var/lib/xuanjian-updater
mkdir -p "$state_dir"
exec 9>"$state_dir/update.lock"
flock -n 9 || exit 0
cd "$source_dir"
previous=$(readlink -f "$site_dir/current")
if [ "${1:-}" != "--force" ] && ! cmp -s "$source_dir/.updater-source-id" "$previous/.updater-source-id"; then
  printf '%s REFUSE current release differs from updater source; synchronize code before updating\n' "$(date -Is)" | tee "$state_dir/last-failure"
  exit 1
fi
candidate=""
switched=0
finish() {
  result=$?
  if [ "$result" -ne 0 ]; then
    if [ "$switched" -eq 1 ]; then
      ln -sfnT "$previous" "$site_dir/current.rollback"
      mv -Tf "$site_dir/current.rollback" "$site_dir/current"
    fi
    printf '%s FAILED exit=%s; previous release retained\n' "$(date -Is)" "$result" | tee "$state_dir/last-failure"
  fi
}
trap finish EXIT
printf '%s START\n' "$(date -Is)"
# source_dir/data 是 public/data 的本地符号链接，只操作待构建源数据。
python3 scripts/update-vps-data.py "$source_dir" "$@"
if [ ! -f .data-updated ]; then
  printf '%s SKIP no new data\n' "$(date -Is)"
  exit 0
fi
cp public/data/market-snapshot.json app/data/market-snapshot.json
# 依赖预先安装；普通更新构建不执行 npm install，也不访问网络数据源。
npm run build:vps
candidate="$site_dir/releases/auto-data-$(date +%Y%m%d%H%M%S)"
mkdir "$candidate"
cp -a dist-vps/. "$candidate/"
cp "$source_dir/.updater-source-id" "$candidate/.updater-source-id"
python3 scripts/validate-data-release.py "$candidate"
ln -sfnT "$candidate" "$site_dir/current.next"
mv -Tf "$site_dir/current.next" "$site_dir/current"
switched=1
curl --fail --silent --show-error --resolve xj.norliva.top:443:127.0.0.1 https://xj.norliva.top/live -o "$state_dir/live-check.html"
grep -q '玄鉴每日玄签' "$state_dir/live-check.html"
curl --fail --silent --show-error --resolve xj.norliva.top:443:127.0.0.1 https://xj.norliva.top/data/mystic-stock-index.json -o "$state_dir/index-check.json"
cmp "$candidate/data/mystic-stock-index.json" "$state_dir/index-check.json"
curl --fail --silent --show-error --head --resolve xj.norliva.top:443:127.0.0.1 https://xj.norliva.top/ -o "$state_dir/headers-check.txt"
grep -qi '^content-security-policy:' "$state_dir/headers-check.txt"
grep -qi '^x-content-type-options: nosniff' "$state_dir/headers-check.txt"
rm .data-updated
printf '%s SUCCESS release=%s\n' "$(date -Is)" "$candidate" | tee "$state_dir/last-success"
python3 scripts/prune-auto-releases.py "$site_dir" "$previous" || printf '%s Cleanup deferred; release remains healthy\n' "$(date -Is)"
