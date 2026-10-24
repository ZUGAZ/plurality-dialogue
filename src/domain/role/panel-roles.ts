import { Either, Option, Schema, pipe } from "effect"
import { RoleId, roleById, type Role, type RoleCatalog } from "./role"

// Index-aligned with the panel slot list. `null` is an explicitly unassigned
// slot; a missing entry past the end means the same.
export const PanelRoles = Schema.Array(Schema.NullOr(RoleId))

export type PanelRoles = typeof PanelRoles.Type

const decodePanelRoles = Schema.decodeUnknownEither(PanelRoles)

const emptyPanelRoles: PanelRoles = []

// Invalid values stay inside this field. They must not fail the document.
// The fallback is `[]`, not `undefined`: an optional field decoded to
// `undefined` keeps its own property, and encoding it would hand
// `chrome.storage` an `undefined` value.
export const lenientPanelRoles = Schema.transform(Schema.Unknown, PanelRoles, {
  strict: true,
  decode: (input) =>
    pipe(
      decodePanelRoles(input),
      Either.getOrElse(() => emptyPanelRoles),
    ),
  encode: (panelRoles) => panelRoles,
})

export const panelRolesWithAssignment = (
  current: PanelRoles | undefined,
  panelIndex: number,
  roleId: string | null,
): PanelRoles => {
  const existing = current ?? emptyPanelRoles
  const length = Math.max(existing.length, panelIndex + 1)
  return Array.from({ length }, (_, index) =>
    index === panelIndex ? roleId : (existing[index] ?? null),
  )
}

type PanelRoleSnapshot = {
  readonly panelIds: readonly string[]
  readonly panelRoles: PanelRoles | undefined
}

// Roles follow slot ids, not positions: a removed id's role is dropped and
// the next slot does not inherit it.
export const realignPanelRoles = (
  snapshot: PanelRoleSnapshot,
  nextPanelIds: readonly string[],
): PanelRoles | undefined => {
  const { panelIds, panelRoles } = snapshot
  if (panelRoles === undefined) {
    return undefined
  }
  const roleByPanelId = new Map<string, string | null>()
  panelIds.forEach((panelId, index) => {
    if (!roleByPanelId.has(panelId)) {
      roleByPanelId.set(panelId, panelRoles[index] ?? null)
    }
  })
  const claimed = new Set<string>()
  return nextPanelIds.map((panelId) => {
    if (claimed.has(panelId)) {
      return null
    }
    claimed.add(panelId)
    return roleByPanelId.get(panelId) ?? null
  })
}

export const roleForPanel = (
  catalog: RoleCatalog,
  panelRoles: PanelRoles | undefined,
  panelIndex: number,
): Option.Option<Role> =>
  pipe(
    Option.fromNullable(panelRoles?.[panelIndex]),
    Option.flatMap((roleId) => roleById(catalog, roleId)),
  )

export const instructionForPanel = (
  catalog: RoleCatalog,
  panelRoles: PanelRoles | undefined,
  panelIndex: number,
): Option.Option<string> =>
  pipe(
    roleForPanel(catalog, panelRoles, panelIndex),
    Option.map((role) => role.instruction),
  )
