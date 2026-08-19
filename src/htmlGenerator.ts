import * as vscode from "vscode";

export class HtmlGenerator {
  static generateWebviewHtml(
    webview: vscode.Webview,
    extensionUri: vscode.Uri,
    nonce: string,
  ): string {
    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "dist", "codicons", "codicon.css"),
    );

    const config = vscode.workspace.getConfiguration("multiRepoGit");
    const buttonSize = Math.max(50, config.get<number>("toolbarButtonSize", 75));
    const buttonHeight = `${buttonSize}px`;

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<title>Multi Repo Search</title>
                <link href="${codiconsUri}" rel="stylesheet" />
				<style>
					:root {
						--button-height: ${buttonHeight};
					}
					* {
						--button-height: ${buttonHeight};
					}
					body { padding: 10px; font-family: var(--vscode-font-family); color: var(--vscode-foreground); }
					.section { margin-bottom: 20px; }
					h3 { font-size: 1.1em; margin-bottom: 8px; text-transform: uppercase; opacity: 0.8; }
					input {
						width: 100%;
						padding: 6px;
						box-sizing: border-box;
						background: var(--vscode-input-background);
						color: var(--vscode-input-foreground);
						border: 1px solid var(--vscode-input-border);
                        margin-bottom: 8px;
					}
                    input:focus {
                        outline: 1px solid var(--vscode-focusBorder);
                    }
					button {
						width: 100%;
						padding: 6px;
						background: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
						border: none;
						cursor: pointer;
                        margin-bottom: 4px;
					}
					button:hover { background: var(--vscode-button-hoverBackground); }
                    .results { margin-top: 10px; }
                    .repo-item {
                        padding: 8px 0;
                        border-bottom: 1px solid var(--vscode-panel-border);
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                    }
                    .repo-item:last-child { border-bottom: none; }
                    .repo-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .repo-name { font-weight: bold; }
                    .repo-current { font-size: 0.9em; opacity: 0.8; }
                    .repo-match {
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                        font-size: 0.9em;
                        background: var(--vscode-textBlockQuote-background);
                        padding: 4px;
                        border-radius: 4px;
                    }
                    .match-item {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 2px 0;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    .match-item:last-child { border-bottom: none; }
                    .match-name { font-family: var(--vscode-editor-font-family); word-break: break-all; }
                    .repo-actions button {
                        width: auto;
                        padding: 2px 8px;
                        font-size: 0.9em;
                        white-space: nowrap;
                    }

                    /* Commit Search Styles */
                    .commit-match {
                        padding: 8px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                    }
                    .commit-match:last-child { border-bottom: none; }
                    .commit-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
                    .commit-row.main { font-weight: bold; }
                    .commit-message { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    .commit-hash { font-family: var(--vscode-editor-font-family); font-size: 0.9em; opacity: 0.8; flex-shrink: 0; }
                    .commit-row.meta { font-size: 0.85em; opacity: 0.8; }
                    .commit-refs {
                        font-size: 0.85em;
                        color: var(--vscode-textPreformat-foreground);
                        background: var(--vscode-textBlockQuote-background);
                        padding: 2px 6px;
                        border-radius: 10px;
                        border: 1px solid var(--vscode-textBlockQuote-border);
                        display: inline-flex;
                        align-items: center;
                        gap: 4px;
                    }

                    details { width: 100%; }
                    summary { cursor: pointer; font-weight: bold; margin-bottom: 4px; }
                    .matches-list { display: flex; flex-direction: column; gap: 2px; }
                    .loading { opacity: 0.6; font-style: italic; display: none; }

                    /* Toolbar Styles */
                    .toolbar {
                      display: grid;
                      grid-template-columns: repeat(auto-fill, minmax(var(--button-height), var(--button-height)));
                      gap: 10px;
                      margin-bottom: 20px;
                    }
                    .icon-btn {
                      width: var(--button-height);
                      height: var(--button-height);
                      padding: 10px 4px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        border-radius: 6px;
                        gap: 8px;
                    }
                    .icon-btn svg {
                        width: 24px;
                        height: 24px;
                        fill: currentColor;
                    }
                    .icon-btn .codicon {
                      font-size: 24px;
                      line-height: 1;
                    }
                    .btn-label {
                        font-size: 0.9em;
                        text-align: center;
                        line-height: 1;
                        font-weight: 500;
                    }
				</style>
			</head>
			<body>
                <div class="section">
                    <h3>Global Actions</h3>
                    <div class="toolbar">
                        <button class="icon-btn" title="Fetch All" data-command="multi-repo-git-commands.fetchAll">
                          <i class="codicon codicon-repo-sync"></i>
                          <span class="btn-label">Fetch</span>
                        </button>
                        <button class="icon-btn" title="Pull All" data-command="multi-repo-git-commands.pullAll">
                          <i class="codicon codicon-repo-pull"></i>
                          <span class="btn-label">Pull</span>
                        </button>
                        <button class="icon-btn" title="Push All" data-command="multi-repo-git-commands.pushAll">
                          <i class="codicon codicon-repo-push"></i>
                          <span class="btn-label">Push</span>
                        </button>
                        <button class="icon-btn" title="Commit All" data-command="multi-repo-git-commands.commitAll">
                          <i class="codicon codicon-git-commit"></i>
                          <span class="btn-label">Commit</span>
                        </button>
                        <button class="icon-btn" title="Switch Branch" data-command="multi-repo-git-commands.checkoutAll">
                          <i class="codicon codicon-git-branch"></i>
                          <span class="btn-label">Switch</span>
                        </button>
                        <button class="icon-btn" title="Merge Branch" data-command="multi-repo-git-commands.mergeAll">
                          <i class="codicon codicon-git-merge"></i>
                          <span class="btn-label">Merge</span>
                        </button>
                        <button class="icon-btn" title="Stage All" data-command="multi-repo-git-commands.stageAll">
                          <i class="codicon codicon-diff-added"></i>
                          <span class="btn-label">Stage</span>
                        </button>
                        <button class="icon-btn" title="Unstage All" data-command="multi-repo-git-commands.unstageAll">
                          <i class="codicon codicon-diff-removed"></i>
                          <span class="btn-label">Unstage</span>
                        </button>
                        <button class="icon-btn" title="Stash All" data-command="multi-repo-git-commands.stashAll">
                          <i class="codicon codicon-archive"></i>
                          <span class="btn-label">Stash</span>
                        </button>
                        <button class="icon-btn" title="Pop Stash All" data-command="multi-repo-git-commands.popStashAll">
                          <i class="codicon codicon-arrow-up"></i>
                          <span class="btn-label">Pop</span>
                        </button>
                        <button class="icon-btn" title="Discard All" data-command="multi-repo-git-commands.discardAll">
                          <i class="codicon codicon-trash"></i>
                          <span class="btn-label">Discard</span>
                        </button>
                        <button class="icon-btn" title="Reset Workspace" data-command="multi-repo-git-commands.resetWorkspace">
                          <i class="codicon codicon-refresh"></i>
                          <span class="btn-label">Reset</span>
                        </button>
                    </div>
                </div>

				<div class="section">
					<h3>Search Branch</h3>
					<input type="text" id="branchInput" placeholder="e.g. feature/login" />
					<button id="searchBranchBtn">Search</button>
				</div>

        <div class="section">
          <h3>Search Tag</h3>
          <input type="text" id="tagInput" placeholder="e.g. v1.2.3" />
          <button id="searchTagBtn">Search</button>
        </div>

				<div class="section">
					<h3>Search Commit</h3>
                    <div style="display: flex; gap: 4px; margin-bottom: 8px;">
					    <input type="text" id="commitInput" placeholder="e.g. Fix login bug" style="margin-bottom: 0; flex: 1;" />
                        <button id="toggleFiltersBtn" style="width: auto; padding: 6px 10px; margin-bottom: 0;" title="Filters">
                            <i class="codicon codicon-filter"></i>
                        </button>
                    </div>

                    <div id="commitFilters" class="filters" style="display: none; margin-bottom: 8px; padding: 8px; border: 1px solid var(--vscode-panel-border); border-radius: 4px;">
                      <div class="filter-row" style="display: flex; gap: 4px;">
                        <input type="text" id="authorInput" placeholder="Author" style="flex: 1;" />
                        <input type="text" id="shaInput" placeholder="SHA" style="flex: 1;" />
                      </div>
                        <div class="filter-row" style="display: flex; gap: 4px;">
                            <input type="date" id="dateFromInput" title="From Date" max="9999-12-31" />
                            <input type="date" id="dateToInput" title="To Date" max="9999-12-31" />
                        </div>
                        <div class="filter-row" style="display: flex; gap: 4px;">
                            <input type="text" id="branchFilterInput" readonly placeholder="All Branches" style="flex: 1;" />
                            <button id="selectBranchFilterBtn" style="width: auto; padding: 0 8px;">Select</button>
                            <button id="clearBranchFilterBtn" style="width: auto; padding: 0 8px;" title="Clear">x</button>
                        </div>
                    </div>

					<button id="searchCommitBtn">Search</button>
				</div>

                <div id="loading" class="loading">Searching...</div>
				<div id="results" class="results"></div>

				<script nonce="${nonce}">
					${this.getClientScript()}
				</script>
			</body>
			</html>`;
  }

  private static getClientScript(): string {
    return `
const vscode = acquireVsCodeApi();
const resultsDiv = document.getElementById('results');
const loadingDiv = document.getElementById('loading');
let currentSearchType = '';
let currentSearchValue = '';

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function runCmd(command) {
  vscode.postMessage({ type: 'runCommand', command });
}

function checkoutBranch(repoPath, branchName) {
  vscode.postMessage({ type: 'checkoutBranch', repoPath, branchName });
}

function checkoutTag(repoPath, tagName) {
  vscode.postMessage({ type: 'checkoutTag', repoPath, tagName });
}

document.querySelectorAll('button[data-command]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const command = btn.getAttribute('data-command');
    if (command) {
      runCmd(command);
    }
  });
});

