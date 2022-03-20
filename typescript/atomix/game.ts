import {Atom, Connector, Level, Tile} from "./model/model.js"
import {ControlHost} from "./controls/controls.js"
import {TouchControl} from "./controls/touch.js"
import {Direction, Option, Options, Point} from "../lib/common.js"
import {AtomPainter, TILE_SIZE} from "./design.js"

export class MovableAtom implements Point {
    constructor(private readonly level: Level,
                readonly atom: Atom,
                public x: number,
                public y: number) {
    }

    predictMove(direction: Direction): Point {
        const arena = this.level.arena
        let x = this.x
        let y = this.y
        switch (direction) {
            case Direction.Up: {
                while (arena.isFieldEmpty(x, y - 1)) y--
                break
            }
            case Direction.Down: {
                while (arena.isFieldEmpty(x, y + 1)) y++
                break
            }
            case Direction.Left: {
                while (arena.isFieldEmpty(x - 1, y)) x--
                break
            }
            case Direction.Right: {
                while (arena.isFieldEmpty(x + 1, y)) x++
                break
            }
        }
        return {x: x, y: y}
    }

    moveTo(field: Point) {
        const arena = this.level.arena
        const atom: Atom = <Atom>arena.getField(this.x, this.y)
        arena.setField(this.x, this.y, Tile.None)
        this.x = field.x
        this.y = field.y
        arena.setField(this.x, this.y, atom)
    }
}

class MovePreview {
    readonly canvas: HTMLCanvasElement = document.createElement("canvas")

    constructor(readonly movableAtom: MovableAtom, readonly direction: Direction) {
        this.canvas.width = TILE_SIZE
        this.canvas.height = TILE_SIZE

        const context = this.canvas.getContext("2d")
        context.translate(TILE_SIZE * 0.5, TILE_SIZE * 0.5)
        new AtomPainter(context, TILE_SIZE).paint(movableAtom.atom, new Set())
    }

    render(context: CanvasRenderingContext2D, point: Point): void {
        context.save()
        context.globalAlpha = 0.4
        context.translate(point.x * TILE_SIZE, point.y * TILE_SIZE)
        context.drawImage(this.canvas, 0, 0)
        context.restore()
    }
}

class HistoryStep {
    constructor(readonly movableAtom: MovableAtom,
                readonly fromX: number,
                readonly fromY: number,
                readonly toX: number,
                readonly toY: number) {
    }

    execute(): HistoryStep {
        this.movableAtom.moveTo({x: this.toX, y: this.toY})
        return this
    }

    revert(): HistoryStep {
        this.movableAtom.moveTo({x: this.fromX, y: this.fromY})
        return this
    }
}

export class Game implements ControlHost {
    private readonly context = this.canvas.getContext("2d")
    private readonly atomRenderer = new AtomPainter(this.context, TILE_SIZE)
    private readonly atomsMap: Map<Atom, MovableAtom> = new Map()
    private readonly history: HistoryStep[] = []

    private movePreview: Option<MovePreview> = Options.None
    private historyPointer = 0

    constructor(private readonly canvas: HTMLCanvasElement, private readonly level: Level) {
        this.atomsMap = this.createMovableAtoms()
        this.renderPreview()
        new TouchControl(this)
    }

    getTargetElement(): HTMLElement {
        return this.canvas
    }

    nearestMovableAtom(x: number, y: number): MovableAtom | null {
        let nearestDistance: number = Number.MAX_VALUE
        let nearestMovableAtom: MovableAtom = null
        this.atomsMap.forEach((movableAtom: MovableAtom) => {
            const dx = x - (movableAtom.x + 0.5) * TILE_SIZE
            const dy = y - (movableAtom.y + 0.5) * TILE_SIZE
            const distance = Math.sqrt(dx * dx + dy * dy)
            if (distance > TILE_SIZE) return
            if (nearestDistance > distance) {
                nearestDistance = distance
                nearestMovableAtom = movableAtom
            }
        })
        return nearestMovableAtom
    }

    showPreviewMove(movableAtom: MovableAtom, direction: Direction) {
        this.movePreview = Options.valueOf(new MovePreview(movableAtom, direction))
        this.update()
    }

    hidePreviewMove() {
        if (this.movePreview.nonEmpty()) {
            const preview = this.movePreview.get()
            this.executeMove(preview.movableAtom, preview.direction)
            this.movePreview = Options.None
            console.log(`isSolved: ${this.level.isSolved()}`)
            this.update()
        }
    }

