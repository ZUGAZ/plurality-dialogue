// @vitest-environment happy-dom
import { Effect, Layer } from "effect"
import { silentLoggerLayer } from "@test-support/silent-logger"
import { createRoot } from "solid-js"
import { describe, expect, it } from "@effect/vitest"
import { vi } from "vitest"
import { FillAndSubmit } from "@domain/broadcast/commands/fill-and-submit"
import { FillComposer } from "@domain/broadcast/commands/fill-composer"
import { PanelCommandErr } from "@domain/messaging/panel-command-err"
import { PanelCommandOk } from "@domain/messaging/panel-command-ok"
import { PanelTarget } from "@domain/broadcast/panel-target"
import type {
  BroadcastPlan,
  VisiblePanel,
} from "@domain/broadcast/resolve-targets"
import {
  inMemoryMessagingLayer,
  type InMemoryFrameMessaging,
} from "@domain/ports/in-memory-messaging"
import { createUnifiedInputViewModel } from "./view-model"

const quiet = <Success, Error, Requirements>(
  layer: Layer.Layer<Success, Error, Requirements>,
): Layer.Layer<Success, Error, Requirements> =>
  Layer.merge(layer, silentLoggerLayer)

const emptyPlan: BroadcastPlan = { targets: [], notReady: [] }

const target = PanelTarget.make({
  panelId: "panel-1",
  providerId: "chatgpt",
  tabId: 1,
  frameId: 10,
})

const sendFrames: InMemoryFrameMessaging = {
  replies: new Map([
    [
      "panel-1",
      PanelCommandOk.make({
        verb: "submitted",
        providerId: "chatgpt",
        panelId: "panel-1",
      }),
    ],
  ]),
  sent: [],
}

const fillFrames: InMemoryFrameMessaging = {
  replies: new Map([
    [
      "panel-1",
      PanelCommandOk.make({
        verb: "filled",
        providerId: "chatgpt",
        panelId: "panel-1",
      }),
    ],
  ]),
  sent: [],
}

const missFrames: InMemoryFrameMessaging = {
  replies: new Map([
    [
      "panel-1",
      PanelCommandErr.make({
        providerId: "chatgpt",
        panelId: "panel-1",
        reason: "composer-not-found",
      }),
    ],
  ]),
  sent: [],
}

