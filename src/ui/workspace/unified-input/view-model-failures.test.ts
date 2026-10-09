// @vitest-environment happy-dom
import { Effect, Layer } from "effect"
import { silentLoggerLayer } from "@test-support/silent-logger"
import { createRoot } from "solid-js"
import { describe, expect, it } from "@effect/vitest"
import { vi } from "vitest"
import { PanelCommandErr } from "@domain/messaging/panel-command-err"
import { PanelFailed } from "@domain/broadcast/panel-failed"
import { PanelTarget } from "@domain/broadcast/panel-target"
import type {
  BroadcastPlan,
  VisiblePanel,
} from "@domain/broadcast/resolve-targets"
import { inMemoryMessagingLayer } from "@domain/ports/in-memory-messaging"
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

describe("unified input view-model", () => {
  it.layer(quiet(inMemoryMessagingLayer(() => Effect.succeed({}))))(
    "frame not ready",
    (it) => {
      it.effect("lists failed panels and keeps draft", () =>
        Effect.gen(function* () {
          const session = openSession(() => ({
            targets: [],
            notReady: [
              PanelFailed.make({
                panelId: "panel-1",
                providerId: "chatgpt",
                reason: "frame-not-ready",
              }),
            ],
          }))
          session.vm.setDraft("hi")
          yield* session.vm.fill()
          expect(session.vm.draft()).toBe("hi")
          expect(session.vm.status()).toEqual({
            kind: "notice",
            text: "Failed: panel-1 (ChatGPT)",
          })
          session.dispose()
        }),
      )

      it.effect("clearStatus returns to idle and keeps the draft", () =>
        Effect.gen(function* () {
          const session = openSession(() => ({
            targets: [],
            notReady: [
              PanelFailed.make({
                panelId: "panel-1",
                providerId: "chatgpt",
                reason: "frame-not-ready",
              }),
            ],
          }))
          session.vm.setDraft("hi")
          yield* session.vm.fill()
          expect(session.vm.statusText()).toBe("Failed: panel-1 (ChatGPT)")
          session.vm.clearStatus()
          expect(session.vm.draft()).toBe("hi")
          expect(session.vm.hasDraft()).toBe(true)
          expect(session.vm.status()).toEqual({ kind: "idle" })
          expect(session.vm.statusText()).toBe("")
          session.dispose()
        }),
      )

      it.effect("returns focus to the prompt when fill fails", () =>
        Effect.gen(function* () {
          const session = openSession(() => ({
            targets: [],
            notReady: [
              PanelFailed.make({
                panelId: "panel-1",
                providerId: "chatgpt",
                reason: "frame-not-ready",
              }),
            ],
          }))
          const prompt = watchPrompt(session.vm, "hi")
          yield* session.vm.fill()
          expect(prompt.focus).toHaveBeenCalledTimes(1)
          expect(prompt.focus).toHaveBeenCalledWith({ preventScroll: true })
          expect(prompt.textarea.selectionStart).toBe("hi".length)
          expect(session.vm.draft()).toBe("hi")
          session.dispose()
        }),
      )
    },
  )

  it.layer(quiet(
    inMemoryMessagingLayer(() => Effect.succeed({}), {
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
    }),
  ))("panel command error", (it) => {
    it.effect("maps a composer miss onto the status line", () =>
      Effect.gen(function* () {
        const session = openSession(() => ({
          targets: [target],
          notReady: [],
        }))
        session.vm.setDraft("hi")
        yield* session.vm.sendAll()
        expect(session.vm.draft()).toBe("hi")
        expect(session.vm.status()).toEqual({
          kind: "notice",
          text: "Failed: panel-1 (ChatGPT)",
        })
        session.dispose()
      }),
    )

    it.effect("returns focus to the prompt when sendAll fails", () =>
      Effect.gen(function* () {
        const session = openSession(() => ({
          targets: [target],
          notReady: [],
        }))
        const prompt = watchPrompt(session.vm, "hi")
        yield* session.vm.sendAll()
        expect(prompt.focus).toHaveBeenCalledTimes(1)
        expect(prompt.focus).toHaveBeenCalledWith({ preventScroll: true })
        expect(prompt.textarea.selectionStart).toBe("hi".length)
        expect(session.vm.draft()).toBe("hi")
        session.dispose()
      }),
    )
  })

  it.layer(quiet(inMemoryMessagingLayer(() => Effect.succeed({}))))(
    "prompt rejected",
    (it) => {
      it.effect("returns focus when fill fails before sending", () =>
        Effect.gen(function* () {
          const session = openSession()
          const prompt = watchPrompt(session.vm, "   ")
          yield* session.vm.fill()
          expect(prompt.focus).toHaveBeenCalledWith({ preventScroll: true })
          expect(prompt.textarea.selectionStart).toBe("   ".length)
          expect(session.vm.draft()).toBe("   ")
          session.dispose()
        }),
      )
    },
  )
})

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
