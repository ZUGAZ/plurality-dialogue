import { Array, Either, Option } from "effect"
import { roleById, type RoleCatalog } from "../role/role"
import { providerDisplayName, type CastMember, type TurnSpeaker } from "./cast-member"
import {
  isYouSeat,
  youDisplayName,
  type CastSeat,
  type DialogueSetup,
  type VendorCastSeat,
  type YouCastSeat,
} from "./dialogue-setup"
import { MissingRole } from "./setup-problems"

const humanVendorLabel = "Human"

const humanInstruction = "The human running this dialogue."

export type ResolvedCast = {
  readonly cast: ReadonlyArray<CastMember>
  readonly speakers: ReadonlyArray<{
    readonly seat: CastSeat
    readonly speaker: TurnSpeaker
  }>
}

type ResolvedRow = {
  readonly seat: CastSeat
  readonly speaker: TurnSpeaker
  readonly member: CastMember
}

const resolveYou = (seat: YouCastSeat): ResolvedRow => ({
  seat,
  speaker: { name: youDisplayName, instruction: humanInstruction },
  member: {
    name: youDisplayName,
    instruction: humanInstruction,
    vendor: humanVendorLabel,
  },
})

const resolveVendor = (
  seat: VendorCastSeat,
  catalog: RoleCatalog,
  seatIndex: number,
): Either.Either<ResolvedRow, MissingRole> =>
  Option.match(roleById(catalog, seat.roleId), {
    onNone: () =>
      Either.left(MissingRole.make({ roleId: seat.roleId, seatIndex })),
    onSome: (role) =>
      Either.right({
        seat,
        speaker: { name: seat.name, instruction: role.instruction },
        member: {
          name: seat.name,
          instruction: role.instruction,
          vendor: providerDisplayName(seat.providerId),
        },
      }),
  })

const resolveSeat = (
  catalog: RoleCatalog,
  seat: CastSeat,
  seatIndex: number,
): Either.Either<ResolvedRow, MissingRole> =>
  isYouSeat(seat)
    ? Either.right(resolveYou(seat))
    : resolveVendor(seat, catalog, seatIndex)

export const resolveCast = (input: {
  readonly setup: DialogueSetup
  readonly catalog: RoleCatalog
}): Either.Either<ResolvedCast, ReadonlyArray<MissingRole>> => {
  const [missing, resolved] = Array.partitionMap(
    input.setup.cast,
    (seat, seatIndex) => resolveSeat(input.catalog, seat, seatIndex),
  )
  if (missing.length > 0) {
    return Either.left(missing)
  }
  return Either.right({
    cast: Array.map(resolved, (row) => row.member),
    speakers: Array.map(resolved, (row) => ({
      seat: row.seat,
      speaker: row.speaker,
    })),
  })
}
