import { beforeEach, describe, expect, it } from "@effect/vitest"
import {
  clearPendingContextMenuIfMatch,
  replacePendingContextMenu,
  takePendingContextMenu,
} from "./pending-context-menu"

describe("pending context menu", () => {
  beforeEach(() => {
    takePendingContextMenu()
  })

  it("keeps the second replace", () => {
    replacePendingContextMenu({ draftText: "first" })
    replacePendingContextMenu({ draftText: "second" })
    expect(takePendingContextMenu()).toEqual({ draftText: "second" })
  })

  it("clears the slot on take", () => {
    replacePendingContextMenu({ draftText: "kept" })
    expect(takePendingContextMenu()).toEqual({ draftText: "kept" })
    expect(takePendingContextMenu()).toBeUndefined()
  })

  it("returns a later open-only replace with no draftText", () => {
    replacePendingContextMenu({ draftText: "selected" })
    replacePendingContextMenu({})
    const pending = takePendingContextMenu()
    expect(pending).toEqual({})
    expect(pending?.draftText).toBeUndefined()
  })

  it("does not clear a newer payload when an older send finishes", () => {
    replacePendingContextMenu({ draftText: "old" })
    replacePendingContextMenu({})
    clearPendingContextMenuIfMatch({ draftText: "old" })
    expect(takePendingContextMenu()).toEqual({})
  })
})