document.getElementById('toggleFiltersBtn').addEventListener('click', () => {
  const filters = document.getElementById('commitFilters');
  filters.style.display = filters.style.display === 'none' ? 'block' : 'none';
});

['dateFromInput', 'dateToInput'].forEach(id => {
  const el = document.getElementById(id);
  let lastValue = el.value;
  let isDigit = false;

  el.addEventListener('keydown', (e) => {
    isDigit = /^\\d\$/.test(e.key);
  });

  el.addEventListener('input', (e) => {
    const newVal = e.target.value;
    if (!newVal) {
      lastValue = '';
      return;
    }

    const newParts = newVal.split('-');
    const newYear = newParts[0];

    if (!lastValue) {
      lastValue = newVal;
      return;
    }

    const oldParts = lastValue.split('-');
    const oldYear = oldParts[0];

    if (newYear.length > 4 || (isDigit && oldYear.length === 4 && oldYear[0] !== '0' && newYear !== oldYear)) {
      e.target.value = lastValue;
    } else {
      lastValue = newVal;
    }
  });
});

document.getElementById('searchBranchBtn').addEventListener('click', () => {
  const value = document.getElementById('branchInput').value;
  if(value) {
    currentSearchType = 'branch';
    currentSearchValue = value;
    vscode.postMessage({ type: 'searchBranch', value });
  }
});

