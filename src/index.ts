import type { IncrementOptions } from "release-it"
import { Plugin } from "release-it"
import semver from "semver"

const SEMVER_SUFFIX = /\d+\.\d+\.\d+(?:-[\dA-Za-z.\-]+)?(?:\+[\dA-Za-z.\-]+)?$/v

interface GitCliffOptions {
  /** A path or built-in config name which is passed to git-cliff's `--config`. Omit it to let git-cliff find the config. */
  config?: string
  /** A path to write the changelog to, relative to the repo. Omit it to write no file. */
  output?: string
}

class GitCliff extends Plugin {
  declare protected readonly options: Readonly<GitCliffOptions>
  private version = ""

  public override async init() {
    try {
      await this.execGitCliff(["--version"])
    } catch (error) {
      throw new Error("git-cliff isn't installed or isn't on PATH.", { cause: error })
    }

    // git-cliff's bump has no prerelease support.
    // Skip `--no-increment` runs because they keep the latest version, and `increment` is `false` there too.
    const { increment, isPreRelease } = this.config.getContext("version")
    if (this.config.isIncrement && !increment && isPreRelease) {
      throw new Error(
        `git-cliff can't pick a prerelease version. Pass an increment with --preRelease (e.g. "release-it -i minor --preRelease=beta").`,
      )
    }
  }

  // Despite the name, release-it calls this on every run that increments and takes the first version any plugin returns.
  public override async getIncrementedVersionCI({ latestVersion, increment }: IncrementOptions) {
    // Return nothing for an explicit `--increment` so the built-in version plugin handles it.
    if (increment) return

    // git-cliff only bumps the prerelease number from a prerelease, even for breaking changes.
    if (semver.prerelease(latestVersion)) {
      throw new Error(
        `The latest version ${latestVersion} is a prerelease, and git-cliff can only bump its prerelease number. Pass an increment to release a stable version (e.g. "release-it -i minor").`,
      )
    }

    const bumpedTag = await this.execGitCliff(["--bumped-version"])
    // Return only the version because git-cliff returns a tag name and release-it adds the prefix from `git.tagName`.
    const version = SEMVER_SUFFIX.exec(bumpedTag)?.[0]
    if (!version) throw new Error(`git-cliff returned "${bumpedTag}", which doesn't end in a semver version.`)

    // git-cliff returns the current version when there's nothing to bump.
    // Throw because returning nothing makes the version plugin fall back to a patch bump.
    if (version === latestVersion) {
      throw new Error(
        `There is nothing to release: git-cliff found no commits that bump the version since ${latestVersion}.`,
      )
    }
    // git-cliff bumps from the latest tag, and release-it's `latestVersion` comes from package.json when it has one.
    if (semver.lt(version, latestVersion)) {
      throw new Error(
        `git-cliff picked ${version}, which is lower than the current version ${latestVersion}. git-cliff bumps from the latest git tag, so tag the commit that released ${latestVersion}.`,
      )
    }

    return version
  }

  public override async getChangelog() {
    return this.execGitCliff(this.changelogSectionArgs())
  }

  public override bump(version: string) {
    this.version = version
  }

  // Generate here instead of in `bump` because the git plugin sets `tagName` in its `bump`, which runs after ours.
  public override async beforeRelease() {
    // Fall back to the version when no git plugin set a tag name (e.g. `git: false`).
    const tag = this.config.getContext("tagName") ?? this.version

    // GitHub and GitLab use `changelog` as the release notes when `releaseNotes` is unset.
    const changelog = await this.execGitCliff(this.changelogSectionArgs(tag))
    this.config.setContext({ changelog })

    const { output } = this.options
    // Skip the file on a `--no-increment` rerun because the release already wrote it.
    // Passing `--tag` for an existing tag duplicates its section when there are newer commits.
    if (!output || !this.config.isIncrement) return
    await this.execGitCliff(["--tag", tag, "--output", output], { write: true })
    // Stage the file because the git plugin only stages tracked files unless `addUntrackedFiles` is set.
    await this.exec(["git", "add", "--", output])
  }

  private changelogSectionArgs(tag?: string) {
    const tagArgs = tag ? ["--tag", tag] : []
    // Use `--latest` on a `--no-increment` rerun because HEAD is already tagged, so `--unreleased` finds no commits.
    const range = this.config.isIncrement ? ["--unreleased", tagArgs] : ["--latest"]
    // Strip the header and footer because they don't belong in a preview or release notes.
    return [range, "--strip", "all"].flat(2 /* flatten our nested arg arrays */)
  }

  // Default `write` to `false` so the read-only runs still happen in `--dry-run`.
  private async execGitCliff(args: string[], { write = false } = {}) {
    const configArgs = this.options.config ? ["--config", this.options.config] : []
    return this.exec(["git-cliff", ...configArgs, ...args], { options: { write } })
  }
}

// oxlint-disable-next-line import/no-default-export - release-it loads a plugin from the module's default export
export default GitCliff
