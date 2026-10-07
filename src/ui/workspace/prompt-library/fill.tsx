import { For } from "solid-js"
import {
  cancelLabel,
  insertLabel,
  type FillValues,
} from "./model"

export type PromptFillProps = {
  readonly title: () => string
  readonly names: () => readonly string[]
  readonly values: () => FillValues
  readonly onValue: (name: string, value: string) => void
  readonly onInsert: () => void
  readonly onCancel: () => void
}

const fieldId = (name: string): string => `prompt-library-fill-${name}`

export const PromptFill = (props: PromptFillProps) => (
  <form
    class="prompt-library-editor"
    onSubmit={(event) => {
      event.preventDefault()
      props.onInsert()
    }}
  >
    <h3>{props.title()}</h3>
    <For each={props.names()}>
      {(name) => (
        <label for={fieldId(name)}>
          {name}
          <input
            id={fieldId(name)}
            type="text"
            value={props.values()[name] ?? ""}
            onInput={(event) => props.onValue(name, event.currentTarget.value)}
          />
        </label>
      )}
    </For>
    <div class="prompt-library-editor-actions">
      <button type="submit" class="prompt-library-primary">
        {insertLabel}
      </button>
      <button type="button" onClick={() => props.onCancel()}>
        {cancelLabel}
      </button>
    </div>
  </form>
)
