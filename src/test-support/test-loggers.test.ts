import { Effect } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { vi } from "vitest"
import { makeCapturingLogger } from "./capturing-logger"
import { silentLoggerLayer } from "./silent-logger"

describe("test loggers", () => {
  it.effect("silent logger emits nothing", () =>
    Effect.gen(function* () {
      const log = yield* Effect.sync(() =>
        vi.spyOn(console, "log").mockImplementation(() => undefined),
      )
      yield* Effect.log("quiet").pipe(Effect.provide(silentLoggerLayer))
      expect(log).not.toHaveBeenCalled()
      log.mockRestore()
    }),
  )

  it.effect("capturing logger keeps the argument array", () =>
    Effect.gen(function* () {
      const capturing = makeCapturingLogger()
      yield* Effect.log("retry", { n: 1 }).pipe(
        Effect.provide(capturing.layer),
      )
      expect(capturing.messages()).toEqual([["retry", { n: 1 }]])
    }),
  )
})
