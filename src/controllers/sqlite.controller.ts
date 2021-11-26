import * as fs from 'fs';
import * as UniqueFileName from 'uniquefilename';
import { tmpdir } from 'os';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

import {
    MetadataField,
    Contributor,
    NotebookCellExecution,
    NotebookController,
    OnControllerInfo
} from "../core/controller";
import { KnownLanguageIds, MimeTypes } from '../core/types';
import { Executor } from '../utils/executor.util';
import { escapeString, EscapeSymol } from '../utils/string.util';

// SQLiteController represents class implementation for running SQLite code locally.
export class SQLiteController extends NotebookController implements OnControllerInfo {
    private static readonly _supportedLanguages: string[] = [KnownLanguageIds.sql];
    private static readonly _detail: string = 'Execute SQLite code';
    private static readonly _description: string = 'Execute SQLite code locally';
    private static readonly _controllerId: string = 'sqlite';
    private static readonly _notebookType: string = 'sqlitebook';
    private static readonly _label: string = 'SQLite';
    private static readonly _execCmd: string = "sqlite3 {db} -header -column {sql}";
    private static readonly _dbPathMeta: string = 'db-path';

    constructor() {
        super(
            SQLiteController._controllerId,
            SQLiteController._notebookType,
            SQLiteController._label
        );
    }

    public supportedLanguages(): string[] | undefined {
        return SQLiteController._supportedLanguages;
    }

    public supportsExecutionOrder(): boolean | undefined {
        return false;
    }

    public detail(): string | undefined {
        return SQLiteController._detail;
    }

    public description(): string | undefined {
        return SQLiteController._description;
    }

    public async execute(ex: NotebookCellExecution): Promise<boolean | undefined> {
        // create path to the tmp db file if not provided.
        let dbPath = (ex.cell.metadata || {})[SQLiteController._dbPathMeta];
        const isDBPathProvided: boolean = dbPath;
        const uuid = uuidv4();
        if (!isDBPathProvided) {
            dbPath = path.join(tmpdir(), `${uuid}.db`);
        }

        // run SQLite code.
        let canceled: boolean = false;
        let success: boolean | undefined;
        try {
            canceled = await this._run(ex, dbPath);
            success = true;
        } catch (e: any) {
            ex.appendErrorOutput([e as Error]);
            success = false;
        } finally {
            if (!isDBPathProvided && fs.existsSync(dbPath)) {
                fs.unlinkSync(dbPath);
            }
          
            if (canceled) {
                ex.appendTextOutput(['Canceled']);
                return;
            }
        }

        return success;
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
        return 'sqlite.png';
    }

    public gettingStartedGuide(): string | undefined {
        return 'sqlite.md';
    }

    public cellMetadata(): MetadataField[] | undefined {
        return;
    }

    public notebookMetadata(): MetadataField[] | undefined {
        return;
    }

    private async _run(ex: NotebookCellExecution, dbPath: string) : Promise<boolean> {
        // run command.
        const executor = new Executor(SQLiteController._execCmd)
            .replaceCMD('{db}', dbPath)
            .replaceCMD('{sql}', ex.cell.content);
        ex.token.onCancellationRequested(() => {
            executor.cancel();
        });
        let canceled: boolean = false;
        await executor.execute({
            canceled: () => {
                canceled = true;
            },
            error: (err: Error) => {
               throw err;
            },
            output: (out: string) => {
                ex.appendTextOutput([out]);
            }
        });
        
        return canceled;
    }
}
