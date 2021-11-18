/* eslint-disable @typescript-eslint/naming-convention */
import { URLSearchParams } from 'url';
import fetch, { RequestInit } from 'node-fetch';
import { AbortController } from 'node-abort-controller';

import {
    NotebookCellExecution,
    NotebookController
} from '../core/controller';
import { GoTestResolver } from './go.controller';
import { MimeTypes } from '../core/types';

enum PlaygroundEventKind {
    stdoutKind = 'stdout',
    stderrKind = 'stderr'
}

interface PlaygroundCompileResponse {
    Errors?: string;
    Events?: PlaygroundEvent[];
    IsTest?: boolean;
    Status?: number;
    TestsFailed?: number;
    VetOK?: boolean;
}

interface PlaygroundEvent {
    Delay?: number;
    Kind?: PlaygroundEventKind;
    Message?: string;
}

export class GoPlaygroundController extends NotebookController {
    private static readonly _supportedLanguages: string[] = ['go'];
    private static readonly _detail: string = 'Request to the https://play.golang.org/compile';
    private static readonly _description: string = 'Remote go execution';
    private static readonly _controllerId: string = 'go-playground';
    private static readonly _notebookType: string = 'golangbook';
    private static readonly _label: string = 'Go playground';
    private static readonly _compileURL: string = 'https://play.golang.org/compile';

    constructor() {
        super(
            GoPlaygroundController._controllerId,
            GoPlaygroundController._notebookType,
            GoPlaygroundController._label
        );
    }

    public supportedLanguages(): string[] | undefined {
        return GoPlaygroundController._supportedLanguages;
    }
    
    public supportsExecutionOrder(): boolean | undefined {
        return false;
    }
    
    public detail(): string | undefined {
        return GoPlaygroundController._detail;
    }
    
    public description(): string | undefined {
        return GoPlaygroundController._description;
    }
    
    public async execute(ex: NotebookCellExecution): Promise<boolean | undefined> {
        const fetchAbortController = new AbortController();
        ex.token.onCancellationRequested(() => fetchAbortController.abort());
        const request = GoPlaygroundController._prepareCompileBody(ex.cell.content, fetchAbortController);

        let response: PlaygroundCompileResponse | undefined;
        try {
            response = await GoPlaygroundController._sendCompileBody(request);
        } catch(e: any) {
            if (e.type && e.type === 'aborted') {
                ex.appendTextOutput(['Canceled']);
                return;
            }

            ex.appendErrorOutput(new Error(e));
            return false;
        }

        return await GoPlaygroundController._resolveCompileResponse(ex, response);
    }

    private static _prepareCompileBody(body: string, abortController: AbortController) : RequestInit {
        const encodedParams = new URLSearchParams();
        encodedParams.set('version', '2');
        encodedParams.set('body', body);
        encodedParams.set('withVet', 'true');

        return {
            headers: {
                'content-type': 'application/x-www-form-urlencoded'
            },
            method:  'POST',
            body:    encodedParams,
            signal:  abortController.signal,
        };
    }

    private static async _sendCompileBody(req: RequestInit) : Promise<PlaygroundCompileResponse> {
        const response = await fetch(GoPlaygroundController._compileURL, req);
        return await response.json() as Promise<PlaygroundCompileResponse>;
    }

    private static async _resolveCompileResponse(
        ex: NotebookCellExecution,
        resp: PlaygroundCompileResponse) : Promise<boolean | undefined> {
        if (ex.token.isCancellationRequested) {
            ex.appendTextOutput(['Canceled']);
            return;
        }

        const success = resp.Status === 0;

        if (resp.IsTest) {
            GoPlaygroundController._resolveTestResponse(ex, resp);
            return success;
        }

        if (resp.Errors && resp.Errors.length) {
            ex.appendErrorOutput(new Error(resp?.Errors));
            return false;
        }

        if (!resp.Events) {
            return success;
        }

        for (let e of resp.Events) {
            if (ex.token.isCancellationRequested) {
                ex.appendTextOutput(['Canceled']);
                return;
            }

            if (e.Delay) {
                await ex.delay(e.Delay / 1000000);
            }

            if (!e.Message) {
                continue;
            }

            // check for the clear symbol.
            if (e.Message!.charCodeAt(0) === 12) {
                ex.clearOutput();
                e.Message = e.Message.slice(1);
            }

            switch (e.Kind) {
                case PlaygroundEventKind.stderrKind:
                    ex.appendErrorOutput(new Error(e.Message));
                    break;
                case PlaygroundEventKind.stdoutKind:
                    ex.appendTextOutput([e.Message]);
                    break;
            }
        }

        return success;
    }

    private static _resolveTestResponse(
        ex: NotebookCellExecution, resp: PlaygroundCompileResponse) : void {
        if (ex.token.isCancellationRequested) {
            ex.appendTextOutput(['Canceled']);
            return;
        }

        const testMessages = resp.Events?.map(e => e.Message || '');
        ex.appendJSONOutput([
            new GoTestResolver(
                (testMessages || []).join('\n'),
                resp.TestsFailed === 0,
                resp.TestsFailed || 0
            ).resolve()
        ], MimeTypes.stdTest);
    }
}
