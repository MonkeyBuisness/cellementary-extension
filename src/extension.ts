import * as vscode from 'vscode';
import { CommandManager } from './commands/command-handler';
import { EditCellMetadataCmd } from './commands/edit-cell-metadata.command';
import { GoPlaygroundController } from './controllers/go-playground.controller';
import { GoController } from './controllers/go.controller';
import { NotebookManager } from './core/manager';
import { NotebookSerializer } from './core/serializer';
import { ConfigurationService } from './services/configuration.service';
import { KernelsView } from './views/kernels.view';

let notebookManager: NotebookManager;
let cmdManager: CommandManager;
let kernelsView: KernelsView;
let cfgService: ConfigurationService;
const defaultSerializableNotebookTypes: string[] = [
    'golangbook',
];

export function activate(context: vscode.ExtensionContext) {
    // register extension command handlers.
    cmdManager = new CommandManager(context);
    registerCommandHandlers(cmdManager);

    // register extension services.
    registerServices(context);

    // register extension views.
    notebookManager = new NotebookManager(context, cfgService);
    registerViews(context);

    // register notebook serializers.
    registerNotebookSerializers(notebookManager);

    // register notebook controllers.
    registerNotebookControllers(notebookManager);
}

export function deactivate() {
    notebookManager.dispose();
    cmdManager.dispose();
    kernelsView.dispose();
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

function registerViews(context: vscode.ExtensionContext) {
    kernelsView = new KernelsView(context);
}

function registerServices(context: vscode.ExtensionContext) {
    cfgService = new ConfigurationService(context);
}
