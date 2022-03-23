import {Direction, Events, Terminable, Terminator} from "../../lib/common.js"
import {ControlHost} from "./controls.js"
import {AtomSprite} from "../display/sprites.js"
import {TILE_SIZE} from "../display/painter.js"

export class TouchControl implements Terminable {
    private readonly terminator: Terminator = new Terminator()

    private controlling: boolean = false

    constructor(private readonly host: ControlHost) {
        this.installUserInput()
    }

    terminate(): void {
        this.terminator.terminate()
    }

    installUserInput() {
        const targetElement = this.host.getTargetElement()
        this.terminator.with(Events.bindEventListener(targetElement, "touchstart", (startEvent: TouchEvent) => {
            startEvent.preventDefault()
            if (this.controlling) {
                return
            }
            const targetTouches = startEvent.targetTouches
            console.assert(targetTouches.length > 0)
            const touch = targetTouches[0]
            const rect = targetElement.getBoundingClientRect()
            const movableAtom: AtomSprite = this.host.nearestAtomSprite(touch.clientX - rect.left, touch.clientY - rect.top)
            if (movableAtom === null) {
                return
            }
            const target = startEvent.target
            const startTouch = startEvent.targetTouches[0]
            const startIdentifier = startTouch.identifier
            const startX = (movableAtom.x + 0.5) * TILE_SIZE
            const startY = (movableAtom.y + 0.5) * TILE_SIZE
            let lastDirection = -1
            const move = (event: TouchEvent) => {
                const moveTouch: Touch = Array.from(event.targetTouches).find(touch => touch.identifier === startIdentifier)
                console.assert(moveTouch !== undefined)
                const rect = targetElement.getBoundingClientRect()
                const touchX = moveTouch.clientX - rect.left
                const touchY = moveTouch.clientY - rect.top
                const direction = this.resolveDirection(touchX - startX, touchY - startY)
                if (lastDirection != direction) {
                    this.host.showPreviewMove(movableAtom, direction)
                    lastDirection = direction
                }
            }
            const stop = async () => {
                target.removeEventListener("touchmove", move)
                target.removeEventListener("touchend", stop)
                target.removeEventListener("touchcancel", stop)
                await this.host.hidePreviewMove(true)
                this.controlling = false
            }
            target.addEventListener("touchmove", move)
            target.addEventListener("touchend", stop)
            target.addEventListener("touchcancel", stop)
            move(startEvent)
            this.controlling = true
        }))
    }

    resolveDirection(x: number, y: number): Direction {
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
}