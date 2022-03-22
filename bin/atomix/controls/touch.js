var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Direction, Events, Terminator } from "../../lib/common.js";
import { TILE_SIZE } from "../display/painter.js";
export class TouchControl {
    constructor(host) {
        this.host = host;
        this.terminator = new Terminator();
        this.controlling = false;
        this.installUserInput();
    }
    terminate() {
        this.terminator.terminate();
    }
    installUserInput() {
        const targetElement = this.host.getTargetElement();
        this.terminator.with(Events.bindEventListener(targetElement, "touchstart", (startEvent) => {
            startEvent.preventDefault();
            if (this.controlling) {
                return;
            }
            const targetTouches = startEvent.targetTouches;
            console.assert(targetTouches.length > 0);
            const touch = targetTouches[0];
            const rect = targetElement.getBoundingClientRect();
            const movableAtom = this.host.nearestAtomSprite(touch.clientX - rect.left, touch.clientY - rect.top);
            if (movableAtom === null) {
                return;
            }
            const target = startEvent.target;
            const startTouch = startEvent.targetTouches[0];
            const startIdentifier = startTouch.identifier;
            const startX = (movableAtom.x + 0.5) * TILE_SIZE;
            const startY = (movableAtom.y + 0.5) * TILE_SIZE;
            const move = (event) => {
                const moveTouch = Array.from(event.targetTouches).find(touch => touch.identifier === startIdentifier);
                console.assert(moveTouch !== undefined);
                const rect = targetElement.getBoundingClientRect();
                const touchX = moveTouch.clientX - rect.left;
                const touchY = moveTouch.clientY - rect.top;
                const direction = this.resolveDirection(touchX - startX, touchY - startY);
                this.host.showPreviewMove(movableAtom, direction);
            };
            const stop = () => __awaiter(this, void 0, void 0, function* () {
                target.removeEventListener("touchmove", move);
                target.removeEventListener("touchend", stop);
                target.removeEventListener("touchcancel", stop);
                yield this.host.hidePreviewMove(true);
                this.controlling = false;
            });
            target.addEventListener("touchmove", move);
            target.addEventListener("touchend", stop);
            target.addEventListener("touchcancel", stop);
            move(startEvent);
            this.controlling = true;
        }));
    }
    resolveDirection(x, y) {
        const angle = Math.atan2(y, x) - Math.PI * 0.25;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        if (dx > 0) {
            if (dy >= 0)
                return Direction.Down;
            else
                return Direction.Right;
        }
        else {
            if (dy >= 0)
                return Direction.Left;
            else
                return Direction.Up;
        }
    }
}
//# sourceMappingURL=touch.js.map