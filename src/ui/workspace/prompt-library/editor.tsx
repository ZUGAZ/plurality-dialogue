import { Show } from "solid-js"
import {
  bodyLabel,
  cancelLabel,
  deleteLabel,
  editPromptLabel,
  newPromptLabel,
  saveLabel,
  tagsLabel,
  titleLabel,
  titleRequiredText,
  type PromptEditorDraft,
} from "./model"

export type PromptEditorProps = {
  readonly draft: () => PromptEditorDraft
  readonly actionError: () => string | undefined
  readonly onTitle: (title: string) => void
  readonly onBody: (body: string) => void
  readonly onTags: (tags: string) => void
  readonly onSave: () => void
  readonly onCancel: () => void
  readonly onDelete: () => void
}

export const PromptEditor = (props: PromptEditorProps) => (
  <form
    class="prompt-library-editor"
    onSubmit={(event) => {
      event.preventDefault()
      props.onSave()
    }}
  >
    <h3>
      {props.draft().promptId === undefined ? newPromptLabel : editPromptLabel}
    </h3>
    <label for="prompt-library-title">
      {titleLabel}
      <input
        id="prompt-library-title"
        type="text"
        value={props.draft().title}
        aria-invalid={props.actionError() === titleRequiredText}
        onInput={(event) => props.onTitle(event.currentTarget.value)}
      />
    </label>
    <label for="prompt-library-body">
      {bodyLabel}
      <textarea
        id="prompt-library-body"
        value={props.draft().body}
        onInput={(event) => props.onBody(event.currentTarget.value)}
      />
    </label>
    <label for="prompt-library-tags">
      {tagsLabel}
      <input
        id="prompt-library-tags"
        type="text"
        value={props.draft().tags}
        onInput={(event) => props.onTags(event.currentTarget.value)}
      />
    </label>
    <div class="prompt-library-editor-actions">
      <button type="submit" class="prompt-library-primary">
        {saveLabel}
      </button>
      <button type="button" onClick={() => props.onCancel()}>
        {cancelLabel}
      </button>
      <Show when={props.draft().promptId !== undefined}>
        <button type="button" onClick={() => props.onDelete()}>
          {deleteLabel}
        </button>
      </Show>
    </div>
  </form>
)
