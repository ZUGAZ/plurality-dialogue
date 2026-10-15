import { describe, expect, it } from "@effect/vitest"
import {
  enterKeyChoiceOptions,
  enterKeyCustomGroups,
  enterKeyPresetOptions,
} from "./model"

describe("enter key preset options", () => {
  it("lists the four presets in order with the scoped labels", () => {
    expect(enterKeyPresetOptions.map((row) => row.id)).toEqual([
      "default",
      "swapped",
      "slack",
      "custom",
    ])
    expect(enterKeyPresetOptions.map((row) => row.label)).toEqual([
      "Site default",
      "Swapped",
      "Slack",
      "Custom",
    ])
    expect(enterKeyPresetOptions[0]?.detail).toBeUndefined()
    expect(enterKeyPresetOptions[3]?.detail).toBeUndefined()
    expect(enterKeyPresetOptions[1]?.detail).toBe(
      "Enter starts a new line. Shift+Enter sends. Ctrl+Enter or ⌘+Enter also sends.",
    )
    expect(enterKeyPresetOptions[2]?.detail).toBe(
      "Enter and Shift+Enter start a new line. Ctrl+Enter or ⌘+Enter sends.",
    )
  })

  it("lists custom legends and New line / Send", () => {
    expect(enterKeyCustomGroups.map((group) => group.legend)).toEqual([
      "Enter",
      "Shift+Enter",
      "Ctrl+Enter or ⌘+Enter",
    ])
    expect(enterKeyCustomGroups.map((group) => group.name)).toEqual([
      "enter-key-custom-enter",
      "enter-key-custom-shift-enter",
      "enter-key-custom-ctrl-enter",
    ])
    expect(enterKeyChoiceOptions).toEqual([
      { id: "insert-newline", label: "New line" },
      { id: "submit", label: "Send" },
    ])
  })
})
