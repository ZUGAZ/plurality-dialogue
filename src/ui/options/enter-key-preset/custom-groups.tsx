import { For } from "solid-js"
import {
  enterKeyChoiceOptions,
  enterKeyCustomGroups,
  type EnterKeyChoiceOption,
  type EnterKeyCustom,
  type EnterKeyCustomSlot,
} from "./model"

export type EnterKeyCustomGroupsProps = {
  readonly custom: () => EnterKeyCustom
  readonly onChoice: (
    slot: EnterKeyCustomSlot,
    choice: EnterKeyChoiceOption["id"],
  ) => void
}

export const EnterKeyCustomGroups = (props: EnterKeyCustomGroupsProps) => (
  <For each={enterKeyCustomGroups}>
    {(group) => (
      <fieldset>
        <legend>{group.legend}</legend>
        <For each={enterKeyChoiceOptions}>
          {(choice) => (
            <label for={`${group.name}-${choice.id}`}>
              <input
                type="radio"
                id={`${group.name}-${choice.id}`}
                name={group.name}
                value={choice.id}
                checked={props.custom()[group.slot] === choice.id}
                onChange={() => props.onChoice(group.slot, choice.id)}
              />
              {choice.label}
            </label>
          )}
        </For>
      </fieldset>
    )}
  </For>
)
