import { Effect, Layer } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { silentLoggerLayer } from "@test-support/silent-logger"
import { PanelCommandErr } from "../messaging/panel-command-err"
import { PanelCommandOk } from "../messaging/panel-command-ok"
import type { PanelCommandResponse } from "../messaging/panel-command-response"
import {
  inMemoryMessagingLayer,
  type RecordedFrameSend,
} from "../ports/in-memory-messaging"
import { isOpenTemporaryChat } from "./commands/open-temporary-chat"
import { PanelTarget } from "./panel-target"
import { requestTemporaryChat } from "./request-temporary-chat"

const targets: readonly PanelTarget[] = [
  PanelTarget.make({
    panelId: "panel-1",
    providerId: "chatgpt",
    tabId: 1,
    frameId: 10,
  }),
  PanelTarget.make({
    panelId: "panel-2",
    providerId: "claude",
    tabId: 1,
    frameId: 11,
  }),
  PanelTarget.make({
    panelId: "panel-3",
    providerId: "gemini",
    tabId: 1,
    frameId: 12,
  }),
]

describe("requestTemporaryChat", () => {
  it.effect("sends one OpenTemporaryChat per target", () =>
    Effect.gen(function* () {
      const session = recordingSession(okReplies())
      yield* requestTemporaryChat(targets).pipe(Effect.provide(session.layer))
      expect(session.sent).toHaveLength(3)
      expect(
        session.sent.every((row) => isOpenTemporaryChat(row.message)),
      ).toBe(true)
      expect(session.sent.map((row) => row.target.panelId)).toEqual([
        "panel-1",
        "panel-2",
        "panel-3",
      ])
    }),
  )

  it.effect("a PanelCommandErr for one target still sends the others", () =>
    Effect.gen(function* () {
      const replies = okReplies()
      replies.set(
        "panel-2",
        PanelCommandErr.make({
          providerId: "claude",
          panelId: "panel-2",
          reason: "temporary-chat-unavailable",
        }),
      )
      const session = recordingSession(replies)
      yield* requestTemporaryChat(targets).pipe(Effect.provide(session.layer))
      expect(session.sent).toHaveLength(3)
      expect(session.sent.map((row) => row.target.panelId)).toEqual([
        "panel-1",
        "panel-2",
        "panel-3",
      ])
    }),
  )

  it.effect("a MessagingFault for one target still sends the others", () =>
    Effect.gen(function* () {
      const replies = okReplies()
      replies.delete("panel-2")
      const session = recordingSession(replies)
      yield* requestTemporaryChat(targets).pipe(Effect.provide(session.layer))
      expect(session.sent).toHaveLength(3)
      expect(session.sent.map((row) => row.target.panelId)).toEqual([
        "panel-1",
        "panel-2",
        "panel-3",
      ])
    }),
  )
})

const okReplies = (): Map<string, PanelCommandResponse> =>
  new Map(
    targets.map((target) => [
      target.panelId,
      PanelCommandOk.make({
        verb: "temporary-chat",
        providerId: target.providerId,
        panelId: target.panelId,
      }),
    ]),
  )

const recordingSession = (replies: Map<string, PanelCommandResponse>) => {
  const sent: RecordedFrameSend[] = []
  return {
    sent,
    layer: Layer.merge(
      inMemoryMessagingLayer(() => Effect.succeed({}), { replies, sent }),
      silentLoggerLayer,
    ),
  }
}
