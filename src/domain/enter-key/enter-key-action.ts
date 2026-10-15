import type { EnterKeyCustom } from "../settings/enter-key-custom"
import type { EnterKeyPreset } from "../settings/enter-key-preset"
import type { EnterChord } from "./enter-chord"
import { isMidIme, type ImeSession } from "./ime-session"

export type EnterKeyAction =
  | "passthrough"
  | "submit"
  | "insert-newline"
  | "swallow"

export type EnterModifierSlot = "alt" | "ctrl" | "shift" | "plain"

export type EnterActionSlot = "ctrl" | "shift" | "plain"

export type ResolveEnterActionInput = {
  readonly preset: EnterKeyPreset
  readonly chord: EnterChord
  readonly session: ImeSession
  readonly custom: EnterKeyCustom
}

export const enterModifierSlot = (chord: EnterChord): EnterModifierSlot => {
  if (chord.altKey) {
    return "alt"
  }
  if (chord.ctrlKey || chord.metaKey) {
    return "ctrl"
  }
  if (chord.shiftKey) {
    return "shift"
  }
  return "plain"
}

export const actionForPreset = (
  preset: EnterKeyPreset,
  slot: EnterActionSlot,
  custom: EnterKeyCustom,
): EnterKeyAction => {
  if (preset === "custom") {
    return customChoice(slot, custom)
  }
  if (preset === "default") {
    return "passthrough"
  }
  if (preset === "slack") {
    return slot === "ctrl" ? "submit" : "insert-newline"
  }
  return slot === "plain" ? "insert-newline" : "submit"
}

export const repeatPolicy = (
  action: EnterKeyAction,
  repeat: boolean,
): EnterKeyAction => {
  if (repeat && action === "submit") {
    return "swallow"
  }
  return action
}

export const resolveEnterAction = (
  input: ResolveEnterActionInput,
): EnterKeyAction => {
  if (isMidIme(input.session, input.chord)) {
    return "passthrough"
  }
  if (input.chord.key !== "Enter") {
    return "passthrough"
  }
  const slot = enterModifierSlot(input.chord)
  if (slot === "alt") {
    return "passthrough"
  }
  return repeatPolicy(
    actionForPreset(input.preset, slot, input.custom),
    input.chord.repeat,
  )
}

const customChoice = (
  slot: EnterActionSlot,
  custom: EnterKeyCustom,
): EnterKeyAction => {
  if (slot === "plain") {
    return custom.enter
  }
  if (slot === "shift") {
    return custom.shiftEnter
  }
  return custom.ctrlEnter
}
