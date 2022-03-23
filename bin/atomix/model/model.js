import { Options } from "../../lib/common.js";
export var AtomKind;
(function (AtomKind) {
    AtomKind[AtomKind["AtomHydrogen"] = 0] = "AtomHydrogen";
    AtomKind[AtomKind["AtomCarbon"] = 1] = "AtomCarbon";
    AtomKind[AtomKind["AtomOxygen"] = 2] = "AtomOxygen";
    AtomKind[AtomKind["AtomNitrogen"] = 3] = "AtomNitrogen";
    AtomKind[AtomKind["AtomSulphur"] = 4] = "AtomSulphur";
    AtomKind[AtomKind["AtomFluorine"] = 5] = "AtomFluorine";
    AtomKind[AtomKind["AtomChlorine"] = 6] = "AtomChlorine";
    AtomKind[AtomKind["AtomBromine"] = 7] = "AtomBromine";
    AtomKind[AtomKind["AtomPhosphorus"] = 8] = "AtomPhosphorus";
    AtomKind[AtomKind["AtomCrystal"] = 9] = "AtomCrystal";
    AtomKind[AtomKind["CrystalE"] = 10] = "CrystalE";
    AtomKind[AtomKind["CrystalF"] = 11] = "CrystalF";
    AtomKind[AtomKind["CrystalG"] = 12] = "CrystalG";
    AtomKind[AtomKind["CrystalH"] = 13] = "CrystalH";
    AtomKind[AtomKind["CrystalI"] = 14] = "CrystalI";
    AtomKind[AtomKind["CrystalJ"] = 15] = "CrystalJ";
    AtomKind[AtomKind["CrystalK"] = 16] = "CrystalK";
    AtomKind[AtomKind["CrystalL"] = 17] = "CrystalL";
})(AtomKind || (AtomKind = {}));
export const resolveAtomName = (() => {
    const name = new Map([
        [AtomKind.AtomHydrogen, "H"],
        [AtomKind.AtomCarbon, "C"],
        [AtomKind.AtomOxygen, "O"],
        [AtomKind.AtomNitrogen, "N"],
        [AtomKind.AtomSulphur, "S"],
        [AtomKind.AtomFluorine, "F"],
        [AtomKind.AtomChlorine, "Cl"],
        [AtomKind.AtomBromine, "Br"],
        [AtomKind.AtomPhosphorus, "P"]
    ]);
    return (kind) => {
        return Options.valueOf(name.get(kind));
    };
})();
export var Adjacent;
(function (Adjacent) {
    Adjacent[Adjacent["Prev"] = -1] = "Prev";
    Adjacent[Adjacent["Same"] = 0] = "Same";
    Adjacent[Adjacent["Next"] = 1] = "Next";
})(Adjacent || (Adjacent = {}));
export class Bond {
    constructor(xAxis, yAxis) {
        this.xAxis = xAxis;
        this.yAxis = yAxis;
    }
    toString() {
        return `Bond{xAxis: ${this.xAxis}, yAxis: ${this.yAxis}}`;
    }
}
Bond.Top = new Bond(Adjacent.Same, Adjacent.Prev);
Bond.TopRight = new Bond(Adjacent.Next, Adjacent.Prev);
Bond.Right = new Bond(Adjacent.Next, Adjacent.Same);
Bond.DownRight = new Bond(Adjacent.Next, Adjacent.Next);
Bond.Down = new Bond(Adjacent.Same, Adjacent.Next);
Bond.DownLeft = new Bond(Adjacent.Prev, Adjacent.Next);
Bond.Left = new Bond(Adjacent.Prev, Adjacent.Same);
Bond.TopLeft = new Bond(Adjacent.Prev, Adjacent.Prev);
export class Connector {
    constructor(bond, order = 1) {
        this.bond = bond;
        this.order = order;
    }
    matches(other) {
        if (this.bond.xAxis !== -other.bond.xAxis)
            return false;
        if (this.bond.yAxis !== -other.bond.yAxis)
            return false;
        return this.order === other.order;
    }
    equals(other) {
        return this.bond === other.bond && this.order === other.order;
    }
    toString() {
        return `Connector{bond: ${this.bond}, order: ${this.order}`;
    }
}
export class Atom {
    constructor(kind, connectors) {
        this.kind = kind;
        this.connectors = connectors;
    }
    equals(other) {
        if (this.kind !== other.kind)
            return false;
        if (this.connectors.length !== other.connectors.length)
            return;
        for (let i = 0; i < this.connectors.length; i++) {
            if (!this.connectors[i].equals(other.connectors[i]))
                return false;
        }
        return true;
    }
    toString() {
        return `Atom{kind: ${this.kind}, connectors: ${this.connectors.join(",")}`;
    }
}
export class Move {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.direction = direction;
    }
}
export var Tile;
(function (Tile) {
    Tile[Tile["None"] = 0] = "None";
    Tile[Tile["Wall"] = 1] = "Wall";
})(Tile || (Tile = {}));
export class Map2d {
    constructor(data) {
        this.data = data;
        console.assert(data.length > 0);
    }
    iterateFields(iterator) {
        this.data.forEach((row, y) => row.forEach((field, x) => iterator(field, x, y)));
    }
    setField(x, y, field) {
        this.data[y][x] = field;
    }
    getField(x, y) {
        return this.data[y][x];
    }
    isFieldEmpty(x, y) {
        if (y < 0 || y >= this.numRows() || x < 0 || x >= this.numColumns())
            return false;
        return this.data[y][x] === Tile.None;
    }
    numRows() {
        return this.data.length;
    }
    numColumns() {
        return this.data[0].length;
    }
    clone() {
        return new Map2d(this.data.map(row => row.slice()));
    }
    print() {
        return this.data.map(row => row.map(tile => {
            switch (tile) {
                case Tile.None:
                    return " ";
                case Tile.Wall:
                    return "#";
                default:
                    return `${tile.kind + 1}`;
            }
        }).join("")).join("\n");
    }
}
export class Level {
    constructor(id, name, arena, molecule, solution) {
        this.id = id;
        this.name = name;
        this.arena = arena;
        this.molecule = molecule;
        this.solution = solution;
    }
    clone() {
        return new Level(this.id, this.name, this.arena.clone(), this.molecule, this.solution);
    }
    isSolved() {
        const wyn = this.arena.numRows() - this.molecule.numRows();
        const wxn = this.arena.numColumns() - this.molecule.numColumns();
        for (let wy = 0; wy < wyn; wy++) {
            for (let wx = 0; wx < wxn; wx++) {
                if (this.matchesMolecule(wx, wy)) {
                    return true;
                }
            }
        }
        return false;
    }
    matchesMolecule(wx, wy) {
        for (let my = 0; my < this.molecule.numRows(); my++) {
            for (let mx = 0; mx < this.molecule.numColumns(); mx++) {
                const possiblyAtom = this.molecule.getField(mx, my);
                if (possiblyAtom instanceof Atom && this.arena.getField(wx + mx, wy + my) !== possiblyAtom) {
                    return false;
                }
            }
        }
        return true;
    }
}
//# sourceMappingURL=model.js.map