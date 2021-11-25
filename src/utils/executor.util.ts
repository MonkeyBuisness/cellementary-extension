/* eslint-disable @typescript-eslint/naming-convention */
const { spawn } = require('child_process');
import { waitUntil, WAIT_FOREVER } from 'async-wait-until';

// Executor represents class to execute commands with arguments locally.
export class Executor {
    private static readonly _canceledErr = 'canceled';
    private readonly _cmds: string[] = [];
    private _proc?: any;
    private _stderrStreamFinished: boolean = false;
    private _stdoutStreamFinished: boolean = false;

    constructor(cmd: string) {
        this._cmds = cmd.split(' ');
    }

    public async execute(h?: ExecutionHandler) : Promise<void> {
        try {
            this._proc = spawn(this._cmds[0], this._cmds.slice(1) || []);
            this._proc.on('error', (e: any) => {
                const err = e as Error;

                if (e.code && e.code === 'ENOENT') {
                    err.message = `could not find '${this._cmds[0]}' executable`;
                }

                h?.error(err);
            });

            const { stdout, stderr } = this._proc;
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
            if (this._proc?.killed) {
                h?.canceled();
            }
        }
    }

    public async cancel(signal: string = 'SIGINT') : Promise<void> {
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

            h?.output(data.toString());
        }
        this._stdoutStreamFinished = true;
    }

    private async _procStateChanged() : Promise<void> {
        await waitUntil(() => (this._proc?.killed)
            || (this._stderrStreamFinished && this._stdoutStreamFinished), {
            timeout: WAIT_FOREVER
        });
        const err = new Error();
        err.name = Executor._canceledErr;
        throw err;
    }
}

// ExecutionHandler describes execution handler interface.
export interface ExecutionHandler {
    canceled() : void;
    error(err: Error) : void;
    output(out: string) : void;
}
