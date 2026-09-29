import { Effect, Either, Layer, Schema, pipe } from "effect"
import { BroadcastCommand } from "../../domain/broadcast/commands"
import type { PanelTarget } from "../../domain/broadcast/panel-target"
import { PanelCommandResponse } from "../../domain/messaging/panel-command-response"
import {
  Messaging,
  MessagingFault,
} from "../../domain/ports/messaging"
import { sendFramingHandshake } from "./ensure-framing-on-page"
import { sendMessageToFrame } from "./tabs"

export const ChromeMessagingLive = Layer.succeed(Messaging, {
  send: sendFramingHandshake,
  sendToFrame: (target, message) => sendCommandToFrame(target, message),
})

const sendCommandToFrame = (
  target: PanelTarget,
  message: typeof BroadcastCommand.Type,
): Effect.Effect<typeof PanelCommandResponse.Type, MessagingFault> =>
  pipe(
    Schema.encodeUnknownEither(BroadcastCommand)(message),
    Either.match({
      onLeft: (cause) => Effect.fail(new MessagingFault({ cause })),
      onRight: (encoded) =>
        sendMessageToFrame(target.tabId, target.frameId, encoded).pipe(
          Effect.mapError((cause) => new MessagingFault({ cause })),
          Effect.flatMap((raw) =>
            pipe(
              Schema.decodeUnknownEither(PanelCommandResponse)(raw),
              Either.match({
                onLeft: (cause) => Effect.fail(new MessagingFault({ cause })),
                onRight: (response) => Effect.succeed(response),
              }),
            ),
          ),
        ),
    }),
  )
