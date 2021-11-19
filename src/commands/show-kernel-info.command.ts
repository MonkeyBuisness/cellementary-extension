import * as vscode from 'vscode';

import { CommandHandler } from "./command-handler";
import { KernelNode } from '../views/providers/kernel-view-data.provider';
import { NotebookManager } from '../core/manager';
import { KernelInfoView } from '../views/kernel-info.view';

export class ShowKernelInfoCmd implements CommandHandler {

    constructor(private notebookMananger: NotebookManager) {}

    public async execute(context: vscode.ExtensionContext, ...args: any[]): Promise<void> {
        if (args.length === 0) {
            return;
        }

        const node = args[0] as KernelNode;
        const controllerInfo = this.notebookMananger.getControllerInfo(node.label);
        if (controllerInfo) {
            new KernelInfoView(context.extensionUri, controllerInfo);
            return;
        }

        vscode.window.showErrorMessage(`Could not find ${node.label} controller info`);
    }
}
