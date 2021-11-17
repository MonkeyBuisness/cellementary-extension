import * as vscode from 'vscode';
import { getUri } from './utils';

export class EditCellMetadataView {
    private _panel: vscode.WebviewPanel;

    constructor(extensionUri: vscode.Uri, meta: { [key: string]: any }) {
        this._panel = vscode.window.createWebviewPanel('webview', 'Edit cell metadata', vscode.ViewColumn.One, {
            enableScripts: true,
        });

        this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri, meta);
    }

    public dispose() : void {
        this._panel.dispose();
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
        <title>Edit cell metadata</title>
    </head>
    <body>
        <vscode-data-grid
            id="meta-grid"
            generate-header="none"
            grid-template-columns="1fr 3fr">

            <vscode-data-grid-row row-type="header">
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
            </vscode-data-grid-row>
        </vscode-data-grid>

        <br />
        <br />

        <vscode-button appearance="primary">Save</vscode-button>
        <vscode-button appearance="secondary">Cancel</vscode-button>
    </body>
    
    <script>
      const makeCellEditable = (target, value) => {
          target.innerText = '';
          const input = document.createElement('vscode-text-field');
          input.setAttribute('autofocus', true);
          input.setAttribute('value', value);
          input.setAttribute('maxlength', 128);
          input.addEventListener('blur', () => {
              makeCellStatic(target, input.value);
          });
          target.appendChild(input);
      };

      const makeCellStatic = (target, value) => {
          while (target.lastElementChild) {
              target.removeChild(target.lastElementChild);
          }
          target.innerText = value;
      };

      const metaGrid = document.getElementById('meta-grid');
      const rowsData = [${rowsData.join(',')}];
      rowsData.forEach(data => {
          console.log(data);
          const row = document.createElement('vscode-data-grid-row');

          const keyCell = document.createElement('vscode-data-grid-cell');
          keyCell.setAttribute('grid-column', '1');
          keyCell.innerText = data.key;
          keyCell.addEventListener('dblclick', (event) => {
              makeCellEditable(event.target, keyCell.innerText);
          });

          const valueCell = document.createElement('vscode-data-grid-cell');
          valueCell.setAttribute('grid-column', '2');
          valueCell.innerText = data.value;

          row.append(keyCell, valueCell);

          metaGrid.appendChild(row);
      });
    </script>
</html>`;
    }
}
