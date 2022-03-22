import { Level, Move } from "./model.js";
export declare const fetchAndTranslateSolutions: (url: string) => Promise<Move[][]>;
export declare const fetchAndTranslateLevels: (url: string, solutions: Move[][]) => Promise<Level[]>;
