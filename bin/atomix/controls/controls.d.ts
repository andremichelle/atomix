import { Direction } from "../../lib/common.js";
import { AtomSprite } from "../display/sprites.js";
export interface ControlHost {
    getTargetElement(): HTMLElement;
    nearestAtomSprite(x: number, y: number): AtomSprite | null;
    showPreviewMove(movableAtom: AtomSprite, direction: Direction): any;
    hidePreviewMove(commit: boolean): any;
}
export declare class HistoryStep {
    readonly atomSprite: AtomSprite;
    readonly fromX: number;
    readonly fromY: number;
    readonly toX: number;
    readonly toY: number;
    constructor(atomSprite: AtomSprite, fromX: number, fromY: number, toX: number, toY: number);
    execute(): HistoryStep;
    revert(): HistoryStep;
}
