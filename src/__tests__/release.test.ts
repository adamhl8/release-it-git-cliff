import { expect, it, setDefaultTimeout } from "bun:test"
import path from "node:path"

import { createRepo } from "#__tests__/utils.ts"

setDefaultTimeout(30_000)

it("bumps package.json to git-cliff's bumped version", async () => {
  const { dir, run } = await createRepo()
  await run`git commit --allow-empty -m ${"feat: add a feature"}`

  await run`release-it --ci`

  const packageJson = (await Bun.file(path.join(dir, "package.json")).json()) as unknown
  expect(packageJson).toMatchObject({ version: "1.1.0" })
})

it("keeps a v prefix on the tag", async () => {
  const { dir, run } = await createRepo({ tagPrefix: "v" })
  await run`git commit --allow-empty -m ${"feat: add a feature"}`

  await run`release-it --ci`

  const { stdout: tag } = await run`git tag --points-at HEAD`
  expect(tag).toBe("v1.1.0")
  const packageJson = (await Bun.file(path.join(dir, "package.json")).json()) as unknown
  expect(packageJson).toMatchObject({ version: "1.1.0" })
})

it("uses git.tagName for other prefixes", async () => {
  const { dir, run } = await createRepo({
    tagPrefix: "release-",
    // oxlint-disable-next-line no-template-curly-in-string - release-it expands `${version}` in `tagName`
    releaseItOptions: { git: { tagName: "release-${version}" } },
  })
  await run`git commit --allow-empty -m ${"feat: add a feature"}`

  await run`release-it --ci`

  const { stdout: tag } = await run`git tag --points-at HEAD`
  expect(tag).toBe("release-1.1.0")
  const packageJson = (await Bun.file(path.join(dir, "package.json")).json()) as unknown
  expect(packageJson).toMatchObject({ version: "1.1.0" })
})
