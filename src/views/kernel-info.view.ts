import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { MetadataField, Contributor, ControllerInfo } from '../core/controller';
import { getUri } from './utils';

export class KernelInfoView {
    private _disposables: vscode.Disposable[] = [];

    constructor(extensionUri: vscode.Uri, controllerInfo: ControllerInfo) {
        const panel = vscode.window.createWebviewPanel(
            'webview', controllerInfo.name, vscode.ViewColumn.One, {
            enableScripts: true,
        });

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
        const markedUri = getUri(webview, extensionUri, [
            "resources",
            "lib",
            "marked.min.js"
        ]);
        const iconFile = controllerInfo.iconName || 'default.png';
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
        const cellMetadata = controllerInfo.cellMetadata?.map(m => 
            `{
                key:         "${m.key}",
                default:     ${m.default === undefined ? undefined : '"' + m.default + '"'},
                description: ${m.description === undefined ? undefined : '"' + m.description + '"'},
                enum:        ${m.enum === undefined ? undefined : "[" + m.enum.map(e => '"' + e + '"').join(',') + "]"}
            }`);
        const notebookMetadata = controllerInfo.notebookMetadata?.map(m => 
            `{
                key:         "${m.key}",
                default:     ${m.default === undefined ? undefined : '"' + m.default + '"'},
                description: ${m.description === undefined ? undefined : '"' + m.description + '"'},
                enum:        ${m.enum === undefined ? undefined : "[" + m.enum.map(e => '"' + e + '"').join(',') + "]"}
            }`);
        
        let activeTabId: string = 'tab-description';
        if (gettingStarted !== '') {
            activeTabId = 'tab-getting-started';
        } else if (contributors !== undefined && contributors.length) {
            activeTabId = 'tab-contributors';
        }

        return `
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <script type="module" src="${toolkitUri}"></script>
        <script src="${markedUri}"></script>
        <link rel="stylesheet" href="${codiconsUri}" />

        <title>${controllerInfo.name}</title>

        <style>
            body {
                padding: 20px;
            }

            .header {
                display: flex;
                margin-bottom: 6px;
            }

            .header > img {
                width: 96px;
                height: 96px;
                border-radius: 50%;
                object-fit: cover;
                margin-right: 20px;
            }

            .header > .controller-info {
                display: flex;
                flex-direction: column;
                justify-content: center;
            }

            .header > .controller-info > .name {
                font-size: 24px;
                margin-bottom: 6px;
            }

            .header > .controller-info > .name > span.id {
                color: var(--vscode-textLink-foreground);
            }

            .header > .controller-info .exec-order-supports {
                font-style: italic;
            }

            .header > .controller-info > .supported-languages {
                margin-bottom: 6px;
            }

            vscode-panels {
                margin-top: 16px;
            }

            #supported-languages {
                display: inline-block;
            }

            #contributors > .contributor {
                display: flex;
                margin: 12px 0;
                text-align: left;
                align-items: center;
                font-size: 16px;
            }

            #contributors > .contributor > .name {
                display: block;
                width: 200px;
                text-overflow: ellipsis;
                overflow: hidden;
                margin-right: 6px;
                font-size: 16px;
            }

            #description {
                font-size: 18px;
                line-height: 38px;
            }

            .metadata-panel .metadata-label {
                font-size: 18px;
                font-weight: bolder;
                margin: 0 0 12px 12px;
            }

            vscode-data-grid {
                margin-bottom: 20px;
            }

            .codicon {
                display: inline-block !important;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <img src="${iconUri}" />
            <div class="controller-info">
                <div class="name">
                    <span class="id">#${controllerInfo.id}</span>
                    ${controllerInfo.name}
                </div>
                <div class="supported-languages">
                    Supported languages:
                    <div id="supported-languages"></div>
                </div>
                <div>
                    Supports execution order:
                    <span class="exec-order-supports">${
                        controllerInfo.supportsExecutionOrder === undefined ? 'Unknown' : 
                            controllerInfo.supportsExecutionOrder ? 'Yes' : 'No'
                    }</span>
                </div>
            </div>
        </div>

        <vscode-panels activeid="${activeTabId}">
            <vscode-panel-tab id="tab-getting-started">Getting Started</vscode-panel-tab>
            <vscode-panel-tab id="tab-description">Description</vscode-panel-tab>
            <vscode-panel-tab id="tab-contributors">Contributors</vscode-panel-tab>
            <vscode-panel-tab id="tab-metadata">Metadata</vscode-panel-tab>

            <vscode-panel-view>
                <div id="getting-started"></div>
            </vscode-panel-view>

            <vscode-panel-view>
                <div id="description">
                    <div>
                        <span class="codicon codicon-info"></span>
                        ${controllerInfo.description || ''}
                    </div>
                    
                    <div>
                        <span class="codicon codicon-info"></span>
                        ${controllerInfo.detail || ''}
                    </div>
                </div>
            </vscode-panel-view>

            <vscode-panel-view>
                <div id="contributors"></div>
            </vscode-panel-view>
            
            <vscode-panel-view class="metadata-panel">
                <div>
                    <div class="metadata-label">Cell Metadata</div>
                    <vscode-divider role="separator"></vscode-divider>

                    <vscode-data-grid
                        id="meta-cell-grid"
                        generate-header="none"
                        grid-template-columns="1fr 2fr 2fr 5fr">

                        <vscode-data-grid-row>
                            <vscode-data-grid-cell
                                cell-type="columnheader"
                                grid-column="1">

                                Key
                            </vscode-data-grid-cell>
                            <vscode-data-grid-cell
                                cell-type="columnheader"
                                grid-column="2">
                                
                                Default value
                            </vscode-data-grid-cell>

                            <vscode-data-grid-cell
                                cell-type="columnheader"
                                grid-column="3">

                                Available values
                            </vscode-data-grid-cell>

                            <vscode-data-grid-cell
                                cell-type="columnheader"
                                grid-column="4">

                                Description
                            </vscode-data-grid-cell>
                        </vscode-data-grid-row>
                    </vscode-data-grid>

                    <div class="metadata-label">Notebook Metadata</div>
                    <vscode-divider role="separator"></vscode-divider>

                    <vscode-data-grid
                        id="meta-note-grid"
                        generate-header="none"
                        grid-template-columns="1fr 2fr 2fr 5fr">

                        <vscode-data-grid-row>
                            <vscode-data-grid-cell
                                cell-type="columnheader"
                                grid-column="1">

                                Key
                            </vscode-data-grid-cell>
                            <vscode-data-grid-cell
                                cell-type="columnheader"
                                grid-column="2">
                                
                                Default value
                            </vscode-data-grid-cell>

                            <vscode-data-grid-cell
                                cell-type="columnheader"
                                grid-column="3">

                                Available values
                            </vscode-data-grid-cell>

                            <vscode-data-grid-cell
                                cell-type="columnheader"
                                grid-column="4">

                                Description
                            </vscode-data-grid-cell>
                        </vscode-data-grid-row>
                    </vscode-data-grid>
                </div>
            </vscode-panel-view>
        </vscode-panels>

        <script>
            // supported languages.
            const supportedLanguagesBlock = document.getElementById('supported-languages');
            const supportedLanguages = [${supportedLanguages}];
            supportedLanguages.forEach(l => {
                const badge = document.createElement('vscode-badge');
                badge.innerText = l;
                supportedLanguagesBlock.appendChild(badge);
            });

            // getting started.
            document.getElementById('getting-started').innerHTML = marked.parse("${gettingStarted}");

            // contributors.
            const contributorsBlock = document.getElementById('contributors');
            const contributors = [${(contributors || []).join(',')}];
            contributors.forEach(c => {
                const contributorBlock = document.createElement('div');
                contributorBlock.classList.add('contributor');

                let nameBlock;
                if (!c.url) {
                    nameBlock = document.createElement('span');
                } else {
                    nameBlock = document.createElement('vscode-link');
                    nameBlock.href = c.url;
                    nameBlock.target = '__blank';
                }
                nameBlock.innerHTML = c.name;
                nameBlock.classList.add('name');
                contributorBlock.appendChild(nameBlock);

                if (c.email) {
                    const emailBlock = document.createElement('span');
                    emailBlock.innerText = c.email;
                    contributorBlock.appendChild(emailBlock);
                }

                contributorsBlock.appendChild(contributorBlock);
            });

            // cells metadata.
            const cellMetadataGridBlock = document.getElementById('meta-cell-grid');
            const cellMetadata = [${(cellMetadata || []).join(',')}];
            cellMetadata.forEach(m => {
                const row = document.createElement('vscode-data-grid-row');

                const keyCell = document.createElement('vscode-data-grid-cell');
                keyCell.setAttribute('grid-column', '1');
                keyCell.innerText = m.key;

                const defaultValueCell = document.createElement('vscode-data-grid-cell');
                defaultValueCell.setAttribute('grid-column', '2');
                defaultValueCell.innerText = m.default || '-';

                const availableValuesCell = document.createElement('vscode-data-grid-cell');
                availableValuesCell.setAttribute('grid-column', '3');
                availableValuesCell.innerText = m.enum ? m.enum.join(', ') : '-';

                const descriptionCell = document.createElement('vscode-data-grid-cell');
                descriptionCell.setAttribute('grid-column', '4');
                descriptionCell.innerText = m.description || '-';

                row.append(keyCell, defaultValueCell, availableValuesCell, descriptionCell);
                cellMetadataGridBlock.appendChild(row);
            });

            // notebook metadata.
            const noteMetadataGridBlock = document.getElementById('meta-note-grid');
            const noteMetadata = [${(notebookMetadata || []).join(',')}];
            noteMetadata.forEach(m => {
                const row = document.createElement('vscode-data-grid-row');

                const keyCell = document.createElement('vscode-data-grid-cell');
                keyCell.setAttribute('grid-column', '1');
                keyCell.innerText = m.key;

                const defaultValueCell = document.createElement('vscode-data-grid-cell');
                defaultValueCell.setAttribute('grid-column', '2');
                defaultValueCell.innerText = m.default || '-';

                const availableValuesCell = document.createElement('vscode-data-grid-cell');
                availableValuesCell.setAttribute('grid-column', '3');
                availableValuesCell.innerText = m.enum ? m.enum.join(', ') : '-';

                const descriptionCell = document.createElement('vscode-data-grid-cell');
                descriptionCell.setAttribute('grid-column', '4');
                descriptionCell.innerText = m.description || '-';

                row.append(keyCell, defaultValueCell, availableValuesCell, descriptionCell);
                noteMetadataGridBlock.appendChild(row);
            });
        </script>
    </body>
</html>`;
    }
}
