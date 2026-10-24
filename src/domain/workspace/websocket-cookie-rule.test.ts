import { Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  websocketCookieHosts,
  websocketHostPermissionPatterns,
  websocketResourceTypes,
} from "./framing-policy"
import {
  framingRuleId,
  framingRuleIdsForTab,
  ruleIdStride,
} from "./framing-session-rules"
import {
  changesWebsocketCookieLine,
  cookieHeaderLine,
  cookiesDroppedFromWebsocket,
  isCookieDomainOf,
  websocketCookieRuleForTab,
  websocketCookieRuleIdsForTab,
  websocketCookieUrl,
  type BrowserCookie,
} from "./websocket-cookie-rule"

const cookie = (
  name: string,
  sameSite: BrowserCookie["sameSite"],
  partitioned = false,
): BrowserCookie => ({
  name,
  value: `${name}-value`,
  domain: ".grok.com",
  sameSite,
  partitioned,
})

const sso = cookie("sso", "lax")
const ssoRw = cookie("sso_rw", "strict")
const legacy = cookie("legacy", "unspecified")
const none = cookie("none", "no_restriction")
const cfClearance = cookie("cf_clearance", "no_restriction", true)
const all = [sso, ssoRw, legacy, none, cfClearance]

describe("websocket cookie rule", () => {
  it("covers grok over wss with a cookies lookup on https", () => {
    expect(websocketCookieHosts).toEqual(["grok.com"])
    expect(websocketHostPermissionPatterns).toEqual(["wss://grok.com/*"])
    expect(websocketCookieUrl("grok.com")).toBe("https://grok.com/")
    expect(websocketResourceTypes).toEqual(["websocket"])
  })

  it("appends only what Chrome drops from the handshake", () => {
    expect(cookiesDroppedFromWebsocket(all)).toEqual([sso, ssoRw, legacy])
    expect(cookieHeaderLine(cookiesDroppedFromWebsocket(all))).toBe(
      "sso=sso-value; sso_rw=sso_rw-value; legacy=legacy-value",
    )
    expect(cookieHeaderLine([])).toBe("")
  })

  it("matches cookies by registrable host, with or without the dot", () => {
    expect(isCookieDomainOf("grok.com", "grok.com")).toBe(true)
    expect(isCookieDomainOf(".grok.com", "grok.com")).toBe(true)
    expect(isCookieDomainOf("accounts.grok.com", "grok.com")).toBe(true)
    expect(isCookieDomainOf("notgrok.com", "grok.com")).toBe(false)
    expect(isCookieDomainOf("grok.com.evil.test", "grok.com")).toBe(false)
  })

  it("refreshes only for cookies that are part of the line", () => {
    expect(changesWebsocketCookieLine(sso)).toBe(true)
    expect(changesWebsocketCookieLine(legacy)).toBe(true)
    expect(changesWebsocketCookieLine(none)).toBe(false)
    expect(changesWebsocketCookieLine(cfClearance)).toBe(false)
    expect(
      changesWebsocketCookieLine({ ...sso, domain: "chatgpt.com" }),
    ).toBe(false)
  })

  it("builds an append rule fenced to one tab, grok initiator, our top", () => {
    const rule = websocketCookieRuleForTab({
      tabId: 7,
      host: "grok.com",
      cookies: all,
      extensionTopDomain: "abcdefghijklmnopabcdefghijklmnop",
    })
    expect(Option.isSome(rule)).toBe(true)
    if (Option.isNone(rule)) {
      return
    }
    expect(rule.value).toEqual({
      id: websocketCookieRuleIdsForTab(7)[0],
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          {
            header: "cookie",
            operation: "append",
            value: "sso=sso-value; sso_rw=sso_rw-value; legacy=legacy-value",
          },
        ],
      },
      condition: {
        requestDomains: ["grok.com"],
        initiatorDomains: ["grok.com"],
        topDomains: ["abcdefghijklmnopabcdefghijklmnop"],
        resourceTypes: ["websocket"],
        tabIds: [7],
      },
    })
  })

  it("leaves topDomains out when the browser cannot take it", () => {
    const rule = websocketCookieRuleForTab({
      tabId: 7,
      host: "grok.com",
      cookies: [sso],
      extensionTopDomain: undefined,
    })
    expect(Option.isSome(rule)).toBe(true)
    if (Option.isNone(rule)) {
      return
    }
    expect("topDomains" in rule.value.condition).toBe(false)
  })

  it("skips the rule when Chrome already sends everything", () => {
    for (const cookies of [[], [none, cfClearance]]) {
      expect(
        Option.isNone(
          websocketCookieRuleForTab({
            tabId: 7,
            host: "grok.com",
            cookies,
            extensionTopDomain: undefined,
          }),
        ),
      ).toBe(true)
    }
  })

  it("takes the id slot after the framing hosts, apart from optional ids", () => {
    expect(websocketCookieRuleIdsForTab(1)).toEqual([19])
    expect(websocketCookieRuleIdsForTab(1)[0]).toBe(framingRuleId(1, 7) + 1)
    for (const tabId of [1, 2, 1_173_892_741]) {
      const cookieIds = websocketCookieRuleIdsForTab(tabId)
      const framingIds = framingRuleIdsForTab(tabId)
      expect(cookieIds.some((id) => framingIds.includes(id))).toBe(false)
      for (const id of cookieIds) {
        expect(id % ruleIdStride).not.toBe(0)
        expect(id).toBeLessThanOrEqual(2_147_483_647)
      }
    }
  })
})
