/* eslint-disable @typescript-eslint/naming-convention */
import fetch, { RequestInit } from 'node-fetch';
import { AbortController } from 'node-abort-controller';

import {
    MetadataField,
    Contributor,
    NotebookCellExecution,
    NotebookController,
    OnControllerInfo
} from '../core/controller';
import { KnownLanguageIds } from '../core/types';

interface JavaOneCompileResponse {
    exception?: string;
    stdout?:    string;
    stderr?:    string;
}

interface JavaOneCompileRequest {
    type:        string;
    properties?: JavaOneCompileRequestProperties;
}

interface JavaOneCompileRequestProperties {
    language: string;
    files:    JavaOneCompileRequestFileProperty[];
}

interface JavaOneCompileRequestFileProperty {
    name:    string;
    content: string;
}

export class JavaOneController extends NotebookController implements OnControllerInfo {
    private static readonly _supportedLanguages: string[] = [KnownLanguageIds.java];
    private static readonly _detail: string = 'Request to the https://onecompiler.com/api/code/exec';
    private static readonly _description: string = 'Remote java execution';
    private static readonly _controllerId: string = 'java-one';
    private static readonly _notebookType: string = 'javabook';
    private static readonly _label: string = 'Java One';
    private static readonly _compileURL: string = 'https://onecompiler.com/api/code/exec';
    private static readonly _defaultFilename = 'Main.java';

    constructor() {
        super(
            JavaOneController._controllerId,
            JavaOneController._notebookType,
            JavaOneController._label
        );
    }

    public supportedLanguages(): string[] | undefined {
        return JavaOneController._supportedLanguages;
    }
    
    public supportsExecutionOrder(): boolean | undefined {
        return false;
    }
    
    public detail(): string | undefined {
        return JavaOneController._detail;
    }
    
    public description(): string | undefined {
        return JavaOneController._description;
    }
    
    public async execute(ex: NotebookCellExecution): Promise<boolean | undefined> {
        const fetchAbortController = new AbortController();
        ex.token.onCancellationRequested(() => fetchAbortController.abort());
        const request = JavaOneController._prepareCompileBody(ex.cell.content, fetchAbortController);

        let response: JavaOneCompileResponse | undefined;
        try {
            response = await JavaOneController._sendCompileBody(
                JavaOneController._compileURL, request);
        } catch(e: any) {
            if (e.type && e.type === 'aborted') {
                ex.appendTextOutput(['Canceled']);
                return;
            }

            ex.appendErrorOutput([new Error(e)]);
            return false;
        }

        return await JavaOneController._resolveCompileResponse(ex, response);
    }

    public contributors(): Contributor[] | undefined {
        return [
            {
                name:  'Artsem Hutarau',
                email: 'gutorov.artem@yandex.ru',
                url:   'https://github.com/MonkeyBuisness',
            }
        ];
    }

    public icon(): string | undefined {
        return 'java-one.png';
    }

    public gettingStartedGuide(): string | undefined {
        return 'java-one.md';
    }

    public cellMetadata(): MetadataField[] | undefined {
        return;
    }

    public notebookMetadata(): MetadataField[] | undefined {
        return;
    }

    private static _prepareCompileBody(body: string, abortController: AbortController) : RequestInit {
        const req: JavaOneCompileRequest = {
            type:       'code',
            properties: {
                language: KnownLanguageIds.java,
                files:    [
                    {
                        content: body,
                        name:    JavaOneController._defaultFilename,
                    }
                ]
            }
        };
        
        return {
            headers: {
                'Content-Type': 'application/json'
            },
            method:  'POST',
            body:    JSON.stringify(req),
            signal:  abortController.signal,
        };
    }

    private static async _sendCompileBody(url: string, req: RequestInit) : Promise<JavaOneCompileResponse> {
        const response = await fetch(url, req);
        return await response.json() as Promise<JavaOneCompileResponse>;
    }

    private static async _resolveCompileResponse(
        ex: NotebookCellExecution,
        resp: JavaOneCompileResponse) : Promise<boolean | undefined> {
        if (ex.token.isCancellationRequested) {
            ex.appendTextOutput(['Canceled']);
            return;
        }

        const success = !resp.exception;
        if (resp.stdout) {
            ex.appendTextOutput([resp.stdout]);
        }

        const err = resp.exception || resp.stderr;
        if (err) {
            ex.appendErrorOutput([new Error(err)]);
        }

        return success;
    }
}
