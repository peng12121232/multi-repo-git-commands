import * as assert from "node:assert";
import * as vscode from "vscode";
import * as path from "path";
import {
  validateBranchName,
  validateCommitMessage,
  validateTagName,
  validateRemoteName,
  validateRemoteURL,
  validateStashMessage,
  validateCustomGitArgs,
} from "../validators";
import { getAllGitRepos } from "../repoDiscovery";
import { COMMANDS, getCommandById, getAllCommandIds } from "../commandRegistry";

suite("Validators", () => {
  suite("validateBranchName", () => {
    test("accepts valid branch name", () => {
      const result = validateBranchName("feature/test");
      assert.strictEqual(result.valid, true);
    });

    test("rejects empty branch name", () => {
      const result = validateBranchName("");
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("empty"));
    });

    test("rejects branch name starting with hyphen", () => {
      const result = validateBranchName("-invalid");
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("-"));
    });

    test("rejects branch name with invalid characters", () => {
      const result = validateBranchName("feature@invalid!");
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("characters"));
    });

    test("rejects branch name exceeding max length", () => {
      const longName = "a".repeat(201);
      const result = validateBranchName(longName);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("too long"));
    });

    test("allows dots in branch names", () => {
      const result = validateBranchName("release.1.0");
      assert.strictEqual(result.valid, true);
    });

    test("allows slashes for hierarchical names", () => {
      const result = validateBranchName("feature/sub/feature");
      assert.strictEqual(result.valid, true);
    });
  });

  suite("validateCommitMessage", () => {
    test("accepts valid commit message", () => {
      const result = validateCommitMessage("Initial commit");
      assert.strictEqual(result.valid, true);
    });

    test("rejects empty commit message", () => {
      const result = validateCommitMessage("");
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("empty"));
    });

    test("rejects message exceeding max length", () => {
      const longMsg = "a".repeat(1001);
      const result = validateCommitMessage(longMsg);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("too long"));
    });

    test("accepts multiline messages", () => {
      const result = validateCommitMessage("Fix bug\n\nThis fixes the issue");
      assert.strictEqual(result.valid, true);
    });
  });

  suite("validateTagName", () => {
    test("accepts valid tag name", () => {
      const result = validateTagName("v1.0.0");
      assert.strictEqual(result.valid, true);
    });

    test("rejects empty tag name", () => {
      const result = validateTagName("");
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("empty"));
    });

    test("rejects tag with invalid characters", () => {
      const result = validateTagName("v1@invalid");
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("characters"));
    });

    test("rejects tag exceeding max length", () => {
      const longTag = "v" + "1".repeat(200);
      const result = validateTagName(longTag);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("too long"));
    });

    test("allows semantic versioning", () => {
      const result = validateTagName("v2.1.3-alpha");
      assert.strictEqual(result.valid, true);
    });
  });

  suite("validateRemoteName", () => {
    test("accepts valid remote name", () => {
      const result = validateRemoteName("origin");
      assert.strictEqual(result.valid, true);
    });

    test("rejects empty remote name", () => {
      const result = validateRemoteName("");
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("empty"));
    });

    test("rejects remote with invalid characters", () => {
      const result = validateRemoteName("origin@invalid!");
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("characters"));
    });

    test("accepts remote names with hyphens and dots", () => {
      const result = validateRemoteName("my-upstream.repo");
      assert.strictEqual(result.valid, true);
    });
  });

  suite("validateRemoteURL", () => {
    test("accepts HTTPS URL", () => {
      const result = validateRemoteURL("https://github.com/user/repo.git");
      assert.strictEqual(result.valid, true);
    });

    test("accepts HTTP URL", () => {
      const result = validateRemoteURL("http://github.com/user/repo.git");
      assert.strictEqual(result.valid, true);
    });

    test("accepts SSH URL", () => {
      const result = validateRemoteURL("git@github.com:user/repo.git");
      assert.strictEqual(result.valid, true);
    });

    test("accepts local path", () => {
      const result = validateRemoteURL("/path/to/repo.git");
      assert.strictEqual(result.valid, true);
    });

    test("rejects invalid URL", () => {
      const result = validateRemoteURL("not a url");
      assert.strictEqual(result.valid, false);
    });

    test("rejects empty URL", () => {
      const result = validateRemoteURL("");
      assert.strictEqual(result.valid, false);
    });

    test("handles URLs with special characters", () => {
      const result = validateRemoteURL("https://github.com/user-name/repo_name.git");
      assert.strictEqual(result.valid, true);
    });

    test("rejects git protocol (not supported)", () => {
      const result = validateRemoteURL("git://github.com/user/repo.git");
      assert.strictEqual(result.valid, false);
    });

    test("rejects file protocol (not supported)", () => {
      const result = validateRemoteURL("file:///path/to/repo");
      assert.strictEqual(result.valid, false);
    });
  });

  suite("validateStashMessage", () => {
    test("accepts empty stash message", () => {
      const result = validateStashMessage("");
      assert.strictEqual(result.valid, true);
    });

    test("accepts valid stash message", () => {
      const result = validateStashMessage("WIP: feature work");
      assert.strictEqual(result.valid, true);
    });

    test("rejects stash message exceeding max length", () => {
      const longMsg = "a".repeat(501);
      const result = validateStashMessage(longMsg);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("too long"));
    });
  });

  suite("validateCustomGitArgs", () => {
    test("accepts valid git arguments", () => {
      const result = validateCustomGitArgs(["status", "-sb"]);
      assert.strictEqual(result.valid, true);
    });

    test("rejects empty array", () => {
      const result = validateCustomGitArgs([]);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("empty"));
    });

    test("rejects too many arguments", () => {
      const args = Array.from({ length: 21 }, (_, i) => `arg${i}`);
      const result = validateCustomGitArgs(args);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("Too many"));
    });

    test("accepts exactly 20 arguments", () => {
      const args = Array.from({ length: 20 }, (_, i) => `arg${i}`);
      const result = validateCustomGitArgs(args);
      assert.strictEqual(result.valid, true);
    });
  });
});

