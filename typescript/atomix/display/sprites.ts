import {Direction, Hold, Point, Value} from "../../lib/common.js"
import {ArenaPainter, AtomPainter} from "./painter.js"
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

export class MovePreview {
    constructor(readonly atomSprite: AtomSprite,
                readonly direction: Direction,
                readonly hidePreview: () => void) {
    }
}

export class ArenaCanvas {
    private readonly canvas: HTMLCanvasElement = document.querySelector("canvas#background-layer")
    private readonly context: CanvasRenderingContext2D = this.canvas.getContext("2d")

    constructor(private readonly arenaPainter: ArenaPainter) {
    }

    get element(): HTMLElement {
        return this.canvas
    }

    resizeTo(width: number, height: number) {
        this.canvas.width = width * devicePixelRatio
        this.canvas.height = height * devicePixelRatio
    }

    paint(arena: Map2d, tileSize: number): void {
        this.context.save()
        this.context.scale(devicePixelRatio, devicePixelRatio)
        this.arenaPainter.paint(this.context, arena, tileSize)
        this.context.restore()
    }
}

export class AtomsLayer {
    constructor(private readonly element: HTMLElement) {
    }

    addSprite(atomSprite: AtomSprite) {
        this.element.appendChild(atomSprite.element())
    }

    removeAllSprites(): void {
        while (this.element.lastChild !== null) {
            this.element.lastChild.remove()
        }
    }

    showMovePreview(source: Point, target: Point, tileSize: number): () => void {
        const div = document.createElement("div")
        div.classList.add("move-preview")
        const y0 = Math.min(source.y, target.y) + 0.4
        const y1 = Math.max(source.y, target.y) + 0.6
        const x0 = Math.min(source.x, target.x) + 0.4
        const x1 = Math.max(source.x, target.x) + 0.6
        div.style.top = `${y0 * tileSize}px`
        div.style.left = `${x0 * tileSize}px`
        div.style.width = `${(x1 - x0) * tileSize}px`
        div.style.height = `${(y1 - y0) * tileSize}px`
        div.style.borderRadius = `${tileSize * 0.2}px`
        this.element.prepend(div)
        return () => div.remove()
    }
}