import * as vscode from 'vscode';
import { EditMetadataView } from './edit-metadata.view';

export class EditNotebookMetadataView extends EditMetadataView {

    constructor(extensionUri: vscode.Uri, meta: { [key: string]: any }) {
        super(extensionUri, 'Edit notebook metadata', meta);
    }
}
