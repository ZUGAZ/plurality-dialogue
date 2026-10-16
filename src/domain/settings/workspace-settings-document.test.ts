import { Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { decodeWorkspaceSettings } from "./workspace-settings"

describe("workspace settings document", () => {
  it("decodes panelProviders of length 1..6 including null entries", () => {
    const decoded = decodeWorkspaceSettings({
      enabledProviders: ["chatgpt", "claude", "gemini"],
      layout: "1x3",
      panelProviders: ["claude", "claude", "gemini"],
    })
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(decoded.right.panelProviders).toEqual([
        "claude",
        "claude",
        "gemini",
      ])
    }
    expect(
      Either.isRight(
        decodeWorkspaceSettings({
          enabledProviders: [],
          layout: "1x1",
          panelProviders: [null],
        }),
      ),
    ).toBe(true)
    expect(
      Either.isRight(
        decodeWorkspaceSettings({
          enabledProviders: ["chatgpt"],
          layout: "2x2",
          panelProviders: ["chatgpt", "chatgpt", "chatgpt", "chatgpt"],
        }),
      ),
    ).toBe(true)
    expect(
      Either.isRight(
        decodeWorkspaceSettings({
          enabledProviders: ["chatgpt"],
          layout: "1x5",
          panelProviders: ["chatgpt", "chatgpt", "chatgpt", "chatgpt", null],
        }),
      ),
    ).toBe(true)
    expect(
      Either.isRight(
        decodeWorkspaceSettings({
          enabledProviders: ["chatgpt"],
          layout: "1x6",
          panelProviders: [
            "chatgpt",
            "claude",
            "gemini",
            "chatgpt",
            "claude",
            null,
          ],
        }),
      ),
    ).toBe(true)
    expect(
      Either.isRight(
        decodeWorkspaceSettings({
          enabledProviders: ["chatgpt"],
          layout: "2x3",
          panelProviders: [
            "chatgpt",
            "claude",
            "gemini",
            "chatgpt",
            "claude",
            "gemini",
          ],
        }),
      ),
    ).toBe(true)
  })

  it("decodes panelProviders and enabledProviders that name grok", () => {
    const panel = decodeWorkspaceSettings({
      enabledProviders: ["chatgpt"],
      layout: "1x3",
      panelProviders: ["grok"],
    })
    expect(Either.isRight(panel)).toBe(true)
    if (Either.isRight(panel)) {
      expect(panel.right.panelProviders).toEqual(["grok"])
    }
    const enabled = decodeWorkspaceSettings({
      enabledProviders: ["chatgpt", "grok"],
      layout: "1x3",
    })
    expect(Either.isRight(enabled)).toBe(true)
    if (Either.isRight(enabled)) {
      expect(enabled.right.enabledProviders).toEqual(["chatgpt", "grok"])
    }
  })

  it("rejects panelProviders with not-a-provider, bad lengths, or a non-array", () => {
    const base = { enabledProviders: ["chatgpt"], layout: "1x3" }
    expect(
      Either.isLeft(
        decodeWorkspaceSettings({
          ...base,
          panelProviders: ["not-a-provider"],
        }),
      ),
    ).toBe(true)
    expect(
      Either.isLeft(decodeWorkspaceSettings({ ...base, panelProviders: [] })),
    ).toBe(true)
    expect(
      Either.isLeft(
        decodeWorkspaceSettings({
          ...base,
          panelProviders: [
            "chatgpt",
            "chatgpt",
            "chatgpt",
            "chatgpt",
            "chatgpt",
            "chatgpt",
            "chatgpt",
          ],
        }),
      ),
    ).toBe(true)
    expect(
      Either.isLeft(
        decodeWorkspaceSettings({ ...base, panelProviders: "chatgpt" }),
      ),
    ).toBe(true)
  })

  it("rejects null, empty objects, and a missing provider list", () => {
    expect(Either.isLeft(decodeWorkspaceSettings(null))).toBe(true)
    expect(Either.isLeft(decodeWorkspaceSettings({}))).toBe(true)
    expect(
      Either.isLeft(decodeWorkspaceSettings({ layout: "1x3" })),
    ).toBe(true)
  })

  it("rejects an unknown layout, not-a-provider, a unicode times sign, and a string list", () => {
    expect(
      Either.isLeft(
        decodeWorkspaceSettings({
          enabledProviders: [],
          layout: "1x7",
        }),
      ),
    ).toBe(true)
    expect(
      Either.isLeft(
        decodeWorkspaceSettings({
          enabledProviders: ["chatgpt", "not-a-provider"],
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
})