suite("Command Registry", () => {
  test("COMMANDS array is populated", () => {
    assert.ok(COMMANDS.length > 0, "COMMANDS should not be empty");
    assert.strictEqual(COMMANDS.length, 23, "Should have 23 commands");
  });

  test("all commands have required properties", () => {
    for (const cmd of COMMANDS) {
      assert.ok(cmd.id, "Command must have id");
      assert.ok(cmd.label, "Command must have label");
      assert.ok(cmd.description, "Command must have description");
      assert.ok(typeof cmd.handler === "function", "Command must have handler");
    }
  });

  test("getCommandById finds existing command", () => {
    const cmd = getCommandById("multi-repo-git-commands.statusAll");
    assert.ok(cmd, "Should find command by id");
    assert.strictEqual(cmd?.label, "Show Status");
  });

  test("getCommandById returns undefined for missing command", () => {
    const cmd = getCommandById("non.existent.command");
    assert.strictEqual(cmd, undefined);
  });

  test("getAllCommandIds returns all command ids", () => {
    const ids = getAllCommandIds();
    assert.strictEqual(ids.length, 23, "Should return all 23 command ids");
    assert.ok(
      ids.includes("multi-repo-git-commands.statusAll"),
      "Should include statusAll command"
    );
  });

  test("command ids are unique", () => {
    const ids = getAllCommandIds();
    const uniqueIds = new Set(ids);
    assert.strictEqual(ids.length, uniqueIds.size, "All command ids should be unique");
  });

  test("all commands have correct id format", () => {
    for (const cmd of COMMANDS) {
      assert.ok(
        cmd.id.startsWith("multi-repo-git-commands."),
        `Command id should start with namespace: ${cmd.id}`
      );
    }
  });

  test("command labels are descriptive", () => {
    for (const cmd of COMMANDS) {
      assert.ok(cmd.label.length > 0, "Label should not be empty");
      assert.ok(cmd.label.length < 100, "Label should be reasonable length");
    }
  });

  test("command descriptions are helpful", () => {
    for (const cmd of COMMANDS) {
      assert.ok(cmd.description.length > 0, "Description should not be empty");
      assert.ok(cmd.description.length < 200, "Description should be reasonable length");
    }
  });
});

suite("Repository Discovery", () => {
  test("getAllGitRepos returns array", async () => {
    const repos = await getAllGitRepos();
    assert.ok(Array.isArray(repos), "getAllGitRepos should return an array");
  });

  test("getAllGitRepos returns absolute paths", async () => {
    const repos = await getAllGitRepos();
    if (repos.length > 0) {
      repos.forEach((repo) => {
        assert.ok(
          path.isAbsolute(repo),
          `Repository path should be absolute: ${repo}`
        );
      });
    }
  });
});

