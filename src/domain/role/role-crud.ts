import { Array, Data, Effect, Either, Option, Schema } from "effect"
import { readRoleCatalogForWrite } from "./read-role-catalog"
import { RoleId, decodeRole, roleById } from "./role"
import type { Role } from "./role"
import { DuplicateRoleId, persistRoleCatalog } from "./role-catalog-storage"

export class RoleNotFound extends Data.TaggedError("RoleNotFound")<{
  readonly id: string
}> {}

const trimmedNonEmpty = Schema.Trim.pipe(Schema.nonEmptyString())

export const UpdateRolePatch = Schema.Struct({
  name: trimmedNonEmpty,
  instruction: trimmedNonEmpty,
})

export type UpdateRolePatch = typeof UpdateRolePatch.Type

export const decodeUpdateRolePatch = Schema.decodeUnknownEither(UpdateRolePatch)

const decodeRoleId = Schema.decodeUnknownEither(RoleId)

const liftEither = <A, E>(either: Either.Either<A, E>) =>
  Either.match(either, {
    onLeft: (error) => Effect.fail(error),
    onRight: (value) => Effect.succeed(value),
  })

const requireRole = (roles: readonly Role[], id: string) =>
  Option.match(roleById({ roles }, id), {
    onNone: () => Effect.fail(new RoleNotFound({ id })),
    onSome: (role) => Effect.succeed(role),
  })

export const createRole = Effect.fn("createRole")(function* (input: unknown) {
  const catalog = yield* readRoleCatalogForWrite()
  const role = yield* liftEither(decodeRole(input))
  if (Option.isSome(roleById(catalog, role.id))) {
    return yield* Effect.fail(new DuplicateRoleId({ id: role.id }))
  }
  yield* persistRoleCatalog({ roles: [...catalog.roles, role] })
  return role
})

export const updateRole = Effect.fn("updateRole")(function* (
  id: unknown,
  patch: unknown,
) {
  const catalog = yield* readRoleCatalogForWrite()
  const roleId = yield* liftEither(decodeRoleId(id))
  const decoded = yield* liftEither(decodeUpdateRolePatch(patch))
  const existing = yield* requireRole(catalog.roles, roleId)
  const updated: Role = {
    id: existing.id,
    name: decoded.name,
    instruction: decoded.instruction,
  }
  yield* persistRoleCatalog({
    roles: Array.map(catalog.roles, (role) =>
      role.id === existing.id ? updated : role,
    ),
  })
  return updated
})

export const deleteRole = Effect.fn("deleteRole")(function* (id: unknown) {
  const catalog = yield* readRoleCatalogForWrite()
  const roleId = yield* liftEither(decodeRoleId(id))
  yield* requireRole(catalog.roles, roleId)
  yield* persistRoleCatalog({
    roles: Array.filter(catalog.roles, (role) => role.id !== roleId),
  })
})
