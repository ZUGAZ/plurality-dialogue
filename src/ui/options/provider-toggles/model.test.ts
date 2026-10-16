import { describe, expect, it } from "@effect/vitest"
import { builtInProviders } from "@domain/provider/built-in-providers"
import { toToggleRows } from "./model"

describe("toToggleRows", () => {
  it("returns eight rows and leaves the later vendors off", () => {
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
      "deepseek",
      "kimi",
      "doubao",
      "google",
    ])
    expect(rows.map((row) => row.label)).toEqual([
      "ChatGPT",
      "Claude",
      "Gemini",
      "Grok",
      "DeepSeek",
      "Kimi",
      "Doubao",
      "Google AI Mode",
    ])
    expect(rows.map((row) => row.isEnabled)).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
    ])
  })

  it("marks no row isLastEnabled when all are on", () => {
    const rows = toToggleRows(builtInProviders, [
      "chatgpt",
      "claude",
      "gemini",
      "grok",
      "deepseek",
      "kimi",
      "doubao",
      "google",
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
      false,
      false,
      false,
      false,
    ])
    expect(rows.map((row) => row.isLastEnabled)).toEqual([
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
    ])
  })
})
