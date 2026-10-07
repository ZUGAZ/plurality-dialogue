import { Either, Schema } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { layoutIdOrDefault } from "@domain/layout/presets"
import { isProviderId } from "../provider/provider-id"
import {
  WorkspaceSettings,
  decodeWorkspaceSettings,
  defaultWorkspaceSettings,
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

  it("decodes 1x4 and treats it as a real preset", () => {
    expect(
      Either.isRight(
        decodeWorkspaceSettings({
          enabledProviders: ["chatgpt"],
          layout: "1x4",
        }),
      ),
    ).toBe(true)
    expect(layoutIdOrDefault("1x4")).toBe("1x4")
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
        toolbarCollapsed: false,
        theme: "system",
      })
    }
  })

  it("decodes a legacy document without panelProviders unchanged", () => {
    const decoded = decodeWorkspaceSettings({
      enabledProviders: ["chatgpt"],
      layout: "1x2",
    })
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(decoded.right).toEqual({
        enabledProviders: ["chatgpt"],
        layout: "1x2",
        toolbarCollapsed: false,
        theme: "system",
      })
      expect(decoded.right.panelProviders).toBeUndefined()
    }
  })

  it("decodes panelProviders of length 1..4 including null entries", () => {
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
  })

  it("rejects panelProviders with grok, bad lengths, or a non-array", () => {
    const base = { enabledProviders: ["chatgpt"], layout: "1x3" }
    expect(
      Either.isLeft(
        decodeWorkspaceSettings({ ...base, panelProviders: ["grok"] }),
      ),
    ).toBe(true)
    expect(
      Either.isLeft(decodeWorkspaceSettings({ ...base, panelProviders: [] })),
    ).toBe(true)
    expect(
      Either.isLeft(
        decodeWorkspaceSettings({
          ...base,
          panelProviders: ["chatgpt", "chatgpt", "chatgpt", "chatgpt", "chatgpt"],
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
        toolbarCollapsed: false,
        theme: "system",
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
    expect(defaultWorkspaceSettings.panelProviders).toBeUndefined()
    expect(defaultWorkspaceSettings.toolbarCollapsed).toBe(false)
    expect(defaultWorkspaceSettings.theme).toBe("system")
  })

  it("decodes toolbarCollapsed as an optional expanded default", () => {
    const base = { enabledProviders: ["chatgpt"], layout: "1x3" }
    const missing = decodeWorkspaceSettings(base)
    const withPanels = decodeWorkspaceSettings({
      ...base,
      panelProviders: ["chatgpt", null],
    })
    const collapsed = decodeWorkspaceSettings({
      ...base,
      toolbarCollapsed: true,
    })
    expect(
      Either.isLeft(
        decodeWorkspaceSettings({ ...base, toolbarCollapsed: "yes" }),
      ),
    ).toBe(true)
    expect(Either.isRight(missing)).toBe(true)
    expect(Either.isRight(withPanels)).toBe(true)
    expect(Either.isRight(collapsed)).toBe(true)
    if (
      Either.isRight(missing) &&
      Either.isRight(withPanels) &&
      Either.isRight(collapsed)
    ) {
      expect(missing.right).toEqual({
        ...base,
        toolbarCollapsed: false,
        theme: "system",
      })
      expect(missing.right.panelProviders).toBeUndefined()
      expect(withPanels.right.panelProviders).toEqual(["chatgpt", null])
      expect(withPanels.right.toolbarCollapsed).toBe(false)
      expect(withPanels.right.enabledProviders).toEqual(["chatgpt"])
      expect(collapsed.right.toolbarCollapsed).toBe(true)
    }
  })

  it("round-trips toolbarCollapsed true", () => {
    const settings: WorkspaceSettings = {
      enabledProviders: ["chatgpt"],
      layout: "1x3",
      toolbarCollapsed: true,
      theme: "system",
    }
    const encoded = Schema.encodeEither(WorkspaceSettings)(settings)
    expect(Either.isRight(encoded)).toBe(true)
    if (Either.isRight(encoded)) {
      expect(decodeWorkspaceSettings(encoded.right)).toEqual(
        Either.right(settings),
      )
    }
  })

  it("does not treat grok as a provider id", () => {
    expect(isProviderId("grok")).toBe(false)
  })
})
