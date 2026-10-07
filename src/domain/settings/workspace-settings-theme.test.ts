import { Either, Schema } from "effect"
import { describe, expect, it } from "@effect/vitest"
import type { ThemePreference } from "./theme-preference"
import {
  WorkspaceSettings,
  decodeWorkspaceSettings,
} from "./workspace-settings"

const base = { enabledProviders: ["chatgpt"], layout: "1x3" }

describe("workspace settings theme", () => {
  it("defaults a missing theme to system", () => {
    const decoded = decodeWorkspaceSettings(base)
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(decoded.right.theme).toBe("system")
      expect(decoded.right.enabledProviders).toEqual(["chatgpt"])
      expect(decoded.right.layout).toBe("1x3")
      expect(decoded.right.toolbarCollapsed).toBe(false)
      expect(decoded.right.panelProviders).toBeUndefined()
    }
  })

  it("decodes dark", () => {
    const decoded = decodeWorkspaceSettings({ ...base, theme: "dark" })
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(decoded.right.theme).toBe("dark")
    }
  })

  it("rejects purple", () => {
    expect(
      Either.isLeft(decodeWorkspaceSettings({ ...base, theme: "purple" })),
    ).toBe(true)
  })

  it("round-trips light, dark, and system", () => {
    const themes: readonly ThemePreference[] = ["light", "dark", "system"]
    for (const theme of themes) {
      const settings: WorkspaceSettings = {
        enabledProviders: ["chatgpt"],
        layout: "1x2",
        panelProviders: ["chatgpt", null],
        toolbarCollapsed: true,
        theme,
      }
      const encoded = Schema.encodeEither(WorkspaceSettings)(settings)
      expect(Either.isRight(encoded)).toBe(true)
      if (Either.isRight(encoded)) {
        expect(decodeWorkspaceSettings(encoded.right)).toEqual(
          Either.right(settings),
        )
      }
    }
  })
})
