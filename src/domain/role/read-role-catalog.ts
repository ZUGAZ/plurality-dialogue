import { Array, Effect, Either, Option, Schema, pipe } from "effect"
import { Storage } from "../ports/storage"
import {
  RoleCatalogEntries,
  decodeRole,
  emptyRoleCatalog,
  roleCatalogStorageKey,
  uniqueRoles,
} from "./role"
import type { RoleCatalog } from "./role"

const decodeEntries = Schema.decodeUnknownEither(RoleCatalogEntries)

// Decode, drop bad elements, keep the first of each id: the same three steps
// as `loadRoleCatalog`. This function exists so a read failure stays a
// failure instead of becoming an empty catalog that a writer then persists.
const catalogFromStored = (stored: unknown): RoleCatalog =>
  pipe(
    decodeEntries(stored),
    Either.match({
      onLeft: () => emptyRoleCatalog,
      onRight: ({ roles }) => ({
        roles: uniqueRoles(
          Array.filterMap(roles, (entry) =>
            Either.match(decodeRole(entry), {
              onLeft: () => Option.none(),
              onRight: Option.some,
            }),
          ),
        ),
      }),
    }),
  )

export const readRoleCatalogForWrite = Effect.fn("readRoleCatalogForWrite")(
  function* () {
    const storage = yield* Storage
    const stored = yield* storage.get(roleCatalogStorageKey)
    return Option.match(stored, {
      onNone: () => emptyRoleCatalog,
      onSome: catalogFromStored,
    })
  },
)
