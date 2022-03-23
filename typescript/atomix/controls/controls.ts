import {Direction, Hold} from "../../lib/common.js"
import {AtomSprite} from "../display/sprites.js"
import {Sound, SoundManager} from "../sounds.js"

export interface ControlHost {
    getTargetElement(): HTMLElement

    nearestAtomSprite(x: number, y: number): AtomSprite | null

    showPreviewMove(movableAtom: AtomSprite, direction: Direction)

    hidePreviewMove(commit: boolean)
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