import { Schema } from "effect"

export const ProviderId = Schema.Literal("chatgpt", "claude", "gemini")

export type ProviderId = typeof ProviderId.Type

export const LayoutPreset = Schema.Literal("1x1", "1x2", "1x3", "2x2")

export type LayoutPreset = typeof LayoutPreset.Type

export const WorkspaceSettings = Schema.Struct({
  enabledProviders: Schema.Array(ProviderId),
  layout: LayoutPreset,
})

export type WorkspaceSettings = typeof WorkspaceSettings.Type

export const isProviderId = Schema.is(ProviderId)

export const isLayoutPreset = Schema.is(LayoutPreset)

export const isWorkspaceSettings = Schema.is(WorkspaceSettings)

export const decodeWorkspaceSettings =
  Schema.decodeUnknownEither(WorkspaceSettings)

export const workspaceSettingsStorageKey = "workspace-settings"

export const defaultWorkspaceSettings: WorkspaceSettings = {
  enabledProviders: ["chatgpt", "claude", "gemini"],
  layout: "1x3",
}
