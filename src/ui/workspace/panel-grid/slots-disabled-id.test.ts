import { describe, expect, it } from "@effect/vitest"
import {
  reconcileSlotsWithEnabled,
  slotsFromPanelProviders,
} from "./slots"

describe("reconcileSlotsWithEnabled for a disabled new vendor", () => {
  it("reassigns a deepseek slot when deepseek is off", () => {
    const slots = slotsFromPanelProviders(["deepseek", "claude", "gemini"])
    const next = reconcileSlotsWithEnabled(slots, [
      "chatgpt",
      "claude",
      "gemini",
    ])
    expect(next.map((slot) => slot.providerId)).toEqual([
      "chatgpt",
      "claude",
      "gemini",
    ])
    expect(next[0]?.reloadGeneration).toBe(1)
    expect(next[1]?.reloadGeneration).toBe(0)
    expect(next[2]?.reloadGeneration).toBe(0)
  })
})
