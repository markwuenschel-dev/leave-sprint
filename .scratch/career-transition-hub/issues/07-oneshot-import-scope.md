# One-shot import scope

Type: grilling
Status: resolved
Blocked by: 05

## Question

Which **slices of archived twin data** are worth a one-shot import into the greenfield hub schema, and which are abandoned?

Examples to accept/reject: problem bank statuses, qbank progress, rubric/grade history, day journals, stage checkoffs, file-defense practiced dates. Output an import manifest (source → target concept) and explicit non-imports. Blocked on package inventory so “what can carry” is known.

## Answer

### Human correction (2026-07-09)

- **If** import ever runs: only **rubric history + practice progress** (problems, qbank, file-defense).
- Human **is not using the twin** → import is **optional**, not a Day-1 blocker; no need for twin-catalog / snapshot variants.
- **Leave scaffolding for twin** in the repo (code stays available); do not design Day-1 around twin as a live app.

One-shot only (not ongoing sync) when used.

### Import manifest (when used)

| Twin source | Hub target concept |
|-------------|-------------------|
| `problems` status (+ id) | Practice problem progress |
| `qbank_status` | QBank progress |
| `file_defense` practicedDates + notes (+ id) | Defense practice progress |
| `rubric_entries` (full history) | Rubric / grade history |

### Explicit non-imports

- `days`, `stages`, `app_meta`, journals, twin as catalog SoT, live dual-write.

### Mechanics

- Optional script under hub; skip entirely if starting clean.
- ID-join progress to hub catalogs; drop unmatched; quarantine corrupt rubric rows.
