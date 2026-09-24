import { afterAll, beforeAll } from "bun:test"

import { packPlugin, removeTempDirs } from "#__tests__/utils.ts"

beforeAll(async () => {
  console.write("Building plugin...")
  await packPlugin()
  console.write("done\n")
  console.write("Running tests...\n")
}, 60_000)

afterAll(removeTempDirs)
