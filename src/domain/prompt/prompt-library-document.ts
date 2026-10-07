import { Schema } from "effect"
import { Prompt } from "./prompt"

export const PromptLibraryDocument = Schema.Struct({
  version: Schema.Literal(1),
  prompts: Schema.Array(Prompt),
})

export type PromptLibraryDocument = typeof PromptLibraryDocument.Type

export const decodePromptLibraryDocument = Schema.decodeUnknownEither(
  PromptLibraryDocument,
)

export const encodePromptLibraryDocument = Schema.encodeEither(
  PromptLibraryDocument,
)
