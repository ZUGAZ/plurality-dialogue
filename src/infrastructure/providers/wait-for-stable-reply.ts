import { Clock, Effect } from "effect"
import {
  EmptyReply,
  ReplyNotFound,
  ReplyStillStreaming,
} from "../../domain/ports/provider-page"

export const replyCaptureTimeoutMs = 120_000

export const replyStableMs = 1_500

export const replyProgressIntervalMs = 5_000

export const pollInterval = "50 millis"

export type StableReplyQueries = {
  readonly queryReplyText: () => string | null
  readonly queryIsStreaming: () => boolean
}

export const waitForStableReply = (
  queries: StableReplyQueries,
  timeoutMs: number,
  stableMs: number,
): Effect.Effect<string, ReplyNotFound | ReplyStillStreaming | EmptyReply> =>
  Effect.gen(function* () {
    const startedAt = yield* Clock.currentTimeMillis
    let previousText: string | null = null
    let stableSince: number | null = null
    let sawText = false
    let sawBlank = false
    let loggedBlank = false
    let lastReportAt = startedAt
    yield* Effect.log("waiting for assistant reply")

    while (true) {
      const now = yield* Clock.currentTimeMillis
      const streaming = queries.queryIsStreaming()
      const text = queries.queryReplyText()
      const reply = readableReply(text)
      if (now - lastReportAt >= replyProgressIntervalMs) {
        yield* reportWait(now - startedAt, streaming, text)
        lastReportAt = now
      }
      if (text !== null && reply === null) {
        sawBlank = true
        if (!loggedBlank) {
          yield* Effect.log("assistant node is blank, still waiting")
          loggedBlank = true
        }
      }
      if (reply !== null) {
        sawText = true
      }
      if (streaming || reply === null) {
        previousText = reply
        stableSince = null
      } else if (reply !== previousText || stableSince === null) {
        previousText = reply
        stableSince = now
      } else if (now - stableSince >= stableMs) {
        return yield* settledReply(reply)
      }
      if (now - startedAt >= timeoutMs) {
        return yield* timedOut(queries, sawText, sawBlank, text)
      }
      yield* Effect.sleep(pollInterval)
    }
  })

const reportWait = (elapsedMs: number, streaming: boolean, text: string | null) =>
  Effect.log(
    "still waiting for assistant reply",
    `elapsed=${elapsedMs}`,
    `streaming=${streaming}`,
    replyPreview(text),
  )

const readableReply = (text: string | null): string | null => {
  if (text === null) {
    return null
  }
  const trimmed = text.trim()
  return trimmed.length === 0 ? null : trimmed
}

const settledReply = (text: string) =>
  Effect.log("assistant reply settled", `length=${text.length}`).pipe(
    Effect.as(text),
  )

const timedOut = (
  queries: StableReplyQueries,
  sawText: boolean,
  sawBlank: boolean,
  text: string | null,
) => {
  const streaming = queries.queryIsStreaming()
  const failure: Effect.Effect<
    never,
    ReplyNotFound | ReplyStillStreaming | EmptyReply
  > =
    streaming || sawText
      ? Effect.fail(
          new ReplyStillStreaming({
            reason: "assistant reply did not stabilize",
          }),
        )
      : sawBlank
        ? Effect.fail(new EmptyReply({ reason: "assistant reply is empty" }))
        : Effect.fail(
            new ReplyNotFound({ reason: "assistant reply not found" }),
          )
  return Effect.logWarning(
    "assistant reply timed out",
    `streaming=${streaming}`,
    `sawText=${sawText}`,
    `blank=${sawBlank}`,
    replyPreview(text),
  ).pipe(Effect.zipRight(failure))
}

const replyPreview = (text: string | null): string => {
  if (text === null) {
    return "text=none"
  }
  const trimmed = text.trim()
  return `text=${trimmed.length}:${trimmed.slice(0, 60)}`
}
