import * as vscode from 'vscode';
import * as fs from 'fs';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

import {
    MetadataField,
    Contributor,
    NotebookCellExecution,
    NotebookController,
    OnControllerInfo
} from "../core/controller";
import { KnownLanguageIds, MimeTypes } from '../core/types';
import path = require('path');

// JavaController represents class implementation for running Java code locally.
export class JavaController extends NotebookController implements OnControllerInfo {
    private static readonly _supportedLanguages: string[] = [KnownLanguageIds.java];
    private static readonly _detail: string = 'Compile and run java code locally';
    private static readonly _description: string = 'Local java execution';
    private static readonly _controllerId: string = 'java-local';
    private static readonly _notebookType: string = 'javabook';
    private static readonly _label: string = 'Java Local';
    private static readonly _compileCmd = 'javac -d {classDir} {path}';
    private static readonly _runCmd = 'java -cp {classDir} {pkg}.{class}';
    private static readonly _mainClassMeta: string = 'main-class';
    private static readonly _defaultMainClass: string = 'Main';

    constructor() {
        super(
            JavaController._controllerId,
            JavaController._notebookType,
            JavaController._label
        );
    }

    public supportedLanguages(): string[] | undefined {
        return JavaController._supportedLanguages;
    }

    public supportsExecutionOrder(): boolean | undefined {
        return false;
    }

    public detail(): string | undefined {
        return JavaController._detail;
    }

    public description(): string | undefined {
        return JavaController._description;
    }

    public async execute(ex: NotebookCellExecution): Promise<boolean | undefined> {
        // create tmp folder.
        const uuid = uuidv4();
        let tmpDir: string | undefined;
        try {
            tmpDir = fs.mkdirSync(path.join(tmpdir(), uuid), {
                recursive: true
            });
            if (!tmpDir) {
                throw new Error('could not create tmp file');
            }
        } catch (e: any) {
            ex.appendErrorOutput([e as Error]);
            return false;
        }

        // compile Java programm.
        try {
            await this._compile(ex, tmpDir);
        } catch (e: any) {
            ex.appendErrorOutput([e as Error]);
            fs.rmSync(tmpDir, {
                recursive: true,
                force: true
            });
            return false;
        }

        return true;
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
        return 'java-local.png';
    }

    public gettingStartedGuide(): string | undefined {
        return 'java-local.md';
    }

    public cellMetadata(): MetadataField[] | undefined {
        return;
    }

    public notebookMetadata(): MetadataField[] | undefined {
        return;
    }

    private async _compile(ex: NotebookCellExecution, tmpDir: string) : Promise<void> {
        // create .java file.
        let mainClass: string = (ex.cell.metadata || {})[JavaController._mainClassMeta];
        if (!mainClass) {
            mainClass = JavaController._defaultMainClass;
        }
        mainClass = mainClass.trim();
        const tmpFile = await path.join(tmpDir, `${mainClass}.java`);
        fs.writeFileSync(tmpFile, ex.cell.content);

        // prepare cmd command.
        const cmd = JavaController._compileCmd
            .replace('{classDir}', tmpDir)
            .replace('{path}', tmpFile);
    }
}
