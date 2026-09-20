import type { DocsContent, FigureLabels } from "./types"

export const docsEnFigureLabels: FigureLabels = {
  merge: "merge",
  resolve: "resolve",
  done: "continue",
  type: "type",
  scope: "scope",
  subject: "subject",
  template: "template",
  message: "message",
  rebase: "rebase",
  linear: "linear history",
}

export const docsEnContent: DocsContent = {
  intro: "Reflog quick guide with examples. Open a repository to start — or use the terminal:",
  sections: [
    {
      id: "open",
      title: "Open a repository",
      steps: [
        "Click the folder in the top bar or use Browse to pick the repo folder.",
        "Recent repos show up on the welcome screen for quick access.",
        "To clone, fill in the URL and destination folder in the same bar.",
      ],
      code: "reflog /path/to/repo",
    },
    {
      id: "conflicts",
      title: "Resolve conflicts",
      steps: [
        "With an active conflict, the app opens the Merge tab by itself.",
        "Pick the file in the sidebar and Accept Current, Incoming or Both per hunk.",
        "Save the file, mark it as resolved and finish with Continue Merge.",
      ],
      code: "git merge feature/login",
      figure: "merge",
    },
    {
      id: "rebase",
      title: "Git Rebase and Interactive Rebase",
      steps: [
        "What is Rebase: Git Rebase moves your feature branch's base point to the tip of another branch (e.g. main), reapplying each commit one-by-one with new SHA-1 hashes to produce a clean, linear history.",
        "Rebase vs. Merge: Merge combines two branches creating an extra merge commit (diamond merge), while Rebase moves the commits directly on top of the base branch without cluttering logs with empty merge commits.",
        "Interactive Rebase (git rebase -i): organize and clean up your commits before publishing. Use pick (keep commit), squash / fixup (combine with previous commit), reword (edit message), edit (modify code), and drop (delete commit).",
        "Conflict resolution during Rebase: if a conflict occurs, Git pauses execution. Resolve conflicting hunks in the Merge tab editor and continue with 'git rebase --continue' (or abort with 'git rebase --abort').",
        "Rebase in Reflog: inside the Merge tab, open the Interactive Rebase strip to visually configure actions (pick, drop, squash, reword...), trigger Auto-Squash, and apply the rebase with 1 click.",
        "The Golden Rule of Rebase: never rebase public or shared branches used by other team members. Only rebase local feature branches prior to merging or opening a Pull Request.",
      ],
      code: "git rebase main\n# or interactive rebase for the last 3 commits:\ngit rebase -i HEAD~3",
      figure: "rebase",
    },
    {
      id: "staging",
      title: "Staging and commit",
      steps: [
        "In the Staging tab, select the file and review the diff per hunk.",
        "Use Stage hunk to stage only part of the file; Discard hunk drops the chunk.",
        "Build the message in the builder (type, scope, subject) and confirm with Ctrl+Enter.",
        "Enable Sign-off (-s) or GPG signing (-S) by expanding body/footer.",
        "Add co-authors and pick Markdown templates with automatic variables.",
        "In the history tab, rewrite a commit message with amend.",
      ],
      code: "feat(api): add conflict resolver",
      figure: "commit",
    },
    {
      id: "templates",
      title: "Commit Templates and Presets",
      steps: [
        "The Templates page provides three dedicated sections: Templates, Presets, and Commits (Preferences).",
        "Built-in canonical Conventional Commits and Jira Issue templates, alongside custom repository Markdown templates in .reflog/templates/.",
        "Rich template editor featuring live preview and variable chips: {{header}}, {{type}}, {{scope}}, {{subject}}, {{body}}, {{footer}}, {{branch}}, and more.",
        "Presets tab: create, edit with auto-fill, and delete quick type and scope presets.",
        "Commits tab: configure Strict mode (Conventional Commit type requirement), type icons/emojis, and select the active default template.",
      ],
      code: "---\nname: conventional\ntype: feat\n---\n{{header}}\n\n{{#body}}{{body}}\n\n{{/body}}{{#footer}}{{footer}}{{/footer}}",
      figure: "template",
    },
    {
      id: "automations",
      title: "Automations and Quick Actions",
      steps: [
        "Create recipes with conditional if/then/else steps: branch exists, tag exists, clean tree, submodule ready or command ok.",
        "Toggle 'Quick actions' on any recipe to instantly generate a shortcut button in the Quick Actions drawer.",
        "The Quick Actions drawer (lightning icon in top bar) enables searching, keyboard navigation (↑, ↓, Enter), and 1-click execution.",
        "Each recipe targets a repository; configure dynamic {{variables}} and one-step shortcuts.",
        "Review dangerous steps in the confirmation modal and monitor live step execution logs.",
        "Export and import recipes as TOML/JSON to share configurations with your team.",
      ],
      code: "if branch-exists release → checkout release else checkout -b release",
    },
    {
      id: "monitors",
      title: "Repository Monitors",
      steps: [
        "In the Monitors tab, set up continuous monitoring blocks to track your project status.",
        "Inspect unstaged/staged changes (status --short), current branch (branch --show-current), and recent commits (log -5).",
        "Create custom visual blocks that run Git health checks automatically.",
      ],
      code: "git status --short && git branch --show-current",
    },
    {
      id: "tags",
      title: "Tags and versions",
      steps: [
        "In the Staging Tags tab, the app suggests patch, minor and major from the latest tag.",
        "Clicking a suggestion fills the annotated tag name and message.",
        "With no tags yet, it suggests starting with v0.1.0.",
      ],
      code: "v1.2.3 → v1.2.4 · v1.3.0 · v2.0.0",
    },
    {
      id: "branches",
      title: "Branches and remotes",
      steps: [
        "Create, rename and delete branches in the Branches tab; Fetch prunes.",
        "In the merge banner, check Squash to join without committing, or No-ff.",
        "Manage remotes and watch ahead/behind in the status bar.",
      ],
      code: "git fetch --all --prune",
    },
    {
      id: "blame",
      title: "Blame",
      steps: [
        "In the Blame tab, filter any tracked file in the repo.",
        "Each line shows commit, author and date — hover for the summary.",
        "Code gets automatic syntax highlighting from the file extension.",
      ],
    },
    {
      id: "visualize",
      title: "Visualize Playground and Animations",
      steps: [
        "The Visualize tab renders the reactive commit graph with color-coded lanes, merge branches, and a floating HEAD pointer.",
        "Smooth navigation: drag to pan, scroll wheel to zoom, and search commits by message, author, or hash.",
        "Dynamic animations on each action: radiant ripple rings on newly added commits, animated dashed edges, HEAD bounce pop-in, and floating action feedback toasts.",
        "Git console with interactive terminal mode (autocomplete, command history) and visual command blocks categorized by task.",
        "Safety first: dangerous operations (merge, push, reset, rebase…) require explicit confirmation before execution.",
      ],
      code: "checkout -b feature/login",
    },
    {
      id: "profiles",
      title: "Git profiles",
      steps: [
        "Under Settings → Identity, register profiles with name, email and emoji.",
        "Switch accounts from the top bar selector or with Alt+P.",
        "The active profile shows in the status bar and is applied to user.name/user.email.",
      ],
    },
    {
      id: "themes",
      title: "Themes",
      steps: [
        "Under Settings → Interface, pick Dark, Light, Glass dark or Glass light.",
        "Glass themes use blur and translucency over the wallpaper.",
      ],
    },
    {
      id: "notifications",
      title: "Notifications and Toasts",
      steps: [
        "Unified Toast notification system with instant feedback for success, loading, info, and errors.",
        "Critical system errors (Fatal Errors) overlay with top priority and quick retry options.",
      ],
    },
    {
      id: "shortcuts",
      title: "Shortcuts and indicators",
      steps: [
        "Ctrl+Enter commits, Ctrl+K focuses search, Alt+P switches profile.",
        "Tabs with pending work show a count badge; conflicts stay red.",
        "The top bar shows a conflict or uncommitted-files pill.",
        "The status bar shows merge state, warnings, changed files and the active profile.",
      ],
    },
    {
      id: "submodules",
      title: "Submodules",
      steps: [
        "The Automations tab lists submodules with state: ok, diverged, conflict or uninitialized.",
        "Open a submodule to act inside it with every app screen.",
        "Run update or foreach straight on the submodule from the Visualize console.",
      ],
      code: "submodule foreach 'git pull origin master'",
    },
  ],
}
