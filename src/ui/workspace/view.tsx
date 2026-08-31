import type { PanelViewState, ProviderOption } from "./panel-grid/model"
import { PanelGridView } from "./panel-grid/view"
import { WorkspaceShell } from "./shell/view"
import "./view.css"

export type WorkspaceViewProps = {
  readonly panels: () => readonly PanelViewState[]
  readonly options: () => readonly ProviderOption[]
  readonly onPanelLoad: (id: string) => void
  readonly setPanelProvider: (panelId: string, rawId: string) => void
  readonly refreshPanel: (panelId: string) => void
}

export const WorkspaceView = (props: WorkspaceViewProps) => (
  <div class="workspace">
    <WorkspaceShell />
    <PanelGridView
      panels={props.panels}
      options={props.options}
      onPanelLoad={props.onPanelLoad}
      setPanelProvider={props.setPanelProvider}
      refreshPanel={props.refreshPanel}
    />
  </div>
)
