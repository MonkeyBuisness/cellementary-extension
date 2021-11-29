import { ActivationFunction, OutputItem } from 'vscode-notebook-renderer';

import * as style from './style.css';
import { NotebookRenderer } from '../../core/renderer';
import { SQLTableResult } from './types';

// SQLTableRenderer represents SQL table renderer.
class SQLTableRenderer extends NotebookRenderer {
    private static readonly _defaultResultTableName = 'Result';

    constructor(private document: Document) {
        super();
    }

    public renderOutputItem(data: OutputItem, element: HTMLElement): void {
        const table = data.json() as SQLTableResult;
        const tableName = table.name || SQLTableRenderer._defaultResultTableName;
        
        // create table name node.
        const tableNameBlock = this.document.createElement('div');
        tableNameBlock.innerText = tableName;
        tableNameBlock.classList.add(style.tableName);
        element.appendChild(tableNameBlock);

        // create table node.
        const tableBlock = this.document.createElement('table');
        tableBlock.classList.add(style.table);
        const trColumnsBlock = this.document.createElement('tr');
        tableBlock.appendChild(trColumnsBlock);
        const rows: {[column: string]: HTMLElement[]} = {};
        table.columns?.forEach(c => {
            const thBlock = this.document.createElement('th');
            thBlock.innerText = c;
            trColumnsBlock.appendChild(thBlock);
            rows[c] = (table.rows || {})[c].map(r => {
                const td = this.document.createElement('td');
                td.innerText = r;
                return td;
            });
        });
        const rowsArr: HTMLElement[][] = Object.entries(rows)
            .map(([key, value]) => value.map(v => v));
        const maxRowSize = rowsArr.reduce((p, c) => p.length > c.length ? p : c).length;
        for (let i = 0; i < maxRowSize; i++) {
            const row = rowsArr.map((r) => r.length > i ? r[i] : this.document.createElement('td'));
            const rowBlock = this.document.createElement('tr');
            rowBlock.append(...row);
            tableBlock.appendChild(rowBlock);
        }
        element.appendChild(tableBlock);
    }
}

export const activate: ActivationFunction = () => ({
    renderOutputItem(data, element) {
        new SQLTableRenderer(element.ownerDocument).renderOutputItem(data, element);
    }
});
