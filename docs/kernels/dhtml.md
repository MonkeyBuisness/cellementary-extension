# Dynamic HTML

### DHTML kernel allows you to render the web page contains `html`, `css` and `js`.

## Example usage

- Create a file with a `.htmlbook` extension
- Select the `DHTML` kernel in the upper right corner of the screen
- Create a new `code cell` (press `+Code` button)
- Write some `HTML` and run it!


If you want to split `css` and `js` into separate code cells, open the `metadata` window for these cells and provide the `id` key.

Then inside the `html` cell put
```html
<!-- link://<cell-id> -->
```
comment to insert the content of the `css` code cell, or
```html
<!-- script://<cell-id> -->
```
comment to insert the content of the `javascript` code cell.
