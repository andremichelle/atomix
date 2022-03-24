import { Direction, Point, Value } from "../../lib/common.js";
import { ArenaPainter, AtomPainter } from "./painter.js";
import { Atom, Map2d } from "../model/model.js";
export declare class AtomSprite implements Point {
    private readonly atomPainter;
    private readonly tileSizeValue;
    private readonly arena;
    readonly atom: Atom;
    x: number;
    y: number;
    private static PADDING;
    private readonly canvas;
    private readonly context;
    constructor(atomPainter: AtomPainter, tileSizeValue: Value<number>, arena: Map2d, atom: Atom, x: number, y: number);
    element(): HTMLElement;
    updatePaint(): void;
    mapMoveDuration(distance: number): void;
    moveTo(field: Point): void;
    dispose(): Promise<void>;
    predictMove(direction: Direction): Point;
    private getConnected;
    private translate;
}
export declare class MovePreview {
    readonly atomSprite: AtomSprite;
    readonly direction: Direction;
    readonly hidePreview: () => void;
    constructor(atomSprite: AtomSprite, direction: Direction, hidePreview: () => void);
}
export declare class ArenaCanvas {
    private readonly arenaPainter;
    private readonly canvas;
    private readonly context;
    constructor(arenaPainter: ArenaPainter);
    readonly element: HTMLElement;
    resizeTo(width: number, height: number): void;
    paint(arena: Map2d, tileSize: number): void;
}
export declare class AtomsLayer {
    private readonly element;
    constructor(element: HTMLElement);
    addSprite(atomSprite: AtomSprite): void;
    removeAllSprites(): void;
    showMovePreview(source: Point, target: Point, tileSize: number): () => void;
}
