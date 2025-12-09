declare module "sparql-formatter" {
  export interface SpfmtFormatter {
    format: (sparql: string, formattingMode?: string, indentDepth?: number) => string;
    parseSparql: (sparql: string) => any;
    parseSparqlAsCompact: (sparql: string) => any;
    formatAst: (ast: any, indentDepth?: number) => string;
  }

  export const spfmt: SpfmtFormatter;
}
