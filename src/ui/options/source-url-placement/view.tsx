import { For } from "solid-js"
import {
  sourceUrlPlacementHelpText,
  sourceUrlPlacementOptions,
  type SourceUrlPlacementOption,
} from "./model"
import "./view.css"

export type SourceUrlPlacementViewProps = {
  readonly selectedPlacement: () => SourceUrlPlacementOption["id"]
  readonly saveError: () => string | undefined
  readonly onPlacementChange: (placement: SourceUrlPlacementOption["id"]) => void
}

const helpId = "source-url-placement-help"

export const SourceUrlPlacementView = (props: SourceUrlPlacementViewProps) => (
  <form
    class="source-url-placement"
    onSubmit={(event) => {
      event.preventDefault()
    }}
  >
    <fieldset aria-describedby={helpId}>
      <legend>Source URL</legend>
      <p id={helpId} class="source-url-placement-help">
        {sourceUrlPlacementHelpText}
      </p>
      <For each={sourceUrlPlacementOptions}>
        {(option) => (
          <label for={`source-url-placement-${option.id}`}>
            <input
              type="radio"
              id={`source-url-placement-${option.id}`}
              name="source-url-placement"
              value={option.id}
              checked={props.selectedPlacement() === option.id}
              onChange={() => props.onPlacementChange(option.id)}
            />
            {option.label}
          </label>
        )}
      </For>
    </fieldset>
    {props.saveError() !== undefined && (
      <p class="source-url-placement-alert" role="alert">
        {props.saveError()}
      </p>
    )}
  </form>
)
