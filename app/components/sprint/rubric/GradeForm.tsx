"use client";

import { useMemo, useState } from "react";
import { useSprintStore } from "@/lib/store";
import { RD } from "@/lib/rubric/referenceData";
import { computeRaw, computeFinal, subTotal, scoreBand } from "@/lib/rubric/scoring";
import { deriveAnswerLevel, deriveQualifyingLevel, deriveDemonstratedLevel, validateMonotonic } from "@/lib/rubric/derive";
import { KGTAG_CLUSTERS } from "@/lib/rubric/clusters";
import * as DG from "@/lib/rubric/diagnostics";
import type { LevelId, LevelScores, Gates, GateVerdict, TaskType, Role, EvidenceClass, UniversalDimId, RubricEntryInput } from "@/lib/rubric/types";
import { DifficultyCalculator } from "../DifficultyCalculator";
import { Accordion } from "@/app/components/ui/Accordion";
import { AlertTriangle } from "lucide-react";

const inputCls = "w-full rounded-xl bg-[var(--bg-elev)] border border-[var(--hairline)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--cyan)]";
const LEVELS: LevelId[] = ["L1", "L2", "L3"];
const ALL_KGTAGS = Array.from(new Set(Object.values(KGTAG_CLUSTERS).flat())).sort();

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-[var(--text-dim)] mb-1">{label}</span>
      {children}
    </label>
  );
}

