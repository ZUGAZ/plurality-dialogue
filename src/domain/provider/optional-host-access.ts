import { Data, type Effect } from "effect"
import type { ProviderId } from "./provider-id"

export class OptionalHostPermissionDenied extends Data.TaggedError(
  "OptionalHostPermissionDenied",
)<{
  readonly providerId: ProviderId
}> {}

export class OptionalHostPermissionRequestFailed extends Data.TaggedError(
  "OptionalHostPermissionRequestFailed",
)<{
  readonly providerId: ProviderId
  readonly cause: unknown
}> {}

export type OptionalHostAccess = {
  readonly request: (
    id: ProviderId,
  ) => Effect.Effect<boolean, OptionalHostPermissionRequestFailed>
  readonly sync: (
    id: ProviderId,
    enabled: boolean,
  ) => Effect.Effect<void, OptionalHostPermissionRequestFailed>
}
