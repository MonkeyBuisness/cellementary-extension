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
     * Test execution time in milliseconds.
     */
    time?: number;

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
    testsFailed?: number;
    
    /**
     * Result test status (FAIL or PASS).
     */
    resultStatus: TestStatus;

    /**
     * Tests list.
     */
    tests: TestResult[];
}

export function testStatusName(status: TestStatus) : string {
    switch (status) {
        case TestStatus.fail:
            return '⤫ Fail';
        case TestStatus.pass:
            return '✔ Pass';
    }

    return '';
}
