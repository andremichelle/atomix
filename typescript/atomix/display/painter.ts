import {Atom, Connector, Map2d, resolveAtomName, Tile} from "../model/model.js"
import {loadImageBitmaps} from "../../lib/common.js"
import {Mulberry32, Random} from "../../lib/math.js"

export class ArenaPainter {
    static async load(): Promise<ArenaPainter> {
        const floors: ImageBitmap[] = await loadImageBitmaps(index => `./assets/floor${index}.jpg`, 2)
        const walls: ImageBitmap[] = await loadImageBitmaps(index => `./assets/wall${index}.jpg`, 6)
        return new ArenaPainter(floors, walls)
    }

    constructor(private readonly floors: ImageBitmap[],
                private readonly walls: ImageBitmap[]) {
    }

    paint(context: CanvasRenderingContext2D, arena: Map2d, tileSize: number): void {
        const random: Random = new Mulberry32()
        arena.iterateFields((entry, x, y) => {
            if (entry !== Tile.Wall) {
                context.drawImage(random.nextDouble(0.0, 1.0) < 0.05 ? this.floors[1] : this.floors[0], x * tileSize, y * tileSize, tileSize, tileSize)
            }
        })
        arena.iterateFields((entry, x, y) => {
            if (entry === Tile.Wall) {
                context.fillStyle = "rgba(0, 0, 0, 0.5)"
                context.fillRect(x * tileSize, y * tileSize + tileSize / 8, tileSize, tileSize)
            }
        })
        arena.iterateFields((entry, x, y) => {
            if (entry === Tile.Wall) {
                context.drawImage(random.nextDouble(0.0, 1.0) < 0.1 ? random.nextElement(this.walls) : this.walls[0], x * tileSize, y * tileSize, tileSize, tileSize)
            }
        })
    }
}

export class AtomPainter {
    static async load(): Promise<AtomPainter> {
        return new AtomPainter(await loadImageBitmaps(index => `./assets/atom${index}.png`, 18))
    }

    constructor(private readonly images: ImageBitmap[]) {
    }

    paint(context: CanvasRenderingContext2D, atom: Atom, connected: Set<Connector>, x: number, y: number, tileSize: number): void {
        context.save()
        context.translate(x, y)
        const radius = tileSize * 0.33
        const shadowY = tileSize / 6
        const gradient = context.createRadialGradient(0.0, shadowY, 0.0, 0.0, shadowY, radius)
        gradient.addColorStop(0.6, "rgba(0, 0, 0, 0.8)")
        gradient.addColorStop(1.0, "rgba(0, 0, 0, 0.0)")
        context.fillStyle = gradient
        context.beginPath()
        context.arc(0.0, shadowY, radius, 0.0, Math.PI * 2.0)
        context.fill()
        atom.connectors.forEach(connector => AtomPainter
            .paintConnectors(context, connector, connected.has(connector), tileSize))
        context.drawImage(this.images[atom.kind], -radius, -radius, radius * 2, radius * 2)
        resolveAtomName(atom.kind).ifPresent(name => {
            context.fillStyle = "rgba(255, 255, 255, 0.5)"
            context.textAlign = "center"
            context.textBaseline = "middle"
            context.font = `bold ${tileSize * 0.25}px "Inter"`
            context.fillText(name, 0, 0)
        })
        context.restore()
    }

    private static paintConnectors(context: CanvasRenderingContext2D, connection: Connector, connected: boolean, size: number): void {
        const bondThickness = size * 0.07
        const bondDistance = size * 0.10
        context.lineWidth = bondThickness
        context.lineCap = "butt"
        const nx = connection.bond.xAxis
        const ny = connection.bond.yAxis
        const nn = Math.sqrt(nx * nx + ny * ny)
        const length = size * (connected ? 0.5 : 0.475 / nn)
        for (let order = 0; order < connection.order; order++) {
            const offset = order * bondDistance - (connection.order - 1) * bondDistance * 0.5
            const min = offset - bondThickness * 0.5
            const max = offset + bondThickness * 0.5
            const gradient = context.createLinearGradient(-min * ny, min * nx, -max * ny, max * nx)
            if (connected) {
                gradient.addColorStop(0.0, "#777")
                gradient.addColorStop(0.5, "#BBB")
                gradient.addColorStop(1.0, "#777")
            } else {
                gradient.addColorStop(0.0, "#555")
                gradient.addColorStop(0.5, "#999")
                gradient.addColorStop(1.0, "#555")
            }
            context.strokeStyle = gradient
            context.beginPath()
            context.moveTo(-ny * offset, nx * offset)
            context.lineTo(-ny * offset + nx * length, nx * offset + ny * length)
            context.stroke()
        }
    }
}