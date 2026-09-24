import "node_modules/@adamhl8/configs/dist/configs/justfile.base.just"

tsdown:
    bun tsdown

# The release config from `@adamhl8/configs` loads this plugin by name, so the package installs itself with `file:.`.
# Bun copies the package into node_modules at install time, before dist/ exists.
# Re-install after tsdown so release-it loads the built plugin. `--ignore-scripts` avoids re-running prepare.
relink:
    bun install --ignore-scripts --no-summary

prepare: tsdown relink _prepare
