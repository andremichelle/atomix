import {Direction, Hold} from "../../lib/common.js"
import {AtomSprite} from "../display/sprites.js"
import {Sound, SoundManager} from "../sounds.js"

export interface ControlHost {
    getTargetElement(): HTMLElement

    nearestAtomSprite(x: number, y: number): AtomSprite | null

    showPreviewMove(movableAtom: AtomSprite, direction: Direction)

    hidePreviewMove(commit: boolean)

    tileSize(): number
}

export const resolveDirection = (x: number, y: number): Direction => {
    const angle = Math.atan2(y, x) - Math.PI * 0.25 // rotate 45deg
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    if (dx > 0) {
        if (dy >= 0) return Direction.Down
        else return Direction.Right
    } else {
        if (dy >= 0) return Direction.Left
        else return Direction.Up
    }
}

export class MoveOperation {
    private readonly distance = Math.max(Math.abs(this.toX - this.fromX), Math.abs(this.toY - this.fromY)) // simplified for 2 axis

    constructor(readonly soundManager: SoundManager,
                readonly atomSprite: AtomSprite,
                readonly fromX: number,
                readonly fromY: number,
                readonly toX: number,
                readonly toY: number) {
    }

    async execute(): Promise<void> {
        this.atomSprite.mapMoveDuration(this.distance)
        this.atomSprite.moveTo({x: this.toX, y: this.toY})
        const stopSound = this.soundManager.play(Sound.Move)
        await Hold.forTransitionComplete(this.atomSprite.element())
        stopSound()
        this.soundManager.play(Sound.Dock)
    }

    async revert(): Promise<void> {
        this.atomSprite.moveTo({x: this.fromX, y: this.fromY})
        const stopSound = this.soundManager.play(Sound.Move)
        await Hold.forTransitionComplete(this.atomSprite.element())
        stopSound()
        this.soundManager.play(Sound.Dock)
    }
}