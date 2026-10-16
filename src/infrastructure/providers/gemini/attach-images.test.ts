// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { Effect, Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import type { PendingImage } from "../../../domain/broadcast/pending-image"
import { ImageAttachFailed } from "../../../domain/ports/provider-page"
import { installPageFileAssigner } from "../page-file-assign"
import { attachGeminiImages } from "./attach-images"
import {
  primaryFileInputSelector,
  primarySendSelector,
  uploadToolsSelector,
} from "./selectors"

const fixtureDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../test/fixtures/gemini",
)

describe("gemini attach images", () => {
  it("file selector hits Filedata and not the hidden document input", () => {
    loadFixture("attach-2026-10-10.html")
    const input = document.querySelector(primaryFileInputSelector)
    const hidden = document.querySelector("input.hidden-file-input")
    expect(input).toBeInstanceOf(HTMLInputElement)
    expect(hidden).toBeInstanceOf(HTMLInputElement)
    expect(input).not.toBe(hidden)
    if (input instanceof HTMLInputElement) {
      expect(input.name).toBe("Filedata")
      expect(input.type).toBe("file")
      expect(input.getAttribute("accept")).toBeNull()
    }
  })

  it.effect("assigns one png and does not click Files, Drive, or Photos", () =>
    Effect.gen(function* () {
      loadFixture("attach-2026-10-10.html")
      installPageFileAssigner()
      const files = watchClicks(buttonWithText("Files"))
      const drive = watchClicks(buttonWithText("Drive"))
      const photos = watchClicks(buttonWithText("Google Photos"))
      const input = document.querySelector(primaryFileInputSelector)
      expect(input).toBeInstanceOf(HTMLInputElement)
      if (!(input instanceof HTMLInputElement)) {
        return
      }
      yield* attachGeminiImages([png("img-1", "a.png")])
      expect(input.files?.length).toBe(1)
      expect(input.files?.[0]?.name).toBe("a.png")
      expect(input.files?.[0]?.type).toBe("image/png")
      const hidden = document.querySelector("input.hidden-file-input")
      if (hidden instanceof HTMLInputElement) {
        expect(hidden.files?.length ?? 0).toBe(0)
      }
      expect(files()).toBe(0)
      expect(drive()).toBe(0)
      expect(photos()).toBe(0)
    }),
  )

  it.effect("idle composer clicks Upload and tools once, then fails", () =>
    Effect.gen(function* () {
      loadFixture("composer-2026-08-31.html")
      installPageFileAssigner()
      const upload = watchClicks(document.querySelector(uploadToolsSelector))
      const send = watchClicks(document.querySelector(primarySendSelector))
      const result = yield* attachGeminiImages([png("img-1", "a.png")]).pipe(
        Effect.either,
      )
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(ImageAttachFailed)
      }
      expect(upload()).toBe(1)
      expect(send()).toBe(0)
    }),
  )

  it.effect("one Upload and tools click reveals Filedata, then assigns", () =>
    Effect.gen(function* () {
      document.body.replaceChildren()
      installPageFileAssigner()
      const upload = document.createElement("button")
      upload.type = "button"
      upload.setAttribute("aria-label", "Upload and tools")
      let clicks = 0
      upload.addEventListener("click", () => {
        clicks += 1
        const host = document.createElement("images-files-uploader")
        const input = document.createElement("input")
        input.type = "file"
        input.name = "Filedata"
        input.multiple = true
        host.append(input)
        document.body.append(host)
      })
      document.body.append(upload)
      yield* attachGeminiImages([png("img-1", "a.png")])
      expect(clicks).toBe(1)
      const input = document.querySelector(primaryFileInputSelector)
      expect(input).toBeInstanceOf(HTMLInputElement)
      if (input instanceof HTMLInputElement) {
        expect(input.files?.length).toBe(1)
        expect(input.files?.[0]?.name).toBe("a.png")
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

const loadFixture = (name: string): void => {
  const html = readFileSync(join(fixtureDir, name), "utf8")
  const parsed = new DOMParser().parseFromString(html, "text/html")
  document.documentElement.innerHTML = parsed.documentElement.innerHTML
}

const buttonWithText = (text: string): HTMLButtonElement | undefined => {
  for (const button of document.querySelectorAll("button")) {
    if (
      button instanceof HTMLButtonElement &&
      button.textContent?.trim() === text
    ) {
      return button
    }
  }
  return undefined
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
