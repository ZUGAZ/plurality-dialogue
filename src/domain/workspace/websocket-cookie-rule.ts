import { Option } from "effect"
import {
  websocketCookieHosts,
  websocketResourceTypes,
  type WebsocketCookieHost,
} from "./framing-policy"
import { websocketCookieRuleId } from "./framing-rule-ids"

export type CookieSameSite = "no_restriction" | "lax" | "strict" | "unspecified"

export type BrowserCookie = {
  readonly name: string
  readonly value: string
  readonly domain: string
  readonly sameSite: CookieSameSite
  readonly partitioned: boolean
}

export type WebsocketCookieRuleSpec = {
  readonly id: number
  readonly priority: 1
  readonly action: {
    readonly type: "modifyHeaders"
    readonly requestHeaders: readonly [
      {
        // Lowercase on purpose: Chrome's append allowlist is matched
        // case-sensitively before 145, and "Cookie" is rejected there.
        readonly header: "cookie"
        readonly operation: "append"
        readonly value: string
      },
    ]
  }
  readonly condition: {
    readonly requestDomains: readonly [WebsocketCookieHost]
    readonly initiatorDomains: readonly [WebsocketCookieHost]
    // The extension id. Chrome 145+ only; older Chrome rejects the key.
    readonly topDomains?: readonly [string]
    readonly resourceTypes: typeof websocketResourceTypes
    readonly tabIds: readonly number[]
  }
}

export type WebsocketCookieRuleInput = {
  readonly tabId: number
  readonly host: WebsocketCookieHost
  readonly cookies: readonly BrowserCookie[]
  readonly extensionTopDomain: string | undefined
}

export const websocketCookieUrl = (host: WebsocketCookieHost): string =>
  `https://${host}/`

// "grok.com" and ".grok.com" both belong to grok.com; so do its subdomains.
export const isCookieDomainOf = (
  cookieDomain: string,
  host: WebsocketCookieHost,
): boolean => {
  const bare = cookieDomain.startsWith(".")
    ? cookieDomain.slice(1).toLowerCase()
    : cookieDomain.toLowerCase()
  return bare === host || bare.endsWith(`.${host}`)
}

export const isWebsocketCookieHostCookie = (cookie: BrowserCookie): boolean =>
  websocketCookieHosts.some((host) => isCookieDomainOf(cookie.domain, host))

// Chrome keeps SameSite=None cookies, partitioned ones included, on the
// handshake it sends itself. Only the ones it drops are appended, so nothing
// is sent twice.
export const cookiesDroppedFromWebsocket = (
  cookies: readonly BrowserCookie[],
): readonly BrowserCookie[] =>
  cookies.filter(
    (cookie) => cookie.sameSite !== "no_restriction" && !cookie.partitioned,
  )

// A change to a cookie that is in the appended line, or would be, means the
// line is stale.
export const changesWebsocketCookieLine = (cookie: BrowserCookie): boolean =>
  isWebsocketCookieHostCookie(cookie) &&
  cookiesDroppedFromWebsocket([cookie]).length === 1

export const cookieHeaderLine = (cookies: readonly BrowserCookie[]): string =>
  cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ")

// No dropped cookies means a signed-out user; Chrome's own handshake is then
// already complete and the rule is skipped.
export const websocketCookieRuleForTab = (
  input: WebsocketCookieRuleInput,
): Option.Option<WebsocketCookieRuleSpec> => {
  const line = cookieHeaderLine(cookiesDroppedFromWebsocket(input.cookies))
  if (line.length === 0) {
    return Option.none()
  }
  const fence: Pick<WebsocketCookieRuleSpec["condition"], "topDomains"> =
    input.extensionTopDomain === undefined
      ? {}
      : { topDomains: [input.extensionTopDomain] }
  return Option.some({
    id: websocketCookieRuleId(
      input.tabId,
      websocketCookieHosts.indexOf(input.host),
    ),
    priority: 1,
    action: {
      type: "modifyHeaders",
      requestHeaders: [{ header: "cookie", operation: "append", value: line }],
    },
    condition: {
      requestDomains: [input.host],
      initiatorDomains: [input.host],
      ...fence,
      resourceTypes: websocketResourceTypes,
      tabIds: [input.tabId],
    },
  })
}

export const websocketCookieRuleIdsForTab = (
  tabId: number,
): readonly number[] =>
  websocketCookieHosts.map((_, hostIndex) =>
    websocketCookieRuleId(tabId, hostIndex),
  )
