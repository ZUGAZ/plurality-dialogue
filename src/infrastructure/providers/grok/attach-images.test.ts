// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { describe, expect, it } from "@effect/vitest"
import type { PendingImage } from "../../../domain/broadcast/pending-image"
import { installPageFileAssigner } from "../page-file-assign"
import { attachGrokImages } from "./attach-images"
import { primaryFileInputSelector, primarySendSelector } from "./selectors"

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../test/fixtures/grok/composer-2026-10-16.html",
)

const attachSelector = 'button[data-testid="attach-button"]'

describe("grok attach images", () => {
  it("file selector hits the composer file input", () => {
    loadFixture()
    const input = document.querySelector(primaryFileInputSelector)
    expect(input).toBeInstanceOf(HTMLInputElement)
    if (input instanceof HTMLInputElement) {
      expect(input.name).toBe("files")
      expect(input.type).toBe("file")
    }
  })

  it.effect("assigns one png and does not click send or attach", () =>
    Effect.gen(function* () {
      loadFixture()
      installPageFileAssigner()
      const send = watchClicks(document.querySelector(primarySendSelector))
      const attach = watchClicks(document.querySelector(attachSelector))
      const input = document.querySelector(primaryFileInputSelector)
      expect(input).toBeInstanceOf(HTMLInputElement)
      if (!(input instanceof HTMLInputElement)) {
        return
      }
      yield* attachGrokImages([png("img-1", "a.png")])
      expect(input.files?.length).toBe(1)
      expect(input.files?.[0]?.name).toBe("a.png")
      expect(input.files?.[0]?.type).toBe("image/png")
      expect(send()).toBe(0)
      expect(attach()).toBe(0)
    }),
  )

  it.effect("an empty list does not fail", () =>
    Effect.gen(function* () {
      document.body.replaceChildren()
      yield* attachGrokImages([])
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

const watchClicks = (node: Element | undefined | null): (() => number) => {
  let clicks = 0
  if (node instanceof HTMLElement) {
    node.addEventListener("click", () => {
      clicks += 1
    })
  }
  return () => clicks
}
