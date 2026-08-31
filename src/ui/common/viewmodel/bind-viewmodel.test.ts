import { Effect, Ref } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { bindViewModel } from "./bind-viewmodel"

describe("bindViewModel", () => {
  it.effect("runs a bound Effect action", () =>
    Effect.gen(function* () {
      const count = yield* Ref.make(0)
      const runtime = yield* Effect.runtime()
      const bound = bindViewModel(runtime, () => ({
        increment: Ref.update(count, (n) => n + 1),
      }))
      bound.increment()
      const value = yield* waitUntilCount(count, 1)
      expect(value).toBe(1)
    }),
  )
})

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
