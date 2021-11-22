import * as vscode from 'vscode';
import { HTMLElement, Node, NodeType, parse } from 'node-html-parser';
import { Script, createContext } from 'vm';

import {
    CellMetadataField,
    Contributor,
    NotebookCellExecution,
    NotebookController,
    OnControllerInfo
} from "../core/controller";
import { KnownLanguageIds, MimeTypes } from '../core/types';
import { DHTMLRendererMeta } from '../renderers/dhtml-renderer/types';

interface ReplaceImportsResult {
    errors?: string[];
    newContent?: string;
}

// HTMLController represents class implementation for running DHTML locally.
export class HTMLController extends NotebookController implements OnControllerInfo {
    private static readonly _supportedLanguages: string[] = ['html', 'css', 'javascript'];
    private static readonly _detail: string = 'Display html page with dynamic content';
    private static readonly _description: string = 'Supports CSS and JavaScript';
    private static readonly _controllerId: string = 'dhtml';
    private static readonly _notebookType: string = 'htmlbook';
    private static readonly _label: string = 'DHTML';
    private static readonly _linkImport: string = 'link://';
    private static readonly _scriptImport: string = 'script://';
    private static readonly _cellIdMeta: string = 'id';

    constructor() {
        super(
            HTMLController._controllerId,
            HTMLController._notebookType,
            HTMLController._label
        );
    }

    public supportedLanguages(): string[] | undefined {
        return HTMLController._supportedLanguages;
    }

    public supportsExecutionOrder(): boolean | undefined {
        return false;
    }

    public detail(): string | undefined {
        return HTMLController._detail;
    }

    public description(): string | undefined {
        return HTMLController._description;
    }

    public async execute(ex: NotebookCellExecution): Promise<boolean | undefined> {
        let content = ex.cell.content;
        
        switch (ex.cell.languageId) {
            case KnownLanguageIds.css:
                return;
            case KnownLanguageIds.javascript:
                const contextObj: any = {
                    console: {
                        log: (...args: any[]) => {
                            ex.appendTextOutput(args);
                        }
                    }
                };
                try {
                    const vmContext = createContext(contextObj);
                    const script = new Script(ex.cell.content);
                    script.runInContext(vmContext);
                } catch(e: any) {
                    ex.appendErrorOutput([e as Error]);
                    return false;
                }
                return true;
        }

        // replace imports.
        const results = HTMLController._replaceImports(content, ex.notebook);
        if (results.errors && results.errors.length) {
            vscode.window.showErrorMessage(`Could not replace imports:\n${results.errors.join('\n')}`);
            return false;
        }
        content = results.newContent || '';
        const frameWidthMeta: string = (ex.cell.metadata || {})[DHTMLRendererMeta.frameWidth];
        const frameHeightMeta: string = (ex.cell.metadata || {})[DHTMLRendererMeta.frameHeight];
        const meta: { [key: string]: any } | undefined = frameWidthMeta || frameHeightMeta ? {} : undefined;
        if (frameHeightMeta && meta) {
            meta[DHTMLRendererMeta.frameHeight] = frameHeightMeta;
        }
        if (frameWidthMeta && meta) {
            meta[DHTMLRendererMeta.frameWidth] = frameWidthMeta;
        }

        ex.appendTextOutput([content], MimeTypes.html, meta);

        return true;
    }

    public contributors(): Contributor[] | undefined {
        return [
            {
                name:  'Artsem Hutarau',
                email: 'gutorov.artem@yandex.ru',
                url:   'https://github.com/MonkeyBuisness'
            }
        ];
    }

    public icon(): string | undefined {
        return 'dhtml.png';
    }

    public gettingStartedGuide(): string | undefined {
        return 'dhtml.md';
    }

    public metadataFields(): CellMetadataField[] | undefined {
        return [
            {
                key:         HTMLController._cellIdMeta,
                description: 'id of the cell'
            },
            {
                key:         DHTMLRendererMeta.frameWidth,
                description: 'width of the output frame',
                default:     '100%'
            },
            {
                key:         DHTMLRendererMeta.frameHeight,
                description: 'height of the output frame',
                default:     'auto'
            }
        ];
    }

    private static _replaceImports(content: string, notebook: vscode.NotebookDocument) : ReplaceImportsResult {
        const root = parse(content, {
            comment: true,
        });
        const results: ReplaceImportsResult = {
            errors:     [],
            newContent: content
        };

        const commentNodes = HTMLController._extractCommentNodes(root.childNodes);
        if (!commentNodes || !commentNodes.length) {
            return results;
        }

        //root.replaceWith()

        const cells = notebook.getCells();
        commentNodes.forEach(comment => {
            let nodeTag: string = '';
            let cellId: string | undefined;
            let expLangId: string = '';
            const commentContent = comment.textContent.trim();
            
            // check for style import.
            if (commentContent.startsWith(HTMLController._linkImport)) {
                cellId = commentContent.slice(HTMLController._linkImport.length);
                nodeTag = 'style';
                expLangId = KnownLanguageIds.css;
            }

            // check for script import.
            if (commentContent.startsWith(HTMLController._scriptImport)) {
                cellId = commentContent.slice(HTMLController._scriptImport.length);
                nodeTag = 'script';
                expLangId = KnownLanguageIds.javascript;
            }

            if (!cellId) {
                return;
            }

            // find cell by Id.
            const cell = cells.find(c => c.metadata[HTMLController._cellIdMeta] === cellId);
            if (!cell) {
                results.errors?.push(`Could not find cell by Id: ${cellId}`);
                return;
            }

            // compare cell language Id with expected Id.
            if (cell.document.languageId !== expLangId) {
                results.errors?.push(
                    `Cell ${cellId} has '${cell.document.languageId}' language Id, but expected: '${expLangId}'`);
                return;
            }

            const exNode = new HTMLElement(nodeTag, {}, '', null);
            exNode.innerHTML = cell.document.getText();
            comment.parentNode.exchangeChild(comment, exNode);
        });
        results.newContent = root.toString();

        return results;
    }

    private static _extractCommentNodes(nodes?: Node[]) : Node[] | undefined {
        if (!nodes || !nodes.length) {
            return;
        }

        const commentNodes = nodes.filter(n => n.nodeType === NodeType.COMMENT_NODE);

        nodes.forEach(n => {
            const comments = HTMLController._extractCommentNodes(n.childNodes) || [];
            commentNodes.push(...comments);
        });

        return commentNodes.filter(n => {
            const textContent = n.textContent.trim();
            return textContent.startsWith(HTMLController._linkImport) 
                || textContent.startsWith(HTMLController._scriptImport);
        });
    } 
}
