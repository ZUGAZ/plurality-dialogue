import { Effect } from "effect"
import { createRoot } from "solid-js"
import { describe, expect, it } from "@effect/vitest"
import { createUnifiedInputViewModel } from "./view-model"

describe("unified input view-model", () => {
  it("empty draft is not hasDraft", () => {
    const session = openSession()
    expect(session.vm.hasDraft()).toBe(false)
    session.dispose()
  })

  it('typed "hi" is hasDraft', () => {
    const session = openSession()
    session.vm.setDraft("hi")
    expect(session.vm.hasDraft()).toBe(true)
    session.dispose()
  })

  it.effect("clear empties draft and returns to idle", () =>
    Effect.gen(function* () {
      const session = openSession()
      session.vm.setDraft("hi")
      yield* session.vm.fill()
      session.vm.clear()
      expect(session.vm.draft()).toBe("")
      expect(session.vm.hasDraft()).toBe(false)
      expect(session.vm.status()).toEqual({ kind: "idle" })
      session.dispose()
    }),
  )

  it.effect("fill leaves draft and sets fill-not-wired", () =>
    Effect.gen(function* () {
      const session = openSession()
      session.vm.setDraft("hi")
      yield* session.vm.fill()
      expect(session.vm.draft()).toBe("hi")
      expect(session.vm.status()).toEqual({ kind: "fill-not-wired" })
      session.dispose()
    }),
  )

  it.effect("sendAll leaves draft and sets send-not-wired", () =>
    Effect.gen(function* () {
      const session = openSession()
      session.vm.setDraft("hi")
      yield* session.vm.sendAll()
      expect(session.vm.draft()).toBe("hi")
      expect(session.vm.status()).toEqual({ kind: "send-not-wired" })
      session.dispose()
    }),
  )
})

const openSession = () =>
  createRoot((dispose) => ({
    vm: createUnifiedInputViewModel(() => undefined),
    dispose,
  }))
