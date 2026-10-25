import { Effect, Option } from "effect"
import { Storage } from "../ports/storage"
import { builtInRoles } from "./built-in-roles"
import { readRoleCatalogForWrite } from "./read-role-catalog"
import type { Role, RoleCatalog } from "./role"
import { persistRoleCatalog } from "./role-catalog-storage"

export const builtInRoleRevisionKey = "role-catalog-builtin-revision"

const builtInRoleRevision = 1

// These three shipped first. A missing one in a non-empty catalog is a
// deletion. Later built-ins are added once, then the revision blocks a repeat.
const legacyBuiltInIds: ReadonlySet<string> = new Set([
  "skeptic",
  "steelman",
  "implementer",
])

const previousSkepticInstruction =
  "Question the claim: name the weakest assumption and what evidence would change the conclusion."

const sameRole = (left: Role, right: Role): boolean =>
  left.id === right.id &&
  left.name === right.name &&
  left.instruction === right.instruction

const sameRoles = (left: readonly Role[], right: readonly Role[]): boolean =>
  left.length === right.length &&
  left.every((role, index) => {
    const other = right[index]
    return other !== undefined && sameRole(role, other)
  })

const withCurrentSkeptic = (roles: readonly Role[]): readonly Role[] => {
  const current = builtInRoles.find((role) => role.id === "skeptic")
  if (current === undefined) {
    return roles
  }
  return roles.map((role) =>
    role.id === "skeptic" && role.instruction === previousSkepticInstruction
      ? current
      : role,
  )
}

const addedBuiltIns = (roles: readonly Role[]): readonly Role[] => {
  const present = new Set(roles.map((role) => role.id))
  return builtInRoles.filter(
    (role) => !legacyBuiltInIds.has(role.id) && !present.has(role.id),
  )
}

const adoptNewBuiltIns = (roles: readonly Role[]): readonly Role[] => {
  const refreshed = withCurrentSkeptic(roles)
  return [...refreshed, ...addedBuiltIns(refreshed)]
}

export const seedBuiltInRoles = Effect.fn("seedBuiltInRoles")(function* () {
  const catalog = yield* readRoleCatalogForWrite()
  const storage = yield* Storage
  if (catalog.roles.length === 0) {
    const seeded: RoleCatalog = { roles: [...builtInRoles] }
    yield* persistRoleCatalog(seeded)
    yield* storage.set(builtInRoleRevisionKey, builtInRoleRevision)
    return seeded
  }
  const revision = yield* storage.get(builtInRoleRevisionKey)
  if (Option.isSome(revision)) {
    return catalog
  }
  const roles = adoptNewBuiltIns(catalog.roles)
  if (!sameRoles(roles, catalog.roles)) {
    yield* persistRoleCatalog({ roles })
  }
  yield* storage.set(builtInRoleRevisionKey, builtInRoleRevision)
  return { roles }
})
