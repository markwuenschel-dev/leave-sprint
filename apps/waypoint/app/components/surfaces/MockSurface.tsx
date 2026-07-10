"use client";

import { AIMockPanel } from "../rubric/AIMockPanel";
import { SurfaceHero } from "./shared";

/** Top-level AI Interviewer surface (its own main-nav tab). Wraps the grade loop. */
export function MockSurface() {
  return (
    <div className="space-y-5">
      <SurfaceHero
        eyebrow="AI interviewer · graded"
        title="Mock"
        accent="cyan"
        subtitle={
          <>
            Answer a question and an LLM grades it against the rubric — the result flows into
            readiness, gaps, and retest like any assessment. Pick any provider you&apos;ve configured.
          </>
        }
      />
      <AIMockPanel />
    </div>
  );
}
