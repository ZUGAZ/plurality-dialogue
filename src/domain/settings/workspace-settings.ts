import { Either, Schema } from "effect"
import { LayoutId, maxCellCount } from "@domain/layout/presets"
import { ProviderId } from "@domain/provider/provider-id"
import { SourceUrlPlacement } from "./source-url-placement"
import { ThemePreference } from "./theme-preference"

const defaultThemePreference: "system" = "system"

const defaultSourceUrlPlacement: SourceUrlPlacement = "omit"

const decodeSourceUrlPlacement = (input: unknown): SourceUrlPlacement =>
  Either.getOrElse(Schema.decodeUnknownEither(SourceUrlPlacement)(input), () =>
    defaultSourceUrlPlacement,
  )

// Invalid values stay inside this field. They must not fail the document.
const lenientSourceUrlPlacement = Schema.transform(
  Schema.Unknown,
  SourceUrlPlacement,
  {
    strict: true,
    decode: (input) => decodeSourceUrlPlacement(input),
    encode: (placement) => placement,
  },
)

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
  theme: Schema.optionalWith(ThemePreference, {
    default: () => defaultThemePreference,
  }),
  sourceUrlPlacement: Schema.optionalWith(lenientSourceUrlPlacement, {
    default: () => defaultSourceUrlPlacement,
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
  theme: defaultThemePreference,
  sourceUrlPlacement: defaultSourceUrlPlacement,
}
