import { ActivationFunction, OutputItem } from 'vscode-notebook-renderer';
const marked = require('./scripts/marked.min');

import * as style from './style.css';
import { NotebookRenderer } from '../../core/renderer';

// MarkdownBasicRenderer represents Markdown renderer.
class MarkdownBasicRenderer extends NotebookRenderer {

    public renderOutputItem(data: OutputItem, element: HTMLElement): void {
        element.classList.add(style.mdOutput);
        element.innerHTML = marked.parse(data.text());
    }
}

export const activate: ActivationFunction = () => ({
    renderOutputItem(data, element) {
        new MarkdownBasicRenderer().renderOutputItem(data, element);
    }
});
