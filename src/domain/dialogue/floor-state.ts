import {
  isVendorSeat,
  isYouSeat,
  type CastSeat,
  type DialogueSetup,
} from "./dialogue-setup"

export type FloorState = {
  readonly cursor: number
  readonly busy: boolean
}

export const resetFloor = (): FloorState => ({
  cursor: 0,
  busy: false,
})

export const initialCursor = (setup: DialogueSetup): number => {
  const index = setup.cast.findIndex((seat) => isYouSeat(seat))
  return index < 0 ? 0 : index
}

export const pinCursor = (
  state: FloorState,
  index: number,
  castLength: number,
): FloorState => {
  if (state.busy || index < 0 || index >= castLength) {
    return state
  }
  return { cursor: index, busy: state.busy }
}

export const advanceCursor = (
  state: FloorState,
  castLength: number,
): FloorState => {
  if (castLength <= 0) {
    return state
  }
  return {
    cursor: (state.cursor + 1) % castLength,
    busy: state.busy,
  }
}

export const setBusy = (state: FloorState, busy: boolean): FloorState => ({
  cursor: state.cursor,
  busy,
})

export const canNext = (state: FloorState, seat: CastSeat): boolean =>
  !state.busy && isVendorSeat(seat)
