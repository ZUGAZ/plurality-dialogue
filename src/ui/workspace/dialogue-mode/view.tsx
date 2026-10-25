import { Show } from "solid-js"
import type { ProviderOption } from "../panel-grid/model"
import type { RolePickerOption } from "../panel-role/model"
import { EngineStrip } from "./engine-strip/view"
import type { EngineStripItem } from "./engine-strip/model"
import { DialogueSetupForm } from "./setup-form"
import { TranscriptColumn } from "./transcript-column"
import type { DialoguePhase, DialogueSeatDraft, TranscriptRow } from "./model"
import "./view.css"

export type DialogueModeViewProps = {
  readonly phase: () => DialoguePhase
  readonly topic: () => string
  readonly seats: () => readonly DialogueSeatDraft[]
  readonly includeMe: () => boolean
  readonly canAddVendor: () => boolean
  readonly providerOptions: () => readonly ProviderOption[]
  readonly roleOptions: () => readonly RolePickerOption[]
  readonly roleDisabled: () => boolean
  readonly problems: () => readonly string[]
  readonly startDisabled: () => boolean
  readonly transcriptRows: () => readonly TranscriptRow[]
  readonly engineRows: () => readonly EngineStripItem[]
  readonly onTopic: (topic: string) => void
  readonly onAddVendor: () => void
  readonly onRemoveSeat: (castIndex: number) => void
  readonly onProvider: (castIndex: number, providerId: string) => void
  readonly onRole: (castIndex: number, roleId: string) => void
  readonly onName: (castIndex: number, name: string) => void
  readonly onIncludeMe: (include: boolean) => void
  readonly onStart: () => void
  readonly onEngineLoad: (panelId: string) => void
}

export const DialogueModeView = (props: DialogueModeViewProps) => (
  <div class="dialogue-mode" data-dialogue-phase={props.phase()}>
    <Show when={props.phase() === "setup"}>
      <DialogueSetupForm
        topic={props.topic}
        seats={props.seats}
        includeMe={props.includeMe}
        canAddVendor={props.canAddVendor}
        providerOptions={props.providerOptions}
        roleOptions={props.roleOptions}
        roleDisabled={props.roleDisabled}
        problems={props.problems}
        startDisabled={props.startDisabled}
        onTopic={props.onTopic}
        onAddVendor={props.onAddVendor}
        onRemoveSeat={props.onRemoveSeat}
        onProvider={props.onProvider}
        onRole={props.onRole}
        onName={props.onName}
        onIncludeMe={props.onIncludeMe}
        onStart={props.onStart}
      />
    </Show>
    <Show when={props.phase() === "running"}>
      <TranscriptColumn rows={props.transcriptRows} />
      <footer class="dialogue-footer" />
    </Show>
    <Show when={props.engineRows().length > 0}>
      <EngineStrip rows={props.engineRows} onLoad={props.onEngineLoad} />
    </Show>
  </div>
)
