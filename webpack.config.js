/* eslint-disable @typescript-eslint/naming-convention */
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const { DefinePlugin } = require('webpack');
const path = require('path');

const makeConfig = (argv, { entry, out, target, library = 'commonjs' }) => ({
    mode: argv.mode,
    devtool: argv.mode === 'production' ? false : 'inline-source-map',
    entry,
    target,
    output: {
        path:          path.join(__dirname, path.dirname(out)),
        filename:      path.basename(out),
        publicPath:    '',
        libraryTarget: library,
        chunkFormat:   library,
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.css'],
    },
    experiments: {
        outputModule: true,
    },
    module: {
        rules: [
            // Allow importing ts(x) files:
            {
                test:    /\.tsx?$/,
                loader:  'ts-loader',
                options: {
                    configFile:      path.join(path.dirname(entry), 'tsconfig.json'),
                    transpileOnly:   true,
                    compilerOptions: {
                        noEmit: false,
                    },
                },
            },
            // Allow importing CSS modules:
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    {
                        loader:  'css-loader',
                        options: {
                            importLoaders: 1,
                            modules:       true,
                        },
                    },
                ],
            },
        ],
    },
    plugins: [
        new ForkTsCheckerWebpackPlugin({
            typescript: {
                configFile: path.join(path.dirname(entry), 'tsconfig.json'),
            },
        }),
        new DefinePlugin({
            __webpack_relative_entrypoint_to_root__: JSON.stringify(
                path.posix.relative(path.posix.dirname(`/index.js`), '/'),
            ),
            scriptUrl: 'import.meta.url',
        }),
    ],
    externals: {
        'vscode':                'commonjs vscode',
        'util':                  'commonjs util',
        'url':                   'commonjs url',
        'node-fetch':            'commonjs node-fetch',
        'fs':                    'commonjs fs',
        'path':                  'commonjs path',
        'os':                    'commonjs os',
        'fs':                    'commonjs fs',
        'child_process':         'commonjs child_process',
        'node-abort-controller': 'commonjs node-abort-controller',
        'uuid':                  'commonjs uuid',
        'vm':                    'commonjs vm',
        'xml2js':                'commonjs xml2js'
    },
});

module.exports = (env, argv) => [
    /**
     * CORE EXTENSION CONFIGURATION.
     */
    makeConfig(argv, {
        entry:  './src/extension.ts',
        out:    './out/extension.js',
        target: 'node',
    }),

    /**
     * RENDERERS CONFIGURATION.
     */

    makeConfig(argv, {
        entry:   './src/renderers/std-error-renderer/renderer.ts',
        out:     './out/renderers/std-error-renderer.js',
        target:  'web',
        library: 'module'
    }),
    makeConfig(argv, {
        entry:   './src/renderers/std-test-renderer/renderer.ts',
        out:     './out/renderers/std-test-renderer.js',
        target:  'web',
        library: 'module'
    }),
    makeConfig(argv, {
        entry:   './src/renderers/std-text-renderer/renderer.ts',
        out:     './out/renderers/std-text-renderer.js',
        target:  'web',
        library: 'module'
    }),
    makeConfig(argv, {
        entry:   './src/renderers/std-in-renderer/renderer.ts',
        out:     './out/renderers/std-in-renderer.js',
        target:  'web',
        library: 'module'
    }),
    makeConfig(argv, {
        entry:   './src/renderers/dhtml-renderer/renderer.ts',
        out:     './out/renderers/dhtml-renderer.js',
        target:  'web',
        library: 'module'
    }),
    makeConfig(argv, {
        entry:   './src/renderers/sql-table-renderer/renderer.ts',
        out:     './out/renderers/sql-table-renderer.js',
        target:  'web',
        library: 'module'
    }),
    makeConfig(argv, {
        entry:   './src/renderers/markdown-basic-renderer/renderer.ts',
        out:     './out/renderers/markdown-basic-renderer.js',
        target:  'web',
        library: 'module'
    }),

    // INFO: insert your custom renderers here...
];
