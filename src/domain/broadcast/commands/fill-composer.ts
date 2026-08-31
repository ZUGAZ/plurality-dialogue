import { Schema } from "effect"

export const FillComposer = Schema.TaggedStruct("FillComposer", {
  prompt: Schema.Trim.pipe(Schema.nonEmptyString()),
})

export type FillComposer = typeof FillComposer.Type

export const isFillComposer = Schema.is(FillComposer)
