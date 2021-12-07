import * as vscode from 'vscode';
import * as fs from 'fs';
import path = require('path');

import { CommandHandler } from "./command-handler";
import { EditNotebookMetadataView } from '../views/notebook-metadata.view';
import { EditMetadataCallbackType } from '../views/edit-metadata.view';
import { NotebookManager } from '../core/manager';

export class EditNotebookMetadataCmd implements CommandHandler {

    constructor(private notebookMananger: NotebookManager) {}

    public async execute(context: vscode.ExtensionContext, ...args: any[]): Promise<void> {
        if (args.length === 0) {
            return;
        }

        const { notebookEditor } = args[0];
        const docPath = notebookEditor.notebookUri.path;
        const docContent = fs.readFileSync(docPath);
        const notebookType: string = path.extname(docPath).slice(1);
        const notebookSerializer = this.notebookMananger.getNotebookSerializer(notebookType);
        if (!notebookSerializer) {
            vscode.window.showErrorMessage(`Could not find serializer for the ${notebookType} notebook`);
            return;
        }
        const noteData = await notebookSerializer.deserializeNotebook(docContent);
        const editNotebookMetadataView = new EditNotebookMetadataView(
            context.extensionUri, noteData.metadata || {});
        editNotebookMetadataView.onDidReceiveMessage(async (e: any) => {
            if (e.type === EditMetadataCallbackType.cancel) {
                editNotebookMetadataView.dispose();
                return;
            }

            if (e.type === EditMetadataCallbackType.save) {
                const metadata = e.metadata as { [key: string]: any };
                noteData.metadata = metadata;
                const notebookData = await notebookSerializer.serializeNotebook(noteData);
                fs.writeFileSync(docPath, notebookData);
                editNotebookMetadataView.dispose();
            }
        });
    }
}
