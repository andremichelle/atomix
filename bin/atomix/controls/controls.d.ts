import { Direction } from "../../lib/common.js";
import { AtomSprite } from "../display/sprites.js";
import { SoundManager } from "../sounds.js";
export interface ControlHost {
    getTargetElement(): HTMLElement;
    nearestAtomSprite(x: number, y: number): AtomSprite | null;
    showPreviewMove(movableAtom: AtomSprite, direction: Direction): any;
    hidePreviewMove(commit: boolean): any;
    tileSize(): number;
}
export declare const resolveDirection: (x: number, y: number) => Direction;
export declare class MoveOperation {
    readonly soundManager: SoundManager;
    readonly atomSprite: AtomSprite;
    readonly fromX: number;
    readonly fromY: number;
    readonly toX: number;
    readonly toY: number;
    private readonly distance;
    constructor(soundManager: SoundManager, atomSprite: AtomSprite, fromX: number, fromY: number, toX: number, toY: number);
    execute(): Promise<void>;
    revert(): Promise<void>;
}
export declare class Clock {
    private readonly durationInSeconds;
    private readonly clockUpdate;
    private readonly clockComplete;
    private interval;
    private seconds;
    constructor(durationInSeconds: number, clockUpdate: (seconds: number) => void, clockComplete: () => void);
    restart(): void;
    stop(): void;
    rewind(addScore: (() => void)): Promise<void>;
}
