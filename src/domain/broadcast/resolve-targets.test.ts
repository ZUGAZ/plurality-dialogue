import { describe, expect, it } from "@effect/vitest"
import { PanelFailed } from "./panel-failed"
import { PanelTarget } from "./panel-target"
import {
  resolveBroadcastTargets,
  toVisiblePanels,
  upsertFrameHello,
} from "./resolve-targets"

describe("toVisiblePanels", () => {
  it("drops slots with a null provider", () => {
    expect(
      toVisiblePanels([
        { id: "panel-1", providerId: "chatgpt" },
        { id: "panel-2", providerId: null },
      ]),
    ).toEqual([{ panelId: "panel-1", providerId: "chatgpt" }])
  })
})

describe("upsertFrameHello", () => {
  it("replaces the same frameId and the same panelId", () => {
    const first = PanelTarget.make({
      panelId: "panel-1",
      providerId: "chatgpt",
      tabId: 1,
      frameId: 10,
    })
    const reloaded = PanelTarget.make({
      panelId: "panel-1",
      providerId: "chatgpt",
      tabId: 1,
      frameId: 11,
    })
    const other = PanelTarget.make({
      panelId: "panel-2",
      providerId: "claude",
      tabId: 1,
      frameId: 12,
    })
    const rows = upsertFrameHello(upsertFrameHello([first, other], reloaded), {
      ...other,
      frameId: 12,
    })
    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.frameId).sort()).toEqual([11, 12])
  })
})

describe("resolveBroadcastTargets", () => {
  it("matches hellos by panelId and prepends frame-not-ready", () => {
    const hello = PanelTarget.make({
      panelId: "panel-1",
      providerId: "chatgpt",
      tabId: 4,
      frameId: 20,
    })
    const plan = resolveBroadcastTargets(
      [
        { panelId: "panel-1", providerId: "chatgpt" },
        { panelId: "panel-2", providerId: "claude" },
      ],
      [hello],
    )
    expect(plan.targets).toEqual([hello])
    expect(plan.notReady).toHaveLength(1)
    expect(plan.notReady[0]).toEqual(
      PanelFailed.make({
        panelId: "panel-2",
        providerId: "claude",
        reason: "frame-not-ready",
      }),
    )
  })
})
