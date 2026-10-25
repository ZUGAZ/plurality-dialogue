import { Show } from "solid-js"
import { nextLabel, sendLabel, yourLineLabel } from "./model"

export const TurnControls = (props: {
  readonly cursorIsYou: () => boolean
  readonly busy: () => boolean
  readonly draft: () => string
  readonly onDraft: (text: string) => void
  readonly onNext: () => void
  readonly onSend: () => void
}) => (
  <Show
    when={props.cursorIsYou()}
    fallback={
      <div class="dialogue-turn">
        <button
          type="button"
          disabled={props.busy()}
          onClick={() => props.onNext()}
        >
          {nextLabel}
        </button>
      </div>
    }
  >
    <form
      class="dialogue-turn dialogue-composer"
      method="post"
      action="#dialogue"
      onSubmit={(event) => {
        event.preventDefault()
        props.onSend()
      }}
    >
      <label for="dialogue-line">{yourLineLabel}</label>
      <input
        id="dialogue-line"
        name="line"
        type="text"
        enterkeyhint="send"
        value={props.draft()}
        disabled={props.busy()}
        onInput={(event) => props.onDraft(event.currentTarget.value)}
      />
      <button type="submit" disabled={props.busy()}>
        {sendLabel}
      </button>
    </form>
  </Show>
)
