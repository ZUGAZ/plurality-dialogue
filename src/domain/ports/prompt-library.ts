import type { Effect, Option } from "effect"
import { Context, Data } from "effect"

export class PromptLibraryReadError extends Data.TaggedError(
  "PromptLibraryReadError",
)<{
  readonly cause: unknown
}> {}

export class PromptLibraryWriteError extends Data.TaggedError(
  "PromptLibraryWriteError",
)<{
  readonly cause: unknown
}> {}

export class PromptLibrary extends Context.Tag("PromptLibrary")<
  PromptLibrary,
  {
    readonly getAll: () => Effect.Effect<
      readonly unknown[],
      PromptLibraryReadError
    >
    readonly get: (
      id: string,
    ) => Effect.Effect<Option.Option<unknown>, PromptLibraryReadError>
    readonly put: (
      value: unknown,
    ) => Effect.Effect<void, PromptLibraryWriteError>
    readonly delete: (
      id: string,
    ) => Effect.Effect<void, PromptLibraryWriteError>
  }
>() {}
