import * as vscode from 'vscode';
import { EditMetadataView } from './edit-metadata.view';

export class EditCellMetadataView extends EditMetadataView {

    constructor(extensionUri: vscode.Uri, meta: { [key: string]: any }) {
       super(extensionUri, 'Edit cell metadata', meta);
    }
}
