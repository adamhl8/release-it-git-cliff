import { expect, it, setDefaultTimeout } from "bun:test"
import path from "node:path"

import { createRepo, makeTempDir } from "#__tests__/utils.ts"

setDefaultTimeout(30_000)

const writeOutput = { plugins: { "release-it-git-cliff": { output: "CHANGELOG.md" } } }

it("--changelog prints the unreleased changelog", async () => {
  const { run } = await createRepo()
  await run`git commit --allow-empty -m ${"feat: add a feature"}`

  const { stdout } = await run`release-it --changelog`

  expect(stdout).toContain("## Unreleased")
  expect(stdout).toContain("- add a feature")
})

it("sets the release notes to the release's section", async () => {
  const { run } = await createRepo({
    tagPrefix: "v",
    // Put `${changelog}` in `commitMessage` so the test can read it.
    // GitHub and GitLab use the same `changelog` value as their release notes.
    // oxlint-disable-next-line no-template-curly-in-string - release-it expands `${changelog}` in `commitMessage`
    releaseItOptions: { git: { commitMessage: "${changelog}" } },
  })
  await run`git commit --allow-empty -m ${"feat: add a feature"}`

  await run`release-it --ci`

  const { stdout: message } = await run`git log -1 --format=%B`
  expect(message).toContain("## v1.1.0")
  expect(message).toContain("- add a feature")
  expect(message).not.toContain("Unreleased")
})

it("--changelog with --no-increment prints the latest release", async () => {
  const { run } = await createRepo({ tagPrefix: "v" })
  await run`git commit --allow-empty -m ${"feat: add a feature"}`
  await run`release-it --ci`

  const { stdout } = await run`release-it --changelog --no-increment`

  expect(stdout).toContain("## v1.1.0")
  expect(stdout).toContain("- add a feature")
})

it("--no-increment sets the release notes to the latest release", async () => {
  // Write the notes outside the repo because an untracked file would fail release-it's clean working dir check.
  const notesPath = path.join(await makeTempDir(), "notes.md")
  const { run } = await createRepo({
    tagPrefix: "v",
    releaseItOptions: { hooks: { "after:release": `echo "\${changelog}" > ${notesPath}` } },
  })
  await run`git commit --allow-empty -m ${"feat: add a feature"}`
  await run`release-it --ci`

  await run`release-it --ci --no-increment`

  const notes = await Bun.file(notesPath).text()
  expect(notes).toContain("## v1.1.0")
  expect(notes).toContain("- add a feature")
})

it("writes the output file with the release's tag", async () => {
  const { run } = await createRepo({ tagPrefix: "v", releaseItOptions: writeOutput })
  await run`git commit --allow-empty -m ${"feat: add a feature"}`

  await run`release-it --ci`

  const { stdout: changelog } = await run`git show HEAD:CHANGELOG.md`
  expect(changelog).toContain("## v1.1.0")
  expect(changelog).toContain("- add a feature")
})

it("--no-increment doesn't rewrite the output file", async () => {
  const { dir, run } = await createRepo({ tagPrefix: "v", releaseItOptions: writeOutput })
  await run`git commit --allow-empty -m ${"feat: add a feature"}`
  await run`release-it --ci`
  await run`git commit --allow-empty -m ${"fix: fix a bug"}`

  await run`release-it --ci --no-increment`

  const changelog = await Bun.file(path.join(dir, "CHANGELOG.md")).text()
  expect(changelog.match(/## v1\.1\.0/gv)).toHaveLength(1)
})

it("commits changes from an after:release-it-git-cliff:beforeRelease hook", async () => {
  const { run } = await createRepo({
    releaseItOptions: {
      ...writeOutput,
      hooks: { "after:release-it-git-cliff:beforeRelease": "echo formatted >> CHANGELOG.md" },
    },
  })
  await run`git commit --allow-empty -m ${"feat: add a feature"}`

  await run`release-it --ci`

  const { stdout: changelog } = await run`git show HEAD:CHANGELOG.md`
  expect(changelog).toContain("- add a feature")
  expect(changelog).toContain("formatted")
})

it("--dry-run doesn't write the output file", async () => {
  const { dir, run } = await createRepo({ releaseItOptions: writeOutput })
  await run`git commit --allow-empty -m ${"feat: add a feature"}`

  const { all } = await run`release-it --ci --dry-run`

  expect(all).toContain("1.0.0...1.1.0")
  expect(await Bun.file(path.join(dir, "CHANGELOG.md")).exists()).toBe(false)
})
