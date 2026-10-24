import type { Role } from "./role"

export const builtInRoles: readonly Role[] = [
  {
    id: "skeptic",
    name: "Skeptic",
    instruction:
      "Question the claim: name the weakest assumption and what evidence would change the conclusion.",
  },
  {
    id: "steelman",
    name: "Steelman",
    instruction:
      "Give the strongest fair version of the idea, then the best argument for it.",
  },
  {
    id: "implementer",
    name: "Implementer",
    instruction:
      "Turn the idea into the next concrete steps: what to do, in what order, and what to skip.",
  },
]
