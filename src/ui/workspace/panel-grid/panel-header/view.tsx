import { For } from "solid-js"
import "./view.css"

export type PanelHeaderOption = {
  readonly id: string
  readonly label: string
}

export const PanelHeaderView = (props: {
  panelIndex: number
  providerId: string | null
  options: readonly PanelHeaderOption[]
  onProviderChange: (rawId: string) => void
  onRefresh: () => void
  isRefreshEnabled: boolean
  onRemove: () => void
  canRemove: boolean
}) => (
  <header data-panel-header class="panel-header">
    <select
      aria-label={`Provider for panel ${props.panelIndex}`}
      disabled={props.options.length === 0}
      value={props.providerId ?? ""}
      onChange={(event) => props.onProviderChange(event.currentTarget.value)}
    >
      <For each={props.options}>
        {(option) => <option value={option.id}>{option.label}</option>}
      </For>
    </select>
    <button
      type="button"
      aria-label={`Refresh panel ${props.panelIndex}`}
      disabled={!props.isRefreshEnabled}
      onClick={() => props.onRefresh()}
    >
      Refresh
    </button>
    <button
      type="button"
      class="panel-header-remove"
      aria-label={`Remove panel ${props.panelIndex}`}
      disabled={!props.canRemove}
      onClick={() => props.onRemove()}
    >
      ×
    </button>
  </header>
)
