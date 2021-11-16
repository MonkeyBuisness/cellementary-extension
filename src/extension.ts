import * as vscode from 'vscode';
import { GoPlaygroundController } from './controllers/go-playground.controller';
import { NotebookManager } from './core/manager';
import { NotebookSerializer } from './core/serializer';

let notebookManager: NotebookManager;
const defaultSerializableNotebookTypes: string[] = [
    'golangbook',
];

export function activate(context: vscode.ExtensionContext) {
    notebookManager = new NotebookManager(context);

    // register notebook serializers.
    registerNotebookSerializers(notebookManager);

    // register notebook controllers.
    registerNotebookControllers(notebookManager);
}

export function deactivate() {
    notebookManager.dispose();
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

    // INFO: register your custom controller here... 
}
