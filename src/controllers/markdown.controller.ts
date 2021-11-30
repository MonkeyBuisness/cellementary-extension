import {
    MetadataField,
    Contributor,
    NotebookCellExecution,
    NotebookController,
    OnControllerInfo
} from "../core/controller";
import { KnownLanguageIds, MimeTypes } from '../core/types';

// MarkdownController represents class implementation for interpreting Markdown locally.
export class MarkdownController extends NotebookController implements OnControllerInfo {
    private static readonly _supportedLanguages: string[] = [KnownLanguageIds.markdown];
    private static readonly _detail: string = 'Display markdown';
    private static readonly _description: string = 'Interpreting and displaying markdown text';
    private static readonly _controllerId: string = 'md-basic';
    private static readonly _notebookType: string = 'mdbook';
    private static readonly _label: string = 'Markdown Basic';

    constructor() {
        super(
            MarkdownController._controllerId,
            MarkdownController._notebookType,
            MarkdownController._label
        );
    }

    public supportedLanguages(): string[] | undefined {
        return MarkdownController._supportedLanguages;
    }

    public supportsExecutionOrder(): boolean | undefined {
        return false;
    }

    public detail(): string | undefined {
        return MarkdownController._detail;
    }

    public description(): string | undefined {
        return MarkdownController._description;
    }

    public async execute(ex: NotebookCellExecution): Promise<boolean | undefined> {
        ex.appendTextOutput([ex.cell.content], MimeTypes.markdownExt);
        return true;
    }

    public contributors(): Contributor[] | undefined {
        return [
            {
                name:  'Artsem Hutarau',
                email: 'gutorov.artem@yandex.ru',
                url:   'https://github.com/MonkeyBuisness'
            }
        ];
    }

    public icon(): string | undefined {
        return 'md-basic.png';
    }

    public gettingStartedGuide(): string | undefined {
        return 'md-basic.md';
    }

    public cellMetadata(): MetadataField[] | undefined {
        return;
    }

    public notebookMetadata(): MetadataField[] | undefined {
        return;
    }
}
