"use client";

import { useState } from "react";
import { useSprintStore } from "@/lib/store";
import { parseImport } from "@/lib/rubric/io";
import { GradeForm } from "./GradeForm";

type Mode = "form" | "json";

export function LogEntry() {
  const importRubricEntries = useSprintStore((s) => s.importRubricEntries);
  const importState = useSprintStore((s) => s.importState);
  const [mode, setMode] = useState<Mode>("form");
  const [json, setJson] = useState("");
  const [jsonStatus, setJsonStatus] = useState("");

  const doImport = () => {
    let data: unknown;
    try {
      data = JSON.parse(json);
    } catch {
      setJsonStatus("❌ Could not parse JSON.");
      setTimeout(() => setJsonStatus(""), 4000);
      return;
    }
    try {
      // A full backup/export object ({days, stages, problems, rubricEntries, …}) is
      // routed to importState so every tab updates; bare records go to the rubric log.
      const obj = data as Record<string, unknown>;
      const isBackup = !!data && typeof data === "object" && !Array.isArray(data) &&
        (Array.isArray(obj.rubricEntries) || "days" in obj || "stages" in obj || Array.isArray(obj.problems));
      if (isBackup) {
        importState(obj);
        const n = Array.isArray(obj.rubricEntries) ? obj.rubricEntries.length : 0;
        setJsonStatus(`✅ Imported backup — ${n} rubric entr${n === 1 ? "y" : "ies"} + days/stages/problems.`);
      } else {
        const { entries, count } = parseImport(json);
        importRubricEntries(entries, "merge");
        setJsonStatus(`✅ Imported ${count} entr${count === 1 ? "y" : "ies"}.`);
      }
      setJson("");
    } catch {
      setJsonStatus("❌ Import failed — check the record shape.");
    }
    setTimeout(() => setJsonStatus(""), 5000);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setMode("form")} className={mode === "form" ? "btn-primary px-5" : "btn px-5"}>
          Grade
        </button>
        <button onClick={() => setMode("json")} className={mode === "json" ? "btn-primary px-5" : "btn px-5"}>
          Paste JSON
        </button>
      </div>

      {mode === "form" ? (
        <GradeForm />
      ) : (
        <div className="card-glass p-6 space-y-3">
          <div className="section-title">IMPORT RUBRIC RECORDS</div>
          <p className="text-xs text-[var(--text-mid)]">
            Paste a single record, an array of records, or a full backup object
            (<span className="font-mono">{`{ days, stages, rubricEntries, … }`}</span> from Export JSON — restores every tab).
            Records are normalised on import: <span className="font-mono">quickLog</span>→<span className="font-mono">loggingMode</span>, boolean gates→Pass/Partial/Fail, retired tags→canonical.
          </p>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            placeholder='[{ "assessmentId": "...", "task": "...", "taskType": "coding", "levelScores": {"L1":..,"L2":..,"L3":..}, "gates": {...} }]'
            className="w-full h-48 rounded-xl bg-[var(--bg-elev)] border border-[var(--hairline)] p-3 text-sm font-mono focus:outline-none focus:border-[var(--cyan)]"
          />
          <div className="flex items-center gap-3">
            <button onClick={doImport} className="btn-primary px-6" disabled={!json.trim()}>
              Import
            </button>
            {jsonStatus && <span className="text-sm">{jsonStatus}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
