// https://raw.githubusercontent.com/figlief/kp-atomix/master/docs/atomix-json-format.txt
// Atomix level sets in JSON format.
import {Atom, AtomKind, Bond, Connector, Level, Map2d, Tile} from "./model.js"

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
        return new Level(level.name, mapFields(level['arena']), mapFields(level['molecule']))
    })
    console.debug(`There are ${uniqueItemsMap.size} unique and ${countItems} overall items`)
    return levels
}