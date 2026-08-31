import { WorkspaceView, type WorkspaceViewProps } from "./view"

export const WorkspaceContainer = (props: WorkspaceViewProps) => (
  <WorkspaceView
    panels={props.panels}
    options={props.options}
    onPanelLoad={props.onPanelLoad}
    setPanelProvider={props.setPanelProvider}
    refreshPanel={props.refreshPanel}
  />
)
