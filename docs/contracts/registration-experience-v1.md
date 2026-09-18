# Registration Experience (v1)

Additive contract on activity `registration_theme` JSON (same column as Registration Experience Studio presets).

## Shape

```json
{
  "preset": "classic",
  "inheritCommunityBrand": true,
  "accentColor": null,
  "heroImageUrl": null,
  "experience": {
    "layout": "centered",
    "style": "modern",
    "flow": "single-page",
    "heroDisplay": "cover"
  }
}
```

| Field | Values | Notes |
|-------|--------|-------|
| `experience.layout` | `centered`, `split`, `poster`, `immersive`, `card` | Omitted → derived from `preset` |
| `experience.style` | `modern`, `minimal`, `editorial`, `bold`, `soft` | Default `modern` |
| `experience.flow` | `single-page`, `sections`, `step-by-step`, `conversational` | Conversational Pro-gated |
| `experience.heroDisplay` | `cover`, `contain`, `full-bleed`, `split`, `background`, `hidden` | Layout-dependent validity enforced in later stories |

Admin reads expose `resolvedRegistrationTheme.resolvedExperience` with all fields populated.

Legacy activities without `experience` continue to resolve from `preset` only.
