import type { EnterKeyChoice, EnterKeyCustom } from "@domain/settings/enter-key-custom"
import type { EnterKeyPreset } from "@domain/settings/enter-key-preset"

export type { EnterKeyChoice, EnterKeyCustom, EnterKeyPreset }

export type EnterKeyPresetRow = {
  readonly id: EnterKeyPreset
  readonly label: string
  readonly detail?: string
}

export const enterKeyPresetOptions: readonly EnterKeyPresetRow[] = [
  { id: "default", label: "Site default" },
  {
    id: "swapped",
    label: "Swapped",
    detail:
      "Enter starts a new line. Shift+Enter sends. Ctrl+Enter or ⌘+Enter also sends.",
  },
  {
    id: "slack",
    label: "Slack",
    detail:
      "Enter and Shift+Enter start a new line. Ctrl+Enter or ⌘+Enter sends.",
  },
  { id: "custom", label: "Custom" },
]

export type EnterKeyCustomSlot = "enter" | "shiftEnter" | "ctrlEnter"

export type EnterKeyCustomGroup = {
  readonly slot: EnterKeyCustomSlot
  readonly legend: string
  readonly name: string
}

export const enterKeyCustomGroups: readonly EnterKeyCustomGroup[] = [
  { slot: "enter", legend: "Enter", name: "enter-key-custom-enter" },
  {
    slot: "shiftEnter",
    legend: "Shift+Enter",
    name: "enter-key-custom-shift-enter",
  },
  {
    slot: "ctrlEnter",
    legend: "Ctrl+Enter or ⌘+Enter",
    name: "enter-key-custom-ctrl-enter",
  },
]

export type EnterKeyChoiceOption = {
  readonly id: EnterKeyChoice
  readonly label: string
}

export const enterKeyChoiceOptions: readonly EnterKeyChoiceOption[] = [
  { id: "insert-newline", label: "New line" },
  { id: "submit", label: "Send" },
]

export const saveEnterKeyPresetErrorText = "Could not save."

export const withCustomChoice = (
  custom: EnterKeyCustom,
  slot: EnterKeyCustomSlot,
  choice: EnterKeyChoice,
): EnterKeyCustom => {
  if (slot === "enter") {
    return { ...custom, enter: choice }
  }
  if (slot === "shiftEnter") {
    return { ...custom, shiftEnter: choice }
  }
  return { ...custom, ctrlEnter: choice }
}
