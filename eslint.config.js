import tseslint from "typescript-eslint"
import boundaries from "eslint-plugin-boundaries"

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".wxt/**",
      ".output/**",
      "dist/**",
      "eslint.config.js",
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/prefer-as-const": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
      },
      "boundaries/elements": [
        { type: "domain", pattern: "src/domain" },
        { type: "infrastructure", pattern: "src/infrastructure" },
        { type: "entrypoints", pattern: "src/entrypoints" },
        { type: "ui", pattern: "src/ui" },
        { type: "test-support", pattern: "src/test-support" },
      ],
      "boundaries/files": [
        { pattern: "src/**/*.test.ts", category: "test" },
        { pattern: "src/**/*.tsx", category: "tsx" },
        { pattern: "src/ui/**/view-model.ts", category: "view-model" },
        {
          pattern: "src/ui/workspace/panel-grid/persisted-grid-actions.ts",
          category: "view-model",
        },
        { pattern: "src/ui/**/model.ts", category: "presentation-model" },
        { pattern: "src/ui/**/slots.ts", category: "presentation-model" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          checkAllOrigins: true,
          policies: [
            {
              from: { element: { type: "domain" } },
              allow: {
                to: [
                  { element: { type: "domain" } },
                  { module: { origin: "external", source: "effect" } },
                ],
              },
            },
            {
              from: {
                element: { type: "domain" },
                file: { categories: "test" },
              },
              allow: {
                to: [
                  { element: { type: "domain" } },
                  {
                    module: {
                      origin: "external",
                      source: "effect",
                    },
                  },
                  {
                    module: {
                      origin: "external",
                      source: "@effect/vitest",
                    },
                  },
                  {
                    module: {
                      origin: "external",
                      source: "vitest",
                    },
                  },
                  { element: { type: "test-support" } },
                ],
              },
            },
            {
              from: { element: { type: "infrastructure" } },
              allow: {
                to: [
                  { element: { type: "domain" } },
                  { element: { type: "infrastructure" } },
                  { module: { origin: "external", source: "effect" } },
                ],
              },
            },
            {
              from: {
                element: { type: "infrastructure" },
                file: { categories: "test" },
              },
              allow: {
                to: [
                  { element: { type: "infrastructure" } },
                  { element: { type: "domain" } },
                  { module: { origin: "external", source: "effect" } },
                  {
                    module: {
                      origin: "external",
                      source: "@effect/vitest",
                    },
                  },
                  {
                    module: {
                      origin: "external",
                      source: "vitest",
                    },
                  },
                  {
                    module: {
                      origin: "core",
                      source: "node:fs",
                    },
                  },
                  {
                    module: {
                      origin: "core",
                      source: "node:url",
                    },
                  },
                  {
                    module: {
                      origin: "core",
                      source: "node:path",
                    },
                  },
                  { element: { type: "test-support" } },
                ],
              },
            },
            {
              from: { element: { type: "test-support" } },
              allow: {
                to: [
                  { element: { type: "test-support" } },
                  { module: { origin: "external", source: "effect" } },
                  {
                    module: {
                      origin: "external",
                      source: "@effect/vitest",
                    },
                  },
                  {
                    module: {
                      origin: "external",
                      source: "vitest",
                    },
                  },
                ],
              },
            },
            {
              from: { element: { type: "ui" } },
              allow: {
                to: [
                  { element: { type: "ui" } },
                  { module: { origin: "external", source: "effect" } },
                ],
              },
            },
            {
              from: {
                element: { type: "ui" },
                file: {
                  categories: {
                    anyOf: ["view-model", "presentation-model"],
                  },
                },
              },
              allow: { to: { element: { type: "domain" } } },
            },
            {
              from: {
                element: { type: "ui" },
                file: { categories: "view-model" },
              },
              allow: {
                to: { module: { origin: "external", source: "solid-js" } },
              },
            },
            {
              from: {
                file: { categories: "view-model" },
              },
              disallow: {
                to: { element: { type: "infrastructure" } },
              },
            },
            {
              from: {
                element: { type: "ui" },
                file: { categories: "test" },
              },
              allow: {
                to: [
                  { element: { type: "ui" } },
                  { element: { type: "domain" } },
                  { module: { origin: "external", source: "effect" } },
                  {
                    module: {
                      origin: "external",
                      source: "@effect/vitest",
                    },
                  },
                  {
                    module: {
                      origin: "external",
                      source: "vitest",
                    },
                  },
                  {
                    module: {
                      origin: "external",
                      source: "solid-js",
                    },
                  },
                  { element: { type: "test-support" } },
                ],
              },
            },
            {
              from: { element: { type: "entrypoints" } },
              allow: {
                to: [
                  {
                    element: {
                      type: ["ui", "infrastructure", "domain"],
                    },
                  },
                  { module: { origin: "external", source: "effect" } },
                  { module: { origin: "external", source: "solid-js" } },
                  { module: { origin: "external", source: "#imports" } },
                  { module: { origin: "unknown", source: "#imports" } },
                ],
              },
            },
            {
              from: { file: { categories: "tsx" } },
              allow: {
                to: { module: { origin: "external", source: "solid-js" } },
              },
            },
            {
              from: { file: { categories: "tsx" } },
              disallow: {
                to: { module: { origin: "external", source: "effect" } },
              },
            },
            {
              from: { file: { categories: "presentation-model" } },
              disallow: {
                to: { module: { origin: "external", source: "effect" } },
              },
            },
            {
              from: { element: { type: "domain" } },
              disallow: {
                to: {
                  element: { type: ["infrastructure", "ui", "entrypoints"] },
                },
              },
            },
            {
              from: { file: { categories: "tsx" } },
              disallow: {
                to: { element: { type: "infrastructure" } },
              },
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "effect",
              message: "Views stay Effect-free.",
            },
          ],
        },
      ],
    },
  },
)
