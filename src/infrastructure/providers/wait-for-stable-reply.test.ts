import { Effect, Either, Fiber, Option, TestClock } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  EmptyReply,
  ReplyNotFound,
  ReplyStillStreaming,
} from "../../domain/ports/provider-page"
import {
  replyCaptureTimeoutMs,
  replyStableMs,
  waitForStableReply,
  type StableReplyQueries,
} from "./wait-for-stable-reply"

describe("waitForStableReply", () => {
  it.effect("returns text after streaming stops and the reply settles", () =>
    Effect.gen(function* () {
      let streaming = true
      let text: string | null = "partial"
      const fiber = yield* fork(queries(() => text, () => streaming))
      yield* TestClock.adjust("200 millis")
      streaming = false
      text = "finished reply"
      yield* TestClock.adjust(`${replyStableMs + 100} millis`)
      const result = yield* Fiber.join(fiber)
      expect(rightText(result)).toBe("finished reply")
    }),
  )

  it.effect("does not cut a reply that stays streaming longer than stableMs", () =>
    Effect.gen(function* () {
      let streaming = true
      let text: string | null = "partial"
      const fiber = yield* fork(queries(() => text, () => streaming))
      yield* TestClock.adjust(`${replyStableMs + 400} millis`)
      expect(Option.isNone(yield* Fiber.poll(fiber))).toBe(true)
      streaming = false
      text = "full answer"
      yield* TestClock.adjust(`${replyStableMs + 100} millis`)
      const result = yield* Fiber.join(fiber)
      expect(rightText(result)).toBe("full answer")
    }),
  )

  it.effect("fails ReplyStillStreaming when the indicator never clears", () =>
    Effect.gen(function* () {
      const result = yield* run(queries(() => "partial", () => true))
      expect(result.left).toBeInstanceOf(ReplyStillStreaming)
    }),
  )

  it.effect("fails ReplyNotFound when no reply text appears", () =>
    Effect.gen(function* () {
      const result = yield* run(queries(() => null, () => false))
      expect(result.left).toBeInstanceOf(ReplyNotFound)
    }),
  )

  it.effect("fails EmptyReply when the settled text is blank", () =>
    Effect.gen(function* () {
      const fiber = yield* fork(queries(() => "  \n  ", () => false))
      yield* TestClock.adjust(`${replyStableMs} millis`)
      const result = yield* Fiber.join(fiber)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(EmptyReply)
      } else {
        expect(Either.isLeft(result)).toBe(true)
      }
    }),
  )
})

const queries = (
  queryReplyText: () => string | null,
  queryIsStreaming: () => boolean,
): StableReplyQueries => ({ queryReplyText, queryIsStreaming })

const fork = (stableQueries: StableReplyQueries) =>
  Effect.fork(
    waitForStableReply(
      stableQueries,
      replyCaptureTimeoutMs,
      replyStableMs,
    ).pipe(Effect.either),
  )

const probeTimeoutMs = 200

const run = (stableQueries: StableReplyQueries) =>
  Effect.gen(function* () {
    const fiber = yield* Effect.fork(
      waitForStableReply(stableQueries, probeTimeoutMs, replyStableMs).pipe(
        Effect.either,
      ),
    )
    yield* TestClock.adjust(`${probeTimeoutMs} millis`)
    const result = yield* Fiber.join(fiber)
    if (Either.isRight(result)) {
      return { left: undefined }
    }
    return { left: result.left }
  })

const rightText = (
  result: Either.Either<
    string,
    ReplyNotFound | ReplyStillStreaming | EmptyReply
  >,
): string => (Either.isRight(result) ? result.right : "")
