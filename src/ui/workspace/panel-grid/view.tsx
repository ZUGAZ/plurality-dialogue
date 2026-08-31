import { For } from "solid-js"
import type { PanelViewState } from "./model"
import { PanelFrame } from "./panel-frame"
import "./panel-grid.css"

export const PanelGridView = (props: {
  panels: () => readonly PanelViewState[]
  onPanelLoad: (id: string) => void
}) => (
  <div
    class="panel-grid"
    data-workspace="panel-grid"
    style={{
      "grid-template-columns": `repeat(${props.panels().length}, minmax(0, 1fr))`,
    }}
  >
    <For each={props.panels()}>
      {(panel) => <PanelFrame panel={panel} onLoad={props.onPanelLoad} />}
    </For>
  </div>
)
