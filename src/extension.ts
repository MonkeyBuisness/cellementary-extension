import * as vscode from 'vscode';
import { CommandManager } from './commands/command-handler';
import { EditCellMetadataCmd } from './commands/edit-cell-metadata.command';
import { GoPlaygroundController } from './controllers/go-playground.controller';
import { GoController } from './controllers/go.controller';
import { NotebookManager } from './core/manager';
import { NotebookSerializer } from './core/serializer';

let notebookManager: NotebookManager;
let cmdManager: CommandManager;
const defaultSerializableNotebookTypes: string[] = [
    'golangbook',
];

export function activate(context: vscode.ExtensionContext) {
    notebookManager = new NotebookManager(context);
    cmdManager = new CommandManager(context);

    // register extension command handlers.
    registerCommandHandlers(cmdManager);

    // register notebook serializers.
    registerNotebookSerializers(notebookManager);

    // register notebook controllers.
    registerNotebookControllers(notebookManager);
}

export function deactivate() {
    notebookManager.dispose();
    cmdManager.dispose();
}

function registerNotebookSerializers(m: NotebookManager) {
    // register default serializer.
    m.registerNotebookSerializer(defaultSerializableNotebookTypes, new NotebookSerializer());

    // register custom serializers.

    // INFO: register your custom serializer here... 
}

function registerNotebookControllers(m: NotebookManager) {
    // register golang-cloud language controller.
    m.registerNotebookController(new GoPlaygroundController());
    // register golang-local language controller.
    m.registerNotebookController(new GoController());

    // INFO: register your custom controller here... 
}

function registerCommandHandlers(m: CommandManager) {
    m.registerCommandHandler('cell.editMetadata', new EditCellMetadataCmd());
}
