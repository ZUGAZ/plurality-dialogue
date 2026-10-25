import type { ProviderId } from "../provider/provider-id"
import type { VisiblePanel } from "../broadcast/resolve-targets"
import { isVendorSeat, type DialogueSetup } from "./dialogue-setup"
import { engineVisiblePanel } from "./engine-target"

export const dialogueEnginePanelPrefix = "dialogue-engine-"

export const dialogueEnginePanelId = (vendorSeatIndex: number): string =>
  `${dialogueEnginePanelPrefix}${vendorSeatIndex}`

export const isDialogueEnginePanelId = (panelId: string): boolean =>
  panelId.startsWith(dialogueEnginePanelPrefix)

export type VendorCastSeatRef = {
  readonly castIndex: number
  readonly vendorSeatIndex: number
  readonly providerId: ProviderId
}

export const vendorCastSeats = (
  setup: DialogueSetup,
): ReadonlyArray<VendorCastSeatRef> => {
  const seats: VendorCastSeatRef[] = []
  let vendorSeatIndex = 0
  for (const [castIndex, seat] of setup.cast.entries()) {
    if (!isVendorSeat(seat)) {
      continue
    }
    seats.push({
      castIndex,
      vendorSeatIndex,
      providerId: seat.providerId,
    })
    vendorSeatIndex += 1
  }
  return seats
}

export const enginePanelsFor = (
  setup: DialogueSetup,
): ReadonlyArray<VisiblePanel> =>
  vendorCastSeats(setup).map((seat) =>
    engineVisiblePanel(
      dialogueEnginePanelId(seat.vendorSeatIndex),
      seat.providerId,
    ),
  )
