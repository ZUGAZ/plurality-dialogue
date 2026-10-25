import { For, Show } from "solid-js"
import { whoSpeaksLabel, type CastChip } from "./model"

export const CastChips = (props: {
  readonly chips: () => readonly CastChip[]
  readonly cursor: () => number
  readonly busy: () => boolean
  readonly onPin: (index: number) => void
}) => (
  <fieldset class="dialogue-cast">
    <legend>{whoSpeaksLabel}</legend>
    <For each={props.chips()}>
      {(chip) => (
        <button
          type="button"
          class="dialogue-chip"
          aria-current={props.cursor() === chip.index ? "true" : undefined}
          aria-busy={
            props.busy() && props.cursor() === chip.index ? "true" : undefined
          }
          disabled={props.busy()}
          onClick={() => props.onPin(chip.index)}
        >
          {chip.label}
          <Show when={props.busy() && props.cursor() === chip.index}>
            <span class="dialogue-chip-busy" aria-hidden="true">
              {" "}
              …
            </span>
          </Show>
        </button>
      )}
    </For>
  </fieldset>
)
