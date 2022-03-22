import { Point } from "./common.js";
export declare class Polygon {
    static vertices(sides: number, radius: number, offsetAngle?: number): Point[];
    static rounded(vertices: Point[], radius: number): Path2D;
}
