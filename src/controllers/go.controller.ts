import {
    StdTestResult,
    TestResult,
    TestStatus
} from "../renderers/std-test-renderer/types";

export class GoController {
}

// GoTestResolver represents class implementation for parsing and resolving golang test cases.
export class GoTestResolver {
    private static readonly _runResponse: string = '=== RUN';
    private static readonly _passResponse: string = '--- PASS:';
    private static readonly _failResponse: string = '--- FAIL:';

    constructor(
        private testResponse: string,
        private passed: boolean,
        private numberTestsFailed: number
    ) {}

    public resolve(): StdTestResult {
        const testResult = {
            resultStatus: this.passed ? TestStatus.pass : TestStatus.fail,
            tests: [],
            testsFailed: this.numberTestsFailed,
        } as StdTestResult;

        const testRows = this.testResponse.split('\n').slice(0, -2);
        let lastAddedTest: TestResult | undefined;
        testRows.forEach(r => {
            r = r.trim();

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

        return testResult;
    }
}
