/**
 * Catalog introspection and comparison.
 *
 * INT-004's baseline decision turns on one question: is this existing database's
 * schema *demonstrably identical* to what the initial migration would build? A
 * sentinel test ("does wp_app_meta exist?") cannot answer that — a partially
 * upgraded database can hold that table while missing a column or an index, and
 * stamping it would permanently skip DDL it still needs.
 *
 * So the predicate is a full catalog comparison: tables, columns, types,
 * nullability, defaults, and named indexes. The expectation is never hand-written;
 * it is materialised by applying the migration to a throwaway database, so it
 * cannot drift away from the migration it claims to describe.
 *
 * Pure over its input rows: no I/O lives here beyond the two queries it issues
 * through a caller-supplied client.
 */

/** The minimum surface this module needs — PGlite and any pg-like client satisfy it. */
export interface QueryableClient {
  query<T = Record<string, unknown>>(sql: string): Promise<{ rows: T[] }>;
}

export interface ColumnFact {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

export interface IndexFact {
  indexname: string;
  indexdef: string;
}

export interface Catalog {
  columns: string[];
  indexes: string[];
  tableCount: number;
}

const COLUMN_SQL = `
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, column_name
`;

const INDEX_SQL = `
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by indexname
`;

/**
 * One comparable line per column. Defaults are included because a missing default
 * is a real schema difference that changes what a later insert writes.
 */
export function columnKey(r: ColumnFact): string {
  return [
    r.table_name,
    r.column_name,
    r.data_type,
    r.is_nullable,
    r.column_default ?? "NONE",
  ].join(" :: ");
}

export function indexKey(r: IndexFact): string {
  return `${r.indexname} :: ${r.indexdef}`;
}

export async function readCatalog(client: QueryableClient): Promise<Catalog> {
  const cols = await client.query<ColumnFact>(COLUMN_SQL);
  const idx = await client.query<IndexFact>(INDEX_SQL);
  return {
    columns: cols.rows.map(columnKey).sort(),
    indexes: idx.rows.map(indexKey).sort(),
    tableCount: new Set(cols.rows.map((r) => r.table_name)).size,
  };
}

export interface CatalogDiff {
  identical: boolean;
  missing: string[]; // expected by the migration, absent from the live database
  extra: string[]; // present in the live database, not produced by the migration
}

/**
 * Compare a live catalog against the reference one.
 *
 * Both directions matter and they mean different things. `missing` says the
 * database has not had DDL it needs, so stamping would skip that work forever.
 * `extra` says the database holds objects the migration does not describe, so its
 * history is not the history the ledger would claim. Either one blocks the
 * baseline; neither is safe to wave through.
 */
export function diffCatalog(live: Catalog, reference: Catalog): CatalogDiff {
  const liveAll = new Set([...live.columns, ...live.indexes]);
  const refAll = new Set([...reference.columns, ...reference.indexes]);
  const missing = [...refAll].filter((x) => !liveAll.has(x)).sort();
  const extra = [...liveAll].filter((x) => !refAll.has(x)).sort();
  return { identical: missing.length === 0 && extra.length === 0, missing, extra };
}

/** True when the database holds none of the application's own tables. */
export function isEmptyOfAppTables(live: Catalog): boolean {
  return live.tableCount === 0;
}

/**
 * A message an operator can act on at 3am. Truncated deliberately: the point is to
 * name the shape of the mismatch, not to dump a hundred lines into a boot log.
 */
export function describeMismatch(diff: CatalogDiff, limit = 8): string {
  const parts: string[] = [];
  if (diff.missing.length > 0) {
    parts.push(
      `missing ${diff.missing.length} object(s) the initial migration creates:\n  - ` +
        diff.missing.slice(0, limit).join("\n  - ") +
        (diff.missing.length > limit ? `\n  - …and ${diff.missing.length - limit} more` : ""),
    );
  }
  if (diff.extra.length > 0) {
    parts.push(
      `holds ${diff.extra.length} object(s) the initial migration does not create:\n  - ` +
        diff.extra.slice(0, limit).join("\n  - ") +
        (diff.extra.length > limit ? `\n  - …and ${diff.extra.length - limit} more` : ""),
    );
  }
  return parts.join("\n");
}
