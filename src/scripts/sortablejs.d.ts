declare module 'sortablejs' {
    interface SortableOptions {
        group?: string | { name: string; pull?: boolean | string; put?: boolean | string[] };
        animation?: number;
        handle?: string;
        draggable?: string;
        ghostClass?: string;
        chosenClass?: string;
        dragClass?: string;
        fallbackOnBody?: boolean;
        swapThreshold?: number;
        onEnd?: (evt: SortableEvent) => void;
    }

    interface SortableEvent {
        item: HTMLElement;
        from: HTMLElement;
        to: HTMLElement;
        oldIndex?: number;
        newIndex?: number;
    }

    class Sortable {
        static create(el: HTMLElement, options?: SortableOptions): Sortable;
        destroy(): void;
    }

    export default Sortable;
}
