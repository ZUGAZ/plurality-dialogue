import { Schema } from "effect"

const nonEmptyString = Schema.String.pipe(Schema.nonEmptyString())

const trimmedTitle = Schema.Trim.pipe(Schema.nonEmptyString())

export const Prompt = Schema.Struct({
  id: nonEmptyString,
  title: nonEmptyString,
  body: Schema.String,
  tags: Schema.Array(Schema.String),
  favorite: Schema.Boolean,
  lastUsedAt: Schema.optional(Schema.Number),
  createdAt: Schema.Number,
  updatedAt: Schema.Number,
})

export type Prompt = typeof Prompt.Type

export const CreatePromptInput = Schema.Struct({
  title: trimmedTitle,
  body: Schema.String,
  tags: Schema.optional(Schema.Array(Schema.String)),
})

export type CreatePromptInput = typeof CreatePromptInput.Type

export const UpdatePromptPatch = Schema.Struct({
  title: trimmedTitle,
  body: Schema.String,
  tags: Schema.Array(Schema.String),
})

export type UpdatePromptPatch = typeof UpdatePromptPatch.Type

export const decodePrompt = Schema.decodeUnknownEither(Prompt)

export const decodeCreatePromptInput =
  Schema.decodeUnknownEither(CreatePromptInput)

export const decodeUpdatePromptPatch =
  Schema.decodeUnknownEither(UpdatePromptPatch)

export const normalizeTags = (tags: readonly string[]): readonly string[] => {
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const tag of tags) {
    const trimmed = tag.trim()
    if (trimmed === "") {
      continue
    }
    const key = trimmed.toLowerCase()
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    normalized.push(trimmed)
  }
  return normalized
}
