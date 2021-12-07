import * as vscode from 'vscode';
import { CommandManager } from './commands/command-handler';
import { DisableKernelCmd } from './commands/disable-kernel.command';
import { EditCellMetadataCmd } from './commands/edit-cell-metadata.command';
import { EditNotebookMetadataCmd } from './commands/edit-notebook-metadata.command';
import { EnableKernelCmd } from './commands/enable-kernel.command';
import { GroupKernelsByEnableStateCmd } from './commands/group-kernels-by-state.command';
import { GroupKernelsByLanguageCmd } from './commands/group-kernels-by_lang.command';
import { ShowKernelInfoCmd } from './commands/show-kernel-info.command';
import { UngroupKernelsCmd } from './commands/ungroup-kernels.command';
import { GoPlaygroundController } from './controllers/go-playground.controller';
import { GoController } from './controllers/go.controller';
import { HTMLController } from './controllers/html.controller';
import { JavaOneController } from './controllers/java-one.controller';
import { JavaController } from './controllers/java.controller';
import { JSONController } from './controllers/json.controller';
import { MarkdownController } from './controllers/markdown.controller';
import { MySQLController } from './controllers/mysql.controller';
import { SQLiteController } from './controllers/sqlite.controller';
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
    'htmlbook',
    'javabook',
    'sqlitebook',
    'mysqlbook',
    'mdbook',
    'jsonbook',
];

export function activate(context: vscode.ExtensionContext) {
    // register extension services.
    registerServices(context);

    // register extension views.
    notebookManager = new NotebookManager(context, cfgService);
    registerViews(context, cfgService, notebookManager);

    // register notebook serializers.
    registerNotebookSerializers(notebookManager);

    // register notebook controllers.
    registerNotebookControllers(notebookManager);

    // register extension command handlers.
    cmdManager = new CommandManager(context);
    registerCommandHandlers(cmdManager, kernelsView, cfgService, notebookManager);
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
    // register DHTML language controller.
    m.registerNotebookController(new HTMLController());
    // register java-local language controller.
    m.registerNotebookController(new JavaController());
    // register java-one language controller.
    m.registerNotebookController(new JavaOneController());
    // register sqlite language controller.
    m.registerNotebookController(new SQLiteController());
    // register mysql language controller.
    m.registerNotebookController(new MySQLController());
    // register markdown language controller.
    m.registerNotebookController(new MarkdownController());
    // register JSON language controller.
    m.registerNotebookController(new JSONController());

    // INFO: register your custom controller here... 
}

function registerCommandHandlers(
    m: CommandManager,
    kernelsView: KernelsView,
    cfgService: ConfigurationService,
    notebookManager: NotebookManager) {
    m.registerCommandHandler('cell.editMetadata',
        new EditCellMetadataCmd(notebookManager));
    m.registerCommandHandler('cellementary.ungroupAll',
        new UngroupKernelsCmd(kernelsView));
    m.registerCommandHandler('cellementary.groupByEnableState',
        new GroupKernelsByEnableStateCmd(kernelsView));
    m.registerCommandHandler('cellementary.groupByLanguage',
        new GroupKernelsByLanguageCmd(kernelsView));
    m.registerCommandHandler('cellementary.disableKernel',
        new DisableKernelCmd(cfgService));
    m.registerCommandHandler('cellementary.enableKernel',
        new EnableKernelCmd(cfgService));
    m.registerCommandHandler('cellementary.kernelInfo',
        new ShowKernelInfoCmd(notebookManager));
    m.registerCommandHandler('notebook.editMetadata', new EditNotebookMetadataCmd());
}

function registerViews(
    context: vscode.ExtensionContext,
    cfgService: ConfigurationService,
    notebookManager: NotebookManager) {
    kernelsView = new KernelsView(context, cfgService, notebookManager);
}

function registerServices(context: vscode.ExtensionContext) {
    cfgService = new ConfigurationService(context);
}
