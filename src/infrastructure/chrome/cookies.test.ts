import { describe, expect, it } from "@effect/vitest"
import { browserCookieOf } from "./cookies"

const chromeCookie = (
  overrides: Partial<chrome.cookies.Cookie>,
): chrome.cookies.Cookie => ({
  name: "sso",
  value: "token",
  domain: ".grok.com",
  path: "/",
  storeId: "0",
  session: true,
  hostOnly: false,
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  ...overrides,
})

describe("browserCookieOf", () => {
  it("keeps name, value, domain and SameSite", () => {
    expect(browserCookieOf(chromeCookie({}))).toEqual({
      name: "sso",
      value: "token",
      domain: ".grok.com",
      sameSite: "lax",
      partitioned: false,
    })
  })

  it("flags partitioned cookies by their partition key", () => {
    const partitioned = browserCookieOf(
      chromeCookie({
        name: "cf_clearance",
        sameSite: "no_restriction",
        partitionKey: { topLevelSite: "https://grok.com" },
      }),
    )
    expect(partitioned.partitioned).toBe(true)
    expect(partitioned.sameSite).toBe("no_restriction")
  })
})
