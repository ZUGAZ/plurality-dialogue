import { Schema } from "effect"

export const FrameLocation = Schema.TaggedStruct("FrameLocation", {
  href: Schema.String.pipe(Schema.nonEmptyString()),
})

export type FrameLocation = typeof FrameLocation.Type

export const isFrameLocation = Schema.is(FrameLocation)
