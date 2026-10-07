import { Effect, Layer } from "effect"
import { silentLoggerLayer } from "@test-support/silent-logger"
import { createRoot } from "solid-js"
import { describe, expect, it } from "@effect/vitest"
import { PanelCommandErr } from "@domain/messaging/panel-command-err"
import { PanelCommandOk } from "@domain/messaging/panel-command-ok"
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
  it("empty draft is not hasDraft", () => {
    const session = openSession()
    expect(session.vm.hasDraft()).toBe(false)
    session.dispose()
  })

  it('typed "hi" is hasDraft', () => {
    const session = openSession()
    session.vm.setDraft("hi")
    expect(session.vm.hasDraft()).toBe(true)
    session.dispose()
  })

  it.effect("clear empties draft and returns to idle", () =>
    Effect.gen(function* () {
      const session = openSession()
      session.vm.setDraft("hi")
      session.vm.clear()
      expect(session.vm.draft()).toBe("")
      expect(session.vm.hasDraft()).toBe(false)
      expect(session.vm.status()).toEqual({ kind: "idle" })
      session.dispose()
    }),
  )

  it.layer(quiet(
    inMemoryMessagingLayer(() => Effect.succeed({}), {
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
    }),
  ))("wired fill", (it) => {
    it.effect("fill keeps draft and stays idle when every panel succeeds", () =>
      Effect.gen(function* () {
        const session = openSession(() => ({
          targets: [target],
          notReady: [],
        }))
        session.vm.setDraft("hi")
        yield* session.vm.fill()
        expect(session.vm.draft()).toBe("hi")
        expect(session.vm.status()).toEqual({ kind: "idle" })
        session.dispose()
      }),
    )
  })

  it.layer(quiet(
    inMemoryMessagingLayer(() => Effect.succeed({}), {
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
    }),
  ))("wired send", (it) => {
    it.effect("sendAll clears draft when every panel succeeds", () =>
      Effect.gen(function* () {
        const session = openSession(() => ({
          targets: [target],
          notReady: [],
        }))
        session.vm.setDraft("hi")
        yield* session.vm.sendAll()
        expect(session.vm.draft()).toBe("")
        expect(session.vm.status()).toEqual({ kind: "idle" })
        session.dispose()
      }),
    )
  })

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
  })
})

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
