import type { Effect, Option } from "effect"
import { Context, Data } from "effect"

export class StorageReadError extends Data.TaggedError("StorageReadError")<{
  readonly key: string
  readonly cause: unknown
}> {}

export class StorageWriteError extends Data.TaggedError("StorageWriteError")<{
  readonly key: string
  readonly cause: unknown
}> {}

export class Storage extends Context.Tag("Storage")<
  Storage,
  {
    readonly get: (
      key: string,
    ) => Effect.Effect<Option.Option<unknown>, StorageReadError>
    readonly set: (
      key: string,
      value: unknown,
    ) => Effect.Effect<void, StorageWriteError>
  }
>() {}
