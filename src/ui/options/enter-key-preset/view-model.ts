import { Effect } from "effect"
import { createSignal } from "solid-js"
import type { Storage } from "@domain/ports/storage"
import {
  defaultEnterKeyCustom,
  type EnterKeyChoice,
  type EnterKeyCustom,
} from "@domain/settings/enter-key-custom"
import type { EnterKeyPreset } from "@domain/settings/enter-key-preset"
import {
  loadWorkspaceSettings,
  persistWorkspaceSettings,
} from "@domain/settings/workspace-settings-storage"
import type { RunEffect } from "@ui/common/viewmodel/bind-viewmodel"
import {
  saveEnterKeyPresetErrorText,
  withCustomChoice,
  type EnterKeyCustomSlot,
} from "./model"

export type EnterKeyPresetViewModel = {
  readonly selectedPreset: () => EnterKeyPreset
  readonly custom: () => EnterKeyCustom
  readonly saveError: () => string | undefined
  readonly setPreset: (
    preset: EnterKeyPreset,
  ) => Effect.Effect<void, never, Storage>
  readonly setCustomChoice: (
    slot: EnterKeyCustomSlot,
    choice: EnterKeyChoice,
  ) => Effect.Effect<void, never, Storage>
}

const rememberSaveFailure = (setSaveError: (message: string) => void) =>
  Effect.sync(() => {
    setSaveError(saveEnterKeyPresetErrorText)
  })

export const createEnterKeyPresetViewModel = (
  runEffect: RunEffect<Storage>,
): EnterKeyPresetViewModel => {
  const [selectedPreset, setSelectedPreset] =
    createSignal<EnterKeyPreset>("default")
  const [custom, setCustom] = createSignal<EnterKeyCustom>(
    defaultEnterKeyCustom,
  )
  const [saveError, setSaveError] = createSignal<string | undefined>(undefined)

  runEffect(
    Effect.log("load enter key preset").pipe(
      Effect.zipRight(loadWorkspaceSettings()),
      Effect.tap((settings) =>
        Effect.sync(() => {
          setSelectedPreset(settings.enterKeyPreset)
          setCustom(settings.enterKeyCustom)
        }),
      ),
      Effect.withLogSpan("loadEnterKeyPreset"),
    ),
  )

  const setPreset = (preset: EnterKeyPreset) =>
    Effect.log("set enter key preset", preset).pipe(
      Effect.zipRight(loadWorkspaceSettings()),
      Effect.flatMap((settings) =>
        persistWorkspaceSettings({
          ...settings,
          enterKeyPreset: preset,
          enterKeyCustom: settings.enterKeyCustom,
        }).pipe(Effect.as(settings.enterKeyCustom)),
      ),
      Effect.tap((storedCustom) =>
        Effect.sync(() => {
          setSelectedPreset(preset)
          setCustom(storedCustom)
          setSaveError(undefined)
        }),
      ),
      Effect.catchTag("StorageWriteError", () =>
        rememberSaveFailure(setSaveError),
      ),
      Effect.catchTag("ParseError", () => rememberSaveFailure(setSaveError)),
    )

  const setCustomChoice = (slot: EnterKeyCustomSlot, choice: EnterKeyChoice) =>
    Effect.log("set enter key choice", slot, choice).pipe(
      Effect.zipRight(loadWorkspaceSettings()),
      Effect.flatMap((settings) => {
        const nextCustom = withCustomChoice(
          settings.enterKeyCustom,
          slot,
          choice,
        )
        return persistWorkspaceSettings({
          ...settings,
          enterKeyCustom: nextCustom,
        }).pipe(Effect.as(nextCustom))
      }),
      Effect.tap((nextCustom) =>
        Effect.sync(() => {
          setCustom(nextCustom)
          setSaveError(undefined)
        }),
      ),
      Effect.catchTag("StorageWriteError", () =>
        rememberSaveFailure(setSaveError),
      ),
      Effect.catchTag("ParseError", () => rememberSaveFailure(setSaveError)),
    )

  return {
    selectedPreset,
    custom,
    saveError,
    setPreset,
    setCustomChoice,
  }
}
