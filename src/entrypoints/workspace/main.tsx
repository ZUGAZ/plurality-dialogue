import { render } from "solid-js/web"
import { WorkspaceView } from "@ui/workspace/view"

const root = document.getElementById("root")
if (root !== null) {
  render(() => <WorkspaceView />, root)
}
