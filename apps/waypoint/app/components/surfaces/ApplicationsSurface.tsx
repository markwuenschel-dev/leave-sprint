"use client";

import { useState } from "react";
import {
  useWaypointStore,
  newApplication,
} from "@/lib/store";
import {
  APP_STATUSES,
  TARGET_ROLE_LABELS,
  type AppStatus,
  type Application,
  type MaterialRef,
  type TargetRole,
} from "@/lib/domain";
import { card, inputClass } from "./shared";

export function ApplicationsSurface() {
  const apps = useWaypointStore((s) => s.applications);
  const upsert = useWaypointStore((s) => s.upsertApplication);
  const del = useWaypointStore((s) => s.deleteApplication);
  const [filter, setFilter] = useState<AppStatus | "all">("all");
  const [draft, setDraft] = useState<Application | null>(null);

  const list = apps.filter((a) => filter === "all" || a.status === filter);

  function save() {
    if (!draft || !draft.company.trim()) return;
    upsert({ ...draft, updatedAt: new Date().toISOString() });
    setDraft(null);
  }

  function setMaterial(i: number, patch: Partial<MaterialRef>) {
    if (!draft) return;
    const materials = [...(draft.materials || [])];
    materials[i] = { ...materials[i], ...patch };
    setDraft({ ...draft, materials });
  }

  function addMaterial() {
    if (!draft) return;
    setDraft({
      ...draft,
      materials: [...(draft.materials || []), { label: "", url: "" }],
    });
  }

  function removeMaterial(i: number) {
    if (!draft) return;
    setDraft({
      ...draft,
      materials: (draft.materials || []).filter((_, j) => j !== i),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold">Applications</h2>
          <p className="mt-1 text-sm text-[var(--text-dim)]">
            {apps.length} total · role+company pipeline · wishlist welcome anytime
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-[var(--cyan)] px-3 py-1.5 text-sm text-[var(--cyan)]"
          onClick={() => setDraft(newApplication())}
        >
          + New
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-lg border px-2 py-1 text-xs ${
            filter === "all" ? "border-[var(--cyan)]" : "border-[var(--hairline)]"
          }`}
          onClick={() => setFilter("all")}
        >
          All ({apps.length})
        </button>
        {APP_STATUSES.map((st) => {
          const n = apps.filter((a) => a.status === st).length;
          return (
            <button
              key={st}
              type="button"
              className={`rounded-lg border px-2 py-1 text-xs ${
                filter === st ? "border-[var(--cyan)]" : "border-[var(--hairline)]"
              }`}
              onClick={() => setFilter(st)}
            >
              {st}
              {n ? ` (${n})` : ""}
            </button>
          );
        })}
      </div>

      {list.length === 0 && !draft ? (
        <div className={`${card} text-sm text-[var(--text-dim)]`}>
          No applications yet. Wishlisting roles before evidence is green is fine.
        </div>
      ) : null}

      {list.map((a) => (
        <div key={a.id} className={card}>
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <div className="font-medium">
                {a.roleTitle || "(title)"} @ {a.company || "(company)"}
              </div>
              <div className="text-xs text-[var(--text-dim)]">
                {TARGET_ROLE_LABELS[a.targetRole]} · {a.status}
                {a.url ? (
                  <>
                    {" · "}
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--cyan)]"
                    >
                      link
                    </a>
                  </>
                ) : null}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-xs text-[var(--cyan)]"
                onClick={() => setDraft(a)}
              >
                Edit
              </button>
              <button
                type="button"
                className="text-xs text-[var(--orange)]"
                onClick={() => del(a.id)}
              >
                Delete
              </button>
            </div>
          </div>
          {a.notes ? <p className="mt-2 text-sm text-[var(--text-mid)]">{a.notes}</p> : null}
          {a.materials?.length ? (
            <ul className="mt-2 space-y-0.5 text-xs text-[var(--text-dim)]">
              {a.materials.map((m, i) => (
                <li key={i}>
                  {m.url ? (
                    <a href={m.url} target="_blank" rel="noreferrer" className="text-[var(--cyan)]">
                      {m.label || m.url}
                    </a>
                  ) : (
                    m.label || "material"
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}

      {draft ? (
        <div className={`${card} space-y-2 border-[var(--cyan)]`}>
          <h3 className="font-medium">Edit application</h3>
          <input
            className={inputClass}
            placeholder="Company"
            value={draft.company}
            onChange={(e) => setDraft({ ...draft, company: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder="Role title"
            value={draft.roleTitle}
            onChange={(e) => setDraft({ ...draft, roleTitle: e.target.value })}
          />
          <select
            className={inputClass}
            value={draft.targetRole}
            onChange={(e) =>
              setDraft({ ...draft, targetRole: e.target.value as TargetRole })
            }
          >
            {(Object.keys(TARGET_ROLE_LABELS) as TargetRole[]).map((k) => (
              <option key={k} value={k}>
                {TARGET_ROLE_LABELS[k]}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={draft.status}
            onChange={(e) => {
              const status = e.target.value as AppStatus;
              const t = new Date().toISOString();
              setDraft({
                ...draft,
                status,
                statusChangedAt: t,
                ...(status === "applied" && !draft.appliedAt ? { appliedAt: t } : {}),
              });
            }}
          >
            {APP_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
          <input
            className={inputClass}
            placeholder="URL"
            value={draft.url || ""}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
          />
          <textarea
            className={`${inputClass} min-h-[80px]`}
            placeholder="Notes"
            value={draft.notes || ""}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-dim)]">Materials</span>
              <button type="button" className="text-xs text-[var(--cyan)]" onClick={addMaterial}>
                + Link
              </button>
            </div>
            {(draft.materials || []).map((m, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <input
                  className={`${inputClass} flex-1`}
                  placeholder="Label"
                  value={m.label}
                  onChange={(e) => setMaterial(i, { label: e.target.value })}
                />
                <input
                  className={`${inputClass} flex-[2]`}
                  placeholder="https://…"
                  value={m.url}
                  onChange={(e) => setMaterial(i, { url: e.target.value })}
                />
                <button
                  type="button"
                  className="text-xs text-[var(--orange)]"
                  onClick={() => removeMaterial(i)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={save}
              className="rounded-lg bg-[var(--cyan)]/20 px-3 py-1.5 text-sm text-[var(--cyan)]"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="text-sm text-[var(--text-dim)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
