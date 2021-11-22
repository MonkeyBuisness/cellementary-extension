import { ActivationFunction, OutputItem } from 'vscode-notebook-renderer';

import * as style from './style.css';
import { NotebookRenderer } from '../../core/renderer';
import { DHTMLRendererMeta } from './types';

// DHTMLRenderer represents dynamic HTML renderer.
class DHTMLRenderer extends NotebookRenderer {
    private static readonly _defaultFrameWidth = '100%';
    private static readonly _defaultFrameHeight = 'auto';

    constructor(private document: Document) {
        super();
    }

    public renderOutputItem(data: OutputItem, element: HTMLElement): void {
        const result = data.text();

        const iframe = this.document.createElement('iframe');
        iframe.classList.add(style.contentFrame);
        iframe.setAttribute('sandbox',
            'allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-downloads');

        let frameWidth = DHTMLRenderer._defaultFrameWidth;
        let frameHeight = DHTMLRenderer._defaultFrameHeight;
        const metadata = data.metadata as { [key: string]: any };
        if (metadata) {
            const width = metadata[DHTMLRendererMeta.frameWidth];
            const height = metadata[DHTMLRendererMeta.frameHeight];
            if (width) {
                frameWidth = width;
            }
            if (height) {
                frameHeight = height;
            }
        }
        iframe.setAttribute('width', frameWidth);
        iframe.setAttribute('height', frameHeight);

        element.appendChild(iframe);
        iframe.srcdoc = result;
    }
}

export const activate: ActivationFunction = () => ({
    renderOutputItem(data, element) {
        new DHTMLRenderer(element.ownerDocument).renderOutputItem(data, element);
    }
});
