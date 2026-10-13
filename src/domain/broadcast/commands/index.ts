import { Schema } from "effect"
import { FillAndSubmit } from "./fill-and-submit"
import { FillComposer } from "./fill-composer"
import { OpenTemporaryChat } from "./open-temporary-chat"

export const BroadcastCommand = Schema.Union(
  FillComposer,
  FillAndSubmit,
  OpenTemporaryChat,
)

export type BroadcastCommand = typeof BroadcastCommand.Type

export const isBroadcastCommand = Schema.is(BroadcastCommand)
