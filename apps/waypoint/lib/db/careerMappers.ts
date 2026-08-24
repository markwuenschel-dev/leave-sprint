/**
 * Career Library row ⇄ domain object.
 *
 * Mirrors the split lib/db/mappers.ts already uses for rubric entries: scalars that
 * a query might filter or sort on are promoted to real columns; everything else
 * rides in a `data` jsonb. This module is the ONLY place that knows which fields are
 * promoted, so the two halves cannot drift.
 *
 * Reads are defensive. A `data` blob written by an older build can be missing keys,
 * and the correct response is a sane default, never a crash on hydrate — losing the
 * whole state fetch because one project predates a field would be a far worse bug
 * than a project showing an empty technologies list.
 */

import type { CareerRoleId } from "@waypoint/competency";
import { isCareerRoleId } from "@waypoint/competency";
import {
  EMPTY_PROJECT_DEFENSE,
  type Campaign,
  type CampaignStage,
  type JdSnapshot,
  type JobTarget,
  type OwnershipLevel,
  type Project,
  type ProjectDefense,
  type ProjectStage,
  type ProjectTesting,
  type ResumeClaim,
  type ResumeVersion,
} from "../career/types";

/** A `data` jsonb payload, before we know what is in it. */
type Blob = Record<string, unknown>;

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const s = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const optS = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const role = (v: unknown): CareerRoleId | null => (isCareerRoleId(v) ? v : null);

/* ───────────────────────── projects ───────────────────────── */

export interface ProjectRow {
  id: string;
  slug: string;
  name: string;
  summary: string;
  stage: string;
  ownership: string;
  createdAt: string;
  updatedAt: string;
  data: Blob;
}

export function projectToRow(p: Project): ProjectRow {
  const { id, slug, name, summary, stage, ownership, createdAt, updatedAt, ...rest } = p;
  return {
    id,
    slug,
    name,
    summary,
    stage,
    ownership,
    createdAt,
    updatedAt,
    data: rest as unknown as Blob,
  };
}

function readTesting(v: unknown): ProjectTesting {
  if (v && typeof v === "object") {
    const t = v as Blob;
    return {
      strategy: s(t.strategy),
      automated: t.automated === true,
      ...(optS(t.coverageNote) ? { coverageNote: s(t.coverageNote) } : {}),
    };
  }
  return { strategy: "", automated: false };
}

function readDefense(v: unknown): ProjectDefense {
  if (v && typeof v === "object") {
    const d = v as Blob;
    return {
      canExplainArchitecture: d.canExplainArchitecture === true,
      canDefendDecisions: d.canDefendDecisions === true,
      canReproduceCold: d.canReproduceCold === true,
      canDiscussFailures: d.canDiscussFailures === true,
      canStateLimitations: d.canStateLimitations === true,
      lastRehearsed: typeof d.lastRehearsed === "string" ? d.lastRehearsed : null,
      ...(optS(d.note) ? { note: s(d.note) } : {}),
    };
  }
  return { ...EMPTY_PROJECT_DEFENSE };
}

export function rowToProject(r: ProjectRow): Project {
  const d = r.data ?? {};
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    summary: r.summary,
    stage: r.stage as ProjectStage,
    ownership: r.ownership as OwnershipLevel,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    architecture: s(d.architecture),
    technologies: arr<string>(d.technologies),
    decisions: arr(d.decisions),
    testing: readTesting(d.testing),
    failures: arr(d.failures),
    limitations: arr(d.limitations),
    competencies: arr(d.competencies),
    evidenceRefs: arr(d.evidenceRefs),
    defense: readDefense(d.defense),
    ...(optS(d.ownershipNote) ? { ownershipNote: s(d.ownershipNote) } : {}),
    ...(optS(d.repoUrl) ? { repoUrl: s(d.repoUrl) } : {}),
    ...(optS(d.demoUrl) ? { demoUrl: s(d.demoUrl) } : {}),
  };
}

/* ───────────────────────── resumes ───────────────────────── */

export interface ResumeRow {
  id: string;
  label: string;
  targetRole: string | null;
  frozenAt: string | null;
  createdAt: string;
  updatedAt: string;
  data: Blob;
}

export function resumeToRow(r: ResumeVersion): ResumeRow {
  const { id, label, targetRole, frozenAt, createdAt, updatedAt, ...rest } = r;
  return {
    id,
    label,
    targetRole: targetRole ?? null,
    frozenAt: frozenAt ?? null,
    createdAt,
    updatedAt,
    data: rest as unknown as Blob,
  };
}

export function rowToResume(r: ResumeRow): ResumeVersion {
  const d = r.data ?? {};
  return {
    id: r.id,
    label: r.label,
    targetRole: role(r.targetRole),
    frozenAt: r.frozenAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    body: s(d.body),
    claims: arr<ResumeClaim>(d.claims),
    ...(optS(d.submittedAs) ? { submittedAs: s(d.submittedAs) } : {}),
  };
}

/* ───────────────────────── job targets ───────────────────────── */

export interface JobTargetRow {
  id: string;
  company: string;
  roleTitle: string;
  careerRole: string | null;
  applicationId: string | null;
  submittedResumeId: string | null;
  createdAt: string;
  updatedAt: string;
  data: Blob;
}

export function jobTargetToRow(t: JobTarget): JobTargetRow {
  const {
    id,
    company,
    roleTitle,
    careerRole,
    applicationId,
    submittedResumeId,
    createdAt,
    updatedAt,
    ...rest
  } = t;
  return {
    id,
    company,
    roleTitle,
    careerRole: careerRole ?? null,
    applicationId: applicationId ?? null,
    submittedResumeId: submittedResumeId ?? null,
    createdAt,
    updatedAt,
    data: rest as unknown as Blob,
  };
}

export function rowToJobTarget(r: JobTargetRow): JobTarget {
  const d = r.data ?? {};
  return {
    id: r.id,
    company: r.company,
    roleTitle: r.roleTitle,
    careerRole: role(r.careerRole),
    applicationId: r.applicationId,
    submittedResumeId: r.submittedResumeId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    snapshots: arr<JdSnapshot>(d.snapshots),
    ...(optS(d.seniority) ? { seniority: s(d.seniority) } : {}),
    ...(optS(d.location) ? { location: s(d.location) } : {}),
    ...(optS(d.notes) ? { notes: s(d.notes) } : {}),
  };
}

/* ───────────────────────── campaigns ───────────────────────── */

export interface CampaignRow {
  id: string;
  jobTargetId: string;
  careerRole: string;
  currentStageId: string | null;
  createdAt: string;
  updatedAt: string;
  data: Blob;
}

export function campaignToRow(c: Campaign): CampaignRow {
  const { id, jobTargetId, careerRole, currentStageId, createdAt, updatedAt, ...rest } = c;
  return {
    id,
    jobTargetId,
    careerRole,
    currentStageId: currentStageId ?? null,
    createdAt,
    updatedAt,
    data: rest as unknown as Blob,
  };
}

export function rowToCampaign(r: CampaignRow): Campaign {
  const d = r.data ?? {};
  return {
    id: r.id,
    jobTargetId: r.jobTargetId,
    // A campaign always has a role; an unrecognised string falls back to `swe`
    // rather than propagating an invalid id into the projection layer.
    careerRole: role(r.careerRole) ?? "swe",
    currentStageId: r.currentStageId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    stages: arr<CampaignStage>(d.stages),
    domainRequirements: arr<string>(d.domainRequirements),
  };
}
