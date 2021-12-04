import * as vscode from 'vscode';
import { TextDecoder, TextEncoder } from 'util';

// NotebookCellData represents notebook cell data that can be serialized or deserialized
// during the notebook workflow (edit, save, run, etc.).
export interface NotebookCellData {

    /**
     * Id of the cell language (like 'python', 'c', 'markdown', 'go', etc).
     */
    languageId: string;

    /**
     * Cell content.
     * In most cases, it contains the source code of the cell.
     */
    content: string;

    /**
     * A notebook cell kind.
     * if Markup: cell content contains markdown source code that is used to display.
     * If Code:   cell content contains source code that can be executed and that produces output.
     */
    kind: vscode.NotebookCellKind;

    /**
     * Any additional information about the cell.
     * May be useful inside a custom language controller to interpret the cell content correctly.
     */
    metadata?: { [key: string]: any };

    /**
     * The execution summary of the cell data.
     */
    executionSummary?: vscode.NotebookCellExecutionSummary;

    /**
     * The {@link vscode.NotebookCellOutputItem outputs} of the cell data.
     */
    outputs?: vscode.NotebookCellOutput[];
}

/**
 * Converts vscode notebool cell to the {@link NotebookCellData}-object.
 */
export function convertNotebookCellData(cell: vscode.NotebookCell) : NotebookCellData {
    return {
        content:          cell.document.getText(),
        kind:             cell.kind,
        languageId:       cell.document.languageId,
        executionSummary: cell.executionSummary,
        metadata:         cell.metadata,
        outputs:          cell.outputs.slice(0),
    };
}

// NotebookSerializer represents default serializer implementation
// to interpretate notebook cells data.
export class NotebookSerializer implements vscode.NotebookSerializer {
    
    public async deserializeNotebook(content: Uint8Array): Promise<vscode.NotebookData> {
        const contents = new TextDecoder().decode(content);

        let rawData: NotebookData | undefined;
        try {
            rawData = <NotebookData>JSON.parse(contents);
        } catch {
            return new vscode.NotebookData([]);
        }

        const cells = rawData.cells.map(item => {
            const cellData = new vscode.NotebookCellData(item.kind, item.content, item.languageId);
            cellData.metadata = item.metadata;

            return cellData;
        });

        const notebookData = new vscode.NotebookData(cells);
        notebookData.metadata = rawData.metadata;

        return notebookData;
    }

    public async serializeNotebook(data: vscode.NotebookData): Promise<Uint8Array> {
        const cells: NotebookCellData[] = data.cells
            .map<NotebookCellData>((cell: vscode.NotebookCellData) => {
                return {
                    content:          cell.value,
                    kind:             cell.kind,
                    languageId:       cell.languageId,
                    executionSummary: cell.executionSummary,
                    metadata:         cell.metadata,
                } as NotebookCellData;
            });
        const notebookData: NotebookData = {
            cells:    cells,
            metadata: data.metadata || {}
        };

        return new TextEncoder().encode(JSON.stringify(notebookData));
    }
}

// NotebookData represents notebook cell data model.
export interface NotebookData {

    /**
     * The cell data of this notebook data.
     */
    cells: NotebookCellData[];

    /**
     * Arbitrary metadata of notebook data.
     */
    metadata?: { [key: string]: any };
}
