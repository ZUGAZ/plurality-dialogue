import { Data, Effect } from "effect"
import type {
  BrowserCookie,
  CookieSameSite,
} from "../../domain/workspace/websocket-cookie-rule"

export class CookiesReadFailed extends Data.TaggedError("CookiesReadFailed")<{
  readonly cause: unknown
}> {}

const sameSiteOf = (value: `${chrome.cookies.SameSiteStatus}`): CookieSameSite =>
  value

export const browserCookieOf = (cookie: chrome.cookies.Cookie): BrowserCookie => ({
  name: cookie.name,
  value: cookie.value,
  domain: cookie.domain,
  sameSite: sameSiteOf(cookie.sameSite),
  partitioned: cookie.partitionKey !== undefined,
})

// The cookies Chrome itself would attach to a first-party request for `url`:
// domain, path, and Secure already filtered by the browser.
export const readCookiesForUrl = (
  url: string,
): Effect.Effect<readonly BrowserCookie[], CookiesReadFailed> =>
  Effect.tryPromise({
    try: () => {
      if (typeof chrome.cookies?.getAll !== "function") {
        return Promise.reject(new Error("cookies.getAll is not available"))
      }
      return chrome.cookies.getAll({ url })
    },
    catch: (cause) => new CookiesReadFailed({ cause }),
  }).pipe(Effect.map((cookies) => cookies.map(browserCookieOf)))

// Fires for the cookie that was added or removed. An overwrite reports the
// old cookie as removed and the new one as added.
export const subscribeCookieChanged = (
  onChange: (cookie: BrowserCookie) => void,
): void => {
  if (typeof chrome.cookies?.onChanged?.addListener !== "function") {
    return
  }
  chrome.cookies.onChanged.addListener((change) => {
    onChange(browserCookieOf(change.cookie))
  })
}
