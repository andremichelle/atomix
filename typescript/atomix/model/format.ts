// https://raw.githubusercontent.com/figlief/kp-atomix/master/docs/atomix-json-format.txt
import {Direction} from "../../lib/common.js"
import {Atom, AtomKind, Bond, Connector, Level, Map2d, Move, Tile} from "./model.js"

export const fetchAndTranslateSolutions = async (url: string): Promise<Move[][]> => {
    const deserializeMove = (code: string): Move => {
        const codeStart = "a".codePointAt(0)
        const indices: number[] = code.split("").map(char => char.codePointAt(0) - codeStart)
        const x0 = indices[1]
        const y0 = indices[0]
        const x1 = indices[3]
        const y1 = indices[2]
        return new Move(x0, y0, resolveDirection(x0, x1, y0, y1))
    }

    const resolveDirection = (x0: number, x1: number, y0: number, y1: number): Direction => {
        if (x0 === x1) {
            if (y1 < y0) return Direction.Up
            else return Direction.Down
        } else {
            if (x1 < x0) return Direction.Left
            else return Direction.Right
        }
    }
    const solutions: Move[][] = []
    return fetch(url).then(x => x.json()).then((json: any[]) => {
        for (const jsonElement of json) {
            if (jsonElement.level) {
                solutions.push(jsonElement.history.match(/.{1,4}/g).map(code => deserializeMove(code)))
            }
        }
        return solutions
    })
}

export const fetchAndTranslateLevels = async (url: string, solutions: Move[][]): Promise<Level[]> => {
    const itemKindMap: Map<string, AtomKind> = new Map<string, AtomKind>([
        ["1", AtomKind.AtomHydrogen],
        ["2", AtomKind.AtomCarbon],
        ["3", AtomKind.AtomOxygen],
        ["4", AtomKind.AtomNitrogen],
        ["5", AtomKind.AtomSulphur],
        ["6", AtomKind.AtomFluorine],
        ["7", AtomKind.AtomChlorine],
        ["8", AtomKind.AtomBromine],
        ["9", AtomKind.AtomPhosphorus],
        ["o", AtomKind.AtomCrystal],
        ["A", AtomKind.ConnectorHorizontal],
        ["B", AtomKind.ConnectorSlash],
        ["C", AtomKind.ConnectorVertical],
        ["D", AtomKind.ConnectorBackSlash],
        ["E", AtomKind.CrystalE],
        ["F", AtomKind.CrystalF],
        ["G", AtomKind.CrystalG],
        ["H", AtomKind.CrystalH],
        ["I", AtomKind.CrystalI],
        ["J", AtomKind.CrystalJ],
        ["K", AtomKind.CrystalK],
        ["L", AtomKind.CrystalL]
    ])
    const bondTypesMap: Map<string, Connector> = new Map<string, Connector>([
        ["a", new Connector(Bond.Top, 1)],
        ["b", new Connector(Bond.TopRight, 1)],
        ["c", new Connector(Bond.Right, 1)],
        ["d", new Connector(Bond.DownRight, 1)],
        ["e", new Connector(Bond.Down, 1)],
        ["f", new Connector(Bond.DownLeft, 1)],
        ["g", new Connector(Bond.Left, 1)],
        ["h", new Connector(Bond.TopLeft, 1)],
        ["A", new Connector(Bond.Top, 2)],
        ["B", new Connector(Bond.Right, 2)],
        ["C", new Connector(Bond.Down, 2)],
        ["D", new Connector(Bond.Left, 2)],
        ["E", new Connector(Bond.Top, 3)],
        ["F", new Connector(Bond.Right, 3)],
        ["G", new Connector(Bond.Down, 3)],
        ["H", new Connector(Bond.Left, 3)]
    ])
    // make them unique
    const uniqueItemsMap: Map<string, Atom> = new Map<string, Atom>()
    const json: JSON = await fetch(url).then(x => x.json())
    let atomsCount = 0
    let levelCount = 0
    const levels: Level[] = json['levels'].map(level => {
        const levelItems: Map<string, Atom> = new Map<string, Atom>()
        const atomsFormat = level['atoms']
        for (const key in atomsFormat) {
            const atom: [string, string] = atomsFormat[key]
            const item = new Atom(itemKindMap.get(atom[0]), atom[1].split("").map(key => bondTypesMap.get(key)))
            const uniqueID = atom.join("")
            const cached = uniqueItemsMap.get(uniqueID)
            if (cached === undefined) {
                uniqueItemsMap.set(uniqueID, item)
            } else if (!cached.equals(item)) {
                throw new Error(`Cache has invalid entry for key ${uniqueID}. cache: ${cached}, item: ${item}`)
            }
            levelItems.set(key, item)
            atomsCount++
        }
        const mapFields = (data: string[]): Map2d => {
            return new Map2d(data.map((row: string) => row.split("")
                .map((key: string) => {
                    switch (key) {
                        case ".":
                            return Tile.None
                        case "#":
                            return Tile.Wall
                        default:
                            const atom: Atom = levelItems.get(key)
                            if (atom === undefined) {
                                throw new Error(`No atom found for key: ${key}`)
                            }
                            return atom
                    }
                })))
        }
        return new Level(level.id, level.name, mapFields(level['arena']), mapFields(level['molecule']), solutions[levelCount++])
    })
    console.debug(`There are ${uniqueItemsMap.size} unique and ${atomsCount} overall items`)
    return levels
}