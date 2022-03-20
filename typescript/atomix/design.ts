import {Atom, Connector, Map2d, resolveAtomName, Tile} from "./model/model.js"
import {ArrayUtils} from "../lib/common.js"
import {Mulberry32, Random} from "../lib/math.js"

export const TILE_SIZE = 48

const loadImageBitmaps = async (factory: (index) => string, n): Promise<ImageBitmap[]> => {
    return await Promise.all(ArrayUtils.fill(n, factory).map(path => new Promise<ImageBitmap>((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(createImageBitmap(image))
        image.onerror = (error) => reject(error)
        image.src = path
    })))
}

export class ArenaPainter {
    static async load(): Promise<ArenaPainter> {
        const floors: ImageBitmap[] = await loadImageBitmaps(index => `./assets/floor${index}.jpg`, 2)
        const walls: ImageBitmap[] = await loadImageBitmaps(index => `./assets/wall${index}.jpg`, 6)
        return new ArenaPainter(floors, walls)
    }


    constructor(readonly floors: ImageBitmap[],
                readonly walls: ImageBitmap[]) {
    }

    paint(context: CanvasRenderingContext2D, arena: Map2d): void {
        const random: Random = new Mulberry32()
        arena.iterateFields((entry, x, y) => {
            if (entry !== Tile.Wall) {
                context.drawImage(random.nextDouble(0.0, 1.0) < 0.05 ? this.floors[1] : this.floors[0], x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
            }
        })
        arena.iterateFields((entry, x, y) => {
            if (entry === Tile.Wall) {
                context.fillStyle = "rgba(0, 0, 0, 0.5)"
                context.fillRect(x * TILE_SIZE, y * TILE_SIZE + TILE_SIZE / 8, TILE_SIZE, TILE_SIZE)
            }
        })
        arena.iterateFields((entry, x, y) => {
            if (entry === Tile.Wall) {
                context.drawImage(random.nextDouble(0.0, 1.0) < 0.1 ? random.nextElement(this.walls) : this.walls[0], x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
            }
        })
    }
}

export class AtomPainter {
    static async load(): Promise<AtomPainter> {
        return new AtomPainter(await loadImageBitmaps(index => `./assets/atom${index}.png`, 9))
    }

    constructor(private readonly images: ImageBitmap[]) {
    }

    paint(context: CanvasRenderingContext2D, atom: Atom, connected: Set<Connector>, size: number): void {
        const radius = size * 0.33
        const shadowY = size / 5
        const gradient = context.createRadialGradient(0.0, shadowY, 0.0, 0.0, shadowY, radius)
        gradient.addColorStop(0.6, "rgba(0, 0, 0, 0.8)")
        gradient.addColorStop(1.0, "rgba(0, 0, 0, 0.0)")
        context.fillStyle = gradient
        context.beginPath()
        context.arc(0.0, shadowY, radius, 0.0, Math.PI * 2.0)
        context.fill()

        atom.connectors.forEach(connector => AtomPainter.paintConnectors(context, connector, connected.has(connector), size))

        // Create Map for kind and images
        context.drawImage(this.images[atom.kind], -radius, -radius, radius * 2, radius * 2)

        resolveAtomName(atom.kind).ifPresent(name => {
            context.fillStyle = "rgba(255, 255, 255, 0.6)"
            context.textAlign = "center"
            context.textBaseline = "middle"
            context.font = `100 ${size * 0.25}px Inter`
            context.fillText(name, 0, 0)
        })
    }

    private static paintConnectors(context: CanvasRenderingContext2D, connection: Connector, connected: boolean, size: number): void {
        const bondThickness = size * 0.07
        const bondDistance = size * 0.10

        context.lineWidth = bondThickness
        context.lineCap = "butt"

        const nx = connection.bond.xAxis
        const ny = connection.bond.yAxis
        const nn = Math.sqrt(nx * nx + ny * ny)
        const length = size * (connected ? 0.5 : 0.5 / nn)
        for (let order = 0; order < connection.order; order++) {
            const offset = order * bondDistance - (connection.order - 1) * bondDistance * 0.5
            const min = offset - bondThickness * 0.5
            const max = offset + bondThickness * 0.5
            const gradient = context.createLinearGradient(-min * ny, min * nx, -max * ny, max * nx)
            gradient.addColorStop(0.0, "#555")
            gradient.addColorStop(0.5, "#999")
            gradient.addColorStop(1.0, "#555")
            context.strokeStyle = gradient
            context.beginPath()
            context.moveTo(-ny * offset, nx * offset)
            context.lineTo(-ny * offset + nx * length, nx * offset + ny * length)
            context.stroke()
        }
    }
}