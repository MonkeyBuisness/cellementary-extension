import * as vscode from 'vscode';
import { Script, createContext } from 'vm';

import {
    convertNotebookCellData,
    NotebookCellData
} from './serializer';
import {
    MimeTypes,
    ReservedCellMetaKey,
    VScript
} from './types';


// NotebookController represents abstract notebook controller class implementation
// to manage notebook sessions.
// If you want to create your own language controller,
// extend your class with this class and implement all abstract methods.
export abstract class NotebookController {
    private _controller?: vscode.NotebookController;

    /**
     * Constructor for a new notebook controller.
     *
     * @param id           Represents controller identifier. Must be unique per extension.
     * @param notebookType A notebook type for which this controller is for.
     * @param label        The label of the controller.
     */
    constructor(
        private id: string,
        private notebookType: string,
        private label: string
    ) {
        this.restore();
    }

    public restore() : void {
        this._controller?.dispose();

        this._controller = vscode.notebooks.createNotebookController(
            this.id,
            this.notebookType,
            this.label,
        );
        this._controller.supportedLanguages = this.supportedLanguages();
        this._controller.supportsExecutionOrder = this.supportsExecutionOrder();
        this._controller.detail = this.detail();
        this._controller.description = this.description();
        this._controller.executeHandler = (cells) => this._executeHandler(cells);
    }

    public dispose() : void {
        this._controller?.dispose();
    }

    public get controllerId() : string {
        return this._controller?.id || '';
    }

    public get controllerLabel() : string {
        return this._controller?.label || '';
    }

    private _executeHandler(cells: vscode.NotebookCell[]) : void {
        cells.forEach(async cell => {
            const execution = this._controller!.createNotebookCellExecution(cell);
            execution.start(Date.now());
            execution.clearOutput(cell);

            const cellExecution = new NotebookCellExecution(execution);
            let scriptExecutor: ScriptExecutor | undefined = undefined;
            const scriptMeta = (cell.metadata || {})[ReservedCellMetaKey.script] as VScript;
            if (scriptMeta !== undefined) {
                scriptExecutor = new ScriptExecutor(scriptMeta, cellExecution);
            }
            scriptExecutor?.beforeExecution();

            const success = await this.execute(cellExecution);

            scriptExecutor?.afterExecution(success);
            execution.end(success, Date.now());
        });
    }

    /**
     * Returns a list of controller supported languages.
     */
    public abstract supportedLanguages() : string[] | undefined;

    /**
     * Returns a true if controller supports execution order.
     */
    public abstract supportsExecutionOrder() : boolean | undefined;

    /**
     * Returns the human-readable detail which is rendered less prominent.
     */
    public abstract detail() : string | undefined;

    /**
     * Returns the human-readable description which is rendered less prominent.
     */
    public abstract description() : string | undefined;

    /**
     * Execute is responsible for creating and managing
     * {@link NotebookCellData execution}-object.
     */
    public abstract execute(ex: NotebookCellExecution) : Promise<boolean | undefined>;
}

// NotebookCellExecution represents notebook cell execution class implementation
// responsible for executing notebook cell.
export class NotebookCellExecution {
    private readonly _cell: NotebookCellData;

    constructor(private execution: vscode.NotebookCellExecution) {
        this._cell = convertNotebookCellData(execution.cell);
    }

    /**
     * Returns the cell to be executed.
     */
    public get cell() : NotebookCellData {
        return this._cell;
    }

    /**
     * Returns the number of the executing cell.
     */
    public get cellIndex() : number {
        return this.execution.cell.index;
    }

    /**
     * Returns the notebook document assosiated with the executing cell.
     */
    public get notebook() : vscode.NotebookDocument {
        return this.execution.cell.notebook;
    }

    /**
     * Returns the cancellation token.
     */
    public get token() : vscode.CancellationToken {
        return this.execution.token;
    }

    /**
     * Set and unset the order of this cell execution.
     */
    public set executionOrder(order: number | undefined) {
        this.execution.executionOrder = order;
    }

    /**
     * Clears the output of the cell that is executing.
     */
    public clearOutput() : Thenable<void> {
        return this.execution.clearOutput();
    }

    /**
     * Append text items to the output of the cell that is executing.
     */
    public appendTextOutput(values: string[], mime?: string, metadata?: { [key: string]: any }) : Thenable<void> {
        const items = values.map(v => new vscode.NotebookCellOutput(
            [vscode.NotebookCellOutputItem.text(v, mime)],
            metadata)
        );

        return this.execution.appendOutput(items);
    }

    /**
     * Append error items to the output of the cell that is executing.
     */
    public appendErrorOutput(errors: Error[], metadata?: { [key: string]: any }) : Thenable<void> {
        const items = errors.map(e => new vscode.NotebookCellOutput(
            [vscode.NotebookCellOutputItem.error(e)],
            metadata)
        );

        return this.execution.appendOutput(items);
    }

    /**
     * Append JSON encoded items to the output of the cell that is executing.
     */
    public appendJSONOutput(values: any[], mime?: string, metadata?: { [key: string]: any }) : Thenable<void> {
        const items = values.map(v => new vscode.NotebookCellOutput(
            [vscode.NotebookCellOutputItem.json(v, mime)],
            metadata)
        );

        return this.execution.appendOutput(items);
    }

