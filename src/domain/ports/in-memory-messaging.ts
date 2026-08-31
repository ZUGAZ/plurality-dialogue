import type { Effect } from "effect"
import { Layer } from "effect"
import { Messaging, type MessagingSendFailed } from "./messaging"

export const inMemoryMessagingLayer = (
  responder: (
    message: unknown,
  ) => Effect.Effect<unknown, MessagingSendFailed>,
) =>
  Layer.succeed(Messaging, {
    send: (message) => responder(message),
  })
