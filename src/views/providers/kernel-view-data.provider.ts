import * as vscode from 'vscode';  
import * as path from 'path';

import { Configuration, KernelConfig, ThemeIcon } from '../../core/types';
import { ConfigurationService } from '../../services/configuration.service';
import { NotebookManager } from '../../core/manager';

enum KernelNodeKind {
    controller = 'controller',
    group      = 'group'
}

export enum KernelNodeGroup {
    none          = 'none',
    byEnableState = 'by_enable_state',
    byLanguage    = 'by_language'
}

class KernelNode extends vscode.TreeItem {
    
    constructor(
        public readonly label: string,
        public isEnabled: boolean = true,
        public readonly kind: KernelNodeKind = KernelNodeKind.controller
    ) {
        super(
            label,
            kind === KernelNodeKind.controller ?
                vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Expanded
        );
        this.contextValue = kind;
        let iconName: string = '';
        switch (kind) {
            case KernelNodeKind.controller:
                iconName = isEnabled ? 'enabled_kernel' : 'disabled_kernel';
                this.tooltip = isEnabled ? 'Enabled' : 'Disabled';
                break;
            case KernelNodeKind.group:
                iconName = 'kernel_group';
                this.tooltip = label;
                break;
            default:
                return;
        }
        this.iconPath = KernelNode._resolveIconPath(iconName);
    }

    private static _resolveIconPath(iconName: string) : ThemeIcon {
        const basePath = path.join(__filename, '..', '..', 'resources', 'icons');
        const iconFile = `${iconName}.svg`;
        return {
            dark:  path.join(basePath, 'dark', iconFile),
            light: path.join(basePath, 'light', iconFile),
        };
    }
}

// KernelDataProvider represents kernel view data provider implementation.
export class KernelDataProvider implements vscode.TreeDataProvider<KernelNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<KernelNode | undefined | void> =
        new vscode.EventEmitter<KernelNode | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<KernelNode | undefined | void> =
        this._onDidChangeTreeData.event;
    private _kernels: KernelConfig[] = [];
    private _groupBy: KernelNodeGroup = KernelNodeGroup.none;

    constructor(
        private cfgService: ConfigurationService,
        private notebookManager: NotebookManager
    ) {
        // add configuration changed listener.
        vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
            if (event.affectsConfiguration(`${this.cfgService.coreSection}.${Configuration.kernels}`)) {
                this._kernels = this.cfgService.getConfiguration(Configuration.kernels, []);
                this._onDidChangeTreeData.fire();
            }
        });

        this._kernels = this.cfgService.getConfiguration(Configuration.kernels, []);
        this._groupBy = this.cfgService.getConfiguration(Configuration.kernelViewState, KernelNodeGroup.none);
    }

    public getTreeItem(element: KernelNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    public getChildren(element?: KernelNode): vscode.ProviderResult<KernelNode[]> {
        switch (this._groupBy) {
            case KernelNodeGroup.byEnableState:
                return this._getChildrenGroupedByEnableState(element);
            case KernelNodeGroup.byLanguage:
                return this._getChildrenGroupedByLanguage(element);
        }

        return this._getChildrenWithoutGrouping();
    }

    public refresh() : void {
        this._onDidChangeTreeData.fire();
    }

    public groupBy(group: KernelNodeGroup) : void {
        this._groupBy = group;
        this._onDidChangeTreeData.fire();
        this.cfgService.setConfiguration(Configuration.kernelViewState, group);
    }

    private _getChildrenWithoutGrouping() : KernelNode[] {
        const nodes = this._kernels.map(k => new KernelNode(k.kernelType, k.isEnabled));
        return nodes;
    }

    private _getChildrenGroupedByEnableState(element?: KernelNode) : KernelNode[] {
        if (!element) {
            const groups: KernelNode[] = [
                new KernelNode('Enabled kernels', true, KernelNodeKind.group),
                new KernelNode('Disabled kernels', false, KernelNodeKind.group),
            ];

            return groups;
        }

        return this._kernels
            .filter(k => k.isEnabled === element.isEnabled)
            .map(k => new KernelNode(k.kernelType, k.isEnabled));
    }

    private _getChildrenGroupedByLanguage(element?: KernelNode) : KernelNode[] {
        if (!element) {
            const unique = (arr: any[]) => arr.filter((v, i, a) => a.indexOf(v) === i);
            const languages: string[] = [];
            this._kernels.forEach(k => {
                const controller = this.notebookManager.getControllerById(k.kernelType);
                if (!controller) {
                    return;
                }

                const supportedLanguages: string[] = controller.supportedLanguages() || [];
                languages.push(...supportedLanguages);
            });

            return unique(languages).map(l => new KernelNode(l, true, KernelNodeKind.group));
        }

        this._kernels.forEach(k => {});

        return this._kernels
            .filter(k => k.isEnabled === element.isEnabled)
            .map(k => new KernelNode(k.kernelType, k.isEnabled));
    }
}
