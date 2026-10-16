// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { Effect, Either, Fiber, TestClock } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { ComposerNotFound } from "../../../domain/ports/provider-page"
import { composerWaitMs } from "../wait-for-element"
import { makeDoubaoProviderPage } from "./fill-send"
import { primaryComposerSelector, primarySendSelector } from "./selectors"

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../test/fixtures/doubao/composer-2026-10-16.html",
)

const uploadSelector = ".uploader-input-btn"

describe("doubao fill-send", () => {
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
      yield* makeDoubaoProviderPage(document).fillComposer(
        "ZXQ-DOUBAO-FILL-PROBE-9182",
      )
      const composer = document.querySelector(primaryComposerSelector)
      expect(composer).toBeInstanceOf(HTMLTextAreaElement)
      if (composer instanceof HTMLTextAreaElement) {
        expect(composer.value).toContain("ZXQ-DOUBAO-FILL-PROBE-9182")
      }
    }),
  )

  it.effect("submit clicks send not upload", () =>
    Effect.gen(function* () {
      loadFixture()
      const counts = trackClicks()
      yield* makeDoubaoProviderPage(document).submit()
      expect(counts.send).toBe(1)
      expect(counts.upload).toBe(0)
    }),
  )

  it.effect("blank document fails ComposerNotFound", () =>
    Effect.gen(function* () {
      document.body.replaceChildren()
      const fiber = yield* Effect.fork(
        makeDoubaoProviderPage(document).fillComposer("x").pipe(Effect.either),
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

const trackClicks = (): { send: number; upload: number } => {
  const send = document.querySelector(primarySendSelector)
  const upload = document.querySelector(uploadSelector)
  const counts = { send: 0, upload: 0 }
  send?.addEventListener("click", () => {
    counts.send += 1
  })
  upload?.addEventListener("click", () => {
    counts.upload += 1
  })
  return counts
}
