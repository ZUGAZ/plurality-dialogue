import { Effect, Runtime } from "effect"

export type RunEffect<Requirements> = <Success, Error>(
  effect: Effect.Effect<Success, Error, Requirements>,
) => void

type BoundProperty<Value> = Value extends Effect.Effect<
  infer _Success,
  infer _Error,
  infer _Requirements
>
  ? () => void
  : Value extends (
        ...args: infer Args
      ) => Effect.Effect<infer _FnSuccess, infer _FnError, infer _FnRequirements>
    ? (...args: Args) => void
    : Value

export type BoundViewModel<ViewModel extends Record<string, unknown>> = {
  readonly [Key in keyof ViewModel]: BoundProperty<ViewModel[Key]>
}

const isRuntimeEffect = <Requirements>(
  value: unknown,
): value is Effect.Effect<unknown, unknown, Requirements> =>
  Effect.isEffect(value)

const isUnknownFunction = (
  value: unknown,
): value is (...args: never[]) => unknown => typeof value === "function"

const bindReturnedEffect = <Requirements>(
  runEffect: RunEffect<Requirements>,
  fn: (...args: never[]) => unknown,
): ((...args: never[]) => unknown) =>
  (...args: never[]) => {
    const returned = fn(...args)
    if (isRuntimeEffect<Requirements>(returned)) {
      runEffect(returned)
      return
    }
    return returned
  }

export const bindViewModel = <
  Requirements,
  ViewModel extends Record<string, unknown>,
>(
  runtime: Runtime.Runtime<Requirements>,
  createViewModel: (runEffect: RunEffect<Requirements>) => ViewModel,
): BoundViewModel<ViewModel> => {
  const runEffect: RunEffect<Requirements> = (effect) => {
    Runtime.runFork(runtime)(effect)
  }
  const viewModel = createViewModel(runEffect)
  return Object.fromEntries(
    Object.entries(viewModel).map(([key, value]) => {
      if (isRuntimeEffect<Requirements>(value)) {
        const boundAction = () => {
          runEffect(value)
        }
        const boundEntry: [string, () => void] = [key, boundAction]
        return boundEntry
      }
      if (isUnknownFunction(value)) {
        const boundFn = bindReturnedEffect(runEffect, value)
        const boundFnEntry: [string, (...args: never[]) => unknown] = [
          key,
          boundFn,
        ]
        return boundFnEntry
      }
      const passthroughEntry: [string, unknown] = [key, value]
      return passthroughEntry
    }),
  ) as BoundViewModel<ViewModel> // fromEntries cannot preserve keys
}
