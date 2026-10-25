import { Clock, Effect, Option } from "effect"
import { capturePanelReply } from "../broadcast/capture-panel-reply"
import { isPanelCaptureFailed } from "../broadcast/panel-capture-outcome"
import { isPanelFailed } from "../broadcast/panel-failed"
import type { PanelTarget } from "../broadcast/panel-target"
import { sendPanelFillAndSubmit } from "../broadcast/send-panel-fill-and-submit"
import type { Messaging } from "../ports/messaging"
import type { CastMember, TurnSpeaker } from "./cast-member"
import { isFormatFailure, parseDialogueReply } from "./reply"
import type { TranscriptEntry } from "./transcript-entry"
import { buildTurnDocument } from "./turn-document"
import type { TurnFailedReason } from "./turn-failed-reason"
import { TurnFailed, TurnSucceeded } from "./turn-outcome"

export type RunTurnInput = {
  readonly target: PanelTarget
  readonly speaker: TurnSpeaker
  readonly cast: ReadonlyArray<CastMember>
  readonly transcript: ReadonlyArray<TranscriptEntry>
}

// One vendor turn: paste the document, capture the reply, read `say`.
// The transcript store is the caller's; nothing is persisted here.
export const runTurn = Effect.fn("runTurn")(
  function* (input: RunTurnInput) {
    const paste = buildTurnDocument({
      speaker: input.speaker,
      cast: input.cast,
      transcript: input.transcript,
    })
    const sendFailure = yield* submitPaste(input.target, paste)
    if (Option.isSome(sendFailure)) {
      return yield* logFailure(sendFailure.value)
    }
    const captured = yield* capturePanelReply(input.target)
    if (isPanelCaptureFailed(captured)) {
      return yield* logFailure(failure(captured.reason))
    }
    const parsed = parseDialogueReply(captured.text)
    if (isFormatFailure(parsed)) {
      return yield* logFailure(TurnFailed.make({
        reason: "format-failure",
        raw: captured.text,
      }))
    }
    const at = yield* Clock.currentTimeMillis.pipe(
      Effect.map((millis) => new Date(millis).toISOString()),
    )
    return TurnSucceeded.make({
      entry: { speaker: input.speaker.name, text: parsed.say, at },
    })
  },
  Effect.withLogSpan("runTurn"),
)

const submitPaste = (
  target: PanelTarget,
  paste: string,
): Effect.Effect<Option.Option<TurnFailed>, never, Messaging> =>
  sendPanelFillAndSubmit(target, paste).pipe(
    Effect.map((result) =>
      isPanelFailed(result)
        ? Option.some(failure(result.reason))
        : Option.none(),
    ),
    Effect.catchTag("ComposerEmpty", () =>
      Effect.succeed(Option.some(failure("composer-empty"))),
    ),
  )

const failure = (reason: TurnFailedReason): TurnFailed =>
  TurnFailed.make({ reason })

const logFailure = (failed: TurnFailed) =>
  Effect.logWarning("turn failed", failed.reason).pipe(Effect.as(failed))
