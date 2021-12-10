import * as vscode from 'vscode';
import * as fs from 'fs';

import { EditCellMetadataView } from '../views/cell-metadata.view';
import { CommandHandler } from "./command-handler";
import { EditMetadataCallbackType } from '../views/edit-metadata.view';
import { NotebookManager } from '../core/manager';

export class EditCellMetadataCmd implements CommandHandler {

    constructor(private notebookMananger: NotebookManager) {}

    public async execute(context: vscode.ExtensionContext, ...args: any[]): Promise<void> {
        if (args.length === 0) {
            return;
        }

        const notebookCell = args[0];
        const metadata = notebookCell.metadata as { [key: string]: any };
        const docPath = notebookCell.document.uri.fsPath;
        const docContent = fs.readFileSync(docPath);
        const notebookType: string = notebookCell.notebook.notebookType;
        const notebookSerializer = this.notebookMananger.getNotebookSerializer(notebookType);
        if (!notebookSerializer) {
            vscode.window.showErrorMessage(`Could not find serializer for the ${notebookType} notebook`);
            return;
        }
        const noteData = await notebookSerializer.deserializeNotebook(docContent);
        const editingCell = noteData.cells[notebookCell.index];
        const sysMetaKeys = Object.keys(metadata).filter(k => k.startsWith('$'));
        const sysMeta = Object.fromEntries(sysMetaKeys.map(k => [k, metadata[k]]));
        const cellMeta = Object.fromEntries(Object
            .keys(metadata)
            .filter(k => !sysMetaKeys.includes(k))
            .map(k => [k, metadata[k]]));

        const editCellMetadataView = new EditCellMetadataView(context.extensionUri, cellMeta);
        editCellMetadataView.onDidReceiveMessage(async (e: any) => {
            if (e.type === EditMetadataCallbackType.cancel) {
                editCellMetadataView.dispose();
                return;
            }

            if (e.type === EditMetadataCallbackType.save) {
                const metadata = e.metadata as { [key: string]: any };
                editingCell.metadata = { ...metadata, ...sysMeta };
                const notebookData = await notebookSerializer.serializeNotebook(noteData);
                fs.writeFileSync(docPath, notebookData);
                editCellMetadataView.dispose();
            }
        });
    }
}
