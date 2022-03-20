import {Atom, Connector, resolveAtomName} from "./model/model.js"
import {Polygon} from "../lib/canvas.js"

export const TILE_SIZE = 64

export class AtomPainter {
    constructor(private readonly context: CanvasRenderingContext2D,
                private readonly size: number) {
    }

    paint(atom: Atom, connected: Set<Connector>): void {
        this.context.strokeStyle = null
        this.context.fillStyle = "#666"
        this.context.beginPath()
        const radius = this.size * 0.4
        atom.connectors.forEach(connector => this.paintConnectors(connector, connected.has(connector)))
        this.context.fillStyle = "#666"
        this.context.fill(Polygon.rounded(Polygon.vertices(8, radius, Math.PI / 8.0), radius / 3))

        this.context.fillStyle = "#999"
        this.context.fill(Polygon.rounded(Polygon.vertices(8, radius * 0.75, Math.PI / 8.0), radius / 3 * 0.75))

        resolveAtomName(atom.kind).ifPresent(name => {
            this.context.fillStyle = "#FFF"
            this.context.textAlign = "center"
            this.context.textBaseline = "middle"
            this.context.font = "100 24px Inter"
            this.context.fillText(name, 0, 0)
        })
    }

    private paintConnectors(connection: Connector, connected: boolean): void {
        const bondThickness = 5
        const bondDistance = 7
        const radius = this.size * (connected ? 0.5 : 0.44)

        this.context.lineWidth = bondThickness
        this.context.lineCap = "butt"

        const nx = connection.bond.xAxis
        const ny = connection.bond.yAxis
        for (let order = 0; order < connection.order; order++) {
            const offset = order * bondDistance - (connection.order - 1) * bondDistance * 0.5
            const min = offset - bondThickness * 0.5
            const max = offset + bondThickness * 0.5
            const gradient = this.context.createLinearGradient(-min * ny, min * nx, -max * ny, max * nx)
            gradient.addColorStop(0.0, "#666")
            gradient.addColorStop(0.5, "#FFF")
            gradient.addColorStop(1.0, "#666")
            this.context.strokeStyle = gradient
            this.context.beginPath()
            this.context.moveTo(-ny * offset, nx * offset)
            this.context.lineTo(-ny * offset + nx * radius, nx * offset + ny * radius)
            this.context.stroke()
        }
    }
}