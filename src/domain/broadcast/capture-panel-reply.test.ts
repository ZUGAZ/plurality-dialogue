import { Effect } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { CaptureReply } from "./commands/capture-reply"
import { capturePanelReply } from "./capture-panel-reply"
import { isPanelCaptureFailed } from "./panel-capture-failed"
import { isPanelCaptureSucceeded } from "./panel-capture-succeeded"
import { PanelTarget } from "./panel-target"
import { PanelCaptureOk } from "../messaging/panel-capture-ok"
import { PanelCommandErr } from "../messaging/panel-command-err"
import { inMemoryMessagingLayer, type RecordedFrameSend } from "../ports/in-memory-messaging"

const target = PanelTarget.make({
  panelId: "panel-1",
  providerId: "chatgpt",
  tabId: 7,
  frameId: 3,
})

describe("capturePanelReply", () => {
  it.effect("returns trimmed text and records CaptureReply", () =>
    Effect.gen(function* () {
      const sent: RecordedFrameSend[] = []
      const outcome = yield* capturePanelReply(target).pipe(
        Effect.provide(
          inMemoryMessagingLayer(() => Effect.succeed({}), {
            replies: new Map(),
            captureReplies: new Map([
              [
                "panel-1",
                PanelCaptureOk.make({
                  text: "hello",
                  providerId: "chatgpt",
                  panelId: "panel-1",
                }),
              ],
            ]),
            sent,
          }),
        ),
      )
      expect(isPanelCaptureSucceeded(outcome)).toBe(true)
      if (isPanelCaptureSucceeded(outcome)) {
        expect(outcome.text).toBe("hello")
        expect(outcome.panelId).toBe("panel-1")
        expect(outcome.providerId).toBe("chatgpt")
      }
      expect(sent).toEqual([{ target, message: CaptureReply.make({}) }])
    }),
  )

  it.effect("maps reply-not-found", () =>
    Effect.gen(function* () {
      const outcome = yield* capturePanelReply(target).pipe(
        Effect.provide(replies(PanelCommandErr.make({
          providerId: "chatgpt",
          panelId: "panel-1",
          reason: "reply-not-found",
        }))),
      )
      expect(isPanelCaptureFailed(outcome)).toBe(true)
      if (isPanelCaptureFailed(outcome)) {
        expect(outcome.reason).toBe("reply-not-found")
      }
    }),
  )

  it.effect("a missing capture reply is messaging-failed", () =>
    Effect.gen(function* () {
      const outcome = yield* capturePanelReply(target).pipe(
        Effect.provide(
          inMemoryMessagingLayer(() => Effect.succeed({}), {
            replies: new Map(),
            captureReplies: new Map(),
            sent: [],
          }),
        ),
      )
      expect(isPanelCaptureFailed(outcome)).toBe(true)
      if (isPanelCaptureFailed(outcome)) {
        expect(outcome.reason).toBe("messaging-failed")
      }
    }),
  )
})

const replies = (
  response: ReturnType<typeof PanelCommandErr.make>,
) =>
  inMemoryMessagingLayer(() => Effect.succeed({}), {
    replies: new Map(),
    captureReplies: new Map([["panel-1", response]]),
    sent: [],
  })
