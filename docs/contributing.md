# Contributing Guide

## Getting started

- Make sure you have the latest [VS Code](https://code.visualstudio.com/download) installed.
- Make sure you have [Node.js](https://nodejs.org/en/download/) version >= 14.
- Make sure you have [Git](https://git-scm.com/) installed.
- Install [Yeoman](https://yeoman.io/) and [VS Code Extension Generator](https://www.npmjs.com/package/generator-code) with:
```console
$ npm install -g yo generator-code
```
- Clone the extension repo on your computer:
```console
$ git clone https://github.com/MonkeyBuisness/cellementary-extension
```
- Run VS Code and open folder with this repo
- Open terminal and install dependencies:
```console
$ npm i
```
- Build extension
```console
$ npm run compile
```
- Press `F5` to run it.

## Branch naming

If you find a bug and want to fix it, create a branch named `fix/name_of_the_fix` from the `master` branch.

If you want to improve existing functionality or add completely new functionality to the extension, create the `feature/name_of_the_feature` branch from the `master` branch.

## Adding a new notebook support

> Before you get started, read the [official VS Code Notebooks API titorial](https://code.visualstudio.com/api/extension-guides/notebook).

### Adding a new serializer

By default, all notebooks use the same serializer.

You can find the source code for the default serializer [here](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/src/core/serializer.ts).

If your controller needs a different format for serializing/deserializing cells, follow these steps:
- Create a file named `<your_custom_serializer>.serializer.ts` in the `src/serializers` folder.
- Create a new class named `<CustomSerializerName>Serializer` in this file.
- Extend this class with the `vscode.NotebookSerializer` interface.
- After implementing the serializer, open `src/extension.ts` file and register your serializer in the `registerNotebookSerializers(...)` function.

### Adding a new renderer

To create a new notebook renderer, follow these steps:
- Open `package.json` file in the root of the project.
- Find the section `"notebookRenderer"` and add the new item with the following structure:
```json
{
    "id": "<your-renderer-id>",
    "entrypoint": "./out/renderers/<your-renderer-id>.js",
    "displayName": "<Your renderer display name>",
    "mimeTypes": [
        "list of supported mime types"
    ]
}
```
- Open `webpack.config.js` file in the root of the project, find `module.exports` func and add a new configuration:
```js

// INFO: insert your custom renderers here...

makeConfig(argv, {
    entry:   './src/renderers/<your-renderer-id>/renderer.ts',
    out:     './out/renderers/<your-renderer-id>.js',
    target:  'web',
    library: 'module'
}),

```
- Open the `src/core/types.ts` file and add (if necessary) a new mime types to the `MimeTypes` enum.
- Create a new folder named `<your-renderer-id>` in the `src/renderers` folder.
- Add 4 new files with the provided content:
  - `css.d.ts`:
    
    ```ts
    declare module '*.css' {
        const classes: { [className: string]: string };
        export = classes;
    }
    ```
  - `renderer.ts`
    ```ts
    // Add you renderer implementation here:
    class MyNewRenderer extends NotebookRenderer {}
    ```
  - `style.css`
    ```css
    /* add CSS classes for your renderer items here */
    .example {
        font-size: 2rem;
    }
    ```
  - `tsconfig.json`
    ```json
    {
        "compilerOptions": {
            "noEmit": true,
            "target": "ES2019",
            "rootDir": "../../",
            "module": "esnext",
            "lib": ["ES2019", "DOM"],
            "types": ["webpack-env", "vscode-notebook-renderer"],
            "sourceMap": true,
            "strict": true
        }
    }
    ```
- For testing, don't forget to rebuild the extension after modifying the `webpack.config.js` file:
```console
$ npm run compile
```

Use this [example](https://github.com/MonkeyBuisness/cellementary-extension/tree/master/src/renderers/std-error-renderer) as a reference for implementing your renderer.

### Adding a new controller

To create a new notebook controller, follow these steps:
- Open `package.json` file in the root of the project.
- Find the section `"notebooks"` and add the new item with the following structure:
```json
{
    "type": "<type of your notebook>",
    "displayName": "<Display name of your notebook>",
    "selector": [
        {
            "filenamePattern": "*.<name of the notebook>book"
        }
    ]
}
```
- Find the section `"activationEvents"` and add the 2 new lines:
```json
{
    "onNotebookEditor": "<type of your notebook>",
    "onNotebook":       "<type of your notebook>"
}
```
- If your controller uses the default serializer, open `src/extension.ts` file and add your notebook type to the `defaultSerializableNotebookTypes` array.
- Create a new file named `<type of your notebook>.controller.ts` in the `src/controllers` folder.
- Create a new class named `<CustomControllerName>Controller` in this file.
- Extend this class with the `NotebookController` class and `OnControllerInfo` interface.
- After implementing the controller, open `src/extension.ts` file and register your controller in the `registerNotebookControllers(...)` function.

Use this [example](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/src/controllers/go.controller.ts) for local code executing and this [example](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/src/controllers/go-playground.controller.ts) for cloud code executing as a reference for implementing your controller.

You can find a list of VS Code known language identifiers [here](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/docs/supported-languages.md).

## Final steps

- Update the `"version"` tag value in the `package.json` file.
- If you've added a new controller, add the `*.*book` file to the `example` folder.
- Update the `Supported language kernels` section in the `README.md` file (if necessary).
- Write your changes to the `CHANGELOG.md` file in the `[Unreleased]` section.
- Fell free to add info about you to the `"contributors"` sections in the `package.json` file.
- Create a new PR with all changes.

## Thanks!
