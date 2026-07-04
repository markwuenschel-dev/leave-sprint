"use client";

import { RD } from "@/lib/rubric/referenceData";
import { exportReferenceMarkdown } from "@/lib/rubric/io";
import { Accordion } from "@/app/components/ui/Accordion";
import { DifficultyCalculator } from "../DifficultyCalculator";
import { Download } from "lucide-react";

function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[var(--text-dim)] text-left">
            {headers.map((h) => (
              <th key={h} className="font-medium pb-2 pr-4 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="align-top">
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-[var(--hairline)]">
              {r.map((c, j) => (
                <td key={j} className={`py-2 pr-4 ${j === 0 ? "text-[var(--text)] font-medium whitespace-nowrap" : "text-[var(--text-mid)]"}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Reference() {
  const downloadMd = () => {
    const blob = new Blob([exportReferenceMarkdown()], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rubric-reference.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--text-mid)]">Technical Competency Scoring System · v{RD ? "1.10" : ""}</div>
        <button onClick={downloadMd} className="btn text-xs">
          <Download size={14} /> Export reference (MD)
        </button>
      </div>

      <Accordion title="Levels (L1 / L2 / L3)" defaultOpen>
        <Table headers={["Level", "Scope", "Standard", "Difficulty", "Max assist"]} rows={RD.levels.map((l) => [`${l.label} — ${l.subtitle}`, l.scope, l.standard, l.difficultyRange, `≤${l.maxAssistance}`])} />
      </Accordion>

      <Accordion title="Universal competency dimensions (weighted to 100)">
        <Table headers={["Dimension", "Weight"]} rows={RD.universalDims.map((d) => [d.label, d.max])} />
      </Accordion>

      <Accordion title="Difficulty D1–D5">
        <Table headers={["D", "Label", "Description", "Level"]} rows={RD.difficulty.map((d) => [`D${d.d}`, d.label, d.desc, d.level])} />
      </Accordion>

      <Accordion title="Difficulty attribute matrix (0 / 1 / 2)">
        <Table headers={["Dimension", "0", "1", "2"]} rows={RD.difficultyAttributes.map((a) => [a.dim, a.v0, a.v1, a.v2])} />
        <div className="mt-2 text-xs text-[var(--text-dim)]">Thresholds: {RD.difficultyThresholds.map((t) => `${t.range}→D${t.d}`).join("  ·  ")}</div>
      </Accordion>

      <Accordion title="Live difficulty calculator">
        <DifficultyCalculator />
      </Accordion>

      <Accordion title="Mandatory gates">
        <Table headers={["Gate", "Requirement"]} rows={RD.gates.map((g) => [g.gate, g.req])} />
      </Accordion>

      <Accordion title="Task-specific rubrics">
        <div className="space-y-4">
          {RD.taskRubrics.map((tr) => (
            <div key={tr.id}>
              <div className="text-sm font-medium text-[var(--text)] mb-1">{tr.label}</div>
              <Table headers={["Category", "Weight"]} rows={tr.categories.map((c) => [c.name, c.weight])} />
            </div>
          ))}
        </div>
      </Accordion>

      <Accordion title="Evidence classes">
        <Table headers={["Class", "Weight", "Description"]} rows={RD.evidenceClasses.map((e) => [e.label, e.weight, e.desc])} />
      </Accordion>

      <Accordion title="Assistance levels (A0–A5)">
        <Table headers={["Level", "Description", "Autonomy impact"]} rows={RD.assistance.map((a) => [`A${a.lvl}`, a.desc, a.autonomy])} />
      </Accordion>

      <Accordion title="Score caps">
        <Table headers={["Condition", "Max"]} rows={RD.caps.map((c) => [c.condition, c.max])} />
      </Accordion>

      <Accordion title="Penalties">
        <Table headers={["Deficiency", "Penalty"]} rows={RD.penalties.map((p) => [p.deficiency, p.penalty])} />
      </Accordion>

      <Accordion title="Score bands">
        <Table headers={["Range", "Verdict"]} rows={RD.scoreBands.map((b) => [b.range, b.verdict])} />
      </Accordion>

      <Accordion title="Roles & domains">
        <Table headers={["Role", "Weights"]} rows={RD.roles.map((r) => [r.label, r.weights])} />
        <div className="mt-4">
          <Table headers={["Domain", "Sub-competencies"]} rows={RD.domainSubcompetencies.map((d) => [d.domain, d.subs])} />
        </div>
      </Accordion>

      <Accordion title="Promotion evidence standard">
        {(["L1", "L2", "L3"] as const).map((lvl) => (
          <div key={lvl} className="mb-3">
            <div className="text-sm font-medium text-[var(--text)] mb-1">{lvl}</div>
            <ul className="list-disc pl-5 space-y-0.5">
              {RD.promotionEvidence[lvl].map((r, i) => {
                const req = r as { type: string; min: number; label?: string; maxAssist?: number; minDiff?: number };
                const cons = [req.maxAssist !== undefined ? `A≤${req.maxAssist}` : "", req.minDiff !== undefined ? `D≥${req.minDiff}` : ""].filter(Boolean).join(", ");
                return (
                  <li key={i}>
                    {req.min}× {req.label ?? req.type}
                    {cons ? ` (${cons})` : ""}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </Accordion>

      <Accordion title="Grading principles">
        <ul className="list-disc pl-5 space-y-1">
          {RD.gradingPrinciples.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </Accordion>
    </div>
  );
}
