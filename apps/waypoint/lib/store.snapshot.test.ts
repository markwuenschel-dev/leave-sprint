/**
 * INT-009 — persist and exportState share one snapshot key list.
 * Actions / _rehydrated must not leak; WaypointState data keys must not drift.
 */

import { describe, expect, expectTypeOf, it, vi } from "vitest";

vi.mock("./persist/serverStorage", () => ({
  serverStorage: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  },
}));

import type { WaypointState } from "./domain";
import { SNAPSHOT_KEYS, useWaypointStore } from "./store";

describe("snapshot keys", () => {
  it("exportState keys equal SNAPSHOT_KEYS / WaypointState and carry no functions", () => {
    const exported = useWaypointStore.getState().exportState();
    const keys = Object.keys(exported).sort();
    expect(keys).toEqual([...SNAPSHOT_KEYS].sort());

    for (const value of Object.values(exported)) {
      expect(typeof value).not.toBe("function");
    }

    expectTypeOf(exported).toEqualTypeOf<WaypointState>();
    expectTypeOf<(typeof SNAPSHOT_KEYS)[number]>().toEqualTypeOf<keyof WaypointState>();
  });
});
