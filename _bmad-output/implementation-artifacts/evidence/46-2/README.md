# Story 46.2 evidence

Public, sanitized host facts only.

| File | What it proves |
| --- | --- |
| `host-hardening.txt` | Droplet identity, isolation, sshd settings, host marker |
| `firewall-live.json` | Cloud firewall 22 source-restricted; 80/443 public; no data/app ports |
| `port-probes.txt` | 5432/6379/3000/8080 publicly closed; host listen table |
| `ssh-proofs.txt` | Key auth proven; password auth denied; key still works |
| `unattended-updates.txt` | unattended-upgrades enabled/active |
| `uat-unchanged.txt` | UAT droplet/firewall/CD files untouched |
| `workloads.txt` | No Cohestra/Docker workload |
| `dns-unchanged.txt` | No DNS API mutation |
| `secret-scan.txt` | No tokens/keys in committed evidence |
| `validate-production-host.txt` | `deploy/validate-production-host.sh` output |
| `owner-verification-2026-10-20.txt` | Live revalidation + owner SSH gate (not owner login proof) |

Never commit:

- DigitalOcean API tokens
- SSH private keys
- passwords
- GitHub secrets
- application `.env` values
