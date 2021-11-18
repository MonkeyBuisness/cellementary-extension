import * as vscode from 'vscode';
import { NotebookSerializer } from './serializer';
import { NotebookController } from './controller';
import { ConfigurationService } from '../services/configuration.service';
import { Configuration, KernelConfig } from './types';

// NotebookManager represents notebook manager class implementation.
export class NotebookManager {
    private readonly _controllers: NotebookController[] = [];
    private readonly _disposables: vscode.Disposable[] = [];

    /**
     * NotebookManager class constructor.
     */
    constructor(
        private context: vscode.ExtensionContext,
        private cfgService: ConfigurationService,
    ) {
        // add configuration changed listener.
        vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
            if (event.affectsConfiguration(`${this.cfgService.coreSection}.${Configuration.kernels}`)) {
                this._reconfigureControllers();
            }
        });
    }

    /**
     * Register a {@link NotebookSerializer notebook serializer}.
     *
     * @param notebookTypes The types of the notebook.
     * @param serializer A notebook serialzier.
     */
    public registerNotebookSerializer(notebookTypes: string[], serializer: NotebookSerializer) : void {
        notebookTypes.forEach(t => {
            const disposable = vscode.workspace.registerNotebookSerializer(t, serializer);
            this._disposables.push(disposable);
            this.context.subscriptions.push(disposable);
        });
    }

    /**
     * Register a {@link NotebookController notebook controller}.
     *
     * @param notebookTypes The types of the notebook.
     * @param serializer A notebook serialzier.
     */
    public registerNotebookController(controller: NotebookController) : void {
        this._controllers.push(controller);

        // get kernels configuration.
        const kernelsCfg: KernelConfig[] = this.cfgService
            .getConfiguration(Configuration.kernels, []);
        const controllerCfg = kernelsCfg.find(cfg => cfg.kernelType === controller.controllerId);
        if (!controllerCfg) {
            // add a default kernel configuration.
            kernelsCfg.push({
                isEnabled:  true, // by default
                kernelType: controller.controllerId
            } as KernelConfig);
            this.cfgService.setConfiguration(Configuration.kernels, kernelsCfg);
            return;
        }
        if (!controllerCfg.isEnabled) {
            return;
        }

        this._disposables.push(controller);
        this.context.subscriptions.push(controller);
    }

    /**
     * Dispose this object.
     */
    public dispose() : void {
        this._disposables.forEach(d => d.dispose());
    }

    /**
     * Returns controller by Id.
     * 
     * @param controllerId Controller Id.
     */
    public getControllerById(controllerId: string) : NotebookController | undefined {
        return this._controllers.find(c => c.controllerId === controllerId);
    }

    private _reconfigureControllers() : void {
        const kernelsCfg: KernelConfig[] = this.cfgService
            .getConfiguration(Configuration.kernels, []);
        kernelsCfg.forEach(cfg => {
            const controller = this._controllers.find((c => cfg.kernelType === c.controllerId));
            if (!controller) {
                return;
            }
            
            // enable controller if it's not enabled.
            if (cfg.isEnabled) {
                if (this.context.subscriptions.includes(controller)) {
                    return;
                }

                this.context.subscriptions.push(controller);
                this._disposables.push(controller);
                return;
            }

            // disable controller if it's not disabled.
            if (!this.context.subscriptions.includes(controller)) {
                return;
            }

            let index = this.context.subscriptions.indexOf(controller);
            if (index !== -1) {
                this.context.subscriptions[index].dispose();
                this.context.subscriptions.splice(index, 1);
            }

            index = this._disposables.indexOf(controller);
            if (index !== -1) {
                this._disposables[index].dispose();
                this._disposables.splice(index, 1);
            }
        });
    }
}
