declare module "sparql-formatter" {
  export interface SpfmtFormatter {
    format: (sparql: string, formattingMode?: string, indentDepth?: number) => string;
    parseSparql: (sparql: string) => unknown;
    parseSparqlAsCompact: (sparql: string) => unknown;
    formatAst: (ast: unknown, indentDepth?: number) => string;
  }

  export const spfmt: SpfmtFormatter;
}
