"use client";

import { AIMockPanel } from "../rubric/AIMockPanel";
import { SurfaceHero } from "./shared";

/** Top-level AI Interviewer surface (its own main-nav tab). Wraps the grade loop. */
export function MockSurface() {
  return (
    <div className="space-y-5">
      <SurfaceHero
        eyebrow="AI interviewer · graded"
        title="AI Questions"
        accent="cyan"
        subtitle={
          <>
            One question climbs a three-level ladder — Level I → II → III. Each level asks, probes with
            adaptive follow-ups, and grades into your rubric. The session always climbs L1–L3; the score
            marks a level cleared but does not end the session. Pick any provider you&apos;ve configured.
          </>
        }
      />
      <AIMockPanel />
    </div>
  );
}
