# Story 40.5 before / after journey map

| Journey | Before | After |
| --- | --- | --- |
| Follow-up category/page → Client → Back | `/clients/{id}` with no return. Browser Back worked; refresh and crumb did not. | `?ctx=fu:<category>[:page]`. Breadcrumb and mobile Back restore the exact Follow-up URL. |
| Clients filters/sort/page → Profile → Back | Filters were in the URL; sort/page were React state. Profile had no return token. | Sort/page join the URL. Profile carries `ctx=cl:<allowlisted query>`. |
| Dashboard `view` → Client/Activity → Back | Queue and rankings dropped the view. | `ctx=d:<view>` reconstructed by `dashboardHrefForView`. |
| Client registration → Activity | Activity name was display text only. | Link only when `activityId` is a UUID. No name-derived URL. |
| Activity → Client | `/clients/{id}` with no origin. | Incoming `ctx` kept, or `ctx=ac:<id>:registrations`. |
| Hard refresh | Pathname crumbs only. | Typed `ctx` survives. |
| Invalid / external token | No parser. | Rejected; canonical parent. |
| Command palette | Canonical hrefs already. Quick action said “View reports”. | Analytics label. First follow-up onboarding → `/follow-up`. |
