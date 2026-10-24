import { Data, Effect, Option } from "effect"
import { websocketCookieHosts } from "../../domain/workspace/framing-policy"
import {
  websocketCookieRuleForTab,
  websocketCookieRuleIdsForTab,
  websocketCookieUrl,
  type WebsocketCookieRuleSpec,
} from "../../domain/workspace/websocket-cookie-rule"
import { readCookiesForUrl } from "./cookies"
import { listTabIdsForDocumentUrls } from "./tabs"

export class WebsocketCookieRulesUpdateFailed extends Data.TaggedError(
  "WebsocketCookieRulesUpdateFailed",
)<{
  readonly cause: unknown
}> {}

// `topDomains` pins the rule to tabs whose top-level page is ours. Chrome
// advertises support through RuleConditionKeys (145+); older Chrome rejects
// the key, so there the rule relies on tabIds and initiatorDomains alone.
const extensionTopDomain = (): string | undefined => {
  const keys: unknown = chrome.declarativeNetRequest?.RuleConditionKeys
  if (typeof keys !== "object" || keys === null) {
    return undefined
  }
  if (Reflect.get(keys, "TOP_DOMAINS") !== "topDomains") {
    return undefined
  }
  return chrome.runtime.id
}

const toChromeRule = (
  spec: WebsocketCookieRuleSpec,
): chrome.declarativeNetRequest.Rule => {
  const resourceTypes: Array<
    `${chrome.declarativeNetRequest.ResourceType}`
  > = []
  for (const resourceType of spec.condition.resourceTypes) {
    resourceTypes.push(resourceType)
  }
  const [cookie] = spec.action.requestHeaders
  const condition: chrome.declarativeNetRequest.RuleCondition = {
    requestDomains: [...spec.condition.requestDomains],
    initiatorDomains: [...spec.condition.initiatorDomains],
    resourceTypes,
    tabIds: [...spec.condition.tabIds],
  }
  if (spec.condition.topDomains !== undefined) {
    condition.topDomains = [...spec.condition.topDomains]
  }
  return {
    id: spec.id,
    priority: spec.priority,
    action: {
      type: spec.action.type,
      requestHeaders: [
        {
          header: cookie.header,
          operation: chrome.declarativeNetRequest.HeaderOperation.APPEND,
          value: cookie.value,
        },
      ],
    },
    condition,
  }
}

const updateSessionRules = (
  update: chrome.declarativeNetRequest.UpdateRuleOptions,
): Effect.Effect<void, WebsocketCookieRulesUpdateFailed> =>
  Effect.tryPromise({
    try: () => {
      if (typeof chrome.declarativeNetRequest?.updateSessionRules !== "function") {
        return Promise.reject(
          new Error("declarativeNetRequest.updateSessionRules is not available"),
        )
      }
      return chrome.declarativeNetRequest.updateSessionRules(update)
    },
    catch: (cause) => new WebsocketCookieRulesUpdateFailed({ cause }),
  })

const collectRules = (tabId: number) =>
  Effect.forEach(websocketCookieHosts, (host) =>
    readCookiesForUrl(websocketCookieUrl(host)).pipe(
      Effect.map((cookies) =>
        websocketCookieRuleForTab({
          tabId,
          host,
          cookies,
          extensionTopDomain: extensionTopDomain(),
        }),
      ),
    ),
  ).pipe(
    Effect.map((rules) =>
      rules.flatMap((rule) =>
        Option.match(rule, {
          onNone: () => [],
          onSome: (spec) => [toChromeRule(spec)],
        }),
      ),
    ),
  )

// Kept separate from the framing rules so a cookie read or an invalid cookie
// line cannot take the X-Frame-Options / CSP rules down with it.
export const applyWebsocketCookieRules = (
  tabId: number,
): Effect.Effect<void> =>
  collectRules(tabId).pipe(
    Effect.tap((addRules) =>
      Effect.log("websocket cookie rules", { tabId, count: addRules.length }),
    ),
    Effect.flatMap((addRules) =>
      updateSessionRules({
        removeRuleIds: [...websocketCookieRuleIdsForTab(tabId)],
        addRules,
      }),
    ),
    Effect.tapError((error) =>
      Effect.logWarning("websocket cookie rules failed", error),
    ),
    Effect.ignore,
    Effect.withLogSpan("websocketCookieRules"),
  )

// After a cookie of a WebSocket-cookie host changed: rebuild the line for
// every open workspace tab. No workspace tab means nothing to refresh.
export const refreshWebsocketCookieRules = (
  workspaceUrl: string,
): Effect.Effect<void> =>
  listTabIdsForDocumentUrls([workspaceUrl]).pipe(
    Effect.flatMap((tabIds) =>
      Effect.forEach(tabIds, applyWebsocketCookieRules, { discard: true }),
    ),
    Effect.catchTag("TabIdUnavailable", () => Effect.void),
    Effect.withLogSpan("refreshWebsocketCookieRules"),
  )

export const removeWebsocketCookieRules = (
  tabId: number,
): Effect.Effect<void, WebsocketCookieRulesUpdateFailed> =>
  updateSessionRules({
    removeRuleIds: [...websocketCookieRuleIdsForTab(tabId)],
    addRules: [],
  })
