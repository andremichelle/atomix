import {Direction} from "../../lib/common.js"
import {AtomSprite} from "../display/sprites.js"

export interface ControlHost {
    getTargetElement(): HTMLElement

    nearestAtomSprite(x: number, y: number): AtomSprite | null

    showPreviewMove(movableAtom: AtomSprite, direction: Direction)

    hidePreviewMove(commit: boolean)
}

export class HistoryStep {
    constructor(readonly atomSprite: AtomSprite,
                readonly fromX: number,
                readonly fromY: number,
                readonly toX: number,
                readonly toY: number) {
    }

    execute(): HistoryStep {
        this.atomSprite.moveTo({x: this.toX, y: this.toY})
        return this
    }

    revert(): HistoryStep {
        this.atomSprite.moveTo({x: this.fromX, y: this.fromY})
        return this
    }
}