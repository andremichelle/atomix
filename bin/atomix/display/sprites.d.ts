import { Direction, Point } from "../../lib/common.js";
import { AtomPainter } from "./painter.js";
import { Atom, Map2d } from "../model/model.js";
export declare class AtomSprite implements Point {
    private readonly atomPainter;
    private readonly arena;
    readonly atom: Atom;
    x: number;
    y: number;
    private readonly canvas;
    private readonly context;
    constructor(atomPainter: AtomPainter, arena: Map2d, atom: Atom, x: number, y: number);
    element(): HTMLElement;
    updatePaint(): void;
    moveTo(field: Point): void;
    dispose(): Promise<void>;
    predictMove(direction: Direction): Point;
    private getConnected;
    private translate;
}
