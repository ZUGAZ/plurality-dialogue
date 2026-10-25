import { Array, Option } from "effect"
import type { ProviderId } from "../provider/provider-id"
import {
  isVendorSeat,
  isYouSeat,
  maxDialogueVendorSeats,
  youDisplayName,
} from "./dialogue-setup"
import type { CastSeat, DialogueSetup } from "./dialogue-setup"
import {
  DisabledProvider,
  DuplicateName,
  EmptyTopic,
  MultipleYou,
  TooManyVendorSeats,
} from "./setup-problems"
import type { SetupProblem } from "./setup-problems"

const displayName = (seat: CastSeat): string =>
  isVendorSeat(seat) ? seat.name : youDisplayName

const duplicateDisplayNames = (
  cast: readonly CastSeat[],
): ReadonlyArray<string> => {
  const seen = new Set<string>()
  const duplicated = new Set<string>()
  for (const seat of cast) {
    const name = displayName(seat)
    if (seen.has(name)) {
      duplicated.add(name)
    }
    seen.add(name)
  }
  return [...duplicated]
}

const disabledProviderProblems = (
  cast: readonly CastSeat[],
  enabledProviderIds: ReadonlyArray<ProviderId>,
): ReadonlyArray<SetupProblem> => {
  const enabled = new Set<ProviderId>(enabledProviderIds)
  return Array.filterMap(cast, (seat) =>
    isVendorSeat(seat) && !enabled.has(seat.providerId)
      ? Option.some(DisabledProvider.make({ providerId: seat.providerId }))
      : Option.none(),
  )
}

export const validateSetup = (input: {
  readonly setup: DialogueSetup
  readonly enabledProviderIds: ReadonlyArray<ProviderId>
}): ReadonlyArray<SetupProblem> => {
  const { cast, topic } = input.setup
  return [
    ...(topic.length === 0 ? [EmptyTopic.make({})] : []),
    ...(Array.filter(cast, isVendorSeat).length > maxDialogueVendorSeats
      ? [TooManyVendorSeats.make({})]
      : []),
    ...(Array.filter(cast, isYouSeat).length > 1 ? [MultipleYou.make({})] : []),
    ...Array.map(duplicateDisplayNames(cast), (name) =>
      DuplicateName.make({ name }),
    ),
    ...disabledProviderProblems(cast, input.enabledProviderIds),
  ]
}
