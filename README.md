# Multi Repo Git Commands

Run Git commands across all repositories in your VS Code workspace. Perfect for managing multiple projects simultaneously - check status, fetch, pull, checkout branches, search commits, and more from a dedicated dashboard!

## Features

✨ **Dedicated Dashboard**: A clean, webview-based Side Bar view for all your multi-repo needs.  
🚀 **Global Actions Toolbar**: One-click access to common operations across ALL repositories:
  - Fetch, Pull, Push
  - Commit, Switch Branch
  - Stage All, Unstage All, Discard All
  - Stash, Pop Stash
🔍 **Advanced Branch Search**: 
  - Search for branches across all repositories.
  - View "Current" branch vs "Found" branches.
  - Checkout branches directly from search results.
  - Handles local and remote branches intelligently.
📜 **Commit Search & Filtering**:
  - Search for commits by message or hash.
  - **Filters**: Filter by Author, Date Range, and Branch.
  - **Rich Results**: View commit message, hash, author, date, and refs (tags/branches).
⚡ **Real-time Updates**: The UI automatically updates when you change branches or modify repositories externally or via terminal.
📦 **Nested Repository Discovery**: Automatically finds Git repos in subdirectories.

## Quick Start

1. Click the **Multi Repo Git** icon in the Activity Bar (the branch icon).
2. Use the **Global Actions** toolbar to perform bulk operations.
3. Use the **Search Branch** section to find and switch branches across repos.
4. Use the **Search Commit** section to find specific commits, using the filter icon for advanced options.

## Commands

Available from the Command Palette (`Cmd+Shift+P`) or the Dashboard:

- **Fetch All**: Fetch from all remotes
- **Pull All**: Pull with rebase on all repos
- **Push All**: Push to remote
- **Commit All**: Commit changes
- **Switch Branch**: Interactive picker to switch all repos to a specific branch
- **Merge Branch**: Filter and select a branch, then merge it in every repository where it exists
- **Stage/Unstage/Discard All**: Manage changes
- **Stash/Pop Stash All**: Manage stashes
- **Run Custom Command**: Enter any Git arguments to run on all repos

## Settings

Configure under **Settings → Extensions → Multi Repo Git Commands**:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `multiRepoGit.scanNested` | boolean | `true` | Scan workspace folders recursively for nested repositories |
| `multiRepoGit.maxDepth` | number | `2` | Maximum directory depth to scan (0 = root only, 1 = one level deep, etc.) |
| `multiRepoGit.excludeFolders` | array | `["node_modules", ".git", "dist", "build", "out", ".next", ".cache"]` | Folder names to skip during scanning |

## Requirements

- Git must be installed and available in your PATH
- Works with both single and multi-root workspaces

## Release Notes

### 1.0.0
- **New Dashboard UI**: Dedicated Side Bar view with a modern Webview interface.
- **Global Toolbar**: Quick access buttons for all major Git operations.
- **Advanced Search**: 
    - Branch search with checkout capabilities.
    - Commit search with filters (Author, Date, Branch).
- **Real-time Reactivity**: UI updates instantly when repository state changes.
- **Improved UX**: Better visual feedback, icons, and expandable result lists.

### 0.1.0
- Integrated into Source Control view.
- Added basic bulk commands.

### 0.0.1
- Initial release.
