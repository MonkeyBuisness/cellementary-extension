# MySQL

### MySQL kernel allows you to run `SQL` scrips using the `mysql` client installed on your local machine.

Every time you run a cell with code, it executes the

```console
$ mysql -X -h {host} -P {port} -u {user} -D {db} -e {sql}
```
commands on your local machine.

## Download and install MySQL

Download and install MySQL tool on your machine with the steps described here:
- [Windows](https://dev.mysql.com/doc/mysql-installation-excerpt/5.7/en/windows-installation.html)
- [Linux](https://dev.mysql.com/doc/mysql-installation-excerpt/5.7/en/linux-installation.html)
- [macOS](https://dev.mysql.com/doc/mysql-installation-excerpt/5.7/en/macos-installation.html)

> If you are using Windows (7/8/10/11), please don't forget to add folder with `mysql` binaries to the system `PATH` environment variable. More info you find read in this [article](https://dev.mysql.com/doc/mysql-windows-excerpt/5.7/en/mysql-installation-windows-path.html).

## Example usage

- Create a file with a `.mysqlbook` extension
- Select the `MySQL` kernel in the upper right corner of the screen
- Create a new `code cell` (press `+Code` button)
- Write some `SQL` code and run it!

## Have a nice SQL!
![mysql](https://ucarecdn.com/c46b8d76-26f6-4f3a-b24e-450d469f5ddd/)
