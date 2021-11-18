import * as fs from 'fs';
import * as UniqueFileName from 'uniquefilename';
import { tmpdir } from 'os';
import * as path from 'path';
const { spawn } = require('child_process');

import { NotebookCellExecution, NotebookController } from "../core/controller";
import {
    StdTestResult,
    TestResult,
    TestStatus
} from "../renderers/std-test-renderer/types";
import { MimeTypes } from '../core/types';

// GoController represents class implementation for running go code locally.
export class GoController extends NotebookController {
    private static readonly _supportedLanguages: string[] = ['go'];
    private static readonly _detail: string = 'Run go code on local machine';
    private static readonly _description: string = 'Local go execution';
    private static readonly _controllerId: string = 'go-local';
    private static readonly _notebookType: string = 'golangbook';
    private static readonly _label: string = 'Go local compiler';
    private static readonly _execMeta: string = 'execution';
    private static readonly _execFileArg: string = 'xprog';
    private static readonly _defaultExecutionCmd: string = `go run {${GoController._execFileArg}}`;

    constructor() {
        super(
            GoController._controllerId,
            GoController._notebookType,
            GoController._label
        );
    }

    public supportedLanguages(): string[] | undefined {
        return GoController._supportedLanguages;
    }

    public supportsExecutionOrder(): boolean | undefined {
        return false;
    }

    public detail(): string | undefined {
        return GoController._detail;
    }

    public description(): string | undefined {
        return GoController._description;
    }

    public async execute(ex: NotebookCellExecution): Promise<boolean | undefined> {
        let execCmd: string = (ex.cell.metadata || {})[GoController._execMeta];
        if (!execCmd) {
            execCmd = GoController._defaultExecutionCmd;
        }
        execCmd = execCmd.trim();

        // save .go file into tmp dir.
        let tmpFileNamePattern = 'notebook.go';
        const isTest = execCmd.includes('go test');
        if (isTest) {
            tmpFileNamePattern = 'notebook_test.go';
        }
        const tmpFile = await UniqueFileName.get(path.join(tmpdir(), tmpFileNamePattern));
        fs.writeFileSync(tmpFile, ex.cell.content);
        execCmd = execCmd.replace(`{${GoController._execFileArg}}`, tmpFile);
        let testResponse: string = '';

        // exec command.
        let success: boolean | undefined;
        const commands = execCmd.split(' ');
        let proc: any = undefined;
        try {
            proc = spawn(commands[0], commands.slice(1) || []);
            const { stdout, stderr } = proc;

            ex.token.onCancellationRequested(() => {
                proc.kill();
            });

            for await (const data of stdout) {
                if (proc.killed) {
                    break;
                }

                if (!data) {
                    continue;
                }

                if (isTest) {
                    testResponse = testResponse.concat(data.toString());
                    continue;
                }

                ex.appendTextOutput([data.toString()]);
            }

            for await (const err of stderr) {
                if (proc.killed) {
                    break;
                }

                if (!err) {
                    continue;
                }

                ex.appendErrorOutput(new Error(err.toString()));
                success = false;
            }

            if (isTest) {
                const testResolver = new GoTestResolver(testResponse);
                const testResult = testResolver.resolve();
                success = testResult.resultStatus === TestStatus.pass;
                ex.appendJSONOutput([testResult], MimeTypes.stdTest);
            }
        } catch(e: any) {
            const err = e as Error;
            ex.appendErrorOutput(err);
            success = false;
        } finally {
            if (proc?.killed) {
                ex.appendTextOutput(['Canceled']);
            }

            fs.unlinkSync(tmpFile);
        }

        if (!proc?.killed && success === undefined) {
            success = true;
        }

        return success;
    }
}

// GoTestResolver represents class implementation for parsing and resolving golang test cases.
export class GoTestResolver {
    private static readonly _runResponse: string = '=== RUN';
    private static readonly _passResponse: string = '--- PASS:';
    private static readonly _failResponse: string = '--- FAIL:';
    private static readonly _failInfoResponse: string = 'FAIL';

    constructor(
        private testResponse: string,
        private passed?: boolean,
        private numberTestsFailed?: number
    ) {}

    public resolve(): StdTestResult {
        const testResult = {
            resultStatus: this.passed ? TestStatus.pass : TestStatus.fail,
            tests:        [],
            testsFailed:  this.numberTestsFailed,
        } as StdTestResult;

        const testRows = this.testResponse.split('\n');
        let lastAddedTest: TestResult | undefined;
        let testsFailed: number = 0;
        testRows.forEach(r => {
            r = r.trim();

            // check for FAIL.
            if (r.startsWith(GoTestResolver._failInfoResponse)) {
                // ignore fail additional message.
                return;
            }

            // check for === RUN.
            if (r.startsWith(GoTestResolver._runResponse)) {
                r = r.slice(GoTestResolver._runResponse.length).trim();

                const testNames = r.split('/');
                let testNode = testResult.tests;
                testNames.forEach(tn => {
                    let test = testNode.find(t => t.name === tn);
                    if (!test) {
                        test = {
                            name:     tn,
                            children: [],
                            status:   TestStatus.fail, // by default
                        } as TestResult;
                        testNode.push(test);
                        lastAddedTest = test;
                    }
                    testNode = test.children || [];
                });

                return;
            }

            // check for --- PASS or --- FAIL.
            const isPassCheck = r.startsWith(GoTestResolver._passResponse);
            const isFailCheck = r.startsWith(GoTestResolver._failResponse);
            if (isPassCheck || isFailCheck) {
                let status = isPassCheck ? TestStatus.pass : TestStatus.fail;
                if (this.numberTestsFailed === undefined && isFailCheck) {
                    testsFailed++;
                }

                const testCheck = r.split(':').pop()?.trim().split(' ');
                if (!testCheck || testCheck.length !== 2) {
                    return;
                }

                const testTime = Math.trunc(parseFloat(testCheck[1].slice(1, -2)) * 1000);
                const testNames = testCheck[0].split('/');
                let testNode = testResult.tests;
                let test: TestResult | undefined;
                testNames.forEach(tn => {
                    test = testNode.find((t: TestResult) => t.name === tn);
                    if (test) {
                        testNode = test.children || [];
                    }
                });
                if (!test) {
                    return;
                }
                test.status = status;
                test.time = testTime;

                return;
            }

            // check for additional test info.
            if (lastAddedTest) {
                lastAddedTest.msg = (lastAddedTest.msg || '').concat(r);
            }
        });

        if (this.numberTestsFailed === undefined) {
            testResult.testsFailed = testsFailed;
        }

        if (this.passed === undefined) {
            testResult.resultStatus = testResult.testsFailed ? TestStatus.fail : TestStatus.pass;
        }

        return testResult;
    }
}
