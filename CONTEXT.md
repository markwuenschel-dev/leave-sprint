# Domain glossary

## Waypoint

The personal career transition hub product (successor identity to Leave Sprint Twin). Arc: readiness rebuild (**phase B**), then land a role (**phase A**). Code slug: `waypoint` (`apps/waypoint`, `@waypoint/*`). Not a leave-sprint countdown product.

## Leave Sprint Twin

Archived predecessor dashboard for a fixed 29-day leave sprint. Not a living product; reference/import source only.

## Phase B / Phase A

**Phase B** — readiness rebuild. **Phase A** — active role search / applications. Arc is B then A.

## Hybrid gate / evidence floor

**Evidence green** means the checkable floor is met: practice solidity (~80% Solid on a core list), interview performance (≥2 solid mocks or scored sessions), and core stories/file defense cold — for **both** primary roles (SWE Full Stack II and MLE II). Secondary and escape roles do not block. Applications, network, resume polish, and full-bank completion are not floor criteria. Crossing evidence green does not auto-start Phase A; the human still decides the go/no-go.

## Rhythm

Waypoint cadence is a **rolling daily checklist** plus a **weekly review** (not a fixed 29-day leave plan). Phase B daily disciplines: **Practice**, **Defense**, **Interview reps**, **Admin light**. Phase A uses the same four, weighted toward applications inside Admin light and weekly review. Completing rhythm checkboxes is not the same as meeting the evidence floor.

## Twin import

Optional one-shot (not required if starting clean / not using twin data): practice progress and full rubric history only. Twin scaffolding may remain in the repo; twin is not the live product. Days/stages/meta out.

## Application

A pipeline row is one **role + company** pursuit, with `targetRole` and a short status set (wishlist → applied → interviewing → offer | rejected | withdrawn). Not a CRM.

## Waypoint shell

Primary nav: Today, Readiness, Practice, Defense, Interview, Applications, Weekly, More. Hybrid gate lives on Readiness. Monorepo: `apps/waypoint`, `@waypoint/rubric`, `@waypoint/qbank`, `@waypoint/practice-types`.
