import { Show } from "solid-js"
import { turnFailedLabel, type FailedBubble as FailedBubbleModel } from "./model"

export const FailedBubble = (props: {
  readonly failure: FailedBubbleModel
  readonly speaker: string
  readonly atLabel: string
}) => (
  <div class="dialogue-failed" role="status">
    <p class="dialogue-entry-meta">
      <Show when={props.speaker.length > 0}>
        <span class="dialogue-speaker">{props.speaker}</span>
      </Show>
      <span>{turnFailedLabel(props.failure.reason)}</span>
      <time dateTime={props.failure.at}>{props.atLabel}</time>
    </p>
    <Show when={props.failure.raw}>
      {(raw) => <pre class="dialogue-failed-raw">{raw()}</pre>}
    </Show>
  </div>
)
