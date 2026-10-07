import { render } from "solid-js/web"
import { WorkspaceContainer } from "@ui/workspace/container"
import { workspaceBindingsReady } from "./bind-workspace"
import "./workspace.css"

let releaseFocusGuard: (() => void) | undefined

const root = document.getElementById("root")
if (root !== null) {
  void workspaceBindingsReady.then((workspaceBindings) => {
    render(
      () => (
        <WorkspaceContainer
          panels={workspaceBindings.panels}
          options={workspaceBindings.options}
          layoutId={workspaceBindings.layoutId}
          layoutColumns={workspaceBindings.layoutColumns}
          layoutRows={workspaceBindings.layoutRows}
          onPanelLoad={workspaceBindings.onPanelLoad}
          onSelectLayout={workspaceBindings.selectLayout}
          addPanel={workspaceBindings.addPanel}
          removePanel={workspaceBindings.removePanel}
          canAddPanel={workspaceBindings.canAddPanel}
          canRemovePanel={workspaceBindings.canRemovePanel}
          setPanelProvider={workspaceBindings.setPanelProvider}
          refreshPanel={workspaceBindings.refreshPanel}
          onNewChat={workspaceBindings.newChatForAll}
          collapsed={workspaceBindings.collapsed}
          onToggleCollapse={workspaceBindings.onToggleCollapse}
          unifiedInput={workspaceBindings.unifiedInput}
        />
      ),
      root,
    )
    // The panel grid exists only after render. Attaching earlier misses
    // pointer events and treats every iframe focus as a steal.
    releaseFocusGuard?.()
    releaseFocusGuard = workspaceBindings.mountFocusGuard()
  })
}
