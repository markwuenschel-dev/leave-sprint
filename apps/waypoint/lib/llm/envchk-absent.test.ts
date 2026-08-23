/**
 * INT-016 — `__envchk.mts` hashed live API keys from a hardcoded `.env` path.
 * It must not exist in the waypoint tree.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoWaypointRoot = fileURLToPath(new URL("../..", import.meta.url));

describe("INT-016 — __envchk.mts must not exist", () => {
  it("is absent from the waypoint root", () => {
    expect(existsSync(join(repoWaypointRoot, "__envchk.mts"))).toBe(false);
  });
});
