import { render } from "solid-js/web"
import { WorkspaceContainer } from "@ui/workspace/container"
import { workspaceBindingsReady } from "./bind-workspace"
import "./workspace.css"

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
          setPanelProvider={workspaceBindings.setPanelProvider}
          refreshPanel={workspaceBindings.refreshPanel}
          unifiedInput={workspaceBindings.unifiedInput}
        />
      ),
      root,
    )
  })
}