    update(): void {
        const arena = this.level.arena
        const width = arena.numColumns() * TILE_SIZE
        const height = arena.numRows() * TILE_SIZE
        this.canvas.style.width = `${width}px`
        this.canvas.style.height = `${height}px`
        this.canvas.width = width * devicePixelRatio
        this.canvas.height = height * devicePixelRatio
        this.context.save()
        this.context.scale(devicePixelRatio, devicePixelRatio)
        arena.iterateFields((entry, x, y) => {
            if (entry === Tile.Wall) {
                this.context.fillStyle = "#333"
                this.context.fillRect(
                    x * TILE_SIZE,
                    y * TILE_SIZE,
                    TILE_SIZE,
                    TILE_SIZE)
            } else if (entry instanceof Atom) {
                this.context.save()
                this.context.translate((x + 0.5) * TILE_SIZE, (y + 0.5) * TILE_SIZE)
                this.atomRenderer.paint(entry, this.getConnected(this.atomsMap.get(entry)))
                this.context.restore()
            }
        })
        if (this.movePreview.nonEmpty()) {
            const preview: MovePreview = this.movePreview.get()
            const movableAtom = preview.movableAtom
            const position = movableAtom.predictMove(preview.direction)
            preview.render(this.context, position)
            this.context.fillStyle = "white"
            const y0 = Math.min(movableAtom.y, position.y)
            const y1 = Math.max(movableAtom.y, position.y)
            const x0 = Math.min(movableAtom.x, position.x)
            const x1 = Math.max(movableAtom.x, position.x)
            if (y0 === y1) {
                for (let x = 1; x < x1 - x0; x++) {
                    this.context.beginPath()
                    this.context.arc((x0 + x + 0.5) * TILE_SIZE, (y0 + 0.5) * TILE_SIZE, 3, 0.0, Math.PI * 2.0)
                    this.context.fill()
                }
            } else if (x0 === x1) {
                for (let y = 1; y < y1 - y0; y++) {
                    this.context.beginPath()
                    this.context.arc((x0 + 0.5) * TILE_SIZE, (y0 + y + 0.5) * TILE_SIZE, 3, 0.0, Math.PI * 2.0)
                    this.context.fill()
                }
            }
            this.context.fillStyle = "white"
        }
        this.context.restore()
    }

    undo(): boolean {
        if (this.historyPointer === 0) {
            return
        }
        this.history[--this.historyPointer].revert()
        this.update()
    }

    redo(): boolean {
        if (this.historyPointer === this.history.length) {
            return
        }
        this.history[this.historyPointer++].execute()
        this.update()
    }

    private createMovableAtoms(): Map<Atom, MovableAtom> {
        const atoms: Map<Atom, MovableAtom> = new Map()
        this.level.arena.iterateFields((maybeAtom, x, y) => {
            if (maybeAtom instanceof Atom) {
                atoms.set(maybeAtom, new MovableAtom(this.level, maybeAtom, x, y))
            }
        })
        return atoms
    }

    private executeMove(movableAtom: MovableAtom, direction: Direction): void {
        const fromX = movableAtom.x
        const fromY = movableAtom.y
        const target = movableAtom.predictMove(direction)
        if (target.x === fromX && target.y === fromY) return
        this.history.splice(this.historyPointer, this.history.length - this.historyPointer)
        this.history.push(new HistoryStep(movableAtom, fromX, fromY, target.x, target.y).execute())
        this.historyPointer = this.history.length
    }

    private getConnected(movableAtom: MovableAtom): Set<Connector> {
        console.assert(movableAtom !== undefined)
        const set = new Set<Connector>()
        movableAtom.atom.connectors.forEach(connector => {
            const maybeAtom = this.level.arena.getField(movableAtom.x + connector.bond.xAxis, movableAtom.y + connector.bond.yAxis)
            if (maybeAtom instanceof Atom) {
                if (maybeAtom.connectors.some(other => other.matches(connector))) {
                    set.add(connector)
                }
            }
        })
        return set
    }

    private renderPreview() {
        const canvas: HTMLCanvasElement = document.querySelector(".preview canvas")
        const context = canvas.getContext("2d")
        const numRows = this.level.molecule.numRows()
        const numColumns = this.level.molecule.numColumns()
        const width = numColumns * TILE_SIZE
        const height = numRows * TILE_SIZE
        canvas.width = width * devicePixelRatio
        canvas.height = height * devicePixelRatio
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
        const atomPainter = new AtomPainter(context, TILE_SIZE)
        context.save()
        context.scale(devicePixelRatio, devicePixelRatio)
        this.level.molecule.iterateFields((maybeAtom, x, y) => {
            if (maybeAtom instanceof Atom) {
                context.save()
                context.translate((x + 0.5) * TILE_SIZE, (y + 0.5) * TILE_SIZE)
                atomPainter.paint(maybeAtom, new Set<Connector>(maybeAtom.connectors))
                context.restore()
            }
        })
        context.restore()
    }
}
