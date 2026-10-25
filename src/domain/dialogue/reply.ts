import { Option, Schema } from "effect"
import { extractJsonObject } from "./reply-extract"

// Struct ignores unknown keys, so later protocol fields decode without failure.
export const DialogueReply = Schema.Struct({
  say: Schema.Trim.pipe(Schema.nonEmptyString()),
})

export type DialogueReply = typeof DialogueReply.Type

export const ParsedSay = Schema.TaggedStruct("ParsedSay", {
  say: Schema.Trim.pipe(Schema.nonEmptyString()),
})

export type ParsedSay = typeof ParsedSay.Type

export const FormatFailure = Schema.TaggedStruct("FormatFailure", {
  raw: Schema.String,
})

export type FormatFailure = typeof FormatFailure.Type

export const isParsedSay = Schema.is(ParsedSay)

export const isFormatFailure = Schema.is(FormatFailure)

const decodeReplyJson = Schema.decodeUnknownOption(
  Schema.parseJson(DialogueReply),
)

export const parseDialogueReply = (raw: string): ParsedSay | FormatFailure =>
  extractJsonObject(raw).pipe(
    Option.flatMap(decodeReplyJson),
    Option.match({
      onNone: () => FormatFailure.make({ raw }),
      onSome: (reply) => ParsedSay.make({ say: reply.say }),
    }),
  )
