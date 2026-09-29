import { describe, expect, it } from "@effect/vitest"
import { builtInProviders } from "@domain/provider/built-in-providers"
import { toToggleRows } from "./model"

describe("toToggleRows", () => {
  it("returns three rows in built-in labels and order", () => {
    const rows = toToggleRows(builtInProviders, [
      "chatgpt",
      "claude",
      "gemini",
    ])
    expect(rows.map((row) => row.id)).toEqual([
      "chatgpt",
      "claude",
      "gemini",
    ])
    expect(rows.map((row) => row.label)).toEqual([
      "ChatGPT",
      "Claude",
      "Gemini",
    ])
  })

  it("marks no row isLastEnabled when all are on", () => {
    const rows = toToggleRows(builtInProviders, [
      "chatgpt",
      "claude",
      "gemini",
    ])
    expect(rows.every((row) => row.isEnabled)).toBe(true)
    expect(rows.every((row) => row.isLastEnabled === false)).toBe(true)
  })

  it("marks only the single on-row as isLastEnabled", () => {
    const rows = toToggleRows(builtInProviders, ["claude"])
    expect(rows.map((row) => row.isEnabled)).toEqual([false, true, false])
    expect(rows.map((row) => row.isLastEnabled)).toEqual([
      false,
      true,
      false,
    ])
  })
})
