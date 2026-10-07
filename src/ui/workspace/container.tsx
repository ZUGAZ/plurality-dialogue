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
    addPanel={props.addPanel}
    removePanel={props.removePanel}
    canAddPanel={props.canAddPanel}
    canRemovePanel={props.canRemovePanel}
    setPanelProvider={props.setPanelProvider}
    refreshPanel={props.refreshPanel}
    onNewChat={props.onNewChat}
    collapsed={props.collapsed}
    onToggleCollapse={props.onToggleCollapse}
    unifiedInput={props.unifiedInput}
    promptLibrary={props.promptLibrary}
  />
)
