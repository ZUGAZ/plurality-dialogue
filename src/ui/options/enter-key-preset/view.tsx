import { For } from "solid-js"
import { EnterKeyCustomGroups } from "./custom-groups"
import {
  enterKeyPresetOptions,
  type EnterKeyChoiceOption,
  type EnterKeyCustom,
  type EnterKeyCustomSlot,
  type EnterKeyPresetRow,
} from "./model"
import "./view.css"

export type EnterKeyPresetViewProps = {
  readonly selectedPreset: () => EnterKeyPresetRow["id"]
  readonly custom: () => EnterKeyCustom
  readonly saveError: () => string | undefined
  readonly onPresetChange: (preset: EnterKeyPresetRow["id"]) => void
  readonly onCustomChoice: (
    slot: EnterKeyCustomSlot,
    choice: EnterKeyChoiceOption["id"],
  ) => void
}

export const EnterKeyPresetView = (props: EnterKeyPresetViewProps) => (
  <form
    class="enter-key-preset"
    onSubmit={(event) => {
      event.preventDefault()
    }}
  >
    <fieldset>
      <legend>Enter key</legend>
      <For each={enterKeyPresetOptions}>
        {(option) => (
          <label for={`enter-key-${option.id}`}>
            <input
              type="radio"
              id={`enter-key-${option.id}`}
              name="enter-key-preset"
              value={option.id}
              checked={props.selectedPreset() === option.id}
              onChange={() => props.onPresetChange(option.id)}
            />
            {option.label}
            {option.detail !== undefined && (
              <span class="enter-key-preset-detail">{option.detail}</span>
            )}
          </label>
        )}
      </For>
      <div hidden={props.selectedPreset() !== "custom"}>
        <EnterKeyCustomGroups
          custom={props.custom}
          onChoice={props.onCustomChoice}
        />
      </div>
    </fieldset>
    {props.saveError() !== undefined && (
      <p class="enter-key-preset-alert" role="alert">
        {props.saveError()}
      </p>
    )}
  </form>
)
