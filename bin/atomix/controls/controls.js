var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Direction, Hold } from "../../lib/common.js";
import { Sound } from "../sounds.js";
export const resolveDirection = (x, y) => {
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
};
export class MoveOperation {
    constructor(soundManager, atomSprite, fromX, fromY, toX, toY) {
        this.soundManager = soundManager;
        this.atomSprite = atomSprite;
        this.fromX = fromX;
        this.fromY = fromY;
        this.toX = toX;
        this.toY = toY;
        this.distance = Math.max(Math.abs(this.toX - this.fromX), Math.abs(this.toY - this.fromY));
    }
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            this.atomSprite.mapMoveDuration(this.distance);
            this.atomSprite.moveTo({ x: this.toX, y: this.toY });
            const stopSound = this.soundManager.play(Sound.Move);
            yield Hold.forTransitionComplete(this.atomSprite.element());
            stopSound();
            this.soundManager.play(Sound.Dock);
        });
    }
    revert() {
        return __awaiter(this, void 0, void 0, function* () {
            this.atomSprite.moveTo({ x: this.fromX, y: this.fromY });
            const stopSound = this.soundManager.play(Sound.Move);
            yield Hold.forTransitionComplete(this.atomSprite.element());
            stopSound();
            this.soundManager.play(Sound.Dock);
        });
    }
}
//# sourceMappingURL=controls.js.map