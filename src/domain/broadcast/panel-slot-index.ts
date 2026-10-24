import { Option } from "effect"

// The list passed in is the slot order, so the position in it is the slot
// index. The numeric suffix of an id is not the index: a removed middle panel
// keeps its id until the next load.
export const panelSlotIndex = (
  panelIds: ReadonlyArray<string>,
  panelId: string,
): Option.Option<number> => {
  const index = panelIds.indexOf(panelId)
  return index === -1 ? Option.none() : Option.some(index)
}
