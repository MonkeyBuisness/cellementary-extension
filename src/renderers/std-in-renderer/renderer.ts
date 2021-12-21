import {
    ActivationFunction,
    OutputItem,
    RendererContext
} from 'vscode-notebook-renderer';

import * as style from './style.css';
import { NotebookRenderer } from '../../core/renderer';
import { StdInConfig } from './types';

// StdInRenderer represents standart input renderer.
class StdInRenderer extends NotebookRenderer {

    constructor(
        private document: Document,
        private context: RendererContext<any>) {
        super();
    }

    public renderOutputItem(item: OutputItem, element: HTMLElement): void {
        const cfg = item.json() as StdInConfig;

        const iframe = this.document.createElement('iframe');
        iframe.classList.add(style.contentFrame);
        iframe.setAttribute('sandbox',
            'allow-same-origin allow-forms allow-pointer-lock');
        element.appendChild(iframe);

        if (iframe.contentDocument) {
            const inputBlock = iframe.contentDocument?.createElement('input');
            inputBlock.placeholder = cfg.prompt || 'Put input text here and press Enter';
            iframe.contentDocument.body.appendChild(inputBlock);
            iframe.contentDocument.body.style.overflow = 'hidden';
            inputBlock.addEventListener('keypress', (e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                    if (this.context.postMessage) {
                        this.context.postMessage({
                            request: cfg.request,
                            data:    inputBlock.value.trimEnd()
                        });
                        inputBlock.disabled = true;
                    }
                }
            });
            inputBlock.focus();
            StdInRenderer._setInputStyles(inputBlock);
        }
    }

    private static _setInputStyles(input: HTMLElement) : void {
        input.style.width = '100%';
        input.style.boxSizing = 'border-box';
        input.style.padding = '6px';
    }
}

export const activate: ActivationFunction = (context) => ({
    renderOutputItem(data, element) {
        new StdInRenderer(element.ownerDocument, context).renderOutputItem(data, element);
    }
});
