import { Array, Option, Schema } from "effect"

export const RoleId = Schema.Trim.pipe(Schema.nonEmptyString())

export type RoleId = typeof RoleId.Type

const trimmedNonEmpty = Schema.Trim.pipe(Schema.nonEmptyString())

export const Role = Schema.Struct({
  id: RoleId,
  name: trimmedNonEmpty,
  instruction: trimmedNonEmpty,
})

export type Role = typeof Role.Type

export const RoleCatalog = Schema.Struct({
  roles: Schema.Array(Role),
})

export type RoleCatalog = typeof RoleCatalog.Type

// Load-only boundary shape: a bad element stays unknown until `decodeRole`,
// so one corrupt row cannot drop its valid siblings.
export const RoleCatalogEntries = Schema.Struct({
  roles: Schema.Array(Schema.Unknown),
})

export const emptyRoleCatalog: RoleCatalog = { roles: [] }

export const roleCatalogStorageKey = "role-catalog"

export const decodeRole = Schema.decodeUnknownEither(Role)

export const roleById = (
  catalog: RoleCatalog,
  id: string,
): Option.Option<Role> =>
  Array.findFirst(catalog.roles, (role) => role.id === id)

export const uniqueRoles = (roles: readonly Role[]): readonly Role[] =>
  Array.dedupeWith(roles, (left, right) => left.id === right.id)
