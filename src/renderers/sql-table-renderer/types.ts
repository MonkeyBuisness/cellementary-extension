export class JSONSet<T> extends Set<T> {
    public toJSON() : T[] {
        return [...this];
    }
}

export interface SQLTableResult {
    name?:    string;
    columns?: JSONSet<string>;
    rows?:    { [column: string]: string[] };
}
