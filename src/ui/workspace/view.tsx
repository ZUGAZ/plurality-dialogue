import type { PanelViewState } from "./panel-grid/model"
import { PanelGridView } from "./panel-grid/view"

export type WorkspaceViewProps = {
  readonly panels: () => readonly PanelViewState[]
  readonly onPanelLoad: (id: string) => void
}

export const WorkspaceView = (props: WorkspaceViewProps) => (
  <>
    <h1 class="workspace-title">Plurality Dialogue</h1>
    <PanelGridView panels={props.panels} onPanelLoad={props.onPanelLoad} />
  </>
)
