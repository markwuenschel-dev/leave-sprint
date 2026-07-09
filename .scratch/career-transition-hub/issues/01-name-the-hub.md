# Name the hub

Type: grilling
Status: resolved
Blocked by:

## Question

What is the **product name and one-line identity** for the new hub (replacing “Leave Sprint Twin” in UI, package, and deploy mental model)?

Constraints already locked: career transition hub; B→A arc; not a leave-sprint countdown product. Decide display name, optional short slug for `apps/` / package scope, and whether the git repo rename is in-scope for later implementation or explicitly deferred.

## Answer

- **Display name:** Waypoint  
- **One-line identity:** Personal career transition hub — readiness rebuild (B) then land a role (A).  
- **Slug:** `waypoint` → `apps/waypoint`, packages `@waypoint/rubric`, `@waypoint/qbank` (and further `@waypoint/*` as needed).  
- **GitHub repo rename** (`leave-sprint` → …): **deferred** until after a real Day-1 hub exists; not part of early implementation.
