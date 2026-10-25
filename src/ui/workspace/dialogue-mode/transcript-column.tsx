import { For, Show } from "solid-js"
import { FailedBubble } from "../dialogue-floor/failed-bubble"
import {
  displayEntries,
  type FailedBubble as FailedBubbleModel,
} from "../dialogue-floor/model"
import { transcriptAtLabel, type TranscriptRow } from "./model"

export const TranscriptColumn = (props: {
  readonly rows: () => readonly TranscriptRow[]
  readonly failures: () => readonly FailedBubbleModel[]
  readonly speakerAt: (castIndex: number) => string
}) => (
  <ol class="dialogue-transcript">
    <For each={displayEntries(props.rows(), props.failures())}>
      {(item) =>
        item.source === "persisted" ? (
          <li class="dialogue-entry">
            <p class="dialogue-entry-meta">
              <span class="dialogue-speaker">{item.entry.speaker}</span>
              <Show when={item.entry.roleLabel.length > 0}>
                <span class="dialogue-role">{item.entry.roleLabel}</span>
              </Show>
              <time dateTime={item.entry.at}>
                {transcriptAtLabel(item.entry.at)}
              </time>
            </p>
            <p class="dialogue-entry-text">{item.entry.text}</p>
          </li>
        ) : (
          <li class="dialogue-entry">
            <FailedBubble
              failure={item.failure}
              speaker={props.speakerAt(item.failure.castIndex)}
              atLabel={transcriptAtLabel(item.failure.at)}
            />
          </li>
        )
      }
    </For>
  </ol>
)
