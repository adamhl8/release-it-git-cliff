import "release-it"

declare module "release-it" {
  interface IncrementOptions {
    latestVersion: string
    increment: string | false | undefined
    isPreRelease: boolean
    preReleaseId: string | undefined
    preReleaseBase: string | undefined
  }

  interface Config {
    readonly isIncrement: boolean
    getContext: ((path: "version") => Pick<IncrementOptions, "increment" | "isPreRelease">) &
      ((path: "tagName") => string | undefined)
    setContext: (context: Record<string, unknown>) => void
  }

  class Plugin {
    protected readonly options: Readonly<Record<string, unknown>>
    protected readonly config: Config
    protected exec(command: string | string[], opts?: { options?: { write?: boolean } }): Promise<string>
    public init(): Promise<void> | void
    public getChangelog(latestVersion: string): Promise<string | undefined> | string | undefined
    public getIncrementedVersionCI(options: IncrementOptions): Promise<string | undefined> | string | undefined
    public bump(version: string): Promise<void> | void
    public beforeRelease(): Promise<void> | void
  }
}
