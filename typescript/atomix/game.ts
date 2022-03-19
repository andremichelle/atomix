import {Atom, Direction, Level, MovableAtom, Tile} from "./model.js"
import {TouchControls} from "./controls.js"
import {Option, Options} from "../lib/common.js"

export class Game {
    static TILE_SIZE = 32

    private readonly context = this.canvas.getContext("2d")
    private readonly atoms: MovableAtom[] = []

    private previewMove: Option<[MovableAtom, Direction]> = Options.None

    constructor(private readonly canvas: HTMLCanvasElement, private readonly level: Level) {
        this.atoms = this.collectAtoms()
        new TouchControls(this)
    }

    getElement(): HTMLElement {
        return this.canvas
    }

    getMovableAtoms(): MovableAtom[] {
        return this.atoms
    }

    update(): void {
        const width = this.level.numColumns() * Game.TILE_SIZE
        const height = this.level.numRows() * Game.TILE_SIZE
        this.canvas.style.width = `${width}px`
        this.canvas.style.height = `${height}px`
        this.canvas.width = width * devicePixelRatio
        this.canvas.height = height * devicePixelRatio

        this.context.save()
        this.context.scale(devicePixelRatio, devicePixelRatio)

        this.level.iterateFields((entry, x, y) => {
            if (entry === Tile.Wall) {
                this.context.fillStyle = "#333"
                this.context.fillRect(
                    x * Game.TILE_SIZE,
                    y * Game.TILE_SIZE,
                    Game.TILE_SIZE,
                    Game.TILE_SIZE)
            } else if (entry instanceof Atom) {
                this.context.fillStyle = "#3F3"
                this.context.fillRect(
                    x * Game.TILE_SIZE,
                    y * Game.TILE_SIZE,
                    Game.TILE_SIZE,
                    Game.TILE_SIZE)
            }
        })

        if (this.previewMove.nonEmpty()) {
            const pair: [MovableAtom, Direction] = this.previewMove.get()
            const position = pair[0].predictMove(pair[1])
            this.context.fillStyle = "#888"
            this.context.fillRect(
                position.x * Game.TILE_SIZE,
                position.y * Game.TILE_SIZE,
                Game.TILE_SIZE,
                Game.TILE_SIZE)
        }

        this.context.restore()
    }

    private collectAtoms(): MovableAtom[] {
        const atoms: MovableAtom[] = []
        this.level.iterateFields((item, x, y) => {
            if (item instanceof Atom) {
                atoms.push(new MovableAtom(this.level, item, x, y))
            }
        })
        return atoms
    }

    showPreviewMove(movableAtom: MovableAtom, direction: Direction) {
        this.previewMove = Options.valueOf([movableAtom, direction])
        this.update()
    }

    hidePreviewMove() {
        if(this.previewMove.nonEmpty()) {
            const pair = this.previewMove.get()
            pair[0].executeMove(pair[1])
            this.previewMove = Options.None
            this.update()
        }
    }
}