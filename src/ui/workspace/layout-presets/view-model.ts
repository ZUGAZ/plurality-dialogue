import { Effect } from "effect"
import type { LayoutId } from "@domain/layout/presets"
import type { ProviderId } from "@domain/provider/provider-id"
import {
  loadWorkspaceSettings,
  persistWorkspaceSettings,
} from "@domain/settings/workspace-settings-storage"

export const persistLayoutAndPanelProviders = Effect.fn(
  "persistLayoutAndPanelProviders",
)(function* (
  layout: LayoutId,
  panelProviders: readonly (ProviderId | null)[],
) {
  const settings = yield* loadWorkspaceSettings()
  yield* persistWorkspaceSettings({
    ...settings,
    layout,
    panelProviders,
  })
})
