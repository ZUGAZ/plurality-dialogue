// @vitest-environment happy-dom
import { Effect, Either, Fiber, TestClock } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { TemporaryChatUnavailable } from "../../../domain/ports/provider-page"
import { composerWaitMs } from "../wait-for-element"
import { openGeminiTemporaryChat } from "./open-temporary-chat"

const markup =
  '<button type="button" aria-label="Temporary chat">Temporary chat</button><button type="button" aria-label="Send">Send</button>'

describe("gemini temporary chat", () => {
  it.effect("clicks the temporary chat button once per command", () =>
    Effect.gen(function* () {
      document.body.innerHTML = markup
      const counts = trackClicks()
      yield* openGeminiTemporaryChat()
      expect(counts.temporary).toBe(1)
      expect(counts.send).toBe(0)
      yield* openGeminiTemporaryChat()
      expect(counts.temporary).toBe(2)
      expect(counts.send).toBe(0)
    }),
  )

  it.effect("a missing button fails TemporaryChatUnavailable", () =>
    Effect.gen(function* () {
      document.body.replaceChildren()
      const fiber = yield* Effect.fork(
        openGeminiTemporaryChat().pipe(Effect.either),
      )
      yield* TestClock.adjust(`${composerWaitMs} millis`)
      const result = yield* Fiber.join(fiber)
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(TemporaryChatUnavailable)
      }
    }),
  )
})

const trackClicks = (): { temporary: number; send: number } => {
  const counts = { temporary: 0, send: 0 }
  document
    .querySelector('button[aria-label="Temporary chat"]')
    ?.addEventListener("click", () => {
      counts.temporary += 1
    })
  document.querySelector('button[aria-label="Send"]')?.addEventListener("click", () => {
    counts.send += 1
  })
  return counts
}
