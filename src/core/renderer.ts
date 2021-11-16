import { OutputItem } from 'vscode-notebook-renderer';

// NotebookRenderer represents abstract class for the notebook renderer.
export abstract class NotebookRenderer {
    public abstract renderOutputItem(data: OutputItem, element: any) : void;
}
