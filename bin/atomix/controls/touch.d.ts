import { Direction, Terminable } from "../../lib/common.js";
import { ControlHost } from "./controls.js";
export declare class TouchControl implements Terminable {
    private readonly host;
    private readonly terminator;
    private controlling;
    constructor(host: ControlHost);
    terminate(): void;
    installUserInput(): void;
    resolveDirection(x: number, y: number): Direction;
}
