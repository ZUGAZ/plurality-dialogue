import { Option, Schema } from "effect"
import { getBuiltInProvider } from "../provider/registry"
import { isProviderId } from "../provider/provider-id"

const trimmedNonEmpty = Schema.Trim.pipe(Schema.nonEmptyString())

// The instruction is copied as-is from whoever resolved the role. It is not
// constrained here: a row without a role must not make the paste fail to build.
export const TurnSpeaker = Schema.Struct({
  name: trimmedNonEmpty,
  instruction: Schema.String,
})

export type TurnSpeaker = typeof TurnSpeaker.Type

export const CastMember = Schema.Struct({
  name: trimmedNonEmpty,
  instruction: Schema.String,
  vendor: Schema.String.pipe(Schema.nonEmptyString()),
})

export type CastMember = typeof CastMember.Type

// Takes a plain string so a stored id that is no longer in the catalog still
// yields a label instead of failing the turn.
export const providerDisplayName = (providerId: string): string =>
  Option.liftPredicate(providerId, isProviderId).pipe(
    Option.flatMap(getBuiltInProvider),
    Option.map((provider) => provider.displayName),
    Option.getOrElse(() => providerId),
  )
