import { Schema } from "effect"

export const OpenTemporaryChat = Schema.TaggedStruct("OpenTemporaryChat", {})

export type OpenTemporaryChat = typeof OpenTemporaryChat.Type

export const isOpenTemporaryChat = Schema.is(OpenTemporaryChat)
