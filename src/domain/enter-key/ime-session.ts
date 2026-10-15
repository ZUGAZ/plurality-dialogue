import type { EnterChord } from "./enter-chord"

export type ImeSession = {
  readonly composing: boolean
}

export const imeIdle: ImeSession = { composing: false }

export const noteCompositionStart = (): ImeSession => ({ composing: true })

export const noteCompositionEnd = (): ImeSession => ({ composing: false })

// keyCode 229 is the legacy IME marker. The session covers a keydown whose
// isComposing flag is still false between compositionstart and compositionend.
export const isMidIme = (session: ImeSession, chord: EnterChord): boolean =>
  session.composing || chord.isComposing || chord.keyCode === 229
