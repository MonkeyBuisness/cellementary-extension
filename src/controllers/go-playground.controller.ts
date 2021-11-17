/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { URLSearchParams } from 'url';
import fetch, { RequestInit } from 'node-fetch';

import {
    NotebookCellExecution,
    NotebookController
} from '../core/controller';
import { StdTestResult } from '../renderers/std-test-renderer/types';
import { GoTestResolver } from './go.controller';

const testMime: string = 'application/cellementary.test';

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
        const request = GoPlaygroundController._prepareCompileBody(ex.cell.content);
        const response = await GoPlaygroundController._sendCompileBody(request);

        return await GoPlaygroundController._resolveCompileResponse(ex, response);
    }

    private static _prepareCompileBody(body: string) : RequestInit {
        const encodedParams = new URLSearchParams();
        encodedParams.set('version', '2');
        encodedParams.set('body', body);
        encodedParams.set('withVet', 'true');

        return {
            headers: {
                'content-type': 'application/x-www-form-urlencoded'
            },
            method:  'POST',
            body:    encodedParams
        };
    }

    private static async _sendCompileBody(req: RequestInit) : Promise<PlaygroundCompileResponse> {
        const response = await fetch(GoPlaygroundController._compileURL, req);
        return await response.json() as Promise<PlaygroundCompileResponse>;
    }

    private static async _resolveCompileResponse(
        ex: NotebookCellExecution,
        resp: PlaygroundCompileResponse) : Promise<boolean | undefined> {
        const success = resp.Status === 0;

        if (resp.IsTest) {
            GoPlaygroundController._resolveTestResponse(ex, resp);
            return success;
        }

        if (resp.Errors && resp.Errors.length) {
            GoPlaygroundController._logError(ex, new Error(resp?.Errors));
            return false;
        }

        if (!resp.Events) {
            return success;
        }

        for (let e of resp.Events) {
            if (e.Delay) {
                await GoPlaygroundController._delay(e.Delay / 1000000);
            }

            if (!e.Message) {
                continue;
            }

            // check for the clear symbol.
            if (e.Message!.charCodeAt(0) === 12) {
                GoPlaygroundController._clearResult(ex);
                e.Message = e.Message.slice(1);
            }

            switch (e.Kind) {
                case PlaygroundEventKind.stderrKind:
                    GoPlaygroundController._logError(ex, new Error(e.Message));
                    break;
                case PlaygroundEventKind.stdoutKind:
                    GoPlaygroundController._logResult(ex, e.Message);
                    break;
            }
        }

        return success;
    }

    private static _resolveTestResponse(
        ex: NotebookCellExecution, resp: PlaygroundCompileResponse) : void {
        const testMessages = resp.Events?.map(e => e.Message || '');
        GoPlaygroundController._logTests(ex,
            new GoTestResolver(
                (testMessages || []).join('\n'),
                resp.TestsFailed === 0,
                resp.TestsFailed || 0
            ).resolve());
    }

    private static _logResult(ex: NotebookCellExecution, result: string) : void {
        ex.appendOutput(new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.text(result)
        ]));
    }

    private static _logError(ex: NotebookCellExecution, err: Error) : void {
        ex.appendOutput([
            new vscode.NotebookCellOutput([
              vscode.NotebookCellOutputItem.error(err)
            ])
        ]);
    }

    private static _clearResult(ex: NotebookCellExecution) : void {
        ex.clearOutput();
    }

    private static _logTests(ex: NotebookCellExecution, test: StdTestResult) : void {
        ex.appendOutput(new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.json(test, testMime)
        ]));
    }

    private static _delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