document.getElementById('searchTagBtn').addEventListener('click', () => {
  const value = document.getElementById('tagInput').value;
  if(value) {
    currentSearchType = 'tag';
    currentSearchValue = value;
    vscode.postMessage({ type: 'searchTag', value });
  }
});

document.getElementById('searchCommitBtn').addEventListener('click', () => {
  const value = document.getElementById('commitInput').value;
  const author = document.getElementById('authorInput').value;
  const dateFrom = document.getElementById('dateFromInput').value;
  const dateTo = document.getElementById('dateToInput').value;
  const branch = document.getElementById('branchFilterInput').value;
  const sha = document.getElementById('shaInput').value;

  if(value || author || dateFrom || dateTo || branch || sha) {
    currentSearchType = 'commit';
    currentSearchValue = value;
    vscode.postMessage({
      type: 'searchCommit',
      value,
      filters: { author, dateFrom, dateTo, branch: branch === 'All Branches' ? '' : branch, sha }
    });
  }
});

document.getElementById('selectBranchFilterBtn').addEventListener('click', () => {
  vscode.postMessage({ type: 'pickBranchFilter' });
});

document.getElementById('clearBranchFilterBtn').addEventListener('click', () => {
  document.getElementById('branchFilterInput').value = '';
});

resultsDiv.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  const button = target.closest('button[data-action]');
  if (!button) {
    return;
  }
  const action = button.getAttribute('data-action');
  if (action === 'checkoutBranch') {
    const repoPath = button.getAttribute('data-repo-path');
    const branchName = button.getAttribute('data-branch');
    if (repoPath && branchName) {
      checkoutBranch(repoPath, branchName);
    }
  } else if (action === 'checkoutTag') {
    const repoPath = button.getAttribute('data-repo-path');
    const tagName = button.getAttribute('data-tag');
    if (repoPath && tagName) {
      checkoutTag(repoPath, tagName);
    }
  }
});

