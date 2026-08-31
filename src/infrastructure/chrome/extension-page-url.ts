export const extensionPageUrl = (path: string): string =>
  chrome.runtime.getURL(path.startsWith("/") ? path : `/${path}`)
