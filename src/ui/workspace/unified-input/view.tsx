import {
  clearLabel,
  fillLabel,
  messagePlaceholder,
  promptLabel,
  sendAllLabel,
} from "./model"
import "./view.css"

export type UnifiedInputViewProps = {
  readonly draft: () => string
  readonly hasDraft: () => boolean
  readonly statusText: () => string
  readonly setDraft: (text: string) => void
  readonly clear: () => void
  readonly fill: () => void
  readonly sendAll: () => void
}

export const UnifiedInputView = (props: UnifiedInputViewProps) => (
  <footer class="unified-input" aria-label={promptLabel}>
    <div class="unified-input-row">
      <label class="visually-hidden" for="unified-input-prompt">
        {promptLabel}
      </label>
      <textarea
        id="unified-input-prompt"
        name="prompt"
        autocomplete="off"
        placeholder={messagePlaceholder}
        value={props.draft()}
        onInput={(event) => props.setDraft(event.currentTarget.value)}
      />
      <div class="unified-input-actions">
        <button
          type="button"
          disabled={!props.hasDraft()}
          onClick={props.clear}
        >
          {clearLabel}
        </button>
        <button type="button" disabled={!props.hasDraft()} onClick={props.fill}>
          {fillLabel}
        </button>
        <button
          type="button"
          class="unified-input-send"
          disabled={!props.hasDraft()}
          onClick={props.sendAll}
        >
          {sendAllLabel}
        </button>
      </div>
    </div>
    <p class="unified-input-status" role="status" aria-live="polite">
      {props.statusText()}
    </p>
  </footer>
)
