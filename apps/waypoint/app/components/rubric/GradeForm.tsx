"use client";

/**
 * Full / fast rubric grade form (v1.11 logging modes).
 * Controlling path: L1/L2/L3 scores + gates → derived answer/qualifying/demonstrated.
 */

import { useMemo, useState } from "react";
import {
  RD,
  KGTAG_CLUSTERS,
  computeRaw,
  computeFinal,
  subTotal,
  scoreBand,
  deriveAnswerLevel,
  deriveQualifyingLevel,
  deriveDemonstratedLevel,
  validateMonotonic,
  GATE_VERDICTS,
  LEVEL_VERDICTS,
  GAP_TYPES,
  LOGGING_MODES,
  COMPILE_STATUSES,
  TEST_STATUSES,
  type LevelId,
  type LevelScores,
  type Gates,
  type GateVerdict,
  type TaskType,
  type Role,
  type EvidenceClass,
  type UniversalDimId,
  type RubricEntryInput,
  type LoggingMode,
  type LevelVerdicts,
  type CompileStatus,
  type TestStatus,
} from "@waypoint/rubric";
import { useWaypointStore } from "@/lib/store";
import { Accordion } from "../ui/Accordion";
import { AlertTriangle } from "lucide-react";

const inputCls =
  "w-full rounded-xl bg-[var(--bg-elev)] border border-[var(--hairline)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--cyan)]";
