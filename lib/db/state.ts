/**
 * loadState / saveState — recompose the persisted store slice from normalized
 * tables, and decompose+persist it in one transaction (upsert-present +
 * delete-missing, so client deletions propagate).
 *
 * When the DB has never been written (no app_meta row), loadState returns the
 * SEED-composed slice with `empty: true` so the client can run its one-time
 * localStorage migration before initializing the server.
 */

import { notInArray, getTableColumns, sql } from 'drizzle-orm';
import type { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import { getDb, type AppDb } from './index';
import { days, stages, problems, fileDefense, rubricEntries, qbankStatus, appMeta } from './schema';
import { rubricEntryToRow, rowToRubricEntry } from './mappers';
import { SEED } from '../../data/seed';
import type { AppState, DayState, StageState, Problem, FileDefenseItem, Energy } from '../types';
import type { RubricEntry } from '../rubric/types';
import type { QBankStatus, TrackKey } from '../qbank/types';

export interface PersistedSlice {
  days: Record<number, DayState>;
  stages: Record<string, StageState>;
  problems: Problem[];
  fileDefense: FileDefenseItem[];
  rubricEntries: RubricEntry[];
  qbankStatus: Record<string, QBankStatus>;
  qbankPos: { track: TrackKey; idx: number };
  selectedDay: number;
  lastUpdated?: string;
}

export type LoadedState = PersistedSlice & { empty: boolean };

function seedSlice(): PersistedSlice {
  const s = SEED as AppState;
  return {
    days: JSON.parse(JSON.stringify(s.days || {})),
    stages: JSON.parse(JSON.stringify(s.stages || {})),
    problems: JSON.parse(JSON.stringify(s.problems || [])),
    fileDefense: JSON.parse(JSON.stringify(s.fileDefense || [])),
    rubricEntries: [],
    qbankStatus: {},
    qbankPos: { track: 'swe', idx: 0 },
    selectedDay: 1,
    lastUpdated: s.lastUpdated,
  };
}

export async function loadState(): Promise<LoadedState> {
  const db = await getDb();
  const meta = await db.select().from(appMeta).limit(1);
  if (meta.length === 0) {
    return { ...seedSlice(), empty: true };
  }

  const [dayRows, stageRows, problemRows, fdRows, rubricRows, qbRows] = await Promise.all([
    db.select().from(days),
    db.select().from(stages),
    db.select().from(problems),
    db.select().from(fileDefense),
    db.select().from(rubricEntries),
    db.select().from(qbankStatus),
  ]);

  const daysOut: Record<number, DayState> = {};
  for (const r of dayRows) {
    const d: DayState = { rhythm: { coding: r.coding, file: r.file, qa: r.qa, build: r.build } };
    if (r.journal != null) d.journal = r.journal;
    if (r.focusNote != null) d.focusNote = r.focusNote;
    if (r.energy != null) d.energy = r.energy as Energy;
    if (r.lastUpdated != null) d.lastUpdated = r.lastUpdated;
    daysOut[r.day] = d;
  }

  const stagesOut: Record<string, StageState> = {};
  for (const r of stageRows) {
    stagesOut[r.id] = r.doneAt != null ? { done: r.done, doneAt: r.doneAt } : { done: r.done };
  }

  const problemsOut: Problem[] = problemRows.map((r) => ({
    id: r.id,
    title: r.title,
    tier: r.tier as Problem['tier'],
    pattern: r.pattern,
    status: r.status as Problem['status'],
    ...(r.leetcodeSlug != null ? { leetcodeSlug: r.leetcodeSlug } : {}),
    ...(r.difficulty != null ? { difficulty: r.difficulty } : {}),
  }));

  const fdOut: FileDefenseItem[] = fdRows.map((r) => ({
    id: r.id,
    title: r.title,
    why: r.why,
    terminology: r.terminology,
    interviewLine: r.interviewLine,
    practicedDates: r.practicedDates ?? [],
    ...(r.notes != null ? { notes: r.notes } : {}),
  }));

  const rubricOut = rubricRows.map(rowToRubricEntry).sort((a, b) => (a.date < b.date ? 1 : -1));

  const qbOut: Record<string, QBankStatus> = {};
  for (const r of qbRows) qbOut[r.questionId] = r.status;

  const m = meta[0];
  return {
    days: daysOut,
    stages: stagesOut,
    problems: problemsOut,
    fileDefense: fdOut,
    rubricEntries: rubricOut,
    qbankStatus: qbOut,
    qbankPos: (m.qbankPos as { track: TrackKey; idx: number }) ?? { track: 'swe', idx: 0 },
    selectedDay: m.selectedDay ?? 1,
    lastUpdated: m.lastUpdated ?? undefined,
    empty: false,
  };
}

type Tx = Parameters<Parameters<AppDb['transaction']>[0]>[0];

/** Upsert every row (delete-missing by PK), or clear the table when rows is empty. */
async function upsertCollection(
  tx: Tx,
  table: PgTable,
  pk: PgColumn,
  pkKey: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  if (!rows.length) {
    await tx.delete(table);
    return;
  }
  const cols = getTableColumns(table);
  const set: Record<string, unknown> = {};
  for (const [key, col] of Object.entries(cols)) {
    if ((col as PgColumn).name === pk.name) continue;
    set[key] = sql`excluded.${sql.identifier((col as PgColumn).name)}`;
  }
  await tx.insert(table).values(rows).onConflictDoUpdate({ target: pk, set });
  await tx.delete(table).where(notInArray(pk, rows.map((r) => r[pkKey])));
}

export async function saveState(slice: PersistedSlice): Promise<{ lastUpdated: string }> {
  const db = await getDb();
  const lastUpdated = slice.lastUpdated ?? new Date().toISOString();

  await db.transaction(async (tx) => {
    await tx
      .insert(appMeta)
      .values({ id: 1, selectedDay: slice.selectedDay ?? 1, qbankPos: slice.qbankPos ?? { track: 'swe', idx: 0 }, lastUpdated })
      .onConflictDoUpdate({
        target: appMeta.id,
        set: { selectedDay: slice.selectedDay ?? 1, qbankPos: slice.qbankPos ?? { track: 'swe', idx: 0 }, lastUpdated },
      });

    await upsertCollection(tx, days, days.day, 'day', Object.entries(slice.days || {}).map(([day, d]) => ({
      day: Number(day), coding: !!d.rhythm.coding, file: !!d.rhythm.file, qa: !!d.rhythm.qa, build: !!d.rhythm.build,
      journal: d.journal ?? null, focusNote: d.focusNote ?? null, energy: d.energy ?? null, lastUpdated: d.lastUpdated ?? null,
    })));

    await upsertCollection(tx, stages, stages.id, 'id', Object.entries(slice.stages || {}).map(([id, s]) => ({ id, done: !!s.done, doneAt: s.doneAt ?? null })));

    await upsertCollection(tx, problems, problems.id, 'id', (slice.problems || []).map((p) => ({
      id: p.id, title: p.title, tier: p.tier, pattern: p.pattern, status: p.status, leetcodeSlug: p.leetcodeSlug ?? null, difficulty: p.difficulty ?? null,
    })));

    await upsertCollection(tx, fileDefense, fileDefense.id, 'id', (slice.fileDefense || []).map((f) => ({
      id: f.id, title: f.title, why: f.why, terminology: f.terminology, interviewLine: f.interviewLine, practicedDates: f.practicedDates ?? [], notes: f.notes ?? null,
    })));

    await upsertCollection(tx, rubricEntries, rubricEntries.id, 'id', (slice.rubricEntries || []).map(rubricEntryToRow) as unknown as Record<string, unknown>[]);

    await upsertCollection(tx, qbankStatus, qbankStatus.questionId, 'questionId', Object.entries(slice.qbankStatus || {}).map(([questionId, status]) => ({ questionId, status })));
  });

  return { lastUpdated };
}
