import * as vscode from 'vscode';
import { KernelDataProvider } from './providers/kernel-view-data.provider';

// KernelsView represents kernel activity bar view implementation.
export class KernelsView {
    private static readonly _viewId: string = 'kernelsView';
    private _disposables: vscode.Disposable[] = [];
    private _kernelDataProvider: KernelDataProvider;

    constructor(context: vscode.ExtensionContext) {
        this._kernelDataProvider = new KernelDataProvider();
        const dataProvider = vscode.window.registerTreeDataProvider(
            KernelsView._viewId, this._kernelDataProvider);
        this._disposables.push(dataProvider);
        context.subscriptions.push(dataProvider);

        const viewDisposable = vscode.window.createTreeView(KernelsView._viewId, {
            treeDataProvider: this._kernelDataProvider,
        });
        this._disposables.push(viewDisposable);
        context.subscriptions.push(viewDisposable);
    }

    public dispose() : void {
        this._disposables.forEach(d => d.dispose());
    }

    public refresh() : void {
        this._kernelDataProvider.refresh();
    }
}
