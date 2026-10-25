import {
  isVendorSeat,
  isYouSeat,
  youDisplayName,
  type CastSeat,
  type DialogueSetup,
} from "@domain/dialogue/dialogue-setup"
import type { DialogueTranscript } from "@domain/dialogue/dialogue-transcript"
import type { TurnFailedReason } from "@domain/dialogue/turn-failed-reason"

export const nextLabel = "Next"
export const sendLabel = "Send"
export const whoSpeaksLabel = "Who speaks"
export const yourLineLabel = "Your line"

const turnFailedLabels: Record<TurnFailedReason, string> = {
  "composer-not-found": "Composer not found",
  "composer-not-writable": "Composer is read-only",
  "submit-not-found": "Send button not found",
  "submit-disabled": "Send button is disabled",
  "image-attach-failed": "Image did not attach",
  timeout: "Timed out",
  "temporary-chat-unavailable": "Temporary chat is unavailable",
  "reply-not-found": "Reply not found",
  "reply-still-streaming": "Reply is still streaming",
  "empty-reply": "Empty reply",
  "capture-unsupported": "Capture is not supported",
  "frame-not-ready": "Panel is not ready",
  "messaging-failed": "Message failed",
  "format-failure": "Reply was not JSON",
  "composer-empty": "Nothing to send",
}

export const turnFailedLabel = (reason: TurnFailedReason): string =>
  turnFailedLabels[reason]

export type FailedBubble = {
  readonly castIndex: number
  readonly reason: TurnFailedReason
  readonly raw?: string
  readonly at: string
}

export const failedBubble = (input: {
  readonly castIndex: number
  readonly reason: TurnFailedReason
  readonly raw: string | undefined
  readonly at: string
}): FailedBubble => {
  if (input.raw === undefined) {
    return {
      castIndex: input.castIndex,
      reason: input.reason,
      at: input.at,
    }
  }
  return {
    castIndex: input.castIndex,
    reason: input.reason,
    raw: input.raw,
    at: input.at,
  }
}

export type DisplayedEntry<Entry> =
  | { readonly source: "persisted"; readonly entry: Entry }
  | { readonly source: "failed"; readonly failure: FailedBubble }

export const displayEntries = <Entry>(
  persisted: readonly Entry[],
  failures: readonly FailedBubble[],
): readonly DisplayedEntry<Entry>[] => [
  ...persisted.map(
    (entry): DisplayedEntry<Entry> => ({
      source: "persisted",
      entry,
    }),
  ),
  ...failures.map(
    (failure): DisplayedEntry<Entry> => ({
      source: "failed",
      failure,
    }),
  ),
]

export const withoutSeatFailure = (
  failures: readonly FailedBubble[],
  castIndex: number,
): readonly FailedBubble[] =>
  failures.filter((failure) => failure.castIndex !== castIndex)

export const withSeatFailure = (
  failures: readonly FailedBubble[],
  failure: FailedBubble,
): readonly FailedBubble[] => [
  ...withoutSeatFailure(failures, failure.castIndex),
  failure,
]

export const composerPrefill = (
  setup: DialogueSetup,
  transcript: DialogueTranscript,
): string => {
  if (!setup.cast.some(isYouSeat) || transcript.entries.length > 0) {
    return ""
  }
  return setup.topic
}

export type CastChip = {
  readonly index: number
  readonly label: string
}

export const castSpeaker = (
  cast: readonly CastSeat[],
  castIndex: number,
): string => {
  const seat = cast[castIndex]
  if (seat === undefined) {
    return ""
  }
  if (isVendorSeat(seat)) {
    return seat.name
  }
  return youDisplayName
}

export const castChips = (cast: readonly CastSeat[]): readonly CastChip[] =>
  cast.map((_, index) => ({
    index,
    label: castSpeaker(cast, index),
  }))

export const cursorIsYou = (
  cast: readonly CastSeat[],
  cursor: number,
): boolean => {
  const seat = cast[cursor]
  return seat !== undefined && isYouSeat(seat)
}

export type DialogueFloorProps = {
  readonly chips: () => readonly CastChip[]
  readonly cursor: () => number
  readonly busy: () => boolean
  readonly cursorIsYou: () => boolean
  readonly draft: () => string
  readonly failures: () => readonly FailedBubble[]
  readonly speakerAt: (castIndex: number) => string
  readonly onPin: (index: number) => void
  readonly onDraft: (text: string) => void
  readonly onNext: () => void
  readonly onSend: () => void
}

export const dialogueFloorProps = (floor: {
  readonly floorState: () => { readonly cursor: number; readonly busy: boolean }
  readonly composerDraft: () => string
  readonly setComposerDraft: (text: string) => void
  readonly failures: () => readonly FailedBubble[]
  readonly chips: () => readonly CastChip[]
  readonly cursorIsYou: () => boolean
  readonly speakerAt: (castIndex: number) => string
  readonly pin: (index: number) => void
  readonly next: () => void
  readonly sendUserLine: (text: string) => void
}): DialogueFloorProps => ({
  chips: floor.chips,
  cursor: () => floor.floorState().cursor,
  busy: () => floor.floorState().busy,
  cursorIsYou: floor.cursorIsYou,
  draft: floor.composerDraft,
  failures: floor.failures,
  speakerAt: floor.speakerAt,
  onPin: floor.pin,
  onDraft: floor.setComposerDraft,
  onNext: floor.next,
  onSend: () => {
    floor.sendUserLine(floor.composerDraft())
  },
})
