import * as vscode from 'vscode';
import { NotebookSerializer } from './serializer';
import {
    ControllerInfo,
    isOnControllerInfo,
    NotebookController,
    OnControllerInfo
} from './controller';
import { ConfigurationService } from '../services/configuration.service';
import { Configuration, KernelCompatibilityChecker, KernelConfig } from './types';

// NotebookManager represents notebook manager class implementation.
export class NotebookManager {
    private readonly _controllers: NotebookController[] = [];
    private readonly _disposables: vscode.Disposable[] = [];
    private readonly _serializersMap: Map<string, NotebookSerializer>;
    private readonly _checkersMap: Map<string, KernelCompatibilityChecker>;

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
        this._serializersMap = new Map();
        this._checkersMap = new Map();
    }

    /**
     * Register a {@link NotebookSerializer notebook serializer}.
     *
     * @param notebookTypes The types of the notebook.
     * @param serializer A notebook serialzier.
     */
    public registerNotebookSerializer(notebookTypes: string[], serializer: NotebookSerializer) : void {
        notebookTypes.forEach(t => {
            const disposable = vscode.workspace.registerNotebookSerializer(t, serializer, {
                transientOutputs: true,
            });
            this._disposables.push(disposable);
            this.context.subscriptions.push(disposable);
            this._serializersMap.set(t, serializer);
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
            controller.dispose();
            return;
        }

        this._disposables.push(controller);
        this.context.subscriptions.push(controller);
    }

    /**
     * Register a {@link KernelCompatibilityChecker} for the kernel.
     *
     * @param controllerId The Id of the controller (kernel).
     * @param checker A kernel checker.
     */
    public registerKernelCompatibilityChecker(controllerId: string, checker: KernelCompatibilityChecker) : void {
        this._checkersMap.set(`controller_enabled_${controllerId}`, checker);
        vscode.commands.executeCommand(
            'setContext', 'cellementary.supportedKernelCheckers', [...this._checkersMap.keys()]);
    }

    /**
     * Dispose this object.
     */
    public dispose() : void {
        this._disposables.forEach(d => d.dispose());
        this._controllers.forEach(d => d.dispose());
    }

    /**
     * Returns controller by Id.
     * 
     * @param controllerId Controller Id.
     */
    public getControllerById(controllerId: string) : NotebookController | undefined {
        return this._controllers.find(c => c.controllerId === controllerId);
    }

    /**
     * Returns controller info by Id.
     * 
     * @param controllerId Controller Id.
     */
    public getControllerInfo(controllerId: string) : ControllerInfo | undefined {
        const controller = this._controllers.find(c => c.controllerId === controllerId);
        if (!controller) {
            return;
        }

        let controllerDelails: OnControllerInfo | undefined;
        if (isOnControllerInfo(controller)) {
            controllerDelails = controller as unknown as OnControllerInfo;
        }

        return {
            id:                     controller.controllerId,
            name:                   controller.controllerLabel,
            description:            controller.description(),
            detail:                 controller.detail(),
            supportedLanguages:     controller.supportedLanguages(),
            supportsExecutionOrder: controller.supportsExecutionOrder(),
            contributors:           controllerDelails?.contributors(),
            gettingStartedPath:     controllerDelails?.gettingStartedGuide(),
            iconName:               controllerDelails?.icon(),
            cellMetadata:           controllerDelails?.cellMetadata(),
            notebookMetadata:       controllerDelails?.notebookMetadata()
        } as ControllerInfo;
    }

    /**
     * Returns notebook serializer associated with the provided notebook type.
     * 
     * @param notebookType notebook type.
     */
    public getNotebookSerializer(notebookType: string) : NotebookSerializer | undefined {
        return this._serializersMap.get(notebookType);
    }

    /**
     * Returns kernel compatibility checker by controller Id.
     * 
     * @param controllerId Controller Id.
     */
    public getKernelCompatibilityChecker(controllerId: string) : KernelCompatibilityChecker | undefined {
        return this._checkersMap.get(`controller_enabled_${controllerId}`);     
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

                controller.restore();
                this.context.subscriptions.push(controller);
                this._disposables.push(controller);
                return;
            }

            // disable controller if it's not disabled.
            if (!this.context.subscriptions.includes(controller)) {
                return;
            }
            controller.dispose();

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
