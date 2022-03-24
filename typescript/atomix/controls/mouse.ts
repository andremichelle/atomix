import {Events} from "../../lib/common.js"
import {ControlHost, resolveDirection} from "./controls.js"
import {AtomSprite} from "../display/sprites.js"

export class MouseControl {
    static installUserInput(host: ControlHost) {
        const targetElement = host.getTargetElement()
        let controlling = false
        Events.bindEventListener(targetElement, "mousedown", (startEvent: MouseEvent) => {
            startEvent.preventDefault()
            if (controlling) {
                return
            }
            const rect = targetElement.getBoundingClientRect()
            const movableAtom: AtomSprite = host.nearestAtomSprite(startEvent.clientX - rect.left, startEvent.clientY - rect.top)
            if (movableAtom === null) {
                return
            }
            const startX = (movableAtom.x + 0.5) * host.tileSize()
            const startY = (movableAtom.y + 0.5) * host.tileSize()
            let lastDirection = -1
            const move = (event: MouseEvent) => {
                const rect = targetElement.getBoundingClientRect()
                const mouseX = event.clientX - rect.left
                const mouseY = event.clientY - rect.top
                const direction = resolveDirection(mouseX - startX, mouseY - startY)
                if (lastDirection != direction) {
                    host.showPreviewMove(movableAtom, direction)
                    lastDirection = direction
                }
            }
            const stop = async () => {
                window.removeEventListener("mousemove", move)
                window.removeEventListener("mouseup", stop)
                await host.hidePreviewMove(true)
                controlling = false
            }
            window.addEventListener("mousemove", move)
            window.addEventListener("mouseup", stop)
            move(startEvent)
            controlling = true
        })
    }
}