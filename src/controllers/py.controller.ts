import { v4 as uuid4 } from 'uuid';
import { spawn } from "child_process";
import { CellMetadataField, Contributor, NotebookCellExecution, NotebookController, OnControllerInfo } from "../core/controller";
import * as UniqueFileName from 'uniquefilename';
import path = require('path');
import { tmpdir } from 'os';
import * as fs from 'fs';


export class PyController extends NotebookController implements OnControllerInfo {
    private static readonly _supportedLanguages: string[] = ['python'];
    private static readonly _detail: string = 'Run python code on local machine';
    private static readonly _description: string = 'Local python execution';
    private static readonly _controllerId: string = 'py-local';
    private static readonly _notebookType: string = 'pythonbook';
    private static readonly _label: string = 'Python Local';
    private static readonly _execMeta: string = 'execution';
    private static readonly _execFileArg: string = '';
    private static readonly _defaultExecutionCmd: string = `python`;

    constructor() {
        super(
            PyController._controllerId,
            PyController._notebookType,
            PyController._label,
        );
    }

    public supportedLanguages(): string[] | undefined {
        return PyController._supportedLanguages;
    }

    public supportsExecutionOrder(): boolean | undefined {
        return false;
    }

    public detail(): string | undefined {
        return PyController._detail;
    }

    public description(): string | undefined {
        return PyController._description;
    }

    public contributors(): Contributor[] | undefined {
        return [
            {
                name:  'Artsem Hutarau',
                email: 'gutorov.artem@yandex.ru',
                url:   'https://github.com/MonkeyBuisness'
            },
            {
                name: 'Raman H',
                email: [
                    'e', 'm', '.', 'm',
                    'p', '@', 'h', '.',
                    'n', 'a', 'm', 'a',
                    'r'
                ].reverse().join(''),
                url: 'https://github.com/duckyou',
            },
        ];
    }

    public icon(): string | undefined {
        return 'py-local.png';
    }

    public gettingStartedGuide(): string | undefined {
        return 'py-local.md';
    }

    public metadataFields(): CellMetadataField[] | undefined {
        return [
            {
                key: PyController._execMeta,
                default: PyController._defaultExecutionCmd,
                description: `where {${PyController._execFileArg}} is the path to the temporary file to execute`,
            }
        ];
    }

    public async execute(ex: NotebookCellExecution): Promise<boolean | undefined> {
        let execCmd: string = (ex.cell.metadata || {})[PyController._execMeta];
        if (!execCmd) {
            execCmd = PyController._defaultExecutionCmd;
        }

        // save to tmp file
        const tmpFileName = `notebook.${uuid4()}.py`;
        const tmpFile = await UniqueFileName.get(path.join(tmpdir(), tmpFileName));
        fs.writeFileSync(tmpFile, ex.cell.content);
        execCmd = [execCmd, tmpFile].join(' ');

        // exec command
        let success: boolean | undefined;
        const commands = execCmd.split(' ');
        let process: any = undefined;
        try {
            process = spawn(commands[0], commands.slice(1) || []);
            const {stdout, stderr} = process;

            ex.token.onCancellationRequested(() => {
                process.kill();
            });

            for await (const out of stdout) {
                if (process.killed) {
                    break;
                }
                if (!out) {
                    continue;
                }
                let msg = out.toString();

                // check for the clear symbol.
                if (msg.charCodeAt(0) === 12) {
                    ex.clearOutput();
                    msg = msg.slice(1);
                }

                ex.appendTextOutput([msg]);
            }

            for await (const err of stderr) {
                if (process.killed) {
                    break;
                }

                if (!err) {
                    continue;
                }

                ex.appendErrorOutput([new Error(err.toString())]);
                success = false;
            }
        } catch(err: any) {
            const error = err as Error;
            ex.appendErrorOutput([error]);
            success = false;
        } finally {
            if (process?.killed) {
                ex.appendTextOutput(['Canceled']);
            }
            fs.unlinkSync(tmpFile);
        }

        if (!process?.killed && success === undefined) {
            success = true;
        }

        return success;
    }

}