import { describe, expect, it } from "@effect/vitest"
import { builtInProviders } from "@domain/provider/built-in-providers"
import { toToggleRows } from "./model"

describe("toToggleRows", () => {
  it("returns four rows and leaves Grok off by default", () => {
    const rows = toToggleRows(builtInProviders, [
      "chatgpt",
      "claude",
      "gemini",
    ])
    expect(rows.map((row) => row.id)).toEqual([
      "chatgpt",
      "claude",
      "gemini",
      "grok",
    ])
    expect(rows.map((row) => row.label)).toEqual([
      "ChatGPT",
      "Claude",
      "Gemini",
      "Grok",
    ])
    expect(rows.map((row) => row.isEnabled)).toEqual([
      true,
      true,
      true,
      false,
    ])
  })

  it("marks no row isLastEnabled when all are on", () => {
    const rows = toToggleRows(builtInProviders, [
      "chatgpt",
      "claude",
      "gemini",
      "grok",
    ])
    expect(rows.every((row) => row.isEnabled)).toBe(true)
    expect(rows.every((row) => row.isLastEnabled === false)).toBe(true)
  })

  it("marks only the single on-row as isLastEnabled", () => {
    const rows = toToggleRows(builtInProviders, ["claude"])
    expect(rows.map((row) => row.isEnabled)).toEqual([
      false,
      true,
      false,
      false,
    ])
    expect(rows.map((row) => row.isLastEnabled)).toEqual([
      false,
      true,
      false,
      false,
    ])
  })
})
