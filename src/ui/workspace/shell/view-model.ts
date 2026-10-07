import { Effect } from "effect"
import { createSignal } from "solid-js"
import type { Storage } from "@domain/ports/storage"
import {
  loadWorkspaceSettings,
  persistWorkspaceSettings,
} from "@domain/settings/workspace-settings-storage"

export const persistToolbarCollapsed = Effect.fn("persistToolbarCollapsed")(
  function* (toolbarCollapsed: boolean) {
    const settings = yield* loadWorkspaceSettings()
    yield* persistWorkspaceSettings({
      ...settings,
      toolbarCollapsed,
    })
  },
)

export type ShellViewModel = {
  readonly collapsed: () => boolean
  readonly toggleCollapse: () => Effect.Effect<void, never, Storage>
}

export const createShellViewModel = (
  initialCollapsed: boolean,
): ShellViewModel => {
  const [collapsed, setCollapsed] = createSignal(initialCollapsed)

  const toggleCollapse = (): Effect.Effect<void, never, Storage> => {
    const next = !collapsed()
    setCollapsed(next)
    return persistToolbarCollapsed(next).pipe(
      Effect.catchTag("StorageWriteError", () => Effect.void),
      Effect.catchTag("ParseError", () => Effect.void),
    )
  }

  return {
    collapsed,
    toggleCollapse,
  }
}
