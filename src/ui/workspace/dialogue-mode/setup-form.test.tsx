// @vitest-environment happy-dom
import { createSignal } from "solid-js"
import { render } from "solid-js/web"
import { describe, expect, it } from "vitest"
import type { ProviderOption } from "../panel-grid/model"
import type { RolePickerOption } from "../panel-role/model"
import type { DialogueSeatDraft } from "./model"
import { DialogueSetupForm } from "./setup-form"

const seat = (
  castIndex: number,
  providerId: DialogueSeatDraft["providerId"],
  roleId: string,
  name: string,
): DialogueSeatDraft => ({
  castIndex,
  seatNumber: castIndex + 1,
  providerId,
  roleId,
  name,
})

const providers = (): readonly ProviderOption[] => [
  { id: "chatgpt", label: "ChatGPT" },
  { id: "claude", label: "Claude" },
]

const roles = (): readonly RolePickerOption[] => [
  { id: "skeptic", label: "Skeptic" },
  { id: "historian", label: "Historian" },
]

describe("dialogue setup form", () => {
  it("keeps the display name focused while typing", () => {
    const host = document.createElement("div")
    document.body.append(host)
    const [seats, setSeats] = createSignal<readonly DialogueSeatDraft[]>([
      seat(0, "chatgpt", "skeptic", "A"),
    ])
    const dispose = render(
      () => (
        <DialogueSetupForm
          topic={() => "Heat"}
          seats={seats}
          includeMe={() => false}
          canAddVendor={() => true}
          providerOptions={() => [{ id: "chatgpt", label: "ChatGPT" }]}
          roleOptions={() => [{ id: "skeptic", label: "Skeptic" }]}
          roleDisabled={() => false}
          problems={() => []}
          startDisabled={() => false}
          onTopic={() => undefined}
          onAddVendor={() => undefined}
          onRemoveSeat={() => undefined}
          onProvider={() => undefined}
          onRole={() => undefined}
          onName={(_castIndex, name) => {
            setSeats([seat(0, "chatgpt", "skeptic", name)])
          }}
          onIncludeMe={() => undefined}
          onStart={() => undefined}
        />
      ),
      host,
    )
    const input = host.querySelector("input[name='dialogue-seat-0-name']")
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("missing display name field")
    }
    input.focus()
    input.value = "Ab"
    input.dispatchEvent(new InputEvent("input", { bubbles: true }))
    expect(seats()[0]?.name).toBe("Ab")
    expect(document.activeElement).toBe(input)
    expect(host.querySelector("input[name='dialogue-seat-0-name']")).toBe(input)
    dispose()
    host.remove()
  })

  it("keeps every other seat when one display name changes", () => {
    const host = document.createElement("div")
    document.body.append(host)
    const [seats, setSeats] = createSignal<readonly DialogueSeatDraft[]>([
      seat(0, "chatgpt", "skeptic", "Ru"),
      seat(1, "claude", "historian", "UK"),
    ])
    const providerWrites: Array<readonly [number, string]> = []
    const roleWrites: Array<readonly [number, string]> = []
    const dispose = render(
      () => (
        <DialogueSetupForm
          topic={() => "Heat"}
          seats={seats}
          includeMe={() => false}
          canAddVendor={() => true}
          providerOptions={providers}
          roleOptions={roles}
          roleDisabled={() => false}
          problems={() => []}
          startDisabled={() => false}
          onTopic={() => undefined}
          onAddVendor={() => undefined}
          onRemoveSeat={() => undefined}
          onProvider={(castIndex, providerId) => {
            providerWrites.push([castIndex, providerId])
            setSeats(
              seats().map((item) =>
                item.castIndex === castIndex ? { ...item, providerId } : { ...item },
              ),
            )
          }}
          onRole={(castIndex, roleId) => {
            roleWrites.push([castIndex, roleId])
            setSeats(
              seats().map((item) =>
                item.castIndex === castIndex ? { ...item, roleId } : { ...item },
              ),
            )
          }}
          onName={(castIndex, name) => {
            setSeats(
              seats().map((item) =>
                item.castIndex === castIndex ? { ...item, name } : { ...item },
              ),
            )
          }}
          onIncludeMe={() => undefined}
          onStart={() => undefined}
        />
      ),
      host,
    )
    const input = field(host, "input", "dialogue-seat-0-name")
    const providerOption = host.querySelector(
      "select[name='dialogue-seat-1-provider'] option",
    )
    const roleOption = host.querySelector(
      "select[name='dialogue-seat-1-role'] option",
    )
    input.focus()
    input.value = "Rus"
    input.dispatchEvent(new InputEvent("input", { bubbles: true }))
    expect(host.querySelector("select[name='dialogue-seat-1-provider'] option")).toBe(
      providerOption,
    )
    expect(host.querySelector("select[name='dialogue-seat-1-role'] option")).toBe(
      roleOption,
    )
    expect(providerWrites).toEqual([])
    expect(roleWrites).toEqual([])
    expect(field(host, "select", "dialogue-seat-0-provider").value).toBe("chatgpt")
    expect(field(host, "select", "dialogue-seat-1-provider").value).toBe("claude")
    expect(field(host, "select", "dialogue-seat-0-role").value).toBe("skeptic")
    expect(field(host, "select", "dialogue-seat-1-role").value).toBe("historian")
    expect(field(host, "input", "dialogue-seat-0-name").value).toBe("Rus")
    expect(field(host, "input", "dialogue-seat-1-name").value).toBe("UK")
    expect(document.activeElement).toBe(input)
    dispose()
    host.remove()
  })
})

const field = (
  host: ParentNode,
  tag: "input" | "select",
  name: string,
): HTMLInputElement | HTMLSelectElement => {
  const element = host.querySelector(`${tag}[name='${name}']`)
  if (tag === "input" && element instanceof HTMLInputElement) {
    return element
  }
  if (tag === "select" && element instanceof HTMLSelectElement) {
    return element
  }
  throw new Error(`missing ${name}`)
}
