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

const typographicDoubleQuote = /[\u201C\u201D\u201E\u201F]/g

const decodeReplyJson = Schema.decodeUnknownOption(
  Schema.parseJson(DialogueReply),
)

const straightenDoubleQuotes = (raw: string): string =>
  raw.replace(typographicDoubleQuote, '"')

const readSay = (raw: string): Option.Option<ParsedSay> =>
  extractJsonObject(raw).pipe(
    Option.flatMap(decodeReplyJson),
    Option.map((reply) => ParsedSay.make({ say: reply.say })),
  )

export const parseDialogueReply = (raw: string): ParsedSay | FormatFailure => {
  const straightened = straightenDoubleQuotes(raw)
  return readSay(raw).pipe(
    Option.orElse(() =>
      straightened === raw ? Option.none() : readSay(straightened),
    ),
    Option.match({
      onNone: () => FormatFailure.make({ raw }),
      onSome: (parsed) => parsed,
    }),
  )
}
