import { Effect, Option } from "effect"
import { createSignal } from "solid-js"
import type { Storage } from "@domain/ports/storage"
import { assignPanelRole } from "@domain/role/assign-panel-role"
import type { PanelRoles } from "@domain/role/panel-roles"
import { panelRolesWithAssignment } from "@domain/role/panel-roles"
import { roleById, type Role } from "@domain/role/role"
import { seedBuiltInRoles } from "@domain/role/seed-built-in-roles"
import type { RunEffect } from "@ui/common/viewmodel/bind-viewmodel"
import {
  closedForm,
  couldNotLoadRolesText,
  couldNotSaveText,
  rolePickerOptions,
  selectedRoleId,
  type RoleFormState,
  type RolePickerOption,
} from "./model"
import { removeRole, saveRole } from "./write-actions"

export type PanelRoleViewModel = {
  readonly catalog: () => readonly Role[] | undefined
  readonly panelRoles: () => PanelRoles | undefined
  readonly rolesReady: () => boolean
  readonly roleOptions: () => readonly RolePickerOption[]
  readonly roleIdAt: (slotIndex: number) => string
  readonly bannerError: () => string | undefined
  readonly loadError: () => string | undefined
  readonly actionError: () => string | undefined
  readonly form: () => RoleFormState
  readonly replacePanelRoles: (next: PanelRoles | undefined) => void
  readonly assignRole: (
    slotIndex: number,
    rawId: string,
  ) => Effect.Effect<void, never, Storage>
  readonly openCreate: (slotIndex: number) => void
  readonly openEdit: (slotIndex: number, roleId: string) => void
  readonly closeForm: () => void
  readonly setName: (name: string) => void
  readonly setInstruction: (instruction: string) => void
  readonly save: () => Effect.Effect<void, never, Storage>
  readonly remove: () => Effect.Effect<void, never, Storage>
}

export type PanelRoleInitial = {
  readonly panelRoles: PanelRoles | undefined
}

export const createPanelRoleViewModel = (
  runEffect: RunEffect<Storage>,
  initial: PanelRoleInitial,
): PanelRoleViewModel => {
  const [catalog, setCatalog] = createSignal<readonly Role[] | undefined>(
    undefined,
  )
  const [panelRoles, setPanelRoles] = createSignal<PanelRoles | undefined>(
    initial.panelRoles,
  )
  const [loadError, setLoadError] = createSignal<string | undefined>(undefined)
  const [actionError, setActionError] = createSignal<string | undefined>(
    undefined,
  )
  const [form, setForm] = createSignal<RoleFormState>(closedForm)

  const rolesReady = (): boolean =>
    catalog() !== undefined && loadError() === undefined

  const roleOptions = (): readonly RolePickerOption[] => {
    const roles = catalog()
    return roles === undefined ? [] : rolePickerOptions(roles)
  }

  const catalogSnapshot = (): { roles: readonly Role[] } | undefined => {
    const roles = catalog()
    return roles === undefined ? undefined : { roles }
  }

  const roleIdAt = (slotIndex: number): string =>
    selectedRoleId(catalogSnapshot(), panelRoles(), slotIndex)

  const bannerError = (): string | undefined => {
    const load = loadError()
    if (load !== undefined) {
      return load
    }
    const current = form()
    return current.open ? undefined : actionError()
  }

  runEffect(
    Effect.log("seed roles").pipe(
      Effect.zipRight(seedBuiltInRoles()),
      Effect.match({
        onFailure: () => {
          setLoadError(couldNotLoadRolesText)
        },
        onSuccess: (result) => {
          setCatalog(result.roles)
          setLoadError(undefined)
        },
      }),
      Effect.withLogSpan("seedRoles"),
    ),
  )

  const closeForm = (): void => {
    setForm(closedForm)
    setActionError(undefined)
  }

  const assignRole = (
    slotIndex: number,
    rawId: string,
  ): Effect.Effect<void, never, Storage> => {
    if (!rolesReady()) {
      return Effect.void
    }
    const roleId = rawId === "" ? null : rawId
    return Effect.log("assign role", slotIndex, roleId).pipe(
      Effect.zipRight(assignPanelRole(slotIndex, roleId)),
      Effect.match({
        onFailure: () => {
          setActionError(couldNotSaveText)
        },
        onSuccess: () => {
          setPanelRoles(
            panelRolesWithAssignment(panelRoles(), slotIndex, roleId),
          )
          setActionError(undefined)
        },
      }),
      Effect.withLogSpan("assignRole"),
    )
  }

  const openCreate = (slotIndex: number): void => {
    if (!rolesReady()) {
      return
    }
    setActionError(undefined)
    setForm({ open: true, slotIndex, roleId: null, name: "", instruction: "" })
  }

  const openEdit = (slotIndex: number, roleId: string): void => {
    if (!rolesReady()) {
      return
    }
    const cat = catalogSnapshot()
    if (cat === undefined) {
      return
    }
    const found = roleById(cat, roleId)
    if (Option.isNone(found)) {
      return
    }
    setActionError(undefined)
    setForm({
      open: true,
      slotIndex,
      roleId,
      name: found.value.name,
      instruction: found.value.instruction,
    })
  }

  const setName = (name: string): void => {
    const current = form()
    if (current.open) {
      setForm({ ...current, name })
    }
  }

  const setInstruction = (instruction: string): void => {
    const current = form()
    if (current.open) {
      setForm({ ...current, instruction })
    }
  }

  const host = {
    catalog,
    setCatalog: (roles: readonly Role[]) => {
      setCatalog(roles)
    },
    panelRoles,
    setPanelRoles,
    form,
    setForm,
    setActionError,
  }

  return {
    catalog,
    panelRoles,
    rolesReady,
    roleOptions,
    roleIdAt,
    bannerError,
    loadError,
    actionError,
    form,
    replacePanelRoles: (next: PanelRoles | undefined) => {
      setPanelRoles(next)
    },
    assignRole,
    openCreate,
    openEdit,
    closeForm,
    setName,
    setInstruction,
    save: () => saveRole(host),
    remove: () => removeRole(host),
  }
}
