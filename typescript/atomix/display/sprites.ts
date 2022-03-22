import {Direction, Hold, Point} from "../../lib/common.js"
import {AtomPainter, TILE_SIZE} from "./painter.js"
import {Atom, Connector, Map2d, Tile} from "../model/model.js"

export class AtomSprite implements Point {
    private readonly canvas: HTMLCanvasElement = document.createElement("canvas")
    private readonly context: CanvasRenderingContext2D = this.canvas.getContext("2d")

    constructor(private readonly atomPainter: AtomPainter,
                private readonly arena: Map2d,
                public readonly atom: Atom,
                public x: number,
                public y: number) {
        this.canvas.classList.add("atom-sprite")
        this.updatePaint()
        this.translate()
    }

    element(): HTMLElement {
        return this.canvas
    }

    updatePaint(): void {
        this.atomPainter.paint(this.context, this.atom, this.getConnected(), TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE)
    }

    moveTo(field: Point) {
        const atom: Atom = <Atom>this.arena.getField(this.x, this.y)
        this.arena.setField(this.x, this.y, Tile.None)
        this.x = field.x
        this.y = field.y
        this.arena.setField(this.x, this.y, atom)
        this.translate()
    }

    dispose(): Promise<void> {
        this.canvas.classList.add("dispose")
        return Hold.forAnimationComplete(this.canvas)
    }

    predictMove(direction: Direction): Point {
        let x = this.x
        let y = this.y
        switch (direction) {
            case Direction.Up: {
                while (this.arena.isFieldEmpty(x, y - 1)) y--
                break
            }
            case Direction.Down: {
                while (this.arena.isFieldEmpty(x, y + 1)) y++
                break
            }
            case Direction.Left: {
                while (this.arena.isFieldEmpty(x - 1, y)) x--
                break
            }
            case Direction.Right: {
                while (this.arena.isFieldEmpty(x + 1, y)) x++
                break
            }
        }
        return {x: x, y: y}
    }

    private getConnected(): Set<Connector> {
        const set = new Set<Connector>()
        this.atom.connectors.forEach(connector => {
            const maybeAtom = this.arena.getField(this.x + connector.bond.xAxis, this.y + connector.bond.yAxis)
            if (maybeAtom instanceof Atom) {
                if (maybeAtom.connectors.some(other => other.matches(connector))) {
                    set.add(connector)
                }
            }
        })
        return set
    }

    private translate() {
        this.canvas.style.transform = `translate(${this.x * TILE_SIZE}px, ${this.y * TILE_SIZE}px)`
    }
}