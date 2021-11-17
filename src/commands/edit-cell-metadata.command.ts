import * as vscode from 'vscode';
import { EditCellMetadataView } from '../views/cell-metadata.view';
import { CommandHandler } from "./command-handler";

export class EditCellMetadataCmd implements CommandHandler {

    execute(context: vscode.ExtensionContext, ...args: any[]): void {
        if (args.length === 0) {
            return;
        }

        const metadata = {...args[0].metadata} as { [key: string]: any };
        const editCellMetadataView = new EditCellMetadataView(context.extensionUri, metadata);
        //editCellMetadataView.dispose();
    }
}
