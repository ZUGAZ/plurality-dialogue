// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { Effect, Either, Fiber, TestClock } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { ComposerNotFound, SubmitControlNotFound } from "../../../domain/ports/provider-page"
import { composerWaitMs, submitEnableWaitMs } from "../wait-for-element"
import { makeChatgptProviderPage } from "./fill-send"
import { primaryComposerSelector, primarySendSelector } from "./selectors"

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../test/fixtures/chatgpt/composer-2026-08-31.html",
)

describe("chatgpt fill-send", () => {
  it("primary composer selector hits the fixture", () => {
    loadFixture()
    expect(document.querySelector(primaryComposerSelector)).not.toBeNull()
  })

  it("primary send selector hits the fixture", () => {
    loadFixture()
    expect(document.querySelector(primarySendSelector)).not.toBeNull()
  })

  it.effect("fills the composer when prompt-textarea is gone", () =>
    Effect.gen(function* () {
      document.body.innerHTML =
        '<form data-chatgpt-composer=""><div data-composer-markdown="" contenteditable="true" role="textbox" class="ProseMirror"><p><br></p></div><button type="button" aria-label="Start Voice">Voice</button></form>'
      yield* makeChatgptProviderPage(document).fillComposer(
        "ZXQ-FILL-PROBE-9182",
      )
      const composer = document.querySelector(primaryComposerSelector)
      expect(composer?.textContent).toContain("ZXQ-FILL-PROBE-9182")
      expect(composer?.querySelector("p")).not.toBeNull()
    }),
  )

  it.effect("fill writes a distinctive string into the composer", () =>
    Effect.gen(function* () {
      loadFixture()
      yield* makeChatgptProviderPage(document).fillComposer(
        "ZXQ-FILL-PROBE-9182",
      )
      const composer = document.querySelector(primaryComposerSelector)
      expect(composer?.textContent).toContain("ZXQ-FILL-PROBE-9182")
    }),
  )

  it.effect("does not click the microphone while Send is absent", () =>
    Effect.gen(function* () {
      document.body.innerHTML =
        '<form data-chatgpt-composer=""><div data-composer-markdown="" contenteditable="true" class="ProseMirror"><p><br></p></div><button type="button" aria-label="Start Voice">Voice</button></form>'
      const voice = document.querySelector('button[aria-label="Start Voice"]')
      let clicks = 0
      voice?.addEventListener("click", () => {
        clicks += 1
      })
      const fiber = yield* Effect.fork(
        makeChatgptProviderPage(document).submit().pipe(Effect.either),
      )
      yield* TestClock.adjust(`${submitEnableWaitMs} millis`)
      const result = yield* Fiber.join(fiber)
      expect(clicks).toBe(0)
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(SubmitControlNotFound)
      }
    }),
  )

  it.effect("submit clicks send not upload", () =>
    Effect.gen(function* () {
      loadFixture()
      const counts = trackClicks()
      yield* makeChatgptProviderPage(document).submit()
      expect(counts.send).toBe(1)
      expect(counts.upload).toBe(0)
    }),
  )

  it.effect("blank document fails ComposerNotFound", () =>
    Effect.gen(function* () {
      document.body.replaceChildren()
      const fiber = yield* Effect.fork(
        makeChatgptProviderPage(document)
          .fillComposer("x")
          .pipe(Effect.either),
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
  if (send instanceof HTMLElement) {
    send.removeAttribute("disabled")
  }
  const upload = document.querySelector(
    'button[aria-label="Attach files"], button[data-testid="composer-plus-btn"], input[type="file"]',
  )
  const counts = { send: 0, upload: 0 }
  send?.addEventListener("click", () => {
    counts.send += 1
  })
  upload?.addEventListener("click", () => {
    counts.upload += 1
  })
  return counts
}
