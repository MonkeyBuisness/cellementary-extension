import { ActivationFunction, OutputItem } from 'vscode-notebook-renderer';

import * as style from './style.css';
import { NotebookRenderer } from '../../core/renderer';

// StdTextRenderer represents standart text renderer.
class StdTextRenderer extends NotebookRenderer {

    public renderOutputItem(data: OutputItem, element: HTMLElement): void {
        const result = data.text();
        element.innerText = result;
        element.classList.add(style.result);
    }
}

export const activate: ActivationFunction = () => ({
    renderOutputItem(data, element) {
        new StdTextRenderer().renderOutputItem(data, element);
    }
});
