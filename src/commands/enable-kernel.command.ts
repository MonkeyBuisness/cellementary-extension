import * as vscode from 'vscode';

import { CommandHandler } from "./command-handler";
import { ConfigurationService } from "../services/configuration.service";
import { Configuration, KernelConfig } from '../core/types';
import { KernelNode } from '../views/providers/kernel-view-data.provider';

export class EnableKernelCmd implements CommandHandler {

    constructor(private cfgService: ConfigurationService) {}

    public async execute(_: vscode.ExtensionContext, ...args: any[]): Promise<void> {
        if (args.length === 0) {
            return;
        }

        const node = args[0] as KernelNode;
        const kernels: KernelConfig[] = this.cfgService.getConfiguration(Configuration.kernels, []);
        const kernel = kernels.find(k => k.kernelType === node.label);
        if (kernel) {
            kernel.isEnabled = true;
            this.cfgService.setConfiguration(Configuration.kernels, kernels);
        }
    }
}
