"use client";

import { useSprintStore } from "@/lib/store";
import { TOTAL_STAGES } from "@/data/stages";
import { getDayCompletion } from "@/lib/store";
import { Download, Upload, FileText, HardDriveDownload } from "lucide-react";
import { useState } from "react";

export function DataExport() {
  const store = useSprintStore();
  const [importStatus, setImportStatus] = useState("");

  const download = (data: string, filename: string, type: string) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const data = {
      days: store.days,
      stages: store.stages,
      problems: store.problems,
      fileDefense: store.fileDefense,
      rubricEntries: store.rubricEntries,
      qbankStatus: store.qbankStatus,
      exportedAt: new Date().toISOString(),
    };
    download(JSON.stringify(data, null, 2), `leave-sprint-backup-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
  };

  const exportMarkdown = () => {
    const daysDone = Object.values(store.days).filter((d) => d.rhythm.coding && d.rhythm.file && d.rhythm.qa).length;
    const stagesDone = Object.values(store.stages).filter((s) => s.done).length;
    let md = `# Leave Sprint Twin — Backup\n\n`;
    md += `**Exported:** ${new Date().toLocaleString()}\n\n`;
    md += `## Progress\n`;
    md += `- Overall: ${Math.round((daysDone / 29) * 100)}%\n`;
    md += `- Stages complete: ${stagesDone}/${TOTAL_STAGES}\n`;
    md += `- Rubric entries logged: ${store.rubricEntries.length}\n\n`;

    md += `## Today's Focus (Day ${store.selectedDay})\n`;
    const today = store.days[store.selectedDay];
    if (today) {
      md += `- Coding: ${today.rhythm.coding ? "✅" : "⬜"}\n`;
      md += `- File Defense: ${today.rhythm.file ? "✅" : "⬜"}\n`;
      md += `- Q&A: ${today.rhythm.qa ? "✅" : "⬜"}\n`;
      md += `- Build: ${today.rhythm.build ? "✅" : "⬜"}\n`;
      md += `- Day completion: ${getDayCompletion(today)}%\n`;
    }
    download(md, `leave-sprint-summary-${new Date().toISOString().slice(0, 10)}.md`, "text/markdown");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        store.importState(imported);
        setImportStatus("✅ Imported successfully");
        setTimeout(() => setImportStatus(""), 3000);
      } catch {
        setImportStatus("❌ Invalid file");
        setTimeout(() => setImportStatus(""), 3000);
      }
    };
    reader.readAsText(file);
  };

  const importLegacy = () => {
    const r = store.importLegacyLocalStorage();
    if (r.rubric + r.qbank + r.tasks === 0) {
      setImportStatus("No old-app data found in this browser.");
    } else {
      setImportStatus(`✅ Imported ${r.rubric} rubric · ${r.qbank} Q-Bank · ${r.tasks} tasks from old app`);
    }
    setTimeout(() => setImportStatus(""), 5000);
  };

  return (
    <div className="card-glass p-6">
      <div className="section-title mb-4">DATA IMPORT / EXPORT</div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button onClick={exportJSON} className="btn flex items-center justify-center gap-2 h-12">
          <Download size={18} /> Export JSON
        </button>
        <button onClick={exportMarkdown} className="btn flex items-center justify-center gap-2 h-12">
          <FileText size={18} /> Export Markdown
        </button>
        <label className="btn flex items-center justify-center gap-2 h-12 cursor-pointer">
          <Upload size={18} /> Import JSON
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
        <button onClick={importLegacy} className="btn flex items-center justify-center gap-2 h-12" title="Import rubric-log-v1 / cqw-qbank-v1 / cqw-sprint-v1 from the old standalone page">
          <HardDriveDownload size={18} /> Import Old App
        </button>
      </div>

      {importStatus && <div className="mt-4 text-sm text-center">{importStatus}</div>}

      <div className="text-xs text-[var(--text-dim)] mt-4">
        JSON backup includes all progress (days, stages, problems, file defense, rubric log, Q-Bank status).
        “Import Old App” carries over data saved by the original standalone page in this browser.
      </div>
    </div>
  );
}
