import {Events} from "../../lib/common.js"
import {ControlHost, resolveDirection} from "./controls.js"
import {AtomSprite} from "../display/sprites.js"

export class TouchControl {
    static installUserInput(host: ControlHost) {
        const targetElement = host.getTargetElement()
        let controlling = false
        Events.bindEventListener(targetElement, "touchstart", (startEvent: TouchEvent) => {
            startEvent.preventDefault()
            if (controlling) {
                return
            }
            const targetTouches = startEvent.targetTouches
            console.assert(targetTouches.length > 0)
            const touch = targetTouches[0]
            const rect = targetElement.getBoundingClientRect()
            const movableAtom: AtomSprite = host.nearestAtomSprite(touch.clientX - rect.left, touch.clientY - rect.top)
            if (movableAtom === null) {
                return
            }
            const target = startEvent.target
            const startTouch = startEvent.targetTouches[0]
            const startIdentifier = startTouch.identifier
            const startX = (movableAtom.x + 0.5) * host.tileSize()
            const startY = (movableAtom.y + 0.5) * host.tileSize()
            let lastDirection = -1
            const move = (event: TouchEvent) => {
                const moveTouch: Touch = Array.from(event.targetTouches).find(touch => touch.identifier === startIdentifier)
                console.assert(moveTouch !== undefined)
                const rect = targetElement.getBoundingClientRect()
                const touchX = moveTouch.clientX - rect.left
                const touchY = moveTouch.clientY - rect.top
                const direction = resolveDirection(touchX - startX, touchY - startY)
                if (lastDirection != direction) {
                    host.showPreviewMove(movableAtom, direction)
                    lastDirection = direction
                }
            }
            const stop = async () => {
                target.removeEventListener("touchmove", move)
                target.removeEventListener("touchend", stop)
                target.removeEventListener("touchcancel", stop)
                await host.hidePreviewMove(true)
                controlling = false
            }
            target.addEventListener("touchmove", move)
            target.addEventListener("touchend", stop)
            target.addEventListener("touchcancel", stop)
            move(startEvent)
            controlling = true
        })
    }
}