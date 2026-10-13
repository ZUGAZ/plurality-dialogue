// @vitest-environment happy-dom
import { Effect, Either, Fiber, TestClock } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { TemporaryChatUnavailable } from "../../../domain/ports/provider-page"
import { composerWaitMs } from "../wait-for-element"
import { openClaudeTemporaryChat } from "./open-temporary-chat"

const markup = (pressed: string | undefined): string => {
  const attribute = pressed === undefined ? "" : ` aria-pressed="${pressed}"`
  return `<button type="button" aria-label="Use incognito"${attribute}>Incognito</button><button type="button" aria-label="Send">Send</button>`
}

describe("claude temporary chat", () => {
  it.effect("clicks once when aria-pressed is absent", () =>
    Effect.gen(function* () {
      document.body.innerHTML = markup(undefined)
      const counts = trackClicks()
      yield* openClaudeTemporaryChat(document)
      expect(counts.incognito).toBe(1)
      expect(counts.send).toBe(0)
    }),
  )

  it.effect("clicks once when aria-pressed is false", () =>
    Effect.gen(function* () {
      document.body.innerHTML = markup("false")
      const counts = trackClicks()
      yield* openClaudeTemporaryChat(document)
      expect(counts.incognito).toBe(1)
      expect(counts.send).toBe(0)
    }),
  )

  it.effect("does not click when aria-pressed is true", () =>
    Effect.gen(function* () {
      document.body.innerHTML = markup("true")
      const counts = trackClicks()
      yield* openClaudeTemporaryChat(document)
      expect(counts.incognito).toBe(0)
      expect(counts.send).toBe(0)
    }),
  )

  it.effect("a missing button fails TemporaryChatUnavailable", () =>
    Effect.gen(function* () {
      document.body.replaceChildren()
      const fiber = yield* Effect.fork(
        openClaudeTemporaryChat(document).pipe(Effect.either),
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

const trackClicks = (): { incognito: number; send: number } => {
  const counts = { incognito: 0, send: 0 }
  document
    .querySelector('button[aria-label="Use incognito"]')
    ?.addEventListener("click", () => {
      counts.incognito += 1
    })
  document.querySelector('button[aria-label="Send"]')?.addEventListener("click", () => {
    counts.send += 1
  })
  return counts
}
