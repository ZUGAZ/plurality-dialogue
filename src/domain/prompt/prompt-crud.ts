import { Array, Data, Effect, Either, Option, Schema, pipe } from "effect"
import { PromptLibrary } from "../ports/prompt-library"
import {
  Prompt,
  decodeCreatePromptInput,
  decodePrompt,
  decodeUpdatePromptPatch,
  normalizeTags,
} from "./prompt"

export class PromptNotFound extends Data.TaggedError("PromptNotFound")<{
  readonly id: string
}> {}

const liftEither = <A, E>(either: Either.Either<A, E>) =>
  Either.match(either, {
    onLeft: (error) => Effect.fail(error),
    onRight: (value) => Effect.succeed(value),
  })

const loadPrompt = (id: string) =>
  Effect.gen(function* () {
    const library = yield* PromptLibrary
    const stored = yield* library.get(id)
    return yield* Option.match(stored, {
      onNone: () => Effect.fail(new PromptNotFound({ id })),
      onSome: (value) =>
        Either.match(decodePrompt(value), {
          onLeft: () => Effect.fail(new PromptNotFound({ id })),
          onRight: (prompt) => Effect.succeed(prompt),
        }),
    })
  })

const storePrompt = (prompt: Prompt) =>
  Effect.gen(function* () {
    const library = yield* PromptLibrary
    const encoded = yield* Schema.encode(Prompt)(prompt)
    yield* library.put(encoded)
  })

export const listPrompts = Effect.fn("listPrompts")(function* () {
  const library = yield* PromptLibrary
  const stored = yield* library.getAll()
  return pipe(
    stored,
    Array.filterMap((value) =>
      pipe(
        decodePrompt(value),
        Either.match({
          onLeft: () => Option.none(),
          onRight: Option.some,
        }),
      ),
    ),
  )
})

export const createPrompt = Effect.fn("createPrompt")(function* (
  input: unknown,
) {
  const decoded = yield* liftEither(decodeCreatePromptInput(input))
  const now = yield* Effect.sync(() => Date.now())
  const id = yield* Effect.sync(() => crypto.randomUUID())
  const prompt: Prompt = {
    id,
    title: decoded.title,
    body: decoded.body,
    tags: normalizeTags(decoded.tags ?? []),
    favorite: false,
    createdAt: now,
    updatedAt: now,
  }
  yield* storePrompt(prompt)
  return prompt
})

export const updatePrompt = Effect.fn("updatePrompt")(function* (
  id: string,
  patch: unknown,
) {
  const existing = yield* loadPrompt(id)
  const decoded = yield* liftEither(decodeUpdatePromptPatch(patch))
  const updatedAt = yield* Effect.sync(() => Date.now())
  const prompt: Prompt = {
    ...existing,
    title: decoded.title,
    body: decoded.body,
    tags: normalizeTags(decoded.tags),
    updatedAt,
  }
  yield* storePrompt(prompt)
  return prompt
})

export const deletePrompt = Effect.fn("deletePrompt")(function* (id: string) {
  const library = yield* PromptLibrary
  const stored = yield* library.get(id)
  // A missing key is not found. A present value is removed even when it
  // does not decode, so a corrupt record can be deleted.
  yield* Option.match(stored, {
    onNone: () => Effect.fail(new PromptNotFound({ id })),
    onSome: () => library.delete(id),
  })
})

export const setPromptFavorite = Effect.fn("setPromptFavorite")(function* (
  id: string,
  favorite: boolean,
) {
  const existing = yield* loadPrompt(id)
  const updatedAt = yield* Effect.sync(() => Date.now())
  const prompt: Prompt = {
    ...existing,
    favorite,
    updatedAt,
  }
  yield* storePrompt(prompt)
  return prompt
})

export const touchPromptUsed = Effect.fn("touchPromptUsed")(function* (
  id: string,
) {
  const existing = yield* loadPrompt(id)
  const lastUsedAt = yield* Effect.sync(() => Date.now())
  const prompt: Prompt = {
    ...existing,
    lastUsedAt,
  }
  yield* storePrompt(prompt)
  return prompt
})
