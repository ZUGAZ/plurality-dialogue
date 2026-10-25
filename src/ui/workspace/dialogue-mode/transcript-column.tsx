import { For, Show } from "solid-js"
import { transcriptAtLabel, type TranscriptRow } from "./model"

export const TranscriptColumn = (props: {
  rows: () => readonly TranscriptRow[]
}) => (
  <ol class="dialogue-transcript">
    <For each={props.rows()}>
      {(row) => (
        <li class="dialogue-entry">
          <p class="dialogue-entry-meta">
            <span class="dialogue-speaker">{row.speaker}</span>
            <Show when={row.roleLabel.length > 0}>
              <span class="dialogue-role">{row.roleLabel}</span>
            </Show>
            <time dateTime={row.at}>{transcriptAtLabel(row.at)}</time>
          </p>
          <p class="dialogue-entry-text">{row.text}</p>
        </li>
      )}
    </For>
  </ol>
)
