import { Effect, Layer, Ref } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { FillAndSubmit } from "./commands/fill-and-submit"
import { FillComposer } from "./commands/fill-composer"
import type { PanelIdentity } from "./execute-panel-command"
import { executePanelCommand } from "./execute-panel-command"
import { isPanelCommandErr } from "../messaging/panel-command-err"
import { isPanelCommandOk } from "../messaging/panel-command-ok"
import { makeInMemoryProviderPage } from "../ports/in-memory-provider-page"
import { ComposerNotFound, ProviderPage } from "../ports/provider-page"

const identity: PanelIdentity = { providerId: "chatgpt", panelId: "panel-1" }

describe("executePanelCommand", () => {
  it.effect("fill-only never submits", () =>
    Effect.gen(function* () {
      const fake = makeInMemoryProviderPage()
      const response = yield* executePanelCommand(
        FillComposer.make({ prompt: "hello" }),
        identity,
      ).pipe(Effect.provide(fake.layer))
      expect(isPanelCommandOk(response)).toBe(true)
      if (isPanelCommandOk(response)) {
        expect(response.verb).toBe("filled")
      }
      expect(yield* Ref.get(fake.fills)).toEqual(["hello"])
      expect(yield* Ref.get(fake.submitCount)).toBe(0)
    }),
  )

  it.effect("fill-and-submit calls fill then submit", () =>
    Effect.gen(function* () {
      const fake = makeInMemoryProviderPage()
      const response = yield* executePanelCommand(
        FillAndSubmit.make({ prompt: "hello" }),
        identity,
      ).pipe(Effect.provide(fake.layer))
      expect(isPanelCommandOk(response)).toBe(true)
      if (isPanelCommandOk(response)) {
        expect(response.verb).toBe("submitted")
      }
      expect(yield* Ref.get(fake.fills)).toEqual(["hello"])
      expect(yield* Ref.get(fake.submitCount)).toBe(1)
    }),
  )

  it.effect("fill error maps to PanelCommandErr and does not submit", () =>
    Effect.gen(function* () {
      const submitCount = yield* Ref.make(0)
      const layer = Layer.succeed(ProviderPage, {
        fillComposer: () =>
          Effect.fail(new ComposerNotFound({ reason: "missing" })),
        submit: () => Ref.update(submitCount, (count) => count + 1),
      })
      const response = yield* executePanelCommand(
        FillAndSubmit.make({ prompt: "hello" }),
        identity,
      ).pipe(Effect.provide(layer))
      expect(isPanelCommandErr(response)).toBe(true)
      if (isPanelCommandErr(response)) {
        expect(response.reason).toBe("composer-not-found")
      }
      expect(yield* Ref.get(submitCount)).toBe(0)
    }),
  )
})
