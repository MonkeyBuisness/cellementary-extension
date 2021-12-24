import * as vscode from 'vscode';

// MimeTypes contains available cell output mime types.
export enum MimeTypes {
    stdError    = 'application/vnd.code.notebook.error',
    stdTest     = 'application/cellementary.test',
    stdIn       = 'application/cellementary.std-in',
    plainText   = 'text/plain',
    html        = 'text/html',
    sqlTable    = 'application/cellementary.sql.table',
    markdownExt = 'application/cellementary.text.markdown'
}

// Configuration contains available extension configurations.
export enum Configuration {
    kernels       = 'kernels',
    kernelsFilter = 'kernels_filter'
}

// VScriptKind contains virtual script kind values.
export enum VScriptKind {
    js = 'javascript'
}

// ReservedCellMetaKey contains reserved cell meta keys.
export enum ReservedCellMetaKey {
    script = '$script'
}

// KnownLanguageIds contains known language identifiers. 
export enum KnownLanguageIds {
    abap            = 'abap',
    bat             = 'bat',
    bibtex          = 'bibtex',
    clojure         = 'clojure',
    coffeescript    = 'coffeescript',
    c               = 'c',
    cpp             = 'cpp',
    csharp          = 'csharp',
    css             = 'css',
    diff            = 'diff',
    dockerfile      = 'dockerfile',
    fsharp          = 'fsharp',
    gitCommit       = 'git-commit',
    gitRebase       = 'git-rebase',
    go              = 'go',
    groovy          = 'groovy',
    handlebars      = 'handlebars',
    haml            = 'haml',
    html            = 'html',
    ini             = 'ini',
    java            = 'java',
    javascript      = 'javascript',
    javascriptReact = 'javascriptreact',
    json            = 'json',
    jsonc           = 'jsonc',
    latex           = 'latex',
    less            = 'less',
    lua             = 'lua',
    makefile        = 'makefile',
    markdown        = 'markdown',
    objectiveC      = 'objective-c',
    objectiveCpp    = 'objective-cpp',
    perl            = 'perl',
    perl6           = 'perl6',
    php             = 'php',
    plaintext       = 'plaintext',
    powershell      = 'powershell',
    jade            = 'jade',
    pug             = 'pug',
    python          = 'python',
    r               = 'r',
    razor           = 'razor',
    ruby            = 'ruby',
    rust            = 'rust',
    scss            = 'scss',
    sass            = 'sass',
    shaderlab       = 'shaderlab',
    shellscript     = 'shellscript',
    slim            = 'slim',
    sql             = 'sql',
    stylus          = 'stylus',
    swift           = 'swift',
    typescript      = 'typescript',
    typescriptReact = 'typescriptreact',
    tex             = 'tex',
    vb              = 'vb',
    vue             = 'vue',
    vueHTML         = 'vue-html',
    xml             = 'xml',
    xsl             = 'xsl',
    yaml            = 'yaml'
}

// KernelRequirementCheckStatus contains kernel requirement check status.
export enum KernelRequirementCheckStatus {
    success,
    fail,
    warn
}

// KernelConfig represents kernels configuration object.
export interface KernelConfig {
    kernelType: string;
    isEnabled:  boolean;
}

// ThemeIcon represents theme icon model.
export interface ThemeIcon {
    light: string;
    dark:  string;
}

// VScript represents virtual script configuration model.
export interface VScript {

    /**
     * The virtual script kind.
     */
    kind: VScriptKind;

    /**
     * The source code of the script.
     */
    code: string;
}

// KernelCompatibilityChecker represents kernel compatibility checker interface. 
export interface KernelCompatibilityChecker {

    /**
     * Returns kernel requirements list.
     */
    requirements() : KernelRequirement[];
}

// KernelRequirement represents kernel requirement interface. 
export interface KernelRequirement {
    /**
     * The name of the requirement.
     */
    name: string;

    /**
     * Is this check should be run in async mode.
     */
    async?: boolean;

    /**
     * Starts checking requirement.
     */
    check(cToken: vscode.CancellationToken) : Promise<KernelRequirementCheckResult | undefined>;
}

// KernelRequirementCheckResult represents kernel requirement check status model.
export interface KernelRequirementCheckResult {
    /**
     * Status of the check.
     */
    status: KernelRequirementCheckStatus;

    /**
     * Desciption of the check in Markdown format.
     */
    msgMd?: string;
}
