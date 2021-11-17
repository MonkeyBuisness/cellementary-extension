import * as vscode from 'vscode';

// CommandManager represents class implementation for managing extension commands. 
export class CommandManager {
    private _disposables: vscode.Disposable[] = [];

    constructor(private context: vscode.ExtensionContext) {}

    public registerCommandHandler(command: string, handler: CommandHandler) : void {
        const cmd = vscode.commands.registerCommand(command, (args) => {
            handler.execute(this.context, args);
        });

        this._disposables.push(cmd);
        this.context.subscriptions.push(cmd);
    }

    public dispose() : void {
        this._disposables.forEach(d => d.dispose());
    }
}

// CommandHandler represents general command handler interface.
export interface CommandHandler {
    execute(context: vscode.ExtensionContext, ...args: any[]) : void
}
