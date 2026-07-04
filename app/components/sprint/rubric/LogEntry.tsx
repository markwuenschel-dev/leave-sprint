"use client";

import { useMemo, useState } from "react";
import { useSprintStore } from "@/lib/store";
import { RD } from "@/lib/rubric/referenceData";
import { computeRaw, computeFinal, subTotal, scoreBand } from "@/lib/rubric/scoring";
import { parseImport } from "@/lib/rubric/io";
import type { RubricEntryInput, TaskType, Role, EvidenceClass, UniversalDimId } from "@/lib/rubric/types";
import { DifficultyCalculator } from "../DifficultyCalculator";
import { SlidersHorizontal } from "lucide-react";

type Mode = "quick" | "json";

const emptySubs = (): Record<UniversalDimId, number> =>
  Object.fromEntries(RD.universalDims.map((d) => [d.id, 0])) as Record<UniversalDimId, number>;

export function LogEntry() {
  const { logRubricEntry, importRubricEntries } = useSprintStore();
  const [mode, setMode] = useState<Mode>("quick");

  // Quick-log form state
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [task, setTask] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("coding");
  const [domain, setDomain] = useState("");
  const [primaryRole, setPrimaryRole] = useState<Role>("SWE");
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [assist, setAssist] = useState(0);
  const [subs, setSubs] = useState<Record<UniversalDimId, number>>(emptySubs);
  const [taskScore, setTaskScore] = useState(0);
  const [evidenceClass, setEvidenceClass] = useState<EvidenceClass>("prospective");
  const [weakTags, setWeakTags] = useState<Set<string>>(new Set());
  const [nextTarget, setNextTarget] = useState("");
  const [showCalc, setShowCalc] = useState(false);
  const [flash, setFlash] = useState("");

  // JSON mode
  const [json, setJson] = useState("");
  const [jsonStatus, setJsonStatus] = useState("");

  const universal = useMemo(() => subTotal(subs) ?? 0, [subs]);
  const raw = useMemo(() => computeRaw(universal, taskScore), [universal, taskScore]);
  const final = useMemo(() => computeFinal(raw, null, 0), [raw]);
  const band = scoreBand(final);

  const allDomains = RD.domainGroups.flatMap((g) => g.domains);

  const reset = () => {
    setTask("");
    setSubs(emptySubs());
    setTaskScore(0);
    setWeakTags(new Set());
    setNextTarget("");
    setShowCalc(false);
  };

  const submit = () => {
    if (!task.trim()) {
      setFlash("Add a task description first.");
      setTimeout(() => setFlash(""), 2500);
      return;
    }
    const payload: RubricEntryInput = {
      date,
      task: task.trim(),
      taskType,
      domain,
      primaryDomain: domain,
      primaryRole,
      difficulty,
      assistanceLevel: assist as 0 | 1 | 2 | 3 | 4 | 5,
      universalScore: universal,
      taskSpecificScore: taskScore,
      universalSubScores: subs,
      evidenceClass,
      weaknessTags: Array.from(weakTags),
      nextTarget,
    };
    logRubricEntry(payload);
    reset();
    setFlash(`Logged — final score ${final} (${band.verdict}).`);
    setTimeout(() => setFlash(""), 3000);
  };

  const doImport = () => {
    try {
      const { entries, count } = parseImport(json);
      importRubricEntries(entries, "merge");
      setJsonStatus(`✅ Imported ${count} entr${count === 1 ? "y" : "ies"}.`);
      setJson("");
    } catch {
      setJsonStatus("❌ Could not parse JSON.");
    }
    setTimeout(() => setJsonStatus(""), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button onClick={() => setMode("quick")} className={mode === "quick" ? "btn-primary px-5" : "btn px-5"}>
          Quick Log
        </button>
        <button onClick={() => setMode("json")} className={mode === "json" ? "btn-primary px-5" : "btn px-5"}>
          Paste JSON
        </button>
      </div>

      {mode === "json" ? (
        <div className="card-glass p-6 space-y-3">
          <div className="section-title">IMPORT RUBRIC RECORDS</div>
          <p className="text-xs text-[var(--text-mid)]">
            Paste a single record or an array (old <span className="font-mono">rubric-log-v1</span> format is accepted — records are normalised on import).
          </p>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            placeholder='[{ "task": "...", "taskType": "coding", "finalScore": 82, ... }]'
            className="w-full h-48 rounded-xl bg-[#11141a] border border-white/10 p-3 text-sm font-mono focus:outline-none focus:border-[var(--cyan)]"
          />
          <div className="flex items-center gap-3">
            <button onClick={doImport} className="btn-primary px-6" disabled={!json.trim()}>
              Import
            </button>
            {jsonStatus && <span className="text-sm">{jsonStatus}</span>}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: identity + classification */}
          <div className="lg:col-span-2 space-y-5">
            <div className="card-glass p-6 space-y-4">
              <div className="section-title !mb-1">ASSESSMENT</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Date">
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Task type">
                  <select value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)} className={inputCls}>
                    {RD.taskTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Task">
                <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="e.g. Implement LRU cache with tests" className={inputCls} />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Domain">
                  <select value={domain} onChange={(e) => setDomain(e.target.value)} className={inputCls}>
                    <option value="">— select —</option>
                    {allDomains.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Primary role">
                  <select value={primaryRole} onChange={(e) => setPrimaryRole(e.target.value as Role)} className={inputCls}>
                    {RD.roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Difficulty */}
              <Field label="Difficulty (D1–D5)">
                <div className="flex items-center gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d as 1 | 2 | 3 | 4 | 5)}
                      className={`px-3 py-1.5 rounded-xl text-sm border transition-all ${
                        difficulty === d ? "border-[var(--cyan)] text-[var(--cyan)] bg-[var(--cyan)]/10" : "border-white/10 text-[var(--text-dim)] hover:border-white/30"
                      }`}
                    >
                      D{d}
                    </button>
                  ))}
                  <button onClick={() => setShowCalc((s) => !s)} className="btn text-xs ml-1">
                    <SlidersHorizontal size={13} /> Calculator
                  </button>
                </div>
              </Field>
              {showCalc && (
                <div className="-mx-2">
                  <DifficultyCalculator onResult={(lvl) => setDifficulty(Math.max(1, Math.min(5, lvl)) as 1 | 2 | 3 | 4 | 5)} />
                </div>
              )}

              {/* Assistance */}
              <Field label="Assistance level">
                <div className="flex flex-wrap gap-2">
                  {RD.assistance.map((a) => (
                    <button
                      key={a.lvl}
                      onClick={() => setAssist(a.lvl)}
                      title={a.desc}
                      className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${
                        assist === a.lvl ? "border-[var(--cyan)] text-[var(--cyan)] bg-[var(--cyan)]/10" : "border-white/10 text-[var(--text-dim)] hover:border-white/30"
                      }`}
                    >
                      A{a.lvl}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Evidence class">
                <select value={evidenceClass} onChange={(e) => setEvidenceClass(e.target.value as EvidenceClass)} className={inputCls}>
                  {RD.evidenceClasses.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.label} (w {e.weight})
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Universal sub-scores */}
            <div className="card-glass p-6 space-y-3">
              <div className="section-title !mb-1">UNIVERSAL COMPETENCY (0–{RD.universalDims.reduce((s, d) => s + d.max, 0)})</div>
              {RD.universalDims.map((d) => (
                <div key={d.id} className="flex items-center gap-3">
                  <div className="w-44 text-sm text-[var(--text-mid)]">{d.label}</div>
                  <input
                    type="range"
                    min={0}
                    max={d.max}
                    value={subs[d.id]}
                    onChange={(e) => setSubs((prev) => ({ ...prev, [d.id]: Number(e.target.value) }))}
                    className="flex-1 accent-[#00f9ff]"
                  />
                  <div className="w-14 text-right font-mono text-sm tabular-nums">
                    {subs[d.id]}
                    <span className="text-[var(--text-dim)]">/{d.max}</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                <div className="w-44 text-sm text-[var(--text-mid)]">Task-specific score</div>
                <input type="range" min={0} max={100} value={taskScore} onChange={(e) => setTaskScore(Number(e.target.value))} className="flex-1 accent-[#ff00aa]" />
                <div className="w-14 text-right font-mono text-sm tabular-nums">{taskScore}</div>
              </div>
            </div>

            {/* Weakness tags */}
            <div className="card-glass p-6">
              <div className="section-title">WEAKNESS TAGS</div>
              <div className="flex flex-wrap gap-2">
                {RD.weaknessTags.map((t) => {
                  const on = weakTags.has(t);
                  return (
                    <button
                      key={t}
                      onClick={() =>
                        setWeakTags((prev) => {
                          const next = new Set(prev);
                          if (next.has(t)) next.delete(t);
                          else next.add(t);
                          return next;
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                        on ? "border-[var(--orange)] text-[var(--orange)] bg-[var(--orange)]/10" : "border-white/10 text-[var(--text-dim)] hover:border-white/30"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: live score + submit */}
          <div className="space-y-5">
            <div className="card-glass p-6 sticky top-24">
              <div className="section-title">COMPUTED SCORE</div>
              <div className="text-center py-3">
                <div className={`text-6xl font-bold tracking-tighter ${band.cls}`}>{final}</div>
                <div className={`text-sm mt-1 ${band.cls}`}>{band.verdict}</div>
              </div>
              <div className="space-y-1.5 text-xs text-[var(--text-mid)] font-mono border-t border-white/10 pt-3">
                <Row k="Universal (×0.6)" v={universal} />
                <Row k="Task-specific (×0.4)" v={taskScore} />
                <Row k="Raw" v={raw} />
                <Row k="Final" v={final} />
              </div>
              <Field label="Next target" className="mt-4">
                <input value={nextTarget} onChange={(e) => setNextTarget(e.target.value)} placeholder="e.g. D3 debugging, A≤2" className={inputCls} />
              </Field>
              <button onClick={submit} className="btn-primary w-full mt-4">
                Log Assessment
              </button>
              {flash && <div className="text-xs text-center mt-3 text-[var(--text-mid)]">{flash}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl bg-[#11141a] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-[var(--cyan)]";

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="block text-[11px] uppercase tracking-wider text-[var(--text-dim)] mb-1">{label}</span>
      {children}
    </label>
  );
}

function Row({ k, v }: { k: string; v: number }) {
  return (
    <div className="flex justify-between">
      <span>{k}</span>
      <span className="text-[var(--text)]">{v}</span>
    </div>
  );
}
