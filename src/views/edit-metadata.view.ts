import * as vscode from 'vscode';
import { getUri } from './utils';

export abstract class EditMetadataView {
    private _disposables: vscode.Disposable[] = [];
    protected _panel: vscode.WebviewPanel;

    constructor(extensionUri: vscode.Uri, title: string, meta: { [key: string]: any }) {
        this._panel = vscode.window.createWebviewPanel(
            'webview', title, vscode.ViewColumn.One, {
            enableScripts: true,
        });

        this._panel.webview.html = this._getWebviewContent(
            this._panel.webview, extensionUri, meta);
        this._disposables.push(this._panel);
    }

    public dispose() : void {
        this._disposables.forEach(d => d.dispose());
    }

    public onDidReceiveMessage(listener: (e: any) => void) : void {
        this._disposables.push(this._panel.webview.onDidReceiveMessage(listener));
    }

    private _getWebviewContent(
        webview: vscode.Webview,
        extensionUri: vscode.Uri,
        meta: { [key: string]: any }) {
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

        const rowsData: string[] = [];
        for (const key in meta) {
            rowsData.push(`{key: '${key}', value: '${meta[key]}'}`);
        }

        return `
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <script type="module" src="${toolkitUri}"></script>
        <link rel="stylesheet" href="${codiconsUri}" />

        <title>${this._panel.title}</title>
    </head>
    <body>
        <vscode-data-grid
            id="meta-grid"
            generate-header="none"
            grid-template-columns="2fr 3fr auto">

            <vscode-data-grid-row>
                <vscode-data-grid-cell
                    cell-type="columnheader"
                    grid-column="1">

                    Key
                </vscode-data-grid-cell>
                <vscode-data-grid-cell
                    cell-type="columnheader"
                    grid-column="2">
                    
                    Value
                </vscode-data-grid-cell>

                <vscode-data-grid-cell
                    cell-type="columnheader"
                    grid-column="3">
                </vscode-data-grid-cell>
            </vscode-data-grid-row>
        </vscode-data-grid>
        <vscode-button
            appearance="icon"
            title="Add new metadata row"
            onclick="addMetadataRow()">

            <span class="codicon codicon-add"></span>
        </vscode-button>

        <br />
        <br />

        <vscode-button
            appearance="primary"
            onclick="sendSaveMsg()">
            
            Save
        </vscode-button>
        <vscode-button
            appearance="secondary"
            onclick="sendCancelMsg()">
            
            Cancel
        </vscode-button>

        <script>
            const makeCellEditable = (target, value, maxLength) => {
                target.innerText = '';
                const input = document.createElement('vscode-text-field');
                input.setAttribute('autofocus', true);
                input.setAttribute('value', value);
                input.setAttribute('maxlength', maxLength);
                input.addEventListener('blur', () => {
                    makeCellStatic(target, input.value);
                });
                input.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === 'Escape') {
                        makeCellStatic(target, input.value);
                    }
                    event.stopPropagation();
                });
                target.appendChild(input);
            };

            const makeCellStatic = (target, value) => {
                while (target.lastElementChild) {
                    target.removeChild(target.lastElementChild);
                }
                target.innerText = value;
            };

            const removeRow = (row) => {
                row.remove();
            };

            const addMetadataRow = (key = '', value = '') => {
                const row = document.createElement('vscode-data-grid-row');

                const keyCell = document.createElement('vscode-data-grid-cell');
                keyCell.setAttribute('grid-column', '1');
                keyCell.innerText = key;
                keyCell.addEventListener('dblclick', (event) => {
                    makeCellEditable(event.target, keyCell.innerText, 32);
                });

                const valueCell = document.createElement('vscode-data-grid-cell');
                valueCell.setAttribute('grid-column', '2');
                valueCell.innerText = value;
                valueCell.addEventListener('dblclick', (event) => {
                    makeCellEditable(event.target, valueCell.innerText, 256);
                });

                const deleteBtnCell = document.createElement('vscode-data-grid-cell');
                deleteBtnCell.setAttribute('grid-column', '3');
                deleteBtnCell.addEventListener('click', () => {
                    removeRow(row);
                });
                const deleteBtn = document.createElement('vscode-button');
                deleteBtn.setAttribute('appearance', 'icon');
                const icon = document.createElement('span');
                icon.classList.add('codicon', 'codicon-remove');
                icon.title = 'Remove metadata row';
                deleteBtn.appendChild(icon);
                deleteBtnCell.appendChild(deleteBtn);

                row.append(keyCell, valueCell, deleteBtnCell);

                metaGrid.appendChild(row);
            };

            const metaGrid = document.getElementById('meta-grid');
            const rowsData = [${rowsData.join(',')}];
            rowsData.forEach(data => {
                addMetadataRow(data.key, data.value);
            });
        </script>

        <script>
            const vscode = acquireVsCodeApi();

            function sendCancelMsg() {
                vscode.postMessage({
                    type: '${EditMetadataCallbackType.cancel}'
                });
            }

            function sendSaveMsg() {
                const metaGridRows = [...metaGrid.children].slice(1);
                const metadata = {};
                metaGridRows.forEach(r => {
                    const metaGridCells = [...r.children];
                    const keyCell = metaGridCells.find(c => c.getAttribute('grid-column') === '1');
                    if (!keyCell) {
                        return;
                    }
                    const valueCell = metaGridCells.find(c => c.getAttribute('grid-column') === '2');
    
                    metadata[keyCell.innerText] = valueCell.innerText;
                });

                vscode.postMessage({
                    type:    '${EditMetadataCallbackType.save}',
                    metadata: metadata
                });
            }
        </script>
    </body>
</html>`;
    }
}

export enum EditMetadataCallbackType {
    save   = 'save',
    cancel = 'cancel'
}
