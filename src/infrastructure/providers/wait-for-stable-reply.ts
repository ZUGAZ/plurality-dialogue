import { Clock, Effect } from "effect"
import {
  EmptyReply,
  ReplyNotFound,
  ReplyStillStreaming,
} from "../../domain/ports/provider-page"

export const replyCaptureTimeoutMs = 120_000

export const replyStableMs = 1_500

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

    while (true) {
      const now = yield* Clock.currentTimeMillis
      const streaming = queries.queryIsStreaming()
      const text = queries.queryReplyText()
      if (text !== null) {
        sawText = true
      }
      if (streaming || text === null) {
        previousText = text
        stableSince = null
      } else if (text !== previousText || stableSince === null) {
        previousText = text
        stableSince = now
      } else if (now - stableSince >= stableMs) {
        return yield* settledReply(text)
      }
      if (now - startedAt >= timeoutMs) {
        return yield* timedOut(queries, sawText)
      }
      yield* Effect.sleep(pollInterval)
    }
  })

const settledReply = (text: string) => {
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return Effect.fail(
      new EmptyReply({ reason: "assistant reply is empty" }),
    )
  }
  return Effect.succeed(trimmed)
}

const timedOut = (queries: StableReplyQueries, sawText: boolean) => {
  if (queries.queryIsStreaming() || sawText) {
    return Effect.fail(
      new ReplyStillStreaming({
        reason: "assistant reply did not stabilize",
      }),
    )
  }
  return Effect.fail(
    new ReplyNotFound({ reason: "assistant reply not found" }),
  )
}
