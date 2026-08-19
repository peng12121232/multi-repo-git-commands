import * as vscode from "vscode";
import * as path from "node:path";
import { simpleGit, SimpleGit } from "simple-git";
import { getAllGitRepos } from "./repoDiscovery";
import { MultiRepoViewProvider } from "./multiRepoViewProvider";
import {
  validateBranchName,
  validateCommitMessage,
  validateTagName,
  validateRemoteName,
  validateRemoteURL,
  validateStashMessage,
  validateCustomGitArgs,
} from "./validators";

export type RepoInfo = { name: string; path: string };

type GitPick = {
  label: string;
  description?: string;
  args: string[]; // git arguments without the leading 'git'
};

const PRESETS: GitPick[] = [
  {
    label: "Status (short)",
    description: "git status -sb",
    args: ["status", "-sb"],
  },
  {
    label: "Fetch --all --prune",
    description: "git fetch --all --prune",
    args: ["fetch", "--all", "--prune"],
  },
  {
    label: "Pull (rebase)",
    description: "git pull --rebase",
    args: ["pull", "--rebase"],
  },
  { label: "Push", description: "git push", args: ["push"] },
  {
    label: "Show branch",
    description: "git branch --show-current",
    args: ["branch", "--show-current"],
  },
  {
    label: "Discard all changes",
    description: "git reset --hard HEAD",
    args: ["reset", "--hard", "HEAD"],
  },
];

function createOutput(): vscode.OutputChannel {
  return vscode.window.createOutputChannel("Multi Repo Git");
}

async function pickOrPromptGitArgs(): Promise<string[] | undefined> {
  const choice = (await vscode.window.showQuickPick(
    [
      ...PRESETS.map(
        (p) =>
          ({ label: p.label, description: p.description, args: p.args }) as any,
      ),
      {
        label: "Custom…",
        description: "Enter any git arguments",
        args: null as any,
      },
    ],
    { placeHolder: "Select a Git command to run across all workspace folders" },
  )) as (GitPick | { label: string; args: null }) | undefined;

  if (!choice) {
    return undefined;
  }
  if ((choice as any).args === null) {
    const custom = await vscode.window.showInputBox({
      title: 'Enter git arguments (without the leading "git")',
      prompt: "Example: status -sb | pull --rebase | fetch --all --prune",
      value: "status -sb",
    });
    if (!custom) {
      return undefined;
    }
    const args = custom.trim().split(/\s+/).filter(Boolean);
    const validation = validateCustomGitArgs(args);
    if (!validation.valid) {
      vscode.window.showErrorMessage(`❌ ${validation.error}`);
      return undefined;
    }
    return args;
  }
  return (choice as GitPick).args;
}

