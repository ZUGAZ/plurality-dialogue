// @vitest-environment happy-dom
import { Effect } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { vi } from "vitest"
import { FillAndSubmit } from "@domain/broadcast/commands/fill-and-submit"
import { FillComposer } from "@domain/broadcast/commands/fill-composer"
import {
  broadcastPrompt,
  chatgpt,
  claude,
  frameNotReady,
  gemini,
  openRetrySession,
  replyMiss,
  replyOk,
  sentIdsSince,
} from "./view-model-retry-session"

describe("unified input retry", () => {
  it("canRetry is false before any broadcast", () => {
    const session = openRetrySession()
    expect(session.vm.canRetry()).toBe(false)
    session.dispose()
  })

  it.effect("fill with one failure sets canRetry and keeps the draft", () =>
    Effect.gen(function* () {
      const session = openRetrySession()
      replyOk(session.replies, chatgpt, "filled")
      replyMiss(session.replies, claude)
      session.vm.setDraft("hi")
      yield* session.vm.fill().pipe(Effect.provide(session.layer))
      expect(session.vm.canRetry()).toBe(true)
      expect(session.vm.statusText()).toBe("Failed: panel-2 (Claude)")
      expect(session.vm.draft()).toBe("hi")
      session.dispose()
    }),
  )

  it.effect("sendAll with one failure sets canRetry and keeps the draft", () =>
    Effect.gen(function* () {
      const session = openRetrySession()
      replyOk(session.replies, chatgpt, "submitted")
      replyMiss(session.replies, claude)
      session.vm.setDraft("hi")
      yield* session.vm.sendAll().pipe(Effect.provide(session.layer))
      expect(session.vm.canRetry()).toBe(true)
      expect(session.vm.statusText()).toBe("Failed: panel-2 (Claude)")
      expect(session.vm.draft()).toBe("hi")
      session.dispose()
    }),
  )

  it.effect("fill where every panel succeeds keeps canRetry false", () =>
    Effect.gen(function* () {
      const session = openRetrySession()
      replyOk(session.replies, chatgpt, "filled")
      replyMiss(session.replies, claude)
      session.vm.setDraft("hi")
      yield* session.vm.fill().pipe(Effect.provide(session.layer))
      expect(session.vm.canRetry()).toBe(true)
      replyOk(session.replies, claude, "filled")
      yield* session.vm.fill().pipe(Effect.provide(session.layer))
      expect(session.vm.canRetry()).toBe(false)
      expect(session.vm.status()).toEqual({ kind: "idle" })
      expect(session.vm.draft()).toBe("hi")
      session.dispose()
    }),
  )

  it.effect("retryFailed sends only the previously failed panel ids", () =>
    Effect.gen(function* () {
      const session = openRetrySession()
      replyOk(session.replies, chatgpt, "filled")
      replyMiss(session.replies, claude)
      session.vm.setDraft("hi")
      yield* session.vm.fill().pipe(Effect.provide(session.layer))
      const start = session.frames.sent.length
      yield* session.vm.retryFailed().pipe(Effect.provide(session.layer))
      expect(sentIdsSince(session.frames, start)).toEqual(["panel-2"])
      session.dispose()
    }),
  )

  it.effect("a successful retry clears canRetry and leaves the draft", () =>
    Effect.gen(function* () {
      const session = openRetrySession()
      replyOk(session.replies, chatgpt, "submitted")
      replyMiss(session.replies, claude)
      session.vm.setDraft("hi")
      yield* session.vm.sendAll().pipe(Effect.provide(session.layer))
      replyOk(session.replies, claude, "submitted")
      yield* session.vm.retryFailed().pipe(Effect.provide(session.layer))
      expect(session.vm.canRetry()).toBe(false)
      expect(session.vm.status()).toEqual({ kind: "idle" })
      expect(session.vm.draft()).toBe("hi")
      session.dispose()
    }),
  )

  it.effect("a partial retry keeps only the panels that still failed", () =>
    Effect.gen(function* () {
      const session = openRetrySession()
      session.setPlan({
        targets: [chatgpt, claude, gemini],
        notReady: [],
        panelIds: ["panel-1", "panel-2", "panel-3"],
      })
      replyOk(session.replies, chatgpt, "filled")
      replyMiss(session.replies, claude)
      replyMiss(session.replies, gemini)
      session.vm.setDraft("hi")
      yield* session.vm.fill().pipe(Effect.provide(session.layer))
      replyOk(session.replies, claude, "filled")
      const start = session.frames.sent.length
      yield* session.vm.retryFailed().pipe(Effect.provide(session.layer))
      expect(sentIdsSince(session.frames, start).sort()).toEqual([
        "panel-2",
        "panel-3",
      ])
      expect(session.vm.canRetry()).toBe(true)
      expect(session.vm.statusText()).toBe("Failed: panel-3 (Gemini)")
      expect(session.vm.draft()).toBe("hi")
      session.dispose()
    }),
  )

  it.effect("retry uses the original prompt, not the current draft", () =>
    Effect.gen(function* () {
      const session = openRetrySession()
      replyOk(session.replies, chatgpt, "filled")
      replyMiss(session.replies, claude)
      session.vm.setDraft("original")
      yield* session.vm.fill().pipe(Effect.provide(session.layer))
      session.vm.setDraft("")
      expect(session.vm.hasDraft()).toBe(false)
      const start = session.frames.sent.length
      yield* session.vm.retryFailed().pipe(Effect.provide(session.layer))
      const retried = session.frames.sent.slice(start)
      expect(retried.map((row) => row.target.panelId)).toEqual(["panel-2"])
      expect(retried.map((row) => broadcastPrompt(row.message))).toEqual([
        "original",
      ])
      expect(session.vm.draft()).toBe("")
      session.dispose()
    }),
  )

  it.effect("clear drops canRetry", () =>
    Effect.gen(function* () {
      const session = openRetrySession()
      replyMiss(session.replies, chatgpt)
      replyMiss(session.replies, claude)
      session.vm.setDraft("hi")
      yield* session.vm.fill().pipe(Effect.provide(session.layer))
      expect(session.vm.canRetry()).toBe(true)
      session.vm.clear()
      expect(session.vm.canRetry()).toBe(false)
      expect(session.vm.status()).toEqual({ kind: "idle" })
      expect(session.vm.draft()).toBe("")
      session.dispose()
    }),
  )

  it.effect("a new send replaces the previous retry state", () =>
    Effect.gen(function* () {
      const session = openRetrySession()
      replyOk(session.replies, chatgpt, "filled")
      replyMiss(session.replies, claude)
      session.vm.setDraft("first")
      yield* session.vm.fill().pipe(Effect.provide(session.layer))
      expect(session.vm.canRetry()).toBe(true)
      session.setPlan({
        targets: [gemini],
        notReady: [],
        panelIds: ["panel-3"],
      })
      replyMiss(session.replies, gemini)
      session.vm.setDraft("second")
      yield* session.vm.sendAll().pipe(Effect.provide(session.layer))
      expect(session.vm.statusText()).toBe("Failed: panel-3 (Gemini)")
      expect(session.vm.canRetry()).toBe(true)
      session.vm.setDraft("third")
      const start = session.frames.sent.length
      yield* session.vm.retryFailed().pipe(Effect.provide(session.layer))
      const retried = session.frames.sent.slice(start)
      expect(retried.map((row) => row.target.panelId)).toEqual(["panel-3"])
      expect(retried.map((row) => broadcastPrompt(row.message))).toEqual([
        "second",
      ])
      expect(session.vm.draft()).toBe("third")
      session.dispose()
    }),
  )

  it.effect(
    "retry resolves a frame that was not ready once its hello arrives",
    () =>
      Effect.gen(function* () {
        const session = openRetrySession()
        session.announced.delete(claude.panelId)
        session.setPlan({
          targets: [chatgpt],
          panelIds: ["panel-1", "panel-2"],
          notReady: [frameNotReady(claude)],
        })
        replyOk(session.replies, chatgpt, "filled")
        session.vm.setDraft("hi")
        yield* session.vm.fill().pipe(Effect.provide(session.layer))
        expect(session.vm.statusText()).toBe("Failed: panel-2 (Claude)")
        const stillWaiting = session.frames.sent.length
        yield* session.vm.retryFailed().pipe(Effect.provide(session.layer))
        expect(sentIdsSince(session.frames, stillWaiting)).toEqual([])
        expect(session.vm.canRetry()).toBe(true)
        expect(session.vm.statusText()).toBe("Failed: panel-2 (Claude)")
        session.announced.add(claude.panelId)
        replyOk(session.replies, claude, "filled")
        yield* session.vm.retryFailed().pipe(Effect.provide(session.layer))
        expect(sentIdsSince(session.frames, stillWaiting)).toEqual(["panel-2"])
        expect(session.vm.canRetry()).toBe(false)
        expect(session.vm.status()).toEqual({ kind: "idle" })
        expect(session.vm.draft()).toBe("hi")
        session.dispose()
      }),
  )

  it.effect(
    "retry after a failed send resends the original image to the failed panel",
    () =>
      Effect.gen(function* () {
        const session = openRetrySession()
        replyOk(session.replies, chatgpt, "submitted")
        replyMiss(session.replies, claude)
        session.vm.setDraft("hi")
        yield* session.vm
          .addImageFiles([pngFile("a.png")])
          .pipe(Effect.provide(session.layer))
        const image = session.vm.pendingImages()[0]
        expect(image).toBeDefined()
        yield* session.vm.sendAll().pipe(Effect.provide(session.layer))
        expect(session.vm.canRetry()).toBe(true)
        expect(session.vm.statusText()).toBe("Failed: panel-2 (Claude)")
        expect(session.vm.draft()).toBe("hi")
        expect(session.vm.pendingImages()).toHaveLength(1)
        expect(session.frames.sent.map((row) => row.message)).toEqual([
          FillAndSubmit.make({
            prompt: "hi",
            images: image === undefined ? [] : [image],
          }),
          FillAndSubmit.make({
            prompt: "hi",
            images: image === undefined ? [] : [image],
          }),
        ])
        session.vm.setDraft("")
        if (image !== undefined) {
          session.vm.removeImage(image.id)
        }
        expect(session.vm.pendingImages()).toEqual([])
        replyOk(session.replies, claude, "submitted")
        const start = session.frames.sent.length
        yield* session.vm.retryFailed().pipe(Effect.provide(session.layer))
        const retried = session.frames.sent.slice(start)
        expect(retried.map((row) => row.target.panelId)).toEqual(["panel-2"])
        expect(retried.map((row) => row.message)).toEqual([
          FillAndSubmit.make({
            prompt: "hi",
            images: image === undefined ? [] : [image],
          }),
        ])
        expect(session.vm.pendingImages()).toEqual([])
        expect(session.vm.draft()).toBe("")
        expect(session.vm.canRetry()).toBe(false)
        session.dispose()
      }),
  )

  it.effect("a failed fill retries the prompt and does not attach images", () =>
    Effect.gen(function* () {
      const session = openRetrySession()
      replyOk(session.replies, chatgpt, "filled")
      replyMiss(session.replies, claude)
      session.vm.setDraft("hi")
      yield* session.vm
        .addImageFiles([pngFile("a.png")])
        .pipe(Effect.provide(session.layer))
      yield* session.vm.fill().pipe(Effect.provide(session.layer))
      const start = session.frames.sent.length
      yield* session.vm.retryFailed().pipe(Effect.provide(session.layer))
      const retried = session.frames.sent.slice(start)
      expect(retried.map((row) => row.target.panelId)).toEqual(["panel-2"])
      expect(retried.map((row) => row.message)).toEqual([
        FillComposer.make({ prompt: "hi" }),
      ])
      expect(session.vm.pendingImages()).toHaveLength(1)
      session.dispose()
    }),
  )

  it.effect("a successful sendAll clears images and leaves canRetry false", () =>
    Effect.gen(function* () {
      const session = openRetrySession()
      replyOk(session.replies, chatgpt, "submitted")
      replyOk(session.replies, claude, "submitted")
      session.vm.setDraft("hi")
      yield* session.vm
        .addImageFiles([pngFile("a.png")])
        .pipe(Effect.provide(session.layer))
      yield* session.vm.sendAll().pipe(Effect.provide(session.layer))
      expect(session.vm.canRetry()).toBe(false)
      expect(session.vm.pendingImages()).toEqual([])
      expect(session.vm.draft()).toBe("")
      session.dispose()
    }),
  )

  it.effect("a successful retry returns focus and keeps the draft", () =>
    Effect.gen(function* () {
      const session = openRetrySession()
      const prompt = watchPrompt(session.vm, "hi")
      replyOk(session.replies, chatgpt, "filled")
      replyMiss(session.replies, claude)
      yield* session.vm.fill().pipe(Effect.provide(session.layer))
      prompt.focus.mockClear()
      replyOk(session.replies, claude, "filled")
      yield* session.vm.retryFailed().pipe(Effect.provide(session.layer))
      expect(prompt.focus).toHaveBeenCalledTimes(1)
      expect(prompt.focus).toHaveBeenCalledWith({ preventScroll: true })
      expect(prompt.textarea.selectionStart).toBe("hi".length)
      expect(session.vm.draft()).toBe("hi")
      expect(session.vm.canRetry()).toBe(false)
      session.dispose()
    }),
  )

  it.effect("a retry that still fails returns focus and keeps the draft", () =>
    Effect.gen(function* () {
      const session = openRetrySession()
      const prompt = watchPrompt(session.vm, "hi")
      replyOk(session.replies, chatgpt, "filled")
      replyMiss(session.replies, claude)
      yield* session.vm.fill().pipe(Effect.provide(session.layer))
      prompt.focus.mockClear()
      yield* session.vm.retryFailed().pipe(Effect.provide(session.layer))
      expect(prompt.focus).toHaveBeenCalledWith({ preventScroll: true })
      expect(session.vm.draft()).toBe("hi")
      expect(session.vm.canRetry()).toBe(true)
      session.dispose()
    }),
  )
})

const pngFile = (name: string): File =>
  new File([Uint8Array.of(1)], name, { type: "image/png" })

const watchPrompt = (
  vm: {
    readonly setDraft: (text: string) => void
    readonly registerTextarea: (el: HTMLTextAreaElement) => void
  },
  text: string,
) => {
  const textarea = document.createElement("textarea")
  textarea.value = text
  const focus = vi.spyOn(textarea, "focus")
  vm.setDraft(text)
  vm.registerTextarea(textarea)
  return { textarea, focus }
}
