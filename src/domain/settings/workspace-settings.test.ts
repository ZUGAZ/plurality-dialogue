import { Either, Schema } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { layoutIdOrDefault } from "@domain/layout/presets"
import { isProviderId } from "../provider/provider-id"
import type { SourceUrlPlacement } from "./source-url-placement"
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
        sourceUrlPlacement: "omit",
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
        sourceUrlPlacement: "omit",
      })
      expect(decoded.right.panelProviders).toBeUndefined()
    }
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
        sourceUrlPlacement: "omit",
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
        sourceUrlPlacement: "omit",
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
      sourceUrlPlacement: "omit",
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

const settingsWithPlacement = (
  sourceUrlPlacement: SourceUrlPlacement,
): WorkspaceSettings => ({
  enabledProviders: ["chatgpt", "claude"],
  layout: "1x2",
  panelProviders: ["chatgpt", null],
  toolbarCollapsed: true,
  theme: "dark",
  sourceUrlPlacement,
})

describe("sourceUrlPlacement", () => {
  const siblings = {
    enabledProviders: ["chatgpt", "claude"],
    layout: "1x2",
    panelProviders: ["chatgpt", null],
    toolbarCollapsed: true,
    theme: "dark",
  }

  it("decodes a missing key as omit and keeps siblings", () => {
    expect(decodeWorkspaceSettings(siblings)).toEqual(
      Either.right({ ...siblings, sourceUrlPlacement: "omit" }),
    )
  })

  it("decodes before and after", () => {
    expect(
      decodeWorkspaceSettings({ ...siblings, sourceUrlPlacement: "before" }),
    ).toEqual(Either.right({ ...siblings, sourceUrlPlacement: "before" }))
    expect(
      decodeWorkspaceSettings({ ...siblings, sourceUrlPlacement: "after" }),
    ).toEqual(Either.right({ ...siblings, sourceUrlPlacement: "after" }))
  })

  it("decodes sideways as omit and keeps siblings", () => {
    for (const sourceUrlPlacement of ["sideways", null, 1]) {
      expect(
        decodeWorkspaceSettings({ ...siblings, sourceUrlPlacement }),
      ).toEqual(Either.right({ ...siblings, sourceUrlPlacement: "omit" }))
    }
  })

  it("defaults to omit", () => {
    expect(defaultWorkspaceSettings.sourceUrlPlacement).toBe("omit")
  })

  it("round-trips omit, before, and after", () => {
    const placements: readonly SourceUrlPlacement[] = [
      "omit",
      "before",
      "after",
    ]
    for (const sourceUrlPlacement of placements) {
      const settings = settingsWithPlacement(sourceUrlPlacement)
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
