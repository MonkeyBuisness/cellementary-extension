import { parse, ParseError, printParseErrorCode } from 'jsonc-parser';

import {
    MetadataField,
    Contributor,
    NotebookCellExecution,
    NotebookController,
    OnControllerInfo
} from "../core/controller";
import { KnownLanguageIds, MimeTypes } from '../core/types';

// JSONController represents class implementation for validating and interpreting JSON locally.
export class JSONController extends NotebookController implements OnControllerInfo {
    private static readonly _supportedLanguages: string[] = [
        KnownLanguageIds.json,
        KnownLanguageIds.jsonc,
    ];
    private static readonly _detail: string = 'Display and validate JSON';
    private static readonly _description: string = 'Interpreting and validating JSON content';
    private static readonly _controllerId: string = 'json';
    private static readonly _notebookType: string = 'jsonbook';
    private static readonly _label: string = 'JSON';

    constructor() {
        super(
            JSONController._controllerId,
            JSONController._notebookType,
            JSONController._label
        );
    }

    public supportedLanguages(): string[] | undefined {
        return JSONController._supportedLanguages;
    }

    public supportsExecutionOrder(): boolean | undefined {
        return false;
    }

    public detail(): string | undefined {
        return JSONController._detail;
    }

    public description(): string | undefined {
        return JSONController._description;
    }

    public async execute(ex: NotebookCellExecution): Promise<boolean | undefined> {
        const errs: ParseError[] = [];
        const parsedResult = parse(ex.cell.content, errs);
        if (errs.length === 0) {
            ex.appendJSONOutput([parsedResult]);
            return true;
        }

        const outErrs = errs.map(e => new Error(`[${e.offset};${e.offset + e.length}]: ${printParseErrorCode(e.error)}`));
        ex.appendErrorOutput(outErrs);

        return false;
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
        return 'json.png';
    }

    public gettingStartedGuide(): string | undefined {
        return 'json.md';
    }

    public cellMetadata(): MetadataField[] | undefined {
        return;
    }

    public notebookMetadata(): MetadataField[] | undefined {
        return;
    }
}
