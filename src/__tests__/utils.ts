import path from "node:path"

import { copyFixture, minimalEnv, packPackage } from "@adamhl8/configs/test"
import bun from "bun"
import { toMerged } from "es-toolkit"

import fixtureConfig from "#__tests__/fixtures/repo/.release-it.json" with { type: "json" }
import fixturePackageJson from "#__tests__/fixtures/repo/package.json" with { type: "json" }

const ROOT = path.resolve(import.meta.dir, "../..")
const FIXTURE = path.resolve(import.meta.dir, "fixtures/repo")

let tarball = ""
/** Builds and packs the plugin into the tarball that `createRepo` installs. */
export const packPlugin = async () => {
  tarball = await packPackage(ROOT)
}

// Put this repo's bins first so release-it runs the git-cliff devDependency.
export const PATH = [path.join(ROOT, "node_modules/.bin"), process.env["PATH"]].join(path.delimiter)

const env = minimalEnv({
  PATH,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "test",
  GIT_COMMITTER_EMAIL: "test@example.com",
})

interface RepoOptions {
  /** The version in package.json and the initial tag. */
  version?: string
  tagPrefix?: string
  /** Merged into the fixture's release-it options. */
  releaseItOptions?: Record<string, unknown>
}

/**
 * Copies the fixture into a temp git repo, installs the packed plugin, tags `${tagPrefix}${version}`, and returns the
 * dir and a shell bound to it.
 */
export const createRepo = async ({ version = "1.0.0", tagPrefix = "", releaseItOptions = {} }: RepoOptions = {}) => {
  const { dir, run } = await copyFixture(FIXTURE, { prefix: "release-it-git-cliff-", shell: { env } })
  const packageJson = toMerged(fixturePackageJson, { version })
  await bun.write(path.join(dir, "package.json"), JSON.stringify(packageJson, undefined, 2))
  const config = toMerged(fixtureConfig, releaseItOptions)
  await bun.write(path.join(dir, ".release-it.json"), JSON.stringify(config, undefined, 2))

  // Install before the first commit because release-it requires a clean working dir.
  await run`npm install`
  await run`npm install --save-dev ${tarball}`
  await run`git init -b main`
  await run`git add -A`
  await run`git commit -m ${"chore: initial commit"}`
  await run`git tag ${tagPrefix}${version}`

  return { dir, run }
}
