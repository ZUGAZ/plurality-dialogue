import { Either, Schema } from "effect"

export const EnterKeyPreset = Schema.Literal(
  "default",
  "swapped",
  "slack",
  "custom",
)

export type EnterKeyPreset = typeof EnterKeyPreset.Type

export const isEnterKeyPreset = Schema.is(EnterKeyPreset)

const defaultEnterKeyPreset: EnterKeyPreset = "default"

const decodeEnterKeyPreset = (input: unknown): EnterKeyPreset =>
  Either.getOrElse(Schema.decodeUnknownEither(EnterKeyPreset)(input), () =>
    defaultEnterKeyPreset,
  )

// Invalid values stay inside this field. They must not fail the document.
export const lenientEnterKeyPreset = Schema.transform(
  Schema.Unknown,
  EnterKeyPreset,
  {
    strict: true,
    decode: (input) => decodeEnterKeyPreset(input),
    encode: (preset) => preset,
  },
)
