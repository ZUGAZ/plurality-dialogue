import { Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  decodeWorkspaceSettings,
  defaultWorkspaceSettings,
  isProviderId,
} from "./workspace-settings"

describe("workspace settings schema", () => {
  it("decodes all three providers with 1x3", () => {
    expect(
      Either.isRight(
        decodeWorkspaceSettings({
          enabledProviders: ["chatgpt", "claude", "gemini"],
          layout: "1x3",
        }),
      ),
    ).toBe(true)
  })

  it("decodes 2x2 with a subset of providers", () => {
    expect(
      Either.isRight(
        decodeWorkspaceSettings({
          enabledProviders: ["claude"],
          layout: "2x2",
        }),
      ),
    ).toBe(true)
  })

  it("ignores an extra unused key when required fields are valid", () => {
    const decoded = decodeWorkspaceSettings({
      enabledProviders: ["chatgpt", "claude", "gemini"],
      layout: "1x3",
      unused: true,
    })
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(decoded.right).toEqual({
        enabledProviders: ["chatgpt", "claude", "gemini"],
        layout: "1x3",
      })
    }
  })

  it("rejects null, empty objects, and a missing provider list", () => {
    expect(Either.isLeft(decodeWorkspaceSettings(null))).toBe(true)
    expect(Either.isLeft(decodeWorkspaceSettings({}))).toBe(true)
    expect(
      Either.isLeft(decodeWorkspaceSettings({ layout: "1x3" })),
    ).toBe(true)
  })

  it("rejects an unknown layout, grok, a unicode times sign, and a string list", () => {
    expect(
      Either.isLeft(
        decodeWorkspaceSettings({
          enabledProviders: [],
          layout: "1x5",
        }),
      ),
    ).toBe(true)
    expect(
      Either.isLeft(
        decodeWorkspaceSettings({
          enabledProviders: ["chatgpt", "grok"],
          layout: "1x3",
        }),
      ),
    ).toBe(true)
    expect(
      Either.isLeft(
        decodeWorkspaceSettings({
          enabledProviders: ["chatgpt"],
          layout: "1×3",
        }),
      ),
    ).toBe(true)
    expect(
      Either.isLeft(
        decodeWorkspaceSettings({
          enabledProviders: "chatgpt",
          layout: "1x3",
        }),
      ),
    ).toBe(true)
  })

  it("decodes an empty provider list with 1x3", () => {
    const decoded = decodeWorkspaceSettings({
      enabledProviders: [],
      layout: "1x3",
    })
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(decoded.right).toEqual({
        enabledProviders: [],
        layout: "1x3",
      })
    }
  })

  it("defaults to 1x3 with all three vendors in order", () => {
    expect(defaultWorkspaceSettings.layout).toBe("1x3")
    expect(defaultWorkspaceSettings.enabledProviders).toEqual([
      "chatgpt",
      "claude",
      "gemini",
    ])
  })

  it("does not treat grok as a provider id", () => {
    expect(isProviderId("grok")).toBe(false)
  })
})
