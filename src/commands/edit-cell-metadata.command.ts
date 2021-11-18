import * as vscode from 'vscode';
import * as fs from 'fs';

import { EditCellMetadataView } from '../views/cell-metadata.view';
import { CommandHandler } from "./command-handler";
import { NotebookSerializer } from '../core/serializer';

export class EditCellMetadataCmd implements CommandHandler {

    public async execute(context: vscode.ExtensionContext, ...args: any[]): Promise<void> {
        if (args.length === 0) {
            return;
        }

        const notebookCell = args[0];
        const metadata = notebookCell.metadata as { [key: string]: any };
        const docPath = notebookCell.document.uri.path;
        const docContent = fs.readFileSync(docPath);
        const notebookSerializer = new NotebookSerializer();
        const cells = await notebookSerializer.deserializeNotebook(docContent);
        const editingCell = cells.cells[notebookCell.index];

        const editCellMetadataView = new EditCellMetadataView(context.extensionUri, metadata);
        editCellMetadataView.onDidReceiveMessage(async (e: any) => {
            if (e.type === 'cancel') {
                editCellMetadataView.dispose();
                return;
            }

            if (e.type === 'save') {
                const metadata = e.metadata as { [key: string]: any };
                editingCell.metadata = metadata;
                const notebookData = await notebookSerializer.serializeNotebook(cells);
                fs.writeFileSync(docPath, notebookData);
                editCellMetadataView.dispose();
            }
        });
    }
}
