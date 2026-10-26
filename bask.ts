import { prepare } from "@adamhl8/configs/bask"

export * from "@adamhl8/configs/bask"

// Build and reinstall before `prepare` because release-it loads this plugin by name through its `file:.` self-install.
// Bun copies the package into node_modules before dist/ exists.
// Pass `--ignore-scripts` so the reinstall doesn't run `prepare` again.
prepare.before(async ({ sh }) => {
  await sh`tsdown`
  await sh`bun install --ignore-scripts --no-summary`
})
