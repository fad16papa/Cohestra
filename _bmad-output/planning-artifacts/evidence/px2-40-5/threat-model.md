# Story 40.5 return-path threat model

See also `architecture.md`.

| Threat | Control |
| --- | --- |
| Open redirect via `returnTo` | Primary mechanism is typed `ctx`, not raw hrefs. `normalizeInternalReturnPath` still rejects unsafe strings. |
| Encoded external (`%2f%2f`, nested decode) | `decodeRepeated` + `looksExternal` before accept. |
| Protocol-relative `//host` | Rejected. |
| `javascript:` / `data:` / `vbscript:` | Blocked schemes. |
| Absolute `https://` | Rejected. |
| Oversized / malformed | Max 512 chars. Unknown rooms/tabs/UUIDs → null. |
| JWT / email / phone / answers in URL | Not accepted as `ctx` fields. Allowlisted query keys only. Values containing `@` + `.` dropped. |
| Tenant-host crossing | Continuity never assigns `location` to unparsed input. API isolation remains Host + JWT. |
| Stale query context | URL is authoritative. Invalid tokens fall back to canonical parent. |
| History pollution | Room query writes use `replace` for filters/tabs. Journey links are normal pushes. |
| Authorization bypass | Breadcrumb is not a grant. Guards and entitlements still run. |
