import { Effect, Layer, Option } from "effect"
import {
  PromptLibrary,
  PromptLibraryWriteError,
} from "./prompt-library"

const recordId = (value: unknown): string | undefined => {
  if (typeof value !== "object" || value === null) {
    return undefined
  }
  if (!("id" in value)) {
    return undefined
  }
  return typeof value.id === "string" ? value.id : undefined
}

export const inMemoryPromptLibraryLayer = (
  initial?: readonly unknown[],
) =>
  Layer.sync(PromptLibrary, () => {
    const records = new Map<string, unknown>()
    for (const value of initial ?? []) {
      const id = recordId(value)
      if (id !== undefined) {
        records.set(id, value)
      }
    }
    return {
      getAll: () => Effect.succeed([...records.values()]),
      get: (id: string) =>
        Effect.succeed(Option.fromNullable(records.get(id))),
      put: (value: unknown) =>
        Effect.gen(function* () {
          const id = recordId(value)
          if (id === undefined) {
            return yield* Effect.fail(
              new PromptLibraryWriteError({ cause: "missing string id" }),
            )
          }
          yield* Effect.sync(() => {
            records.set(id, value)
          })
        }),
      delete: (id: string) =>
        Effect.sync(() => {
          records.delete(id)
        }),
    }
  })
