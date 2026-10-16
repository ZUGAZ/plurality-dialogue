// @vitest-environment happy-dom
import { Effect, Either, Fiber, TestClock } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { TemporaryChatUnavailable } from "../../../domain/ports/provider-page"
import { silentLoggerLayer } from "@test-support/silent-logger"
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
      const presses = trackPresses()
      yield* openClaudeTemporaryChat(document, presses.press)
      expect(counts.incognito).toBe(1)
      expect(counts.send).toBe(0)
      expect(presses.count).toBe(0)
    }),
  )

  it.effect("clicks once when aria-pressed is false", () =>
    Effect.gen(function* () {
      document.body.innerHTML = markup("false")
      const counts = trackClicks()
      const presses = trackPresses()
      yield* openClaudeTemporaryChat(document, presses.press)
      expect(counts.incognito).toBe(1)
      expect(counts.send).toBe(0)
      expect(presses.count).toBe(0)
    }),
  )

  it.effect("does not click when aria-pressed is true", () =>
    Effect.gen(function* () {
      document.body.innerHTML = markup("true")
      const counts = trackClicks()
      const presses = trackPresses()
      yield* openClaudeTemporaryChat(document, presses.press)
      expect(counts.incognito).toBe(0)
      expect(counts.send).toBe(0)
      expect(presses.count).toBe(0)
    }),
  )

  it.effect("a missing button sends the incognito chord", () =>
    Effect.gen(function* () {
      document.body.replaceChildren()
      const presses = trackPresses()
      yield* openClaudeTemporaryChat(document, () => {
        presses.press()
        const label = document.createElement("p")
        label.textContent = "Incognito chat"
        document.body.append(label)
      }).pipe(Effect.provide(silentLoggerLayer))
      expect(presses.count).toBe(1)
    }),
  )

  it.effect("a missing button fails when the chord does not start incognito", () =>
    Effect.gen(function* () {
      document.body.replaceChildren()
      const presses = trackPresses()
      const fiber = yield* Effect.fork(
        openClaudeTemporaryChat(document, presses.press).pipe(
          Effect.either,
          Effect.provide(silentLoggerLayer),
        ),
      )
      yield* TestClock.adjust(`${composerWaitMs} millis`)
      const result = yield* Fiber.join(fiber)
      expect(presses.count).toBe(1)
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(TemporaryChatUnavailable)
        expect(result.left.reason).toBe(
          "incognito chord did not start a private chat",
        )
      }
    }),
  )

  it.effect("clicks a button that appears after the chord", () =>
    Effect.gen(function* () {
      document.body.replaceChildren()
      const presses = trackPresses()
      let incognitoClicks = 0
      yield* openClaudeTemporaryChat(document, () => {
        presses.press()
        document.body.innerHTML = markup("false")
        document
          .querySelector('button[aria-label="Use incognito"]')
          ?.addEventListener("click", () => {
            incognitoClicks += 1
          })
      }).pipe(Effect.provide(silentLoggerLayer))
      expect(presses.count).toBe(1)
      expect(incognitoClicks).toBe(1)
    }),
  )
})

const trackPresses = (): { count: number; press: () => void } => {
  const presses = { count: 0, press: () => {} }
  presses.press = () => {
    presses.count += 1
  }
  return presses
}

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
