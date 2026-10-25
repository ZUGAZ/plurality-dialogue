import { Effect, Either, Fiber, TestClock } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { PanelTarget } from "../broadcast/panel-target"
import { engineVisiblePanel } from "./engine-target"
import {
  EngineNotReady,
  engineTargetPoll,
  waitEngineTargets,
} from "./wait-engine-targets"

const chatgpt = engineVisiblePanel("dialogue-engine-0", "chatgpt")
const claude = engineVisiblePanel("dialogue-engine-1", "claude")

const hello = (
  panelId: string,
  providerId: "chatgpt" | "claude",
  frameId: number,
) =>
  PanelTarget.make({
    panelId,
    providerId,
    tabId: 7,
    frameId,
  })

describe("waitEngineTargets", () => {
  it.effect("returns targets once every panel has a hello", () =>
    Effect.gen(function* () {
      const frames = [
        hello("dialogue-engine-0", "chatgpt", 4),
        hello("dialogue-engine-1", "claude", 9),
      ]
      const targets = yield* waitEngineTargets({
        panels: [chatgpt, claude],
        frames: () => frames,
        timeoutMs: 1_000,
      })
      expect(targets).toEqual([
        PanelTarget.make({
          panelId: "dialogue-engine-0",
          providerId: "chatgpt",
          tabId: 7,
          frameId: 4,
        }),
        PanelTarget.make({
          panelId: "dialogue-engine-1",
          providerId: "claude",
          tabId: 7,
          frameId: 9,
        }),
      ])
    }),
  )

  it.effect("uses the seat provider when the hello names another", () =>
    Effect.gen(function* () {
      const targets = yield* waitEngineTargets({
        panels: [chatgpt],
        frames: () => [hello("dialogue-engine-0", "claude", 4)],
        timeoutMs: 1_000,
      })
      expect(targets[0]?.providerId).toBe("chatgpt")
    }),
  )

  it.effect("resolves when a hello arrives on a later poll", () =>
    Effect.gen(function* () {
      let frames: ReadonlyArray<PanelTarget> = []
      const fiber = yield* Effect.fork(
        waitEngineTargets({
          panels: [chatgpt],
          frames: () => frames,
          timeoutMs: 1_000,
        }),
      )
      yield* TestClock.adjust(engineTargetPoll)
      frames = [hello("dialogue-engine-0", "chatgpt", 4)]
      yield* TestClock.adjust(engineTargetPoll)
      const targets = yield* Fiber.join(fiber)
      expect(targets.map((target) => target.panelId)).toEqual([
        "dialogue-engine-0",
      ])
    }),
  )

  it.effect("fails EngineNotReady with the panels that never hello", () =>
    Effect.gen(function* () {
      const fiber = yield* Effect.fork(
        waitEngineTargets({
          panels: [chatgpt, claude],
          frames: () => [hello("dialogue-engine-0", "chatgpt", 4)],
          timeoutMs: 200,
        }).pipe(Effect.either),
      )
      yield* TestClock.adjust("200 millis")
      const result = yield* Fiber.join(fiber)
      expect(result).toEqual(
        Either.left(new EngineNotReady({ panelIds: ["dialogue-engine-1"] })),
      )
    }),
  )
})
