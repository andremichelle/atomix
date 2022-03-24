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
export class MouseControl {
    static installUserInput(host) {
        const targetElement = host.getTargetElement();
        let controlling = false;
        Events.bindEventListener(targetElement, "mousedown", (startEvent) => {
            startEvent.preventDefault();
            if (controlling) {
                return;
            }
            const rect = targetElement.getBoundingClientRect();
            const movableAtom = host.nearestAtomSprite(startEvent.clientX - rect.left, startEvent.clientY - rect.top);
            if (movableAtom === null) {
                return;
            }
            const startX = (movableAtom.x + 0.5) * host.tileSize();
            const startY = (movableAtom.y + 0.5) * host.tileSize();
            let lastDirection = -1;
            const move = (event) => {
                const rect = targetElement.getBoundingClientRect();
                const mouseX = event.clientX - rect.left;
                const mouseY = event.clientY - rect.top;
                const direction = resolveDirection(mouseX - startX, mouseY - startY);
                if (lastDirection != direction) {
                    host.showPreviewMove(movableAtom, direction);
                    lastDirection = direction;
                }
            };
            const stop = () => __awaiter(this, void 0, void 0, function* () {
                window.removeEventListener("mousemove", move);
                window.removeEventListener("mouseup", stop);
                yield host.hidePreviewMove(true);
                controlling = false;
            });
            window.addEventListener("mousemove", move);
            window.addEventListener("mouseup", stop);
            move(startEvent);
            controlling = true;
        });
    }
}
//# sourceMappingURL=mouse.js.map