# Applications pipeline Day-1 surface

Type: grilling
Status: resolved
Blocked by:
Parked reason: _(cleared — stamped on human request: “do your recs”)_

## Question

What is the **minimum real applications pipeline** that still counts as production Day-1 (floor ≥ prior option B): entities, statuses, materials versions, company/research notes, and what is explicitly deferred?

Must support dual primary targets (SWE FS II and MLE II) without forcing a single-track pipeline. Output a crisp surface list an implementer can schema and UI against — not pixel mockups.

## Answer

**Stamped defaults** (human authorized agent recs).

### Entity

- **Application** = one **role + company** row you are pursuing.
- Fields (Day-1): `id`, `company`, `roleTitle`, `targetRole` (enum: SWE_FS_II | MLE_II | DS | DE | BIE | BIA | other), `url?`, `status`, `statusChangedAt`, `appliedAt?`, `notes` (markdown/text), `materials[]` (label + url or local ref), `createdAt`, `updatedAt`.

### Status set

`wishlist` → `applied` → `interviewing` → `offer` | `rejected` | `withdrawn`  
(Optional UI alias “ghosted” → `rejected` or note tag — not a separate required status.)

### Materials

- Per-application **links/refs** (resume variant, portfolio, JD snapshot URL).
- Optional **global materials library** (named resume versions) linked by id — thin is fine Day-1.
- No full ATS resume lab.

### Dual primary

- `targetRole` on every row; filters/views by role; no separate pipelines.

### Explicitly deferred

- Email/calendar sync, auto-import from LinkedIn/Greenhouse, multi-round interview graphs as first-class entities, CRM/network, salary/comp modeling, browser extension.

### Production bar (surface-level)

- CRUD, filter by status/role, durable server persist, empty states, export-friendly shape — not a placeholder tab.
