import * as vscode from 'vscode';

class KernelNode extends vscode.TreeItem {}

// KernelDataProvider represents kernel view data provider implementation.
export class KernelDataProvider implements vscode.TreeDataProvider<KernelNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<KernelNode | undefined | void> =
        new vscode.EventEmitter<KernelNode | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<KernelNode | undefined | void> =
        this._onDidChangeTreeData.event;

    public getTreeItem(element: KernelNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    public getChildren(element?: KernelNode): vscode.ProviderResult<KernelNode[]> {
        console.log(element);
        return [];
    }

    public refresh() : void {
        this._onDidChangeTreeData.fire();
    }
}
