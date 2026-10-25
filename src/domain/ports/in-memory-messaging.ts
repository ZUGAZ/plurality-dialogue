import { Effect, Either, Layer, pipe } from "effect"
import type { BroadcastCommand } from "../broadcast/commands"
import { CaptureReply } from "../broadcast/commands/capture-reply"
import type { PanelTarget } from "../broadcast/panel-target"
import { FrameLocation } from "../messaging/frame-location"
import type { PanelCaptureResponse } from "../messaging/panel-capture-response"
import type { PanelCommandResponse } from "../messaging/panel-command-response"
import {
  Messaging,
  MessagingFault,
  type MessagingSendFailed,
} from "./messaging"

export type RecordedFrameSend = {
  readonly target: PanelTarget
  readonly message: BroadcastCommand | CaptureReply
}

export type InMemoryFrameMessaging = {
  readonly replies: ReadonlyMap<string, PanelCommandResponse>
  readonly captureReplies?: ReadonlyMap<string, PanelCaptureResponse>
  readonly sent: RecordedFrameSend[]
  readonly locations?: ReadonlyMap<string, string>
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
    readFrameLocation: (target) => {
      const href = frames?.locations?.get(target.panelId)
      if (href === undefined) {
        return Effect.fail(new MessagingFault({ cause: "no location" }))
      }
      return pipe(
        Either.try({
          try: () => FrameLocation.make({ href }),
          catch: (cause) => new MessagingFault({ cause }),
        }),
        Either.match({
          onLeft: (error) => Effect.fail(error),
          onRight: (location) => Effect.succeed(location),
        }),
      )
    },
    sendCaptureReply: (target) => {
      if (frames === undefined) {
        return Effect.fail(
          new MessagingFault({ cause: "sendCaptureReply not configured" }),
        )
      }
      frames.sent.push({ target, message: CaptureReply.make({}) })
      const reply = frames.captureReplies?.get(target.panelId)
      if (reply === undefined) {
        return Effect.fail(new MessagingFault({ cause: "no capture reply" }))
      }
      return Effect.succeed(reply)
    },
  })
