import { Effect, Layer } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { makeCapturingLogger } from "@test-support/capturing-logger"
import { PanelTarget } from "@domain/broadcast/panel-target"
import { isOpenTemporaryChat } from "@domain/broadcast/commands/open-temporary-chat"
import { PanelCommandOk } from "@domain/messaging/panel-command-ok"
import type { PanelCommandResponse } from "@domain/messaging/panel-command-response"
import {
  inMemoryMessagingLayer,
  type RecordedFrameSend,
} from "@domain/ports/in-memory-messaging"
import type { Messaging } from "@domain/ports/messaging"
import {
  wireTemporaryChat,
  type TemporaryChatWireHost,
} from "./wire-temporary-chat"

const frame = (
  panelId: string,
  frameId: number,
  providerId: "chatgpt" | "claude" | "gemini",
) => PanelTarget.make({ panelId, providerId, tabId: 1, frameId })

describe("wire temporary chat", () => {
  it.effect("toggle on sends one command per frame and one log", () =>
    Effect.gen(function* () {
      const session = fakeHost(false)
      const wire = wireTemporaryChat(session.host)
      wire.onToggle()
      expect(session.forget).toEqual([[]])
      expect(session.clearStatus).toBe(0)
      expect(session.setDraft).toBe(0)
      expect(session.focusPrompt).toBe(0)
      const recorded = yield* runRecorded(session.runs)
      expect(recorded.messages).toEqual([["temporary chat", true]])
      expect(recorded.sent).toHaveLength(2)
      expect(
        recorded.sent.every((row) => isOpenTemporaryChat(row.message)),
      ).toBe(true)
      expect(recorded.sent.map((row) => row.target.panelId)).toEqual([
        "panel-1",
        "panel-2",
      ])
    }),
  )

  it.effect("toggle off clears status, forgets remounted ids, and does not send", () =>
    Effect.gen(function* () {
      const session = fakeHost(true)
      const wire = wireTemporaryChat(session.host)
      wire.onToggle()
      expect(session.forget).toEqual([["panel-1", "panel-2"]])
      expect(session.clearStatus).toBe(1)
      expect(session.setDraft).toBe(0)
      expect(session.focusPrompt).toBe(0)
      expect(session.host.temporaryChat()).toBe(false)
      const recorded = yield* runRecorded(session.runs)
      expect(recorded.messages).toEqual([["temporary chat", false]])
      expect(recorded.sent).toEqual([])
    }),
  )

  it.effect("a hello while off sends nothing", () =>
    Effect.gen(function* () {
      const session = fakeHost(false)
      const wire = wireTemporaryChat(session.host)
      wire.onFrameHello(frame("panel-1", 10, "chatgpt"))
      expect(session.runs).toHaveLength(0)
    }),
  )

  it.effect("a hello while on sends once and the same key does not send again", () =>
    Effect.gen(function* () {
      const session = fakeHost(true)
      const wire = wireTemporaryChat(session.host)
      const hello = frame("panel-1", 10, "chatgpt")
      wire.onFrameHello(hello)
      wire.onFrameHello(hello)
      const recorded = yield* runRecorded(session.runs)
      expect(recorded.sent).toHaveLength(1)
      expect(isOpenTemporaryChat(recorded.sent[0]?.message)).toBe(true)
    }),
  )

  it.effect("a hello after reloadGeneration changes sends one more command", () =>
    Effect.gen(function* () {
      const session = fakeHost(true)
      const wire = wireTemporaryChat(session.host)
      const hello = frame("panel-1", 10, "chatgpt")
      wire.onFrameHello(hello)
      session.setGeneration(1)
      wire.onFrameHello(hello)
      const recorded = yield* runRecorded(session.runs)
      expect(recorded.sent).toHaveLength(2)
      expect(
        recorded.sent.every((row) => isOpenTemporaryChat(row.message)),
      ).toBe(true)
    }),
  )
})

const fakeHost = (initialEnabled: boolean) => {
  let enabled = initialEnabled
  let generation = 0
  const frames = [
    frame("panel-1", 10, "chatgpt"),
    frame("panel-2", 11, "claude"),
  ]
  const forget: (readonly string[])[] = []
  const runs: Effect.Effect<unknown, never, Messaging>[] = []
  const counters = { clearStatus: 0, setDraft: 0, focusPrompt: 0 }
  const host = {
    temporaryChat: () => enabled,
    applyTemporaryChat: (next: boolean): readonly string[] => {
      enabled = next
      return next ? [] : ["panel-1", "panel-2"]
    },
    panels: () => [
      { id: "panel-1", reloadGeneration: generation },
      { id: "panel-2", reloadGeneration: generation },
    ],
    frames: () => frames,
    forgetFrames: (panelIds: readonly string[]) => {
      forget.push(panelIds)
    },
    clearStatus: () => {
      counters.clearStatus += 1
    },
    setDraft: () => {
      counters.setDraft += 1
    },
    focusPrompt: () => {
      counters.focusPrompt += 1
    },
    run: (effect: Effect.Effect<unknown, never, Messaging>) => {
      runs.push(effect)
    },
  } satisfies TemporaryChatWireHost & {
    readonly setDraft: () => void
    readonly focusPrompt: () => void
  }
  return {
    host,
    runs,
    forget,
    get clearStatus() {
      return counters.clearStatus
    },
    get setDraft() {
      return counters.setDraft
    },
    get focusPrompt() {
      return counters.focusPrompt
    },
    setGeneration: (next: number) => {
      generation = next
    },
  }
}

const runRecorded = (
  effects: readonly Effect.Effect<unknown, never, Messaging>[],
) =>
  Effect.gen(function* () {
    const sent: RecordedFrameSend[] = []
    const capturing = makeCapturingLogger()
    const replies = new Map<string, PanelCommandResponse>([
      [
        "panel-1",
        PanelCommandOk.make({
          verb: "temporary-chat",
          providerId: "chatgpt",
          panelId: "panel-1",
        }),
      ],
      [
        "panel-2",
        PanelCommandOk.make({
          verb: "temporary-chat",
          providerId: "claude",
          panelId: "panel-2",
        }),
      ],
    ])
    const layer = Layer.mergeAll(
      inMemoryMessagingLayer(() => Effect.succeed({}), { replies, sent }),
      capturing.layer,
    )
    yield* Effect.forEach(effects, (effect) => effect.pipe(Effect.provide(layer)))
    return { sent, messages: capturing.messages() }
  })
