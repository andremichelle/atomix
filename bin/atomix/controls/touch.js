var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Events } from "../../lib/common.js";
import { resolveDirection } from "./controls.js";
export class TouchControl {
    static installUserInput(host) {
        const targetElement = host.getTargetElement();
        let controlling = false;
        Events.bindEventListener(targetElement, "touchstart", (startEvent) => {
            startEvent.preventDefault();
            if (controlling) {
                return;
            }
            const targetTouches = startEvent.targetTouches;
            console.assert(targetTouches.length > 0);
            const touch = targetTouches[0];
            const rect = targetElement.getBoundingClientRect();
            const movableAtom = host.nearestAtomSprite(touch.clientX - rect.left, touch.clientY - rect.top);
            if (movableAtom === null) {
                return;
            }
            const target = startEvent.target;
            const startTouch = startEvent.targetTouches[0];
            const startIdentifier = startTouch.identifier;
            const startX = (movableAtom.x + 0.5) * host.tileSize();
            const startY = (movableAtom.y + 0.5) * host.tileSize();
            let lastDirection = -1;
            const move = (event) => {
                const moveTouch = Array.from(event.targetTouches).find(touch => touch.identifier === startIdentifier);
                console.assert(moveTouch !== undefined);
                const rect = targetElement.getBoundingClientRect();
                const touchX = moveTouch.clientX - rect.left;
                const touchY = moveTouch.clientY - rect.top;
                const direction = resolveDirection(touchX - startX, touchY - startY);
                if (lastDirection != direction) {
                    host.showPreviewMove(movableAtom, direction);
                    lastDirection = direction;
                }
            };
            const stop = () => __awaiter(this, void 0, void 0, function* () {
                target.removeEventListener("touchmove", move);
                target.removeEventListener("touchend", stop);
                target.removeEventListener("touchcancel", stop);
                yield host.hidePreviewMove(true);
                controlling = false;
            });
            target.addEventListener("touchmove", move);
            target.addEventListener("touchend", stop);
            target.addEventListener("touchcancel", stop);
            move(startEvent);
            controlling = true;
        });
    }
}
//# sourceMappingURL=touch.js.map