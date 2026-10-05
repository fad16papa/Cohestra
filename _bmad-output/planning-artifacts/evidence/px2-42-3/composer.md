# Grok vs Composer usage

Primary: Grok 4.6. Auto mode disabled.

Composer 2.5 was **not used**.

No isolated presentational task existed after the contract was locked. The 44px classes live on the same control that owns `Reorder {item}`, `touch-none`, `aria-grabbed`, HTML5 drag, and the touch/pen pointer sensor. Handing that class pass to Composer would have mixed presentational work with drag/event/name ownership, which the model policy forbids.

Grok inspected the full Story 42.3 diff, including the Website `onDraftChangeRef` effect move (lint-only, no sensor change).
