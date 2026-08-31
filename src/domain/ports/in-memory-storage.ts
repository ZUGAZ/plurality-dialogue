import { Effect, Layer, Option } from "effect"
import { Storage } from "./storage"

export const inMemoryStorageLayer = (
  initial: Readonly<Record<string, unknown>> = {},
) =>
  Layer.sync(Storage, () => {
    const map = new Map<string, unknown>(Object.entries(initial))
    return {
      get: (key: string) => Effect.succeed(Option.fromNullable(map.get(key))),
      set: (key: string, value: unknown) =>
        Effect.sync((): void => {
          map.set(key, value)
        }),
    }
  })
