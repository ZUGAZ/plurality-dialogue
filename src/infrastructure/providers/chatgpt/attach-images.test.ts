// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { Effect, Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import type { PendingImage } from "../../../domain/broadcast/pending-image"
import { ImageAttachFailed } from "../../../domain/ports/provider-page"
import { installPageFileAssigner } from "../page-file-assign"
import { attachChatgptImages } from "./attach-images"
import { primaryFileInputSelector } from "./selectors"

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../test/fixtures/chatgpt/composer-2026-08-31.html",
)

describe("chatgpt attach images", () => {
  it("primary file input selector hits the fixture", () => {
    loadFixture()
    const input = document.querySelector(primaryFileInputSelector)
    expect(input).toBeInstanceOf(HTMLInputElement)
    if (input instanceof HTMLInputElement) {
      expect(input.type).toBe("file")
    }
  })

  it.effect("assigns one png and does not click the plus button", () =>
    Effect.gen(function* () {
      loadFixture()
      installPageFileAssigner()
      const plus = watchClicks(document.querySelector("button#composer-plus-btn"))
      const input = document.querySelector(primaryFileInputSelector)
      expect(input).toBeInstanceOf(HTMLInputElement)
      if (!(input instanceof HTMLInputElement)) {
        return
      }
      let changes = 0
      input.addEventListener("change", () => {
        changes += 1
      })
      yield* attachChatgptImages(document, [png("img-1", "a.png")])
      expect(input.files?.length).toBe(1)
      expect(input.files?.[0]?.name).toBe("a.png")
      expect(input.files?.[0]?.type).toBe("image/png")
      expect(changes).toBe(1)
      expect(plus()).toBe(0)
    }),
  )

  it.effect("an empty list leaves files empty", () =>
    Effect.gen(function* () {
      loadFixture()
      const plus = watchClicks(document.querySelector("button#composer-plus-btn"))
      yield* attachChatgptImages(document, [])
      const input = document.querySelector(primaryFileInputSelector)
      expect(input).toBeInstanceOf(HTMLInputElement)
      if (input instanceof HTMLInputElement) {
        expect(input.files?.length ?? 0).toBe(0)
      }
      expect(plus()).toBe(0)
    }),
  )

  it.effect("a missing file input fails", () =>
    Effect.gen(function* () {
      loadFixture()
      document.querySelector(primaryFileInputSelector)?.remove()
      const result = yield* attachChatgptImages(document, [
        png("img-1", "a.png"),
      ]).pipe(Effect.either)
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(ImageAttachFailed)
      }
    }),
  )
})

const png = (id: string, name: string): PendingImage => ({
  id,
  name,
  mediaType: "image/png",
  bytes: Uint8Array.of(1, 2, 3),
})

const loadFixture = (): void => {
  const html = readFileSync(fixturePath, "utf8")
  const parsed = new DOMParser().parseFromString(html, "text/html")
  document.documentElement.innerHTML = parsed.documentElement.innerHTML
}

const watchClicks = (node: Element | null): (() => number) => {
  let clicks = 0
  if (node instanceof HTMLElement) {
    node.addEventListener("click", () => {
      clicks += 1
    })
  }
  return () => clicks
}
