import { Data, Effect } from "effect"
import { loadWorkspaceSettings } from "../../domain/settings/workspace-settings-storage"
import {
  enabledOptionalHosts,
  framingRuleIdsForTab,
  framingSessionRulesForTab,
  type FramingSessionRuleSpec,
} from "../../domain/workspace/framing-session-rules"
import type { OptionalHost } from "../../domain/workspace/framing-policy"
import { ChromeStorageLive } from "./storage"

export class FramingSessionRulesUpdateFailed extends Data.TaggedError(
  "FramingSessionRulesUpdateFailed",
)<{
  readonly cause: unknown
}> {}

const toChromeRule = (
  spec: FramingSessionRuleSpec,
): chrome.declarativeNetRequest.Rule => {
  const responseHeaders: chrome.declarativeNetRequest.ModifyHeaderInfo[] = []
  for (const header of spec.action.responseHeaders) {
      responseHeaders.push({
        header: header.header,
        operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
      })
  }
  const resourceTypes: Array<
    `${chrome.declarativeNetRequest.ResourceType}`
  > = []
  for (const resourceType of spec.condition.resourceTypes) {
    resourceTypes.push(resourceType)
  }
  const tabIds: number[] = []
  for (const id of spec.condition.tabIds) {
    tabIds.push(id)
  }
  return {
    id: spec.id,
    priority: spec.priority,
    action: {
      type: spec.action.type,
      responseHeaders,
    },
    condition: {
      urlFilter: spec.condition.urlFilter,
      resourceTypes,
      tabIds,
    },
  }
}

const noOptionalHosts: readonly OptionalHost[] = []

const enabledOptionalForTab = () =>
  loadWorkspaceSettings().pipe(
    Effect.map((settings) => enabledOptionalHosts(settings.enabledProviders)),
    Effect.provide(ChromeStorageLive),
    Effect.catchAllCause((cause) =>
      Effect.logWarning("optional framing hosts unavailable", cause).pipe(
        Effect.as(noOptionalHosts),
      ),
    ),
  )

const replaceFramingSessionRules = (
  tabId: number,
  hosts: readonly OptionalHost[],
): Effect.Effect<void, FramingSessionRulesUpdateFailed> =>
  Effect.tryPromise({
    try: () => {
      const addRules: chrome.declarativeNetRequest.Rule[] = []
      for (const spec of framingSessionRulesForTab(tabId, hosts)) {
        addRules.push(toChromeRule(spec))
      }
      if (typeof chrome.declarativeNetRequest?.updateSessionRules !== "function") {
        return Promise.reject(
          new Error("declarativeNetRequest.updateSessionRules is not available"),
        )
      }
      return chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [...framingRuleIdsForTab(tabId)],
        addRules,
      })
    },
    catch: (cause) => new FramingSessionRulesUpdateFailed({ cause }),
  })

export const applyFramingSessionRules = (
  tabId: number,
): Effect.Effect<void, FramingSessionRulesUpdateFailed> =>
  enabledOptionalForTab().pipe(
    Effect.flatMap((hosts) => replaceFramingSessionRules(tabId, hosts)),
  )

export const removeFramingSessionRules = (
  tabId: number,
): Effect.Effect<void, FramingSessionRulesUpdateFailed> =>
  Effect.tryPromise({
    try: () =>
      chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [...framingRuleIdsForTab(tabId)],
        addRules: [],
      }),
    catch: (cause) => new FramingSessionRulesUpdateFailed({ cause }),
  })
