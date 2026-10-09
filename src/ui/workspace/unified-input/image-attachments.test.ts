// @vitest-environment happy-dom
import { Effect } from "effect"
import { createRoot, createSignal } from "solid-js"
import { describe, expect, it } from "@effect/vitest"
import { vi } from "vitest"
import {
  isPendingImage,
  maxImageBytes,
  maxPendingImages,
} from "@domain/broadcast/pending-image"
import { silentLoggerLayer } from "@test-support/silent-logger"
import {
  createImageAttachments,
  type ImageAttachments,
} from "./image-attachments"
import { imageRejectionText, type BarStatus } from "./model"

const attach = (attachments: ImageAttachments, files: ReadonlyArray<File>) =>
  attachments.addImageFiles(files).pipe(Effect.provide(silentLoggerLayer))

const imageFile = (
  name: string,
  type: string,
  bytes: ReadonlyArray<number> = [1],
): File => new File([Uint8Array.from(bytes)], name, { type })

const openAttachments = () =>
  createRoot((dispose) => {
    const [status, setStatus] = createSignal<BarStatus>({ kind: "idle" })
    const attachments = createImageAttachments({ status, setStatus })
    return { dispose, status, setStatus, attachments }
  })

describe("image attachments", () => {
  it.effect("stores a png and a blob preview", () =>
    Effect.gen(function* () {
      const session = openAttachments()
      yield* attach(session.attachments, [imageFile("a.png", "image/png")])
      expect(session.attachments.pendingImages()).toHaveLength(1)
      const pending = session.attachments.pendingImages()[0]
      const preview = session.attachments.imagePreviews()[0]
      expect(pending === undefined ? false : isPendingImage(pending)).toBe(
        true,
      )
      if (pending !== undefined) {
        expect(Object.hasOwn(pending, "previewUrl")).toBe(false)
        expect(Array.from(pending.bytes)).toEqual([1])
      }
      expect(preview?.name).toBe("a.png")
      expect(preview?.previewUrl.startsWith("blob:")).toBe(true)
      session.dispose()
    }),
  )

  it.effect("stores a blank file name as image", () =>
    Effect.gen(function* () {
      const session = openAttachments()
      yield* attach(session.attachments, [
        imageFile("a.png", "image/png"),
        imageFile("   ", "image/png", [2]),
      ])
      expect(session.attachments.pendingImages()[1]?.name).toBe("image")
      session.dispose()
    }),
  )

  it.effect("rejects an empty file without reading it", () =>
    Effect.gen(function* () {
      const session = openAttachments()
      const file = imageFile("empty.png", "image/png", [])
      const read = vi.spyOn(file, "arrayBuffer")
      yield* attach(session.attachments, [file])
      expect(session.attachments.pendingImages()).toHaveLength(0)
      expect(session.status()).toEqual({
        kind: "notice",
        text: imageRejectionText({ _tag: "ImageEmpty" }),
      })
      expect(read).not.toHaveBeenCalled()
      read.mockRestore()
      session.dispose()
    }),
  )

  it.effect("rejects a file that cannot be read", () =>
    Effect.gen(function* () {
      const session = openAttachments()
      const file = imageFile("a.png", "image/png")
      vi.spyOn(file, "arrayBuffer").mockRejectedValue(new Error("unreadable"))
      yield* attach(session.attachments, [file])
      expect(session.attachments.pendingImages()).toHaveLength(0)
      expect(session.status()).toEqual({
        kind: "notice",
        text: imageRejectionText({ _tag: "ImageUnreadable" }),
      })
      session.dispose()
    }),
  )

  it.effect("rejects an svg without appending it", () =>
    Effect.gen(function* () {
      const session = openAttachments()
      yield* attach(session.attachments, [
        imageFile("diagram.svg", "image/svg+xml"),
      ])
      expect(session.attachments.pendingImages()).toHaveLength(0)
      expect(session.status()).toEqual({
        kind: "notice",
        text: imageRejectionText({ _tag: "UnsupportedImageType" }),
      })
      session.dispose()
    }),
  )

  it.effect("rejects an oversized file without reading it", () =>
    Effect.gen(function* () {
      const session = openAttachments()
      const file = imageFile("big.png", "image/png")
      Object.defineProperty(file, "size", { value: maxImageBytes + 1 })
      const read = vi.spyOn(file, "arrayBuffer")
      yield* attach(session.attachments, [file])
      expect(session.attachments.pendingImages()).toHaveLength(0)
      expect(session.status()).toEqual({
        kind: "notice",
        text: imageRejectionText({ _tag: "ImageTooLarge" }),
      })
      expect(read).not.toHaveBeenCalled()
      read.mockRestore()
      session.dispose()
    }),
  )

  it.effect("keeps the first four files and reports the cap", () =>
    Effect.gen(function* () {
      const session = openAttachments()
      const files = [1, 2, 3, 4, 5].map((byte) =>
        imageFile(`${byte}.png`, "image/png", [byte]),
      )
      const fifth = files[4]
      expect(fifth).toBeDefined()
      if (fifth === undefined) {
        session.dispose()
        return
      }
      const readFifth = vi.spyOn(fifth, "arrayBuffer")
      yield* attach(session.attachments, files)
      expect(session.attachments.pendingImages()).toHaveLength(maxPendingImages)
      expect(session.status()).toEqual({
        kind: "notice",
        text: imageRejectionText({ _tag: "TooManyImages" }),
      })
      expect(readFifth).not.toHaveBeenCalled()
      readFifth.mockRestore()
      session.dispose()
    }),
  )

  it.effect("keeps a png that follows an svg and shows the type sentence", () =>
    Effect.gen(function* () {
      const session = openAttachments()
      yield* attach(session.attachments, [
        imageFile("diagram.svg", "image/svg+xml"),
        imageFile("a.png", "image/png"),
      ])
      expect(session.attachments.pendingImages()).toHaveLength(1)
      expect(session.attachments.pendingImages()[0]?.name).toBe("a.png")
      expect(session.status()).toEqual({
        kind: "notice",
        text: imageRejectionText({ _tag: "UnsupportedImageType" }),
      })
      session.dispose()
    }),
  )

  it.effect("clears an image notice after a later valid batch", () =>
    Effect.gen(function* () {
      const session = openAttachments()
      yield* attach(session.attachments, [
        imageFile("diagram.svg", "image/svg+xml"),
      ])
      yield* attach(session.attachments, [imageFile("a.png", "image/png")])
      expect(session.attachments.pendingImages()).toHaveLength(1)
      expect(session.status()).toEqual({ kind: "idle" })
      session.dispose()
    }),
  )

  it.effect("leaves a broadcast failure notice in place", () =>
    Effect.gen(function* () {
      const session = openAttachments()
      const failure: BarStatus = {
        kind: "notice",
        text: "Failed: panel-1 (ChatGPT)",
      }
      session.setStatus(failure)
      yield* attach(session.attachments, [imageFile("a.png", "image/png")])
      expect(session.attachments.pendingImages()).toHaveLength(1)
      expect(session.status()).toEqual(failure)
      session.dispose()
    }),
  )

  it.effect("remove drops one row and revokes its preview", () =>
    Effect.gen(function* () {
      const session = openAttachments()
      const revoke = vi.spyOn(URL, "revokeObjectURL")
      yield* attach(session.attachments, [
        imageFile("a.png", "image/png", [1]),
        imageFile("b.png", "image/png", [2]),
      ])
      const first = session.attachments.imagePreviews()[0]
      const second = session.attachments.imagePreviews()[1]
      expect(first).toBeDefined()
      expect(second).toBeDefined()
      if (first === undefined || second === undefined) {
        revoke.mockRestore()
        session.dispose()
        return
      }
      session.attachments.removeImage(first.id)
      expect(session.attachments.pendingImages().map((image) => image.name)).toEqual([
        "b.png",
      ])
      expect(revoke).toHaveBeenCalledWith(first.previewUrl)
      session.attachments.clearImages()
      expect(session.attachments.pendingImages()).toEqual([])
      expect(revoke).toHaveBeenCalledWith(second.previewUrl)
      revoke.mockRestore()
      session.dispose()
    }),
  )

  it.effect("disposing the root revokes previews still held", () =>
    Effect.gen(function* () {
      const session = openAttachments()
      const revoke = vi.spyOn(URL, "revokeObjectURL")
      yield* attach(session.attachments, [
        imageFile("a.png", "image/png", [1]),
        imageFile("b.png", "image/png", [2]),
      ])
      const urls = session.attachments
        .imagePreviews()
        .map((preview) => preview.previewUrl)
      expect(urls).toHaveLength(2)
      session.dispose()
      expect(revoke).toHaveBeenCalledWith(urls[0])
      expect(revoke).toHaveBeenCalledWith(urls[1])
      revoke.mockRestore()
    }),
  )
})
