import type { ThemePreference } from "@domain/settings/theme-preference"

export type ThemeOption = {
  readonly id: ThemePreference
  readonly label: string
}

export const themeOptions: readonly ThemeOption[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
]

export const saveThemeErrorText = "Could not save."
