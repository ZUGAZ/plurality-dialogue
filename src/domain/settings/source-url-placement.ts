import { Schema } from "effect"

export const SourceUrlPlacement = Schema.Literal("omit", "before", "after")

export type SourceUrlPlacement = typeof SourceUrlPlacement.Type

export const isSourceUrlPlacement = Schema.is(SourceUrlPlacement)
