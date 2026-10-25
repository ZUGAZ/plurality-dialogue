import type { DialogueModeViewProps } from "./view"

export const dialogueViewProps = (
  dialogueMode: {
    readonly phase: DialogueModeViewProps["phase"]
    readonly setup: () => { readonly topic: string }
    readonly seatDrafts: DialogueModeViewProps["seats"]
    readonly includeMe: DialogueModeViewProps["includeMe"]
    readonly canAddVendor: DialogueModeViewProps["canAddVendor"]
    readonly problemLines: DialogueModeViewProps["problems"]
    readonly startDisabled: DialogueModeViewProps["startDisabled"]
    readonly transcriptRows: DialogueModeViewProps["transcriptRows"]
    readonly engineRows: DialogueModeViewProps["engineRows"]
    readonly setTopic: DialogueModeViewProps["onTopic"]
    readonly addVendorSeat: DialogueModeViewProps["onAddVendor"]
    readonly removeVendorSeat: DialogueModeViewProps["onRemoveSeat"]
    readonly setSeatProvider: DialogueModeViewProps["onProvider"]
    readonly setSeatRole: DialogueModeViewProps["onRole"]
    readonly setSeatName: DialogueModeViewProps["onName"]
    readonly setIncludeMe: DialogueModeViewProps["onIncludeMe"]
    readonly start: DialogueModeViewProps["onStart"]
    readonly onEngineLoad: DialogueModeViewProps["onEngineLoad"]
  },
  lists: {
    readonly providerOptions: DialogueModeViewProps["providerOptions"]
    readonly roleOptions: DialogueModeViewProps["roleOptions"]
    readonly roleDisabled: DialogueModeViewProps["roleDisabled"]
  },
): Omit<DialogueModeViewProps, "floor"> => ({
  phase: dialogueMode.phase,
  topic: () => dialogueMode.setup().topic,
  seats: dialogueMode.seatDrafts,
  includeMe: dialogueMode.includeMe,
  canAddVendor: dialogueMode.canAddVendor,
  providerOptions: lists.providerOptions,
  roleOptions: lists.roleOptions,
  roleDisabled: lists.roleDisabled,
  problems: dialogueMode.problemLines,
  startDisabled: dialogueMode.startDisabled,
  transcriptRows: dialogueMode.transcriptRows,
  engineRows: dialogueMode.engineRows,
  onTopic: dialogueMode.setTopic,
  onAddVendor: dialogueMode.addVendorSeat,
  onRemoveSeat: dialogueMode.removeVendorSeat,
  onProvider: dialogueMode.setSeatProvider,
  onRole: dialogueMode.setSeatRole,
  onName: dialogueMode.setSeatName,
  onIncludeMe: dialogueMode.setIncludeMe,
  onStart: dialogueMode.start,
  onEngineLoad: dialogueMode.onEngineLoad,
})
