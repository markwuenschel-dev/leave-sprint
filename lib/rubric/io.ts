/**
 * JSON import/export for rubric records + a markdown reference export.
 * Import routes every record through normaliseEntry, so old rubric-log-v1 files
 * (single object or array) are accepted and de-duped by id.
 */

import { RD } from './referenceData';
import { normaliseEntry, flattenForExport } from './normalize';
import type { RubricEntry } from './types';

/** Serialize entries back to the old flat schema (extra re-flattened). */
export function exportEntries(entries: RubricEntry[]): string {
  return JSON.stringify(entries.map(flattenForExport), null, 2);
}

export interface ImportResult {
  entries: RubricEntry[];
  count: number;
}

/** Normalise parsed JSON (single record, array, or a backup object with a
 *  `rubricEntries` array) into de-duped entries. Later duplicates win. */
function entriesFromData(data: unknown): RubricEntry[] {
  // A full backup/export object carries its grades under `rubricEntries`.
  const source =
    data && typeof data === 'object' && !Array.isArray(data) &&
    Array.isArray((data as { rubricEntries?: unknown }).rubricEntries)
      ? (data as { rubricEntries: unknown[] }).rubricEntries
      : data;
  const list = Array.isArray(source) ? source : [source];
  const byId = new Map<string, RubricEntry>();
  for (const raw of list) {
    const entry = normaliseEntry(raw as Record<string, unknown>);
    byId.set(entry.id, entry);
  }
  return Array.from(byId.values());
}

/** Parse a JSON string (object | array) into normalised, de-duped entries. */
export function parseImport(text: string): ImportResult {
  const entries = entriesFromData(JSON.parse(text));
  return { entries, count: entries.length };
}

/** Per-file outcome for a multi-file grading import. */
export interface FileImportResult {
  name: string;
  count: number;
  error?: string;
}

export interface MultiImportResult {
  /** Aggregated, id-de-duped entries across all files (later files win). */
  entries: RubricEntry[];
  count: number;
  files: FileImportResult[];
  ok: number;
  failed: number;
}

/**
 * Parse many JSON files into one merged, de-duped set of rubric entries.
 * Each file may be a single record, an array of records, or a full backup
 * object (grades read from its `rubricEntries`). Parse failures are isolated
 * per-file so one malformed file never aborts the whole batch.
 */
export async function parseImportFiles(files: FileList | File[]): Promise<MultiImportResult> {
  const byId = new Map<string, RubricEntry>();
  const results: FileImportResult[] = [];
  for (const file of Array.from(files)) {
    try {
      const entries = entriesFromData(JSON.parse(await file.text()));
      for (const e of entries) byId.set(e.id, e); // later file / later entry wins
      results.push({ name: file.name, count: entries.length });
    } catch (err) {
      results.push({ name: file.name, count: 0, error: err instanceof Error ? err.message : 'invalid JSON' });
    }
  }
  const entries = Array.from(byId.values());
  return {
    entries,
    count: entries.length,
    files: results,
    ok: results.filter((r) => !r.error).length,
    failed: results.filter((r) => r.error).length,
  };
}

/** Merge incoming entries into an existing set, de-duping by id (incoming wins). */
export function mergeEntries(existing: RubricEntry[], incoming: RubricEntry[]): RubricEntry[] {
  const byId = new Map(existing.map((e) => [e.id, e]));
  for (const e of incoming) byId.set(e.id, e);
  return Array.from(byId.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Human-readable markdown dump of the full RD reference for offline study. */
export function exportReferenceMarkdown(): string {
  const lines: string[] = [];
  lines.push(`# Technical Competency Scoring System — Reference (v${RD ? '1.10' : ''})`, '');

  lines.push('## Levels');
  RD.levels.forEach((l) => lines.push(`- **${l.label} — ${l.subtitle}** (${l.difficultyRange}, assist ≤${l.maxAssistance}): ${l.standard}`));
  lines.push('');

  lines.push('## Universal competency dimensions');
  RD.universalDims.forEach((d) => lines.push(`- ${d.label} — weight ${d.max}`));
  lines.push('');

  lines.push('## Difficulty (D1–D5)');
  RD.difficulty.forEach((d) => lines.push(`- **D${d.d} ${d.label}** (${d.level}): ${d.desc}`));
  lines.push('');

  lines.push('## Mandatory gates');
  RD.gates.forEach((g) => lines.push(`- **${g.gate}** — ${g.req}`));
  lines.push('');

  lines.push('## Assistance levels');
  RD.assistance.forEach((a) => lines.push(`- A${a.lvl} ${a.desc} — ${a.autonomy}`));
  lines.push('');

  lines.push('## Score bands');
  RD.scoreBands.forEach((b) => lines.push(`- ${b.range}: ${b.verdict}`));
  lines.push('');

  lines.push('## Grading principles');
  RD.gradingPrinciples.forEach((p) => lines.push(`- ${p}`));
  lines.push('');

  lines.push('## Promotion evidence');
  (['L1', 'L2', 'L3'] as const).forEach((lvl) => {
    lines.push(`### ${lvl}`);
    const reqs = RD.promotionEvidence[lvl] as ReadonlyArray<{
      type: string; min: number; label?: string; maxAssist?: number; minDiff?: number;
    }>;
    reqs.forEach((r) => {
      const cons: string[] = [];
      if (r.maxAssist !== undefined) cons.push(`A≤${r.maxAssist}`);
      if (r.minDiff !== undefined) cons.push(`D≥${r.minDiff}`);
      lines.push(`- ${r.min}× ${r.label ?? r.type}${cons.length ? ` (${cons.join(', ')})` : ''}`);
    });
    lines.push('');
  });

  return lines.join('\n');
}
