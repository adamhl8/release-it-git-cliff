import { expect, it, setDefaultTimeout } from "bun:test"
import { existsSync } from "node:fs"
import path from "node:path"

import { createRepo, env } from "#__tests__/utils.ts"

setDefaultTimeout(30_000)

it("fails when git-cliff isn't installed", async () => {
  const { run } = await createRepo()

  // Drop every `PATH` dir that has git-cliff, so the plugin can't resolve it.
  const PATH_WITHOUT_GIT_CLIFF = env.PATH.split(path.delimiter)
    .filter((dir) => !existsSync(path.join(dir, "git-cliff")))
    .join(path.delimiter)

  const { all, exitCode } = await run({
    reject: false,
    env: { ...env, PATH: PATH_WITHOUT_GIT_CLIFF },
  })`release-it --release-version`

  expect(exitCode).toBe(1)
  expect(all).toContain("git-cliff isn't installed or isn't on PATH.")
})
