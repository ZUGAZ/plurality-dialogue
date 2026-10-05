import { For, Show, createMemo } from "solid-js"
import type { LayoutId, PanelViewState, ProviderOption } from "./model"
import { PanelFrame } from "./panel-frame"
import "./panel-grid.css"

export const PanelGridView = (props: {
  panels: () => readonly PanelViewState[]
  options: () => readonly ProviderOption[]
  layoutId: () => LayoutId
  layoutColumns: () => number
  layoutRows: () => number
  canRemovePanel: () => boolean
  onPanelLoad: (id: string) => void
  setPanelProvider: (panelId: string, rawId: string) => void
  refreshPanel: (panelId: string) => void
  removePanel: (panelId: string) => void
}) => {
  // Keyed by panel id so removing one panel never remounts its neighbours.
  const panelIds = createMemo(() => props.panels().map((panel) => panel.id))
  return (
    <div
      class="panel-grid"
      data-workspace="panel-grid"
      data-layout={props.layoutId()}
      style={{
        "--layout-columns": String(props.layoutColumns()),
        "--layout-rows": String(props.layoutRows()),
      }}
    >
      <For each={panelIds()}>
        {(id, index) => {
          const panel = createMemo(() =>
            props.panels().find((candidate) => candidate.id === id),
          )
          return (
            <Show when={panel()}>
              {(current) => (
                <PanelFrame
                  panel={current()}
                  panelIndex={index() + 1}
                  options={props.options()}
                  canRemove={props.canRemovePanel()}
                  onLoad={props.onPanelLoad}
                  onProviderChange={(rawId) =>
                    props.setPanelProvider(id, rawId)
                  }
                  onRefresh={() => props.refreshPanel(id)}
                  onRemove={() => props.removePanel(id)}
                />
              )}
            </Show>
          )
        }}
      </For>
    </div>
  )
}