export function activate(context: vscode.ExtensionContext) {
  const output = createOutput();
  const provider = new MultiRepoViewProvider(context.extensionUri, output);

  // --- Git Extension Integration for Real-time Updates ---
  // Activate git extension asynchronously (non-blocking)
  const gitExtensionDisposables: vscode.Disposable[] = [];

  const hookGitExtension = async () => {
    try {
      const gitExtension = vscode.extensions.getExtension("vscode.git");
      if (!gitExtension) {return;}

      if (!gitExtension.isActive) {
        await gitExtension.activate();
      }

      const gitApi = gitExtension.exports.getAPI(1);

      const subscribeToRepo = (repo: any) => {
        const listener = repo.state.onDidChange(() => {
          provider.updateRepoState(repo.rootUri.fsPath);
        });
        gitExtensionDisposables.push(listener);
      };

      gitApi.repositories.forEach(subscribeToRepo);

      const repoListener = gitApi.onDidOpenRepository(subscribeToRepo);
      gitExtensionDisposables.push(repoListener);
    } catch (e) {
      console.error("Failed to hook into VS Code Git extension:", e);
    }
  };

  hookGitExtension();

  context.subscriptions.push(
    new vscode.Disposable(() => {
      gitExtensionDisposables.forEach(d => d.dispose());
      gitExtensionDisposables.length = 0;
    })
  );

  async function getAllRepos(): Promise<RepoInfo[]> {
    const repoPaths = await getAllGitRepos();
    return repoPaths
      .map((p) => ({ name: path.basename(p), path: p }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Tree View removed

  async function runGitOperation(
    operationName: string,
    repos: RepoInfo[] | undefined,
    action: (git: SimpleGit, repoName: string, repo: RepoInfo) => Promise<any>,
  ) {
    let repoList = repos;
    repoList ??= await getAllRepos();
    if (repoList.length === 0) {
      vscode.window.showWarningMessage("⚠️ No Git repositories found.");
      return;
    }

    output.clear();

    let successCount = 0;
    let failureCount = 0;
    const failedRepos: string[] = [];

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `${operationName} on ${repoList.length} repo(s)`,
        cancellable: true,
      },
      async (_progress, token) => {
        for (const repo of repoList) {
          if (token.isCancellationRequested) {
            break;
          }
          const repoName = path.basename(repo.path);
          output.appendLine(`\n=== ${repoName} » ${operationName} ===`);

          try {
            const git = simpleGit(repo.path);
            await action(git, repoName, repo);
            successCount++;
            output.appendLine(`✅ ${operationName} completed successfully`);
          } catch (e: any) {
            failureCount++;
            failedRepos.push(repoName);
            const errorMsg = e.message || String(e);
            output.appendLine(`❌ Error: ${errorMsg}`);
          }
        }
      },
    );

    if (failureCount === 0) {
      vscode.window.showInformationMessage(
        `✅ ${operationName} completed successfully on ${successCount} repo(s)`
      );
    } else if (successCount === 0) {
      const failedList = failedRepos.join(", ");
      vscode.window.showErrorMessage(
        `❌ ${operationName} failed on all ${failureCount} repo(s): ${failedList}. Check Output for details.`
      );
    } else {
      const failedList = failedRepos.join(", ");
      vscode.window.showWarningMessage(
        `⚠️ ${operationName}: ${successCount} ✅ ${failureCount} ❌ (${failedList}). Check Output for details.`
      );
    }
  }

  // --- Command Implementations ---

  const runCustom = async (repos?: RepoInfo[]) => {
    const args = await pickOrPromptGitArgs();
    if (!args) {return;}
    await runGitOperation(
      `git ${args.join(" ")}`,
      repos,
      async (git, repoName) => {
        const res = await git.raw(args);
        if (res) {
          if (!res.endsWith('\n')) {
            output.appendLine(res);
          } else {
            output.append(res);
          }
        }
        output.appendLine(`=== ${repoName} » Done ===`);
      },
    );
  };

  const runStatus = async (repos?: RepoInfo[]) => {
    await runGitOperation("Status", repos, async (git) => {
      const res = await git.status();
      output.appendLine(`On branch ${res.current}`);
      if (res.isClean()) {
        output.appendLine("nothing to commit, working tree clean");
      } else {
        res.files.forEach((f) =>
          output.appendLine(`${f.working_dir} ${f.path}`),
        );
      }
    });
  };

  const runFetch = async (repos?: RepoInfo[]) => {
    await runGitOperation("Fetch", repos, async (git) => {
      await git.fetch(["--all", "--prune"]);
      output.appendLine("Fetch completed.");
    });
  };

  const runPull = async (repos?: RepoInfo[]) => {
    await runGitOperation("Pull (rebase)", repos, async (git) => {
      await git.pull(undefined, undefined, { "--rebase": null });
      output.appendLine("Pull completed.");
    });
  };

  const runPush = async (repos?: RepoInfo[]) => {
    await runGitOperation("Push", repos, async (git) => {
      await git.push();
      output.appendLine("Push completed.");
    });
  };

  const runCommit = async (repos?: RepoInfo[]) => {
    const message = await vscode.window.showInputBox({
      prompt: "Enter commit message",
    });
    if (!message) {return;}

    const validation = validateCommitMessage(message);
    if (!validation.valid) {
      vscode.window.showErrorMessage(`❌ ${validation.error}`);
      return;
    }

    await runGitOperation("Commit", repos, async (git) => {
      await git.commit(message);
      output.appendLine(`Committed: "${message}"`);
    });
  };

  const runStageAll = async (repos?: RepoInfo[]) => {
    await runGitOperation("Stage All", repos, async (git) => {
      await git.add(".");
      output.appendLine("Staged all changes.");
    });
  };

  const runUnstageAll = async (repos?: RepoInfo[]) => {
    await runGitOperation("Unstage All", repos, async (git) => {
      await git.reset(["HEAD"]);
      output.appendLine("Unstaged all changes.");
    });
  };

  const runDiscard = async (repos?: RepoInfo[]) => {
    const confirm = await vscode.window.showWarningMessage(
      "🚨 Discard ALL uncommitted changes? This cannot be undone!",
      { modal: true },
      "Discard",
    );
    if (confirm !== "Discard") {
      vscode.window.showInformationMessage("ℹ️ Discard operation cancelled.");
      return;
    }

    await runGitOperation("Discard Changes", repos, async (git) => {
      await git.reset(["--hard", "HEAD"]);
      await git.clean("f", ["-d"]);
      output.appendLine("Discarded all changes.");
    });
  };

  const runStash = async (repos?: RepoInfo[]) => {
    const message = await vscode.window.showInputBox({
      prompt: "Stash message (optional)",
    });

    if (message) {
      const validation = validateStashMessage(message);
      if (!validation.valid) {
        vscode.window.showErrorMessage(`❌ ${validation.error}`);
        return;
      }
    }

    await runGitOperation("Stash", repos, async (git) => {
      if (message) {
        await git.stash(["push", "-m", message]);
      } else {
        await git.stash(["push"]);
      }
      output.appendLine("Stashed changes.");
    });
  };

  const runPopStash = async (repos?: RepoInfo[]) => {
    await runGitOperation("Pop Stash", repos, async (git) => {
      await git.stash(["pop"]);
      output.appendLine("Popped stash.");
    });
  };

  const runCheckout = async (repos?: RepoInfo[]) => {
    let targetRepos = repos;
    if (!targetRepos) {
      targetRepos = await getAllRepos();
    }

    if (targetRepos.length === 0) {
      vscode.window.showWarningMessage("No Git repositories found.");
      return;
    }

    const allBranches = new Set<string>();
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Fetching branches...",
        cancellable: false,
      },
      async () => {
        await Promise.all(
          targetRepos!.map(async (repo) => {
            try {
              const git = simpleGit(repo.path);
              const branches = await git.branch(["-a"]); // Fetch all branches including remotes
              branches.all.forEach((b) => {
                let name = b;
                if (name.startsWith("remotes/")) {
                  // Strip 'remotes/origin/' or similar
                  const parts = name.split("/");
                  if (parts.length > 2) {
                    name = parts.slice(2).join("/");
                  }
                }
                allBranches.add(name);
              });
            } catch {
              // ignore
            }
          }),
        );
      },
    );

    const sortedBranches = Array.from(allBranches).sort();
    const pick = await vscode.window.showQuickPick(sortedBranches, {
      placeHolder: "Select branch to checkout",
    });

    if (!pick) {return;}

    await runGitOperation(`Checkout ${pick}`, targetRepos, async (git) => {
      await git.checkout(pick);
      output.appendLine(`Checked out ${pick}.`);
    });
  };

  const runMerge = async (repos?: RepoInfo[]) => {
    const targetRepos = repos ?? await getAllRepos();
    if (targetRepos.length === 0) {
      vscode.window.showWarningMessage("No Git repositories found.");
      return;
    }

    // Keep the concrete ref for each repository. Prefer origin, then another
    // remote, and only fall back to a local branch when no remote ref exists.
    const branchRepos = new Map<string, Map<string, string>>();
    const currentBranchRepos = new Map<string, RepoInfo[]>();
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Fetching branches available to merge...",
        cancellable: false,
      },
      async () => {
        await Promise.all(targetRepos.map(async (repo) => {
          try {
            const branches = await simpleGit(repo.path).branch(["-a"]);
            if (branches.current) {
              const reposOnBranch = currentBranchRepos.get(branches.current) ?? [];
              reposOnBranch.push(repo);
              currentBranchRepos.set(branches.current, reposOnBranch);
            }
            const refsForRepo = new Map<string, { ref: string; priority: number }>();
            for (const rawBranch of branches.all) {
              if (rawBranch.includes("/HEAD -> ")) {continue;}

              const isRemote = rawBranch.startsWith("remotes/");
              const parts = rawBranch.split("/");
              const name = isRemote && parts.length > 2
                ? parts.slice(2).join("/")
                : rawBranch;
              const mergeRef = isRemote ? parts.slice(1).join("/") : rawBranch;
              const priority = mergeRef.startsWith("origin/") ? 2 : isRemote ? 1 : 0;
              const existing = refsForRepo.get(name);
              if (!existing || priority > existing.priority) {
                refsForRepo.set(name, { ref: mergeRef, priority });
              }
            }

            for (const [name, selected] of refsForRepo) {
              const reposForBranch = branchRepos.get(name) ?? new Map<string, string>();
              reposForBranch.set(repo.path, selected.ref);
              branchRepos.set(name, reposForBranch);
            }
          } catch (e: any) {
            output.appendLine(`Failed to inspect branches in ${repo.name}: ${e.message || e}`);
          }
        }));
      },
    );

    const currentBranchItems = Array.from(currentBranchRepos.entries())
      .map(([label, branchTargetRepos]) => ({
        label,
        description: `${branchTargetRepos.length} repo(s)`,
        detail: branchTargetRepos.map(repo => repo.name).sort().join(", "),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    if (currentBranchItems.length === 0) {
      vscode.window.showWarningMessage("No current branches available for merge.");
      return;
    }

    const currentBranchPick = await vscode.window.showQuickPick(currentBranchItems, {
      title: "Batch Merge: 1/2 Select current branch",
      placeHolder: "Only repositories currently on this branch will be merged",
      matchOnDescription: true,
      matchOnDetail: true,
    });
    if (!currentBranchPick) {return;}

    const eligibleRepos = currentBranchRepos.get(currentBranchPick.label)!;
    const eligiblePaths = new Set(eligibleRepos.map(repo => repo.path));
    const branchItems = Array.from(branchRepos.entries())
      .map(([label, repoRefs]) => {
        const matchingPaths = Array.from(repoRefs.keys()).filter(repoPath => eligiblePaths.has(repoPath));
        return {
          label,
          description: `${matchingPaths.length} repo(s)`,
          detail: matchingPaths.map(repoPath => path.basename(repoPath)).sort().join(", "),
        };
      })
      .filter(item => item.detail.length > 0)
      .sort((a, b) => a.label.localeCompare(b.label));

    if (branchItems.length === 0) {
      vscode.window.showWarningMessage("No branches available to merge.");
      return;
    }

    const pick = await vscode.window.showQuickPick(branchItems, {
      title: `Batch Merge: 2/2 Merge into ${currentBranchPick.label}`,
      placeHolder: "Select branch to merge (type to filter)",
      matchOnDescription: true,
      matchOnDetail: true,
    });
    if (!pick) {return;}

    const repoRefs = branchRepos.get(pick.label)!;
    const selectedRepos = eligibleRepos.filter(repo => repoRefs.has(repo.path));
    await runGitOperation(`Merge ${pick.label}`, selectedRepos, async (git, _repoName, repo) => {
      const mergeRef = repoRefs.get(repo.path);
      if (!mergeRef) {throw new Error(`Branch ${pick.label} is not available`);}
      await git.merge(["--no-edit", mergeRef]);
      output.appendLine(`Merged ${mergeRef}.`);
    });
  };

  const runCreateBranch = async (repos?: RepoInfo[]) => {
    const branch = await vscode.window.showInputBox({
      prompt: "New branch name",
    });
    if (!branch) {return;}

    const validation = validateBranchName(branch);
    if (!validation.valid) {
      vscode.window.showErrorMessage(`❌ ${validation.error}`);
      return;
    }

    await runGitOperation(`Create Branch ${branch}`, repos, async (git) => {
      await git.checkoutLocalBranch(branch);
      output.appendLine(`Created and checked out ${branch}.`);
    });
  };

  const runDeleteBranch = async (repos?: RepoInfo[]) => {
    const branch = await vscode.window.showInputBox({
      prompt: "Branch name to delete",
    });
    if (!branch) {return;}

    const validation = validateBranchName(branch);
    if (!validation.valid) {
      vscode.window.showErrorMessage(`❌ ${validation.error}`);
      return;
    }

    await runGitOperation(`Delete Branch ${branch}`, repos, async (git) => {
      await git.deleteLocalBranch(branch, true);
      output.appendLine(`Deleted branch ${branch}.`);
    });
  };

  const runCreateTag = async (repos?: RepoInfo[]) => {
    const tag = await vscode.window.showInputBox({ prompt: "Tag name" });
    if (!tag) {return;}

    const validation = validateTagName(tag);
    if (!validation.valid) {
      vscode.window.showErrorMessage(`❌ ${validation.error}`);
      return;
    }

    await runGitOperation(`Create Tag ${tag}`, repos, async (git) => {
      await git.addTag(tag);
      output.appendLine(`Created tag ${tag}.`);
    });
  };

  const runDeleteTag = async (repos?: RepoInfo[]) => {
    const tag = await vscode.window.showInputBox({
      prompt: "Tag name to delete",
    });
    if (!tag) {return;}

    const validation = validateTagName(tag);
    if (!validation.valid) {
      vscode.window.showErrorMessage(`❌ ${validation.error}`);
      return;
    }

    await runGitOperation(`Delete Tag ${tag}`, repos, async (git) => {
      await git.tag(["-d", tag]);
      output.appendLine(`Deleted tag ${tag}.`);
    });
  };

  const runCreateRemote = async (repos?: RepoInfo[]) => {
    const name = await vscode.window.showInputBox({
      prompt: "Remote name",
      value: "origin",
    });
    if (!name) {return;}

    const nameValidation = validateRemoteName(name);
    if (!nameValidation.valid) {
      vscode.window.showErrorMessage(`❌ ${nameValidation.error}`);
      return;
    }

    const url = await vscode.window.showInputBox({ prompt: "Remote URL" });
    if (!url) {return;}

    const urlValidation = validateRemoteURL(url);
    if (!urlValidation.valid) {
      vscode.window.showErrorMessage(`❌ ${urlValidation.error}`);
      return;
    }

    await runGitOperation(`Add Remote ${name}`, repos, async (git) => {
      await git.addRemote(name, url);
      output.appendLine(`Added remote ${name}.`);
    });
  };

  const runDeleteRemote = async (repos?: RepoInfo[]) => {
    const name = await vscode.window.showInputBox({
      prompt: "Remote name to delete",
    });
    if (!name) {return;}

    const validation = validateRemoteName(name);
    if (!validation.valid) {
      vscode.window.showErrorMessage(`❌ ${validation.error}`);
      return;
    }

    await runGitOperation(`Delete Remote ${name}`, repos, async (git) => {
      await git.removeRemote(name);
      output.appendLine(`Deleted remote ${name}.`);
    });
  };

  const runResetWorkspace = async (repos?: RepoInfo[]) => {
    const confirm = await vscode.window.showWarningMessage(
      "🚨 Reset workspace? This will discard all changes, fetch and pull. This cannot be undone!",
      { modal: true },
      "Reset",
    );
    if (confirm !== "Reset") {
      vscode.window.showInformationMessage("ℹ️ Reset operation cancelled.");
      return;
    }

    let repoList = repos;
    repoList ??= await getAllRepos();
    if (repoList.length === 0) {
      vscode.window.showWarningMessage("⚠️ No Git repositories found.");
      return;
    }

    output.clear();

    let successCount = 0;
    let failureCount = 0;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Resetting workspace on ${repoList.length} repo(s)`,
        cancellable: true,
      },
      async (_progress, token) => {
        for (const repo of repoList) {
          if (token.isCancellationRequested) {
            break;
          }
          const repoName = path.basename(repo.path);
          output.appendLine(`\n=== ${repoName} » Reset Workspace ===`);

          try {
            const git = simpleGit(repo.path);

            output.appendLine("Discarding changes...");
            await git.reset(["--hard", "HEAD"]);
            await git.clean("f", ["-d"]);
            output.appendLine("✅ Changes discarded");

            output.appendLine("Fetching...");
            await git.fetch(["--all", "--prune"]);
            output.appendLine("✅ Fetch completed");

            output.appendLine("Pulling...");
            await git.pull(undefined, undefined, { "--rebase": null });
            output.appendLine("✅ Pull completed");

            output.appendLine(`=== ${repoName} » Reset completed ===`);
            successCount++;
          } catch (e: any) {
            failureCount++;
            const errorMsg = e.message || String(e);
            output.appendLine(`❌ Error: ${errorMsg}`);
          }
        }
      },
    );

    if (failureCount === 0) {
      vscode.window.showInformationMessage(
        `✅ Reset completed successfully on ${successCount} repo(s)`
      );
    } else if (successCount === 0) {
      vscode.window.showErrorMessage(
        `❌ Reset failed on all ${failureCount} repo(s). Check Output for details.`
      );
    } else {
      vscode.window.showWarningMessage(
        `⚠️ Reset: ${successCount} succeeded, ${failureCount} failed. Check Output for details.`
      );
    }
  };

  // --- Registration (Centralized) ---

  // Handler map: command ID → implementation
  const singleRepoWrapper =
    (fn: (repos?: RepoInfo[]) => Promise<void>) =>
    async (item: vscode.SourceControl) => {
      if (item && item.rootUri) {
        const repo: RepoInfo = {
          name: path.basename(item.rootUri.fsPath),
          path: item.rootUri.fsPath,
        };
        await fn([repo]);
      }
    };

  const commandHandlers: Record<string, () => Promise<void>> = {
    "multi-repo-git-commands.runGitAll": () => runCustom(),
    "multi-repo-git-commands.runCustomGitAll": () => runCustom(),
    "multi-repo-git-commands.statusAll": () => runStatus(),
    "multi-repo-git-commands.fetchAll": () => runFetch(),
    "multi-repo-git-commands.pullAll": () => runPull(),
    "multi-repo-git-commands.pushAll": () => runPush(),
    "multi-repo-git-commands.commitAll": () => runCommit(),
    "multi-repo-git-commands.stageAll": () => runStageAll(),
    "multi-repo-git-commands.unstageAll": () => runUnstageAll(),
    "multi-repo-git-commands.discardAll": () => runDiscard(),
    "multi-repo-git-commands.stashAll": () => runStash(),
    "multi-repo-git-commands.popStashAll": () => runPopStash(),
    "multi-repo-git-commands.checkoutAll": () => runCheckout(),
    "multi-repo-git-commands.mergeAll": () => runMerge(),
    "multi-repo-git-commands.createBranchAll": () => runCreateBranch(),
    "multi-repo-git-commands.deleteBranchAll": () => runDeleteBranch(),
    "multi-repo-git-commands.createTagAll": () => runCreateTag(),
    "multi-repo-git-commands.deleteTagAll": () => runDeleteTag(),
    "multi-repo-git-commands.createRemoteAll": () => runCreateRemote(),
    "multi-repo-git-commands.deleteRemoteAll": () => runDeleteRemote(),
    "multi-repo-git-commands.resetWorkspace": () => runResetWorkspace(),
  };

  // Register all commands
  for (const [cmdId, handler] of Object.entries(commandHandlers)) {
    context.subscriptions.push(
      vscode.commands.registerCommand(cmdId, handler)
    );
  }

  // Single Repo (SCM Context Menu)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "multi-repo-git-commands.customRepo",
      singleRepoWrapper(runCustom),
    ),
    vscode.commands.registerCommand(
      "multi-repo-git-commands.openRepo",
      async (item: vscode.SourceControl) => {
        if (item && item.rootUri) {
          await vscode.commands.executeCommand(
            "vscode.openFolder",
            item.rootUri,
            { forceNewWindow: false, noRecentEntry: false },
          );
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      MultiRepoViewProvider.viewType,
      provider,
    ),
  );

  context.subscriptions.push(output);
}

export function deactivate() {}
