import { Effect, Either, Fiber, Option, TestClock } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  EmptyReply,
  ReplyNotFound,
  ReplyStillStreaming,
} from "../../domain/ports/provider-page"
import { makeCapturingLogger } from "../../test-support/capturing-logger"
import { silentLoggerLayer } from "../../test-support/silent-logger"
import {
  replyCaptureTimeoutMs,
  replyProgressIntervalMs,
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

  it.effect("logs each wait and the timeout when no reply appears", () =>
    Effect.gen(function* () {
      const logs = makeCapturingLogger()
      const fiber = yield* Effect.fork(
        waitForStableReply(
          queries(() => null, () => false),
          replyProgressIntervalMs,
          replyStableMs,
        ).pipe(Effect.either, Effect.provide(logs.layer)),
      )
      yield* TestClock.adjust(`${replyProgressIntervalMs} millis`)
      const result = yield* Fiber.join(fiber)
      expect(Either.isLeft(result)).toBe(true)
      const lines = logs.messages().map(logText)
      expect(
        lines.some((line) => line.startsWith("waiting for assistant reply")),
      ).toBe(true)
      expect(
        lines.some((line) => line.includes("still waiting for assistant reply")),
      ).toBe(true)
      expect(lines.some((line) => line.includes("text=none"))).toBe(true)
      expect(
        lines.some((line) => line.includes("assistant reply timed out")),
      ).toBe(true)
    }),
  )

  it.effect("keeps waiting while the assistant node is still blank", () =>
    Effect.gen(function* () {
      let text: string | null = "  \n  "
      const fiber = yield* fork(queries(() => text, () => false))
      yield* TestClock.adjust(`${replyStableMs + 200} millis`)
      expect(Option.isNone(yield* Fiber.poll(fiber))).toBe(true)
      text = "the reply"
      yield* TestClock.adjust(`${replyStableMs + 100} millis`)
      const result = yield* Fiber.join(fiber)
      expect(rightText(result)).toBe("the reply")
    }),
  )

  it.effect("fails EmptyReply when the node stays blank until timeout", () =>
    Effect.gen(function* () {
      const result = yield* run(queries(() => "  \n  ", () => false))
      expect(result.left).toBeInstanceOf(EmptyReply)
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
    ).pipe(Effect.either, Effect.provide(silentLoggerLayer)),
  )

const probeTimeoutMs = 200

const run = (stableQueries: StableReplyQueries) =>
  Effect.gen(function* () {
    const fiber = yield* Effect.fork(
      waitForStableReply(stableQueries, probeTimeoutMs, replyStableMs).pipe(
        Effect.either,
        Effect.provide(silentLoggerLayer),
      ),
    )
    yield* TestClock.adjust(`${probeTimeoutMs} millis`)
    const result = yield* Fiber.join(fiber)
    if (Either.isRight(result)) {
      return { left: undefined }
    }
    return { left: result.left }
  })

const logText = (message: unknown): string =>
  Array.isArray(message) ? message.map(String).join(" ") : String(message)

const rightText = (
  result: Either.Either<
    string,
    ReplyNotFound | ReplyStillStreaming | EmptyReply
  >,
): string => (Either.isRight(result) ? result.right : "")
