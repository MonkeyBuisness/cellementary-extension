import * as vscode from 'vscode';
import * as fs from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { CommandHandler } from "./command-handler";
import { NotebookManager } from '../core/manager';
import { ReservedCellMetaKey, VScript, VScriptKind } from '../core/types';

export class EditCellScriptCmd implements CommandHandler {

    constructor(private notebookMananger: NotebookManager) {}

    public async execute(_: vscode.ExtensionContext, ...args: any[]): Promise<void> {
        if (args.length === 0) {
            return;
        }

        const notebookCell = args[0];
        const metadata = notebookCell.metadata as { [key: string]: any };
        const docPath = notebookCell.document.uri.path;
        const docContent = fs.readFileSync(docPath);
        const notebookType: string = notebookCell.notebook.notebookType;
        const notebookSerializer = this.notebookMananger.getNotebookSerializer(notebookType);
        if (!notebookSerializer) {
            vscode.window.showErrorMessage(`Could not find serializer for the ${notebookType} notebook`);
            return;
        }
        const noteData = await notebookSerializer.deserializeNotebook(docContent);
        const editingCell = noteData.cells[notebookCell.index];
        const scriptMeta = (metadata || {})[ReservedCellMetaKey.script] as VScript;

        // save script content to the tmp file.
        const uuid = uuidv4();
        let tmpFile = path.join(tmpdir(), uuid);
        try {
            fs.mkdirSync(tmpFile, {
                recursive: true,
            });
            tmpFile = path.join(tmpFile, 'cell_script.js');
            fs.writeFileSync(tmpFile, scriptMeta.code || defaultScriptCode);
        } catch (e: any) {
            vscode.window.showErrorMessage(`Could not open tmp file to edit cell script:\n${e}`);
            return;
        }
        const scriptDoc = await vscode.workspace.openTextDocument(tmpFile);
        vscode.workspace.onDidCloseTextDocument((d :vscode.TextDocument) => {
            if (d.uri.fsPath === scriptDoc.uri.fsPath) {
                fs.unlinkSync(tmpFile);
            }
        });
        vscode.workspace.onDidSaveTextDocument(async (d :vscode.TextDocument) => {
            if (d.uri.fsPath === scriptDoc.uri.fsPath) {
                if (editingCell.metadata === undefined) {
                    editingCell.metadata = {};
                }
                editingCell.metadata[ReservedCellMetaKey.script] = {
                    kind: VScriptKind.js,
                    code: d.getText(),
                } as VScript;
                const notebookData = await notebookSerializer.serializeNotebook(noteData);
                fs.writeFileSync(docPath, notebookData);
            }
        });
        await vscode.window.showTextDocument(scriptDoc);
    }
}

const defaultScriptCode = `// Cell execution script.

/**
 * This function will be automatically called before cell execution.
 * Can be undefined if you don't want to catch the "before" event.
 * 
 * @param {string} content cell's content.
 * @param {ScriptContextOutput} out context output.
 */
before = (content, out) => {
    // write your code here...
};

/**
 * This function will be automatically called after cell execution.
 * Can be undefined if you don't want to catch the "after" event.
 * 
 * @param {string} content cell's content.
 * @param {ScriptContextOutput} out context output.
 * @param {boolean | undefined} success status of cell execution.
 */
after = (content, out, success) => {
    // write your code here...
};

// ScriptContextOutput represents script context output class implementation.
// INFO: can be removed from here.
class ScriptContextOutput {

    /**
     * Appends text output.
     *
     * @param {string[]} values array of strings to append.
     * @param {(string|undefined)} mime custom mime type. Use mimes() func to get list of all known extension mime types.
     * @param {(Object|undefined)} meta metadata of the output. 
     */
    text(values, mime, meta) {}

    /**
     * Appends json output.
     *
     * @param {any[]} values array of objects to append.
     * @param {(string|undefined)} mime custom mime type. Use mimes() func to get list of all known extension mime types.
     * @param {(Object|undefined)} meta metadata of the output. 
     */
    json(values, mime, meta) {}

    /**
     * Appends error output.
     *
     * @param {Error[]} values array of errors to append.
     * @param {(Object|undefined)} meta metadata of the output. 
     */
    error(errs, metadata) {}

    /**
     * Clear output. 
     */
    clear() {}
}

`;
