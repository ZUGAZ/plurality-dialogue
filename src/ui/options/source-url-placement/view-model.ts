import { Effect } from "effect"
import { createSignal } from "solid-js"
import type { Storage } from "@domain/ports/storage"
import type { SourceUrlPlacement } from "@domain/settings/source-url-placement"
import {
  loadWorkspaceSettings,
  persistWorkspaceSettings,
} from "@domain/settings/workspace-settings-storage"
import type { RunEffect } from "@ui/common/viewmodel/bind-viewmodel"
import { saveSourceUrlPlacementErrorText } from "./model"

export type SourceUrlPlacementViewModel = {
  readonly selectedPlacement: () => SourceUrlPlacement
  readonly saveError: () => string | undefined
  readonly setPlacement: (
    placement: SourceUrlPlacement,
  ) => Effect.Effect<void, never, Storage>
}

const rememberSaveFailure = (setSaveError: (message: string) => void) =>
  Effect.sync(() => {
    setSaveError(saveSourceUrlPlacementErrorText)
  })

export const createSourceUrlPlacementViewModel = (
  runEffect: RunEffect<Storage>,
): SourceUrlPlacementViewModel => {
  const [selectedPlacement, setSelectedPlacement] =
    createSignal<SourceUrlPlacement>("omit")
  const [saveError, setSaveError] = createSignal<string | undefined>(undefined)

  runEffect(
    Effect.log("load source url placement").pipe(
      Effect.zipRight(loadWorkspaceSettings()),
      Effect.tap((settings) =>
        Effect.sync(() => {
          setSelectedPlacement(settings.sourceUrlPlacement)
        }),
      ),
      Effect.withLogSpan("loadSourceUrlPlacement"),
    ),
  )

  const setPlacement = (placement: SourceUrlPlacement) =>
    Effect.log("set source url placement", placement).pipe(
      Effect.zipRight(loadWorkspaceSettings()),
      Effect.flatMap((settings) =>
        persistWorkspaceSettings({
          ...settings,
          sourceUrlPlacement: placement,
        }),
      ),
      Effect.tap(() =>
        Effect.sync(() => {
          setSelectedPlacement(placement)
          setSaveError(undefined)
        }),
      ),
      Effect.catchTag("StorageWriteError", () =>
        rememberSaveFailure(setSaveError),
      ),
      Effect.catchTag("ParseError", () => rememberSaveFailure(setSaveError)),
    )

  return {
    selectedPlacement,
    saveError,
    setPlacement,
  }
}
