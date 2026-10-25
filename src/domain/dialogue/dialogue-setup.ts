import { Schema } from "effect"
import { ProviderId } from "../provider/provider-id"
import { RoleId } from "../role/role"

export const maxDialogueVendorSeats = 4

export const youDisplayName = "You"

const trimmedNonEmpty = Schema.Trim.pipe(Schema.nonEmptyString())

export const VendorCastSeat = Schema.TaggedStruct("vendor", {
  providerId: ProviderId,
  roleId: RoleId,
  name: trimmedNonEmpty,
})

export type VendorCastSeat = typeof VendorCastSeat.Type

export const isVendorSeat = Schema.is(VendorCastSeat)

export const YouCastSeat = Schema.TaggedStruct("you", {})

export type YouCastSeat = typeof YouCastSeat.Type

export const isYouSeat = Schema.is(YouCastSeat)

export const CastSeat = Schema.Union(VendorCastSeat, YouCastSeat)

export type CastSeat = typeof CastSeat.Type

const withinSeatCaps = (cast: ReadonlyArray<CastSeat>): boolean => {
  let vendors = 0
  let you = 0
  for (const seat of cast) {
    if (isVendorSeat(seat)) {
      vendors += 1
    }
    if (isYouSeat(seat)) {
      you += 1
    }
  }
  return vendors <= maxDialogueVendorSeats && you <= 1
}

export const DialogueSetup = Schema.Struct({
  topic: Schema.Trim,
  cast: Schema.Array(CastSeat).pipe(Schema.filter(withinSeatCaps)),
})

export type DialogueSetup = typeof DialogueSetup.Type

export const emptyDialogueSetup: DialogueSetup = { topic: "", cast: [] }

export const dialogueSetupStorageKey = "dialogue-setup"

export const decodeDialogueSetup = Schema.decodeUnknownEither(DialogueSetup)
