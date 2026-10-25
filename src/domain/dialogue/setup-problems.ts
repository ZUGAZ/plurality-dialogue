import { Schema } from "effect"
import { ProviderId } from "../provider/provider-id"
import { RoleId } from "../role/role"

export const EmptyTopic = Schema.TaggedStruct("EmptyTopic", {})

export type EmptyTopic = typeof EmptyTopic.Type

export const isEmptyTopic = Schema.is(EmptyTopic)

export const TooManyVendorSeats = Schema.TaggedStruct("TooManyVendorSeats", {})

export type TooManyVendorSeats = typeof TooManyVendorSeats.Type

export const isTooManyVendorSeats = Schema.is(TooManyVendorSeats)

export const MultipleYou = Schema.TaggedStruct("MultipleYou", {})

export type MultipleYou = typeof MultipleYou.Type

export const isMultipleYou = Schema.is(MultipleYou)

export const DuplicateName = Schema.TaggedStruct("DuplicateName", {
  name: Schema.String,
})

export type DuplicateName = typeof DuplicateName.Type

export const isDuplicateName = Schema.is(DuplicateName)

export const DisabledProvider = Schema.TaggedStruct("DisabledProvider", {
  providerId: ProviderId,
})

export type DisabledProvider = typeof DisabledProvider.Type

export const isDisabledProvider = Schema.is(DisabledProvider)

export const SetupProblem = Schema.Union(
  EmptyTopic,
  TooManyVendorSeats,
  MultipleYou,
  DuplicateName,
  DisabledProvider,
)

export type SetupProblem = typeof SetupProblem.Type

export const isSetupProblem = Schema.is(SetupProblem)

export const MissingRole = Schema.TaggedStruct("MissingRole", {
  roleId: RoleId,
  seatIndex: Schema.Number,
})

export type MissingRole = typeof MissingRole.Type

export const isMissingRole = Schema.is(MissingRole)
