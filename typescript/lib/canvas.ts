import {ArrayUtils, Point} from "./common.js"

export class Polygon {
    static vertices(sides: number, radius: number, offsetAngle: number = 0): Point[] {
        const step = Math.PI * 2.0 / sides
        return ArrayUtils.fill<Point>(sides, index => {
            const angle = index * step + offsetAngle
            return {x: Math.cos(angle) * radius, y: Math.sin(angle) * radius}
        })
    }

    static rounded(vertices: Point[], radius: number): Path2D {
        const path = new Path2D()
        let p1 = vertices[0]
        let p2 = vertices[1]
        path.moveTo((p1.x + p2.x) / 2, (p1.y + p2.y) / 2)
        for (let i = 2; i <= vertices.length + 1; i++) {
            p1 = p2
            p2 = vertices[i % vertices.length]
            path.arcTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2, radius)
        }
        path.closePath()
        return path
    }
}