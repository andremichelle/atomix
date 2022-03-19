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
        const level = this.level
        switch (direction) {
            case Direction.Up: {
                let x = this.x
                let y = this.y
                while (level.isFieldEmpty(x, y - 1)) y--
                return {x: x, y: y}
            }
            case Direction.Down: {
                let x = this.x
                let y = this.y
                while (level.isFieldEmpty(x, y + 1)) y++
                return {x: x, y: y}
            }
            case Direction.Left: {
                let x = this.x
                let y = this.y
                while (level.isFieldEmpty(x - 1, y)) x--
                return {x: x, y: y}
            }
            case Direction.Right: {
                let x = this.x
                let y = this.y
                while (level.isFieldEmpty(x + 1, y)) x++
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

export type FieldIterator = (item: (Atom | Tile), x: number, y: number) => void

export class Level {
    constructor(private readonly name: string,
                private readonly map: (Atom | Tile)[][],
                private readonly molecule: (Atom | Tile)[][]) {
        console.assert(map.length > 0)
        console.assert(molecule.length > 0)
    }

    numRows(): number {
        return this.map.length
    }

    numColumns(): number {
        return this.map[0].length
    }

    moveAtom(source: MovableAtom, target: Position): void {
        const atom: Atom = <Atom>this.map[source.y][source.x]
        this.map[source.y][source.x] = Tile.None
        this.map[target.y][target.x] = atom
    }

    isFieldEmpty(x: number, y: number): boolean {
        if (y < 0 || y >= this.map.length || x < 0 || x >= this.map[0].length) return false
        return this.map[y][x] === Tile.None
    }

    iterateFields(iterator: FieldIterator): void {
        this.map.forEach((row: (Atom | Tile)[], y: number) =>
            row.forEach((item: Atom | Tile, x: number) =>
                iterator(item, x, y)))
    }

    clone(): Level {
        return new Level(this.name, this.map.map(row => row.slice()), this.molecule)
    }

    print(): string {
        return this.map.map(row => row.map(tile => {
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