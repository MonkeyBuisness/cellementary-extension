import * as vscode from 'vscode';
import * as fs from 'fs';
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
import { KernelCompatibilityChecker, KernelRequirement, KernelRequirementCheckResult, KernelRequirementCheckStatus, KnownLanguageIds, MimeTypes } from '../core/types';
import { Executor } from '../utils/executor.util';
import { JSONSet, SQLTableResult } from '../renderers/sql-table-renderer/types';

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

    public static get controllerId() : string {
        return SQLiteController._controllerId;
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
            const res = await this._run(ex, dbPath);
            canceled = res.canceled;
            if (!res.canceled) {
                success = !res.err;
            }
            if (res.err) {
                throw res.err;
            }
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
        return [
            {
                key:         SQLiteController._dbPathMeta,
                description: 'path to the local sqlite db file to work with'
            }
        ];
    }

    public notebookMetadata(): MetadataField[] | undefined {
        return;
    }

    private async _run(ex: NotebookCellExecution, dbPath: string) : Promise<ExecutionResult> {
        // run command.
        const executor = new Executor(SQLiteController._execCmd)
            .replaceCMD('{db}', dbPath)
            .replaceCMD('{sql}', `/**/${ex.cell.content}`);
        ex.token.onCancellationRequested(() => {
            executor.cancel();
        });
        let canceled: boolean = false;
        const errs: Error[] = [];
        await executor.execute({
            canceled: () => {
                canceled = true;
            },
            error: (err: Error) => {
                errs.push(err);
            },
            output: (out: string) => {
                const res = SQLiteController._parseSQlTableResult(out);
                ex.appendJSONOutput(res, MimeTypes.sqlTable);
            }
        });
        
        return {
            canceled: canceled,
            err:      errs.length
                ? errs.reduce((p: Error, c: Error) => new Error(p.message += c.message))
                : undefined
        };
    }

    private static _parseSQlTableResult(data: string) : SQLTableResult[] {
        const rows = data.split('\n');
        const newTablesIndexes: number[] = [];
        rows.forEach((r, index) => {
            const columns = r.split('  ');
            const isDelimiterRow = columns.every(c => c.startsWith('-'));
            if (isDelimiterRow) {
                newTablesIndexes.push(index);
            }
        });
        const tables: SQLTableResult[] = [];
        newTablesIndexes.forEach((i, index) => {
            const tableRes: SQLTableResult = {
                columns: new JSONSet(),
                rows:    {},
            };

            const rws = rows.slice(i - 1,
                index < newTablesIndexes.length - 1 ? newTablesIndexes[index + 1] - 1 : undefined);
            let nameColumnsStr = rws[0].trim();
            const dividers = rws[1].split('  ');
            const rowsData = rws.slice(2).filter(r => r);
            dividers.forEach(d => {
                const columnName = nameColumnsStr.slice(0, d.length).trim();
                nameColumnsStr = nameColumnsStr.slice(d.length).trim();
                tableRes.columns!.add(columnName);
    
                const rowData: string[] = [];
                for (let i = 0; i < rowsData.length; i++) {
                    const data = rowsData[i].slice(0, d.length).trim();
                    rowData.push(data);
                    rowsData[i] = rowsData[i].slice(d.length).trim();
                }
                tableRes.rows![columnName] = rowData;
            });

            tables.push(tableRes);
        });

        return tables;
    }
}

interface ExecutionResult {
    canceled: boolean;
    err?:     Error;
}

export class SQLiteControllerKernelChecker implements KernelCompatibilityChecker {
    private static readonly _supportedOS: string[] = ['linux', 'win32', 'darwin'];

    requirements(): KernelRequirement[] {
        return [
            {
                name: 'Check Operating System',
                check: async (_: vscode.CancellationToken): Promise<KernelRequirementCheckResult | undefined> => {
                    const isSupported = SQLiteControllerKernelChecker._supportedOS.includes(process.platform);

                    if (!isSupported) {
                        return {
                            status: KernelRequirementCheckStatus.warn,
                            msgMd:  `\`${process.platform}\` may not be supported by this extension`,
                        };
                    }

                    return {
                        status: KernelRequirementCheckStatus.success,
                        msgMd:  `### \`${process.platform}\` detected!`
                    };
                },
            },
            {
                name: 'Check sqlite availability',
                check: async (cToken: vscode.CancellationToken): Promise<KernelRequirementCheckResult | undefined> => {
                    const executor = new Executor('sqlite3 --version');
                    cToken.onCancellationRequested(() => {
                        executor.cancel();
                    });
                    let canceled: boolean = false;
                    let errs: string = '';
                    let output: string = '';
                    await executor.execute({
                        canceled: () => {
                            canceled = true;
                        },
                        error: (err: Error) => {                
                            errs = errs.concat(err.message);
                        },
                        output: (out: string) => {
                            output = output.concat(out);
                        },
                    });

                    if (canceled) {
                        return {
                            status: KernelRequirementCheckStatus.warn,
                            msgMd:  '# Canceled',
                        };
                    }

                    if (errs.length) {
                        return {
                            status: KernelRequirementCheckStatus.fail,
                            msgMd:  `
Error to execute \`sqlite3 --version\` command:

\`\`\`
${errs}
\`\`\`

### Possible reasons

- [SQLite tool](https://www.sqlite.org/download.html) is not installed on your computer.
> Download and install SQLite tool on your machine with the steps described [here](https://www.servermania.com/kb/articles/install-sqlite/).
- Extension cannot find \`sqlite3\` executable in your system.
`,
                        };
                    }

                    const outChunks = output.split(' ');
                    const version = outChunks.length > 1 ? `v${outChunks[0]}` : output;

                    return {
                        status: KernelRequirementCheckStatus.success,
                        msgMd: `
# Success

### Found SQLite: ${version}`
                    };
                }
            }
        ];
    }
}
