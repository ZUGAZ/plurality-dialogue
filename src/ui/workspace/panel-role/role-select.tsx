import { Index } from "solid-js"
import type { RolePickerOption } from "./model"

export const RoleSelect = (props: {
  id: string
  ariaLabel: string
  value: string
  options: readonly RolePickerOption[]
  disabled: boolean
  onValue: (rawId: string) => void
}) => (
  <select
    id={props.id}
    name={props.id}
    aria-label={props.ariaLabel}
    disabled={props.disabled}
    value={props.value}
    onChange={(event) => props.onValue(event.currentTarget.value)}
  >
    <Index each={props.options}>
      {(option) => <option value={option().id}>{option().label}</option>}
    </Index>
  </select>
)
