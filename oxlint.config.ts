import { oxlintConfig } from "@adamhl8/configs"
import { defineConfig } from "oxlint"

const config = oxlintConfig({
  overrides: [
    {
      files: ["src/__tests__/**/*.ts"],
      rules: {
        "node/no-process-env": "off",
      },
    },
  ],
})

export default defineConfig(config)
