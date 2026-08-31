import { Effect, Either, Option, Schema, pipe } from "effect"
import { Storage } from "../ports/storage"
import {
  WorkspaceSettings,
  decodeWorkspaceSettings,
  defaultWorkspaceSettings,
  workspaceSettingsStorageKey,
} from "./workspace-settings"

export const loadWorkspaceSettings = Effect.fn("loadWorkspaceSettings")(
  function* () {
    const storage = yield* Storage
    const stored = yield* storage.get(workspaceSettingsStorageKey).pipe(
      Effect.orElseSucceed(() => Option.none<unknown>()),
    )
    return pipe(
      stored,
      Option.match({
        onNone: () => defaultWorkspaceSettings,
        onSome: (value) =>
          pipe(
            decodeWorkspaceSettings(value),
            Either.match({
              onLeft: () => defaultWorkspaceSettings,
              onRight: (decoded) => decoded,
            }),
          ),
      }),
    )
  },
)

export const persistWorkspaceSettings = Effect.fn("persistWorkspaceSettings")(
  function* (settings: WorkspaceSettings) {
    const storage = yield* Storage
    const encoded = yield* Schema.encode(WorkspaceSettings)(settings)
    return yield* storage.set(workspaceSettingsStorageKey, encoded)
  },
)
