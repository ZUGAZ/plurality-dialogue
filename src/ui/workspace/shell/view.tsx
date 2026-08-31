import type { JSX } from "solid-js"
import "./view.css"

export const WorkspaceShell = (props: { children: JSX.Element }) => (
  <header class="workspace-shell">
    <h1>Plurality Dialogue</h1>
    {props.children}
  </header>
)
