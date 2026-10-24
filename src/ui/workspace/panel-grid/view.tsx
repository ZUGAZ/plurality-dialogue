import { For, Show, createMemo } from "solid-js"
import type { RolePickerOption } from "@ui/workspace/panel-role/model"
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
  roleOptions: () => readonly RolePickerOption[]
  roleDisabled: () => boolean
  roleIdAt: (slotIndex: number) => string
  onRoleValue: (slotIndex: number, rawId: string) => void
  onRoleAdd: (slotIndex: number) => void
  onRoleEdit: (slotIndex: number, roleId: string) => void
  onPanelLoad: (id: string) => void
  setPanelProvider: (panelId: string, rawId: string) => void
  refreshPanel: (panelId: string) => void
  openPanelInTab: (panelId: string) => void
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
                  roleValue={props.roleIdAt(index())}
                  roleOptions={props.roleOptions()}
                  roleDisabled={props.roleDisabled()}
                  onRoleValue={(rawId) =>
                    props.onRoleValue(index(), rawId)
                  }
                  onRoleAdd={() => props.onRoleAdd(index())}
                  onRoleEdit={() =>
                    props.onRoleEdit(index(), props.roleIdAt(index()))
                  }
                  canRemove={props.canRemovePanel()}
                  onLoad={props.onPanelLoad}
                  onProviderChange={(rawId) =>
                    props.setPanelProvider(id, rawId)
                  }
                  onRefresh={() => props.refreshPanel(id)}
                  onOpenInTab={() => props.openPanelInTab(id)}
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
