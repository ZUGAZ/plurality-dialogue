import { Effect } from "effect"
import { createSignal } from "solid-js"
import type { Storage } from "@domain/ports/storage"
import { builtInProviders } from "@domain/provider/built-in-providers"
import type { ProviderId } from "@domain/provider/provider-id"
import { commitProviderEnabled } from "@domain/provider/commit-provider-enabled"
import type { OptionalHostAccess } from "@domain/provider/optional-host-access"
import { listProviders } from "@domain/provider/registry"
import type { RunEffect } from "@ui/common/viewmodel/bind-viewmodel"
import {
  loadSettingsErrorText,
  permissionDeniedText,
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
  access: OptionalHostAccess,
): ProviderTogglesViewModel => {
  const [rows, setRows] = createSignal<readonly ProviderToggleRow[]>(emptyRows)
  const [loadError, setLoadError] = createSignal<string | undefined>(undefined)
  const [saveError, setSaveError] = createSignal<string | undefined>(undefined)

  runEffect(
    Effect.log("load providers").pipe(
      Effect.zipRight(listProviders()),
      Effect.withLogSpan("loadProviders"),
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

  const rowsFromCurrent = (): readonly ProviderToggleRow[] =>
    toToggleRows(
      builtInProviders,
      rows()
        .filter((row) => row.isEnabled)
        .map((row) => row.id),
    )

  const setEnabled = (id: ProviderId, enabled: boolean) =>
    Effect.log("set enabled", id, enabled).pipe(
      Effect.zipRight(commitProviderEnabled(id, enabled, access)),
      Effect.tap((enabledIds) =>
        Effect.sync(() => {
          setRows(toToggleRows(builtInProviders, enabledIds))
          setSaveError(undefined)
        }),
      ),
      Effect.catchTag("OptionalHostPermissionDenied", () =>
        Effect.sync(() => {
          setRows(rowsFromCurrent())
          setSaveError(permissionDeniedText)
        }),
      ),
      Effect.catchTag("OptionalHostPermissionRequestFailed", () =>
        Effect.sync(() => {
          setRows(rowsFromCurrent())
          setSaveError(saveSettingsErrorText)
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
