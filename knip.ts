import { knipConfig } from "@adamhl8/configs"

const config = knipConfig({
  // Ignore `git-cliff` because the tests run its bin through `PATH`, which knip can't trace.
  ignoreDependencies: ["git-cliff"],
})

export default config
