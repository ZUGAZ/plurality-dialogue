import { Effect, Either } from "effect"
import type { EnterChord } from "../../domain/enter-key/enter-chord"
import { resolveEnterAction } from "../../domain/enter-key/enter-key-action"
import {
  imeIdle,
  noteCompositionEnd,
  noteCompositionStart,
  type ImeSession,
} from "../../domain/enter-key/ime-session"
import type { EnterKeyCustom } from "../../domain/settings/enter-key-custom"
import type { EnterKeyPreset } from "../../domain/settings/enter-key-preset"
import { composerContaining } from "./displayed-element"
import { insertLineBreak } from "./insert-line-break"
import { enabledSend } from "./make-fill-send-page"

export type EnterKeyListenerDeps = {
  readonly composerSelectors: readonly string[]
  readonly querySend: () => HTMLElement | null
  readonly currentSettings: () => {
    readonly preset: EnterKeyPreset
    readonly custom: EnterKeyCustom
  }
  readonly runEffect: (effect: Effect.Effect<void>) => void
}

const composerNotWritableWarning = Effect.logWarning(
  "composer is not writable",
).pipe(Effect.withLogSpan("enter-key"), Effect.withLogSpan("content"))

const sendNotEnabledWarning = Effect.logWarning(
  "send control is not enabled",
).pipe(Effect.withLogSpan("enter-key"), Effect.withLogSpan("content"))

export const installEnterKeyListener = (
  deps: EnterKeyListenerDeps,
): (() => void) => {
  let session: ImeSession = imeIdle
  let activeComposer: HTMLElement | null = null

  const onCompositionStart = (event: Event): void => {
    const composer = composerFor(deps, event.target)
    if (composer === null) {
      return
    }
    activeComposer = composer
    session = noteCompositionStart()
  }

  const onCompositionEnd = (event: Event): void => {
    const composer = composerFor(deps, event.target)
    if (composer === null || composer !== activeComposer) {
      return
    }
    activeComposer = null
    session = noteCompositionEnd()
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    const composer = composerFor(deps, event.target)
    if (composer === null) {
      return
    }
    const settings = deps.currentSettings()
    const action = resolveEnterAction({
      preset: settings.preset,
      chord: chordFromKeyboardEvent(event),
      session,
      custom: settings.custom,
    })
    if (action === "passthrough") {
      return
    }
    // Capture runs before the page's bubble listeners. preventDefault cancels
    // the browser default; stopImmediatePropagation blocks listeners not yet run.
    event.preventDefault()
    event.stopImmediatePropagation()
    if (action === "swallow") {
      return
    }
    if (action === "submit") {
      clickEnabledSend(deps)
      return
    }
    insertBreak(composer, deps)
  }

  document.addEventListener("keydown", onKeyDown, true)
  document.addEventListener("compositionstart", onCompositionStart, true)
  document.addEventListener("compositionend", onCompositionEnd, true)
  return () => {
    document.removeEventListener("keydown", onKeyDown, true)
    document.removeEventListener("compositionstart", onCompositionStart, true)
    document.removeEventListener("compositionend", onCompositionEnd, true)
  }
}

const composerFor = (
  deps: EnterKeyListenerDeps,
  target: EventTarget | null,
): HTMLElement | null =>
  composerContaining(document, deps.composerSelectors, target)

const chordFromKeyboardEvent = (event: KeyboardEvent): EnterChord => ({
  key: event.key,
  shiftKey: event.shiftKey,
  ctrlKey: event.ctrlKey,
  altKey: event.altKey,
  metaKey: event.metaKey,
  repeat: event.repeat,
  isComposing: event.isComposing,
  keyCode: event.keyCode,
})

const clickEnabledSend = (deps: EnterKeyListenerDeps): void => {
  const send = enabledSend(deps.querySend())
  if (send === null) {
    deps.runEffect(sendNotEnabledWarning)
    return
  }
  send.click()
}

const insertBreak = (
  composer: HTMLElement,
  deps: EnterKeyListenerDeps,
): void => {
  Either.match(insertLineBreak(composer), {
    onLeft: () => {
      deps.runEffect(composerNotWritableWarning)
    },
    onRight: () => undefined,
  })
}
