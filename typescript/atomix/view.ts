import {Atom, Level, Tile} from "./model.js"

export class MapRenderer {
    static TILE_SIZE = 32

    private readonly context = this.canvas.getContext("2d")

    constructor(private readonly canvas: HTMLCanvasElement, private readonly level: Level) {
    }

    update(): void {
        const map: (Atom | Tile)[][] = this.level.map
        const yn = map.length
        const xn = map[0].length
        const width = xn * MapRenderer.TILE_SIZE
        const height = yn * MapRenderer.TILE_SIZE
        this.canvas.style.width = `${width}px`
        this.canvas.style.height = `${height}px`
        this.canvas.width = width
        this.canvas.height = height
        map.forEach((row: (Atom | Tile)[], y: number) => row.forEach((entry: Atom | Tile, x: number) => {
            if (entry === Tile.Wall) {
                this.context.fillStyle = "#333"
                this.context.fillRect(
                    x * MapRenderer.TILE_SIZE,
                    y * MapRenderer.TILE_SIZE,
                    MapRenderer.TILE_SIZE,
                    MapRenderer.TILE_SIZE)
            } else if( entry instanceof Atom) {
                this.context.fillStyle = "#3F3"
                this.context.fillRect(
                    x * MapRenderer.TILE_SIZE,
                    y * MapRenderer.TILE_SIZE,
                    MapRenderer.TILE_SIZE,
                    MapRenderer.TILE_SIZE)
            }
        }))
    }
}