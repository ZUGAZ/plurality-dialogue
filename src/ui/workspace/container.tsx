import { WorkspaceView, type WorkspaceViewProps } from "./view"

export const WorkspaceContainer = (props: WorkspaceViewProps) => (
  <WorkspaceView
    panels={props.panels}
    options={props.options}
    layoutId={props.layoutId}
    layoutColumns={props.layoutColumns}
    layoutRows={props.layoutRows}
    onPanelLoad={props.onPanelLoad}
    onSelectLayout={props.onSelectLayout}
    setPanelProvider={props.setPanelProvider}
    refreshPanel={props.refreshPanel}
  />
)
