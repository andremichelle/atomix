import { Atom, Connector, Map2d } from "../model/model.js";
export declare class ArenaPainter {
    private readonly floors;
    private readonly walls;
    static load(): Promise<ArenaPainter>;
    constructor(floors: ImageBitmap[], walls: ImageBitmap[]);
    paint(context: CanvasRenderingContext2D, arena: Map2d, tileSize: number): void;
}
export declare class AtomPainter {
    private readonly images;
    static load(): Promise<AtomPainter>;
    constructor(images: ImageBitmap[]);
    paint(context: CanvasRenderingContext2D, atom: Atom, connected: Set<Connector>, x: number, y: number, tileSize: number): void;
    private static paintConnectors;
}
