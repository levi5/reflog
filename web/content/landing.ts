export interface NavEntry {
  label: string
  href: string
}

export interface FeatureEntry {
  title: string
  description: string
  icon: string
}

export interface ShowcaseEntry {
  src: string
  alt: string
  caption: string
  span: "full" | "half"
}

export interface InstallEntry {
  label: string
  command: string
  href: string
}

export const site = {
  name: "Reflog",
  tagline: "A Git client built around the parts that are hard.",
  description:
    "A desktop Git client for Linux, macOS and Windows. Visual merge conflicts, interactive rebase, DAG history and workflow automations.",
  repository: "https://github.com/levi5/reflog",
  release: "https://github.com/levi5/reflog/releases",
}

export const nav: NavEntry[] = [
  { label: "Features", href: "#features" },
  { label: "Screenshots", href: "#screenshots" },
  { label: "Install", href: "#install" },
]

export const hero = {
  badge: "Version 0.1.0-beta.4",
  title: "Stop reading diffs in the terminal.",
  lede: "Reflog is a native desktop Git client that treats merge conflicts, history and rebase as first-class workflows instead of command-line trivia.",
  primaryCta: { label: "Download", href: "#install" },
  secondaryCta: { label: "View source", href: "https://github.com/levi5/reflog" },
  screenshot: "screenshots/13-merge-conflicts.png",
}

export const features: FeatureEntry[] = [
  {
    title: "Visual conflict resolution",
    description:
      "Every conflicted file is mapped hunk by hunk. Accept ours, theirs, both or neither per hunk, with the result written back to disk and staged.",
    icon: "merge",
  },
  {
    title: "Hunk-level staging",
    description:
      "Stage, unstage and discard individual hunks or arbitrary selections. Discarding a tracked change keeps the patch so you can undo it.",
    icon: "staging",
  },
  {
    title: "Interactive rebase",
    description:
      "Reorder commits, then pick, squash or drop each one. The plan you build survives background refreshes instead of silently resetting.",
    icon: "rebase",
  },
  {
    title: "DAG history",
    description:
      "Log, graph and reflog in one view, with server-side filters for author, path, pickaxe and date range.",
    icon: "graph",
  },
  {
    title: "Compare any two refs",
    description: "Merge base, per-file stats, ahead and behind counts, and the full diff between any pair of refs.",
    icon: "compare",
  },
  {
    title: "Tree and blame",
    description: "Browse the tree of any commit and read line-level blame with the commit that last touched each line.",
    icon: "blame",
  },
  {
    title: "Automations",
    description:
      "Commit templates with Conventional Commits and issue trailers, plus recipes, monitors and quick actions you define once.",
    icon: "automation",
  },
  {
    title: "Undo that actually works",
    description:
      "A bounded stack of reversible actions across staging, discarding and remote operations, bound to Ctrl+Z and Ctrl+Shift+Z.",
    icon: "undo",
  },
  {
    title: "Sync without surprises",
    description:
      "Push, force-push with lease, push tags, delete remote branches, fetch per remote with optional prune, and manage upstreams.",
    icon: "sync",
  },
]

export const showcase: ShowcaseEntry[] = [
  {
    src: "screenshots/13-merge-conflicts.png",
    alt: "Merge conflict view listing conflicted files with a resolution helper",
    caption: "Merge & Conflicts — every conflicted file with its pending hunk count",
    span: "full",
  },
  {
    src: "screenshots/14-merge-hunks.png",
    alt: "Merge editor showing a conflict hunk with accept current, accept incoming and accept both actions",
    caption: "Resolve hunk by hunk without leaving the diff",
    span: "half",
  },
  {
    src: "screenshots/15-merge-resolved.png",
    alt: "Resolved merge state with conflicts cleared",
    caption: "Resolution written to disk and staged",
    span: "half",
  },
  {
    src: "screenshots/04-graph.png",
    alt: "Commit graph view showing branching history",
    caption: "Log & Graph — branch topology at a glance",
    span: "half",
  },
  {
    src: "screenshots/03-staging-diff.png",
    alt: "Staging view with an inline diff",
    caption: "Staging & Diff — hunk-level control",
    span: "half",
  },
  {
    src: "screenshots/07-compare.png",
    alt: "Compare view between two refs",
    caption: "Compare — merge base, stats and full diff",
    span: "half",
  },
  {
    src: "screenshots/08-blame.png",
    alt: "Blame view annotating lines with commits",
    caption: "Tree & Blame — line-level attribution",
    span: "half",
  },
  {
    src: "screenshots/05-command-palette.png",
    alt: "Command palette overlay listing actions",
    caption: "Command palette — jump anywhere without the mouse",
    span: "half",
  },
]

export const install = {
  title: "Install",
  eyebrow: "Get started",
  lede: "Reflog is a Tauri desktop app. Grab a bundle for your platform, or build it from source in a couple of minutes.",
  primary: {
    label: "All releases",
    command: "gh release download --repo levi5/reflog",
    href: "https://github.com/levi5/reflog/releases",
  },
  entries: [
    {
      label: "Linux",
      command: "AppImage or .deb",
      href: "https://github.com/levi5/reflog/releases",
    },
    {
      label: "macOS",
      command: "Universal .app bundle",
      href: "https://github.com/levi5/reflog/releases",
    },
    {
      label: "Windows",
      command: "NSIS setup executable",
      href: "https://github.com/levi5/reflog/releases",
    },
  ],
  sourceTitle: "Build from source",
  sourceCommand: "pnpm install && pnpm tauri build",
}

export const footer = {
  blurb: "A modern desktop Git client built with Tauri 2, React 19 and Rust.",
  links: [
    { label: "Source", href: "https://github.com/levi5/reflog" },
    { label: "Releases", href: "https://github.com/levi5/reflog/releases" },
    { label: "Issues", href: "https://github.com/levi5/reflog/issues" },
  ],
  license: "MIT licensed.",
}
