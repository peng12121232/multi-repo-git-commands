import * as vscode from "vscode";
import * as path from "node:path";
import { simpleGit } from "simple-git";
import { RepoInfo } from "./extension";

export type CommandHandler = (repos?: RepoInfo[], output?: vscode.OutputChannel) => Promise<void>;

export interface CommandDefinition {
  id: string;
  label: string;
  description: string;
  handler: CommandHandler;
}

// All 26 commands with their definitions
export const COMMANDS: CommandDefinition[] = [
  {
    id: "multi-repo-git-commands.runGitAll",
    label: "Run Custom Git Command",
    description: "Run any git command across all workspace repositories",
    handler: async () => {}, // Implemented in extension.ts
  },
  {
    id: "multi-repo-git-commands.runCustomGitAll",
    label: "Run Custom Git Command (Alt)",
    description: "Run any git command across all repositories (alternative trigger)",
    handler: async () => {},
  },
  {
    id: "multi-repo-git-commands.statusAll",
    label: "Show Status",
    description: "Show git status for all repositories",
    handler: async () => {},
  },
  {
    id: "multi-repo-git-commands.fetchAll",
    label: "Fetch All",
    description: "Fetch all branches and prune deleted refs",
    handler: async () => {},
  },
  {
    id: "multi-repo-git-commands.pullAll",
    label: "Pull All",
    description: "Pull with rebase for all repositories",
    handler: async () => {},
  },
  {
    id: "multi-repo-git-commands.pushAll",
    label: "Push All",
    description: "Push branches to remote for all repositories",
    handler: async () => {},
  },
  {
    id: "multi-repo-git-commands.commitAll",
    label: "Commit All",
    description: "Create a commit in all repositories",
    handler: async () => {},
  },
  {
    id: "multi-repo-git-commands.stageAll",
    label: "Stage All",
    description: "Stage all changes in all repositories",
    handler: async () => {},
  },
  {
    id: "multi-repo-git-commands.unstageAll",
    label: "Unstage All",
    description: "Unstage all changes in all repositories",
    handler: async () => {},
  },
  {
    id: "multi-repo-git-commands.discardAll",
    label: "Discard All",
    description: "Discard all uncommitted changes (DESTRUCTIVE)",
    handler: async () => {},
  },
  {
    id: "multi-repo-git-commands.stashAll",
    label: "Stash All",
    description: "Stash changes in all repositories",
    handler: async () => {},
  },
  {
    id: "multi-repo-git-commands.popStashAll",
    label: "Pop Stash All",
    description: "Pop stashes from all repositories",
    handler: async () => {},
  },
  {
    id: "multi-repo-git-commands.checkoutAll",
    label: "Switch Branch",
    description: "Switch to a different branch in all repositories",
    handler: async () => {},
  },
  {
    id: "multi-repo-git-commands.mergeAll",
    label: "Merge Branch",
    description: "Merge a selected branch in every repository where it exists",
    handler: async () => {},
  },
  {
    id: "multi-repo-git-commands.createBranchAll",
    label: "Create Branch",
    description: "Create a new branch in all repositories",
    handler: async () => {},
  },
  {
    id: "multi-repo-git-commands.deleteBranchAll",
    label: "Delete Branch",
    description: "Delete a branch from all repositories",
    handler: async () => {},
  },
  {
    id: "multi-repo-git-commands.createTagAll",
    label: "Create Tag",
    description: "Create a tag in all repositories",
    handler: async () => {},
  },
  {
    id: "multi-repo-git-commands.deleteTagAll",
    label: "Delete Tag",
    description: "Delete a tag from all repositories",
    handler: async () => {},
  },
  {
    id: "multi-repo-git-commands.createRemoteAll",
    label: "Add Remote",
    description: "Add a remote in all repositories",
    handler: async () => {},
  },
  {
    id: "multi-repo-git-commands.deleteRemoteAll",
    label: "Remove Remote",
    description: "Remove a remote from all repositories",
    handler: async () => {},
  },
  {
    id: "multi-repo-git-commands.resetWorkspace",
    label: "Reset Workspace",
    description: "Reset all repositories (discard changes, fetch, pull)",
    handler: async () => {},
  },
  {
    id: "multi-repo-git-commands.customRepo",
    label: "Custom Git Command (This Repo)",
    description: "Run custom git command on selected repository",
    handler: async () => {},
  },
  {
    id: "multi-repo-git-commands.openRepo",
    label: "Open Repository",
    description: "Open repository in new VS Code window",
    handler: async () => {},
  },
];

export function registerAllCommands(
  context: vscode.ExtensionContext,
  handlerMap: Record<string, CommandHandler>
): void {
  for (const cmd of COMMANDS) {
    const handler = handlerMap[cmd.id];
    if (handler) {
      context.subscriptions.push(
        vscode.commands.registerCommand(cmd.id, () => handler())
      );
    }
  }
}

export function getCommandById(id: string): CommandDefinition | undefined {
  return COMMANDS.find(cmd => cmd.id === id);
}

export function getAllCommandIds(): string[] {
  return COMMANDS.map(cmd => cmd.id);
}
