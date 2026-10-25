import { compareLabel, dialogueLabel, type WorkspaceMode } from "../dialogue-mode/model"

export const WorkspaceModeSwitch = (props: {
  mode: () => WorkspaceMode
  onMode: (mode: WorkspaceMode) => void
}) => (
  <div class="workspace-mode-switch" role="group" aria-label="Workspace mode">
    <button
      type="button"
      class="workspace-mode-switch-button"
      aria-pressed={props.mode() === "compare" ? "true" : "false"}
      onClick={() => props.onMode("compare")}
    >
      {compareLabel}
    </button>
    <button
      type="button"
      class="workspace-mode-switch-button"
      aria-pressed={props.mode() === "dialogue" ? "true" : "false"}
      onClick={() => props.onMode("dialogue")}
    >
      {dialogueLabel}
    </button>
  </div>
)
