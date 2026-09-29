import {
  ProviderTogglesView,
  type ProviderTogglesViewProps,
} from "./provider-toggles/view"

export const OptionsView = (props: ProviderTogglesViewProps) => (
  <>
    <h1>Options</h1>
    <ProviderTogglesView
      rows={props.rows}
      loadError={props.loadError}
      saveError={props.saveError}
      onEnabledChange={props.onEnabledChange}
    />
  </>
)
