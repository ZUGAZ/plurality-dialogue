// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { Effect, Either, Fiber, TestClock } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { ComposerNotFound } from "../../../domain/ports/provider-page"
import { composerWaitMs } from "../wait-for-element"
import { makeGrokProviderPage } from "./fill-send"
import { primaryComposerSelector, primarySendSelector } from "./selectors"

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../test/fixtures/grok/composer-2026-10-16.html",
)

const attachSelector = 'button[data-testid="attach-button"]'

describe("grok fill-send", () => {
  it("primary composer selector hits the fixture", () => {
    loadFixture()
    expect(document.querySelector(primaryComposerSelector)).not.toBeNull()
  })

  it("primary send selector hits the fixture", () => {
    loadFixture()
    expect(document.querySelector(primarySendSelector)).not.toBeNull()
  })

  it.effect("fill writes a distinctive string into the composer", () =>
    Effect.gen(function* () {
      loadFixture()
      yield* makeGrokProviderPage(document).fillComposer(
        "ZXQ-GROK-FILL-PROBE-9182",
      )
      const composer = document.querySelector(primaryComposerSelector)
      expect(composer?.textContent).toContain("ZXQ-GROK-FILL-PROBE-9182")
    }),
  )

  it.effect("submit clicks send not attach", () =>
    Effect.gen(function* () {
      loadFixture()
      const counts = trackClicks()
      yield* makeGrokProviderPage(document).submit()
      expect(counts.send).toBe(1)
      expect(counts.attach).toBe(0)
    }),
  )

  it.effect("blank document fails ComposerNotFound", () =>
    Effect.gen(function* () {
      document.body.replaceChildren()
      const fiber = yield* Effect.fork(
        makeGrokProviderPage(document).fillComposer("x").pipe(Effect.either),
      )
      yield* TestClock.adjust(`${composerWaitMs} millis`)
      const result = yield* Fiber.join(fiber)
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(ComposerNotFound)
      }
    }),
  )
})

const loadFixture = (): void => {
  const html = readFileSync(fixturePath, "utf8")
  const parsed = new DOMParser().parseFromString(html, "text/html")
  document.documentElement.innerHTML = parsed.documentElement.innerHTML
}

const trackClicks = (): { send: number; attach: number } => {
  const send = document.querySelector(primarySendSelector)
  if (send instanceof HTMLElement) {
    send.removeAttribute("aria-disabled")
    send.removeAttribute("disabled")
  }
  const attach = document.querySelector(attachSelector)
  const counts = { send: 0, attach: 0 }
  send?.addEventListener("click", () => {
    counts.send += 1
  })
  attach?.addEventListener("click", () => {
    counts.attach += 1
  })
  return counts
}
