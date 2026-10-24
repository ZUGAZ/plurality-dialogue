import { Either } from "effect"
import type { ProviderId } from "@domain/provider/provider-id"
import {
  themeToColorScheme,
  type ThemePreference,
} from "@domain/settings/theme-preference"
import {
  decodeWorkspaceSettings,
  workspaceSettingsStorageKey,
} from "@domain/settings/workspace-settings"
import { watchLocalKey } from "@infrastructure/chrome/storage"

export type OpenWorkspaceSettingsApply = {
  readonly theme: (theme: ThemePreference) => void
  readonly enabledProviderIds: (ids: readonly ProviderId[]) => void
}

export const applyWorkspaceColorScheme = (theme: ThemePreference): void => {
  const next = themeToColorScheme(theme)
  const root = document.documentElement
  if (root.style.colorScheme === next) {
    return
  }
  root.style.colorScheme = next
}

export const dispatchOpenWorkspaceSettings = (
  value: unknown,
  apply: OpenWorkspaceSettingsApply,
): void => {
  Either.match(decodeWorkspaceSettings(value), {
    onLeft: () => undefined,
    onRight: (settings) => {
      apply.theme(settings.theme)
      apply.enabledProviderIds(settings.enabledProviders)
    },
  })
}

// This page also writes the same key for layout, panels, roles, and the
// toolbar. Applying those again would reload iframes. Theme and the enabled
// list are what the options page can change under an open workspace.
export const subscribeOpenWorkspaceSettings = (
  apply: OpenWorkspaceSettingsApply,
): (() => void) =>
  watchLocalKey(workspaceSettingsStorageKey, (value) => {
    dispatchOpenWorkspaceSettings(value, apply)
  })
