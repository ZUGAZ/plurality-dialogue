import { Effect, Layer, Option } from "effect"
import {
  PromptLibrary,
  PromptLibraryReadError,
  PromptLibraryWriteError,
} from "../../domain/ports/prompt-library"

const databaseName = "plurality-dialogue-prompts"
const databaseVersion = 1
const storeName = "prompts"

const openIndexedDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion)
    request.onupgradeneeded = () => {
      const upgrading = request.result
      if (!upgrading.objectStoreNames.contains(storeName)) {
        upgrading.createObjectStore(storeName, { keyPath: "id" })
      }
    }
    request.onsuccess = () => {
      resolve(request.result)
    }
    request.onerror = () => {
      reject(request.error ?? "Failed to open the prompt database")
    }
    request.onblocked = () => {
      reject(request.error ?? "Prompt database open is blocked")
    }
  })

const requestResult = (request: IDBRequest): Promise<unknown> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result)
    }
    request.onerror = () => {
      reject(request.error ?? "IndexedDB request failed")
    }
  })

const runRequest = (
  db: IDBDatabase,
  mode: IDBTransactionMode,
  makeRequest: (store: IDBObjectStore) => IDBRequest,
): Promise<unknown> => {
  const store = db.transaction(storeName, mode).objectStore(storeName)
  return requestResult(makeRequest(store))
}

const unknownList = (value: unknown): readonly unknown[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined
  }
  return value
}

const readError = (cause: unknown) => new PromptLibraryReadError({ cause })

const writeError = (cause: unknown) => new PromptLibraryWriteError({ cause })

const runOnDatabase = <E>(
  database: Effect.Effect<IDBDatabase, unknown>,
  fail: (cause: unknown) => E,
  run: (db: IDBDatabase) => Promise<unknown>,
): Effect.Effect<unknown, E> =>
  database.pipe(
    Effect.mapError(fail),
    Effect.flatMap((db) =>
      Effect.tryPromise({
        try: () => run(db),
        catch: fail,
      }),
    ),
  )

const openDatabase = Effect.tryPromise({
  try: openIndexedDb,
  catch: (cause) => cause,
})

// Opens on the first port call and keeps the connection for this layer.
export const IndexedDbPromptLibraryLive = Layer.effect(
  PromptLibrary,
  Effect.gen(function* () {
    const database = yield* Effect.cached(openDatabase)
    return {
      getAll: () =>
        runOnDatabase(database, readError, (db) =>
          runRequest(db, "readonly", (store) => store.getAll()),
        ).pipe(
          Effect.flatMap((value) => {
            const prompts = unknownList(value)
            if (prompts === undefined) {
              return Effect.fail(readError(value))
            }
            return Effect.succeed(prompts)
          }),
        ),
      get: (id: string) =>
        runOnDatabase(database, readError, (db) =>
          runRequest(db, "readonly", (store) => store.get(id)),
        ).pipe(
          Effect.map((value) =>
            value === undefined ? Option.none() : Option.some(value),
          ),
        ),
      put: (value: unknown) =>
        runOnDatabase(database, writeError, (db) =>
          runRequest(db, "readwrite", (store) => store.put(value)),
        ).pipe(Effect.asVoid),
      delete: (id: string) =>
        runOnDatabase(database, writeError, (db) =>
          runRequest(db, "readwrite", (store) => store.delete(id)),
        ).pipe(Effect.asVoid),
    }
  }),
)
