import { Effect, Layer } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  FramingRulesReady,
  FramingTabIdUnavailable,
} from "../messaging/ensure-framing-rules"
import { inMemoryMessagingLayer } from "../ports/in-memory-messaging"
import { inMemoryTabsLayer } from "../ports/in-memory-tabs"
import {
  TabCreateFailed,
  TabFocusFailed,
  Tabs,
} from "../ports/tabs"
import {
  FramingHandshakeFailed,
  requestFramingRules,
} from "./request-framing-rules"
import { TabIdUnavailable } from "./tab-id-unavailable"

describe("requestFramingRules", () => {
  it.effect("sends the workspace tab id on EnsureFramingRules", () =>
    Effect.gen(function* () {
      let sent: unknown
      yield* requestFramingRules().pipe(
        Effect.provide(
          Layer.mergeAll(
            inMemoryTabsLayer(7),
            inMemoryMessagingLayer((message) => {
              sent = message
              return Effect.succeed(FramingRulesReady.make({}))
            }),
          ),
        ),
      )
      expect(sent).toEqual({ _tag: "EnsureFramingRules", tabId: 7 })
    }),
  )

  it.effect("still sends EnsureFramingRules when the page has no tab id", () =>
    Effect.gen(function* () {
      let sent: unknown
      yield* requestFramingRules().pipe(
        Effect.provide(
          Layer.mergeAll(
            tabsWithoutCurrentLayer,
            inMemoryMessagingLayer((message) => {
              sent = message
              return Effect.succeed(FramingRulesReady.make({}))
            }),
          ),
        ),
      )
      expect(sent).toEqual({ _tag: "EnsureFramingRules" })
    }),
  )

  it.effect("fails with a tab-id reason when the reply is unavailable", () =>
    requestFramingRules().pipe(
      Effect.provide(
        Layer.mergeAll(
          inMemoryTabsLayer(7),
          inMemoryMessagingLayer(() =>
            Effect.succeed(FramingTabIdUnavailable.make({})),
          ),
        ),
      ),
      Effect.flip,
      Effect.map((error) => {
        expect(error).toBeInstanceOf(FramingHandshakeFailed)
        expect(error).toEqual(
          expect.objectContaining({
            reason: "Could not identify this workspace tab",
          }),
        )
      }),
    ),
  )
})

const tabsWithoutCurrentLayer = Layer.succeed(Tabs, {
  currentTabId: () => Effect.fail(new TabIdUnavailable()),
  queryByUrl: () => Effect.succeed([]),
  create: () =>
    Effect.fail(new TabCreateFailed({ message: "unused in this test" })),
  focus: () =>
    Effect.fail(new TabFocusFailed({ message: "unused in this test" })),
})
