import { describe, expect, it } from "vitest";
import { needsCrisisSupport } from "./crisis";
import { canAddTag } from "../components/StruggleTags";

describe("crisis check", () => {
  it("catches the named phrases", () => {
    for (const t of ["I think about suicide", "I want to KILL MYSELF", "i just want to die", "self harm again", "self-harm"]) {
      expect(needsCrisisSupport(t)).toBe(true);
    }
  });
  it("leaves ordinary posts alone", () => {
    expect(needsCrisisSupport("God brought me through a hard week")).toBe(false);
  });
});

describe("struggle tags", () => {
  it("allows at most 2 per post", () => {
    expect(canAddTag({ tagIds: ["a"], other: null })).toBe(true);
    expect(canAddTag({ tagIds: ["a", "b"], other: null })).toBe(false);
    expect(canAddTag({ tagIds: ["a"], other: "" })).toBe(false);
  });
});
