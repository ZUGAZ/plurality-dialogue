import { Schema } from "effect"

export const ThemePreference = Schema.Literal("light", "dark", "system")

export type ThemePreference = typeof ThemePreference.Type

export const isThemePreference = Schema.is(ThemePreference)

const colorSchemeByTheme: {
  readonly [Theme in ThemePreference]: string
} = {
  system: "light dark",
  light: "light",
  dark: "dark",
}

export const themeToColorScheme = (theme: ThemePreference): string =>
  colorSchemeByTheme[theme]
