import { Effect, Option } from "effect"
import type { Storage } from "@domain/ports/storage"
import { assignPanelRole } from "@domain/role/assign-panel-role"
import { panelRolesWithAssignment, type PanelRoles } from "@domain/role/panel-roles"
import { readRoleCatalogForWrite } from "@domain/role/read-role-catalog"
import {
  RoleNotFound,
  createRole,
  deleteRole,
  updateRole,
} from "@domain/role/role-crud"
import { DuplicateRoleId } from "@domain/role/role-catalog-storage"
import { roleById, type Role } from "@domain/role/role"
import {
  closedForm,
  couldNotLoadRolesText,
  couldNotSaveText,
  duplicateRoleText,
  emptyFieldsText,
  roleGoneText,
  roleIdFromName,
  type RoleFormState,
} from "./model"

type WriteHost = {
  readonly catalog: () => readonly Role[] | undefined
  readonly setCatalog: (roles: readonly Role[]) => void
  readonly panelRoles: () => PanelRoles | undefined
  readonly setPanelRoles: (roles: PanelRoles) => void
  readonly form: () => RoleFormState
  readonly setForm: (state: RoleFormState) => void
  readonly setActionError: (error: string | undefined) => void
}

const catalogSnapshot = (
  catalog: readonly Role[] | undefined,
): { roles: readonly Role[] } | undefined =>
  catalog === undefined ? undefined : { roles: catalog }

const reloadCatalogOnGone = (
  host: WriteHost,
): Effect.Effect<void, never, Storage> =>
  readRoleCatalogForWrite().pipe(
    Effect.match({
      onFailure: () => {
        host.setActionError(couldNotLoadRolesText)
      },
      onSuccess: (reloaded) => {
        host.setCatalog(reloaded.roles)
      },
    }),
  )

export const saveRole = (
  host: WriteHost,
): Effect.Effect<void, never, Storage> =>
  Effect.gen(function* () {
    yield* Effect.log("save role")
    const current = host.form()
    if (!current.open) {
      return
    }
    const trimName = current.name.trim()
    const trimInstruction = current.instruction.trim()
    const isCreate = current.roleId === null
    const slug = isCreate ? roleIdFromName(trimName) : undefined

    if (
      trimName === "" ||
      trimInstruction === "" ||
      (isCreate && slug === undefined)
    ) {
      host.setActionError(emptyFieldsText)
      return
    }

    if (isCreate) {
      yield* createRole({
        id: slug,
        name: trimName,
        instruction: trimInstruction,
      }).pipe(
        Effect.matchEffect({
          onFailure: (error) => {
            if (error instanceof DuplicateRoleId) {
              host.setActionError(duplicateRoleText)
            } else {
              host.setActionError(couldNotSaveText)
            }
            return Effect.void
          },
          onSuccess: (created) => {
            host.setCatalog([...(host.catalog() ?? []), created])
            return assignPanelRole(current.slotIndex, created.id).pipe(
              Effect.match({
                onFailure: () => {
                  host.setActionError(couldNotSaveText)
                },
                onSuccess: () => {
                  host.setPanelRoles(
                    panelRolesWithAssignment(
                      host.panelRoles(),
                      current.slotIndex,
                      created.id,
                    ),
                  )
                  host.setForm(closedForm)
                  host.setActionError(undefined)
                },
              }),
            )
          },
        }),
      )
      return
    }

    const cat = catalogSnapshot(host.catalog())
    if (
      cat === undefined ||
      Option.isNone(roleById(cat, current.roleId))
    ) {
      return
    }

    yield* updateRole(current.roleId, {
      name: trimName,
      instruction: trimInstruction,
    }).pipe(
      Effect.matchEffect({
        onFailure: (error) => {
          if (error instanceof DuplicateRoleId) {
            host.setActionError(duplicateRoleText)
            return Effect.void
          }
          if (error instanceof RoleNotFound) {
            host.setActionError(roleGoneText)
            return reloadCatalogOnGone(host)
          }
          host.setActionError(couldNotSaveText)
          return Effect.void
        },
        onSuccess: (updated) => {
          host.setCatalog(
            (host.catalog() ?? []).map((role) =>
              role.id === updated.id ? updated : role,
            ),
          )
          host.setActionError(undefined)
          return Effect.void
        },
      }),
    )
  }).pipe(Effect.withLogSpan("saveRole"))

export const removeRole = (
  host: WriteHost,
): Effect.Effect<void, never, Storage> =>
  Effect.gen(function* () {
    yield* Effect.log("delete role")
    const current = host.form()
    if (!current.open || current.roleId === null) {
      return
    }
    const cat = catalogSnapshot(host.catalog())
    if (
      cat === undefined ||
      Option.isNone(roleById(cat, current.roleId))
    ) {
      return
    }
    const removing = current.roleId
    yield* deleteRole(removing).pipe(
      Effect.matchEffect({
        onFailure: (error) => {
          if (error instanceof RoleNotFound) {
            host.setActionError(roleGoneText)
            return reloadCatalogOnGone(host)
          }
          host.setActionError(couldNotSaveText)
          return Effect.void
        },
        onSuccess: () => {
          host.setCatalog(
            (host.catalog() ?? []).filter((r) => r.id !== removing),
          )
          host.setForm(closedForm)
          host.setActionError(undefined)
          return Effect.void
        },
      }),
    )
  }).pipe(Effect.withLogSpan("deleteRole"))
