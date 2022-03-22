import {Atom, Connector, Level, Map2d, Tile} from "./model/model.js"
import {ControlHost} from "./controls/controls.js"
import {TouchControl} from "./controls/touch.js"
import {ArrayUtils, Direction, Empty, Hold, Option, Options, Point} from "../lib/common.js"
import {ArenaPainter, AtomPainter, TILE_SIZE} from "./design.js"
import {Easing} from "../lib/easing.js"

export class MovableAtom implements Point {
    constructor(private readonly arena: Map2d,
                readonly atom: Atom,
                public x: number,
                public y: number) {
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

    moveTo(field: Point) {
        const atom: Atom = <Atom>this.arena.getField(this.x, this.y)
        this.arena.setField(this.x, this.y, Tile.None)
        this.x = field.x
        this.y = field.y
        this.arena.setField(this.x, this.y, atom)
    }
}

class MovePreview {
    readonly canvas: HTMLCanvasElement = document.createElement("canvas")

    constructor(readonly painter: AtomPainter, readonly movableAtom: MovableAtom, readonly direction: Direction) {
        this.canvas.width = TILE_SIZE
        this.canvas.height = TILE_SIZE

        const context = this.canvas.getContext("2d")
        context.translate(TILE_SIZE * 0.5, TILE_SIZE * 0.5)
        this.painter.paint(context, movableAtom.atom, Empty.Set, 0, 0, TILE_SIZE)
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

export class ArenaCanvas {
    private readonly canvas = document.createElement("canvas")
    private readonly context = this.canvas.getContext("2d")

    constructor(private readonly arenaPainter: ArenaPainter) {
    }

    resizeTo(width: number, height: number) {
        this.canvas.width = width * devicePixelRatio
        this.canvas.height = height * devicePixelRatio
    }

    get element(): HTMLElement {
        return this.canvas
    }

    paint(arena: Map2d): void {
        this.context.save()
        this.context.scale(devicePixelRatio, devicePixelRatio)
        this.arenaPainter.paint(this.context, arena)
        this.context.restore()
    }
}

export class AtomsCanvas {
    private readonly canvas = document.createElement("canvas")
    private readonly context = this.canvas.getContext("2d")

    constructor() {
    }

    resizeTo(width: number, height: number) {
        this.canvas.width = width * devicePixelRatio
        this.canvas.height = height * devicePixelRatio
    }

    get element(): HTMLElement {
        return this.canvas
    }

    clear(): void {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }

    paint(movableAtoms: MovableAtom[], renderer: ((context: CanvasRenderingContext2D, movableAtom: MovableAtom) => void)): void {
        this.context.save()
        this.context.scale(devicePixelRatio, devicePixelRatio)
        movableAtoms.forEach(movableAtom => renderer(this.context, movableAtom))
        this.context.restore()
    }

    showMovePreview(source: Point, target: Point) {
        this.context.save()
        this.context.scale(devicePixelRatio, devicePixelRatio)
        this.context.strokeStyle = "rgba(255, 255, 255, 0.1)"
        this.context.lineCap = "round"
        this.context.lineWidth = TILE_SIZE / 4
        const y0 = Math.min(source.y, target.y)
        const y1 = Math.max(source.y, target.y)
        const x0 = Math.min(source.x, target.x)
        const x1 = Math.max(source.x, target.x)
        this.context.beginPath()
        this.context.moveTo((x0 + 0.5) * TILE_SIZE, (y0 + 0.5) * TILE_SIZE)
        this.context.lineTo((x1 + 0.5) * TILE_SIZE, (y1 + 0.5) * TILE_SIZE)
        this.context.stroke()
        this.context.restore()
    }
}

export class GameContext implements ControlHost {
    private readonly arenaCanvas: ArenaCanvas = new ArenaCanvas(this.arenaPainter)
    private readonly atomsCanvas: AtomsCanvas = new AtomsCanvas()
    private readonly movableAtoms: MovableAtom[] = []
    private readonly history: HistoryStep[] = []

    private readonly labelLevelId: HTMLElement = document.getElementById("level-id")
    private readonly labelLevelName: HTMLElement = document.getElementById("level-name")

    private movePreview: Option<MovePreview> = Options.None
    private historyPointer = 0

    private level: Option<Level> = Options.None
    private levelPointer = 0


    constructor(private readonly element: HTMLElement,
                private readonly arenaPainter: ArenaPainter,
                private readonly atomPainter: AtomPainter,
                private readonly levels: Level[]) {
        this.initLevel(this.levels[this.levelPointer])
        this.element.appendChild(this.arenaCanvas.element)
        this.element.appendChild(this.atomsCanvas.element)

        document.getElementById("undo-button").addEventListener("click", () => this.undo())
        document.getElementById("redo-button").addEventListener("click", () => this.redo())
        document.getElementById("solve-button").addEventListener("click", () => this.solve())

        new TouchControl(this)
    }

    getTargetElement(): HTMLElement {
        return this.element
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
        this.renderStaticAtoms()
    }

    async hidePreviewMove(commit: boolean) {
        if (this.movePreview.nonEmpty()) {
            const preview = this.movePreview.get()
            this.movePreview = Options.None
            if (commit) {
                console.log("start execution")
                await this.executeMove(preview.movableAtom, preview.direction)
            }
            this.renderStaticAtoms()
        }
    }

    private undo(): boolean {
        if (this.historyPointer === 0) {
            return
        }
        this.history[--this.historyPointer].revert()
        this.renderStaticAtoms()
    }

    private redo(): boolean {
        if (this.historyPointer === this.history.length) {
            return
        }
        this.history[this.historyPointer++].execute()
        this.renderStaticAtoms()
    }

    private async solve(): Promise<void> {
        if (this.historyPointer !== 0) {
            return
        }
        this.level.ifPresent(async level => {
            for (const move of level.solution) {
                const movableAtom: MovableAtom = this.movableAtoms.find(movableAtom => {
                    return movableAtom.x === move.x && movableAtom.y === move.y
                })
                console.assert(movableAtom !== undefined)
                await this.executeMove(movableAtom, move.direction)
            }
        })
    }

    private async showSolvedAnimation(): Promise<void> {
        await Hold.forFrames(120)

        this.movableAtoms.sort((a: MovableAtom, b: MovableAtom) => {
            if (a.y > b.y) return 1
            if (a.y < b.y) return -1
            return a.x - b.x
        })

        console.log(this.movableAtoms.map(m => `${m.x}, ${m.y}`).join("\n")) // disassembly in this order

        const boundingClientRect = this.element.getBoundingClientRect()
        await Hold.forAnimation(phase => {
            phase = Easing.easeInQuad(phase)
            this.element.style.top = `${-phase * boundingClientRect.bottom}px`
        }, 20)

        this.initLevel(this.levels[++this.levelPointer])

        await Hold.forAnimation(phase => {
            phase = Easing.easeOutQuad(phase)
            this.element.style.top = `${(1.0 - phase) * boundingClientRect.bottom}px`
        }, 20)

        return new Promise<void>(resolve => {
            resolve()
        })
    }

    private renderStaticAtoms(): void {
        this.atomsCanvas.clear()
        this.movePreview.ifPresent(preview => {
            const movableAtom = preview.movableAtom
            const position = movableAtom.predictMove(preview.direction)
            this.atomsCanvas.showMovePreview(movableAtom, position)
        })
        this.atomsCanvas.paint(this.movableAtoms, (context, movableAtom) => {
            this.atomPainter.paint(context, movableAtom.atom, this.getConnected(movableAtom),
                (movableAtom.x + 0.5) * TILE_SIZE, (movableAtom.y + 0.5) * TILE_SIZE, TILE_SIZE)
        })
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
        await Hold.forAnimation(phase => {
            phase = Easing.easeInOutQuad(phase)
            this.atomsCanvas.clear()
            this.atomsCanvas.paint(this.movableAtoms, (context, movableAtom) => {
                if (movableAtom === movingAtom) {
                    const target = {
                        x: fromX + phase * (toX - fromX),
                        y: fromY + phase * (toY - fromY)
                    }
                    this.atomPainter.paint(context, movableAtom.atom, Empty.Set,
                        (target.x + 0.5) * TILE_SIZE, (target.y + 0.5) * TILE_SIZE, TILE_SIZE)
                } else {
                    this.atomPainter.paint(context, movableAtom.atom, this.getConnected(movableAtom),
                        (movableAtom.x + 0.5) * TILE_SIZE, (movableAtom.y + 0.5) * TILE_SIZE, TILE_SIZE)
                }
            })
        }, 16)
        if (this.level.get().isSolved()) {
            await this.showSolvedAnimation()
        }
        return Promise.resolve()
    }

    private getConnected(movableAtom: MovableAtom): Set<Connector> {
        console.assert(this.level.nonEmpty())
        console.assert(movableAtom !== undefined)
        const set = new Set<Connector>()
        movableAtom.atom.connectors.forEach(connector => {
            const maybeAtom = this.level.get().arena.getField(movableAtom.x + connector.bond.xAxis, movableAtom.y + connector.bond.yAxis)
            if (maybeAtom instanceof Atom) {
                if (maybeAtom.connectors.some(other => other.matches(connector))) {
                    set.add(connector)
                }
            }
        })
        return set
    }

    private initLevel(level: Level): void {
        this.level = Options.valueOf(level)
        this.historyPointer = 0
        ArrayUtils.clear(this.history)

        this.labelLevelId.textContent = (<string>level.id).padStart(2, "0")
        this.labelLevelName.textContent = level.name

        const arena = level.arena
        ArrayUtils.replace(this.movableAtoms, this.initMovableAtoms(arena))
        this.resizeTo(arena.numColumns() * TILE_SIZE, arena.numRows() * TILE_SIZE)
        this.arenaCanvas.paint(arena)
        this.renderMoleculePreview(level.molecule)
        this.renderStaticAtoms()
    }

    private resizeTo(width: number, height: number) {
        this.arenaCanvas.resizeTo(width, height)
        this.atomsCanvas.resizeTo(width, height)
        this.element.style.width = `${width}px`
        this.element.style.height = `${height}px`
    }

    private initMovableAtoms(arena: Map2d): MovableAtom[] {
        const atoms: MovableAtom[] = []
        let count = 0
        arena.iterateFields((maybeAtom, x, y) => {
            if (maybeAtom instanceof Atom) {
                atoms.push(new MovableAtom(arena, maybeAtom, x, y))
                count++
            }
        })
        return atoms
    }

    private renderMoleculePreview(molecule: Map2d) {
        const canvas: HTMLCanvasElement = document.querySelector(".preview canvas")
        const context = canvas.getContext("2d")
        const numRows = molecule.numRows()
        const numColumns = molecule.numColumns()
        const size = 36
        const width = numColumns * size
        const height = numRows * size
        canvas.width = width * devicePixelRatio
        canvas.height = height * devicePixelRatio
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
        context.save()
        context.scale(devicePixelRatio, devicePixelRatio)
        molecule.iterateFields((maybeAtom, x, y) => {
            if (maybeAtom instanceof Atom) {
                this.atomPainter.paint(context, maybeAtom, new Set<Connector>(maybeAtom.connectors),
                    (x + 0.5) * size, (y + 0.5) * size, size)
            }
        })
        context.restore()
    }
}