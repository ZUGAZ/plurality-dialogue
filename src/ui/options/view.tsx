import {
  ProviderTogglesView,
  type ProviderTogglesViewProps,
} from "./provider-toggles/view"
import { ThemePickerView, type ThemePickerViewProps } from "./theme-picker/view"

export type OptionsViewProps = {
  readonly providers: ProviderTogglesViewProps
  readonly theme: ThemePickerViewProps
}

export const OptionsView = (props: OptionsViewProps) => (
  <>
    <h1>Options</h1>
    <ProviderTogglesView
      rows={props.providers.rows}
      loadError={props.providers.loadError}
      saveError={props.providers.saveError}
      onEnabledChange={props.providers.onEnabledChange}
    />
    <ThemePickerView
      selectedTheme={props.theme.selectedTheme}
      saveError={props.theme.saveError}
      onThemeChange={props.theme.onThemeChange}
    />
  </>
)
