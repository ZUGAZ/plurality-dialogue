import { Either, Schema } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  defaultEnterKeyCustom,
  type EnterKeyCustom,
} from "./enter-key-custom"
import type { EnterKeyPreset } from "./enter-key-preset"
import {
  WorkspaceSettings,
  decodeWorkspaceSettings,
  defaultWorkspaceSettings,
} from "./workspace-settings"

const savedCustom: EnterKeyCustom = {
  enter: "submit",
  shiftEnter: "insert-newline",
  ctrlEnter: "insert-newline",
}

const enterKeySiblings = {
  enabledProviders: ["chatgpt", "claude"],
  layout: "1x2",
  panelProviders: ["chatgpt", null],
  toolbarCollapsed: true,
  theme: "dark",
  sourceUrlPlacement: "before",
}

const settingsWithEnterKey = (
  enterKeyPreset: EnterKeyPreset,
  enterKeyCustom: EnterKeyCustom,
): WorkspaceSettings => ({
  enabledProviders: ["chatgpt", "claude"],
  layout: "1x2",
  panelProviders: ["chatgpt", null],
  toolbarCollapsed: true,
  theme: "dark",
  sourceUrlPlacement: "before",
  enterKeyPreset,
  enterKeyCustom,
})

describe("enter key settings", () => {
  it("round-trips the four presets and a saved custom map", () => {
    const presets: readonly EnterKeyPreset[] = [
      "default",
      "swapped",
      "slack",
      "custom",
    ]
    for (const enterKeyPreset of presets) {
      const settings = settingsWithEnterKey(enterKeyPreset, savedCustom)
      const encoded = Schema.encodeEither(WorkspaceSettings)(settings)
      expect(Either.isRight(encoded)).toBe(true)
      if (Either.isRight(encoded)) {
        expect(decodeWorkspaceSettings(encoded.right)).toEqual(
          Either.right(settings),
        )
      }
    }
  })

  it("decodes a missing or invalid preset as default and keeps a valid map", () => {
    const expected = {
      ...enterKeySiblings,
      enterKeyPreset: "default",
      enterKeyCustom: savedCustom,
    }
    expect(
      decodeWorkspaceSettings({
        ...enterKeySiblings,
        enterKeyCustom: savedCustom,
      }),
    ).toEqual(Either.right(expected))
    expect(
      decodeWorkspaceSettings({
        ...enterKeySiblings,
        enterKeyPreset: "discord",
        enterKeyCustom: savedCustom,
      }),
    ).toEqual(Either.right(expected))
  })

  it("decodes a missing or non-object custom map as the swapped map", () => {
    const base = {
      ...enterKeySiblings,
      enterKeyPreset: "slack",
    }
    const expected = {
      ...base,
      enterKeyCustom: defaultEnterKeyCustom,
    }
    expect(decodeWorkspaceSettings(base)).toEqual(Either.right(expected))
    for (const enterKeyCustom of ["nope", null, 1]) {
      expect(decodeWorkspaceSettings({ ...base, enterKeyCustom })).toEqual(
        Either.right(expected),
      )
    }
  })

  it("falls back one invalid custom field and keeps the others", () => {
    const decoded = decodeWorkspaceSettings({
      ...enterKeySiblings,
      enterKeyPreset: "custom",
      enterKeyCustom: {
        enter: "nope",
        shiftEnter: "insert-newline",
        ctrlEnter: "submit",
      },
    })
    expect(decoded).toEqual(
      Either.right({
        ...enterKeySiblings,
        enterKeyPreset: "custom",
        enterKeyCustom: {
          enter: "insert-newline",
          shiftEnter: "insert-newline",
          ctrlEnter: "submit",
        },
      }),
    )
  })

  it("defaults the preset and the swapped custom map", () => {
    expect(defaultWorkspaceSettings.enterKeyPreset).toBe("default")
    expect(defaultWorkspaceSettings.enterKeyCustom).toEqual(
      defaultEnterKeyCustom,
    )
  })
})
