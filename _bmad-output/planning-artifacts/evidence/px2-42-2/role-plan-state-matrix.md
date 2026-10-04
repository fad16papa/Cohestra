# Story 42.2 role / plan / activity-state matrix

Responsive composition must not change any of these meanings.

| State | Expected (unchanged) | 42.2 note |
|---|---|---|
| Loading activity | Existing activity detail loading | Builder not interactive |
| Activity not found | Existing ProductErrorState | No Form Studio chrome |
| Permission denied | Role 403 denial, not UpgradePanel | No new lock UI |
| Plan-locked columns/domain/steps | Named disabled control + reason | Still named |
| Basic admin | Can edit Basic-allowed fields | Columns/domain stay locked |
| Core/Pro/Enterprise operator | Existing feature set | Layout only |
| Member | Existing activity edit if permitted | Layout only |
| Draft activity | Full edit + templates | Inspector compositions apply |
| Published activity | Edit + save; templates locked | Same |
| Archived | Builder disabled; templates hidden | Toggle/Sheet still honest, controls disabled |
| No selected block | Inspector empty copy | Toggle still available <1280 |
| Selected field | `FormFieldEditor` inspectorOnly | One instance |
| Selected content/section/columns/domain | `FormCompositionInspector` | One instance |
| Inspector collapsed | 1024–1279 overlay hidden | Selection + draft kept |
| Inspector open | Overlay or Sheet or docked | Same draft |
| Dirty / saving / save error / saved | Existing save bar | Resize does not save |
| Preview | Unmounted while hidden | Unchanged |

Do not add plan math. Do not add a production seeder.
