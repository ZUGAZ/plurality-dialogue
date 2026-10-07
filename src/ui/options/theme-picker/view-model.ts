import { Effect } from "effect"
import { createSignal } from "solid-js"
import type { Storage } from "@domain/ports/storage"
import {
  themeToColorScheme,
  type ThemePreference,
} from "@domain/settings/theme-preference"
import {
  loadWorkspaceSettings,
  persistWorkspaceSettings,
} from "@domain/settings/workspace-settings-storage"
import type { RunEffect } from "@ui/common/viewmodel/bind-viewmodel"
import { saveThemeErrorText } from "./model"

export type ThemePickerViewModel = {
  readonly selectedTheme: () => ThemePreference
  readonly saveError: () => string | undefined
  readonly setTheme: (
    theme: ThemePreference,
  ) => Effect.Effect<void, never, Storage>
}

const applyTheme = (theme: ThemePreference): void => {
  document.documentElement.style.colorScheme = themeToColorScheme(theme)
}

const rememberSaveFailure = (setSaveError: (message: string) => void) =>
  Effect.sync(() => {
    setSaveError(saveThemeErrorText)
  })

export const createThemePickerViewModel = (
  runEffect: RunEffect<Storage>,
): ThemePickerViewModel => {
  const [selectedTheme, setSelectedTheme] =
    createSignal<ThemePreference>("system")
  const [saveError, setSaveError] = createSignal<string | undefined>(undefined)

  runEffect(
    Effect.log("load theme").pipe(
      Effect.zipRight(loadWorkspaceSettings()),
      Effect.tap((settings) =>
        Effect.sync(() => {
          setSelectedTheme(settings.theme)
          applyTheme(settings.theme)
        }),
      ),
      Effect.withLogSpan("loadTheme"),
    ),
  )

  const setTheme = (theme: ThemePreference) =>
    Effect.log("set theme", theme).pipe(
      Effect.zipRight(loadWorkspaceSettings()),
      Effect.flatMap((settings) =>
        persistWorkspaceSettings({
          ...settings,
          theme,
        }),
      ),
      Effect.tap(() =>
        Effect.sync(() => {
          setSelectedTheme(theme)
          setSaveError(undefined)
          applyTheme(theme)
        }),
      ),
      Effect.catchTag("StorageWriteError", () =>
        rememberSaveFailure(setSaveError),
      ),
      Effect.catchTag("ParseError", () => rememberSaveFailure(setSaveError)),
    )

  return {
    selectedTheme,
    saveError,
    setTheme,
  }
}
