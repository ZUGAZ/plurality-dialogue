import { For } from "solid-js"
import {
  addLabel,
  addRoleLabel,
  editLabel,
  editRoleLabel,
  noRoleLabel,
  roleSelectLabel,
  type RolePickerOption,
} from "./model"

export const PanelRolePicker = (props: {
  panelNumber: number
  value: string
  options: readonly RolePickerOption[]
  disabled: boolean
  onValue: (rawId: string) => void
  onAdd: () => void
  onEdit: () => void
}) => (
  <>
    <select
      aria-label={roleSelectLabel(props.panelNumber)}
      disabled={props.disabled}
      value={props.value}
      onChange={(event) => props.onValue(event.currentTarget.value)}
    >
      <option value="">{noRoleLabel}</option>
      <For each={props.options}>
        {(option) => <option value={option.id}>{option.label}</option>}
      </For>
    </select>
    <button
      type="button"
      aria-label={
        props.value === ""
          ? addRoleLabel(props.panelNumber)
          : editRoleLabel(props.panelNumber)
      }
      disabled={props.disabled}
      onClick={() => (props.value === "" ? props.onAdd() : props.onEdit())}
    >
      {props.value === "" ? addLabel : editLabel}
    </button>
  </>
)
