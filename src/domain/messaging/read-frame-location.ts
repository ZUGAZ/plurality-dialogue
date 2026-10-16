import { Schema } from "effect"

export const ReadFrameLocation = Schema.TaggedStruct("ReadFrameLocation", {})

export type ReadFrameLocation = typeof ReadFrameLocation.Type

export const isReadFrameLocation = Schema.is(ReadFrameLocation)
