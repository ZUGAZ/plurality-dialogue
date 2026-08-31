import { Effect } from "effect"
import type { LayoutId } from "@domain/layout/presets"
import {
  loadWorkspaceSettings,
  persistWorkspaceSettings,
} from "@domain/settings/workspace-settings-storage"

export const persistLayoutId = Effect.fn("persistLayoutId")(function* (
  id: LayoutId,
) {
  const settings = yield* loadWorkspaceSettings()
  yield* persistWorkspaceSettings({
    ...settings,
    layout: id,
  })
})
