import { Array, Data, Effect, Either, Option, Schema, pipe } from "effect"
import { Storage } from "../ports/storage"
import {
  RoleCatalog,
  RoleCatalogEntries,
  decodeRole,
  emptyRoleCatalog,
  roleCatalogStorageKey,
  uniqueRoles,
} from "./role"

export class DuplicateRoleId extends Data.TaggedError("DuplicateRoleId")<{
  readonly id: string
}> {}

const decodeEntries = Schema.decodeUnknownEither(RoleCatalogEntries)

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

const firstDuplicateId = (catalog: RoleCatalog): Option.Option<string> =>
  pipe(
    Array.findFirst(
      catalog.roles,
      (role, index) =>
        catalog.roles.findIndex((other) => other.id === role.id) !== index,
    ),
    Option.map((role) => role.id),
  )

export const loadRoleCatalog = Effect.fn("loadRoleCatalog")(function* () {
  const storage = yield* Storage
  const stored = yield* storage
    .get(roleCatalogStorageKey)
    .pipe(Effect.orElseSucceed(() => Option.none<unknown>()))
  return Option.match(stored, {
    onNone: () => emptyRoleCatalog,
    onSome: catalogFromStored,
  })
})

export const persistRoleCatalog = Effect.fn("persistRoleCatalog")(function* (
  catalog: RoleCatalog,
) {
  const storage = yield* Storage
  const duplicate = firstDuplicateId(catalog)
  if (Option.isSome(duplicate)) {
    return yield* Effect.fail(new DuplicateRoleId({ id: duplicate.value }))
  }
  const encoded = yield* Schema.encode(RoleCatalog)(catalog)
  return yield* storage.set(roleCatalogStorageKey, encoded)
})
