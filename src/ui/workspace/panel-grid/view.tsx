import { Index } from "solid-js"
import type { PanelViewState, ProviderOption } from "./model"
import { PanelFrame } from "./panel-frame"
import "./panel-grid.css"

export const PanelGridView = (props: {
  panels: () => readonly PanelViewState[]
  options: () => readonly ProviderOption[]
  onPanelLoad: (id: string) => void
  setPanelProvider: (panelId: string, rawId: string) => void
  refreshPanel: (panelId: string) => void
}) => (
  <div
    class="panel-grid"
    data-workspace="panel-grid"
    style={{
      "grid-template-columns": `repeat(${props.panels().length}, minmax(0, 1fr))`,
    }}
  >
    <Index each={props.panels()}>
      {(panel, index) => (
        <PanelFrame
          panel={panel()}
          panelIndex={index + 1}
          options={props.options()}
          onLoad={props.onPanelLoad}
          onProviderChange={(rawId) =>
            props.setPanelProvider(panel().id, rawId)
          }
          onRefresh={() => props.refreshPanel(panel().id)}
        />
      )}
    </Index>
  </div>
)
