/**
 * Stable, collision-resistant ids. Re-ingesting an updated hand-off must land on
 * the SAME id so `practicedDates` / `notes` survive the merge — matching how
 * mergeCatalogLists and applyTwinImport join by id. Ids derive from the title
 * (human-stable), falling back to the path, and collisions get a deterministic
 * numeric suffix in input order.
 */

export function slug(s: string, max = 48): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, max);
}

export function conceptSlug(s: string): string {
  return slug(s, 40);
}

/**
 * Project-scoped defense-item id, e.g. "f-compounding-quality-rag-http-adapter".
 * Scoping by project prevents cross-project collisions (two projects can both
 * have a "server.py") and lets a re-ingest replace exactly one project's cards.
 */
export function defenseId(projectKey: string, file: { title: string; path: string }): string {
  const proj = slug(projectKey) || "proj";
  const base = slug(file.title) || slug(file.path.replace(/\.[a-z0-9]+$/i, "")) || "item";
  return `f-${proj}-${base}`;
}

/** Resolve duplicate ids deterministically: first wins, rest get -2, -3, … */
export function dedupeIds<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Map<string, number>();
  return rows.map((r) => {
    const n = (seen.get(r.id) ?? 0) + 1;
    seen.set(r.id, n);
    return n === 1 ? r : { ...r, id: `${r.id}-${n}` };
  });
}
