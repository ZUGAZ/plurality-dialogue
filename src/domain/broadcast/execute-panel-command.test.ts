import { Effect, Layer, Ref } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { FillAndSubmit } from "./commands/fill-and-submit"
import { FillComposer } from "./commands/fill-composer"
import type { PanelIdentity } from "./execute-panel-command"
import { executePanelCommand } from "./execute-panel-command"
import { isPanelCommandErr } from "../messaging/panel-command-err"
import { isPanelCommandOk } from "../messaging/panel-command-ok"
import { makeInMemoryProviderPage } from "../ports/in-memory-provider-page"
import type { PendingImage } from "./pending-image"
import { ComposerNotFound, ImageAttachFailed, ProviderPage } from "../ports/provider-page"

const identity: PanelIdentity = { providerId: "chatgpt", panelId: "panel-1" }

const png = (id: string): PendingImage => ({
  id,
  name: "a.png",
  mediaType: "image/png",
  bytes: Uint8Array.of(1, 2, 3),
})

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
      expect(yield* Ref.get(fake.attached)).toEqual([])
    }),
  )

  it.effect("fill-and-submit with no images does not attach", () =>
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
      expect(yield* Ref.get(fake.attached)).toEqual([])
      expect(yield* Ref.get(fake.submitCount)).toBe(1)
    }),
  )

  it.effect("fill-and-submit with an image fills, attaches, then submits", () =>
    Effect.gen(function* () {
      const image = png("img-1")
      const steps = yield* Ref.make<readonly string[]>([])
      const layer = Layer.succeed(ProviderPage, {
        fillComposer: () =>
          Ref.update(steps, (recorded) => [...recorded, "fill"]),
        attachImages: (images) =>
          Ref.update(steps, (recorded) => [
            ...recorded,
            `attach:${images.map((item) => item.id).join(",")}`,
          ]),
        submit: () => Ref.update(steps, (recorded) => [...recorded, "submit"]),
      })
      const response = yield* executePanelCommand(
        FillAndSubmit.make({ prompt: "hello", images: [image] }),
        identity,
      ).pipe(Effect.provide(layer))
      expect(isPanelCommandOk(response)).toBe(true)
      expect(yield* Ref.get(steps)).toEqual(["fill", "attach:img-1", "submit"])
    }),
  )

  it.effect("attach failure skips submit", () =>
    Effect.gen(function* () {
      const submitCount = yield* Ref.make(0)
      const layer = Layer.succeed(ProviderPage, {
        fillComposer: () => Effect.void,
        attachImages: () =>
          Effect.fail(new ImageAttachFailed({ reason: "missing" })),
        submit: () => Ref.update(submitCount, (count) => count + 1),
      })
      const response = yield* executePanelCommand(
        FillAndSubmit.make({ prompt: "hello", images: [png("img-1")] }),
        identity,
      ).pipe(Effect.provide(layer))
      expect(isPanelCommandErr(response)).toBe(true)
      if (isPanelCommandErr(response)) {
        expect(response.reason).toBe("image-attach-failed")
      }
      expect(yield* Ref.get(submitCount)).toBe(0)
    }),
  )

  it.effect("fill error maps to PanelCommandErr and does not submit", () =>
    Effect.gen(function* () {
      const submitCount = yield* Ref.make(0)
      const layer = Layer.succeed(ProviderPage, {
        fillComposer: () =>
          Effect.fail(new ComposerNotFound({ reason: "missing" })),
        attachImages: () =>
          Effect.fail(new ImageAttachFailed({ reason: "should not run" })),
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
