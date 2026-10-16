import { Either, Schema } from "effect"
import { isThisWindow } from "../page-file-assign"

export const claudeIncognitoChordRequest =
  "plurality-dialogue:claude-incognito-chord"

const IncognitoChordRequest = Schema.Struct({
  source: Schema.Literal(claudeIncognitoChordRequest),
})

const decodeIncognitoChordRequest = Schema.decodeUnknownEither(
  IncognitoChordRequest,
)

// Claude binds this on keydown. A paired keyup can toggle incognito off
// when both events hit the same handler.
export const incognitoChordInit = (platform: string): KeyboardEventInit => {
  const mac = isMac(platform)
  return {
    key: "I",
    code: "KeyI",
    ctrlKey: !mac,
    metaKey: mac,
    shiftKey: true,
    bubbles: true,
    cancelable: true,
  }
}

export const dispatchIncognitoChord = (
  target: EventTarget,
  platform: string,
): void => {
  target.dispatchEvent(new KeyboardEvent("keydown", incognitoChordInit(platform)))
}

export const onIncognitoChordMessage = (
  event: MessageEvent,
  platform: string,
  target: EventTarget,
): void => {
  if (!isThisWindow(event.source)) {
    return
  }
  if (Either.isLeft(decodeIncognitoChordRequest(event.data))) {
    return
  }
  dispatchIncognitoChord(target, platform)
}

// Isolated content script and the page do not share listeners. The page's
// shortcut handler only sees a key dispatched in the main world.
export const requestClaudeIncognitoChord = (): void => {
  window.postMessage({ source: claudeIncognitoChordRequest }, "*")
}

let installed = false

export const installIncognitoChordListener = (): void => {
  if (installed) {
    return
  }
  installed = true
  const platform = navigator.platform
  window.addEventListener("message", (event) => {
    onIncognitoChordMessage(event, platform, document)
  })
}

const isMac = (platform: string): boolean =>
  platform === "macOS" || platform.includes("Mac")
