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

export class KernelNode extends vscode.TreeItem {
    
    constructor(
        public readonly label: string,
        public readonly isEnabled: boolean = true,
        public readonly kind: KernelNodeKind = KernelNodeKind.controller,
        public readonly group?: KernelNodeGroup
    ) {
        super(
            label,
            kind === KernelNodeKind.controller ?
                vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Expanded
        );
        this.contextValue = `${kind}_${isEnabled ? 'enabled' : 'disabled'}`;
        let iconName: string | string[] = '';
        switch (kind) {
            case KernelNodeKind.controller:
                iconName = isEnabled ? 'enabled_kernel' : 'disabled_kernel';
                this.tooltip = isEnabled ? 'Enabled' : 'Disabled';
                break;
            case KernelNodeKind.group:
                if (group === KernelNodeGroup.byEnableState) {
                    iconName = isEnabled ? 'enabled_kernel' : 'disabled_kernel';
                } else if (group === KernelNodeGroup.byLanguage) {
                    iconName = path.join('..', 'devicon', label);
                }
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

    public static localeCompare = (a: KernelNode, b: KernelNode) => a.label.localeCompare(b.label);
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

            if (event.affectsConfiguration(`${this.cfgService.coreSection}.${Configuration.kernelsFilter}`)) {
                this._groupBy = this.cfgService.getConfiguration(Configuration.kernelsFilter, KernelNodeGroup.none);
                this._onDidChangeTreeData.fire();
            }
        });

        this._kernels = this.cfgService.getConfiguration(Configuration.kernels, []);
        this._groupBy = this.cfgService.getConfiguration(Configuration.kernelsFilter, KernelNodeGroup.none);
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
        this.cfgService.setConfiguration(Configuration.kernelsFilter, group);
    }

    private _getChildrenWithoutGrouping() : KernelNode[] {
        const nodes = this._kernels.map(k => new KernelNode(k.kernelType, k.isEnabled));
        return nodes.sort(KernelNode.localeCompare);
    }

    private _getChildrenGroupedByEnableState(element?: KernelNode) : KernelNode[] {
        if (!element) {
            const groups: KernelNode[] = [
                new KernelNode('Enabled kernels', true, KernelNodeKind.group, this._groupBy),
                new KernelNode('Disabled kernels', false, KernelNodeKind.group, this._groupBy),
            ];

            return groups;
        }

        return this._kernels
            .filter(k => k.isEnabled === element.isEnabled)
            .map(k => new KernelNode(k.kernelType, k.isEnabled))
            .sort(KernelNode.localeCompare);
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

            return unique(languages)
                .map(l => new KernelNode(l, true, KernelNodeKind.group, this._groupBy))
                .sort(KernelNode.localeCompare);
        }

        const kernelsByLanguage = this._kernels.filter(k => {
            const controller = this.notebookManager.getControllerById(k.kernelType);
            if (!controller || !controller.supportedLanguages()?.includes(element.label)) {
                return false;
            }

            return true;
        });

        return kernelsByLanguage
            .map(k => new KernelNode(k.kernelType, k.isEnabled))
            .sort(KernelNode.localeCompare);
    }
}
