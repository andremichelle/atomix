import { Level } from "./model/model.js";
import { ControlHost } from "./controls/controls.js";
import { Direction } from "../lib/common.js";
import { ArenaPainter, AtomPainter } from "./display/painter.js";
import { SoundManager } from "./sounds.js";
import { AtomSprite } from "./display/sprites.js";
export declare class AtomsLayer {
    private readonly element;
    constructor(element: HTMLElement);
    addSprite(atomSprite: AtomSprite): void;
    removeAllSprites(): void;
}
export declare class GameContext implements ControlHost {
    private readonly element;
    private readonly soundManager;
    private readonly arenaPainter;
    private readonly atomPainter;
    private readonly levels;
    private readonly arenaCanvas;
    private readonly atomsLayer;
    private readonly atomSprites;
    private readonly history;
    private readonly labelTitle;
    private readonly labelLevelId;
    private readonly labelLevelName;
    private movePreview;
    private historyPointer;
    private level;
    private levelPointer;
    constructor(element: HTMLElement, soundManager: SoundManager, arenaPainter: ArenaPainter, atomPainter: AtomPainter, levels: Level[]);
    getTargetElement(): HTMLElement;
    nearestAtomSprite(x: number, y: number): AtomSprite | null;
    showPreviewMove(atomSprite: AtomSprite, direction: Direction): void;
    hidePreviewMove(commit: boolean): Promise<void>;
    private undo;
    private redo;
    private reset;
    private solve;
    private showSolvedAnimation;
    private executeMove;
    private initLevel;
    private resizeTo;
    private initAtomSprites;
    private renderMoleculePreview;
}
