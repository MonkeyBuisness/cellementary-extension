import * as vscode from 'vscode';
import { ControllerInfo } from '../core/controller';
import { getUri } from './utils';

export class KernelInfoView {
    private _webView: vscode.Webview;
    private _disposables: vscode.Disposable[] = [];

    constructor(extensionUri: vscode.Uri, controllerInfo: ControllerInfo) {
        const panel = vscode.window.createWebviewPanel(
            'webview', controllerInfo.name, vscode.ViewColumn.One, {
            enableScripts: true,
        });
        this._webView = panel.webview;

        panel.webview.html = this._getWebviewContent(panel.webview, extensionUri, controllerInfo);
        this._disposables.push(panel);
    }

    public dispose() : void {
        this._disposables.forEach(d => d.dispose());
    }

    private _getWebviewContent(
        webview: vscode.Webview,
        extensionUri: vscode.Uri,
        controllerInfo: ControllerInfo) {
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

        /*const rowsData: string[] = [];
        for (const key in meta) {
            rowsData.push(`{key: '${key}', value: '${meta[key]}'}`);
        }*/

        return `
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <script type="module" src="${toolkitUri}"></script>
        <link rel="stylesheet" href="${codiconsUri}" />

        <title>${controllerInfo.name}</title>
    </head>
    <body>
    </body>
</html>`;
    }
}
