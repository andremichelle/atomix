import { Level } from "./model/model.js";
import { ControlHost } from "./controls/controls.js";
import { Direction, Point } from "../lib/common.js";
import { ArenaPainter, AtomPainter } from "./display/painter.js";
import { SoundManager } from "./sounds.js";
import { AtomSprite } from "./display/sprites.js";
export declare class AtomsLayer {
    private readonly element;
    constructor(element: HTMLElement);
    addSprite(atomSprite: AtomSprite): void;
    removeAllSprites(): void;
    showMovePreview(source: Point, target: Point, tileSize: number): () => void;
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
    private readonly labelScore;
    private readonly labelCountMoves;
    private readonly labelLevelId;
    private readonly labelLevelName;
    private readonly labelLevelTime;
    private readonly tileSizeValue;
    private readonly clock;
    private backgroundAudioStop;
    private transitionSoundStop;
    private movePreview;
    private historyPointer;
    private level;
    private levelPointer;
    private score;
    private moveCount;
    acceptUserInput: boolean;
    constructor(element: HTMLElement, soundManager: SoundManager, arenaPainter: ArenaPainter, atomPainter: AtomPainter, levels: Level[]);
    start(): Promise<void>;
    getTargetElement(): HTMLElement;
    nearestAtomSprite(x: number, y: number): AtomSprite | null;
    showPreviewMove(atomSprite: AtomSprite, direction: Direction): void;
    hidePreviewMove(commit: boolean): Promise<void>;
    tileSize(): number;
    private undo;
    private redo;
    private reset;
    private solve;
    private startLevel;
    private executeMove;
    private showSolvedAnimation;
    private paintLevel;
    private initAtomSprites;
    private renderMoleculePreview;
    private static sortAtomSprites;
    private static resolveShakeClassName;
}