window.addEventListener('message', event => {
  const message = event.data;
  switch (message.type) {
    case 'branchFilterSelected':
      document.getElementById('branchFilterInput').value = message.branch;
      break;
    case 'started':
      loadingDiv.style.display = 'block';
      resultsDiv.innerHTML = '';
      break;
    case 'results':
      loadingDiv.style.display = 'none';
      const repos = message.results;
      if (repos.length === 0) {
        resultsDiv.innerHTML = '<div>No repositories found.</div>';
      } else {
        resultsDiv.innerHTML = repos.map(r => {
          let matchHtml = '';
          const safePath = escapeAttr(r.path);

          if (r.matches && r.matches.length > 0) {
            const items = r.matches.map(m => {
              if (m.type === 'branch') {
                const safeBranch = escapeAttr(m.value);
                const action = \`<div class="repo-actions"><button data-action="checkoutBranch" data-repo-path="\${safePath}" data-branch="\${safeBranch}">Checkout</button></div>\`;
                return \`<div class="match-item">
                  <span class="match-name">\${m.label}</span>
                  \${action}
                </div>\`;
              } else if (m.type === 'tag') {
                const safeTag = escapeAttr(m.value);
                const action = \`<div class="repo-actions"><button data-action="checkoutTag" data-repo-path="\${safePath}" data-tag="\${safeTag}">Checkout</button></div>\`;
                return \`<div class="match-item">
                  <span class="match-name"><i class="codicon codicon-tag"></i> \${m.label}</span>
                  \${action}
                </div>\`;
              } else if (m.type === 'commit') {
                const dateObj = new Date(m.date);
                const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();

                return \`<div class="commit-match">
                  <div class="commit-row main">
                    <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
                      <i class="codicon codicon-git-commit"></i>
                      <span class="commit-message" title="\${m.message}">\${m.message}</span>
                    </div>
                    <span class="commit-hash">\${m.shortHash}</span>
                  </div>
                  <div class="commit-row meta">
                    <span class="commit-author"><i class="codicon codicon-account"></i> \${m.author}</span>
                    <span class="commit-date"><i class="codicon codicon-calendar"></i> \${dateStr}</span>
                  </div>
                  \${m.refs ? \`<div class="commit-row refs"><span class="commit-refs" title="Git References (Branches/Tags)"><i class="codicon codicon-tag"></i> <strong>Refs:</strong> \${m.refs}</span></div>\` : ''}
                </div>\`;
              }
            }).join('');

            matchHtml = \`<div class="repo-match">
              <details>
                <summary>Found (\${r.matches.length})</summary>
                <div class="matches-list">\${items}</div>
              </details>
            </div>\`;
          }

          const currentBranchHtml = r.currentBranch ? \`<span class="repo-current" data-repo-path="\${safePath}">Current: \${r.currentBranch}</span>\` : '';

          return \`<div class="repo-item" data-repo-path="\${safePath}">
            <div class="repo-header">
              <span class="repo-name">\${r.name}</span>
              \${currentBranchHtml}
            </div>
            \${matchHtml}
          </div>\`;
        }).join('');
      }
      break;
    case 'branchUpdated':
      const { repoPath, branchName } = message;
      const currentSpan = document.querySelector(\`.repo-current[data-repo-path="\${repoPath.replace(/\\\\\\\\/g, '\\\\\\\\\\\\\\\\').replace(/"/g, '\\\\\\\\"') }"]\`);
      if (currentSpan) {
        currentSpan.textContent = 'Current: ' + branchName;
      }
      break;
  }
});
    `;
  }
}
