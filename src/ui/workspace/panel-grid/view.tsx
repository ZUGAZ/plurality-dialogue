import { Index } from "solid-js"
import type { LayoutId, PanelViewState, ProviderOption } from "./model"
import { PanelFrame } from "./panel-frame"
import "./panel-grid.css"

export const PanelGridView = (props: {
  panels: () => readonly PanelViewState[]
  options: () => readonly ProviderOption[]
  layoutId: () => LayoutId
  layoutColumns: () => number
  layoutRows: () => number
  onPanelLoad: (id: string) => void
  setPanelProvider: (panelId: string, rawId: string) => void
  refreshPanel: (panelId: string) => void
}) => (
  <div
    class="panel-grid"
    data-workspace="panel-grid"
    data-layout={props.layoutId()}
    style={{
      "--layout-columns": String(props.layoutColumns()),
      "--layout-rows": String(props.layoutRows()),
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
