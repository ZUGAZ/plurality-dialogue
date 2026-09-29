import { Deferred, Effect, List, Logger, Ref } from "effect"
import type { LogSpan } from "effect/LogSpan"
import { describe, expect, it } from "@effect/vitest"
import { bindViewModel } from "./bind-viewmodel"

describe("bindViewModel", () => {
  it.effect("runs a bound Effect action", () =>
    Effect.gen(function* () {
      const count = yield* Ref.make(0)
      const runtime = yield* Effect.runtime()
      const bound = bindViewModel(runtime, "counter", () => ({
        increment: Ref.update(count, (n) => n + 1),
      }))
      bound.increment()
      const value = yield* waitUntilCount(count, 1)
      expect(value).toBe(1)
    }),
  )

  it.effect("runs a bound parameterized Effect action", () =>
    Effect.gen(function* () {
      const count = yield* Ref.make(0)
      const runtime = yield* Effect.runtime()
      const bound = bindViewModel(runtime, "counter", () => ({
        setX: (n: number) => Ref.update(count, (current) => current + n),
      }))
      bound.setX(2)
      const value = yield* waitUntilCount(count, 2)
      expect(value).toBe(2)
    }),
  )

  it.effect("prefixes the viewmodel name outside the action key", () => {
    const labels: string[][] = []
    const recording = Logger.make(
      ({ spans }: Logger.Logger.Options<unknown>) => {
        labels.push(outerFirst(spans))
      },
    )
    return Effect.gen(function* () {
      const done = yield* Deferred.make<string>()
      const runtime = yield* Effect.runtime()
      const bound = bindViewModel(runtime, "unifiedInput", () => ({
        sendAll: () =>
          Effect.log("send").pipe(
            Effect.zipRight(Deferred.succeed(done, "sent")),
          ),
      }))
      bound.sendAll()
      yield* Deferred.await(done)
      expect(labels).toEqual([["unifiedInput", "sendAll"]])
    }).pipe(Effect.provide(Logger.replace(Logger.defaultLogger, recording)))
  })
})

const outerFirst = (spans: List.List<LogSpan>): string[] =>
  List.toArray(spans)
    .reverse()
    .map((span) => span.label)

const waitUntilCount = (
  count: Ref.Ref<number>,
  target: number,
): Effect.Effect<number> =>
  Ref.get(count).pipe(
    Effect.flatMap((value) =>
      value === target
        ? Effect.succeed(value)
        : Effect.yieldNow().pipe(Effect.zipRight(waitUntilCount(count, target))),
    ),
  )
