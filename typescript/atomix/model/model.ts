import {Direction, Option, Options} from "../../lib/common.js"

export enum AtomKind {
    AtomHydrogen, AtomCarbon, AtomOxygen, AtomNitrogen, AtomSulphur,
    AtomFluorine, AtomChlorine, AtomBromine, AtomPhosphorus, AtomCrystal,
    ConnectorHorizontal, ConnectorSlash, ConnectorVertical, ConnectorBackSlash,
    CrystalE, CrystalF, CrystalG, CrystalH,
    CrystalI, CrystalJ, CrystalK, CrystalL
}

export const resolveAtomName = (() => {
    const name: Map<AtomKind, string> = new Map<AtomKind, string>([
        [AtomKind.AtomHydrogen, "H"],
        [AtomKind.AtomCarbon, "C"],
        [AtomKind.AtomOxygen, "O"],
        [AtomKind.AtomNitrogen, "N"],
        [AtomKind.AtomSulphur, "S"],
        [AtomKind.AtomFluorine, "F"],
        [AtomKind.AtomChlorine, "Cl"],
        [AtomKind.AtomBromine, "Br"],
        [AtomKind.AtomPhosphorus, "P"]
    ])
    return (kind: AtomKind): Option<string> => {
        return Options.valueOf(name.get(kind))
    }
})()


export enum Adjacent {
    Prev = -1, Same = 0, Next = 1
}

export class Bond {
    static readonly Top = new Bond(Adjacent.Same, Adjacent.Prev)
    static readonly TopRight = new Bond(Adjacent.Next, Adjacent.Prev)
    static readonly Right = new Bond(Adjacent.Next, Adjacent.Same)
    static readonly DownRight = new Bond(Adjacent.Next, Adjacent.Next)
    static readonly Down = new Bond(Adjacent.Same, Adjacent.Next)
    static readonly DownLeft = new Bond(Adjacent.Prev, Adjacent.Next)
    static readonly Left = new Bond(Adjacent.Prev, Adjacent.Same)
    static readonly TopLeft = new Bond(Adjacent.Prev, Adjacent.Prev)

    constructor(readonly xAxis: Adjacent, readonly yAxis: Adjacent) {
    }

    toString(): string {
        return `Bond{xAxis: ${this.xAxis}, yAxis: ${this.yAxis}}`
    }
}

export class Connector {
    constructor(readonly bond: Bond, readonly order: number = 1) {
    }

    matches(other: Connector): boolean {
        if (this.bond.xAxis !== -other.bond.xAxis) return false
        if (this.bond.yAxis !== -other.bond.yAxis) return false
        return this.order === other.order

    }

    equals(other: Connector): boolean {
        return this.bond === other.bond && this.order === other.order
    }

    toString(): string {
        return `Connector{bond: ${this.bond}, order: ${this.order}`
    }
}

export class Atom {
    constructor(readonly kind: AtomKind, readonly connectors: Connector[]) {
    }

    equals(other: Atom): boolean {
        if (this.kind !== other.kind) return false
        if (this.connectors.length !== other.connectors.length) return
        for (let i = 0; i < this.connectors.length; i++) {
            if (!this.connectors[i].equals(other.connectors[i])) return false
        }
        return true
    }

    toString(): string {
        return `Atom{kind: ${this.kind}, connectors: ${this.connectors.join(",")}`
    }
}

export class Move {
    constructor(readonly x: number, readonly y: number, readonly direction: Direction) {
    }
}

export enum Tile {None, Wall}

export type Field = Atom | Tile

export type FieldIterator = (field: Field, x: number, y: number) => void

export class Map2d {
    constructor(private readonly data: Field[][]) {
        console.assert(data.length > 0)
    }

    iterateFields(iterator: FieldIterator): void {
        this.data.forEach((row: Field[], y: number) =>
            row.forEach((field: Field, x: number) =>
                iterator(field, x, y)))
    }

    setField(x: number, y: number, field: Field): void {
        this.data[y][x] = field
    }

    getField(x: number, y: number): Field {
        return this.data[y][x]
    }

    isFieldEmpty(x: number, y: number): boolean {
        if (y < 0 || y >= this.numRows() || x < 0 || x >= this.numColumns()) return false
        return this.data[y][x] === Tile.None
    }

    numRows(): number {
        return this.data.length
    }

    numColumns(): number {
        return this.data[0].length
    }

    clone(): Map2d {
        return new Map2d(this.data.map(row => row.slice()))
    }

    print(): string {
        return this.data.map(row => row.map(tile => {
            switch (tile) {
                case Tile.None:
                    return " "
                case Tile.Wall:
                    return "#"
                default:
                    return `${tile.kind + 1}`
            }
        }).join("")).join("\n")
    }
}

export class Level {
    constructor(readonly id: string,
                readonly name: string,
                readonly arena: Map2d,
                readonly molecule: Map2d,
                readonly solution: Move[]) {
    }

    clone(): Level {
        return new Level(this.id, this.name, this.arena.clone(), this.molecule, this.solution)
    }

    isSolved(): boolean {
        const wyn = this.arena.numRows() - this.molecule.numRows()
        const wxn = this.arena.numColumns() - this.molecule.numColumns()
        for (let wy = 0; wy < wyn; wy++) {
            for (let wx = 0; wx < wxn; wx++) {
                if (this.matchesMolecule(wx, wy)) {
                    return true
                }
            }
        }
        return false
    }

    private matchesMolecule(wx: number, wy: number): boolean {
        for (let my = 0; my < this.molecule.numRows(); my++) {
            for (let mx = 0; mx < this.molecule.numColumns(); mx++) {
                const possiblyAtom = this.molecule.getField(mx, my)
                if (possiblyAtom instanceof Atom && this.arena.getField(wx + mx, wy + my) !== possiblyAtom) {
                    return false
                }
            }
        }
        return true
    }
}