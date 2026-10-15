import { Either, Schema } from "effect"

export const EnterKeyChoice = Schema.Literal("insert-newline", "submit")

export type EnterKeyChoice = typeof EnterKeyChoice.Type

export const EnterKeyCustom = Schema.Struct({
  enter: EnterKeyChoice,
  shiftEnter: EnterKeyChoice,
  ctrlEnter: EnterKeyChoice,
})

export type EnterKeyCustom = typeof EnterKeyCustom.Type

export const defaultEnterKeyCustom: EnterKeyCustom = {
  enter: "insert-newline",
  shiftEnter: "submit",
  ctrlEnter: "submit",
}

const isFieldRecord = (
  input: unknown,
): input is { readonly [key: string]: unknown } =>
  typeof input === "object" && input !== null && !Array.isArray(input)

const decodeChoice = (
  input: unknown,
  fallback: EnterKeyChoice,
): EnterKeyChoice =>
  Either.getOrElse(Schema.decodeUnknownEither(EnterKeyChoice)(input), () =>
    fallback,
  )

// A bad field falls back on its own. A non-object replaces the whole map.
const decodeEnterKeyCustom = (input: unknown): EnterKeyCustom => {
  if (!isFieldRecord(input)) {
    return defaultEnterKeyCustom
  }
  return {
    enter: decodeChoice(input.enter, defaultEnterKeyCustom.enter),
    shiftEnter: decodeChoice(
      input.shiftEnter,
      defaultEnterKeyCustom.shiftEnter,
    ),
    ctrlEnter: decodeChoice(input.ctrlEnter, defaultEnterKeyCustom.ctrlEnter),
  }
}

export const lenientEnterKeyCustom = Schema.transform(
  Schema.Unknown,
  EnterKeyCustom,
  {
    strict: true,
    decode: (input) => decodeEnterKeyCustom(input),
    encode: (custom) => custom,
  },
)
