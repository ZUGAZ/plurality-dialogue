import { Either, Option } from "effect"
import type { ProviderId } from "../provider/provider-id"
import type { RoleCatalog } from "../role/role"
import type { VisiblePanel } from "../broadcast/resolve-targets"
import type { ResolvedCast } from "./resolve-cast"
import { resolveCast } from "./resolve-cast"
import { isYouSeat, type DialogueSetup } from "./dialogue-setup"
import { enginePanelsFor } from "./engine-panel-id"
import { openingLine } from "./opening-line"
import type { MissingRole, SetupProblem } from "./setup-problems"
import type { TranscriptEntry } from "./transcript-entry"
import { validateSetup } from "./validate-setup"

export type StartPlan = {
  readonly enginePanels: ReadonlyArray<VisiblePanel>
  readonly resolvedCast: ResolvedCast
  readonly openingEntry: Option.Option<TranscriptEntry>
}

export type StartProblems =
  | { readonly setup: ReadonlyArray<SetupProblem> }
  | { readonly missingRoles: ReadonlyArray<MissingRole> }

export type StartDialogueInput = {
  readonly setup: DialogueSetup
  readonly catalog: RoleCatalog
  readonly enabledProviderIds: ReadonlyArray<ProviderId>
  readonly stampAt: string
}

export const startDialogue = (
  input: StartDialogueInput,
): Either.Either<StartPlan, StartProblems> => {
  const setupProblems = validateSetup({
    setup: input.setup,
    enabledProviderIds: input.enabledProviderIds,
  })
  if (setupProblems.length > 0) {
    return Either.left({ setup: setupProblems })
  }
  return Either.match(
    resolveCast({ setup: input.setup, catalog: input.catalog }),
    {
      onLeft: (missingRoles) => Either.left({ missingRoles }),
      onRight: (resolvedCast) =>
        Either.right({
          enginePanels: enginePanelsFor(input.setup),
          resolvedCast,
          openingEntry: openingEntryFor(input.setup, input.stampAt),
        }),
    },
  )
}

const openingEntryFor = (
  setup: DialogueSetup,
  stampAt: string,
): Option.Option<TranscriptEntry> => {
  if (setup.cast.some(isYouSeat)) {
    return Option.none()
  }
  const line = openingLine(setup)
  return Option.some({
    speaker: line.speaker,
    text: line.text,
    at: stampAt,
  })
}