/** Pass/Partial/Fail (or Pass/Borderline/Fail) segmented control. */
function Segmented<T extends string>({ options, value, onChange, colorFor }: { options: readonly T[]; value: T | null; onChange: (v: T) => void; colorFor?: (v: T) => string }) {
  return (
    <div className="flex gap-1">
      {options.map((o) => {
        const active = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${active ? colorFor?.(o) ?? "border-[var(--cyan)] text-[var(--cyan)] bg-[var(--tint-cyan)]" : "border-[var(--hairline)] text-[var(--text-dim)] hover:border-[var(--hairline-strong)]"}`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

const gateColor = (v: GateVerdict) =>
  v === "Pass" ? "border-[var(--done)] text-[var(--done)] bg-[var(--tint-green)]" : v === "Partial" ? "border-[var(--yellow)] text-[var(--yellow)] bg-[var(--tint-yellow)]" : "border-[var(--orange)] text-[var(--orange)] bg-[var(--tint-orange)]";

export function GradeForm({ onLogged }: { onLogged?: () => void }) {
  const logRubricEntry = useSprintStore((s) => s.logRubricEntry);

  // Classification
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [task, setTask] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("coding");
  const [problemLevel, setProblemLevel] = useState<LevelId>("L1");
  const [difficulty, setDifficulty] = useState(2);
  const [assist, setAssist] = useState(0);
  const [evidenceClass, setEvidenceClass] = useState<EvidenceClass>("prospective");
  const [domain, setDomain] = useState("");
  const [primaryRole, setPrimaryRole] = useState<Role>("SWE");

  // Controlling scores
  const [ls, setLs] = useState<{ L1: string; L2: string; L3: string }>({ L1: "", L2: "", L3: "" });
  const [lv, setLv] = useState<Record<LevelId, DG.LevelVerdict | null>>({ L1: null, L2: null, L3: null });
  const [gates, setGates] = useState<Gates>({});

  // Supporting
  const [subs, setSubs] = useState<Record<UniversalDimId, number>>(() => Object.fromEntries(RD.universalDims.map((d) => [d.id, 0])) as Record<UniversalDimId, number>);
  const [taskScore, setTaskScore] = useState(0);
  const [cap, setCap] = useState("");
  const [penalties, setPenalties] = useState(0);

  // Tags
  const [weakTags, setWeakTags] = useState<Set<string>>(new Set());
  const [gapTypes, setGapTypes] = useState<Set<string>>(new Set());
  const [kgQuery, setKgQuery] = useState("");
  const [kgTags, setKgTags] = useState<string[]>([]);
  const [proposedTags, setProposedTags] = useState<string[]>([]);

  // Coding
  const [problemName, setProblemName] = useState("");
  const [platform, setPlatform] = useState("");
  const [codingPattern, setCodingPattern] = useState("");
  const [dataStructure, setDataStructure] = useState("");
  const [compileStatus, setCompileStatus] = useState<DG.CompileStatus | "">("");
  const [testStatus, setTestStatus] = useState<DG.TestStatus | "">("");

  // Curated diagnostics
  const [outcome, setOutcome] = useState<DG.AssessmentOutcome | "">("");
  const [probe, setProbe] = useState<{ firstAnswer?: string; oneFollowUp?: string; deepFollowUp?: string }>({});
  const [severity, setSeverity] = useState("");
  const [nextActionType, setNextActionType] = useState("");
  const [recommendedAction, setRecommendedAction] = useState("");
  const [closureStatus, setClosureStatus] = useState("");
  const [retestDate, setRetestDate] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [readiness, setReadiness] = useState("");
  const [proofScore, setProofScore] = useState("");

  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [nextTarget, setNextTarget] = useState("");
  const [overrideDerive, setOverrideDerive] = useState(false);
  const [answerLevelManual, setAnswerLevelManual] = useState<LevelId | "">("");
  const [qualifyingManual, setQualifyingManual] = useState<LevelId | "">("");
  const [flash, setFlash] = useState("");

  const numOrNull = (s: string): number | null => (s === "" || Number.isNaN(Number(s)) ? null : Number(s));
  const levelScores: LevelScores = { L1: numOrNull(ls.L1), L2: numOrNull(ls.L2), L3: numOrNull(ls.L3) };
  const monotonicOk = validateMonotonic(levelScores);

  const derivedAnswer = useMemo(() => deriveAnswerLevel(levelScores, gates, subs), [levelScores, gates, subs]);
  const derivedQual = useMemo(() => deriveQualifyingLevel(derivedAnswer, problemLevel, difficulty, assist), [derivedAnswer, problemLevel, difficulty, assist]);
  const answerLevel = overrideDerive ? answerLevelManual : derivedAnswer;
  const qualifying = overrideDerive ? qualifyingManual : derivedQual;
  const demonstrated = deriveDemonstratedLevel(levelScores, qualifying);

  const universal = subTotal(subs) ?? 0;
  const finalScore = computeFinal(computeRaw(universal, taskScore), cap === "" ? null : Number(cap), penalties);

  const allDomains = RD.domainGroups.flatMap((g) => g.domains);
  const kgMatches = kgQuery.trim() ? ALL_KGTAGS.filter((t) => t.toLowerCase().includes(kgQuery.toLowerCase()) && !kgTags.includes(t)).slice(0, 8) : [];

  const toggle = (set: React.Dispatch<React.SetStateAction<Set<string>>>, v: string) =>
    set((prev) => {
      const n = new Set(prev);
      if (n.has(v)) n.delete(v);
      else n.add(v);
      return n;
    });

  const addKgTag = (t: string) => {
    const canonical = ALL_KGTAGS.includes(t);
    if (canonical) setKgTags((p) => Array.from(new Set([...p, t])));
    else setProposedTags((p) => Array.from(new Set([...p, t])));
    setKgQuery("");
  };

  const reset = () => {
    setTask(""); setLs({ L1: "", L2: "", L3: "" }); setLv({ L1: null, L2: null, L3: null }); setGates({});
    setSubs(Object.fromEntries(RD.universalDims.map((d) => [d.id, 0])) as Record<UniversalDimId, number>);
    setTaskScore(0); setCap(""); setPenalties(0); setWeakTags(new Set()); setGapTypes(new Set()); setKgTags([]); setProposedTags([]);
    setStrengths(""); setWeaknesses(""); setNextTarget(""); setOutcome(""); setProbe({});
  };

  const submit = () => {
    if (!task.trim()) { setFlash("Add a task first."); setTimeout(() => setFlash(""), 2500); return; }
    const payload: RubricEntryInput = {
      date, task: task.trim(), taskType, problemLevel, targetLevel: problemLevel, difficulty: difficulty as RubricEntryInput["difficulty"],
      assistanceLevel: assist as RubricEntryInput["assistanceLevel"], evidenceClass, domain, primaryDomain: domain, primaryRole,
      levelScores, levelVerdicts: lv, gates,
      universalScore: universal, taskSpecificScore: taskScore, universalSubScores: subs, cap: cap === "" ? null : Number(cap), penalties,
      answerLevel: answerLevel || "", qualifyingDemonstratedLevel: qualifying || "", demonstratedLevel: demonstrated,
      weaknessTags: Array.from(weakTags), gapTypes: Array.from(gapTypes), knowledgeGapTags: kgTags,
      proposedNewTags: proposedTags.map((t) => ({ tagClass: "knowledgeGapTags" as const, proposedTag: t, reason: "Non-canonical tag entered in grade form" })),
      strengths, weaknesses, nextTarget,
      ...(taskType === "coding" ? { problemName, platform, codingPattern, primaryDataStructure: dataStructure, compileStatus: compileStatus || null, testStatus: testStatus || null } : {}),
      ...(outcome ? { assessmentOutcome: outcome } : {}),
      ...(probe.firstAnswer || probe.oneFollowUp || probe.deepFollowUp ? { probeReadiness: probe as never } : {}),
      ...(severity || nextActionType || recommendedAction ? { priority: { severity: severity || undefined, nextActionType: nextActionType || undefined, recommendedAction: recommendedAction || undefined } as never } : {}),
      ...(closureStatus || retestDate ? { gapClosureStatus: { status: closureStatus || undefined, retestRequired: !!retestDate } as never } : {}),
      ...(retestDate ? { retestPlan: { retestDate } } : {}),
      ...(targetRole || readiness ? { roleReadinessRollup: { targetRole: targetRole || undefined, readiness: (readiness || undefined) as never, recommendedNextMilestone: nextTarget || undefined } } : {}),
      ...(proofScore ? { proofStrength: { score: Number(proofScore) } } : {}),
    };
    logRubricEntry(payload);
    reset();
    setFlash(`Logged — qualifying ${qualifying || "—"} · demonstrated ${demonstrated}.`);
    setTimeout(() => setFlash(""), 3500);
    onLogged?.();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-5">
        {/* Classification */}
        <div className="card-glass p-6 space-y-4">
          <div className="section-title !mb-1">CLASSIFICATION</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
            <Field label="Task type">
              <select value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)} className={inputCls}>
                {RD.taskTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Task"><input value={task} onChange={(e) => setTask(e.target.value)} placeholder="e.g. LeetCode 242 Valid Anagram" className={inputCls} /></Field>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Problem level">
              <div className="flex gap-1">{LEVELS.map((l) => <button key={l} type="button" onClick={() => setProblemLevel(l)} className={`flex-1 px-2 py-2 rounded-lg text-sm border ${problemLevel === l ? "border-[var(--cyan)] text-[var(--cyan)] bg-[var(--tint-cyan)]" : "border-[var(--hairline)] text-[var(--text-dim)]"}`}>{l}</button>)}</div>
            </Field>
            <Field label="Domain">
              <select value={domain} onChange={(e) => setDomain(e.target.value)} className={inputCls}><option value="">—</option>{allDomains.map((d) => <option key={d} value={d}>{d}</option>)}</select>
            </Field>
            <Field label="Primary role">
              <select value={primaryRole} onChange={(e) => setPrimaryRole(e.target.value as Role)} className={inputCls}>{RD.roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select>
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label={`Difficulty D${difficulty}`}>
              <div className="flex gap-1">{[1, 2, 3, 4, 5].map((d) => <button key={d} type="button" onClick={() => setDifficulty(d)} className={`flex-1 px-2 py-1.5 rounded-lg text-sm border ${difficulty === d ? "border-[var(--cyan)] text-[var(--cyan)] bg-[var(--tint-cyan)]" : "border-[var(--hairline)] text-[var(--text-dim)]"}`}>D{d}</button>)}</div>
            </Field>
            <Field label={`Assistance A${assist}`}>
              <div className="flex gap-1">{RD.assistance.map((a) => <button key={a.lvl} type="button" title={a.desc} onClick={() => setAssist(a.lvl)} className={`flex-1 px-2 py-1.5 rounded-lg text-xs border ${assist === a.lvl ? "border-[var(--cyan)] text-[var(--cyan)] bg-[var(--tint-cyan)]" : "border-[var(--hairline)] text-[var(--text-dim)]"}`}>A{a.lvl}</button>)}</div>
            </Field>
          </div>
        </div>

        {/* Three level scores (controlling) */}
        <div className="card-glass p-6 space-y-3">
          <div className="section-title !mb-1">LEVEL SCORES (CONTROLLING)</div>
          {LEVELS.map((l) => (
            <div key={l} className="flex items-center gap-3">
              <div className="w-8 font-mono text-sm text-[var(--text-mid)]">{l}</div>
              <input type="number" min={0} max={100} value={ls[l]} onChange={(e) => setLs((p) => ({ ...p, [l]: e.target.value }))} placeholder="0–100" className={`${inputCls} w-24`} />
              <Segmented options={DG.LEVEL_VERDICTS} value={lv[l]} onChange={(v) => setLv((p) => ({ ...p, [l]: v }))} />
              {levelScores[l] !== null && <span className={`text-xs ${scoreBand(levelScores[l]!).cls}`}>{scoreBand(levelScores[l]!).verdict}</span>}
            </div>
          ))}
          {!monotonicOk && (
            <div className="flex items-center gap-2 text-xs text-[var(--orange)] pt-1">
              <AlertTriangle size={13} /> Scores should satisfy L3 ≤ L2 ≤ L1 (§3.2) — likely a grading error.
            </div>
          )}
        </div>

        {/* Gates */}
        <div className="card-glass p-6 space-y-2">
          <div className="section-title !mb-1">MANDATORY GATES</div>
          {RD.gates.map((g) => (
            <div key={g.gate} className="flex items-center justify-between gap-3">
              <div className="text-sm text-[var(--text-mid)]" title={g.req}>{g.gate}</div>
              <Segmented options={DG.GATE_VERDICTS} value={(gates[g.gate as keyof Gates] as GateVerdict) ?? null} onChange={(v) => setGates((p) => ({ ...p, [g.gate]: v }))} colorFor={gateColor} />
            </div>
          ))}
        </div>

        <Accordion title="Universal & task-specific sub-scores">
          <div className="space-y-2">
            {RD.universalDims.map((d) => (
              <div key={d.id} className="flex items-center gap-3">
                <div className="w-44 text-sm text-[var(--text-mid)]">{d.label}</div>
                <input type="range" min={0} max={d.max} value={subs[d.id]} onChange={(e) => setSubs((p) => ({ ...p, [d.id]: Number(e.target.value) }))} className="flex-1 accent-[var(--cyan)]" />
                <div className="w-14 text-right font-mono text-sm">{subs[d.id]}<span className="text-[var(--text-dim)]">/{d.max}</span></div>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-2 border-t border-[var(--hairline)]">
              <div className="w-44 text-sm text-[var(--text-mid)]">Task-specific score</div>
              <input type="range" min={0} max={100} value={taskScore} onChange={(e) => setTaskScore(Number(e.target.value))} className="flex-1 accent-[var(--magenta)]" />
              <div className="w-14 text-right font-mono text-sm">{taskScore}</div>
            </div>
            <div className="text-[11px] text-[var(--text-dim)] mt-1">{RD.taskRubrics.find((r) => r.id === taskType)?.categories.map((c) => `${c.name} ${c.weight}`).join(" · ")}</div>
            <div className="flex gap-3 pt-2">
              <Field label="Cap"><input type="number" value={cap} onChange={(e) => setCap(e.target.value)} placeholder="none" className={`${inputCls} w-28`} /></Field>
              <Field label="Penalties"><input type="number" value={penalties} onChange={(e) => setPenalties(Number(e.target.value) || 0)} className={`${inputCls} w-28`} /></Field>
            </div>
          </div>
        </Accordion>

        <Accordion title="Tags (weakness · gap type · knowledge gap)">
          <div className="space-y-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--text-dim)] mb-1">Weakness tags</div>
              <div className="flex flex-wrap gap-1.5">{RD.weaknessTags.map((t) => <button key={t} type="button" onClick={() => toggle(setWeakTags, t)} className={`px-2 py-0.5 rounded text-xs border ${weakTags.has(t) ? "border-[var(--orange)] text-[var(--orange)]" : "border-[var(--hairline)] text-[var(--text-dim)]"}`}>{t}</button>)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--text-dim)] mb-1">Gap types</div>
              <div className="flex flex-wrap gap-1.5">{DG.GAP_TYPES.map((t) => <button key={t} type="button" onClick={() => toggle(setGapTypes, t)} className={`px-2 py-0.5 rounded text-xs border ${gapTypes.has(t) ? "border-[var(--violet)] text-[var(--violet)]" : "border-[var(--hairline)] text-[var(--text-dim)]"}`}>{t}</button>)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--text-dim)] mb-1">Knowledge-gap tags</div>
              <div className="relative">
                <input value={kgQuery} onChange={(e) => setKgQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && kgQuery.trim()) { e.preventDefault(); addKgTag(kgQuery.trim()); } }} placeholder="Type to search canonical tags (Enter to add / propose)…" className={inputCls} />
                {kgMatches.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-[var(--hairline)] bg-[var(--surface)] max-h-48 overflow-y-auto">
                    {kgMatches.map((m) => <button key={m} type="button" onClick={() => addKgTag(m)} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--fill-subtle)]">{m}</button>)}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {kgTags.map((t) => <span key={t} className="text-xs px-2 py-0.5 rounded bg-[var(--tint-cyan)] border border-[var(--hairline)]">{t} <button type="button" onClick={() => setKgTags((p) => p.filter((x) => x !== t))}>×</button></span>)}
                {proposedTags.map((t) => <span key={t} className="text-xs px-2 py-0.5 rounded border border-[var(--yellow)] text-[var(--yellow)]" title="Non-canonical → proposedNewTags">{t}? <button type="button" onClick={() => setProposedTags((p) => p.filter((x) => x !== t))}>×</button></span>)}
              </div>
            </div>
          </div>
        </Accordion>

        {taskType === "coding" && (
          <Accordion title="Coding metadata" defaultOpen>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Problem name"><input value={problemName} onChange={(e) => setProblemName(e.target.value)} className={inputCls} /></Field>
              <Field label="Platform"><input value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="LeetCode…" className={inputCls} /></Field>
              <Field label="Coding pattern"><input value={codingPattern} onChange={(e) => setCodingPattern(e.target.value)} className={inputCls} /></Field>
              <Field label="Primary data structure"><input value={dataStructure} onChange={(e) => setDataStructure(e.target.value)} className={inputCls} /></Field>
              <Field label="Compile status"><select value={compileStatus} onChange={(e) => setCompileStatus(e.target.value as DG.CompileStatus)} className={inputCls}><option value="">—</option>{DG.COMPILE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
              <Field label="Test status"><select value={testStatus} onChange={(e) => setTestStatus(e.target.value as DG.TestStatus)} className={inputCls}><option value="">—</option>{DG.TEST_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
            </div>
          </Accordion>
        )}

        <Accordion title="Diagnostics (outcome · probe · priority · retest · role · proof)">
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Assessment outcome"><select value={outcome} onChange={(e) => setOutcome(e.target.value as DG.AssessmentOutcome)} className={inputCls}><option value="">—</option>{DG.ASSESSMENT_OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}</select></Field>
              <Field label="Proof strength (0–1)"><input type="number" min={0} max={1} step={0.05} value={proofScore} onChange={(e) => setProofScore(e.target.value)} className={inputCls} /></Field>
            </div>
            <Field label="Probe readiness (first / +1 / deep)">
              <div className="flex gap-3">
                {(["firstAnswer", "oneFollowUp", "deepFollowUp"] as const).map((k) => (
                  <Segmented key={k} options={DG.PROBE_VALUES} value={(probe[k] as DG.LevelVerdict) ?? null} onChange={(v) => setProbe((p) => ({ ...p, [k]: v }))} />
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Priority severity"><select value={severity} onChange={(e) => setSeverity(e.target.value)} className={inputCls}><option value="">—</option>{DG.SEVERITY.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
              <Field label="Next action"><select value={nextActionType} onChange={(e) => setNextActionType(e.target.value)} className={inputCls}><option value="">—</option>{DG.NEXT_ACTION_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
            </div>
            <Field label="Recommended action"><input value={recommendedAction} onChange={(e) => setRecommendedAction(e.target.value)} className={inputCls} /></Field>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Gap closure"><select value={closureStatus} onChange={(e) => setClosureStatus(e.target.value)} className={inputCls}><option value="">—</option>{DG.GAP_CLOSURE_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
              <Field label="Retest date"><input type="date" value={retestDate} onChange={(e) => setRetestDate(e.target.value)} className={inputCls} /></Field>
              <Field label="Readiness (role)"><select value={readiness} onChange={(e) => setReadiness(e.target.value)} className={inputCls}><option value="">—</option>{DG.ROLE_READINESS.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
            </div>
            <Field label="Target role"><select value={targetRole} onChange={(e) => setTargetRole(e.target.value)} className={inputCls}><option value="">—</option>{DG.TARGET_ROLES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
          </div>
        </Accordion>

        <Accordion title="Narrative (strengths · weaknesses · next target)">
          <div className="space-y-3">
            <Field label="Strengths"><textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} className={`${inputCls} h-16`} /></Field>
            <Field label="Weaknesses"><textarea value={weaknesses} onChange={(e) => setWeaknesses(e.target.value)} className={`${inputCls} h-16`} /></Field>
            <Field label="Next target"><input value={nextTarget} onChange={(e) => setNextTarget(e.target.value)} className={inputCls} /></Field>
          </div>
        </Accordion>
      </div>

      {/* Right rail: live derived result */}
      <div className="space-y-5">
        <div className="card-glass p-6 sticky top-24">
          <div className="section-title">DEMONSTRATED LEVEL</div>
          <div className="text-center py-3">
            <div className="text-4xl font-bold tracking-tight text-[var(--cyan)]">{qualifying || "—"}</div>
            <div className="text-sm text-[var(--text-mid)] mt-1">{demonstrated}</div>
          </div>
          <div className="space-y-1.5 text-xs text-[var(--text-mid)] font-mono border-t border-[var(--hairline)] pt-3">
            <Row k="Answer level" v={answerLevel || "—"} />
            <Row k="Qualifying" v={qualifying || "—"} />
            <Row k="Final (support)" v={finalScore} />
          </div>
          <label className="flex items-center gap-2 text-xs text-[var(--text-dim)] mt-3">
            <input type="checkbox" checked={overrideDerive} onChange={(e) => setOverrideDerive(e.target.checked)} /> Override derived levels
          </label>
          {overrideDerive && (
            <div className="flex gap-2 mt-2">
              <select value={answerLevelManual} onChange={(e) => setAnswerLevelManual(e.target.value as LevelId)} className={`${inputCls} text-xs`}><option value="">answer —</option>{LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}</select>
              <select value={qualifyingManual} onChange={(e) => setQualifyingManual(e.target.value as LevelId)} className={`${inputCls} text-xs`}><option value="">qual —</option>{LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}</select>
            </div>
          )}
          <button onClick={submit} className="btn-primary w-full mt-4">Log Assessment</button>
          {flash && <div className="text-xs text-center mt-3 text-[var(--text-mid)]">{flash}</div>}
        </div>
        <div className="card-glass p-5">
          <div className="section-title !mb-2">DIFFICULTY CALCULATOR</div>
          <DifficultyCalculator onResult={(lvl) => setDifficulty(Math.max(1, Math.min(5, lvl)))} />
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="flex justify-between">
      <span>{k}</span>
      <span className="text-[var(--text)]">{v}</span>
    </div>
  );
}
