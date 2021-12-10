/* eslint-disable @typescript-eslint/naming-convention */
const xml2js = require('xml2js');

import {
    MetadataField,
    Contributor,
    NotebookCellExecution,
    NotebookController,
    OnControllerInfo
} from "../core/controller";
import { KnownLanguageIds, MimeTypes } from '../core/types';
import { Executor } from '../utils/executor.util';
import { JSONSet, SQLTableResult } from '../renderers/sql-table-renderer/types';

// MySQLController represents class implementation for running MySQL scrips.
export class MySQLController extends NotebookController implements OnControllerInfo {
    private static readonly _supportedLanguages: string[] = [KnownLanguageIds.sql];
    private static readonly _detail: string = 'Execute MySQL script';
    private static readonly _description: string = 'Execute MySQL code using mysql client';
    private static readonly _controllerId: string = 'mysql';
    private static readonly _notebookType: string = 'mysqlbook';
    private static readonly _label: string = 'MySQL';
    private static readonly _execCmd: string = 'mysql -X -h {host} -P {port} -u {user} -D {db} -e {sql}';
    private static readonly _dbHostMeta: string = 'db-host';
    private static readonly _dbPortMeta: string = 'db-port';
    private static readonly _dbUserMeta: string = 'db-user';
    private static readonly _dbPasswordMeta: string = 'db-pass';
    private static readonly _dbNameMeta: string = 'db-name';
    private static readonly _defaultDBHost: string = 'localhost';
    private static readonly _defaultDBPort: string = '3306';
    private static readonly _defaultDBUser: string = 'root';
    private static readonly _mySQLPassEnv: string = 'MYSQL_PWD';

    constructor() {
        super(
            MySQLController._controllerId,
            MySQLController._notebookType,
            MySQLController._label
        );
    }

    public supportedLanguages(): string[] | undefined {
        return MySQLController._supportedLanguages;
    }

    public supportsExecutionOrder(): boolean | undefined {
        return false;
    }

    public detail(): string | undefined {
        return MySQLController._detail;
    }

    public description(): string | undefined {
        return MySQLController._description;
    }

    public async execute(ex: NotebookCellExecution): Promise<boolean | undefined> {
        const host = MySQLController._getValue(ex, MySQLController._dbHostMeta, MySQLController._defaultDBHost);
        const port = MySQLController._getValue(ex, MySQLController._dbPortMeta, MySQLController._defaultDBPort);
        const user = MySQLController._getValue(ex, MySQLController._dbUserMeta, MySQLController._defaultDBUser);
        const password = MySQLController._getValue(ex, MySQLController._dbPasswordMeta);
        const db = MySQLController._getValue(ex, MySQLController._dbNameMeta);
        if (!db) {
            ex.appendErrorOutput([new Error(`please provide a ${MySQLController._dbNameMeta} metadata field`)]);
            return false;
        }

        // run MySQL script.
        let canceled: boolean = false;
        let success: boolean | undefined;
        try {
            const res = await this._run(ex, host || '', port || '', db, user || '', password);
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
        return 'mysql.png';
    }

    public gettingStartedGuide(): string | undefined {
        return 'mysql.md';
    }

    public cellMetadata(): MetadataField[] | undefined {
        return [
            {
                key:         MySQLController._dbHostMeta,
                default:     MySQLController._defaultDBHost,
                description: 'database host'
            },
            {
                key:         MySQLController._dbPortMeta,
                default:     MySQLController._defaultDBPort,
                description: 'database port'
            },
            {
                key:         MySQLController._dbUserMeta,
                default:     MySQLController._defaultDBUser,
                description: 'database user name'
            },
            {
                key:         MySQLController._dbPasswordMeta,
                description: 'database user password, required if user has password',
                required:    true
            },
            {
                key:         MySQLController._dbNameMeta,
                description: 'database name',
                required:    true
            }
        ];
    }

    public notebookMetadata(): MetadataField[] | undefined {
        return [
            {
                key:         MySQLController._dbHostMeta,
                default:     MySQLController._defaultDBHost,
                description: 'database host\n(can be overwritten with the cell meatadata value)'
            },
            {
                key:         MySQLController._dbPortMeta,
                default:     MySQLController._defaultDBPort,
                description: 'database port\n(can be overwritten with the cell meatadata value)'
            },
            {
                key:         MySQLController._dbUserMeta,
                default:     MySQLController._defaultDBUser,
                description: 'database user name\n(can be overwritten with the cell meatadata value)'
            },
            {
                key:         MySQLController._dbPasswordMeta,
                description: 'database user password, required if user has password\n(can be overwritten with the cell meatadata value)',
                required:    true
            },
            {
                key:         MySQLController._dbNameMeta,
                description: 'database name\n(can be overwritten with the cell meatadata value)',
                required:    true
            }
        ];
    }

    private static _getValue(ex: NotebookCellExecution, key: string, defaultValue?: string) : string | undefined {
        return (ex.cell.metadata || {})[key] || (ex.notebook.metadata || {})[key] || defaultValue;
    }

    private async _run(ex: NotebookCellExecution,
        host: string, port: string,
        db: string, user: string, password?: string) : Promise<ExecutionResult> {
        // run command.
        const executor = new Executor(MySQLController._execCmd)
            .replaceCMD('{host}', host)
            .replaceCMD('{port}', port)
            .replaceCMD('{user}', user)
            .replaceCMD('{db}', db)
            .replaceCMD('{sql}', ex.cell.content)
            .setENV({
                [MySQLController._mySQLPassEnv]: password || '',
            });
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
            output: async (out: string) => {
                try {
                    const res = await MySQLController._parseSQlTableResult(out);
                    ex.appendJSONOutput(res, MimeTypes.sqlTable);
                } catch (e: any) {
                    ex.appendErrorOutput([e as Error]);
                }
            }
        });
        
        return {
            canceled: canceled,
            err: errs.length
                ? errs.reduce((p: Error, c: Error) => {
                    p.message += c.message;
                    return p;
                })
                : undefined
        };
    }

    private static async _parseSQlTableResult(data: string) : Promise<SQLTableResult[]> {
        const parser = new xml2js.Parser();
        const results = data.split('<?xml version="1.0"?>').filter(r => r);
        const tables: SQLTableResult[] = [];

        results.forEach(async r => {
            const { resultset } = await parser.parseStringPromise(r);
            const rows: any[] = resultset.row as any[];
            const tableRes: SQLTableResult = {
                columns: new JSONSet(),
                rows:    {},
            };
            rows.forEach(r => {
                const field = r.field as any[];
                field.forEach(f => {
                    const columnName: string = f.$.name;
                    tableRes.columns?.add(columnName);
                    if (!tableRes.rows![columnName]) {
                        tableRes.rows![columnName] = [];
                    }
                    tableRes.rows![columnName].push(f._);
                });
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
