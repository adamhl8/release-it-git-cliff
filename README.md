# release-it-git-cliff

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/release-it-git-cliff.svg)](https://www.npmjs.com/package/release-it-git-cliff)

A [release-it](https://github.com/release-it/release-it) plugin that uses [git-cliff](https://git-cliff.org) to pick the next version and generate your changelog.

---

<!-- toc -->

- [Installation](#installation)
- [Usage](#usage)
  - [Options](#options)
  - [Formatting the changelog file](#formatting-the-changelog-file)
  - [Release notes](#release-notes)
  - [Tag names](#tag-names)
- [Limitations](#limitations)

<!-- tocstop -->

## Installation

```sh
bun add -D release-it-git-cliff
# or: npm install -D release-it-git-cliff
```

## Usage

Add the plugin to your release-it config:

```jsonc
// .release-it.json
{
  "plugins": {
    "release-it-git-cliff": {
      "output": "CHANGELOG.md",
    },
  },
}
```

Then run release-it as usual:

```sh
release-it
```

On each release, the plugin:

1. Asks git-cliff for the next version based on your commits.
   - If you pass an increment (e.g. `release-it -i major`), that's used instead.
2. Generates the changelog section for the release and sets it as `${changelog}`, which release-it uses for the GitHub/GitLab release notes.
3. Writes the full changelog to `output` (if set) and stages it, so it's included in the release commit.

You can preview the next version and its changelog section without releasing anything:

```sh
release-it --release-version # prints the next version
release-it --changelog # prints the unreleased changelog section
```

### Options

```jsonc
{
  "plugins": {
    "release-it-git-cliff": {
      "config": "cliff.toml", // (default: git-cliff's own lookup) A path to a git-cliff config file or the name of a built-in config (e.g. "keepachangelog"). Passed to git-cliff's `--config`.
      "output": "CHANGELOG.md", // (default: none) The path to write the changelog to. If omitted, no file is written.
    },
  },
}
```

- Both options are optional. (`"release-it-git-cliff": {}` is also valid.)
- If `config` is omitted, git-cliff [finds its config the usual way](https://git-cliff.org/docs/configuration).

### Formatting the changelog file

If you want to run a formatter (or anything else) on the changelog file, use the `after:release-it-git-cliff:beforeRelease` hook:

```json
{
  "hooks": {
    "after:release-it-git-cliff:beforeRelease": "prettier --write CHANGELOG.md"
  }
}
```

The plugin writes the file during release-it's `beforeRelease` step, so an `after:bump` hook runs too early. Any changes the hook makes are included in the release commit.

### Release notes

When `github.releaseNotes` (or `gitlab.releaseNotes`) isn't set, release-it uses `${changelog}` as the release notes. The plugin sets `${changelog}` to the release's section of the changelog, so this works out of the box.

> [!IMPORTANT]
> If you previously set `github.releaseNotes` to a git-cliff command, remove it. It takes priority over the plugin's changelog.

`${changelog}` is also available anywhere else release-it expands templates, like hooks or `git.commitMessage`.

### Tag names

The plugin gives git-cliff the tag name release-it is going to create, so the changelog heading always matches the tag (e.g. `## v1.2.0`).

The tag name comes from release-it's `git.tagName`:

- If `git.tagName` isn't set, release-it detects a `v` prefix from your latest tag.
- If you don't have any tags yet, or you use a different prefix, set `git.tagName` explicitly:

  ```json
  {
    "git": {
      "tagName": "v${version}"
    }
  }
  ```

> [!TIP]
> git-cliff bumps from the latest tag it finds. If you set release-it's `git.tagMatch`, set a matching [`tag_pattern`](https://git-cliff.org/docs/configuration/git#tag_pattern) in your git-cliff config so they both start from the same tag.

## Limitations

- **Prereleases:** git-cliff's version bumping has no prerelease support, so prereleases need an explicit increment.
  - `--preRelease` needs `-i`: `release-it -i minor --preRelease=beta`
  - If your latest version is a prerelease, pass `-i` for the next release too: `release-it -i minor`
- **Untagged versions:** git-cliff bumps from your latest git tag, while release-it reads the current version from `package.json`. If your `package.json` version doesn't have a matching tag (or there are no tags at all), the plugin throws an error. Tag the commit that released that version (e.g. `git tag v1.0.0 <commit>`).
- **Nothing to release:** If none of your commits since the latest tag bump the version, the plugin throws an error. Pass `-i` if you want to release anyway.
