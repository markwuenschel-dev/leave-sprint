# Waypoint — IA shell (cheap prototype)

**Mode:** outline only — no UI build.  
**Stamped:** agent recommendations after human asked to stop grilling.

## Product frame

- **Name:** Waypoint  
- **Phases:** B (readiness) → A (applications), hybrid gate  
- **Roles in chrome:** always show **SWE FS II** and **MLE II** as equal primaries; secondary/escape available in settings / role weights, not equal nav weight  

## Primary nav (desktop + mobile bottom/rail)

| Nav item | Purpose | Phase emphasis |
|----------|---------|----------------|
| **Today** | Daily checklist (Practice · Defense · Interview reps · Admin light) | B & A (weights change) |
| **Readiness** | Evidence floor dashboard + distance to green + personal go/no-go flip | B primary; A glance |
| **Practice** | Problem bank, patterns, solidity | B heavy |
| **Defense** | File/story defense cold list | B heavy |
| **Interview** | Q bank, mocks, rubric log / grade | B heavy |
| **Applications** | Pipeline (role+company rows) | A heavy; present in B (wishlist ok) |
| **Weekly** | Weekly review ritual | Both |
| **More** | Export/backup, import twin, settings (roles, theme, token), about | — |

**Not in primary nav:** leave calendar Day 1–29, stage stepper, workbench, velocity-as-sprint-pace.

## Where the hybrid gate lives

- **Home of truth:** **Readiness** — three dimensions × two primaries, green/not green, “I’m flipping to Phase A” control (disabled or warned if not evidence-green; can still force with confirm — personal go/no-go wins).  
- **Glance:** compact chip on **Today** header: `Evidence: ··· / green` + phase badge `B` | `A`.

## Where applications live

- **Applications** nav = list + detail drawer/page.  
- Day-1 fields: company, role title, `targetRole` (SWE FS II | MLE II | secondary…), status, dates, URL, notes, materials links.  
- No email sync, no multi-round graph as first-class nav.

## Dual-primary appearance

- Global **role filter** (All | SWE | MLE) on Practice / Defense / Interview / Readiness.  
- Default **All** with both primaries’ floor scores visible side-by-side on Readiness.  
- Next-action ranking (later) must not collapse dual primary into one “eng” score.

## Phase A mode weight (same shell)

- Today: Admin light copy/prompts lean applications.  
- Applications moves up in mobile tab order when phase = A (optional).  
- Weekly review template: pipeline + interviews first, then readiness maintenance.

## Anti-patterns rejected

- Recreating Leave Sprint Twin’s 9-tab dump.  
- Separate “B app” and “A app.”  
- Gate only buried in settings.  
- Applications hidden until evidence green (wishlist allowed in B).
