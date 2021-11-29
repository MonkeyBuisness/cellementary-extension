export enum EscapeSymol {
    newline        = 0,
    carriageReturn = 1,
    doubleQuote    = 2,
    singleQuote    = 3,
    backtick       = 4
}

const allEscapeSymbols: EscapeSymol[] = [
    EscapeSymol.backtick,
    EscapeSymol.carriageReturn,
    EscapeSymol.doubleQuote,
    EscapeSymol.newline,
    EscapeSymol.singleQuote
];

export function escapeString(s?: string, escapeSymbols: EscapeSymol[] = allEscapeSymbols) : string | undefined {
    let escapedString: string | undefined = s;

    escapeSymbols.forEach(s => {
        switch (s) {
            case EscapeSymol.backtick:
                escapedString = escapedString?.replace(/`+/g, '\\`');
                break;
            case EscapeSymol.carriageReturn:
            case EscapeSymol.newline:
                escapedString = escapedString?.replace(/[\r\n]+/g, '\\n');
                break;
            case EscapeSymol.doubleQuote:
                escapedString = escapedString?.replace(/"+/g, '\\"');
                break;
            case EscapeSymol.singleQuote:
                escapedString = escapedString?.replace(/'+/g, "\\'");
                break;
        }
    });

    return escapedString;
}
