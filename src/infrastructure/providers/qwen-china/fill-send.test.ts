// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { Effect, Either, Fiber, TestClock } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { ComposerNotFound } from "../../../domain/ports/provider-page"
import { composerWaitMs } from "../wait-for-element"
import { makeQwenChinaProviderPage } from "./fill-send"
import { primaryComposerSelector, primarySendSelector } from "./selectors"

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../test/fixtures/qwen-china/composer-2026-10-16.html",
)

const probe = "ZXQ-QWEN-CHINA-FILL-PROBE-9182"

describe("qwen china fill-send", () => {
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
      yield* makeQwenChinaProviderPage(document).fillComposer(probe)
      const composer = document.querySelector(primaryComposerSelector)
      expect(composer?.textContent).toContain(probe)
    }),
  )

  it.effect("submit clicks send and not the attachment button", () =>
    Effect.gen(function* () {
      loadFixture()
      const counts = trackClicks()
      yield* makeQwenChinaProviderPage(document).submit()
      expect(counts.send).toBe(1)
      expect(counts.attach).toBe(0)
    }),
  )

  it.effect("blank document fails ComposerNotFound", () =>
    Effect.gen(function* () {
      document.body.replaceChildren()
      const fiber = yield* Effect.fork(
        makeQwenChinaProviderPage(document).fillComposer("x").pipe(Effect.either),
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
  const attach = document.querySelector('button[aria-label="添加附件"]')
  const counts = { send: 0, attach: 0 }
  send?.addEventListener("click", () => {
    counts.send += 1
  })
  attach?.addEventListener("click", () => {
    counts.attach += 1
  })
  return counts
}
