declare module "column-resizer" {
  interface ColumnResizerOptions {
    liveDrag?: boolean;
    draggingClass?: string;
    gripInnerHtml?: string;
    minWidth?: number;
    headerOnly?: boolean;
    hoverCursor?: string;
    dragCursor?: string;
    resizeMode?: "fit" | "overflow" | "flex";
    widths?: number[];
    partialRefresh?: boolean;
    onResize?: (() => void) | boolean;
    [key: string]: any;
  }

  interface ColumnResizerInstance {
    reset(options: { disable: boolean; onResize?: () => void; partialRefresh?: boolean; headerOnly?: boolean }): void;
    onResize: () => void;
  }

  class ColumnResizer implements ColumnResizerInstance {
    constructor(table: HTMLElement, options?: ColumnResizerOptions);
    reset(options: { disable: boolean; onResize?: () => void; partialRefresh?: boolean; headerOnly?: boolean }): void;
    onResize: () => void;
  }

  export default ColumnResizer;
}
