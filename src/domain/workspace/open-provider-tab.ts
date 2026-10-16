import { Effect, Either, Option, pipe } from "effect"
import type { PanelTarget } from "../broadcast/panel-target"
import { Messaging } from "../ports/messaging"
import { Tabs } from "../ports/tabs"
import type { ProviderId } from "../provider/provider-id"
import { getBuiltInProvider } from "../provider/registry"

export type ProviderTabUrlInput = {
  readonly host: string
  readonly catalogUrl: string
  readonly assignedSrc: string | undefined
  readonly reportedHref: string | undefined
}

export type OpenProviderTabInput = {
  readonly providerId: ProviderId
  readonly assignedSrc: string | undefined
  readonly frame: Option.Option<PanelTarget>
}

const httpsHrefForHost = (raw: string, host: string): string | undefined =>
  pipe(
    Either.try({
      try: () => new URL(raw),
      catch: (cause: unknown) => cause,
    }),
    Either.match({
      onLeft: () => undefined,
      onRight: (parsed) =>
        parsed.protocol === "https:" && parsed.hostname === host
          ? parsed.href
          : undefined,
    }),
  )

export const chooseProviderTabUrl = (
  input: ProviderTabUrlInput,
): string | undefined => {
  const candidates = [
    input.reportedHref,
    input.assignedSrc,
    input.catalogUrl,
  ]
  for (const candidate of candidates) {
    if (candidate === undefined) {
      continue
    }
    const href = httpsHrefForHost(candidate, input.host)
    if (href !== undefined) {
      return href
    }
  }
  return undefined
}

const readReportedHref = (
  frame: Option.Option<PanelTarget>,
): Effect.Effect<string | undefined, never, Messaging> =>
  Effect.gen(function* () {
    if (Option.isNone(frame)) {
      return undefined
    }
    const messaging = yield* Messaging
    return yield* messaging.readFrameLocation(frame.value).pipe(
      Effect.map((location) => location.href),
      Effect.catchTag("MessagingFault", () => Effect.succeed(undefined)),
    )
  })

export const openProviderTab = Effect.fn("openProviderTab")(function* (
  input: OpenProviderTabInput,
) {
  const definition = getBuiltInProvider(input.providerId)
  if (Option.isNone(definition)) {
    return Option.none<string>()
  }
  const reportedHref = yield* readReportedHref(input.frame)
  const chosen = chooseProviderTabUrl({
    host: definition.value.host,
    catalogUrl: definition.value.url,
    assignedSrc: input.assignedSrc,
    reportedHref,
  })
  if (chosen === undefined) {
    return Option.none<string>()
  }
  const tabs = yield* Tabs
  yield* tabs.create(chosen)
  return Option.some(chosen)
})
