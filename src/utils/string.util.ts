export enum EscapeSymbol {
    newline        = 0,
    carriageReturn = 1,
    doubleQuote    = 2,
    singleQuote    = 3,
    backtick       = 4
}

const allEscapeSymbols: EscapeSymbol[] = [
    EscapeSymbol.backtick,
    EscapeSymbol.carriageReturn,
    EscapeSymbol.doubleQuote,
    EscapeSymbol.newline,
    EscapeSymbol.singleQuote
];

export function escapeString(s?: string, escapeSymbols: EscapeSymbol[] = allEscapeSymbols) : string | undefined {
    let escapedString: string | undefined = s;

    escapeSymbols.forEach(s => {
        switch (s) {
            case EscapeSymbol.backtick:
                escapedString = escapedString?.replace(/`+/g, '\\`');
                break;
            case EscapeSymbol.carriageReturn:
            case EscapeSymbol.newline:
                escapedString = escapedString?.replace(/[\r\n]+/g, '\\n');
                break;
            case EscapeSymbol.doubleQuote:
                escapedString = escapedString?.replace(/"+/g, '\\"');
                break;
            case EscapeSymbol.singleQuote:
                escapedString = escapedString?.replace(/'+/g, "\\'");
                break;
        }
    });

    return escapedString;
}
