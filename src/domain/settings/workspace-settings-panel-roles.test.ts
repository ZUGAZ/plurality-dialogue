import { Either, Schema } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  WorkspaceSettings,
  decodeWorkspaceSettings,
} from "./workspace-settings"

const base = {
  enabledProviders: ["chatgpt", "claude", "gemini"],
  layout: "1x3",
  panelProviders: ["claude", null, "gemini"],
}

const decodeRight = (input: unknown): WorkspaceSettings =>
  Either.getOrThrow(decodeWorkspaceSettings(input))

describe("workspace settings panelRoles", () => {
  it("leaves a missing panelRoles absent and panelProviders unchanged", () => {
    const settings = decodeRight(base)
    expect(Object.hasOwn(settings, "panelRoles")).toBe(false)
    expect(settings.panelProviders).toEqual(["claude", null, "gemini"])
  })

  it("decodes a valid array and trims ids", () => {
    const settings = decodeRight({
      ...base,
      panelRoles: [" skeptic ", null],
    })
    expect(settings.panelRoles).toEqual(["skeptic", null])
  })

  it("decodes a long array of valid ids at its full length", () => {
    const sevenIds = ["a", "b", "c", "d", "e", "f", "g"]
    const settings = decodeRight({ ...base, panelRoles: sevenIds })
    expect(settings.panelRoles).toEqual(sevenIds)
  })

  const invalidValues: ReadonlyArray<readonly [string, unknown]> = [
    ["a string", "nope"],
    ["a blank id", [""]],
    ["a non-string entry", [1]],
  ]

  for (const [label, panelRoles] of invalidValues) {
    it(`decodes ${label} as an empty list and keeps the rest`, () => {
      const settings = decodeRight({ ...base, panelRoles })
      expect(settings.panelRoles).toEqual([])
      expect(settings.layout).toBe("1x3")
      expect(settings.enabledProviders).toEqual(["chatgpt", "claude", "gemini"])
      expect(settings.panelProviders).toEqual(["claude", null, "gemini"])
    })
  }

  it("round-trips a valid array through encode", () => {
    const settings = decodeRight({ ...base, panelRoles: ["skeptic", null] })
    const encoded = Schema.encodeSync(WorkspaceSettings)(settings)
    expect(encoded.panelRoles).toEqual(["skeptic", null])
    expect(decodeRight(encoded).panelRoles).toEqual(["skeptic", null])
  })

  it("omits the key when encoding a document without panelRoles", () => {
    const encoded = Schema.encodeSync(WorkspaceSettings)(decodeRight(base))
    expect(Object.hasOwn(encoded, "panelRoles")).toBe(false)
  })
})
