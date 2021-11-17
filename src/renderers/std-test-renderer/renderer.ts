import { ActivationFunction, OutputItem } from 'vscode-notebook-renderer';

import * as style from './style.css';
import { NotebookRenderer } from '../../core/renderer';
import { StdTestResult, TestResult, TestStatus, testStatusName } from './types';

// StdTestRenderer represents standart test renderer.
class StdTestRenderer extends NotebookRenderer {
    private static readonly _nextCheckOffset = 16;

    constructor(private document: Document) {
        super();
    }

    public renderOutputItem(data: OutputItem, element: HTMLElement): void {
        const test = data.json() as StdTestResult;

        // display failed tests count.
        if (test.testsFailed !== undefined) {
            const testsFailedBlock = this.document.createElement('p');
            testsFailedBlock.innerText = `Tests failed: ${test.testsFailed}`;
            testsFailedBlock.classList.add(style.failedNumber);
            element.appendChild(testsFailedBlock);
        }

        // display result status.
        const statusBlock = this.document.createElement('p');
        statusBlock.innerText = 'Status: ';
        const statusTextBlock = this.document.createElement('span');
        statusTextBlock.innerText = testStatusName(test.resultStatus);
        statusTextBlock.classList.add(test.resultStatus === TestStatus.fail ? style.fail : style.pass);
        statusBlock.appendChild(statusTextBlock);
        element.appendChild(statusBlock);

        // display test checks.
        const checksBlock = this.document.createElement('div');
        this._resolveTestChecks(test.tests, checksBlock);
        element.appendChild(checksBlock);
    }

    private _resolveTestChecks(tests: TestResult[], parentBlock: HTMLElement, checkOffset: number = 0) : void {
        tests.forEach(t => {
            const testBlock = this.document.createElement('div');
            testBlock.classList.add(style.check);
            testBlock.style.marginLeft = `${checkOffset}px`;

            // test status.
            const testStatusBlock = this.document.createElement('span');
            testStatusBlock.innerText = testStatusName(t.status);
            testStatusBlock.classList.add(t.status === TestStatus.fail ? style.fail : style.pass);

            // test name.
            const testNameBlock = this.document.createElement('span');
            testNameBlock.innerText = t.name;
            testNameBlock.classList.add(style.testName);
            // test message.
            if (t.msg) {
                testNameBlock.classList.add(style.testMsg);
                testNameBlock.title = t.msg;
            }

            testBlock.append(testStatusBlock, testNameBlock);

            // test time.
            if (t.time !== undefined) {
                const testTimeBlock = this.document.createElement('span');
                const sec = t.time / 1000;
                const ms = t.time % 1000;
                testTimeBlock.innerText = `(${sec}.${ms}s)`;
                testTimeBlock.classList.add(style.testTime);
                testBlock.appendChild(testTimeBlock);
            }

            parentBlock.appendChild(testBlock);

            if (t.children && t.children.length !== 0) {
                this._resolveTestChecks(t.children, parentBlock, checkOffset + StdTestRenderer._nextCheckOffset);
            }
        });
    }
}

export const activate: ActivationFunction = () => ({
    renderOutputItem(data, element) {
        new StdTestRenderer(element.ownerDocument).renderOutputItem(data, element);
    }
});
