import { ActivationFunction, OutputItem } from 'vscode-notebook-renderer';

import * as style from './style.css';
import { NotebookRenderer } from '../../core/renderer';

// SQLTableRenderer represents SQL table renderer.
class SQLTableRenderer extends NotebookRenderer {

    public renderOutputItem(data: OutputItem, element: HTMLElement): void {
        const err = data.json() as Error;
        element.innerText = `${err.name}:\n\n${err.message}`;
        element.classList.add(style.error);
    }
}

export const activate: ActivationFunction = () => ({
    renderOutputItem(data, element) {
        new SQLTableRenderer().renderOutputItem(data, element);
    }
});
