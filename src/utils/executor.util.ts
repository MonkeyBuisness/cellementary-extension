/* eslint-disable @typescript-eslint/naming-convention */
const { spawn } = require('child_process');
import { waitUntil, WAIT_FOREVER } from 'async-wait-until';

// Executor represents class to execute commands with arguments locally.
export class Executor {
    private static readonly _cellCmdRegex = /^@::(?<cmd>.*)[\s]->(?<meta>.*)$/gm;
    private static readonly _promptMsg = 'prompt';
    private static readonly _clearMsg = 'clear';
    private static readonly _canceledErr = 'canceled';
    private _cmds: string[] = [];
    private _proc?: any;
    private _stderrStreamFinished: boolean = false;
    private _stdoutStreamFinished: boolean = false;
    private _canceled: boolean = false;
    private _env?: {[key: string]: string};
    private _stdin?: any;

    constructor(cmd: string) {
        this._cmds = cmd.split(' ');
    }

    public replaceCMD(searchCmd: string, replacementCmd: string) : Executor {
        this._cmds = this._cmds.map(c => c === searchCmd ? replacementCmd : c);
        return this;
    }

    public setENV(env: {[key: string]: string}) : Executor {
        this._env = env;
        return this;
    }

    public async execute(h?: ExecutionHandler) : Promise<void> {
        try {
            const args: any[] = (this._cmds.slice(1) || []);
            this._proc = spawn(this._cmds[0], args, {
                env: this._env || process.env
            });
            this._proc.on('error', (e: any) => {
                const err = e as Error;

                if (e.code && e.code === 'ENOENT') {
                    err.message = `could not find '${this._cmds[0]}' executable`;
                }

                h?.error(err);
            });

            const { stdout, stderr, stdin } = this._proc;
            this._stdin = stdin;
            
            await Promise.all([
                this._procStateChanged(),
                this._stdErrStream(stderr, h),
                this._stdOutStream(stdout, h)
            ]);
        } catch (e: any) {
            const err = e as Error;
            if (err.name !== Executor._canceledErr) {
                h?.error(err);
            }
        } finally {
            if (this._canceled) {
                h?.canceled();
            }
            if (this._stdin) {
                this._stdin.end();
            }
        }
    }

    public async cancel(signal: string = 'SIGINT') : Promise<void> {
        this._canceled = true;
        this._proc?.kill(signal);
    }

    private async _stdErrStream(stderr: any, h?: ExecutionHandler) : Promise<void> {
        for await (const err of stderr) {
            if (!err) {
                continue;
            }

            h?.error(new Error(err.toString()));
        }
        this._stderrStreamFinished = true;
    }

    private async _stdOutStream(stdout: any, h?: ExecutionHandler) : Promise<void> {
        for await (const data of stdout) {
            if (!data) {
                continue;
            }
            const out = data.toString().split('\n');
            
            let outChunks: string[] = [];
            for (let chunk of out) {
                const execArr = Executor._cellCmdRegex.exec(chunk.trim());
                const cmd = (execArr?.groups || {})['cmd'];
                let meta = (execArr?.groups || {})['meta'];
                Executor._cellCmdRegex.lastIndex = 0;
                
                switch (cmd) {
                    case Executor._clearMsg:
                        if (outChunks.length) {
                            h?.output(outChunks.join('\n'));
                            outChunks = [];
                        }

                        if (h && h.clear) {
                            await h.clear();
                        }
                        break;
                    case Executor._promptMsg:
                        if (outChunks.length) {
                            h?.output(outChunks.join('\n'));
                            outChunks = [];
                        }

                        if (meta) {
                            meta = meta.trim();
                        }
                        await this._prompt(meta, h);
                        break;
                    default:
                        outChunks.push(chunk);
                }
            }
            if (outChunks.length) {
                h?.output(outChunks.join('\n'));
            }
        }

        this._stdoutStreamFinished = true;
    }

    private async _procStateChanged() : Promise<void> {
        await waitUntil(() => (this._canceled)
            || (this._stderrStreamFinished && this._stdoutStreamFinished), {
            timeout: WAIT_FOREVER
        });
        const err = new Error();
        err.name = Executor._canceledErr;
        throw err;
    }

    private async _prompt(prompt?: string, h?: ExecutionHandler) : Promise<void> {
        if (!this._stdin || !h || !h.input) {
            return;
        }

        const data = await h.input(prompt);
        if (data) {
            this._stdin.write(`${data}\n`);
        }
    }
}

// ExecutionHandler describes execution handler interface.
export interface ExecutionHandler {
    canceled() : void;
    error(err: Error) : void;
    output(out: string) : void;
    clear?() : Promise<void>;
    input?(prompt?: string) : Promise<string | undefined>;
}