    /**
     * Pauses execution of the cell for the specified time.
     */
    public async delay(ms: number) : Promise<unknown> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// OnControllerInfo represents controller info interface
// to allow user to see more details about controller.
export interface OnControllerInfo {

    /**
     * Returns list of controller contributors.
     */
    contributors() : Contributor[] | undefined;

    /**
     * Returns controller icon path.
     * See {@link ControllerInfo.iconName} for more details.
     */
    icon() : string | undefined;

    /**
     * Returns controller getting started guide path.
     * See {@link ControllerInfo.gettingStartedPath} for more details.
     */
    gettingStartedGuide() : string | undefined;

    /**
     * Returns list of controller cell metadata.
     */
    cellMetadata() : MetadataField[] | undefined;

    /**
     * Returns list of controller notebook metadata.
     */
    notebookMetadata() : MetadataField[] | undefined;
}

// ControllerInfo represents interface implementation describes controller details. 
export interface ControllerInfo {

    /**
     * Controller Id.
     */
    readonly id: string;

    /**
     * Controller name.
     */
    readonly name: string;

    /**
     * List of controller supported languages.
     */
    readonly supportedLanguages?: string[];

    /**
     * True if controller supports execution order.
     */
    readonly supportsExecutionOrder?: boolean;

    /**
     * The human-readable controller detail.
     */
    readonly detail?: string;

    /**
     * The human-readable controller description.
     */
    readonly description?: string;

    /**
     * The list of controller contributors.
     */
    readonly contributors?: Contributor[];

    /**
     * The name of the controller icon file.
     * Example: my_awesome_controller.png
     *  
     * This file (if provided) should be located in the resources/kernels/icons folder.
     * The icon image should be in the png/jpeg/bmp or gif format.
     * The recommended image size is 256x256px. 
     */
    readonly iconName?: string;

    /**
     * The name of the controller getting started guide file.
     * Example: my_awesome_guide.md
     *  
     * This file (if provided) should be located in the docs/kernels folder.
     * The file must be in markdown format.
     */
    readonly gettingStartedPath?: string;

    /**
     * The list of controller cell metadata fields.
     */
    readonly cellMetadata?: MetadataField[];

    /**
     * The list of controller notebook metadata fields.
     */
    readonly notebookMetadata?: MetadataField[];
}

// Contributor represents controller contributor info.
export interface Contributor {
    
    /**
     * Contributor email.
     */
    email?: string;

    /**
     * Contributor name.
     */
    name: string;

    /**
     * Contributor's profile URL.
     */
    url?: string;
}

// MetadataField represents supported controller metadata field detail.
export interface MetadataField {

    /**
     * Key name.
     */
    key: string;

    /**
     * Possible key values.
     */
    enum?: string[];
    
    /**
     * Default key value.
     */
    default?: string;

    /**
     * Key description.
     */
    description?: string;

    /**
     * Is field required.
     */
    required?: boolean;
}

// isOnControllerInfo checks if object implements OnControllerInfo interface.
export function isOnControllerInfo(object: any): object is OnControllerInfo {
    const int = object as OnControllerInfo;
    return int.contributors !== undefined;
}

class ScriptExecutor {
    private _ctx: ScriptContext;
    private _output: ScriptContextOutput;
    private _cell: ScriptCell;
    
    constructor(
        code: VScript,
        private execution: NotebookCellExecution) {
        this._ctx = {
            mimes: () => MimeTypes,
        } as ScriptContext;
        this._output = new ScriptContextOutput(this.execution);
        this._cell = {
            content:    execution.cell.content,
            index:      execution.cellIndex,
            languageId: execution.cell.languageId,
            meta:       execution.cell.metadata
        };
        try {
            const script = new Script(code.code);
            script.runInContext(createContext(this._ctx, {
                codeGeneration: {
                    wasm: false,
                },
            }));
        } catch (e: any) {
            vscode.window.showErrorMessage(`Could not compile cell script:\n${e}`);
        }
    }

    public beforeExecution() : void {
        if (this._ctx.before) {
            try {
                this._ctx.before(this._cell, this._output);
            } catch(e: any) {
                vscode.window.showErrorMessage(`Could not execute "before" script:\n${e}`);
            }
        }
    }

    public afterExecution(success?: boolean) : void {
        if (this._ctx.after) {
            try {
                this._ctx.after(this._cell, this._output, success);
            } catch(e: any) {
                vscode.window.showErrorMessage(`Could not execute "after" script:\n${e}`);
            }
        }
    }
}

interface ScriptContext {
    before?: (cell: ScriptCell, out: ScriptContextOutput) => void;
    after?: (cell: ScriptCell, out: ScriptContextOutput, success?: boolean) => void;
    mimes() : { [key: string] : string };
}

interface ScriptCell {
    content:    string;
    index:      number;
    languageId: string;
    meta?:      { [key: string]: any };
}

class ScriptContextOutput {

    constructor(private execution: NotebookCellExecution) {}

    public text(values: string[], mime?: string, meta?: { [key: string] : any }) : void {
        this.execution.appendTextOutput(values, mime, meta);
    }

    public json(values: any[], mime?: string, meta?: { [key: string] : any }) : void {
        this.execution.appendJSONOutput(values, mime, meta);
    }

    public error(errs: Error[], metadata?: { [key: string]: any }) : void {
        this.execution.appendErrorOutput(errs, metadata);
    }

    public clear() : void {
        this.execution.clearOutput();
    }
}
