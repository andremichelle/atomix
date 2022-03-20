import {MovableAtom} from "../game.js"
import {Direction} from "../../lib/common.js"

export interface ControlHost {
    getTargetElement(): HTMLElement

    nearestMovableAtom(x: number, y: number): MovableAtom | null

    showPreviewMove(movableAtom: MovableAtom, direction: Direction)

    hidePreviewMove(commit: boolean)
}