// https://raw.githubusercontent.com/figlief/kp-atomix/master/docs/atomix-json-format.txt
// Atomix level sets in JSON format.
import {Atom, AtomKind, Bond, Connection, Level, Tile} from "./model.js"

export const fetchAndTranslate = async (url: string): Promise<Level[]> => {
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
    const bondTypesMap: Map<string, Connection> = new Map<string, Connection>([
        ["a", new Connection(Bond.Top, 1)],
        ["b", new Connection(Bond.TopRight, 1)],
        ["c", new Connection(Bond.Right, 1)],
        ["d", new Connection(Bond.DownRight, 1)],
        ["e", new Connection(Bond.Down, 1)],
        ["f", new Connection(Bond.DownLeft, 1)],
        ["g", new Connection(Bond.Left, 1)],
        ["h", new Connection(Bond.TopLeft, 1)],
        ["A", new Connection(Bond.Top, 2)],
        ["B", new Connection(Bond.Right, 2)],
        ["C", new Connection(Bond.Down, 2)],
        ["D", new Connection(Bond.Left, 2)],
        ["E", new Connection(Bond.Top, 3)],
        ["F", new Connection(Bond.Right, 3)],
        ["G", new Connection(Bond.Down, 3)],
        ["H", new Connection(Bond.Left, 3)]
    ])
    // make them unique
    const uniqueItemsMap: Map<string, Atom> = new Map<string, Atom>()
    const json: JSON = await fetch(url).then(x => x.json())
    let countItems = 0
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
            countItems++
        }
        const mapFields = (data: string[]): (Tile | Atom)[][] => {
            return data.map((row: string) => row.split("")
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
                }))
        }
        return new Level(level.name, mapFields(level['arena']), mapFields(level['molecule']))
    })
    console.debug(`There are ${uniqueItemsMap.size} unique and ${countItems} overall items`)
    return levels
}