import * as vscode from 'vscode';

import { CommandHandler } from "./command-handler";
import { KernelNode } from '../views/providers/kernel-view-data.provider';
import { NotebookManager } from '../core/manager';
import { KernelCompatibilityView } from '../views/kernel-compatibility.view';

export class CheckKernelСompatibilityCmd implements CommandHandler {

    constructor(private notebookMananger: NotebookManager) {}

    public async execute(context: vscode.ExtensionContext, ...args: any[]): Promise<void> {
        if (args.length === 0) {
            return;
        }

        const node = args[0] as KernelNode;
        const checker = this.notebookMananger.getKernelCompatibilityChecker(node.label);
        if (checker) {
            new KernelCompatibilityView(context.extensionUri, checker);
            return;
        }

        vscode.window.showErrorMessage(`Could not find ${node.label} kernel checker`);
    }
}
