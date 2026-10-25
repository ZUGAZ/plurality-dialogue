import { Effect } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { FillAndSubmit } from "./commands/fill-and-submit"
import { ComposerEmpty } from "./errors"
import { isPanelFailed } from "./panel-failed"
import { isPanelSucceeded } from "./panel-succeeded"
import { PanelTarget } from "./panel-target"
import { sendPanelFillAndSubmit } from "./send-panel-fill-and-submit"
import { PanelCommandErr } from "../messaging/panel-command-err"
import { PanelCommandOk } from "../messaging/panel-command-ok"
import type { PanelCommandResponse } from "../messaging/panel-command-response"
import {
  inMemoryMessagingLayer,
  type RecordedFrameSend,
} from "../ports/in-memory-messaging"

const target = PanelTarget.make({
  panelId: "panel-1",
  providerId: "chatgpt",
  tabId: 1,
  frameId: 10,
})

const sessionReplying = (response: PanelCommandResponse) => {
  const sent: RecordedFrameSend[] = []
  const layer = inMemoryMessagingLayer(() => Effect.succeed({}), {
    replies: new Map([["panel-1", response]]),
    sent,
  })
  return { sent, layer }
}

describe("sendPanelFillAndSubmit", () => {
  it.effect("sends exactly one FillAndSubmit with the text and no images", () =>
    Effect.gen(function* () {
      const session = sessionReplying(
        PanelCommandOk.make({
          verb: "submitted",
          providerId: "chatgpt",
          panelId: "panel-1",
        }),
      )
      const result = yield* sendPanelFillAndSubmit(target, "line one\nline two").pipe(
        Effect.provide(session.layer),
      )
      expect(isPanelSucceeded(result)).toBe(true)
      expect(session.sent).toEqual([
        {
          target,
          message: FillAndSubmit.make({
            prompt: "line one\nline two",
            images: [],
          }),
        },
      ])
    }),
  )

  it.effect("returns the panel failure for a vendor error", () =>
    Effect.gen(function* () {
      const session = sessionReplying(
        PanelCommandErr.make({
          providerId: "chatgpt",
          panelId: "panel-1",
          reason: "submit-disabled",
        }),
      )
      const result = yield* sendPanelFillAndSubmit(target, "hello").pipe(
        Effect.provide(session.layer),
      )
      expect(isPanelFailed(result) && result.reason).toBe("submit-disabled")
      expect(session.sent).toHaveLength(1)
    }),
  )

  it.effect("a blank prompt fails ComposerEmpty before any send", () =>
    Effect.gen(function* () {
      const session = sessionReplying(
        PanelCommandOk.make({
          verb: "submitted",
          providerId: "chatgpt",
          panelId: "panel-1",
        }),
      )
      const error = yield* sendPanelFillAndSubmit(target, " \n ").pipe(
        Effect.provide(session.layer),
        Effect.flip,
      )
      expect(error).toBeInstanceOf(ComposerEmpty)
      expect(session.sent).toHaveLength(0)
    }),
  )
})
