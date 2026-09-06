#!/usr/bin/env bash
# Backup host-mounted nginx config for lead-generation-crm-nginx-1.
# Does not reload, restart, or change the running container.
# Does not copy certificate private keys or Let's Encrypt account material.
# Writes ONLY to a host backup directory (never git).
#
# Usage (on the droplet):
#   bash deploy/host-proxy/backup-existing-nginx.sh

set -euo pipefail

EDGE_NGINX="${EXISTING_EDGE_NGINX_CONTAINER:-lead-generation-crm-nginx-1}"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_ROOT="${COHESTRA_EDGE_BACKUP_DIR:-$HOME/cohestra-uat-edge-backups}"
DEST="$BACKUP_ROOT/$STAMP"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker CLI required" >&2
  exit 1
fi
if ! docker inspect "$EDGE_NGINX" >/dev/null 2>&1; then
  echo "Container $EDGE_NGINX not found" >&2
  exit 1
fi

mkdir -p "$DEST"
echo "== Backup $EDGE_NGINX → $DEST =="

cid=$(docker inspect --format '{{.Id}}' "$EDGE_NGINX")
image=$(docker inspect --format '{{.Config.Image}}' "$EDGE_NGINX")
networks=$(docker inspect --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$EDGE_NGINX")

{
  echo "timestamp_utc=$STAMP"
  echo "container=$EDGE_NGINX"
  echo "container_id=$cid"
  echo "image=$image"
  echo "networks=$networks"
} > "$DEST/MANIFEST.txt"

echo "--- mounts ---" >> "$DEST/MANIFEST.txt"
docker inspect --format '{{range .Mounts}}{{.Type}} {{.Source}} -> {{.Destination}} rw={{.RW}}{{println}}{{end}}' "$EDGE_NGINX" >> "$DEST/MANIFEST.txt"

copied=0
skipped=0
while IFS=$'\t' read -r src dest; do
  [[ -n "$src" ]] || continue
  case "$src$dest" in
    *letsencrypt*|*privkey*|*account*|*ssl/private*)
      echo "SKIP cert/key material: $src -> $dest"
      echo "skipped_source=$src dest=$dest reason=cert-or-key" >> "$DEST/MANIFEST.txt"
      skipped=$((skipped + 1))
      continue
      ;;
  esac
  case "$dest" in
    /etc/nginx|/etc/nginx/*|/etc/nginx/conf.d|/etc/nginx/conf.d/*|/etc/nginx/templates|/etc/nginx/templates/*)
      ;;
    *)
      echo "SKIP non-nginx mount: $src -> $dest"
      echo "skipped_source=$src dest=$dest reason=not-nginx-conf" >> "$DEST/MANIFEST.txt"
      skipped=$((skipped + 1))
      continue
      ;;
  esac
  if [[ ! -e "$src" ]]; then
    echo "SKIP missing host source: $src"
    echo "skipped_source=$src dest=$dest reason=missing-on-host" >> "$DEST/MANIFEST.txt"
    skipped=$((skipped + 1))
    continue
  fi
  safe=$(echo "$dest" | sed 's#^/##' | tr '/' '_')
  target="$DEST/host-$safe"
  if [[ -d "$src" ]]; then
    mkdir -p "$target"
    # Copy configs only; never .pem/.key
    find "$src" -type f \( -name '*.conf' -o -name '*.template' -o -name 'nginx.conf' \) -print0 \
      | while IFS= read -r -d '' f; do
          rel="${f#$src/}"
          mkdir -p "$target/$(dirname "$rel")"
          cp -a "$f" "$target/$rel"
        done
  else
    case "$src" in
      *.pem|*.key) echo "SKIP key-like file $src"; skipped=$((skipped + 1)); continue ;;
    esac
    cp -a "$src" "$target"
  fi
  echo "COPIED $src -> $target"
  echo "copied_source=$src dest=$dest backup=$target" >> "$DEST/MANIFEST.txt"
  copied=$((copied + 1))
done < <(docker inspect --format '{{range .Mounts}}{{if eq .Type "bind"}}{{.Source}}{{"\t"}}{{.Destination}}{{println}}{{end}}{{end}}' "$EDGE_NGINX")

echo "copied=$copied skipped=$skipped" >> "$DEST/MANIFEST.txt"
echo "BACKUP PASS"
echo "manifest=$DEST/MANIFEST.txt"
echo "Do not commit $DEST. Do not print certificate private keys."
