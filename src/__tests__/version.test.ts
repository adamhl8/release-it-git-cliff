import { expect, it, setDefaultTimeout } from "bun:test"

import { createRepo } from "#__tests__/utils.ts"

setDefaultTimeout(30_000)

it("--release-version prints git-cliff's bumped version", async () => {
  const { run } = await createRepo()
  await run`git commit --allow-empty -m ${"feat: add a feature"}`

  const { stdout } = await run`release-it --release-version`

  expect(stdout).toBe("1.1.0")
})

it("--increment overrides git-cliff's bumped version", async () => {
  const { run } = await createRepo()
  await run`git commit --allow-empty -m ${"fix: fix a bug"}`

  const { stdout } = await run`release-it --release-version --increment major`

  expect(stdout).toBe("2.0.0")
})

it("--preRelease with --increment defers to release-it", async () => {
  const { run } = await createRepo()
  await run`git commit --allow-empty -m ${"feat: add a feature"}`

  const { stdout } = await run`release-it --release-version --increment minor --preRelease=beta`

  expect(stdout).toBe("1.1.0-beta.0")
})

it("fails for --preRelease without --increment", async () => {
  const { run } = await createRepo()
  await run`git commit --allow-empty -m ${"feat: add a feature"}`

  const { all, exitCode } = await run({ reject: false })`release-it --release-version --preRelease=beta`

  expect(exitCode).toBe(1)
  expect(all).toContain("git-cliff can't pick a prerelease version.")
})

it("--preRelease with --no-increment keeps the latest version", async () => {
  const { run } = await createRepo({ version: "1.1.0-beta.0" })
  await run`git commit --allow-empty -m ${"feat: add a feature"}`

  const { all } = await run`release-it --ci --no-increment --preRelease=beta`

  expect(all).toContain("currently at 1.1.0-beta.0")
})

it("fails when the latest version is a prerelease", async () => {
  const { run } = await createRepo({ version: "1.1.0-beta.0" })
  await run`git commit --allow-empty -m ${"feat: add a feature"}`

  const { all, exitCode } = await run({ reject: false })`release-it --release-version`

  expect(exitCode).toBe(1)
  expect(all).toContain("The latest version 1.1.0-beta.0 is a prerelease")
})

it("fails when there are no releasable commits", async () => {
  const { run } = await createRepo()
  await run`git commit --allow-empty -m ${"chore: tidy up"}`

  const { all, exitCode } = await run({ reject: false })`release-it --ci`

  expect(exitCode).toBe(1)
  expect(all).toContain("There is nothing to release: git-cliff found no commits that bump the version since 1.0.0.")
})

it("fails when there are no tags and package.json has a version", async () => {
  const { run } = await createRepo()
  await run`git tag -d 1.0.0`
  await run`git commit --allow-empty -m ${"feat: add a feature"}`

  const { all, exitCode } = await run({ reject: false })`release-it --release-version`

  expect(exitCode).toBe(1)
  expect(all).toContain("git-cliff picked 0.1.0, which is lower than the current version 1.0.0.")
})

it("fails when package.json is ahead of the latest tag", async () => {
  const { run } = await createRepo()
  await run`npm version 2.0.0 --no-git-tag-version`
  await run`git commit -am ${"feat: add a feature"}`

  const { all, exitCode } = await run({ reject: false })`release-it --release-version`

  expect(exitCode).toBe(1)
  expect(all).toContain("git-cliff picked 1.1.0, which is lower than the current version 2.0.0.")
})
