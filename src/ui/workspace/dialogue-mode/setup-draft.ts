import type { ProviderId } from "@domain/provider/provider-id"
import {
  isVendorSeat,
  isYouSeat,
  maxDialogueVendorSeats,
  youDisplayName,
  VendorCastSeat,
  YouCastSeat,
  type CastSeat,
  type DialogueSetup,
  type VendorCastSeat as VendorSeat,
} from "@domain/dialogue/dialogue-setup"
import { labelForProvider } from "../panel-grid/model"

export const withTopic = (
  setup: DialogueSetup,
  topic: string,
): DialogueSetup => ({
  ...setup,
  topic,
})

export const appendVendorSeat = (
  setup: DialogueSetup,
  providerId: ProviderId,
  roleId: string,
): DialogueSetup => {
  if (vendorCount(setup) >= maxDialogueVendorSeats || roleId.trim() === "") {
    return setup
  }
  const seat = VendorCastSeat.make({
    providerId,
    roleId,
    name: nextSeatName(setup, labelForProvider(providerId)),
  })
  return { ...setup, cast: insertBeforeYou(setup.cast, seat) }
}

export const removeVendorSeat = (
  setup: DialogueSetup,
  castIndex: number,
): DialogueSetup => {
  const seat = setup.cast[castIndex]
  if (seat === undefined || !isVendorSeat(seat)) {
    return setup
  }
  return {
    ...setup,
    cast: setup.cast.filter((_, index) => index !== castIndex),
  }
}

export const renameSeat = (
  setup: DialogueSetup,
  castIndex: number,
  name: string,
): DialogueSetup => {
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return setup
  }
  return mapVendor(setup, castIndex, (seat) =>
    VendorCastSeat.make({
      providerId: seat.providerId,
      roleId: seat.roleId,
      name: trimmed,
    }),
  )
}

export const retargetSeat = (
  setup: DialogueSetup,
  castIndex: number,
  providerId: ProviderId,
): DialogueSetup =>
  mapVendor(setup, castIndex, (seat) =>
    VendorCastSeat.make({
      providerId,
      roleId: seat.roleId,
      name: seat.name,
    }),
  )

export const assignSeatRole = (
  setup: DialogueSetup,
  castIndex: number,
  roleId: string,
): DialogueSetup => {
  const trimmed = roleId.trim()
  if (trimmed.length === 0) {
    return setup
  }
  return mapVendor(setup, castIndex, (seat) =>
    VendorCastSeat.make({
      providerId: seat.providerId,
      roleId: trimmed,
      name: seat.name,
    }),
  )
}

export const withIncludeMe = (
  setup: DialogueSetup,
  include: boolean,
): DialogueSetup => {
  const vendors = setup.cast.filter((seat) => !isYouSeat(seat))
  if (!include) {
    return { ...setup, cast: vendors }
  }
  if (setup.cast.some(isYouSeat)) {
    return setup
  }
  return { ...setup, cast: [...vendors, YouCastSeat.make({})] }
}

const vendorCount = (setup: DialogueSetup): number =>
  setup.cast.filter(isVendorSeat).length

const nextSeatName = (setup: DialogueSetup, base: string): string => {
  const taken = new Set(setup.cast.map(seatLabel))
  if (!taken.has(base)) {
    return base
  }
  let suffix = 2
  while (taken.has(`${base} ${suffix}`)) {
    suffix += 1
  }
  return `${base} ${suffix}`
}

const seatLabel = (seat: CastSeat): string =>
  isVendorSeat(seat) ? seat.name : youDisplayName

const insertBeforeYou = (
  cast: readonly CastSeat[],
  seat: VendorSeat,
): readonly CastSeat[] => {
  const youIndex = cast.findIndex(isYouSeat)
  if (youIndex === -1) {
    return [...cast, seat]
  }
  return [...cast.slice(0, youIndex), seat, ...cast.slice(youIndex)]
}

const mapVendor = (
  setup: DialogueSetup,
  castIndex: number,
  update: (seat: VendorSeat) => VendorSeat,
): DialogueSetup => {
  const seat = setup.cast[castIndex]
  if (seat === undefined || !isVendorSeat(seat)) {
    return setup
  }
  return {
    ...setup,
    cast: setup.cast.map((item, index) =>
      index === castIndex ? update(seat) : item,
    ),
  }
}
