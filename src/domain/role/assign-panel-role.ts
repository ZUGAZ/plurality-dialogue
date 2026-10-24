import { Data, Effect, Schema } from "effect"
import {
  loadWorkspaceSettings,
  persistWorkspaceSettings,
} from "../settings/workspace-settings-storage"
import {
  PanelRoles,
  instructionForPanel,
  panelRolesWithAssignment,
} from "./panel-roles"
import { RoleId } from "./role"
import { loadRoleCatalog } from "./role-catalog-storage"

export class PanelRoleIndexOutOfRange extends Data.TaggedError(
  "PanelRoleIndexOutOfRange",
)<{
  readonly panelIndex: number
}> {}

const isPanelIndexInRange = (panelIndex: number): boolean =>
  Number.isInteger(panelIndex) && panelIndex >= 0

// `undefined` clears the field by omitting the key, never by storing
// `undefined` (that is not a valid `chrome.storage` payload).
export const persistPanelRoles = Effect.fn("persistPanelRoles")(function* (
  panelRoles: PanelRoles | undefined,
) {
  const settings = yield* loadWorkspaceSettings()
  if (panelRoles === undefined) {
    const { panelRoles: _cleared, ...withoutPanelRoles } = settings
    return yield* persistWorkspaceSettings(withoutPanelRoles)
  }
  const validated = yield* Schema.decodeUnknown(PanelRoles)(panelRoles)
  return yield* persistWorkspaceSettings({
    ...settings,
    panelRoles: validated,
  })
})

export const assignPanelRole = Effect.fn("assignPanelRole")(function* (
  panelIndex: number,
  roleId: string | null,
) {
  if (!isPanelIndexInRange(panelIndex)) {
    return yield* Effect.fail(new PanelRoleIndexOutOfRange({ panelIndex }))
  }
  const validatedRoleId =
    roleId === null ? null : yield* Schema.decodeUnknown(RoleId)(roleId)
  const settings = yield* loadWorkspaceSettings()
  return yield* persistPanelRoles(
    panelRolesWithAssignment(settings.panelRoles, panelIndex, validatedRoleId),
  )
})

export const loadPanelInstruction = Effect.fn("loadPanelInstruction")(
  function* (panelIndex: number) {
    const settings = yield* loadWorkspaceSettings()
    const catalog = yield* loadRoleCatalog()
    return instructionForPanel(catalog, settings.panelRoles, panelIndex)
  },
)
