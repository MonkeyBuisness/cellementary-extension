import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { ControllerInfo } from '../core/controller';
import { getUri } from './utils';
import { escapeString } from '../utils/string.util';
import { KernelCompatibilityChecker } from '../core/types';
import { vsCodeOption } from '@vscode/webview-ui-toolkit';

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
            }
        }));
        /*const iconFile = controllerInfo.iconName || 'default.png';
        const iconUri = getUri(webview, extensionUri, [
            "resources",
            "kernels",
            "icons",
            iconFile,
        ]);
        const supportedLanguages = (controllerInfo.supportedLanguages || [])
            .map(l => `'${l}'`)
            .join(',');
        let gettingStarted: string = '';
        if (controllerInfo.gettingStartedPath !== undefined) {
            try {
                const content = fs.readFileSync(
                    path.join(__filename, '..', '..', 'docs', 'kernels', controllerInfo.gettingStartedPath));
                gettingStarted = content.toString().replace(/[\r\n]+/g, '\\n\\n');
            } catch (e: any) {
                vscode.window.showErrorMessage(`Could not read getting-started data:\n${e}`);
            }
        }
        const contributors = controllerInfo.contributors?.map(c => 
            `{
                name:  "${c.name}",
                url:   ${c.url === undefined ? undefined : '"' + c.url + '"'},
                email: ${c.email === undefined ? undefined : '"' + c.email + '"'}
            }`);
        controllerInfo.cellMetadata?.forEach(m => m.description = escapeString(m.description));
        const cellMetadata = controllerInfo.cellMetadata?.map(m =>
            `{
                key:         "${m.key}",
                default:     ${m.default === undefined ? undefined : '"' + m.default + '"'},
                description: ${m.description === undefined ? undefined : '"' + m.description + '"'},
                enum:        ${m.enum === undefined ? undefined : "[" + m.enum.map(e => '"' + e + '"').join(',') + "]"},
                required:    ${m.required === undefined ? undefined : m.required}
            }`);
        controllerInfo.notebookMetadata?.forEach(m => m.description = escapeString(m.description));
        const notebookMetadata = controllerInfo.notebookMetadata?.map(m => 
            `{
                key:         "${m.key}",
                default:     ${m.default === undefined ? undefined : '"' + m.default + '"'},
                description: ${m.description === undefined ? undefined : '"' + m.description + '"'},
                enum:        ${m.enum === undefined ? undefined : "[" + m.enum.map(e => '"' + e + '"').join(',') + "]"},
                required:    ${m.required === undefined ? undefined : m.required}
            }`);
        
        let activeTabId: string = 'tab-description';
        if (gettingStarted !== '') {
            activeTabId = 'tab-getting-started';
        } else if (contributors !== undefined && contributors.length) {
            activeTabId = 'tab-contributors';
        }*/

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
                display: none;
            }
        </style>
    </head>
    <body>
        <section>
            <div class="section-label">Requirements</div>
            
            <vscode-data-grid
                id="req-cell-grid"
                generate-header="none"
                grid-template-columns="0.1fr 0.4fr 2fr 5fr">
            </vscode-data-grid>
        </section>

        <script>
            const vscode = acquireVsCodeApi();

            window.addEventListener('message', event => {
                const msg = event.data;
                const buttons = [...document.querySelectorAll('vscode-button.action-btn')];
                const btn = buttons.find(b => b.getAttribute('task-index') == msg.index);
                
                if (btn) {
                    const responseEvent = new CustomEvent('response', { detail: msg });
                    btn.dispatchEvent(responseEvent);
                }
            });

            function sendRunTaskMsg(taskIndex) {
                vscode.postMessage({
                    type:  'run',
                    index: taskIndex,
                });
            }

            function runAllTasks() {
                const buttons = document.querySelectorAll('vscode-button.action-btn');
                buttons.forEach(b => b.click());
            }
        </script>

        <script>
            const reqGrid = document.getElementById('req-cell-grid');
            const tasks = [${tasks}];
            tasks.forEach((t, index) => {
                const row = document.createElement('vscode-data-grid-row');

                // action button cell.
                const actionBtnCell = document.createElement('vscode-data-grid-cell');
                actionBtnCell.setAttribute('grid-column', '1');
                const actionBtn = document.createElement('vscode-button');
                actionBtn.classList.add('hidden', 'action-btn');
                actionBtn.setAttribute('appearance', 'icon');
                actionBtn.setAttribute('state', 'run');
                actionBtn.setAttribute('task-index', index);
                const actionBtnIcon = document.createElement('span');
                actionBtnIcon.classList.add('codicon');
                actionBtn.addEventListener('click', () => {
                    actionBtn.classList.remove('hidden');
                    const state = actionBtn.getAttribute('state');
                    switch (state) {
                        case 'run':
                            actionBtn.setAttribute('state', 'stop');
                            actionBtn.title = 'Stop checking';
                            actionBtnIcon.classList.remove('codicon-redo');
                            actionBtnIcon.classList.add('codicon-debug-stop');
                            progressRing.classList.remove('hidden');
                            reqResponse.innerHTML = '';
                            sendRunTaskMsg(index);
                            break;
                        case 'stop':
                            actionBtn.setAttribute('state', 'run');
                            actionBtn.title = 'Repeat check';
                            actionBtnIcon.classList.remove('codicon-debug-stop');
                            actionBtnIcon.classList.add('codicon-redo');
                            progressRing.classList.add('hidden');
                            break;
                    }
                });
                actionBtn.addEventListener('response', (e) => {
                    const result = e.detail.result;
                    if (result) {
                        actionBtn.setAttribute('state', 'stop');
                        reqResponse.innerHTML =  marked.parse(result.msgMd || '');
                        reqResponse.classList.remove('hidden');
                        progressRing.classList.add('hidden');
                    }
                }, false);
                actionBtn.appendChild(actionBtnIcon);
                actionBtnCell.appendChild(actionBtn);
                
                // progress ring cell.
                const ringCell = document.createElement('vscode-data-grid-cell');
                ringCell.setAttribute('grid-column', '2');
                const progressRing = document.createElement('vscode-progress-ring');
                progressRing.classList.add('hidden');
                ringCell.appendChild(progressRing);

                // requirement name cell.
                const reqNameCell = document.createElement('vscode-data-grid-cell');
                reqNameCell.setAttribute('grid-column', '3');
                reqNameCell.innerText = t;

                // requirement response cell.
                const reqResponseCell = document.createElement('vscode-data-grid-cell');
                reqResponseCell.setAttribute('grid-column', '4');
                const reqResponse = document.createElement('div');
                reqResponse.classList.add('hidden');
                reqResponseCell.appendChild(reqResponse);

                row.append(actionBtnCell, ringCell, reqNameCell, reqResponseCell);
                reqGrid.appendChild(row);
            });

            runAllTasks();
        </script>
    </body>
</html>`;
    }
}
