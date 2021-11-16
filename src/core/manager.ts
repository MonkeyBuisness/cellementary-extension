import * as vscode from 'vscode';
import { NotebookSerializer } from './serializer';
import { NotebookController } from './controller';

// NotebookManager represents notebook manager class implementation.
export class NotebookManager {
    private readonly _disposables: vscode.Disposable[] = [];

    /**
     * NotebookManager class constructor.
     */
    constructor(private context: vscode.ExtensionContext) {}

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
        this._disposables.push(controller);
        this.context.subscriptions.push(controller);
    }

    /**
     * Dispose this object.
     */
    public dispose() : void {
        this._disposables.forEach(d => d.dispose());
    }
}
