import { Schema } from "effect"
import { FillAndSubmit } from "./fill-and-submit"
import { FillComposer } from "./fill-composer"

export const BroadcastCommand = Schema.Union(FillComposer, FillAndSubmit)

export type BroadcastCommand = typeof BroadcastCommand.Type

export const isBroadcastCommand = Schema.is(BroadcastCommand)
