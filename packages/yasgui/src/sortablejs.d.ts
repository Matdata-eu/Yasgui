declare module "sortablejs" {
  interface SortableOptions {
    animation?: number;
    handle?: string;
    draggable?: string;
    ghostClass?: string;
    chosenClass?: string;
    dragClass?: string;
    filter?: string;
    preventOnFilter?: boolean;
    onEnd?: (evt: SortableEvent) => void;
    onStart?: (evt: SortableEvent) => void;
    onUpdate?: (evt: SortableEvent) => void;
    onSort?: (evt: SortableEvent) => void;
    onMove?: (evt: SortableEvent, originalEvent: any) => boolean | -1 | 1 | undefined;
    [key: string]: any;
  }

  interface SortableEvent {
    oldIndex?: number;
    newIndex?: number;
    item: HTMLElement;
    to: HTMLElement;
    from: HTMLElement;
    [key: string]: any;
  }

  class Sortable {
    constructor(el: HTMLElement, options?: SortableOptions);
    destroy(): void;
    option(name: string, value?: any): any;
    static create(el: HTMLElement, options?: SortableOptions): Sortable;
  }

  export default Sortable;
}
