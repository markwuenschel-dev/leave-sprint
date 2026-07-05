"use client";

import { useMemo, useState } from "react";
import { useSprintStore } from "@/lib/store";
import { RD } from "@/lib/rubric/referenceData";
import { subPct, scoreBand, taskLabel } from "@/lib/rubric/scoring";
import { exportEntries, parseImportFiles } from "@/lib/rubric/io";
import type { RubricEntry, TaskType } from "@/lib/rubric/types";
import { Radar } from "@/app/components/ui/Radar";
import { Trash2, Download, Upload, ChevronDown } from "lucide-react";

export function History() {
  const { rubricEntries, deleteRubricEntry, importRubricEntries } = useSprintStore();
  const [filter, setFilter] = useState<"all" | TaskType>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState("");

  const entries = useMemo(() => {
    const list = filter === "all" ? rubricEntries : rubricEntries.filter((e) => e.taskType === filter);
    return [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [rubricEntries, filter]);

  const exportAll = () => {
    const blob = new Blob([exportEntries(rubricEntries)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rubric-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    const { entries, count, ok, failed } = await parseImportFiles(files);
    if (entries.length) importRubricEntries(entries, "merge");
    setImportMsg(
      `Imported ${count} assessment${count === 1 ? "" : "s"} from ${ok} file${ok === 1 ? "" : "s"}` +
        (failed ? ` · ${failed} file${failed === 1 ? "" : "s"} failed` : "")
    );
    e.target.value = ""; // allow re-selecting the same files
    setTimeout(() => setImportMsg(""), 6000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <select value={filter} onChange={(e) => setFilter(e.target.value as "all" | TaskType)} className="rounded-xl border border-[var(--hairline)] bg-[var(--bg-elev)] px-4 py-2 text-sm">
          <option value="all">All task types ({rubricEntries.length})</option>
          {RD.taskTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label} ({rubricEntries.filter((e) => e.taskType === t.id).length})
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button onClick={exportAll} className="btn text-xs" disabled={!rubricEntries.length}>
            <Download size={14} /> Export
          </button>
          <label className="btn text-xs cursor-pointer" title="Upload one or more assessment JSON files (records, arrays, or backups)">
            <Upload size={14} /> Import
            <input type="file" accept=".json,application/json" multiple onChange={importFiles} className="hidden" />
          </label>
        </div>
      </div>

      {importMsg && <div className="text-xs text-[var(--text-mid)] text-right -mt-2">{importMsg}</div>}

      {entries.length === 0 && (
        <div className="card-glass p-10 text-center text-[var(--text-dim)] text-sm">
          No assessments logged yet. Use the Log tab, or master a Q-Bank question.
        </div>
      )}

      {entries.map((entry) => (
        <EntryCard key={entry.id} entry={entry} open={openId === entry.id} onToggle={() => setOpenId(openId === entry.id ? null : entry.id)} onDelete={() => deleteRubricEntry(entry.id)} />
      ))}
    </div>
  );
}

const GATE_COLORS: Record<string, string> = {
  Pass: "border-[var(--done)] text-[var(--done)]",
  Partial: "border-[var(--yellow)] text-[var(--yellow)]",
  Fail: "border-[var(--orange)] text-[var(--orange)]",
};

function LevelChip({ lvl, score }: { lvl: string; score: number | null }) {
  const cls = score === null ? "text-[var(--text-dim)]" : scoreBand(score).cls;
  return (
    <div className="flex flex-col items-center px-1.5">
      <div className="text-[9px] text-[var(--text-dim)]">{lvl}</div>
      <div className={`font-mono text-sm font-semibold tabular-nums ${cls}`}>{score ?? "—"}</div>
    </div>
  );
}

function EntryCard({ entry, open, onToggle, onDelete }: { entry: RubricEntry; open: boolean; onToggle: () => void; onDelete: () => void }) {
  const pcts = subPct(entry.universalSubScores);
  const hasSubs = entry.universalSubScores && pcts.some((p) => p !== null);
  const qual = entry.qualifyingDemonstratedLevel || entry.answerLevel || "";

  return (
    <div className="rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-4 p-5 text-left hover:bg-[var(--fill-subtle)] transition-colors">
        <div className="shrink-0 w-16 text-center">
          <div className="text-[9px] text-[var(--text-dim)]">QUALIFYING</div>
          <div className={`font-mono text-2xl font-bold ${qual ? "text-[var(--cyan)]" : "text-[var(--text-dim)]"}`}>{qual || "—"}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-[15px] truncate">{entry.task || "(untitled)"}</div>
          <div className="text-xs text-[var(--text-dim)] mt-0.5 font-mono">
            {entry.date} · {taskLabel(entry.taskType)} · D{entry.difficulty} · A{entry.assistanceLevel}
            {entry.problemLevel ? ` · problem ${entry.problemLevel}` : ""}
            {entry.loggingMode ? ` · ${entry.loggingMode}` : ""}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1 shrink-0 rounded-xl border border-[var(--hairline)] px-1 py-1">
          <LevelChip lvl="L1" score={entry.levelScores.L1} />
          <LevelChip lvl="L2" score={entry.levelScores.L2} />
          <LevelChip lvl="L3" score={entry.levelScores.L3} />
        </div>
        <ChevronDown size={16} className={`text-[var(--text-dim)] shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-[var(--hairline)] p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {hasSubs ? (
              <Radar labels={RD.universalDims.map((d) => d.short)} values={pcts} size={220} />
            ) : (
              <div className="text-sm text-[var(--text-dim)]">No sub-scores recorded.</div>
            )}
          </div>
          <div className="space-y-3">
            {hasSubs &&
              RD.universalDims.map((d, i) => (
                <div key={d.id} className="flex items-center gap-3">
                  <div className="w-32 text-xs text-[var(--text-mid)]">{d.short}</div>
                  <div className="flex-1 h-2 rounded-full bg-[var(--fill-subtle)] overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--cyan)]" style={{ width: `${pcts[i] ?? 0}%` }} />
                  </div>
                  <div className="w-10 text-right font-mono text-xs">{pcts[i] ?? "—"}%</div>
                </div>
              ))}

            {entry.demonstratedLevel && (
              <div className="text-sm">
                <span className="text-[var(--text-dim)]">Demonstrated: </span>
                <span className="text-[var(--text)] font-medium">{entry.demonstratedLevel}</span>
                {entry.answerLevel && <span className="text-[var(--text-dim)]"> · answer {entry.answerLevel}</span>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <Meta k="Final (support)" v={entry.finalScore} />
              <Meta k="Universal" v={entry.universalScore} />
              <Meta k="Task-specific" v={entry.taskSpecificScore} />
              <Meta k="Penalties" v={entry.penalties} />
              {entry.primaryRole && <Meta k="Role" v={entry.primaryRole} />}
              {entry.evidenceClass && <Meta k="Evidence" v={entry.evidenceClass} />}
            </div>

            {Object.keys(entry.gates).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Object.entries(entry.gates).map(([g, verdict]) => (
                  <span key={g} className={`text-[10px] px-2 py-0.5 rounded border ${GATE_COLORS[verdict as string] ?? "border-[var(--hairline)] text-[var(--text-dim)]"}`}>
                    {g}: {verdict}
                  </span>
                ))}
              </div>
            )}

            {entry.weaknessTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {entry.weaknessTags.map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-[var(--fill-subtle)] border border-[var(--hairline)] text-[var(--text-dim)]">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {entry.nextTarget && <div className="text-xs text-[var(--text-mid)] pt-1">Next: {entry.nextTarget}</div>}

            <button onClick={onDelete} className="text-xs text-[var(--text-dim)] hover:text-red-400 flex items-center gap-1.5 pt-2">
              <Trash2 size={13} /> Delete entry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="flex justify-between border-b border-[var(--hairline)] pb-1">
      <span className="text-[var(--text-dim)]">{k}</span>
      <span className="font-mono text-[var(--text)]">{v}</span>
    </div>
  );
}
