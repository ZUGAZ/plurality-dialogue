import {
  EnterKeyPresetView,
  type EnterKeyPresetViewProps,
} from "./enter-key-preset/view"
import {
  ProviderTogglesView,
  type ProviderTogglesViewProps,
} from "./provider-toggles/view"
import {
  SourceUrlPlacementView,
  type SourceUrlPlacementViewProps,
} from "./source-url-placement/view"
import { ThemePickerView, type ThemePickerViewProps } from "./theme-picker/view"

export type OptionsViewProps = {
  readonly providers: ProviderTogglesViewProps
  readonly theme: ThemePickerViewProps
  readonly sourceUrlPlacement: SourceUrlPlacementViewProps
  readonly enterKey: EnterKeyPresetViewProps
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
    <SourceUrlPlacementView
      selectedPlacement={props.sourceUrlPlacement.selectedPlacement}
      saveError={props.sourceUrlPlacement.saveError}
      onPlacementChange={props.sourceUrlPlacement.onPlacementChange}
    />
    <EnterKeyPresetView
      selectedPreset={props.enterKey.selectedPreset}
      custom={props.enterKey.custom}
      saveError={props.enterKey.saveError}
      onPresetChange={props.enterKey.onPresetChange}
      onCustomChoice={props.enterKey.onCustomChoice}
    />
  </>
)
