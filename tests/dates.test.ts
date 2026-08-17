import { describe, expect, it } from "vitest";
import { CAREER_START, careerYears, statusWord } from "../src/lib/dates";

/** Brisbane is UTC+10 year round. 00:00 UTC = 10:00 Brisbane same day. */
const bris = (isoLocal: string) => new Date(`${isoLocal}+10:00`);

// Independently verified (not taken on faith from the brief) with
// `Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Brisbane", weekday: "short" })`:
// 2026-08-17T00:00:00+10:00 -> Mon
// 2026-08-15T00:00:00+10:00 -> Sat

describe("careerYears", () => {
  it("counts from CAREER_START", () => {
    expect(CAREER_START).toBe(2020);
    expect(careerYears(new Date("2026-08-16T00:00:00Z"))).toBe(6);
  });

  it("advances with the year", () => {
    expect(careerYears(new Date("2027-01-01T00:00:00Z"))).toBe(7);
  });

  it("derives the year in Brisbane, not in UTC", () => {
    // 20:00 UTC on Dec 31 is 06:00 Brisbane on Jan 1 -> already the new year.
    expect(careerYears(new Date("2026-12-31T20:00:00Z"))).toBe(
      2027 - CAREER_START
    );
    // 13:00 UTC on Dec 31 is 23:00 Brisbane on Dec 31 -> still the old year.
    expect(careerYears(new Date("2026-12-31T13:00:00Z"))).toBe(
      2026 - CAREER_START
    );
  });
});

describe("statusWord", () => {
  describe("sleeping (hour < 7)", () => {
    it("sleeps at midnight, the start of the band", () => {
      expect(statusWord(bris("2026-08-17T00:00:00"))).toBe("sleeping");
    });

    it("sleeps before 7am", () => {
      expect(statusWord(bris("2026-08-17T03:00:00"))).toBe("sleeping");
    });

    it("still sleeps at 6am, the last hour of the band", () => {
      expect(statusWord(bris("2026-08-17T06:00:00"))).toBe("sleeping");
    });
  });

  describe("waking up (hour 7)", () => {
    it("wakes up at 7am, the start of the band", () => {
      expect(statusWord(bris("2026-08-17T07:00:00"))).toBe("waking up");
    });

    it("wakes up between 7 and 8", () => {
      expect(statusWord(bris("2026-08-17T07:30:00"))).toBe("waking up");
    });
  });

  describe("working (weekday, hour 8-16)", () => {
    it("starts working at 8am, the start of the band", () => {
      // 2026-08-17 is a Monday.
      expect(statusWord(bris("2026-08-17T08:00:00"))).toBe("working");
    });

    it("works on a weekday between 8 and 5", () => {
      expect(statusWord(bris("2026-08-17T10:00:00"))).toBe("working");
    });

    it("still works at 4pm, the last hour of the band", () => {
      expect(statusWord(bris("2026-08-17T16:00:00"))).toBe("working");
    });
  });

  describe("weekend daytime fallback (hour 8-16, not a weekday)", () => {
    it("does not work at 8am on a weekend, the start of the band", () => {
      // 2026-08-15 is a Saturday.
      expect(statusWord(bris("2026-08-15T08:00:00"))).toBe("projecting");
    });

    it("does not work on a weekend daytime", () => {
      expect(statusWord(bris("2026-08-15T10:00:00"))).toBe("projecting");
    });

    it("still does not work at 4pm on a weekend, the last hour of the band", () => {
      expect(statusWord(bris("2026-08-15T16:00:00"))).toBe("projecting");
    });
  });

  describe("cooking (hour 17-18, any day)", () => {
    it("starts cooking at 5pm, the start of the band, on any day", () => {
      expect(statusWord(bris("2026-08-17T17:00:00"))).toBe("cooking");
      expect(statusWord(bris("2026-08-15T17:00:00"))).toBe("cooking");
    });

    it("cooks between 5 and 7pm on any day", () => {
      expect(statusWord(bris("2026-08-17T18:00:00"))).toBe("cooking");
      expect(statusWord(bris("2026-08-15T18:00:00"))).toBe("cooking");
    });
  });

  describe("evening (hour 19-21, weekday vs weekend)", () => {
    it("starts the evening band at 7pm, the start of the band", () => {
      expect(statusWord(bris("2026-08-17T19:00:00"))).toBe("projecting");
      expect(statusWord(bris("2026-08-15T19:00:00"))).toBe("relaxing");
    });

    it("projects on a weekday evening and relaxes on a weekend evening", () => {
      expect(statusWord(bris("2026-08-17T20:00:00"))).toBe("projecting");
      expect(statusWord(bris("2026-08-15T20:00:00"))).toBe("relaxing");
    });

    it("still holds at 9pm, the last hour of the band", () => {
      expect(statusWord(bris("2026-08-17T21:00:00"))).toBe("projecting");
      expect(statusWord(bris("2026-08-15T21:00:00"))).toBe("relaxing");
    });
  });

  describe("fiddling with the homelab (hour >= 22, any day)", () => {
    it("starts fiddling at 10pm, the start of the band, on any day", () => {
      expect(statusWord(bris("2026-08-17T22:00:00"))).toBe(
        "fiddling with the homelab"
      );
      expect(statusWord(bris("2026-08-15T22:00:00"))).toBe(
        "fiddling with the homelab"
      );
    });

    it("fiddles with the homelab after 10pm", () => {
      expect(statusWord(bris("2026-08-17T23:00:00"))).toBe(
        "fiddling with the homelab"
      );
    });
  });

  it("is correct regardless of the caller's own timezone", () => {
    // 22:00 UTC on Sunday is 08:00 Brisbane on Monday — a working hour.
    expect(statusWord(new Date("2026-08-16T22:00:00Z"))).toBe("working");
  });
});
