import { ActivationFunction, OutputItem } from 'vscode-notebook-renderer';

import * as style from './style.css';
import { NotebookRenderer } from '../../core/renderer';

// TestStatus represents test status: failed or passed.
export enum TestStatus {
    fail = "FAIL",
    pass = "PASS"
}

// TestResult represents test result.
export interface TestResult {

    /**
     * Test name.
     */
    name: string;

    /**
     * Test status (FAIL or PASS).
     */
    status: TestStatus;

    /**
     * Test additional message.
     */
    msg?: string;

    /**
     * Children tests.
     */
    children?: TestResult[];
}

// StdTestResult represents standart test result object for std-test-renderer. 
export interface StdTestResult {
    
    /**
     * Number of failed tests.
     */
    testsFailed: number;
    
    /**
     * Result test status (FAIL or PASS).
     */
    resultStatus: TestStatus;

    /**
     * Tests list.
     */
    tests: TestResult[];
}

// StdTestRenderer represents standart test renderer.
class StdTestRenderer extends NotebookRenderer {

    public renderOutputItem(data: OutputItem, element: any): void {
        const err = data.json() as StdTestResult;
        //element.innerText = `${err.name}:\n\n${err.message}\nStack:\n\n${err.stack}`;
        //element.classList.add(style.error);
    }
}

export const activate: ActivationFunction = () => ({
    renderOutputItem(data, element) {
        new StdTestRenderer().renderOutputItem(data, element);
    }
});
