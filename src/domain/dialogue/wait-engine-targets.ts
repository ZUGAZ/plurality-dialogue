import { Clock, Data, Effect, Option } from "effect"
import type { VisiblePanel } from "../broadcast/resolve-targets"
import type { PanelTarget } from "../broadcast/panel-target"
import { resolveEngineTarget } from "./engine-target"

export class EngineNotReady extends Data.TaggedError("EngineNotReady")<{
  readonly panelIds: ReadonlyArray<string>
}> {}

export const engineTargetPoll = "50 millis"

export type WaitEngineTargetsInput = {
  readonly panels: ReadonlyArray<VisiblePanel>
  // Read on each poll. Hellos arrive while this effect sleeps.
  readonly frames: () => ReadonlyArray<PanelTarget>
  readonly timeoutMs: number
}

export const waitEngineTargets = Effect.fn("waitEngineTargets")(function* (
  input: WaitEngineTargetsInput,
) {
  const startedAt = yield* Clock.currentTimeMillis
  while (true) {
    const targets = resolveAll(input.panels, input.frames())
    if (Option.isSome(targets)) {
      return targets.value
    }
    const now = yield* Clock.currentTimeMillis
    if (now - startedAt >= input.timeoutMs) {
      return yield* Effect.fail(
        new EngineNotReady({
          panelIds: missingPanelIds(input.panels, input.frames()),
        }),
      )
    }
    yield* Effect.sleep(engineTargetPoll)
  }
})

const resolveAll = (
  panels: ReadonlyArray<VisiblePanel>,
  frames: ReadonlyArray<PanelTarget>,
): Option.Option<ReadonlyArray<PanelTarget>> => {
  const targets: PanelTarget[] = []
  for (const panel of panels) {
    const target = resolveEngineTarget(
      panel.panelId,
      panel.providerId,
      frames,
    )
    if (target === undefined) {
      return Option.none()
    }
    targets.push(target)
  }
  return Option.some(targets)
}

const missingPanelIds = (
  panels: ReadonlyArray<VisiblePanel>,
  frames: ReadonlyArray<PanelTarget>,
): ReadonlyArray<string> => {
  const missing: string[] = []
  for (const panel of panels) {
    const target = resolveEngineTarget(
      panel.panelId,
      panel.providerId,
      frames,
    )
    if (target === undefined) {
      missing.push(panel.panelId)
    }
  }
  return missing
}
