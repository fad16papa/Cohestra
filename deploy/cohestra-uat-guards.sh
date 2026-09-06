# shellcheck shell=bash
# Sourced by UAT deploy scripts. Never prints secrets.

refuse_legacy_compose_project() {
  if [[ "${COMPOSE_PROJECT_NAME:-}" == "cohestra-infra-uat" ]]; then
    echo "REFUSE: COMPOSE_PROJECT_NAME=cohestra-infra-uat may be the live public stack."
    echo "Isolated Cohestra UAT must use compose project cohestra-uat (the name: in docker-compose.uat.yml)."
    return 1
  fi
  return 0
}

refuse_shared_host_cohestra_tls() {
  if [[ "${COHESTRA_SHARED_HOST_UAT:-true}" == "true" ]]; then
    echo "REFUSE: shared-host UAT must not run Cohestra Let's Encrypt / :443 scripts."
    echo "Terminate TLS on the HOST public reverse proxy and proxy to 127.0.0.1:8180."
    echo "See deploy/host-proxy/README.md"
    echo "Set COHESTRA_SHARED_HOST_UAT=false only on a dedicated Cohestra droplet."
    return 1
  fi
  return 0
}
