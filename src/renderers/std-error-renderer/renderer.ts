import { ActivationFunction, OutputItem } from 'vscode-notebook-renderer';

import * as style from './style.css';
import { NotebookRenderer } from '../../core/renderer';

// StdErrorRenderer represents standart error renderer.
class StdErrorRenderer extends NotebookRenderer {

    public renderOutputItem(data: OutputItem, element: any): void {
        const err = data.json() as Error;
        element.innerText = `${err.name}:\n\n${err.message}\nStack:\n\n${err.stack}`;
        element.classList.add(style.error);
    }
}

export const activate: ActivationFunction = () => ({
    renderOutputItem(data, element) {
        new StdErrorRenderer().renderOutputItem(data, element);
    }
});
