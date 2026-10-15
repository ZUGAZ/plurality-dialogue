import { describe, expect, it } from "@effect/vitest"
import {
  defaultEnterKeyCustom,
  type EnterKeyCustom,
} from "../settings/enter-key-custom"
import type { EnterKeyPreset } from "../settings/enter-key-preset"
import type { EnterChord } from "./enter-chord"
import {
  repeatPolicy,
  resolveEnterAction,
  type EnterKeyAction,
} from "./enter-key-action"
import { imeIdle, type ImeSession } from "./ime-session"

const presets: readonly EnterKeyPreset[] = [
  "default",
  "swapped",
  "slack",
  "custom",
]

const savedMap: EnterKeyCustom = {
  enter: "submit",
  shiftEnter: "insert-newline",
  ctrlEnter: "insert-newline",
}

const disagreeing: EnterKeyCustom = {
  enter: "submit",
  shiftEnter: "insert-newline",
  ctrlEnter: "insert-newline",
}

describe("enter key action", () => {
  it("follows the preset table, with meta and ctrl+shift in the ctrl slot", () => {
    const rows: ReadonlyArray<
      readonly [EnterKeyPreset, Partial<EnterChord>, EnterKeyAction]
    > = [
      ["default", {}, "passthrough"],
      ["default", { shiftKey: true }, "passthrough"],
      ["default", { ctrlKey: true }, "passthrough"],
      ["default", { metaKey: true }, "passthrough"],
      ["default", { ctrlKey: true, shiftKey: true }, "passthrough"],
      ["default", { metaKey: true, shiftKey: true }, "passthrough"],
      ["swapped", {}, "insert-newline"],
      ["swapped", { shiftKey: true }, "submit"],
      ["swapped", { ctrlKey: true }, "submit"],
      ["swapped", { metaKey: true }, "submit"],
      ["swapped", { ctrlKey: true, shiftKey: true }, "submit"],
      ["swapped", { metaKey: true, shiftKey: true }, "submit"],
      ["slack", {}, "insert-newline"],
      ["slack", { shiftKey: true }, "insert-newline"],
      ["slack", { ctrlKey: true }, "submit"],
      ["slack", { metaKey: true }, "submit"],
      ["slack", { ctrlKey: true, shiftKey: true }, "submit"],
      ["slack", { metaKey: true, shiftKey: true }, "submit"],
    ]
    for (const [preset, modifiers, action] of rows) {
      expect(resolve(preset, enter(modifiers))).toBe(action)
    }
  })

  it("passes Alt through for every preset", () => {
    const chords = [
      enter({ altKey: true }),
      enter({ altKey: true, shiftKey: true }),
      enter({ altKey: true, ctrlKey: true }),
    ]
    for (const preset of presets) {
      for (const chord of chords) {
        expect(resolve(preset, chord, disagreeing)).toBe("passthrough")
      }
    }
  })

  it("applies the repeat policy after the slot action", () => {
    expect(repeatPolicy("submit", true)).toBe("swallow")
    expect(repeatPolicy("insert-newline", true)).toBe("insert-newline")
    expect(repeatPolicy("passthrough", true)).toBe("passthrough")
    expect(repeatPolicy("submit", false)).toBe("submit")
    expect(resolve("swapped", enter({ shiftKey: true, repeat: true }))).toBe(
      "swallow",
    )
    expect(resolve("swapped", enter({ repeat: true }))).toBe("insert-newline")
    expect(resolve("default", enter({ repeat: true }))).toBe("passthrough")
  })

  it("passes mid-IME Enter and non-Enter keys through", () => {
    const composing = { composing: true } satisfies ImeSession
    for (const preset of presets) {
      expect(resolve(preset, enter({ isComposing: true }), disagreeing)).toBe(
        "passthrough",
      )
      expect(resolve(preset, enter({ keyCode: 229 }), disagreeing)).toBe(
        "passthrough",
      )
      expect(resolveDuring(preset, enter(), composing)).toBe("passthrough")
    }
    expect(resolve("swapped", enter({ key: "a" }))).toBe("passthrough")
  })

  it("reads the saved custom map, including ctrl+shift as ctrlEnter", () => {
    expect(resolve("custom", enter(), savedMap)).toBe("submit")
    expect(resolve("custom", enter({ shiftKey: true }), savedMap)).toBe(
      "insert-newline",
    )
    expect(resolve("custom", enter({ ctrlKey: true }), savedMap)).toBe(
      "insert-newline",
    )
    expect(resolve("custom", enter({ metaKey: true }), savedMap)).toBe(
      "insert-newline",
    )
    expect(
      resolve("custom", enter({ ctrlKey: true, shiftKey: true }), savedMap),
    ).toBe("insert-newline")
  })

  it("matches swapped when custom is the default map", () => {
    const chords = [
      enter(),
      enter({ shiftKey: true }),
      enter({ ctrlKey: true }),
      enter({ metaKey: true }),
      enter({ ctrlKey: true, shiftKey: true }),
    ]
    for (const chord of chords) {
      expect(resolve("custom", chord, defaultEnterKeyCustom)).toBe(
        resolve("swapped", chord, disagreeing),
      )
    }
  })

  it("ignores a custom map for presets other than custom", () => {
    expect(resolve("swapped", enter(), disagreeing)).toBe("insert-newline")
    expect(resolve("slack", enter({ ctrlKey: true }), disagreeing)).toBe(
      "submit",
    )
    expect(resolve("default", enter(), disagreeing)).toBe("passthrough")
  })
})

const enter = (overrides: Partial<EnterChord> = {}): EnterChord => ({
  key: "Enter",
  shiftKey: false,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  repeat: false,
  isComposing: false,
  keyCode: 13,
  ...overrides,
})

const resolve = (
  preset: EnterKeyPreset,
  chord: EnterChord,
  custom: EnterKeyCustom = defaultEnterKeyCustom,
): EnterKeyAction =>
  resolveEnterAction({ preset, chord, session: imeIdle, custom })

const resolveDuring = (
  preset: EnterKeyPreset,
  chord: EnterChord,
  session: ImeSession,
): EnterKeyAction =>
  resolveEnterAction({ preset, chord, session, custom: disagreeing })
