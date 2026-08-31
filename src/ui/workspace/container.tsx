import { WorkspaceView, type WorkspaceViewProps } from "./view"

export const WorkspaceContainer = (props: WorkspaceViewProps) => (
  <WorkspaceView panels={props.panels} onPanelLoad={props.onPanelLoad} />
)
