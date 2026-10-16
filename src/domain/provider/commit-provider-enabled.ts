import { Effect, Either } from "effect"
import {
  OptionalHostPermissionDenied,
  type OptionalHostAccess,
} from "./optional-host-access"
import { isOptionalProviderId, type ProviderId } from "./provider-id"
import { setProviderEnabled } from "./registry"

export const commitProviderEnabled = Effect.fn("commitProviderEnabled")(
  function* (id: ProviderId, enabled: boolean, access: OptionalHostAccess) {
    if (enabled && isOptionalProviderId(id)) {
      const granted = yield* access.request(id)
      if (!granted) {
        return yield* Effect.fail(
          new OptionalHostPermissionDenied({ providerId: id }),
        )
      }
    }
    const next = yield* setProviderEnabled(id, enabled)
    if (!isOptionalProviderId(id)) {
      return next
    }
    const synced = yield* Effect.either(access.sync(id, enabled))
    if (Either.isRight(synced)) {
      return next
    }
    if (enabled) {
      yield* rollBackOptionalEnable(id, access)
    }
    return yield* Effect.fail(synced.left)
  },
)

const rollBackOptionalEnable = (id: ProviderId, access: OptionalHostAccess) =>
  setProviderEnabled(id, false).pipe(
    Effect.ignore,
    Effect.zipRight(access.sync(id, false).pipe(Effect.ignore)),
  )
