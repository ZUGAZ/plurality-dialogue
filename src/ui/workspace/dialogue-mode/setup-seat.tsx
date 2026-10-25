import { For } from "solid-js"
import { RoleSelect } from "../panel-role/role-select"
import type { ProviderOption } from "../panel-grid/model"
import type { RolePickerOption } from "../panel-role/model"
import {
  providerChoices,
  removeVendorLabel,
  roleChoices,
  seatLegend,
  vendorNameLabel,
  vendorProviderLabel,
  vendorRoleLabel,
  type DialogueSeatDraft,
} from "./model"

export const DialogueSetupSeat = (props: {
  seat: DialogueSeatDraft
  providerOptions: readonly ProviderOption[]
  roleOptions: readonly RolePickerOption[]
  roleDisabled: boolean
  onProvider: (providerId: string) => void
  onRole: (roleId: string) => void
  onName: (name: string) => void
  onRemove: () => void
}) => {
  const seatNumber = () => props.seat.seatNumber
  const providerDomId = () => `dialogue-seat-${props.seat.castIndex}-provider`
  const roleDomId = () => `dialogue-seat-${props.seat.castIndex}-role`
  const nameDomId = () => `dialogue-seat-${props.seat.castIndex}-name`
  return (
    <fieldset class="dialogue-seat">
      <legend>{seatLegend(seatNumber())}</legend>
      <div class="dialogue-field">
        <label for={providerDomId()}>{vendorProviderLabel(seatNumber())}</label>
        <select
          id={providerDomId()}
          name={providerDomId()}
          value={props.seat.providerId}
          onChange={(event) => props.onProvider(event.currentTarget.value)}
        >
          <For
            each={providerChoices(props.providerOptions, props.seat.providerId)}
          >
            {(option) => <option value={option.id}>{option.label}</option>}
          </For>
        </select>
      </div>
      <div class="dialogue-field">
        <label for={roleDomId()}>{vendorRoleLabel(seatNumber())}</label>
        <RoleSelect
          id={roleDomId()}
          ariaLabel={vendorRoleLabel(seatNumber())}
          value={props.seat.roleId}
          options={roleChoices(props.roleOptions, props.seat.roleId)}
          disabled={props.roleDisabled}
          onValue={props.onRole}
        />
      </div>
      <div class="dialogue-field">
        <label for={nameDomId()}>{vendorNameLabel(seatNumber())}</label>
        <input
          id={nameDomId()}
          name={nameDomId()}
          type="text"
          value={props.seat.name}
          onInput={(event) => props.onName(event.currentTarget.value)}
        />
      </div>
      <button type="button" onClick={() => props.onRemove()}>
        {removeVendorLabel(props.seat.name)}
      </button>
    </fieldset>
  )
}
