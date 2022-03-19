import {Direction, MovableAtom} from "./model.js"
import {Game} from "./game.js"
import {Events, Terminable, Terminator} from "../lib/common.js"

export class TouchControls implements Terminable {
    private readonly terminator: Terminator = new Terminator()

    private controlling: boolean = false

    constructor(private readonly game: Game) {
        this.installUserInput()
    }

    terminate(): void {
        // TODO terminate current action (if any)
        this.terminator.terminate()
    }

    installUserInput() {
        const targetElement = this.game.getElement()
        this.terminator.with(Events.bindEventListener(targetElement, "touchstart", (startEvent: TouchEvent) => {
            startEvent.preventDefault()
            if (this.controlling) {
                return
            }
            const targetTouches = startEvent.targetTouches
            console.assert(targetTouches.length > 0)
            const touch = targetTouches[0]
            const rect = targetElement.getBoundingClientRect()
            const movableAtom = this.nearestMovableAtom(touch.clientX - rect.left, touch.clientY - rect.top)
            if (movableAtom === null) {
                return
            }
            const target = startEvent.target
            const startTouch = startEvent.targetTouches[0]
            const startIdentifier = startTouch.identifier
            const startX = startTouch.clientX
            const startY = startTouch.clientY
            const move = (event: TouchEvent) => {
                const moveTouch: Touch = Array.from(event.targetTouches).find(touch => touch.identifier === startIdentifier)
                console.assert(moveTouch !== undefined)
                const direction = this.resolveDirection(moveTouch.clientX - startX, moveTouch.clientY - startY)
                this.game.showPreviewMove(movableAtom, direction)
            }
            const stop = () => {
                this.controlling = false
                this.game.hidePreviewMove()
                target.removeEventListener("touchmove", move)
                target.removeEventListener("touchend", stop)
                target.removeEventListener("touchcancel", stop)
            }
            target.addEventListener("touchmove", move)
            target.addEventListener("touchend", stop)
            target.addEventListener("touchcancel", stop)
            this.controlling = true
        }))
    }

    nearestMovableAtom(x: number, y: number): MovableAtom | null {
        let nearestDistance: number = Number.MAX_VALUE
        let nearestMovableAtom: MovableAtom = null
        this.game.getMovableAtoms().forEach(movableAtom => {
            const dx = x - movableAtom.x * Game.TILE_SIZE
            const dy = y - movableAtom.y * Game.TILE_SIZE
            const distance = Math.sqrt(dx * dx + dy * dy)
            if (distance > Game.TILE_SIZE * 2) {
                return
            }
            if (nearestDistance > distance) {
                nearestDistance = distance
                nearestMovableAtom = movableAtom
            }
        })
        return nearestMovableAtom
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