const LEVELS: LevelId[] = ["L1", "L2", "L3"];
const ALL_KGTAGS = Array.from(new Set(Object.values(KGTAG_CLUSTERS).flat())).sort();

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--text-dim)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  colorFor,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
  colorFor?: (v: T) => string;
}) {
  return (
    <div className="flex gap-1">
      {options.map((o) => {
        const active = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`rounded-lg border px-2.5 py-1 text-xs transition-all ${
              active
                ? (colorFor?.(o) ??
                  "border-[var(--cyan)] bg-[var(--tint-cyan)] text-[var(--cyan)]")
                : "border-[var(--hairline)] text-[var(--text-dim)] hover:border-[var(--hairline-strong)]"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

const gateColor = (v: GateVerdict) =>
  v === "Pass"
    ? "border-[var(--done)] bg-[var(--tint-green)] text-[var(--done)]"
    : v === "Partial"
      ? "border-[var(--yellow)] bg-[var(--tint-yellow)] text-[var(--yellow)]"
      : "border-[var(--orange)] bg-[var(--tint-orange)] text-[var(--orange)]";

function Row({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="flex justify-between">
      <span>{k}</span>
      <span className="text-[var(--text)]">{v}</span>
    </div>
  );
}

export function GradeForm({ onLogged }: { onLogged?: () => void }) {
  const addEntry = useWaypointStore((s) => s.addRubricEntry);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [task, setTask] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("coding");
  const [problemLevel, setProblemLevel] = useState<LevelId>("L1");
  const [difficulty, setDifficulty] = useState(2);
  const [assist, setAssist] = useState(0);
  const [evidenceClass, setEvidenceClass] = useState<EvidenceClass>("prospective");
  const [domain, setDomain] = useState("");
  const [primaryRole, setPrimaryRole] = useState<Role>("SWE");

  const [ls, setLs] = useState<{ L1: string; L2: string; L3: string }>({
    L1: "",
    L2: "",
    L3: "",
  });
  const [lv, setLv] = useState<LevelVerdicts>({ L1: null, L2: null, L3: null });
  const [gates, setGates] = useState<Gates>({});

  const [subs, setSubs] = useState<Record<UniversalDimId, number>>(
    () =>
      Object.fromEntries(RD.universalDims.map((d) => [d.id, 0])) as Record<
        UniversalDimId,
        number
      >,
  );
  const [taskScore, setTaskScore] = useState(0);
  const [cap, setCap] = useState("");
  const [penalties, setPenalties] = useState(0);

  const [weakTags, setWeakTags] = useState<Set<string>>(new Set());
  const [gapTypes, setGapTypes] = useState<Set<string>>(new Set());
  const [kgQuery, setKgQuery] = useState("");
  const [kgTags, setKgTags] = useState<string[]>([]);

  const [problemName, setProblemName] = useState("");
  const [platform, setPlatform] = useState("");
  const [codingPattern, setCodingPattern] = useState("");
  const [dataStructure, setDataStructure] = useState("");
  const [compileStatus, setCompileStatus] = useState<CompileStatus | "">("");
  const [testStatus, setTestStatus] = useState<TestStatus | "">("");

  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [nextTarget, setNextTarget] = useState("");
  const [focusAreas, setFocusAreas] = useState("");
  const [overrideDerive, setOverrideDerive] = useState(false);
  const [answerLevelManual, setAnswerLevelManual] = useState<LevelId | "">("");
  const [qualifyingManual, setQualifyingManual] = useState<LevelId | "">("");
  const [flash, setFlash] = useState("");
  const [mode, setMode] = useState<LoggingMode>("fast");

  const numOrNull = (s: string): number | null =>
    s === "" || Number.isNaN(Number(s)) ? null : Number(s);
  const levelScores: LevelScores = {
    L1: numOrNull(ls.L1),
    L2: numOrNull(ls.L2),
    L3: numOrNull(ls.L3),
  };
  const monotonicOk = validateMonotonic(levelScores);

  const derivedAnswer = useMemo(
    () => deriveAnswerLevel(levelScores, gates, subs),
    [levelScores, gates, subs],
  );
  const derivedQual = useMemo(
    () => deriveQualifyingLevel(derivedAnswer, problemLevel, difficulty, assist),
    [derivedAnswer, problemLevel, difficulty, assist],
  );
  const answerLevel = overrideDerive ? answerLevelManual : derivedAnswer;
  const qualifying = overrideDerive ? qualifyingManual : derivedQual;
  const demonstrated = deriveDemonstratedLevel(levelScores, qualifying);

  const universal = subTotal(subs) ?? 0;
  const finalScore = computeFinal(
    computeRaw(universal, taskScore),
    cap === "" ? null : Number(cap),
    penalties,
  );

  const allDomains = RD.domainGroups.flatMap((g) => g.domains);
  const kgMatches = kgQuery.trim()
    ? ALL_KGTAGS.filter(
        (t) => t.toLowerCase().includes(kgQuery.toLowerCase()) && !kgTags.includes(t),
      ).slice(0, 8)
    : [];

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, v: string) =>
    setter((prev) => {
      const n = new Set(prev);
      if (n.has(v)) n.delete(v);
      else n.add(v);
      return n;
    });

  const reset = () => {
    setTask("");
    setLs({ L1: "", L2: "", L3: "" });
    setLv({ L1: null, L2: null, L3: null });
    setGates({});
    setSubs(
      Object.fromEntries(RD.universalDims.map((d) => [d.id, 0])) as Record<
        UniversalDimId,
        number
      >,
    );
    setTaskScore(0);
    setCap("");
    setPenalties(0);
    setWeakTags(new Set());
    setGapTypes(new Set());
    setKgTags([]);
    setStrengths("");
    setWeaknesses("");
    setNextTarget("");
    setFocusAreas("");
    setProblemName("");
    setPlatform("");
    setCodingPattern("");
    setDataStructure("");
    setCompileStatus("");
    setTestStatus("");
  };

  const submit = () => {
    if (!task.trim()) {
      setFlash("Add a task first.");
      setTimeout(() => setFlash(""), 2500);
      return;
    }
    const full = mode === "full";
    const payload: RubricEntryInput = {
      date,
      task: task.trim(),
      taskType,
      problemLevel,
      targetLevel: problemLevel,
      difficulty: difficulty as RubricEntryInput["difficulty"],
      assistanceLevel: assist as RubricEntryInput["assistanceLevel"],
      evidenceClass,
      domain,
      primaryDomain: domain,
      primaryRole,
      levelScores,
      levelVerdicts: lv,
      gates,
      answerLevel: answerLevel || "",
      qualifyingDemonstratedLevel: qualifying || "",
      demonstratedLevel: demonstrated,
      weaknessTags: Array.from(weakTags),
      gapTypes: Array.from(gapTypes),
      knowledgeGapTags: kgTags,
      nextTarget,
      loggingMode: mode,
      ...(taskType === "coding"
        ? {
            problemName: problemName || task.trim(),
            platform,
            codingPattern,
            primaryDataStructure: dataStructure,
            compileStatus: compileStatus || null,
            testStatus: testStatus || null,
          }
        : {}),
      ...(full
        ? {
            universalScore: universal,
            taskSpecificScore: taskScore,
            universalSubScores: subs,
            cap: cap === "" ? null : Number(cap),
            penalties,
            strengths,
            weaknesses,
            focusAreas: focusAreas
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          }
        : {
            // Fast path still needs a finalScore for readiness floor heuristics
            finalScore:
              levelScores.L2 != null
                ? levelScores.L2
                : levelScores.L1 != null
                  ? levelScores.L1
                  : finalScore,
          }),
    };
    addEntry(payload);
    reset();
    setFlash(`Logged — qualifying ${qualifying || "—"} · ${demonstrated}.`);
    setTimeout(() => setFlash(""), 3500);
    onLogged?.();
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase tracking-wider text-[var(--text-dim)]">
            Logging mode
          </span>
          <div className="flex gap-1 rounded-xl border border-[var(--hairline)] bg-[var(--bg-elev)] p-0.5">
            {LOGGING_MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                  mode === m
                    ? "bg-[var(--fill-strong)] text-[var(--cyan)]"
                    : "text-[var(--text-dim)] hover:text-[var(--text)]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-[var(--text-dim)]">
            {mode === "fast" ? "three scores + gates + tags" : "subscores + narrative"}
          </span>
        </div>

        <div className="card-glass space-y-4 p-6">
          <div className="section-title !mb-1">Classification</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Date">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Task type">
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as TaskType)}
                className={inputCls}
              >
                {RD.taskTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Task">
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. LeetCode 242 Valid Anagram · mock #1"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Problem level">
              <div className="flex gap-1">
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setProblemLevel(l)}
                    className={`flex-1 rounded-lg border px-2 py-2 text-sm ${
                      problemLevel === l
                        ? "border-[var(--cyan)] bg-[var(--tint-cyan)] text-[var(--cyan)]"
                        : "border-[var(--hairline)] text-[var(--text-dim)]"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Domain">
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className={inputCls}
              >
                <option value="">—</option>
                {allDomains.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Primary role">
              <select
                value={primaryRole}
                onChange={(e) => setPrimaryRole(e.target.value as Role)}
                className={inputCls}
              >
                {RD.roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label={`Difficulty D${difficulty}`}>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-sm ${
                      difficulty === d
                        ? "border-[var(--cyan)] bg-[var(--tint-cyan)] text-[var(--cyan)]"
                        : "border-[var(--hairline)] text-[var(--text-dim)]"
                    }`}
                  >
                    D{d}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={`Assistance A${assist}`}>
              <div className="flex gap-1">
                {RD.assistance.map((a) => (
                  <button
                    key={a.lvl}
                    type="button"
                    title={a.desc}
                    onClick={() => setAssist(a.lvl)}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs ${
                      assist === a.lvl
                        ? "border-[var(--cyan)] bg-[var(--tint-cyan)] text-[var(--cyan)]"
                        : "border-[var(--hairline)] text-[var(--text-dim)]"
                    }`}
                  >
                    A{a.lvl}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Evidence class">
              <select
                value={evidenceClass}
                onChange={(e) => setEvidenceClass(e.target.value as EvidenceClass)}
                className={inputCls}
              >
                {RD.evidenceClasses.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="card-glass space-y-3 p-6">
          <div className="section-title !mb-1">Level scores (controlling)</div>
          {LEVELS.map((l) => (
            <div key={l} className="flex flex-wrap items-center gap-3">
              <div className="w-8 font-mono text-sm text-[var(--text-mid)]">{l}</div>
              <input
                type="number"
                min={0}
                max={100}
                value={ls[l]}
                onChange={(e) => setLs((p) => ({ ...p, [l]: e.target.value }))}
                placeholder="0–100"
                className={`${inputCls} w-24`}
              />
              <Segmented
                options={LEVEL_VERDICTS}
                value={lv[l]}
                onChange={(v) => setLv((p) => ({ ...p, [l]: v }))}
              />
              {levelScores[l] !== null ? (
                <span className={`text-xs ${scoreBand(levelScores[l]!).cls}`}>
                  {scoreBand(levelScores[l]!).verdict}
                </span>
              ) : null}
            </div>
          ))}
          {!monotonicOk ? (
            <div className="flex items-center gap-2 pt-1 text-xs text-[var(--orange)]">
              <AlertTriangle size={13} /> Scores should satisfy L3 ≤ L2 ≤ L1 (§3.2).
            </div>
          ) : null}
        </div>

        <div className="card-glass space-y-2 p-6">
          <div className="section-title !mb-1">Mandatory gates</div>
          {RD.gates.map((g) => (
            <div key={g.gate} className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-[var(--text-mid)]" title={g.req}>
                {g.gate}
              </div>
              <Segmented
                options={GATE_VERDICTS}
                value={(gates[g.gate as keyof Gates] as GateVerdict) ?? null}
                onChange={(v) => setGates((p) => ({ ...p, [g.gate]: v }))}
                colorFor={gateColor}
              />
            </div>
          ))}
        </div>

        {mode === "full" ? (
          <Accordion title="Universal & task-specific sub-scores">
            <div className="space-y-2">
              {RD.universalDims.map((d) => (
                <div key={d.id} className="flex items-center gap-3">
                  <div className="w-44 text-sm text-[var(--text-mid)]">{d.label}</div>
                  <input
                    type="range"
                    min={0}
                    max={d.max}
                    value={subs[d.id]}
                    onChange={(e) =>
                      setSubs((p) => ({ ...p, [d.id]: Number(e.target.value) }))
                    }
                    className="flex-1 accent-[var(--cyan)]"
                  />
                  <div className="w-14 text-right font-mono text-sm">
                    {subs[d.id]}
                    <span className="text-[var(--text-dim)]">/{d.max}</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-3 border-t border-[var(--hairline)] pt-2">
                <div className="w-44 text-sm text-[var(--text-mid)]">Task-specific score</div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={taskScore}
                  onChange={(e) => setTaskScore(Number(e.target.value))}
                  className="flex-1 accent-[var(--magenta)]"
                />
                <div className="w-14 text-right font-mono text-sm">{taskScore}</div>
              </div>
              <div className="flex gap-3 pt-2">
                <Field label="Cap">
                  <input
                    type="number"
                    value={cap}
                    onChange={(e) => setCap(e.target.value)}
                    placeholder="none"
                    className={`${inputCls} w-28`}
                  />
                </Field>
                <Field label="Penalties">
                  <input
                    type="number"
                    value={penalties}
                    onChange={(e) => setPenalties(Number(e.target.value) || 0)}
                    className={`${inputCls} w-28`}
                  />
                </Field>
              </div>
            </div>
          </Accordion>
        ) : null}

        <Accordion title="Tags (weakness · gap type · knowledge gap)">
          <div className="space-y-3">
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wider text-[var(--text-dim)]">
                Weakness tags
              </div>
              <div className="flex flex-wrap gap-1.5">
                {RD.weaknessTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggle(setWeakTags, t)}
                    className={`rounded border px-2 py-0.5 text-xs ${
                      weakTags.has(t)
                        ? "border-[var(--orange)] text-[var(--orange)]"
                        : "border-[var(--hairline)] text-[var(--text-dim)]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wider text-[var(--text-dim)]">
                Gap types
              </div>
              <div className="flex flex-wrap gap-1.5">
                {GAP_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggle(setGapTypes, t)}
                    className={`rounded border px-2 py-0.5 text-xs ${
                      gapTypes.has(t)
                        ? "border-[var(--violet)] text-[var(--violet)]"
                        : "border-[var(--hairline)] text-[var(--text-dim)]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wider text-[var(--text-dim)]">
                Knowledge-gap tags
              </div>
              <input
                value={kgQuery}
                onChange={(e) => setKgQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && kgQuery.trim()) {
                    e.preventDefault();
                    const t = kgQuery.trim();
                    setKgTags((p) => Array.from(new Set([...p, t])));
                    setKgQuery("");
                  }
                }}
                placeholder="Search / Enter to add…"
                className={inputCls}
              />
              {kgMatches.length > 0 ? (
                <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-[var(--hairline)] bg-[var(--surface)]">
                  {kgMatches.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setKgTags((p) => Array.from(new Set([...p, m])));
                        setKgQuery("");
                      }}
                      className="block w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--fill-subtle)]"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {kgTags.map((t) => (
                  <span
                    key={t}
                    className="rounded border border-[var(--hairline)] bg-[var(--tint-cyan)] px-2 py-0.5 text-xs"
                  >
                    {t}{" "}
                    <button type="button" onClick={() => setKgTags((p) => p.filter((x) => x !== t))}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Accordion>

        {taskType === "coding" ? (
          <Accordion title="Coding metadata" defaultOpen>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Problem name">
                <input
                  value={problemName}
                  onChange={(e) => setProblemName(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Platform">
                <input
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder="LeetCode…"
                  className={inputCls}
                />
              </Field>
              <Field label="Coding pattern">
                <input
                  value={codingPattern}
                  onChange={(e) => setCodingPattern(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Primary data structure">
                <input
                  value={dataStructure}
                  onChange={(e) => setDataStructure(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Compile status">
                <select
                  value={compileStatus}
                  onChange={(e) => setCompileStatus(e.target.value as CompileStatus | "")}
                  className={inputCls}
                >
                  <option value="">—</option>
                  {COMPILE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Test status">
                <select
                  value={testStatus}
                  onChange={(e) => setTestStatus(e.target.value as TestStatus | "")}
                  className={inputCls}
                >
                  <option value="">—</option>
                  {TEST_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Accordion>
        ) : null}

        {mode === "full" ? (
          <Accordion title="Narrative">
            <div className="space-y-3">
              <Field label="Strengths">
                <textarea
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  className={`${inputCls} h-16`}
                />
              </Field>
              <Field label="Weaknesses">
                <textarea
                  value={weaknesses}
                  onChange={(e) => setWeaknesses(e.target.value)}
                  className={`${inputCls} h-16`}
                />
              </Field>
              <Field label="Focus areas (comma-separated)">
                <input
                  value={focusAreas}
                  onChange={(e) => setFocusAreas(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Next target">
                <input
                  value={nextTarget}
                  onChange={(e) => setNextTarget(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          </Accordion>
        ) : null}
      </div>

      <div className="space-y-5">
        <div className="card-glass sticky top-24 p-6">
          <div className="section-title">Demonstrated level</div>
          <div className="py-3 text-center">
            <div className="text-4xl font-bold tracking-tight text-[var(--cyan)]">
              {qualifying || "—"}
            </div>
            <div className="mt-1 text-sm text-[var(--text-mid)]">{demonstrated}</div>
          </div>
          <div className="space-y-1.5 border-t border-[var(--hairline)] pt-3 font-mono text-xs text-[var(--text-mid)]">
            <Row k="Answer level" v={answerLevel || "—"} />
            <Row k="Qualifying" v={qualifying || "—"} />
            <Row k="Final (support)" v={finalScore} />
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-[var(--text-dim)]">
            <input
              type="checkbox"
              checked={overrideDerive}
              onChange={(e) => setOverrideDerive(e.target.checked)}
            />
            Override derived levels
          </label>
          {overrideDerive ? (
            <div className="mt-2 flex gap-2">
              <select
                value={answerLevelManual}
                onChange={(e) => setAnswerLevelManual(e.target.value as LevelId | "")}
                className={`${inputCls} text-xs`}
              >
                <option value="">answer —</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <select
                value={qualifyingManual}
                onChange={(e) => setQualifyingManual(e.target.value as LevelId | "")}
                className={`${inputCls} text-xs`}
              >
                <option value="">qual —</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <button type="button" onClick={submit} className="btn-primary mt-4 w-full">
            Log Assessment
          </button>
          {flash ? (
            <div className="mt-3 text-center text-xs text-[var(--text-mid)]">{flash}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
