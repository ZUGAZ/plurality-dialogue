import { Show, type JSX } from "solid-js"
import "./view.css"

export const WorkspaceShell = (props: {
  collapsed: () => boolean
  onToggleCollapse: () => void
  children: JSX.Element
}) => (
  <header
    class="workspace-shell"
    data-collapsed={props.collapsed() ? "true" : "false"}
  >
    <Show when={!props.collapsed()}>
      <h1>Plurality Dialogue</h1>
    </Show>
    <Show when={!props.collapsed()}>
      <div class="workspace-shell-actions">{props.children}</div>
    </Show>
    <button
      type="button"
      class="workspace-shell-toggle"
      aria-expanded={props.collapsed() ? "false" : "true"}
      aria-label={props.collapsed() ? "Show toolbar" : "Hide toolbar"}
      onClick={() => props.onToggleCollapse()}
    >
      {props.collapsed() ? "▼" : "▲"}
    </button>
  </header>
)
