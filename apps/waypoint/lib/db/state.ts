import { notInArray } from "drizzle-orm";
import { getDb } from "./index";
import {
  rhythmDays,
  weeklyReviews,
  problems,
  fileDefense,
  rubricEntries,
  qbankStatus,
  applications,
  appMeta,
} from "./schema";
import { rubricEntryToRow, rowToRubricEntry } from "./mappers";
import { SEED } from "../../data/seed";
import type {
  WaypointState,
  RhythmDay,
  WeeklyReview,
  Application,
  Phase,
  RoleFilter,
  TargetRole,
  AppStatus,
} from "../domain";
import type { Problem, FileDefenseItem, Energy } from "@waypoint/practice-types";
import type { QBankStatus, TrackKey } from "@waypoint/qbank";

export type PersistedSlice = WaypointState;
export type LoadedState = PersistedSlice & { empty: boolean };

function seedSlice(): PersistedSlice {
  return JSON.parse(JSON.stringify(SEED)) as WaypointState;
}

export async function loadState(): Promise<LoadedState> {
  const db = await getDb();
  const meta = await db.select().from(appMeta).limit(1);
  if (meta.length === 0) {
    return { ...seedSlice(), empty: true };
  }

  const [rDays, weeks, probs, fds, rubrics, qb, apps] = await Promise.all([
    db.select().from(rhythmDays),
    db.select().from(weeklyReviews),
    db.select().from(problems),
    db.select().from(fileDefense),
    db.select().from(rubricEntries),
    db.select().from(qbankStatus),
    db.select().from(applications),
  ]);

  const rhythmOut: Record<string, RhythmDay> = {};
  for (const r of rDays) {
    rhythmOut[r.date] = {
      date: r.date,
      slots: {
        practice: r.practice,
        defense: r.defense,
        interview: r.interview,
        admin: r.admin,
      },
      ...(r.journal != null ? { journal: r.journal } : {}),
      ...(r.focusNote != null ? { focusNote: r.focusNote } : {}),
      ...(r.energy != null ? { energy: r.energy as Energy } : {}),
      ...(r.lastUpdated != null ? { lastUpdated: r.lastUpdated } : {}),
    };
  }

  const weekOut: Record<string, WeeklyReview> = {};
  for (const w of weeks) {
    weekOut[w.weekStart] = {
      weekStart: w.weekStart,
      done: w.done,
      ...(w.whatMoved != null ? { whatMoved: w.whatMoved } : {}),
      ...(w.focusNext != null ? { focusNext: w.focusNext } : {}),
      ...(w.pipelineNotes != null ? { pipelineNotes: w.pipelineNotes } : {}),
      ...(w.lastUpdated != null ? { lastUpdated: w.lastUpdated } : {}),
    };
  }

  const problemsOut: Problem[] = probs.map((r) => ({
    id: r.id,
    title: r.title,
    tier: r.tier as Problem["tier"],
    pattern: r.pattern,
    status: r.status as Problem["status"],
    ...(r.leetcodeSlug != null ? { leetcodeSlug: r.leetcodeSlug } : {}),
    ...(r.difficulty != null ? { difficulty: r.difficulty } : {}),
    core: r.core,
    ...(r.roleTrack != null ? { roleTrack: r.roleTrack as Problem["roleTrack"] } : {}),
  }));

  const fdOut: FileDefenseItem[] = fds.map((r) => ({
    id: r.id,
    title: r.title,
    why: r.why,
    terminology: r.terminology,
    interviewLine: r.interviewLine,
    practicedDates: r.practicedDates ?? [],
    ...(r.notes != null ? { notes: r.notes } : {}),
    core: r.core,
    ...(r.roleTrack != null ? { roleTrack: r.roleTrack as FileDefenseItem["roleTrack"] } : {}),
  }));

  const qbOut: Record<string, QBankStatus> = {};
  for (const r of qb) qbOut[r.questionId] = r.status;

  const appsOut: Application[] = apps.map((r) => ({
    id: r.id,
    company: r.company,
    roleTitle: r.roleTitle,
    targetRole: r.targetRole as TargetRole,
    status: r.status as AppStatus,
    statusChangedAt: r.statusChangedAt,
    materials: r.materials ?? [],
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    ...(r.url != null ? { url: r.url } : {}),
    ...(r.appliedAt != null ? { appliedAt: r.appliedAt } : {}),
    ...(r.notes != null ? { notes: r.notes } : {}),
  }));

  const m = meta[0];
  return {
    phase: (m.phase as Phase) || "B",
    roleFilter: (m.roleFilter as RoleFilter) || "ALL",
    rhythmDays: rhythmOut,
    weeklyReviews: weekOut,
    problems: problemsOut,
    fileDefense: fdOut,
    rubricEntries: rubrics.map(rowToRubricEntry),
    qbankStatus: qbOut,
    qbankPos: (m.qbankPos as { track: TrackKey; idx: number }) || { track: "swe", idx: 0 },
    applications: appsOut,
    solidInterviewLogs: m.solidInterviewLogs || { SWE_FS_II: [], MLE_II: [] },
    lastUpdated: m.lastUpdated ?? undefined,
    empty: false,
  };
}

async function upsertAll<T extends { id?: string } | Record<string, unknown>>(
  db: Awaited<ReturnType<typeof getDb>>,
  table: any,
  rows: T[],
  pk: string,
) {
  if (rows.length === 0) {
    // delete all
    await db.delete(table);
    return;
  }
  for (const row of rows) {
    await db.insert(table).values(row as any).onConflictDoUpdate({
      target: table[pk],
      set: row as any,
    });
  }
  const ids = rows.map((r) => (r as any)[pk] as string);
  await db.delete(table).where(notInArray(table[pk], ids));
}

