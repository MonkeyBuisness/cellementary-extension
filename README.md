# VSCode Cellementary extension

![cellementary-logo](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/.github/assets/logo.png)

The main purpose of this extension is to store and represent kernels for working with programming languages inside [VS Code notebooks](https://code.visualstudio.com/blogs/2021/08/05/notebooks).

With this extension, you have a single interface for working with notebooks. The extension allows you to enable or disable the kernels you need. See the [User Guide](#user-guide) section for more information.

# Installation

Launch VS Code Quick Open (`Ctrl+P`), paste the following command, and press enter.
```console
ext install <TODO: add id of the extension>
```
Or follow the [marketplace](TODO://TODO_add_link_to_the_marketplace) link for more info.

# User guide

## Working with `notebooks`

Create a new file with the `.*book` extension. The list of supported notebook types you can find in the [Supported language kernels](#supported-language-kernels) section.

Create a `code` cell (click the `+Code` button) and paste any code.

> If you need to add description to this code, you can create a `markdown` cell (click the `+Markdown` button) and paste any markdown text.

Select a kernel that supports this type of code and run the code cell to test it.

![how-to-use-notebook](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/.github/assets/guides/how-to-use-notebook.gif)

Most cell types support `metadata`. Within the metadata, you can provide specific fields that allow you to execute cell code in different ways.

You can also provide specific metadata for the notebook itself to change the way it interprets the contents of all cells inside.

> NOTE: each notebook type supports its own metadata field types (for notebooks and cells). To see what fields you can provide, open the `Kernel Information` window from the [Kernel Manager](#kernel-manager) pane.

![work-with-notebook-metadata](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/.github/assets/guides/work-with-notebook-metadata.gif)

## Managing kernels

To manage extension kernels (enable / disable / display info, etc) you need to open the [Kernel Manager](#kernel-manager) extension panel. 

### Kernel Manager

This panel allows you to manage installed kernels and view information about kernel usage.

![work-with-kernel-manager](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/.github/assets/guides/work-with-kernel-manager.gif)

# Supported language kernels

| Language            | Notebook Types | Supported Kernels |
|---	              |---             |---                |
| CSS                 | `htmlbook`     | [DHTML](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/docs/kernels/dhtml.md) |
| Go                  | `gobook`       | [Go Local](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/docs/kernels/go-local.md)<br />[Go Playground](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/docs/kernels/go-playground.md) |
| HTML                | `htmlbook`     | [DHTML](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/docs/kernels/dhtml.md) |
| Java                | `javabook`     | [Java One](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/docs/kernels/java-one.md)<br />[Java Local](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/docs/kernels/java-local.md)
| JavaScript          | `htmlbook`     | [DHTML](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/docs/kernels/dhtml.md) |
| SQL                 | `sqlitebook`   | [SQLite](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/docs/kernels/sqlite.md) |

# Release Notes

## [0.4.0]

- Added kernel to work with `htmlbook` notebooks ([DHTML](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/docs/kernels/dhtml.md))
- Added kernel to work with `javabook` notebooks ([Java One](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/docs/kernels/java-one.md) and [Java Local](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/docs/kernels/java-local.md))
- Added kernel to work with `gobook` notebooks ([Go Local](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/docs/kernels/go-local.md) and [Go Playground](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/docs/kernels/go-playground.md))
- Added kernel to work with `sqlitebook` notebooks ([SQLite](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/docs/kernels/sqlite.md))

# Contributing

If you want to improve this extension or fix a found bug, please follow this [guide](https://github.com/MonkeyBuisness/cellementary-extension/blob/master/docs/contributing.md).
