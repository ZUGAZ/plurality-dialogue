import { Effect, Fiber, TestClock } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { dialogueEnginePanelId } from "@domain/dialogue/engine-panel-id"
import { loadDialogueTranscript } from "@domain/dialogue/load-dialogue-transcript"
import { PanelCaptureOk } from "@domain/messaging/panel-capture-ok"
import { PanelCommandErr } from "@domain/messaging/panel-command-err"
import {
  ada,
  adaSay,
  bea,
  beaSay,
  cy,
  runFloor,
  threePlusYou,
  turnWait,
} from "./view-model-session"

const stampedAt = "2026-10-25T15:04:00.000Z"

const stamp = TestClock.setTime(Date.parse(stampedAt))

describe("dialogue floor view-model", () => {
  it.effect("after entering running, chips show the cast and the topic is ready to send", () =>
    runFloor(
      (session) =>
        Effect.sync(() => {
          expect(session.vm.floorState()).toEqual({ cursor: 0, busy: false })
          expect(session.vm.composerDraft()).toBe("")
          session.setPhase("running")
          expect(session.vm.chips().map((chip) => chip.label)).toEqual([
            "Ada",
            "Bea",
            "Cy",
            "You",
          ])
          expect(session.vm.floorState().cursor).toBe(3)
          expect(session.vm.cursorIsYou()).toBe(true)
          expect(session.vm.composerDraft()).toBe(threePlusYou.topic)
        }),
      { phase: "setup" },
    ),
  )

  it.effect("does not prefill when the transcript already has a line", () =>
    runFloor(
      (session) =>
        Effect.sync(() => {
          expect(session.vm.floorState().cursor).toBe(3)
          expect(session.vm.composerDraft()).toBe("")
        }),
      {
        transcript: {
          entries: [{ speaker: "You", text: "Heat", at: stampedAt }],
        },
      },
    ),
  )

  it.effect("starts at the first vendor when you are absent", () =>
    runFloor(
      (session) =>
        Effect.sync(() => {
          expect(session.vm.floorState().cursor).toBe(0)
          expect(session.vm.cursorIsYou()).toBe(false)
          expect(session.vm.composerDraft()).toBe("")
          expect(session.vm.chips()).toHaveLength(3)
        }),
      { setup: { topic: "Heat", cast: [ada, bea, cy] } },
    ),
  )

  it.effect("send appends your line and advances off you", () =>
    runFloor((session) =>
      Effect.gen(function* () {
        yield* stamp
        yield* session.vm.next()
        expect(session.sent).toHaveLength(0)
        yield* session.vm.sendUserLine("   ")
        expect(session.transcript().entries).toEqual([])
        expect(session.vm.composerDraft()).toBe(threePlusYou.topic)
        expect(session.vm.floorState().cursor).toBe(3)
        yield* session.vm.sendUserLine("  Hello  ")
        expect(session.transcript().entries).toEqual([
          { speaker: "You", text: "Hello", at: stampedAt },
        ])
        expect(yield* loadDialogueTranscript()).toEqual(session.transcript())
        expect(session.vm.floorState()).toEqual({ cursor: 0, busy: false })
        expect(session.vm.composerDraft()).toBe("")
        expect(session.reloads()).toBe(1)
      }),
    ),
  )

  it.effect("pin then next runs one turn, then the next seat can speak", () =>
    runFloor((session) =>
      Effect.gen(function* () {
        yield* stamp
        yield* session.vm.pin(0)
        expect(session.vm.cursorIsYou()).toBe(false)
        yield* session.vm.next()
        yield* session.vm.next()
        expect(session.transcript().entries).toEqual([
          { speaker: "Ada", text: adaSay, at: stampedAt },
          { speaker: "Bea", text: beaSay, at: stampedAt },
        ])
        expect(session.vm.floorState()).toEqual({ cursor: 2, busy: false })
        expect(session.vm.failures()).toEqual([])
        expect(session.sent.map((item) => item.target.panelId)).toEqual([
          dialogueEnginePanelId(0),
          dialogueEnginePanelId(0),
          dialogueEnginePanelId(1),
          dialogueEnginePanelId(1),
        ])
        expect(session.reloads()).toBe(2)
      }),
    ),
  )

  it.effect("a command error keeps the cursor and shows the reason", () =>
    runFloor((session) =>
      Effect.gen(function* () {
        yield* stamp
        session.replies.set(
          dialogueEnginePanelId(0),
          PanelCommandErr.make({
            providerId: "chatgpt",
            panelId: dialogueEnginePanelId(0),
            reason: "composer-not-found",
          }),
        )
        yield* session.vm.pin(0)
        yield* session.vm.next()
        expect(session.vm.floorState()).toEqual({ cursor: 0, busy: false })
        expect(session.transcript().entries).toEqual([])
        expect(session.vm.failures()).toEqual([
          {
            castIndex: 0,
            reason: "composer-not-found",
            at: stampedAt,
          },
        ])
        expect(session.reloads()).toBe(0)
        expect(session.sent).toHaveLength(1)
        session.setPhase("setup")
        expect(session.vm.failures()).toEqual([])
        expect(session.vm.floorState()).toEqual({ cursor: 0, busy: false })
      }),
    ),
  )

  it.effect("a non-json reply shows the raw capture and retry can succeed", () =>
    runFloor((session) =>
      Effect.gen(function* () {
        yield* stamp
        const panelId = dialogueEnginePanelId(0)
        session.captures.set(
          panelId,
          PanelCaptureOk.make({
            text: "not json",
            providerId: "chatgpt",
            panelId,
          }),
        )
        yield* session.vm.pin(0)
        yield* session.vm.next()
        expect(session.vm.floorState().cursor).toBe(0)
        expect(session.vm.failures()).toEqual([
          {
            castIndex: 0,
            reason: "format-failure",
            raw: "not json",
            at: stampedAt,
          },
        ])
        expect(session.transcript().entries).toEqual([])
        session.captures.set(
          panelId,
          PanelCaptureOk.make({
            text: JSON.stringify({ say: adaSay }),
            providerId: "chatgpt",
            panelId,
          }),
        )
        yield* session.vm.next()
        expect(session.vm.failures()).toEqual([])
        expect(session.transcript().entries).toEqual([
          { speaker: "Ada", text: adaSay, at: stampedAt },
        ])
        expect(session.vm.floorState()).toEqual({ cursor: 1, busy: false })
      }),
    ),
  )

  it.effect("pin, next, and send wait until the turn settles", () =>
    runFloor(
      (session) =>
        Effect.gen(function* () {
          yield* stamp
          yield* session.vm.pin(0)
          const fiber = yield* Effect.fork(session.vm.next())
          yield* TestClock.adjust("1 millis")
          expect(session.vm.floorState().busy).toBe(true)
          yield* session.vm.pin(2)
          expect(session.vm.floorState().cursor).toBe(0)
          session.vm.setComposerDraft("nope")
          yield* session.vm.sendUserLine("nope")
          yield* session.vm.next()
          expect(session.vm.composerDraft()).toBe("nope")
          yield* TestClock.adjust(turnWait)
          yield* Fiber.join(fiber)
          expect(session.vm.floorState()).toEqual({ cursor: 1, busy: false })
          const entry = session.transcript().entries[0]
          expect(entry?.speaker).toBe("Ada")
          expect(entry?.text).toBe(adaSay)
          expect(session.sent).toHaveLength(2)
          expect(session.reloads()).toBe(1)
        }),
      { delay: "turn" },
    ),
  )

  it.effect("leaving while busy discards the turn", () =>
    runFloor(
      (session) =>
        Effect.gen(function* () {
          yield* session.vm.pin(0)
          const generation = session.vm.turnGeneration()
          const fiber = yield* Effect.fork(session.vm.next())
          yield* TestClock.adjust("1 millis")
          expect(session.vm.floorState().busy).toBe(true)
          session.setPhase("setup")
          expect(session.vm.turnGeneration()).toBe(generation + 1)
          expect(session.vm.floorState()).toEqual({ cursor: 0, busy: false })
          expect(session.vm.failures()).toEqual([])
          yield* TestClock.adjust(turnWait)
          yield* Fiber.join(fiber)
          expect(session.transcript().entries).toEqual([])
          expect(yield* loadDialogueTranscript()).toEqual({ entries: [] })
          expect(session.reloads()).toBe(0)
          session.setPhase("running")
          expect(session.transcript().entries).toEqual([])
          expect(session.vm.floorState()).toEqual({ cursor: 3, busy: false })
        }),
      { delay: "turn" },
    ),
  )
})
