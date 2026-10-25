import type { RoleCatalog } from "@domain/role/role"
import { isProviderId } from "@domain/provider/provider-id"
import {
  isVendorSeat,
  isYouSeat,
  maxDialogueVendorSeats,
  youDisplayName,
  type DialogueSetup,
} from "@domain/dialogue/dialogue-setup"
import type { DialogueTranscript } from "@domain/dialogue/dialogue-transcript"
import type { StartProblems } from "@domain/dialogue/start-dialogue"
import {
  isDisabledProvider,
  isDuplicateName,
  isEmptyTopic,
  isMultipleYou,
  isTooManyVendorSeats,
  type SetupProblem,
} from "@domain/dialogue/setup-problems"
import { labelForProvider, type ProviderOption } from "../panel-grid/model"
import type { RolePickerOption } from "../panel-role/model"

export const compareLabel = "Compare"
export const dialogueLabel = "Dialogue"
export const startLabel = "Start"
export const topicLabel = "Topic"
export const includeMeLabel = "Include me"
export const addVendorLabel = "Add vendor"

export type WorkspaceMode = "compare" | "dialogue"
export type DialoguePhase = "setup" | "running"

export const removeVendorLabel = (name: string): string => `Remove ${name}`

export const seatLegend = (seatNumber: number): string => `Seat ${seatNumber}`

export const vendorProviderLabel = (seatNumber: number): string =>
  `Provider for seat ${seatNumber}`

export const vendorRoleLabel = (seatNumber: number): string =>
  `Role for seat ${seatNumber}`

export const vendorNameLabel = (seatNumber: number): string =>
  `Display name for seat ${seatNumber}`

export type DialogueSeatDraft = {
  readonly castIndex: number
  readonly seatNumber: number
  readonly providerId: string
  readonly roleId: string
  readonly name: string
}

export type TranscriptRow = {
  readonly speaker: string
  readonly roleLabel: string
  readonly text: string
  readonly at: string
}

export const includeMeChecked = (setup: DialogueSetup): boolean =>
  setup.cast.some(isYouSeat)

export const vendorSeatDrafts = (
  setup: DialogueSetup,
): readonly DialogueSeatDraft[] => {
  const drafts: DialogueSeatDraft[] = []
  let seatNumber = 0
  for (const [castIndex, seat] of setup.cast.entries()) {
    if (!isVendorSeat(seat)) {
      continue
    }
    seatNumber += 1
    drafts.push({
      castIndex,
      seatNumber,
      providerId: seat.providerId,
      roleId: seat.roleId,
      name: seat.name,
    })
  }
  return drafts
}

export const canAddVendorSeat = (
  setup: DialogueSetup,
  enabledCount: number,
  roleCount: number,
): boolean =>
  countVendors(setup) < maxDialogueVendorSeats &&
  enabledCount > 0 &&
  roleCount > 0

export const providerChoices = (
  options: readonly ProviderOption[],
  current: string,
): readonly ProviderOption[] => {
  if (
    options.some((option) => option.id === current) ||
    !isProviderId(current)
  ) {
    return options
  }
  return [...options, { id: current, label: labelForProvider(current) }]
}

export const roleChoices = (
  options: readonly RolePickerOption[],
  current: string,
): readonly RolePickerOption[] => {
  if (current === "" || options.some((option) => option.id === current)) {
    return options
  }
  return [...options, { id: current, label: current }]
}

export const roleLabelForSpeaker = (
  speaker: string,
  setup: DialogueSetup,
  catalog: RoleCatalog,
): string => {
  const seat = setup.cast.find((candidate) => seatName(candidate) === speaker)
  if (seat === undefined || !isVendorSeat(seat)) {
    return ""
  }
  const role = catalog.roles.find((item) => item.id === seat.roleId)
  return role === undefined ? "" : role.name
}

export const transcriptRowsFor = (
  transcript: DialogueTranscript,
  setup: DialogueSetup,
  catalog: RoleCatalog,
): readonly TranscriptRow[] =>
  transcript.entries.map((entry) => ({
    speaker: entry.speaker,
    roleLabel: roleLabelForSpeaker(entry.speaker, setup, catalog),
    text: entry.text,
    at: entry.at,
  }))

export const transcriptAtLabel = (at: string): string => {
  const parsed = Date.parse(at)
  if (Number.isNaN(parsed)) {
    return at
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed)
}

export const startProblemLines = (
  problems: StartProblems,
): readonly string[] =>
  "setup" in problems
    ? problems.setup.map(setupProblemText)
    : problems.missingRoles.map(
        (problem) => `Seat ${problem.seatIndex + 1} is missing its role.`,
      )

const countVendors = (setup: DialogueSetup): number =>
  setup.cast.filter(isVendorSeat).length

const seatName = (seat: DialogueSetup["cast"][number]): string =>
  isVendorSeat(seat) ? seat.name : youDisplayName

const setupProblemText = (problem: SetupProblem): string => {
  if (isEmptyTopic(problem)) {
    return "Enter a topic."
  }
  if (isTooManyVendorSeats(problem)) {
    return "Four vendors is the maximum."
  }
  if (isMultipleYou(problem)) {
    return "Include yourself only once."
  }
  if (isDuplicateName(problem)) {
    return `"${problem.name}" is used more than once.`
  }
  if (isDisabledProvider(problem)) {
    return `${labelForProvider(problem.providerId)} is turned off.`
  }
  return "This setup cannot start."
}
