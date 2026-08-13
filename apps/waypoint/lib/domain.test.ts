import { describe, expect, it } from "vitest";

import { todayIso, weekStartIso } from "./domain";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local calendar YYYY-MM-DD — independent of Date#toISOString (UTC). */
function localYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

describe("todayIso", () => {
  it("returns the local calendar YYYY-MM-DD for late evening and early morning", () => {
    const late = new Date(2026, 7, 13, 23, 30);
    const early = new Date(2026, 7, 13, 0, 30);
    expect(todayIso(late)).toBe(localYmd(late));
    expect(todayIso(early)).toBe(localYmd(early));
  });
});

describe("weekStartIso", () => {
  it("returns the local Monday of the week containing a local Wednesday", () => {
    // 2026-08-12 is a Wednesday; that week's Monday is 2026-08-10.
    const wed = new Date(2026, 7, 12, 15, 0);
    expect(wed.getDay()).toBe(3);
    expect(weekStartIso(wed)).toBe("2026-08-10");
    expect(weekStartIso(wed)).toBe(localYmd(new Date(2026, 7, 10)));
  });
});
