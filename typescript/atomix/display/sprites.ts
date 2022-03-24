import {Direction, Hold, Point, Value} from "../../lib/common.js"
import {AtomPainter} from "./painter.js"
import {Atom, Connector, Map2d, Tile} from "../model/model.js"

export class AtomSprite implements Point {
    private static PADDING = 8 // for outgoing diagonal connections
    private readonly canvas: HTMLCanvasElement = document.createElement("canvas")
    private readonly context: CanvasRenderingContext2D = this.canvas.getContext("2d")

    constructor(private readonly atomPainter: AtomPainter,
                private readonly tileSizeValue: Value<number>,
                private readonly arena: Map2d,
                public readonly atom: Atom,
                public x: number,
                public y: number) {
        this.updatePaint()
    }

    element(): HTMLElement {
        return this.canvas
    }

    updatePaint(): void {
        this.canvas.style.top = `${-AtomSprite.PADDING}px`
        this.canvas.style.left = `${-AtomSprite.PADDING}px`
        const tileSize = this.tileSizeValue.get()
        const screenSize = tileSize + AtomSprite.PADDING * 2.0
        this.canvas.width = screenSize * devicePixelRatio
        this.canvas.height = screenSize * devicePixelRatio
        this.canvas.style.width = `${screenSize}px`
        this.canvas.style.height = `${screenSize}px`
        this.canvas.classList.add("atom-sprite")
        this.context.save()
        this.context.scale(devicePixelRatio, devicePixelRatio)
        this.context.translate(AtomSprite.PADDING, AtomSprite.PADDING)
        this.atomPainter.paint(this.context, this.atom, this.getConnected(), tileSize * 0.5, tileSize * 0.5, tileSize)
        this.context.restore()
        this.translate()
    }

    mapMoveDuration(distance: number): void {
        const minDistance = 1
        const maxDistance = 12
        const distanceRatio = Math.min(1.0, (distance - minDistance) / (maxDistance - minDistance))
        const minSeconds = 0.2
        const maxSeconds = 0.7
        const seconds = minSeconds + Math.pow(distanceRatio, 0.75) * (maxSeconds - minSeconds)
        this.canvas.style.setProperty("--duration", `${seconds}s`)
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
        const tileSize: number = this.tileSizeValue.get()
        this.canvas.style.transform = `translate(${this.x * tileSize}px, ${this.y * tileSize}px)`
    }
}