describe("pending images", () => {
  it.effect("an image with empty or whitespace text enables clear only", () =>
    Effect.gen(function* () {
      const session = openSession()
      yield* session.vm
        .addImageFiles([pngFile("a.png")])
        .pipe(Effect.provide(silentLoggerLayer))
      expect(session.vm.draft()).toBe("")
      expect(session.vm.hasDraft()).toBe(false)
      expect(session.vm.canClear()).toBe(true)
      session.vm.setDraft("  \n")
      expect(session.vm.hasDraft()).toBe(false)
      expect(session.vm.canClear()).toBe(true)
      session.dispose()
    }),
  )

  it.effect("clear drops images, revokes previews, and returns to idle", () =>
    Effect.gen(function* () {
      const session = openSession()
      const revoke = vi.spyOn(URL, "revokeObjectURL")
      yield* session.vm
        .addImageFiles([pngFile("a.png")])
        .pipe(Effect.provide(silentLoggerLayer))
      const preview = session.vm.imagePreviews()[0]
      expect(preview).toBeDefined()
      session.vm.clear()
      expect(session.vm.draft()).toBe("")
      expect(session.vm.pendingImages()).toEqual([])
      expect(session.vm.status()).toEqual({ kind: "idle" })
      expect(session.vm.canRetry()).toBe(false)
      if (preview !== undefined) {
        expect(revoke).toHaveBeenCalledWith(preview.previewUrl)
      }
      revoke.mockRestore()
      session.dispose()
    }),
  )

  it.layer(quiet(inMemoryMessagingLayer(() => Effect.succeed({}), sendFrames)))(
    "send images",
    (it) => {
      it.effect("sendAll clears text, images, and the preview", () =>
        Effect.gen(function* () {
          sendFrames.sent.length = 0
          const session = openSession(() => ({
            targets: [target],
            notReady: [],
          }))
          const revoke = vi.spyOn(URL, "revokeObjectURL")
          session.vm.setDraft("hi")
          yield* session.vm.addImageFiles([pngFile("a.png")])
          const image = session.vm.pendingImages()[0]
          const preview = session.vm.imagePreviews()[0]
          expect(image).toBeDefined()
          expect(preview).toBeDefined()
          yield* session.vm.sendAll()
          expect(session.vm.draft()).toBe("")
          expect(session.vm.pendingImages()).toEqual([])
          expect(session.vm.canRetry()).toBe(false)
          if (preview !== undefined) {
            expect(revoke).toHaveBeenCalledWith(preview.previewUrl)
          }
          expect(sendFrames.sent.map((row) => row.message)).toEqual([
            FillAndSubmit.make({
              prompt: "hi",
              images: image === undefined ? [] : [image],
            }),
          ])
          revoke.mockRestore()
          session.dispose()
        }),
      )

      it.effect("whitespace send keeps the image and sends nothing", () =>
        Effect.gen(function* () {
          sendFrames.sent.length = 0
          const session = openSession(() => ({
            targets: [target],
            notReady: [],
          }))
          session.vm.setDraft("  \n")
          yield* session.vm.addImageFiles([pngFile("a.png")])
          yield* session.vm.sendAll()
          expect(sendFrames.sent).toHaveLength(0)
          expect(session.vm.pendingImages()).toHaveLength(1)
          expect(session.vm.draft()).toBe("  \n")
          expect(session.vm.hasDraft()).toBe(false)
          session.dispose()
        }),
      )
    },
  )

  it.layer(quiet(inMemoryMessagingLayer(() => Effect.succeed({}), fillFrames)))(
    "fill keeps images",
    (it) => {
      it.effect("fill keeps text and the image", () =>
        Effect.gen(function* () {
          fillFrames.sent.length = 0
          const session = openSession(() => ({
            targets: [target],
            notReady: [],
          }))
          session.vm.setDraft("hi")
          yield* session.vm.addImageFiles([pngFile("a.png")])
          const before = session.vm.pendingImages()
          yield* session.vm.fill()
          expect(session.vm.draft()).toBe("hi")
          expect(session.vm.pendingImages()).toEqual(before)
          expect(fillFrames.sent.map((row) => row.message)).toEqual([
            FillComposer.make({ prompt: "hi" }),
          ])
          session.dispose()
        }),
      )
    },
  )

  it.layer(quiet(inMemoryMessagingLayer(() => Effect.succeed({}), missFrames)))(
    "image rejection keeps retry",
    (it) => {
      it.effect("an svg after a failed fill keeps canRetry", () =>
        Effect.gen(function* () {
          const session = openSession(() => ({
            targets: [target],
            notReady: [],
          }))
          session.vm.setDraft("hi")
          yield* session.vm.fill()
          expect(session.vm.canRetry()).toBe(true)
          yield* session.vm.addImageFiles([svgFile()])
          expect(session.vm.canRetry()).toBe(true)
          expect(session.vm.statusText()).toBe(
            "Only PNG, JPEG, WebP, and GIF images can be attached.",
          )
          session.dispose()
        }),
      )

      it.effect("remove leaves draft text and retry state", () =>
        Effect.gen(function* () {
          const session = openSession(() => ({
            targets: [target],
            notReady: [],
          }))
          session.vm.setDraft("hi")
          yield* session.vm.fill()
          yield* session.vm.addImageFiles([
            pngFile("a.png", 1),
            pngFile("b.png", 2),
          ])
          const first = session.vm.pendingImages()[0]
          expect(first).toBeDefined()
          if (first === undefined) {
            session.dispose()
            return
          }
          session.vm.removeImage(first.id)
          expect(session.vm.draft()).toBe("hi")
          expect(session.vm.canRetry()).toBe(true)
          expect(session.vm.pendingImages().map((image) => image.name)).toEqual([
            "b.png",
          ])
          session.dispose()
        }),
      )
    },
  )
})

const pngFile = (name: string, byte = 1): File =>
  new File([Uint8Array.of(byte)], name, { type: "image/png" })

const svgFile = (): File =>
  new File([Uint8Array.of(1)], "diagram.svg", { type: "image/svg+xml" })

const openSession = (
  getPlan: () => BroadcastPlan = () => emptyPlan,
  resolveTargets: (
    panels: ReadonlyArray<VisiblePanel>,
  ) => BroadcastPlan = () => emptyPlan,
) =>
  createRoot((dispose) => ({
    vm: createUnifiedInputViewModel(
      () => undefined,
      getPlan,
      resolveTargets,
    ),
    dispose,
  }))
