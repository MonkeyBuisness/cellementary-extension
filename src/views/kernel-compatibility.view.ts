import * as vscode from 'vscode';

import { getUri } from './utils';
import { KernelCompatibilityChecker } from '../core/types';

export class KernelCompatibilityView {
    private _disposables: vscode.Disposable[] = [];

    constructor(extensionUri: vscode.Uri, checker: KernelCompatibilityChecker) {
        const panel = vscode.window.createWebviewPanel(
            'webview', 'Checking Kernel Compatibility', vscode.ViewColumn.One, {
            enableScripts: true,
        });

        panel.webview.html = this._getWebviewContent(panel.webview, extensionUri, checker);
        this._disposables.push(panel);
    }

    public dispose() : void {
        this._disposables.forEach(d => d.dispose());
    }

    private _getWebviewContent(
        webview: vscode.Webview,
        extensionUri: vscode.Uri,
        checker: KernelCompatibilityChecker) {
        const toolkitUri = getUri(webview, extensionUri, [
            "node_modules",
            "@vscode",
            "webview-ui-toolkit",
            "dist",
            "toolkit.js",
        ]);
        const codiconsUri = getUri(webview, extensionUri, [
            "node_modules",
            "@vscode",
            "codicons",
            "dist",
            "codicon.css",
        ]);
        const markedUri = getUri(webview, extensionUri, [
            "resources",
            "lib",
            "marked.min.js"
        ]);
        const requirements = checker.requirements();
        const cancelations: vscode.CancellationTokenSource[] = requirements.map(_ =>
            new vscode.CancellationTokenSource());
        const tasks = (requirements || [])
            .map(r => `'${r.name}'`)
            .join(',');

        this._disposables.push(webview.onDidReceiveMessage(async (e) => {
            const task = requirements[e.index];

            switch (e.type) {
                case 'run':
                    cancelations[e.index] = new vscode.CancellationTokenSource();
                    const result = await task.check(cancelations[e.index].token);
                    webview.postMessage({
                        index:  e.index,
                        result: result
                    });
                    break;
                case 'stop':
                    cancelations[e.index].cancel();
                    break;
            }
        }));

        return `
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <script type="module" src="${toolkitUri}"></script>
        <script src="${markedUri}"></script>
        <link rel="stylesheet" href="${codiconsUri}" />

        <title>Checking requirements</title>

        <style>
            .section-label {
                font-size: 24px;
                margin: 16px;
            }

            .hidden {
                display: none !important;
            }

            vscode-data-grid-row {
                align-items: center;
            }

            .codicon-check, .codicon-error, .codicon-warning, .codeicon-debug-pause {
                font: 22px / 1 codicon !important;
            }

            .codicon-check {
                color: #00e676;
            }

            .codicon-error {
                color: #ff1744;
            }

            .codicon-warning {
                color: #ffc400;
            }

            vscode-data-grid-cell blockquote {
                margin-left: 0 !important;
                padding: 0 6px 6px 6px;
            }

            vscode-data-grid-row {
                border-bottom: 1px solid var(--vscode-menu-separatorBackground);
            }

            .compatibility-label {
                display: flex;
                align-items: center;
                margin: 16px 12px;
                font-weight: bold;
                font-size: 18px;
            }

            .compatibility-label > .msg {
                margin-left: 16px;
            }
        </style>
    </head>
    <body>
        <section>
            <div class="section-label">Requirements</div>
            <div class="compatibility-label hidden">
                <span class="codicon"></span>
                <span class="msg"></span>
            </div>
            
            <vscode-data-grid
                id="req-cell-grid"
                generate-header="none"
                grid-template-columns="0.1fr 0.1fr 2fr 5fr">
            </vscode-data-grid>
        </section>

        <script>
            class TaskExecutor {

                constructor() {
                    this.vscode = acquireVsCodeApi();

                    window.addEventListener('message', event => {
                        const msg = event.data;
                        const task = tasks.find(t => t.index == msg.index);
                        if (task) {
                            task.executionCallback(msg.result);
                        }
                    });

                    this._compatibilityLabel = document.querySelector('.compatibility-label');
                    this._compatibilityIcon = document.querySelector('.compatibility-label > span.codicon');
                    this._compatibilityMsg = document.querySelector('.compatibility-label > span.msg');

                    this._checks = new Map();
                }

                sendState(index, type) {
                    this.vscode.postMessage({
                        type:  type,
                        index: index
                    });
                }

                setCheck(index, status) {
                    this._checks.set(index, status);

                    if (this._checks.size !== tasks.length) {
                        return;
                    }

                    this._compatibilityLabel.classList.remove('hidden');
                    this._compatibilityIcon.classList.remove(...this._compatibilityIcon.classList);
                    if ([...this._checks.values()].find(v => v === 'fail')) {
                        this._compatibilityIcon.classList.add('codicon',
                            TaskExecutor.getResponseIcon('fail'));
                        this._compatibilityMsg.innerText = 'Your system is not ready to work with this kernel';
                        return;
                    }

                    const successChecks = [...this._checks.values()].filter(v => v === 'success');
                    if (successChecks.length === tasks.length) {
                        this._compatibilityIcon.classList.add('codicon',
                            TaskExecutor.getResponseIcon('success'));
                        this._compatibilityMsg.innerText = 'Your system is ready to work with this kernel!';
                        return;
                    }

                    this._compatibilityIcon.classList.add('codicon',
                        TaskExecutor.getResponseIcon('warn'));
                    this._compatibilityMsg.innerText = 'Your system is almost ready to work with this kernel';
                }

                static getResponseIcon(status) {
                    switch (status) {
                        case 'success':
                            return 'codicon-check';
                        case 'fail':
                            return 'codicon-error';
                        case 'warn':
                            return 'codicon-warning';
                    }

                    return 'codeicon-debug-pause';
                }
            }

            const taskExecutor = new TaskExecutor();
        </script>

        <script>
            
        </script>

        <script>
            class RequirementTask {

                constructor(name, index) {
                    this.name = name;
                    this.index = index;
                    this.state = '';
                    this._nodesConstructor();
                }

                render(parent) {
                    parent.appendChild(this._nodes.row);
                }

                executionCallback(response) {
                    this._setActionState('stopped');

                    if (response) {
                        this._nodes.reqResponse.innerHTML =  marked.parse(response.msgMd || '');
                        this._nodes.statusIcon.classList.add('codicon',
                            TaskExecutor.getResponseIcon(response.status));
                    }
                    this._nodes.statusIcon.classList.remove('hidden');

                    taskExecutor.setCheck(this.index, response ? response.status : undefined);
                }

                async execute() {
                    this._setActionState('running');
                    taskExecutor.sendState(this.index, 'run');
                }

                _actionCallback() {
                    this._toggleState();
                    taskExecutor.sendState(this.index, this.state === 'running' ? 'run' : 'stop');
                }

                _toggleState() {
                    const state = this.state === 'running' ? 'stopped' : 'running';
                    this._setActionState(state);
                }

                _setActionState(state) {
                    this.state = state;

                    switch (this.state) {
                        case 'running':
                            this._nodes.actionBtn.title = 'Stop checking';
                            this._nodes.actionBtnIcon.classList.remove('codicon-redo');
                            this._nodes.actionBtnIcon.classList.add('codicon-debug-stop');
                            this._nodes.statusIcon.classList.add('hidden');
                            this._nodes.progressRing.classList.remove('hidden');
                            this._nodes.reqResponse.innerHTML = '';
                            break;
                        case 'stopped':
                            this._nodes.actionBtn.title = 'Repeat check';
                            this._nodes.actionBtnIcon.classList.remove('codicon-debug-stop');
                            this._nodes.actionBtnIcon.classList.add('codicon-redo');
                            this._nodes.progressRing.classList.add('hidden');
                            this._nodes.statusIcon.classList.remove(...this._nodes.statusIcon.classList);
                            break;
                    }
                }

                _nodesConstructor() {
                    this._nodes = {};

                    // data grid row.
                    this._nodes.row = document.createElement('vscode-data-grid-row');

                    // action button cell.
                    const actionBtnCell = document.createElement('vscode-data-grid-cell');
                    actionBtnCell.setAttribute('grid-column', '1');
                    this._nodes.actionBtn = document.createElement('vscode-button');
                    this._nodes.actionBtn.setAttribute('appearance', 'icon');
                    this._nodes.actionBtn.addEventListener('click', () => this._actionCallback());
                    this._nodes.actionBtnIcon = document.createElement('span');
                    this._nodes.actionBtnIcon.classList.add('codicon');
                    this._nodes.actionBtn.appendChild(this._nodes.actionBtnIcon);
                    actionBtnCell.appendChild(this._nodes.actionBtn);

                    // progress ring and status cell.
                    this._nodes.ringCell = document.createElement('vscode-data-grid-cell');
                    this._nodes.ringCell.setAttribute('grid-column', '2');
                    this._nodes.progressRing = document.createElement('vscode-progress-ring');
                    this._nodes.progressRing.classList.add('hidden');
                    this._nodes.statusIcon = document.createElement('span');
                    this._nodes.statusIcon.classList.add('hidden');
                    this._nodes.ringCell.append(
                        this._nodes.progressRing,
                        this._nodes.statusIcon,
                    );

                    // requirement name cell.
                    const reqNameCell = document.createElement('vscode-data-grid-cell');
                    reqNameCell.setAttribute('grid-column', '3');
                    reqNameCell.innerText = this.name;

                    // requirement response cell.
                    const reqResponseCell = document.createElement('vscode-data-grid-cell');
                    reqResponseCell.setAttribute('grid-column', '4');
                    this._nodes.reqResponse = document.createElement('div');
                    reqResponseCell.appendChild(this._nodes.reqResponse);

                    this._nodes.row.append(
                        actionBtnCell,
                        this._nodes.ringCell,
                        reqNameCell,
                        reqResponseCell,
                    );
                }
            }
        </script>

        <script>
            const reqGrid = document.getElementById('req-cell-grid');
            const tasks = [${tasks}].map((t, index) => {
                const task = new RequirementTask(t, index);
                task.render(reqGrid);
                task.execute();
                return task;
            });
        </script>
    </body>
</html>`;
    }
}
