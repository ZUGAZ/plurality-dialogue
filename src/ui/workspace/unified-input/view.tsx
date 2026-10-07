import { Show } from "solid-js"
import { libraryButtonLabel } from "../prompt-library/model"
import {
  clearLabel,
  fillLabel,
  messagePlaceholder,
  promptLabel,
  retryLabel,
  sendAllLabel,
} from "./model"
import "./view.css"

export type UnifiedInputViewProps = {
  readonly draft: () => string
  readonly hasDraft: () => boolean
  readonly statusText: () => string
  readonly canRetry: () => boolean
  readonly setDraft: (text: string) => void
  readonly clear: () => void
  readonly fill: () => void
  readonly sendAll: () => void
  readonly retryFailed: () => void
  readonly registerTextarea: (el: HTMLTextAreaElement) => void
  readonly focusPrompt: () => void
  readonly onOpenLibrary: () => void
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
        ref={props.registerTextarea}
        autocomplete="off"
        placeholder={messagePlaceholder}
        value={props.draft()}
        onInput={(event) => props.setDraft(event.currentTarget.value)}
      />
      <div class="unified-input-actions">
        <button type="button" onClick={() => props.onOpenLibrary()}>
          {libraryButtonLabel}
        </button>
        <button
          type="button"
          disabled={!props.hasDraft()}
          onClick={props.clear}
        >
          {clearLabel}
        </button>
        <div class="unified-input-send-cluster">
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
    </div>
    <div class="unified-input-status" role="status" aria-live="polite">
      {props.statusText()}
      <Show when={props.canRetry()}>
        <button type="button" disabled={false} onClick={props.retryFailed}>
          {retryLabel}
        </button>
      </Show>
    </div>
  </footer>
)