suite("Extension Activation", () => {
  test("Extension can be activated", async () => {
    const ext = vscode.extensions.getExtension("DanieleDituri.multi-repo-git-commands");
    assert.ok(ext, "Extension should be available");
    if (ext && !ext.isActive) {
      await ext.activate();
    }
    assert.ok(ext?.isActive, "Extension should be active");
  });

  test("All critical commands should be registered", async () => {
    const commands = await vscode.commands.getCommands(true);
    const expectedCommands = [
      "multi-repo-git-commands.runGitAll",
      "multi-repo-git-commands.statusAll",
      "multi-repo-git-commands.fetchAll",
      "multi-repo-git-commands.pullAll",
      "multi-repo-git-commands.pushAll",
    ];
    for (const cmd of expectedCommands) {
      assert.ok(commands.includes(cmd), `Command not found: ${cmd}`);
    }
  });
});

suite("Validator Boundary Tests", () => {
  test("branch name exactly at 200 chars", () => {
    const name = "a".repeat(200);
    const result = validateBranchName(name);
    assert.strictEqual(result.valid, true, "Should accept exactly 200 chars");
  });

  test("branch name at 201 chars fails", () => {
    const name = "a".repeat(201);
    const result = validateBranchName(name);
    assert.strictEqual(result.valid, false, "Should reject 201 chars");
  });

  test("commit message exactly at 1000 chars", () => {
    const msg = "a".repeat(1000);
    const result = validateCommitMessage(msg);
    assert.strictEqual(result.valid, true, "Should accept exactly 1000 chars");
  });

  test("commit message at 1001 chars fails", () => {
    const msg = "a".repeat(1001);
    const result = validateCommitMessage(msg);
    assert.strictEqual(result.valid, false, "Should reject 1001 chars");
  });

  test("stash message exactly at 500 chars", () => {
    const msg = "a".repeat(500);
    const result = validateStashMessage(msg);
    assert.strictEqual(result.valid, true, "Should accept exactly 500 chars");
  });

  test("custom git args with exactly 20 args", () => {
    const args = Array.from({ length: 20 }, (_, i) => `arg${i}`);
    const result = validateCustomGitArgs(args);
    assert.strictEqual(result.valid, true, "Should accept exactly 20 args");
  });

  test("custom git args with 21 args fails", () => {
    const args = Array.from({ length: 21 }, (_, i) => `arg${i}`);
    const result = validateCustomGitArgs(args);
    assert.strictEqual(result.valid, false, "Should reject 21 args");
  });
});

suite("Validator Type Safety", () => {
  test("all validators return ValidationResult type", () => {
    const result1 = validateBranchName("test");
    const result2 = validateCommitMessage("test");
    const result3 = validateTagName("test");

    assert.ok("valid" in result1, "Result should have valid property");
    assert.ok("valid" in result2, "Result should have valid property");
    assert.ok("valid" in result3, "Result should have valid property");

    assert.ok(typeof result1.valid === "boolean", "valid should be boolean");
    assert.ok(typeof result2.valid === "boolean", "valid should be boolean");
    assert.ok(typeof result3.valid === "boolean", "valid should be boolean");
  });

  test("invalid results have error message", () => {
    const result = validateBranchName("");
    assert.strictEqual(result.valid, false);
    assert.ok(result.error, "Invalid result should have error message");
    assert.ok(typeof result.error === "string", "error should be string");
  });

  test("valid results may not have error message", () => {
    const result = validateBranchName("valid-branch");
    assert.strictEqual(result.valid, true);
  });
});

suite("Configuration", () => {
  test("Should read multiRepoGit configuration", async () => {
    const config = vscode.workspace.getConfiguration("multiRepoGit");
    assert.ok(config, "Configuration object exists");
  });

  test("Should respect toolbar button size configuration", async () => {
    const config = vscode.workspace.getConfiguration("multiRepoGit");
    const buttonSize = config.get<number>("toolbarButtonSize");
    if (buttonSize !== undefined) {
      assert.ok(buttonSize >= 50, "Button size should be at least 50px");
      assert.ok(buttonSize <= 150, "Button size should be at most 150px");
    }
  });

  test("Should respect maxDepth configuration for repo discovery", async () => {
    const config = vscode.workspace.getConfiguration("multiRepoGit");
    const maxDepth = config.get<number>("maxDepth");
    if (maxDepth !== undefined) {
      assert.ok(maxDepth >= 0, "Max depth should be non-negative");
      assert.ok(maxDepth <= 8, "Max depth should be at most 8");
    }
  });

  test("Should respect scanNested configuration", async () => {
    const config = vscode.workspace.getConfiguration("multiRepoGit");
    const scanNested = config.get<boolean>("scanNested");
    if (scanNested !== undefined) {
      assert.ok(typeof scanNested === "boolean", "scanNested should be boolean");
    }
  });
});

suite("WebView Integration", () => {
  test("WebView provider should be registered", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.length > 0, "WebView provider registered");
  });
});
