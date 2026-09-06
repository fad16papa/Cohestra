# shellcheck shell=bash
# Sourced by UAT deploy scripts. Never prints secrets.

shared_host_uat_enabled() {
  local raw="${COHESTRA_SHARED_HOST_UAT:-true}"
  raw="${raw//[[:space:]]/}"
  raw="${raw,,}"
  case "$raw" in
    false|0|no|off) return 1 ;;
    *) return 0 ;;
  esac
}

refuse_legacy_compose_project() {
  if [[ "${COMPOSE_PROJECT_NAME:-}" == "cohestra-infra-uat" ]]; then
    echo "REFUSE: COMPOSE_PROJECT_NAME=cohestra-infra-uat may be the live public stack."
    echo "Isolated Cohestra UAT must use compose project cohestra-uat (the name: in docker-compose.uat.yml)."
    return 1
  fi
  return 0
}

refuse_shared_host_cohestra_tls() {
  if shared_host_uat_enabled; then
    echo "REFUSE: shared-host UAT must not run Cohestra Let's Encrypt / :443 scripts."
    echo "Terminate TLS on the HOST public reverse proxy and proxy to 127.0.0.1:8180."
    echo "See deploy/host-proxy/README.md"
    echo "Set COHESTRA_SHARED_HOST_UAT=false only on a dedicated Cohestra droplet."
    return 1
  fi
  return 0
}

refuse_ssl_nginx_config() {
  local path="${NGINX_CONFIG_PATH:-}"
  if [[ -z "$path" ]]; then
    return 0
  fi
  case "$path" in
    *active-ssl.conf*|*app-ssl.conf*|*ssl.conf*)
      if shared_host_uat_enabled; then
        echo "REFUSE: NGINX_CONFIG_PATH=$path is TLS config. Shared-host Cohestra nginx stays HTTP (deploy/nginx/app.conf)."
        return 1
      fi
      ;;
  esac
  return 0
}

refuse_public_cohestra_host_ports() {
  if [[ "${NGINX_HOST_PORT:-8180}" == "80" || "${NGINX_HOST_PORT:-8180}" == "443" ]]; then
    echo "REFUSE: NGINX_HOST_PORT must not be 80 or 443 on the shared droplet."
    return 1
  fi
  if [[ "${WEB_HOST_PORT:-3100}" == "80" || "${WEB_HOST_PORT:-3100}" == "443" ]]; then
    echo "REFUSE: WEB_HOST_PORT must not be 80 or 443."
    return 1
  fi
  if [[ "${API_HOST_PORT:-5100}" == "80" || "${API_HOST_PORT:-5100}" == "443" ]]; then
    echo "REFUSE: API_HOST_PORT must not be 80 or 443."
    return 1
  fi
  return 0
}
