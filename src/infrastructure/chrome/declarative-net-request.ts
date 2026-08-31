import { Data, Effect } from "effect"
import {
  framingRuleIdsForTab,
  framingSessionRulesForTab,
  type FramingSessionRuleSpec,
} from "../../domain/workspace/framing-session-rules"

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
      operation: header.operation,
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

export const applyFramingSessionRules = (
  tabId: number,
): Effect.Effect<void, FramingSessionRulesUpdateFailed> =>
  Effect.tryPromise({
    try: () => {
      const addRules: chrome.declarativeNetRequest.Rule[] = []
      for (const spec of framingSessionRulesForTab(tabId)) {
        addRules.push(toChromeRule(spec))
      }
      return chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [...framingRuleIdsForTab(tabId)],
        addRules,
      })
    },
    catch: (cause) => new FramingSessionRulesUpdateFailed({ cause }),
  })

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
