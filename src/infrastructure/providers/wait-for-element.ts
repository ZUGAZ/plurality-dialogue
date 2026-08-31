import { Effect } from "effect"
import { ComposerNotFound } from "../../domain/ports/provider-page"

export const composerWaitMs = 8_000

export const submitEnableWaitMs = 2_000

const pollInterval = "50 millis"

export const waitForElement = (
  query: () => Element | null,
  timeoutMs: number,
): Effect.Effect<Element, ComposerNotFound> => {
  const poll: Effect.Effect<Element> = Effect.suspend(() => {
    const found = query()
    if (found !== null) {
      return Effect.succeed(found)
    }
    return Effect.sleep(pollInterval).pipe(Effect.zipRight(poll))
  })
  return poll.pipe(
    Effect.timeoutFail({
      duration: `${timeoutMs} millis`,
      onTimeout: () =>
        new ComposerNotFound({
          reason: `element not found within ${timeoutMs}ms`,
        }),
    }),
  )
}
