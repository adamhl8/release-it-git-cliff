import { expect, it, setDefaultTimeout } from "bun:test"
import fs from "node:fs/promises"
import path from "node:path"

import { createRepo, makeTempDir } from "#__tests__/utils.ts"

setDefaultTimeout(30_000)

it("uses a config file from a path", async () => {
  const configPath = path.join(await makeTempDir(), "cliff.toml")
  await fs.writeFile(
    configPath,
    '[git]\nconventional_commits = true\n\n[bump]\ncustom_major_increment_regex = "docs"\n',
  )
  const { run } = await createRepo({
    releaseItOptions: { plugins: { "release-it-git-cliff": { config: configPath } } },
  })
  await run`git commit --allow-empty -m ${"docs: update docs"}`

  const { stdout } = await run`release-it --release-version`

  expect(stdout).toBe("2.0.0")
})

it("uses a built-in config by name", async () => {
  const { run } = await createRepo({
    releaseItOptions: { plugins: { "release-it-git-cliff": { config: "keepachangelog" } } },
  })
  // Use an unconventional commit because `keepachangelog` keeps it, and the other two configs drop it.
  await run`git commit --allow-empty -m ${"Update the readme"}`

  const { stdout } = await run`release-it --release-version`

  expect(stdout).toBe("1.0.1")
})
