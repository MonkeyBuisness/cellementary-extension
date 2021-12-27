import * as vscode from 'vscode';
import * as fs from 'fs';
import { platform, tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

import {
    MetadataField,
    Contributor,
    NotebookCellExecution,
    NotebookController,
    OnControllerInfo
} from "../core/controller";
import { KernelCompatibilityChecker, KernelRequirement, KernelRequirementCheckResult, KernelRequirementCheckStatus, KnownLanguageIds, MimeTypes } from '../core/types';
import path = require('path');
import { Executor } from '../utils/executor.util';

// JavaController represents class implementation for running Java code locally.
export class JavaController extends NotebookController implements OnControllerInfo {
    private static readonly _supportedLanguages: string[] = [KnownLanguageIds.java];
    private static readonly _detail: string = 'Compile and run java code locally';
    private static readonly _description: string = 'Local java execution';
    private static readonly _controllerId: string = 'java-local';
    private static readonly _notebookType: string = 'javabook';
    private static readonly _label: string = 'Java Local';
    private static readonly _compileCmd = 'javac -d {classDir} -cp {classDir} {path}';
    private static readonly _runCmd = 'java -cp {classDir} {pkg}{class}';
    private static readonly _fileNameMeta: string = 'file-name';
    private static readonly _defaultFileName: string = 'Main';
    private static readonly _pkgNameRegex: RegExp = RegExp('package\\s+([\\w\\.]+);');
    private static readonly _isExecutableClassMeta: string = 'is-executable';
    private static readonly _importMeta: string = 'import';
    private static readonly _javaFileExt: string = '.java';

    constructor() {
        super(
            JavaController._controllerId,
            JavaController._notebookType,
            JavaController._label
        );
    }

    public static get controllerId() : string {
        return JavaController._controllerId;
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
        // check if cell is executable.
        const isExecutableMeta = (ex.cell.metadata || {})[JavaController._isExecutableClassMeta];
        const isExecutableCell = !isExecutableMeta || isExecutableMeta === 'true';
        if (!isExecutableCell) {
            return;
        }

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

        // detect main class name.
        const mainClass: string = JavaController._fileName(ex.cell.metadata);

        // create .java files.
        let tmpFiles: string[] = [];
        try {
            tmpFiles = this._createJavaFiles(ex, tmpDir, mainClass);
        } catch (e: any) {
            ex.appendErrorOutput([e as Error]);
            return false;
        }

        // detect package name;
        const pkgName = JavaController._pkgName(ex.cell.content);

        // compile and run Java programm.
        let canceled: boolean = false;
        let success: boolean | undefined;
        try {
            canceled = await this._compile(ex, tmpDir, ...tmpFiles);
            if (!canceled) {
                canceled = await this._run(ex, tmpDir, mainClass, pkgName);
            }
            success = true;
        } catch (e: any) {
            ex.appendErrorOutput([e as Error]);
            success = false;
        } finally {
            fs.rmSync(tmpDir, {
                recursive: true,
                force: true
            });

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
        return 'java-local.png';
    }

    public gettingStartedGuide(): string | undefined {
        return 'java-local.md';
    }

    public cellMetadata(): MetadataField[] | undefined {
        return [
            {
                key:         JavaController._importMeta,
                description: 'list of imported packages divided by ;\nEx: com.pkg1;com.pkg2;com.company.pkg3'
            },
            {
                key:         JavaController._isExecutableClassMeta,
                description: 'set "true" if the cell should be compiled and run, and "false" if not',
                enum:        ['true', 'false']
            },
            {
                key:         JavaController._fileNameMeta,
                description: 'name of the java file for this class',
                default:     JavaController._defaultFileName
            },
        ];
    }

    public notebookMetadata(): MetadataField[] | undefined {
        return;
    }

    private _createJavaFiles(ex: NotebookCellExecution, tmpDir: string, mainClass: string) : string[] {
        const tmpFilesMap = new Map<string, string>();

        // add current file.
        tmpFilesMap.set(`${mainClass}.java`, ex.cell.content);

        // check if cell import another cells.
        const importMeta = (ex.cell.metadata || {})[JavaController._importMeta] as string;
        if (importMeta) {
            const packages: string[] = importMeta.split(';');
            packages.forEach(p => p.trim());
            const importCells = ex.notebook
                .getCells()
                .filter(c => c.index !== ex.cellIndex)
                .filter(c => c.metadata && c.metadata[JavaController._fileNameMeta])
                .filter(c => packages.includes(JavaController._pkgName(c.document.getText()) || ''));

            importCells.forEach(c => {
                const cellMainClass = JavaController._fileName(c.metadata);
                tmpFilesMap.set(`${cellMainClass}.java`, c.document.getText());
            });
        }

        const tmpFiles: string[] = [];
        tmpFilesMap.forEach((v, k) => {
            const tmpFile = path.join(tmpDir, k);
            fs.writeFileSync(tmpFile, v);
            tmpFiles.push(tmpFile);
        });

        return tmpFiles;
    }

    private async _compile(ex: NotebookCellExecution,
        tmpDir: string, ...tmpFiles: string[]) : Promise<boolean> {
        // prepare cmd command.
        const cmd = JavaController._compileCmd
            .replace(new RegExp('{classDir}', 'g'), tmpDir)
            .replace('{path}', tmpFiles.join(' '));

        // compile programm.
        const executor = new Executor(cmd);
        ex.token.onCancellationRequested(() => {
            executor.cancel();
        });
        let canceled: boolean = false;
        await executor.execute({
            canceled: () => {
                canceled = true;
            },
            error: (err: Error) => {
                err.message = err.message.replace(tmpDir + path.sep, '');
                throw err;
            },
            output: (_: string) => {}
        });

        return canceled;
    }

    private async _run(
        ex: NotebookCellExecution,
        tmpDir: string,
        mainClass: string, pkgName?: string) : Promise<boolean> {
        // prepare cmd command.
        if (pkgName) {
            pkgName += '.';
        }
        const cmd = JavaController._runCmd
            .replace('{classDir}', tmpDir)
            .replace('{pkg}', pkgName || '')
            .replace('{class}', mainClass);

        // run java programm.
        const executor = new Executor(cmd);
        ex.token.onCancellationRequested(() => {
            executor.cancel();
        });
        let canceled: boolean = false;
        await executor.execute({
            canceled: () => {
                canceled = true;
            },
            error: (err: Error) => {                
                ex.appendErrorOutput([err]);
            },
            output: (out: string) => {
                ex.appendTextOutput([out]);
            },
            input: (prompt?: string) : Promise<string | undefined> => {
                return ex.newInputCell(prompt);
            },
            clear: async () : Promise<void> => {
                ex.clearOutput();
            },
        });
        
        return canceled;
    }

    private static _pkgName(javaContent: string) : string | undefined {
        const regArray = JavaController._pkgNameRegex.exec(javaContent);
        return regArray?.find(ex => !ex.includes('package'));
    }

    private static _fileName(metadata?: { [key: string]: any }) : string {
        let fileName: string = (metadata || {})[JavaController._fileNameMeta];
        if (!fileName) {
            fileName = JavaController._defaultFileName;
        }
        fileName = fileName.trim();
        if (fileName.endsWith(JavaController._javaFileExt)) {
            fileName = fileName.slice(0, -JavaController._javaFileExt.length);
        }

        return fileName;
    }
}

export class JavaControllerKernelChecker implements KernelCompatibilityChecker {
    private static readonly _supportedOS: string[] = ['linux', 'win32', 'darwin'];

    requirements(): KernelRequirement[] {
        return [
            {
                name: 'Check Operating System',
                check: async (_: vscode.CancellationToken): Promise<KernelRequirementCheckResult | undefined> => {
                    const isSupported = JavaControllerKernelChecker._supportedOS.includes(process.platform);

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
                name: 'Check Java compiler availability',
                check: async (cToken: vscode.CancellationToken): Promise<KernelRequirementCheckResult | undefined> => {
                    const executor = new Executor('javac -version');
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

                    // WTF?!
                    if (errs.startsWith('javac ')) {
                        output = errs;
                        errs = '';
                    }

                    if (errs.length) {
                        return {
                            status: KernelRequirementCheckStatus.fail,
                            msgMd:  `
Error to execute \`javac -version\` command:

\`\`\`
${errs}
\`\`\`

### Possible reasons

- [JDK](https://www.oracle.com/java/technologies/downloads/) is not installed on your computer.
> Download and install Java on your machine with the steps described here:
> - [Windows](https://docs.oracle.com/javase/9/install/installation-jdk-and-jre-microsoft-windows-platforms.htm)
> - [macOS](https://docs.oracle.com/javase/9/install/installation-jdk-and-jre-macos.htm)
> - [Linux](https://docs.oracle.com/javase/9/install/installation-server-jre-9-linux-platforms.htm)
- Extension cannot find \`javac\` executable in your system.
> Steps to set *PATH* environment variable:
> - [Linux](https://docs.oracle.com/cd/E19062-01/sun.mgmt.ctr36/819-5418/gaznb/index.html)
> - [Windows](https://docs.oracle.com/cd/E19062-01/sun.mgmt.ctr36/819-5418/system-prep-proc-101/index.html)
`,
                        };
                    }

                    const outChunks = output.split(' ');
                    const version = outChunks.length > 1 ? `v${outChunks[1]}` : output;

                    return {
                        status: KernelRequirementCheckStatus.success,
                        msgMd: `
# Success

### Found Java compiler: ${version}`
                    };
                }
            },
            {
                name: 'Check Java executor availability',
                check: async (cToken: vscode.CancellationToken): Promise<KernelRequirementCheckResult | undefined> => {
                    const executor = new Executor('java -version');
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

                    // WTF?!
                    if (errs.startsWith('java version')) {
                        output = errs;
                        errs = '';
                    }

                    if (errs.length) {
                        return {
                            status: KernelRequirementCheckStatus.fail,
                            msgMd:  `
Error to execute \`java -version\` command:

\`\`\`
${errs}
\`\`\`

### Possible reasons

- [JDK](https://www.oracle.com/java/technologies/downloads/) is not installed on your computer.
> Download and install Java on your machine with the steps described here:
> - [Windows](https://docs.oracle.com/javase/9/install/installation-jdk-and-jre-microsoft-windows-platforms.htm)
> - [macOS](https://docs.oracle.com/javase/9/install/installation-jdk-and-jre-macos.htm)
> - [Linux](https://docs.oracle.com/javase/9/install/installation-server-jre-9-linux-platforms.htm)
- Extension cannot find \`javac\` executable in your system.
> Steps to set *PATH* environment variable:
> - [Linux](https://docs.oracle.com/cd/E19062-01/sun.mgmt.ctr36/819-5418/gaznb/index.html)
> - [Windows](https://docs.oracle.com/cd/E19062-01/sun.mgmt.ctr36/819-5418/system-prep-proc-101/index.html)
`,
                        };
                    }

                    return {
                        status: KernelRequirementCheckStatus.success,
                        msgMd: `
# Success

### ${output}`
                    };
                }
            },
        ];
    }
}
