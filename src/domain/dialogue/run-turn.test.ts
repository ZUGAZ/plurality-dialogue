import { Effect, TestClock } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { silentLoggerLayer } from "@test-support/silent-logger"
import { FillAndSubmit } from "../broadcast/commands/fill-and-submit"
import { PanelTarget } from "../broadcast/panel-target"
import { PanelCaptureOk } from "../messaging/panel-capture-ok"
import type { PanelCaptureResponse } from "../messaging/panel-capture-response"
import { PanelCommandErr } from "../messaging/panel-command-err"
import { PanelCommandOk } from "../messaging/panel-command-ok"
import type { PanelCommandResponse } from "../messaging/panel-command-response"
import {
  inMemoryMessagingLayer,
  type RecordedFrameSend,
} from "../ports/in-memory-messaging"
import { buildTurnDocument } from "./turn-document"
import { isTurnFailed, isTurnSucceeded } from "./turn-outcome"
import { runTurn, type RunTurnInput } from "./run-turn"

const target = PanelTarget.make({
  panelId: "panel-1",
  providerId: "chatgpt",
  tabId: 1,
  frameId: 10,
})

const input: RunTurnInput = {
  target,
  speaker: { name: "Skeptic", instruction: "Question the claim." },
  cast: [
    { name: "Skeptic", instruction: "Question the claim.", vendor: "ChatGPT" },
    { name: "Steelman", instruction: "Argue the other side.", vendor: "Claude" },
  ],
  transcript: [
    {
      speaker: "Topic",
      text: "Is coffee healthy?",
      at: "2026-10-24T09:15:00.000Z",
    },
  ],
}

const sendOk = PanelCommandOk.make({
  verb: "submitted",
  providerId: "chatgpt",
  panelId: "panel-1",
})

const captureText = (text: string) =>
  PanelCaptureOk.make({ text, providerId: "chatgpt", panelId: "panel-1" })

const scripted = (
  send: PanelCommandResponse,
  capture: PanelCaptureResponse,
) => {
  const sent: RecordedFrameSend[] = []
  const layer = inMemoryMessagingLayer(() => Effect.succeed({}), {
    replies: new Map([["panel-1", send]]),
    captureReplies: new Map([["panel-1", capture]]),
    sent,
  })
  return { sent, layer }
}

const run = (session: ReturnType<typeof scripted>) =>
  runTurn(input).pipe(
    Effect.provide(session.layer),
    Effect.provide(silentLoggerLayer),
  )

describe("runTurn", () => {
  it.effect("pastes the document, captures, and stamps the entry from the clock", () =>
    Effect.gen(function* () {
      const session = scripted(sendOk, captureText('{"say":"Define healthy."}'))
      yield* TestClock.setTime(Date.parse("2026-10-24T09:20:00.000Z"))
      const outcome = yield* run(session)
      expect(isTurnSucceeded(outcome)).toBe(true)
      if (isTurnSucceeded(outcome)) {
        expect(outcome.entry).toEqual({
          speaker: "Skeptic",
          text: "Define healthy.",
          at: "2026-10-24T09:20:00.000Z",
        })
      }
      expect(session.sent).toHaveLength(2)
      expect(session.sent[0]).toEqual({
        target,
        message: FillAndSubmit.make({
          prompt: buildTurnDocument({
            speaker: input.speaker,
            cast: input.cast,
            transcript: input.transcript,
          }),
          images: [],
        }),
      })
    }),
  )

  it.effect("a send error fails the turn with that reason and does not capture", () =>
    Effect.gen(function* () {
      const session = scripted(
        PanelCommandErr.make({
          providerId: "chatgpt",
          panelId: "panel-1",
          reason: "composer-not-found",
        }),
        captureText('{"say":"never read"}'),
      )
      const outcome = yield* run(session)
      expect(isTurnFailed(outcome)).toBe(true)
      expect(isTurnFailed(outcome) && outcome.reason).toBe("composer-not-found")
      expect(isTurnFailed(outcome) && outcome.raw).toBeUndefined()
      expect(session.sent).toHaveLength(1)
    }),
  )

  it.effect("a missing send reply fails with messaging-failed", () =>
    Effect.gen(function* () {
      const sent: RecordedFrameSend[] = []
      const outcome = yield* runTurn(input).pipe(
        Effect.provide(
          inMemoryMessagingLayer(() => Effect.succeed({}), {
            replies: new Map(),
            captureReplies: new Map(),
            sent,
          }),
        ),
        Effect.provide(silentLoggerLayer),
      )
      expect(isTurnFailed(outcome) && outcome.reason).toBe("messaging-failed")
      expect(sent).toHaveLength(1)
    }),
  )

  it.effect("a capture error fails the turn with the capture reason", () =>
    Effect.gen(function* () {
      const session = scripted(
        sendOk,
        PanelCommandErr.make({
          providerId: "chatgpt",
          panelId: "panel-1",
          reason: "empty-reply",
        }),
      )
      const outcome = yield* run(session)
      expect(isTurnFailed(outcome) && outcome.reason).toBe("empty-reply")
      expect(isTurnFailed(outcome) && outcome.raw).toBeUndefined()
    }),
  )

  it.effect("a reply that is not JSON fails with format-failure and the raw text", () =>
    Effect.gen(function* () {
      const outcome = yield* run(scripted(sendOk, captureText("not json")))
      expect(isTurnFailed(outcome)).toBe(true)
      expect(isTurnFailed(outcome) && outcome.reason).toBe("format-failure")
      expect(isTurnFailed(outcome) && outcome.raw).toBe("not json")
    }),
  )

  it.effect("a blank say fails with format-failure and never becomes an entry", () =>
    Effect.gen(function* () {
      const outcome = yield* run(scripted(sendOk, captureText('{"say":"  "}')))
      expect(isTurnSucceeded(outcome)).toBe(false)
      expect(isTurnFailed(outcome) && outcome.reason).toBe("format-failure")
      expect(isTurnFailed(outcome) && outcome.raw).toBe('{"say":"  "}')
    }),
  )
})
