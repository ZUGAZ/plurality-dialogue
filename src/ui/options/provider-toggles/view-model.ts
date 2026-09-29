import { Effect } from "effect"
import { createSignal } from "solid-js"
import type { Storage } from "@domain/ports/storage"
import { builtInProviders } from "@domain/provider/built-in-providers"
import type { ProviderId } from "@domain/provider/provider-id"
import { listProviders, setProviderEnabled } from "@domain/provider/registry"
import type { RunEffect } from "@ui/common/viewmodel/bind-viewmodel"
import {
  loadSettingsErrorText,
  saveSettingsErrorText,
  toToggleRows,
  type ProviderToggleRow,
} from "./model"

export type ProviderTogglesViewModel = {
  readonly rows: () => readonly ProviderToggleRow[]
  readonly loadError: () => string | undefined
  readonly saveError: () => string | undefined
  readonly setEnabled: (
    id: ProviderId,
    enabled: boolean,
  ) => Effect.Effect<void, never, Storage>
}

export const createProviderTogglesViewModel = (
  runEffect: RunEffect<Storage>,
): ProviderTogglesViewModel => {
  const [rows, setRows] = createSignal<readonly ProviderToggleRow[]>(emptyRows)
  const [loadError, setLoadError] = createSignal<string | undefined>(undefined)
  const [saveError, setSaveError] = createSignal<string | undefined>(undefined)

  runEffect(
    listProviders().pipe(
      Effect.match({
        onFailure: () => {
          setLoadError(loadSettingsErrorText)
          setRows(emptyRows)
        },
        onSuccess: (providers) => {
          setLoadError(undefined)
          setRows(
            toToggleRows(
              builtInProviders,
              providers
                .filter((provider) => provider.enabled)
                .map((provider) => provider.id),
            ),
          )
        },
      }),
    ),
  )

  const setEnabled = (id: ProviderId, enabled: boolean) =>
    setProviderEnabled(id, enabled).pipe(
      Effect.tap((enabledIds) =>
        Effect.sync(() => {
          setRows(toToggleRows(builtInProviders, enabledIds))
          setSaveError(undefined)
        }),
      ),
      Effect.catchTag("LastProviderDisabled", () => Effect.void),
      Effect.catchTag("StorageWriteError", () =>
        Effect.sync(() => {
          setSaveError(saveSettingsErrorText)
        }),
      ),
      Effect.catchTag("ParseError", () =>
        Effect.sync(() => {
          setSaveError(saveSettingsErrorText)
        }),
      ),
    )

  return {
    rows,
    loadError,
    saveError,
    setEnabled,
  }
}

const emptyRows: readonly ProviderToggleRow[] = []
