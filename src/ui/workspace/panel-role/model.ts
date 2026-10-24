import type { Role } from "@domain/role/role"
import type { PanelRoles } from "@domain/role/panel-roles"

type CatalogLike = { readonly roles: readonly Role[] }

export const noRoleLabel = "No role"
export const addLabel = "Add"
export const editLabel = "Edit"
export const newRoleHeading = "New role"
export const editRoleHeading = "Edit role"
export const nameLabel = "Name"
export const instructionLabel = "Instruction"
export const saveLabel = "Save"
export const cancelLabel = "Cancel"
export const deleteLabel = "Delete"
export const couldNotLoadRolesText = "Could not load roles."
export const couldNotSaveText = "Could not save."
export const duplicateRoleText = "A role with that name already exists."
export const roleGoneText = "That role is gone."
export const emptyFieldsText = "Enter a name and an instruction."

export const roleSelectLabel = (panelNumber: number): string =>
  `Role for panel ${panelNumber}`

export const addRoleLabel = (panelNumber: number): string =>
  `Add role for panel ${panelNumber}`

export const editRoleLabel = (panelNumber: number): string =>
  `Edit role for panel ${panelNumber}`

export const roleIdFromName = (name: string): string | undefined => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug === "" ? undefined : slug
}

export type RoleFormState =
  | { readonly open: false }
  | {
      readonly open: true
      readonly slotIndex: number
      readonly roleId: string | null
      readonly name: string
      readonly instruction: string
    }

export const closedForm: RoleFormState = { open: false }

export const selectedRoleId = (
  catalog: CatalogLike | undefined,
  panelRoles: PanelRoles | undefined,
  slotIndex: number,
): string => {
  if (catalog === undefined) {
    return ""
  }
  const assignment = panelRoles?.[slotIndex]
  if (assignment === undefined || assignment === null) {
    return ""
  }
  return catalog.roles.some((role) => role.id === assignment) ? assignment : ""
}

export type RolePickerOption = {
  readonly id: string
  readonly label: string
}

export const rolePickerOptions = (
  roles: readonly Role[],
): readonly RolePickerOption[] =>
  roles.map((role) => ({ id: role.id, label: role.name }))
