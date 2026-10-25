import { For, Show } from "solid-js"
import type { ProviderOption } from "../panel-grid/model"
import type { RolePickerOption } from "../panel-role/model"
import { DialogueSetupSeat } from "./setup-seat"
import {
  addVendorLabel,
  includeMeLabel,
  startLabel,
  topicLabel,
  type DialogueSeatDraft,
} from "./model"

export const DialogueSetupForm = (props: {
  topic: () => string
  seats: () => readonly DialogueSeatDraft[]
  includeMe: () => boolean
  canAddVendor: () => boolean
  providerOptions: () => readonly ProviderOption[]
  roleOptions: () => readonly RolePickerOption[]
  roleDisabled: () => boolean
  problems: () => readonly string[]
  startDisabled: () => boolean
  onTopic: (topic: string) => void
  onAddVendor: () => void
  onRemoveSeat: (castIndex: number) => void
  onProvider: (castIndex: number, providerId: string) => void
  onRole: (castIndex: number, roleId: string) => void
  onName: (castIndex: number, name: string) => void
  onIncludeMe: (include: boolean) => void
  onStart: () => void
}) => (
  <form
    class="dialogue-setup"
    onSubmit={(event) => {
      event.preventDefault()
      props.onStart()
    }}
  >
    <div class="dialogue-field">
      <label for="dialogue-topic">{topicLabel}</label>
      <input
        id="dialogue-topic"
        name="topic"
        type="text"
        value={props.topic()}
        onInput={(event) => props.onTopic(event.currentTarget.value)}
      />
    </div>
    <For each={props.seats()}>
      {(seat) => (
        <DialogueSetupSeat
          seat={seat}
          providerOptions={props.providerOptions()}
          roleOptions={props.roleOptions()}
          roleDisabled={props.roleDisabled()}
          onProvider={(providerId) => props.onProvider(seat.castIndex, providerId)}
          onRole={(roleId) => props.onRole(seat.castIndex, roleId)}
          onName={(name) => props.onName(seat.castIndex, name)}
          onRemove={() => props.onRemoveSeat(seat.castIndex)}
        />
      )}
    </For>
    <button
      type="button"
      disabled={!props.canAddVendor()}
      onClick={() => props.onAddVendor()}
    >
      {addVendorLabel}
    </button>
    <div class="dialogue-include">
      <input
        id="dialogue-include-me"
        name="include-me"
        type="checkbox"
        checked={props.includeMe()}
        onChange={(event) => props.onIncludeMe(event.currentTarget.checked)}
      />
      <label for="dialogue-include-me">{includeMeLabel}</label>
    </div>
    <Show when={props.problems().length > 0}>
      <ul class="dialogue-problems" aria-live="polite">
        <For each={props.problems()}>{(line) => <li>{line}</li>}</For>
      </ul>
    </Show>
    <button type="submit" disabled={props.startDisabled()}>
      {startLabel}
    </button>
  </form>
)
