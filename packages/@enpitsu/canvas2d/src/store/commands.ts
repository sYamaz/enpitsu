import type { Stroke } from "../types";

export interface Command {
    execute(): void
    undo(): void
}

export class AddStrokeCommand implements Command {
    constructor(
        private readonly stroke: Stroke,
        private readonly pushFn: (stroke: Stroke) => void,
        private readonly popFn: () => void
    ) {}
    execute() { this.pushFn(this.stroke) }
    undo()    { this.popFn() }
}

export class UpdateStrokesCommand implements Command {
    constructor(
        private readonly before: Stroke[],
        private readonly after: Stroke[],
        private readonly applyFn: (strokes: Stroke[]) => void
    ) {}
    execute() { this.applyFn(this.after) }
    undo()    { this.applyFn(this.before) }
}
