import { Effect, Either } from "effect"
import type { Storage } from "../../domain/ports/storage"
import type { EnterKeyCustom } from "../../domain/settings/enter-key-custom"
import type { EnterKeyPreset } from "../../domain/settings/enter-key-preset"
import {
  decodeWorkspaceSettings,
  defaultWorkspaceSettings,
  workspaceSettingsStorageKey,
} from "../../domain/settings/workspace-settings"
import { loadWorkspaceSettings } from "../../domain/settings/workspace-settings-storage"
import { watchLocalKey } from "./storage"

export type CachedEnterKey = {
  readonly preset: EnterKeyPreset
  readonly custom: EnterKeyCustom
}

const fallbackEnterKey: CachedEnterKey = {
  preset: defaultWorkspaceSettings.enterKeyPreset,
  custom: defaultWorkspaceSettings.enterKeyCustom,
}

const sameEnterKey = (left: CachedEnterKey, right: CachedEnterKey): boolean =>
  left.preset === right.preset &&
  left.custom.enter === right.custom.enter &&
  left.custom.shiftEnter === right.custom.shiftEnter &&
  left.custom.ctrlEnter === right.custom.ctrlEnter

const cachedFromStoredValue = (value: unknown): CachedEnterKey =>
  Either.match(decodeWorkspaceSettings(value), {
    onLeft: () => fallbackEnterKey,
    onRight: (settings) => ({
      preset: settings.enterKeyPreset,
      custom: settings.enterKeyCustom,
    }),
  })

const logCachedEnterKey = (cached: CachedEnterKey) =>
  Effect.log(
    cached.preset,
    cached.custom.enter,
    cached.custom.shiftEnter,
    cached.custom.ctrlEnter,
  ).pipe(Effect.withLogSpan("enter-key"), Effect.withLogSpan("content"))

// onChanged is registered before the load effect is scheduled. The keydown
// path reads the cell synchronously and must not wait on storage.
export const startEnterKeyPresetCache = (
  runEffect: (effect: Effect.Effect<void, never, Storage>) => void,
): (() => CachedEnterKey) => {
  let cell = fallbackEnterKey
  const publish = (next: CachedEnterKey): void => {
    if (sameEnterKey(cell, next)) {
      return
    }
    cell = next
    runEffect(logCachedEnterKey(next))
  }
  watchLocalKey(workspaceSettingsStorageKey, (value) => {
    publish(cachedFromStoredValue(value))
  })
  runEffect(
    loadWorkspaceSettings().pipe(
      Effect.tap((settings) =>
        Effect.sync(() => {
          publish({
            preset: settings.enterKeyPreset,
            custom: settings.enterKeyCustom,
          })
        }),
      ),
      Effect.asVoid,
    ),
  )
  return () => cell
}
