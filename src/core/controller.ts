import * as vscode from 'vscode';

import { convertNotebookCellData, NotebookCellData } from './serializer';

// NotebookController represents abstract notebook controller class implementation
// to manage notebook sessions.
// If you want to create your own language controller,
// extend your class with this class and implement all abstract methods.
export abstract class NotebookController {
    private readonly _controller?: vscode.NotebookController;

    /**
     * Constructor for a new notebook controller.
     *
     * @param controllerId Represents controller identifier. Must be unique per extension.
     * @param notebookType A notebook type for which this controller is for.
     * @param label The label of the controller.
     */
    constructor(controllerId: string, notebookType: string, label: string) {
        this._controller = vscode.notebooks.createNotebookController(
            controllerId,
            notebookType,
            label,
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

    private _executeHandler(cells: vscode.NotebookCell[]) : void {
        cells.forEach(async cell => {
            const execution = this._controller!.createNotebookCellExecution(cell);
            execution.start(Date.now());
            execution.clearOutput(cell);

            const success = await this.execute(new NotebookCellExecution(execution));

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
     * Replace the output of the cell that is executing.
     */
    public replaceOutput(out: vscode.NotebookCellOutput | vscode.NotebookCellOutput[]): Thenable<void> {
        return this.execution.replaceOutput(out);
    }

    /**
     * Append to the output of the cell that is executing.
     */
    public appendOutput(out: vscode.NotebookCellOutput | vscode.NotebookCellOutput[]): Thenable<void> {
        return this.execution.appendOutput(out);
    }
}
