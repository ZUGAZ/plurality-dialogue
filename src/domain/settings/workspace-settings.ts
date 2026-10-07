import { Schema } from "effect"
import { LayoutId, maxCellCount } from "@domain/layout/presets"
import { ProviderId } from "@domain/provider/provider-id"

export const WorkspaceSettings = Schema.Struct({
  enabledProviders: Schema.Array(ProviderId),
  layout: LayoutId,
  panelProviders: Schema.optional(
    Schema.Array(Schema.NullOr(ProviderId)).pipe(
      Schema.minItems(1),
      Schema.maxItems(maxCellCount),
    ),
  ),
  toolbarCollapsed: Schema.optionalWith(Schema.Boolean, {
    default: () => false,
  }),
})

export type WorkspaceSettings = typeof WorkspaceSettings.Type

export const isWorkspaceSettings = Schema.is(WorkspaceSettings)

export const decodeWorkspaceSettings =
  Schema.decodeUnknownEither(WorkspaceSettings)

export const workspaceSettingsStorageKey = "workspace-settings"

export const defaultWorkspaceSettings: WorkspaceSettings = {
  enabledProviders: ["chatgpt", "claude", "gemini"],
  layout: "1x3",
  toolbarCollapsed: false,
}
