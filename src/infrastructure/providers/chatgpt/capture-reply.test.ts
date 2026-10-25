// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { Effect, Either, Fiber, TestClock } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { ReplyNotFound, ReplyStillStreaming } from "../../../domain/ports/provider-page"
import {
  replyCaptureTimeoutMs,
  replyStableMs,
} from "../wait-for-stable-reply"
import { makeChatgptProviderPage } from "./fill-send"
import {
  primaryAssistantReplySelector,
  primaryStreamingIndicatorSelector,
} from "./selectors"

const finishedPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../test/fixtures/chatgpt/reply-2026-10-24.html",
)

const streamingPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../test/fixtures/chatgpt/reply-streaming-2026-10-24.html",
)

const paperclips = Array.from({ length: 25 }, () => "paperclip").join(" ")

describe("chatgpt capture reply", () => {
  it("primary assistant selector hits the finished fixture", () => {
    loadFixture(finishedPath)
    expect(document.querySelector(primaryAssistantReplySelector)).not.toBeNull()
  })

  it("primary assistant selector hits the streaming fixture", () => {
    loadFixture(streamingPath)
    expect(document.querySelector(primaryAssistantReplySelector)).not.toBeNull()
  })

  it("primary streaming selector hits the streaming fixture", () => {
    loadFixture(streamingPath)
    expect(document.querySelector(primaryStreamingIndicatorSelector)).not.toBeNull()
  })

  it("primary streaming selector misses the finished fixture", () => {
    loadFixture(finishedPath)
    expect(document.querySelector(primaryStreamingIndicatorSelector)).toBeNull()
  })

  it.effect("captureReply returns the fixture's last assistant text", () =>
    Effect.gen(function* () {
      loadFixture(finishedPath)
      const result = yield* capture()
      expect(Either.isRight(result)).toBe(true)
      if (Either.isRight(result)) {
        expect(result.right.text).toBe(paperclips)
      }
    }),
  )

  it.effect("a page with no assistant message is ReplyNotFound", () =>
    Effect.gen(function* () {
      document.body.replaceChildren()
      const fiber = yield* Effect.fork(
        makeChatgptProviderPage(document).captureReply().pipe(Effect.either),
      )
      yield* TestClock.adjust(`${replyCaptureTimeoutMs} millis`)
      const result = yield* Fiber.join(fiber)
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(ReplyNotFound)
      }
    }),
    30_000,
  )

  it.effect("a mid-stream fixture that never changes is ReplyStillStreaming", () =>
    Effect.gen(function* () {
      loadFixture(streamingPath)
      const fiber = yield* Effect.fork(
        makeChatgptProviderPage(document).captureReply().pipe(Effect.either),
      )
      yield* TestClock.adjust(`${replyCaptureTimeoutMs} millis`)
      const result = yield* Fiber.join(fiber)
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(ReplyStillStreaming)
      }
    }),
    30_000,
  )
})

const capture = () =>
  Effect.gen(function* () {
    const fiber = yield* Effect.fork(
      makeChatgptProviderPage(document).captureReply().pipe(Effect.either),
    )
    yield* TestClock.adjust(`${replyStableMs} millis`)
    return yield* Fiber.join(fiber)
  })

const loadFixture = (path: string): void => {
  const html = readFileSync(path, "utf8")
  const parsed = new DOMParser().parseFromString(html, "text/html")
  document.documentElement.innerHTML = parsed.documentElement.innerHTML
}
