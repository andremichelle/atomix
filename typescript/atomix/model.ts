export enum AtomKind {
    AtomHydrogen, AtomCarbon, AtomOxygen, AtomNitrogen, AtomSulphur,
    AtomFluorine, AtomChlorine, AtomBromine, AtomPhosphorus, AtomCrystal,
    ConnectorHorizontal, ConnectorSlash, ConnectorVertical, ConnectorBackSlash,
    CrystalE, CrystalF, CrystalG, CrystalH,
    CrystalI, CrystalJ, CrystalK, CrystalL
}

export enum Adjacent {
    Prev = -1, Same = 0, Next = 1
}

export class Bond {
    static readonly Top = [Adjacent.Same, Adjacent.Prev]
    static readonly TopRight = [Adjacent.Next, Adjacent.Prev]
    static readonly Right = [Adjacent.Next, Adjacent.Same]
    static readonly DownRight = [Adjacent.Next, Adjacent.Next]
    static readonly Down = [Adjacent.Same, Adjacent.Next]
    static readonly DownLeft = [Adjacent.Prev, Adjacent.Next]
    static readonly Left = [Adjacent.Prev, Adjacent.Same]
    static readonly TopLeft = [Adjacent.Prev, Adjacent.Prev]
}

export class Connection {
    constructor(readonly bound: Bond, readonly order: number = 1) {
    }

    equals(other: Connection): boolean {
        return this.bound === other.bound && this.order === other.order
    }
}

export class Atom {
    constructor(readonly kind: AtomKind, readonly connections: Connection[]) {
    }

    equals(other: Atom): boolean {
        if (this.kind !== other.kind) return false
        if (this.connections.length !== other.connections.length) return
        for (let i = 0; i < this.connections.length; i++) {
            if (!this.connections[i].equals(other.connections[i])) return false
        }
        return true
    }
}

export enum Direction {
    Up, Right, Down, Left
}

export enum Tile {None, Wall}

export interface Position {
    x: number
    y: number
}

export class MovableAtom implements Position {
    constructor(private readonly level: Level,
                private readonly atom: Atom,
                public x: number,
                public y: number) {
    }

    predictMove(direction: Direction): Position {
        const arena = this.level.arena
        switch (direction) {
            case Direction.Up: {
                let x = this.x
                let y = this.y
                while (arena.isFieldEmpty(x, y - 1)) y--
                return {x: x, y: y}
            }
            case Direction.Down: {
                let x = this.x
                let y = this.y
                while (arena.isFieldEmpty(x, y + 1)) y++
                return {x: x, y: y}
            }
            case Direction.Left: {
                let x = this.x
                let y = this.y
                while (arena.isFieldEmpty(x - 1, y)) x--
                return {x: x, y: y}
            }
            case Direction.Right: {
                let x = this.x
                let y = this.y
                while (arena.isFieldEmpty(x + 1, y)) x++
                return {x: x, y: y}
            }
        }
    }

    executeMove(direction: Direction): boolean {
        const field: Position = this.predictMove(direction)
        if (this.x === field.x && this.y === field.y) return false
        this.level.moveAtom(this, field)
        this.x = field.x
        this.y = field.y
        return true
    }
}

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
    constructor(readonly name: string,
                readonly arena: Map2d,
                readonly molecule: Map2d) {
    }

    moveAtom(source: MovableAtom, target: Position): void {
        const atom: Atom = <Atom>this.arena.getField(source.x, source.y)
        this.arena.setField(source.x, source.y, Tile.None)
        this.arena.setField(target.x, target.y, atom)
    }

    isSolved(): boolean {
        const wyn = this.arena.numRows() - this.molecule.numRows()
        const wxn = this.arena.numColumns() - this.molecule.numColumns()
        for (let wy = 0; wy < wyn; wy++) {
            for (let wx = 0; wx < wxn; wx++) {
                if (this.isMolecule(wx, wy)) {
                    return true
                }
            }
        }
        return false
    }

    isMolecule(wx: number, wy: number): boolean {
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