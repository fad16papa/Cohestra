# Activity Form Schema — v2 composition addendum (Epic 36)

Extends [activity-form-schema-v1.md](./activity-form-schema-v1.md). **v1 remains valid** without `composition`.

## Version

| `version` | Meaning |
|-----------|---------|
| `1` | Legacy linear form — `fields` only; no `composition` on save |
| `2` | Visual composition — `composition` required on save |

## Top-level

```json
{
  "version": 2,
  "fields": [],
  "composition": []
}
```

| Property | Type | Required (v2) | Notes |
|----------|------|---------------|-------|
| `composition` | array | yes (v2) | Ordered tree of presentation/structure nodes |

Input definitions remain in `fields`. Submission and validation use `fields` only.

## Composition node

Each node:

| Property | Type | Notes |
|----------|------|-------|
| `id` | string | Unique within schema |
| `kind` | string | `fieldRef` \| `content` \| `section` \| `columns` \| `domain` |

### fieldRef

References `fields[].id`. Required for every submittable field (except legacy presentation field types `section_header`, `info`).

### content

`contentType`: `heading` \| `paragraph` \| `divider` \| `image`  
`content`: `{ text?, level?, imageUrl?, alt? }`

### section

`title?`, `description?`, `children[]`

### columns

`columns`: `[ [...], [...] ]` — exactly **two** columns for MVP.

### domain

`domain`: `activityDetails` \| `communityIdentity` \| `capacityStatus` — binds Activity/public data at render time (Epic 36.7+).

## Normalization

When `composition` is absent (v1), APIs and clients may **synthesize** linear `fieldRef` nodes for Studio UI without persisting until the operator saves v2.
