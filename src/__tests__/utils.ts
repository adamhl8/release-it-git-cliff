import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { toMerged } from "es-toolkit"
import { execa } from "execa"

import fixtureConfig from "#__tests__/fixtures/repo/.release-it.json" with { type: "json" }
import fixturePackageJson from "#__tests__/fixtures/repo/package.json" with { type: "json" }

const ROOT = path.resolve(import.meta.dir, "../..")
const FIXTURE = path.resolve(import.meta.dir, "fixtures/repo")

const tempDirs: string[] = []
export const makeTempDir = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "release-it-git-cliff-"))
  tempDirs.push(dir)
  return dir
}

export const removeTempDirs = async () => {
  await Promise.all(tempDirs.map(async (dir) => fs.rm(dir, { recursive: true, force: true })))
}

let tarball = ""
/** Builds and packs the plugin into the tarball that `createRepo` installs. */
export const packPlugin = async () => {
  const root = execa({ cwd: ROOT, preferLocal: true })
  await root`bun tsdown`
  const { stdout } = await root`bun pm pack --ignore-scripts --quiet --destination ${await makeTempDir()}`
  tarball = stdout
}

// Drop the `node` shim that `bun run` puts on PATH (e.g. when release-it runs these tests from a hook).
// Keep release-it on real node because bun's `parseArgs` rejects `--no-increment`.
const pathDirs = (process.env["PATH"] ?? "")
  .split(path.delimiter)
  .filter((dir) => !path.basename(dir).startsWith("bun-node-"))

export const env = {
  // Put this repo's bins first so release-it runs the git-cliff devDependency.
  PATH: [path.join(ROOT, "node_modules/.bin"), ...pathDirs].join(path.delimiter),
  // Pass `HOME` so bun and npm use their normal caches.
  HOME: process.env["HOME"],
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "test",
  GIT_COMMITTER_EMAIL: "test@example.com",
}

interface RepoOptions {
  /** The version in package.json and the initial tag. */
  version?: string
  tagPrefix?: string
  /** Merged into the fixture's release-it options. */
  releaseItOptions?: Record<string, unknown>
}

/**
 * Copies the fixture into a temp git repo, installs the packed plugin, tags `${tagPrefix}${version}`, and returns the
 * dir and an execa bound to it.
 */
export const createRepo = async ({ version = "1.0.0", tagPrefix = "", releaseItOptions = {} }: RepoOptions = {}) => {
  const dir = await makeTempDir()
  await fs.cp(FIXTURE, dir, { recursive: true })
  const packageJson = toMerged(fixturePackageJson, { version })
  await fs.writeFile(path.join(dir, "package.json"), JSON.stringify(packageJson, undefined, 2))
  const config = toMerged(fixtureConfig, releaseItOptions)
  await fs.writeFile(path.join(dir, ".release-it.json"), JSON.stringify(config, undefined, 2))

  const run = execa({ cwd: dir, all: true, extendEnv: false, env, preferLocal: true })
  // Install before the first commit because release-it requires a clean working dir.
  await run`npm install`
  await run`npm install --save-dev ${tarball}`
  await run`git init -b main`
  await run`git add -A`
  await run`git commit -m ${"chore: initial commit"}`
  await run`git tag ${tagPrefix}${version}`

  return { dir, run }
}