export async function saveState(slice: PersistedSlice): Promise<{ lastUpdated: string }> {
  const db = await getDb();
  const lastUpdated = slice.lastUpdated || new Date().toISOString();

  await db.transaction(async (tx) => {
    await tx
      .insert(appMeta)
      .values({
        id: 1,
        phase: slice.phase,
        roleFilter: slice.roleFilter,
        qbankPos: slice.qbankPos,
        solidInterviewLogs: slice.solidInterviewLogs,
        lastUpdated,
      })
      .onConflictDoUpdate({
        target: appMeta.id,
        set: {
          phase: slice.phase,
          roleFilter: slice.roleFilter,
          qbankPos: slice.qbankPos,
          solidInterviewLogs: slice.solidInterviewLogs,
          lastUpdated,
        },
      });

    const rRows = Object.values(slice.rhythmDays).map((d) => ({
      date: d.date,
      practice: d.slots.practice,
      defense: d.slots.defense,
      interview: d.slots.interview,
      admin: d.slots.admin,
      journal: d.journal ?? null,
      focusNote: d.focusNote ?? null,
      energy: d.energy ?? null,
      lastUpdated: d.lastUpdated ?? null,
    }));
    if (rRows.length === 0) await tx.delete(rhythmDays);
    else {
      for (const row of rRows) {
        await tx.insert(rhythmDays).values(row).onConflictDoUpdate({ target: rhythmDays.date, set: row });
      }
      await tx.delete(rhythmDays).where(notInArray(rhythmDays.date, rRows.map((r) => r.date)));
    }

    const wRows = Object.values(slice.weeklyReviews).map((w) => ({
      weekStart: w.weekStart,
      whatMoved: w.whatMoved ?? null,
      focusNext: w.focusNext ?? null,
      pipelineNotes: w.pipelineNotes ?? null,
      done: w.done,
      lastUpdated: w.lastUpdated ?? null,
    }));
    if (wRows.length === 0) await tx.delete(weeklyReviews);
    else {
      for (const row of wRows) {
        await tx.insert(weeklyReviews).values(row).onConflictDoUpdate({ target: weeklyReviews.weekStart, set: row });
      }
      await tx.delete(weeklyReviews).where(notInArray(weeklyReviews.weekStart, wRows.map((r) => r.weekStart)));
    }

    const pRows = slice.problems.map((p) => ({
      id: p.id,
      title: p.title,
      tier: p.tier,
      pattern: p.pattern,
      status: p.status,
      leetcodeSlug: p.leetcodeSlug ?? null,
      difficulty: p.difficulty ?? null,
      core: !!p.core,
      roleTrack: p.roleTrack ?? null,
    }));
    if (pRows.length === 0) await tx.delete(problems);
    else {
      for (const row of pRows) {
        await tx.insert(problems).values(row).onConflictDoUpdate({ target: problems.id, set: row });
      }
      await tx.delete(problems).where(notInArray(problems.id, pRows.map((r) => r.id)));
    }

    const fRows = slice.fileDefense.map((f) => ({
      id: f.id,
      title: f.title,
      why: f.why,
      terminology: f.terminology,
      interviewLine: f.interviewLine,
      practicedDates: f.practicedDates ?? [],
      notes: f.notes ?? null,
      core: !!f.core,
      roleTrack: f.roleTrack ?? null,
    }));
    if (fRows.length === 0) await tx.delete(fileDefense);
    else {
      for (const row of fRows) {
        await tx.insert(fileDefense).values(row).onConflictDoUpdate({ target: fileDefense.id, set: row });
      }
      await tx.delete(fileDefense).where(notInArray(fileDefense.id, fRows.map((r) => r.id)));
    }

    const rubRows = slice.rubricEntries.map(rubricEntryToRow);
    if (rubRows.length === 0) await tx.delete(rubricEntries);
    else {
      for (const row of rubRows) {
        await tx.insert(rubricEntries).values(row).onConflictDoUpdate({ target: rubricEntries.id, set: row });
      }
      await tx.delete(rubricEntries).where(notInArray(rubricEntries.id, rubRows.map((r) => r.id)));
    }

    const qbRows = Object.entries(slice.qbankStatus).map(([questionId, status]) => ({ questionId, status }));
    if (qbRows.length === 0) await tx.delete(qbankStatus);
    else {
      for (const row of qbRows) {
        await tx.insert(qbankStatus).values(row).onConflictDoUpdate({ target: qbankStatus.questionId, set: row });
      }
      await tx.delete(qbankStatus).where(notInArray(qbankStatus.questionId, qbRows.map((r) => r.questionId)));
    }

    const aRows = slice.applications.map((a) => ({
      id: a.id,
      company: a.company,
      roleTitle: a.roleTitle,
      targetRole: a.targetRole,
      url: a.url ?? null,
      status: a.status,
      statusChangedAt: a.statusChangedAt,
      appliedAt: a.appliedAt ?? null,
      notes: a.notes ?? null,
      materials: a.materials ?? [],
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
    if (aRows.length === 0) await tx.delete(applications);
    else {
      for (const row of aRows) {
        await tx.insert(applications).values(row).onConflictDoUpdate({ target: applications.id, set: row });
      }
      await tx.delete(applications).where(notInArray(applications.id, aRows.map((r) => r.id)));
    }
  });

  return { lastUpdated };
}
