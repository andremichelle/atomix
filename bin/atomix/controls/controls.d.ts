import { Direction } from "../../lib/common.js";
import { AtomSprite } from "../display/sprites.js";
export interface ControlHost {
    getTargetElement(): HTMLElement;
    nearestAtomSprite(x: number, y: number): AtomSprite | null;
    showPreviewMove(movableAtom: AtomSprite, direction: Direction): any;
    hidePreviewMove(commit: boolean): any;
}
