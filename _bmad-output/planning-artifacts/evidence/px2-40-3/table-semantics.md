# Story 40.3 table-semantics decision

**Decision:** native `<table>` / `<thead>` / `<tbody>` / `<tr>` / `<th scope="col">` / `<td>` at `md+`.

Cards remain `<article>` below 768px and are **not** given row/columnheader roles.

Sort buttons live inside `th`, not as `role="columnheader"` orphans.

Proof required: axe on `/clients` has no `aria-required-children` or `aria-required-parent`. Keyboard can reach select, name link, WhatsApp/Viber, mark-contacted, and sort headers.
