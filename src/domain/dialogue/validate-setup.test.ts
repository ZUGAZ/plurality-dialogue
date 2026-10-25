import { describe, expect, it } from "@effect/vitest"
import type { ProviderId } from "../provider/provider-id"
import { VendorCastSeat, YouCastSeat } from "./dialogue-setup"
import type { CastSeat, DialogueSetup } from "./dialogue-setup"
import {
  DisabledProvider,
  DuplicateName,
  EmptyTopic,
  MultipleYou,
  TooManyVendorSeats,
} from "./setup-problems"
import { validateSetup } from "./validate-setup"

const vendor = (
  name: string,
  providerId: ProviderId = "chatgpt",
): CastSeat =>
  VendorCastSeat.make({ providerId, roleId: "skeptic", name })

const setup = (
  topic: string,
  cast: readonly CastSeat[],
): DialogueSetup => ({
  topic,
  cast: [...cast],
})

const problemsFor = (
  topic: string,
  cast: readonly CastSeat[],
  enabledProviderIds: readonly ProviderId[],
) =>
  validateSetup({
    setup: setup(topic, cast),
    enabledProviderIds,
  })

describe("validateSetup", () => {
  it("accepts a topic, unique names, and enabled providers", () => {
    expect(
      problemsFor(
        "Heat",
        [vendor("Ada"), vendor("Bea", "claude"), YouCastSeat.make({})],
        ["chatgpt", "claude"],
      ),
    ).toEqual([])
  })

  it("flags an empty topic", () => {
    expect(problemsFor("", [vendor("Ada")], ["chatgpt"])).toEqual([
      EmptyTopic.make({}),
    ])
  })

  it("flags a fifth vendor seat", () => {
    const cast = ["A", "B", "C", "D", "E"].map((name) => vendor(name))
    expect(problemsFor("Heat", cast, ["chatgpt"])).toEqual([
      TooManyVendorSeats.make({}),
    ])
  })

  it("flags a second you", () => {
    expect(
      problemsFor("Heat", [YouCastSeat.make({}), YouCastSeat.make({})], []),
    ).toEqual([MultipleYou.make({}), DuplicateName.make({ name: "You" })])
  })

  it("flags a vendor named You beside the you seat", () => {
    expect(
      problemsFor("Heat", [vendor("You"), YouCastSeat.make({})], ["chatgpt"]),
    ).toEqual([DuplicateName.make({ name: "You" })])
  })

  it("flags a provider that is not enabled", () => {
    expect(problemsFor("Heat", [vendor("Ada", "grok")], ["chatgpt"])).toEqual([
      DisabledProvider.make({ providerId: "grok" }),
    ])
  })

  it("reports every problem on one setup", () => {
    expect(
      problemsFor(
        "",
        [vendor("Ada", "grok"), vendor("Ada", "chatgpt")],
        ["chatgpt"],
      ),
    ).toEqual([
      EmptyTopic.make({}),
      DuplicateName.make({ name: "Ada" }),
      DisabledProvider.make({ providerId: "grok" }),
    ])
  })
})
