import { Effect, Layer } from "effect"
import type { FillAndSubmit } from "../broadcast/commands/fill-and-submit"
import type { FillComposer } from "../broadcast/commands/fill-composer"
import type { PanelTarget } from "../broadcast/panel-target"
import type { PanelCommandResponse } from "../messaging/panel-command-response"
import {
  Messaging,
  MessagingFault,
  type MessagingSendFailed,
} from "./messaging"

export type RecordedFrameSend = {
  readonly target: PanelTarget
  readonly message: FillComposer | FillAndSubmit
}

export type InMemoryFrameMessaging = {
  readonly replies: ReadonlyMap<string, PanelCommandResponse>
  readonly sent: RecordedFrameSend[]
}

export const inMemoryMessagingLayer = (
  responder: (
    message: unknown,
  ) => Effect.Effect<unknown, MessagingSendFailed>,
  frames?: InMemoryFrameMessaging,
) =>
  Layer.succeed(Messaging, {
    send: (message) => responder(message),
    sendToFrame: (target, message) => {
      if (frames === undefined) {
        return Effect.fail(
          new MessagingFault({ cause: "sendToFrame not configured" }),
        )
      }
      frames.sent.push({ target, message })
      const reply = frames.replies.get(target.panelId)
      if (reply === undefined) {
        return Effect.fail(new MessagingFault({ cause: "no reply" }))
      }
      return Effect.succeed(reply)
    },
  })
