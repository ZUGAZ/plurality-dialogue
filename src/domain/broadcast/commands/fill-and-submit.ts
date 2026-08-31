import { Schema } from "effect"

export const FillAndSubmit = Schema.TaggedStruct("FillAndSubmit", {
  prompt: Schema.Trim.pipe(Schema.nonEmptyString()),
})

export type FillAndSubmit = typeof FillAndSubmit.Type

export const isFillAndSubmit = Schema.is(FillAndSubmit)
