import { Direction, Hold } from "../../lib/common.js";
import { Atom, Tile } from "../model/model.js";
export class AtomSprite {
    constructor(atomPainter, tileSizeValue, arena, atom, x, y) {
        this.atomPainter = atomPainter;
        this.tileSizeValue = tileSizeValue;
        this.arena = arena;
        this.atom = atom;
        this.x = x;
        this.y = y;
        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d");
        this.updatePaint();
    }
    element() {
        return this.canvas;
    }
    updatePaint() {
        this.canvas.style.top = `${-AtomSprite.PADDING}px`;
        this.canvas.style.left = `${-AtomSprite.PADDING}px`;
        const tileSize = this.tileSizeValue.get();
        const screenSize = tileSize + AtomSprite.PADDING * 2.0;
        this.canvas.width = screenSize * devicePixelRatio;
        this.canvas.height = screenSize * devicePixelRatio;
        this.canvas.style.width = `${screenSize}px`;
        this.canvas.style.height = `${screenSize}px`;
        this.canvas.classList.add("atom-sprite");
        this.context.save();
        this.context.scale(devicePixelRatio, devicePixelRatio);
        this.context.translate(AtomSprite.PADDING, AtomSprite.PADDING);
        this.atomPainter.paint(this.context, this.atom, this.getConnected(), tileSize * 0.5, tileSize * 0.5, tileSize);
        this.context.restore();
        this.translate();
    }
    mapMoveDuration(distance) {
        const minDistance = 1;
        const maxDistance = 12;
        const distanceRatio = Math.min(1.0, (distance - minDistance) / (maxDistance - minDistance));
        const minSeconds = 0.2;
        const maxSeconds = 0.7;
        const seconds = minSeconds + Math.pow(distanceRatio, 0.75) * (maxSeconds - minSeconds);
        this.canvas.style.setProperty("--duration", `${seconds}s`);
    }
    moveTo(field) {
        const atom = this.arena.getField(this.x, this.y);
        this.arena.setField(this.x, this.y, Tile.None);
        this.x = field.x;
        this.y = field.y;
        this.arena.setField(this.x, this.y, atom);
        this.translate();
    }
    dispose() {
        this.canvas.classList.add("dispose");
        return Hold.forAnimationComplete(this.canvas);
    }
    predictMove(direction) {
        let x = this.x;
        let y = this.y;
        switch (direction) {
            case Direction.Up: {
                while (this.arena.isFieldEmpty(x, y - 1))
                    y--;
                break;
            }
            case Direction.Down: {
                while (this.arena.isFieldEmpty(x, y + 1))
                    y++;
                break;
            }
            case Direction.Left: {
                while (this.arena.isFieldEmpty(x - 1, y))
                    x--;
                break;
            }
            case Direction.Right: {
                while (this.arena.isFieldEmpty(x + 1, y))
                    x++;
                break;
            }
        }
        return { x: x, y: y };
    }
    getConnected() {
        const set = new Set();
        this.atom.connectors.forEach(connector => {
            const maybeAtom = this.arena.getField(this.x + connector.bond.xAxis, this.y + connector.bond.yAxis);
            if (maybeAtom instanceof Atom) {
                if (maybeAtom.connectors.some(other => other.matches(connector))) {
                    set.add(connector);
                }
            }
        });
        return set;
    }
    translate() {
        const tileSize = this.tileSizeValue.get();
        this.canvas.style.transform = `translate(${this.x * tileSize}px, ${this.y * tileSize}px)`;
    }
}
AtomSprite.PADDING = 8;
//# sourceMappingURL=sprites.js.map