import { beforeAll } from "bun:test"

import { packPlugin } from "#__tests__/utils.ts"

import "@adamhl8/configs/test/preload"

beforeAll(async () => {
  await console.write("Building plugin...")
  await packPlugin()
  await console.write("done\n")
  await console.write("Running tests...\n")
}, 60_000)
