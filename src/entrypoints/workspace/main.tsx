import { render } from "solid-js/web"
import { WorkspaceContainer } from "@ui/workspace/container"
import { workspaceBindings } from "./bind-workspace"
import "./workspace.css"

const root = document.getElementById("root")
if (root !== null) {
  render(
    () => (
      <WorkspaceContainer
        panels={workspaceBindings.panels}
        onPanelLoad={workspaceBindings.onPanelLoad}
      />
    ),
    root,
  )
}
