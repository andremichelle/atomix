import { Direction, Hold } from "../../lib/common.js";
import { TILE_SIZE } from "./painter.js";
import { Atom, Tile } from "../model/model.js";
export class AtomSprite {
    constructor(atomPainter, arena, atom, x, y) {
        this.atomPainter = atomPainter;
        this.arena = arena;
        this.atom = atom;
        this.x = x;
        this.y = y;
        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d");
        this.canvas.style.top = `${-AtomSprite.PADDING}px`;
        this.canvas.style.left = `${-AtomSprite.PADDING}px`;
        const size = TILE_SIZE + AtomSprite.PADDING * 2;
        this.canvas.width = size * devicePixelRatio;
        this.canvas.height = size * devicePixelRatio;
        this.canvas.style.width = `${size}px`;
        this.canvas.style.height = `${size}px`;
        this.canvas.classList.add("atom-sprite");
        this.updatePaint();
        this.translate();
    }
    element() {
        return this.canvas;
    }
    updatePaint() {
        this.context.save();
        this.context.scale(devicePixelRatio, devicePixelRatio);
        this.context.translate(AtomSprite.PADDING, AtomSprite.PADDING);
        this.atomPainter.paint(this.context, this.atom, this.getConnected(), TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE);
        this.context.restore();
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
        this.canvas.style.transform = `translate(${this.x * TILE_SIZE}px, ${this.y * TILE_SIZE}px)`;
    }
}
AtomSprite.PADDING = 8;
//# sourceMappingURL=sprites.js.map