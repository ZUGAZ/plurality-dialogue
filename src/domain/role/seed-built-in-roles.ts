import { Effect } from "effect"
import { builtInRoles } from "./built-in-roles"
import { readRoleCatalogForWrite } from "./read-role-catalog"
import type { RoleCatalog } from "./role"
import { persistRoleCatalog } from "./role-catalog-storage"

// A non-empty catalog is never backfilled: a missing built-in id there is a
// deletion, and there is no `builtin` field to tell deletion from absence.
export const seedBuiltInRoles = Effect.fn("seedBuiltInRoles")(function* () {
  const catalog = yield* readRoleCatalogForWrite()
  if (catalog.roles.length > 0) {
    return catalog
  }
  const seeded: RoleCatalog = { roles: [...builtInRoles] }
  yield* persistRoleCatalog(seeded)
  return seeded
})
