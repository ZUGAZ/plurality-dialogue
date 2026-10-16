import { Effect, Either } from "effect"
import { OptionalHostPermissionRequestFailed } from "../../domain/provider/optional-host-access"
import type { OptionalHostAccess } from "../../domain/provider/optional-host-access"
import {
  optionalProviderIds,
  type ProviderId,
} from "../../domain/provider/provider-id"
import { setProviderEnabled } from "../../domain/provider/registry"
import { loadWorkspaceSettings } from "../../domain/settings/workspace-settings-storage"
import { workspacePagePath } from "../../domain/workspace/workspace-page"
import { optionalHostPermissionPatterns } from "../../domain/workspace/framing-policy"
import { applyFramingSessionRules } from "./declarative-net-request"
import { extensionPageUrl } from "./extension-page-url"
import { ChromeStorageLive } from "./storage"
import { listTabIdsForDocumentUrls } from "./tabs"
import {
  isolatedScriptPath,
  optionalOriginForId,
  pageFileAssignScriptId,
  pageFileAssignScriptPath,
  scriptIdsForProvider,
  usesPageFileAssign,
} from "./optional-content-scripts"

const optionalOrigins = new Set<string>(optionalHostPermissionPatterns)

const failed = (id: ProviderId, cause: unknown) =>
  new OptionalHostPermissionRequestFailed({ providerId: id, cause })

const requestOrigin = (id: ProviderId) => {
  const origin = optionalOriginForId(id)
  if (origin === undefined) {
    return Effect.fail(failed(id, "unknown optional host"))
  }
  return Effect.tryPromise({
    try: () => chrome.permissions.request({ origins: [origin] }),
    catch: (cause) => failed(id, cause),
  })
}

const registeredIds = (id: ProviderId) =>
  Effect.tryPromise({
    try: () =>
      chrome.scripting.getRegisteredContentScripts({
        ids: [...scriptIdsForProvider(id)],
      }),
    catch: (cause) => failed(id, cause),
  }).pipe(
    Effect.map(
      (scripts) => new Set(scripts.map((script) => script.id)),
    ),
  )

const registerOne = (
  id: ProviderId,
  script: chrome.scripting.RegisteredContentScript,
  present: ReadonlySet<string>,
) => {
  if (present.has(script.id)) {
    return Effect.void
  }
  return Effect.tryPromise({
    try: () => chrome.scripting.registerContentScripts([script]),
    catch: (cause) => failed(id, cause),
  })
}

const scriptsFor = (
  id: ProviderId,
  origin: string,
): readonly chrome.scripting.RegisteredContentScript[] => {
  const isolated: chrome.scripting.RegisteredContentScript = {
    id,
    js: [isolatedScriptPath(id)],
    matches: [origin],
    allFrames: true,
    runAt: "document_idle",
    world: "ISOLATED",
  }
  if (!usesPageFileAssign(id)) {
    return [isolated]
  }
  const mainWorld: chrome.scripting.RegisteredContentScript = {
    id: pageFileAssignScriptId(id),
    js: [pageFileAssignScriptPath],
    matches: [origin],
    allFrames: true,
    runAt: "document_start",
    world: "MAIN",
  }
  return [isolated, mainWorld]
}

const registerProvider = (id: ProviderId) => {
  const origin = optionalOriginForId(id)
  if (origin === undefined) {
    return Effect.fail(failed(id, "unknown optional host"))
  }
  return registeredIds(id).pipe(
    Effect.flatMap((present) =>
      Effect.forEach(
        scriptsFor(id, origin),
        (script) => registerOne(id, script, present),
        { discard: true },
      ),
    ),
  )
}

const unregisterProvider = (id: ProviderId) =>
  registeredIds(id).pipe(
    Effect.flatMap((present) => {
      const ids = scriptIdsForProvider(id).filter((scriptId) =>
        present.has(scriptId),
      )
      if (ids.length === 0) {
        return Effect.void
      }
      return Effect.tryPromise({
        try: () => chrome.scripting.unregisterContentScripts({ ids }),
        catch: (cause) => failed(id, cause),
      })
    }),
  )

const removeOrigin = (id: ProviderId) => {
  const origin = optionalOriginForId(id)
  if (origin === undefined) {
    return Effect.fail(failed(id, "unknown optional host"))
  }
  return Effect.tryPromise({
    try: () => chrome.permissions.remove({ origins: [origin] }),
    catch: (cause) => failed(id, cause),
  }).pipe(Effect.asVoid)
}

const reapplyWorkspaceFraming = () =>
  listTabIdsForDocumentUrls([extensionPageUrl(workspacePagePath)]).pipe(
    Effect.flatMap((tabIds) =>
      Effect.forEach(tabIds, applyFramingSessionRules, { discard: true }),
    ),
    Effect.catchTag("TabIdUnavailable", () => Effect.void),
  )

const syncOrigin = (id: ProviderId, enabled: boolean) => {
  const changed = enabled
    ? registerProvider(id)
    : unregisterProvider(id).pipe(Effect.zipRight(removeOrigin(id)))
  return changed.pipe(
    Effect.zipRight(reapplyWorkspaceFraming()),
    Effect.mapError((error) =>
      error instanceof OptionalHostPermissionRequestFailed
        ? error
        : failed(id, error),
    ),
  )
}

const containsOrigin = (id: ProviderId, origin: string) =>
  Effect.tryPromise({
    try: () => chrome.permissions.contains({ origins: [origin] }),
    catch: (cause) => failed(id, cause),
  })

const reconcileOne = (id: ProviderId, enabled: boolean) => {
  if (!enabled) {
    return Effect.void
  }
  const origin = optionalOriginForId(id)
  if (origin === undefined) {
    return Effect.void
  }
  return containsOrigin(id, origin).pipe(
    Effect.flatMap((held) => {
      if (!held) {
        return setProviderEnabled(id, false).pipe(
          Effect.either,
          Effect.flatMap((persisted) =>
            unregisterProvider(id).pipe(
              Effect.zipRight(
                Either.isLeft(persisted)
                  ? Effect.fail(persisted.left)
                  : Effect.void,
              ),
            ),
          ),
        )
      }
      return registerProvider(id)
    }),
  )
}

const reconcileAll = Effect.gen(function* () {
  const settings = yield* loadWorkspaceSettings()
  const enabled = new Set(settings.enabledProviders)
  yield* Effect.forEach(
    optionalProviderIds,
    (id) =>
      reconcileOne(id, enabled.has(id)).pipe(
        Effect.catchAll((error) =>
          Effect.logWarning("optional host reconcile failed", id, error),
        ),
      ),
    { discard: true },
  )
})

export const reconcileOptionalContentScripts = reconcileAll.pipe(
  Effect.provide(ChromeStorageLive),
)

export const chromeOptionalHostAccess: OptionalHostAccess = {
  request: requestOrigin,
  sync: syncOrigin,
}

const mentionsOptionalOrigin = (
  origins: readonly string[] | undefined,
): boolean =>
  origins !== undefined && origins.some((origin) => optionalOrigins.has(origin))

export const subscribeOptionalHostPermissionsRemoved = (
  onRemoved: () => void,
): void => {
  chrome.permissions.onRemoved.addListener((removed) => {
    if (mentionsOptionalOrigin(removed.origins)) {
      onRemoved()
    }
  })
}
