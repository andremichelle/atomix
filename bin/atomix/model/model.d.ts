import { Direction, Option } from "../../lib/common.js";
export declare enum AtomKind {
    AtomHydrogen = 0,
    AtomCarbon = 1,
    AtomOxygen = 2,
    AtomNitrogen = 3,
    AtomSulphur = 4,
    AtomFluorine = 5,
    AtomChlorine = 6,
    AtomBromine = 7,
    AtomPhosphorus = 8,
    AtomCrystal = 9,
    CrystalE = 10,
    CrystalF = 11,
    CrystalG = 12,
    CrystalH = 13,
    CrystalI = 14,
    CrystalJ = 15,
    CrystalK = 16,
    CrystalL = 17
}
export declare const resolveAtomName: (kind: AtomKind) => Option<string>;
export declare enum Adjacent {
    Prev = -1,
    Same = 0,
    Next = 1
}
export declare class Bond {
    readonly xAxis: Adjacent;
    readonly yAxis: Adjacent;
    static readonly Top: Bond;
    static readonly TopRight: Bond;
    static readonly Right: Bond;
    static readonly DownRight: Bond;
    static readonly Down: Bond;
    static readonly DownLeft: Bond;
    static readonly Left: Bond;
    static readonly TopLeft: Bond;
    constructor(xAxis: Adjacent, yAxis: Adjacent);
    toString(): string;
}
export declare class Connector {
    readonly bond: Bond;
    readonly order: number;
    constructor(bond: Bond, order?: number);
    matches(other: Connector): boolean;
    equals(other: Connector): boolean;
    toString(): string;
}
export declare class Atom {
    readonly kind: AtomKind;
    readonly connectors: Connector[];
    constructor(kind: AtomKind, connectors: Connector[]);
    equals(other: Atom): boolean;
    toString(): string;
}
export declare class Move {
    readonly x: number;
    readonly y: number;
    readonly direction: Direction;
    constructor(x: number, y: number, direction: Direction);
}
export declare enum Tile {
    None = 0,
    Wall = 1
}
export declare type Field = Atom | Tile;
export declare type FieldIterator = (field: Field, x: number, y: number) => void;
export declare class Map2d {
    private readonly data;
    constructor(data: Field[][]);
    iterateFields(iterator: FieldIterator): void;
    setField(x: number, y: number, field: Field): void;
    getField(x: number, y: number): Field;
    isFieldEmpty(x: number, y: number): boolean;
    numRows(): number;
    numColumns(): number;
    clone(): Map2d;
    print(): string;
}
export declare class Level {
    readonly id: string;
    readonly name: string;
    readonly arena: Map2d;
    readonly molecule: Map2d;
    readonly solution: Move[];
    constructor(id: string, name: string, arena: Map2d, molecule: Map2d, solution: Move[]);
    clone(): Level;
    isSolved(): boolean;
    private matchesMolecule;
}
