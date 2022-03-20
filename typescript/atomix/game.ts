import {Atom, Connector, Level, Tile} from "./model/model.js"
import {ControlHost} from "./controls/controls.js"
import {TouchControl} from "./controls/touch.js"
import {Direction, Option, Options, Point} from "../lib/common.js"
import {ArenaPainter, AtomPainter, TILE_SIZE} from "./design.js"

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

    constructor(readonly painter: AtomPainter, readonly movableAtom: MovableAtom, readonly direction: Direction) {
        this.canvas.width = TILE_SIZE
        this.canvas.height = TILE_SIZE

        const context = this.canvas.getContext("2d")
        context.translate(TILE_SIZE * 0.5, TILE_SIZE * 0.5)
        this.painter.paint(context, movableAtom.atom, new Set(), TILE_SIZE)
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

export class GameContext implements ControlHost {
    private readonly context = this.canvas.getContext("2d")
    private readonly movableAtoms: MovableAtom[] = []
    private readonly history: HistoryStep[] = []

    private movePreview: Option<MovePreview> = Options.None
    private historyPointer = 0

    constructor(private readonly canvas: HTMLCanvasElement,
                private readonly arenaPainter: ArenaPainter,
                private readonly atomPainter: AtomPainter,
                private readonly level: Level) {
        this.movableAtoms = this.createMovableAtoms()
        this.renderMoleculePreview()
        new TouchControl(this)
        this.render()
    }

    getTargetElement(): HTMLElement {
        return this.canvas
    }

    nearestMovableAtom(x: number, y: number): MovableAtom | null {
        let nearestDistance: number = Number.MAX_VALUE
        let nearestMovableAtom: MovableAtom = null
        this.movableAtoms.forEach((movableAtom: MovableAtom) => {
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
        this.movePreview = Options.valueOf(new MovePreview(this.atomPainter, movableAtom, direction))
        this.render()
    }

    async hidePreviewMove(commit: boolean) {
        if (this.movePreview.nonEmpty()) {
            const preview = this.movePreview.get()
            this.movePreview = Options.None
            if (commit) {
                console.log("start execution")
                await this.executeMove(preview.movableAtom, preview.direction)
                console.log(`isSolved: ${this.level.isSolved()}`)
            }
            this.render()
        }
    }

    undo(): boolean {
        if (this.historyPointer === 0) {
            return
        }
        this.history[--this.historyPointer].revert()
        this.render()
    }

    redo(): boolean {
        if (this.historyPointer === this.history.length) {
            return
        }
        this.history[this.historyPointer++].execute()
        this.render()
    }

    private render(): void {
        this.beginRender()
        this.movableAtoms.forEach(movableAtom => {
            this.context.save()
            this.context.translate((movableAtom.x + 0.5) * TILE_SIZE, (movableAtom.y + 0.5) * TILE_SIZE)
            this.atomPainter.paint(this.context, movableAtom.atom, this.getConnected(movableAtom), TILE_SIZE)
            this.context.restore()
        })
        if (this.movePreview.nonEmpty()) {
            this.renderPreview(this.movePreview.get())
        }
        this.endRender()
    }

    private beginRender() {
        const arena = this.level.arena
        const width = arena.numColumns() * TILE_SIZE
        const height = arena.numRows() * TILE_SIZE
        this.canvas.style.width = `${width}px`
        this.canvas.style.height = `${height}px`
        this.canvas.width = width * devicePixelRatio
        this.canvas.height = height * devicePixelRatio
        this.context.save()
        this.context.scale(devicePixelRatio, devicePixelRatio)
        this.arenaPainter.paint(this.context, this.level.arena)
        return arena
    }

    private endRender() {
        this.context.restore()
    }

    private createMovableAtoms(): MovableAtom[] {
        const atoms: MovableAtom[] = []
        let count = 0
        this.level.arena.iterateFields((maybeAtom, x, y) => {
            if (maybeAtom instanceof Atom) {
                atoms.push(new MovableAtom(this.level, maybeAtom, x, y))
                count++
            }
        })
        return atoms
    }

    private async executeMove(movingAtom: MovableAtom, direction: Direction): Promise<void> {
        const fromX = movingAtom.x
        const fromY = movingAtom.y
        const target = movingAtom.predictMove(direction)
        const toX = target.x
        const toY = target.y
        if (toX === fromX && toY === fromY) return
        this.history.splice(this.historyPointer, this.history.length - this.historyPointer)
        this.history.push(new HistoryStep(movingAtom, fromX, fromY, toX, toY).execute())
        this.historyPointer = this.history.length
        return new Promise((resolve) => {
            const duration = 10
            let frame = 0
            const move = (phase: number): Point => {
                phase = Math.pow(phase, 1.0 / 2.0)
                return {
                    x: fromX + phase * (toX - fromX),
                    y: fromY + phase * (toY - fromY)
                }
            }
            const animate = () => {
                if (frame < duration) {
                    const point = move(++frame / duration)
                    this.beginRender()
                    this.movableAtoms.forEach(movableAtom => {
                        this.context.save()
                        if (movableAtom === movingAtom) {
                            this.context.translate((point.x + 0.5) * TILE_SIZE, (point.y + 0.5) * TILE_SIZE)
                        } else {
                            this.context.translate((movableAtom.x + 0.5) * TILE_SIZE, (movableAtom.y + 0.5) * TILE_SIZE)
                        }
                        this.atomPainter.paint(this.context, movableAtom.atom, this.getConnected(movableAtom), TILE_SIZE)
                        this.context.restore()
                    })
                    if (this.movePreview.nonEmpty()) {
                        this.renderPreview(this.movePreview.get())
                    }
                    this.endRender()
                    requestAnimationFrame(animate)
                } else {
                    resolve()
                }
            }
            animate()
        })
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

    private renderMoleculePreview() {
        const canvas: HTMLCanvasElement = document.querySelector(".preview canvas")
        const context = canvas.getContext("2d")
        const numRows = this.level.molecule.numRows()
        const numColumns = this.level.molecule.numColumns()
        const size = 24
        const width = numColumns * size
        const height = numRows * size
        canvas.width = width * devicePixelRatio
        canvas.height = height * devicePixelRatio
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
        context.save()
        context.scale(devicePixelRatio, devicePixelRatio)
        this.level.molecule.iterateFields((maybeAtom, x, y) => {
            if (maybeAtom instanceof Atom) {
                context.save()
                context.translate((x + 0.5) * size, (y + 0.5) * size)
                this.atomPainter.paint(context, maybeAtom, new Set<Connector>(maybeAtom.connectors), size)
                context.restore()
            }
        })
        context.restore()
    }

    private renderPreview(preview: MovePreview) {
        const movableAtom = preview.movableAtom
        const position = movableAtom.predictMove(preview.direction)
        // preview.render(this.context, position)
        this.context.fillStyle = "rgba(255, 255, 255, 0.2)"
        const y0 = Math.min(movableAtom.y, position.y)
        const y1 = Math.max(movableAtom.y, position.y)
        const x0 = Math.min(movableAtom.x, position.x)
        const x1 = Math.max(movableAtom.x, position.x)
        if (y0 === y1) {
            for (let x = 0; x <= x1 - x0; x++) {
                this.context.beginPath()
                this.context.arc((x0 + x + 0.5) * TILE_SIZE, (y0 + 0.5) * TILE_SIZE, 3, 0.0, Math.PI * 2.0)
                this.context.fill()
            }
        } else if (x0 === x1) {
            for (let y = 0; y <= y1 - y0; y++) {
                this.context.beginPath()
                this.context.arc((x0 + 0.5) * TILE_SIZE, (y0 + y + 0.5) * TILE_SIZE, 3, 0.0, Math.PI * 2.0)
                this.context.fill()
            }
        }
    }
}