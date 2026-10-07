import { describe, expect, it } from "@effect/vitest"
import {
  isThemePreference,
  themeToColorScheme,
  type ThemePreference,
} from "./theme-preference"

describe("theme preference", () => {
  it("accepts light, dark, and system", () => {
    expect(isThemePreference("light")).toBe(true)
    expect(isThemePreference("dark")).toBe(true)
    expect(isThemePreference("system")).toBe(true)
  })

  it("rejects purple, null, and a number", () => {
    expect(isThemePreference("purple")).toBe(false)
    expect(isThemePreference(null)).toBe(false)
    expect(isThemePreference(42)).toBe(false)
  })

  it("maps each preference to a color-scheme value", () => {
    const cases: readonly (readonly [ThemePreference, string])[] = [
      ["system", "light dark"],
      ["light", "light"],
      ["dark", "dark"],
    ]
    for (const [theme, colorScheme] of cases) {
      expect(themeToColorScheme(theme)).toBe(colorScheme)
    }
  })
})
