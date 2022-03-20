import {Atom, Connector, resolveAtomName} from "./model/model.js"

export const TILE_SIZE = 48

export class AtomPainter {
    constructor(private readonly context: CanvasRenderingContext2D,
                private readonly size: number) {
    }

    paint(atom: Atom, connected: Set<Connector>): void {
        this.context.strokeStyle = null
        this.context.fillStyle = "#666"
        this.context.beginPath()
        const radius = this.size * 0.33
        atom.connectors.forEach(connector => this.paintConnectors(connector, connected.has(connector)))
        const gradient = this.context.createRadialGradient(0.0, 0.0, 0.0, 0.0, 0.0, radius)
        gradient.addColorStop(0.00, "#333")
        gradient.addColorStop(0.55, "#333")
        gradient.addColorStop(0.85, "#AAA")
        gradient.addColorStop(0.95, "#AAA")
        gradient.addColorStop(1.00, "#333")
        this.context.fillStyle = gradient
        this.context.beginPath()
        this.context.arc(0.0, 0.0, radius, 0.0, Math.PI * 2.0)
        this.context.fill()

        resolveAtomName(atom.kind).ifPresent(name => {
            this.context.fillStyle = "#FFF"
            this.context.textAlign = "center"
            this.context.textBaseline = "middle"
            this.context.font = `100 ${this.size * 0.25}px Inter`
            this.context.fillText(name, 0, 0)
        })
    }

    private paintConnectors(connection: Connector, connected: boolean): void {
        const bondThickness = this.size * 0.07
        const bondDistance = this.size * 0.10

        this.context.lineWidth = bondThickness
        this.context.lineCap = "butt"

        const nx = connection.bond.xAxis
        const ny = connection.bond.yAxis
        const nn = Math.sqrt(nx * nx + ny * ny)
        const length = this.size * (connected ? 0.5 : 0.5 / nn)
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
            this.context.lineTo(-ny * offset + nx * length, nx * offset + ny * length)
            this.context.stroke()
        }
    }
}