import { Effect } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { vi } from "vitest"
import { SpanLoggerLive } from "./span-logger"

describe("SpanLoggerLive", () => {
  it.effect("prints the outer span first", () =>
    Effect.gen(function* () {
      const log = yield* spyOn("log")
      yield* Effect.log("ready").pipe(
        Effect.withLogSpan("handleMessage"),
        Effect.withLogSpan("background"),
        Effect.provide(SpanLoggerLive),
      )
      expect(log).toHaveBeenCalledWith("[background][handleMessage]", "ready")
      log.mockRestore()
    }),
  )

  it.effect("routes warning and error off console.log", () =>
    Effect.gen(function* () {
      const warn = yield* spyOn("warn")
      const error = yield* spyOn("error")
      yield* Effect.logWarning("careful").pipe(Effect.provide(SpanLoggerLive))
      yield* Effect.logError("boom").pipe(Effect.provide(SpanLoggerLive))
      expect(warn).toHaveBeenCalledWith("", "careful")
      expect(error).toHaveBeenCalledWith("", "boom")
      warn.mockRestore()
      error.mockRestore()
    }),
  )
})

const spyOn = (method: "log" | "warn" | "error") =>
  Effect.sync(() => vi.spyOn(console, method).mockImplementation(() => undefined))
