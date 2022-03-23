import { ObservableValueImpl } from "../lib/common.js";
export declare enum Sound {
    BackgroundLoop = 0,
    Move = 1,
    Dock = 2,
    Complete = 3,
    StartLevel = 4,
    AtomAppear = 5,
    AtomDispose = 6,
    TransitionLevel = 7
}
export interface SoundPlayOptions {
    loop?: boolean;
    fadeInSeconds?: number;
    fadeOutSeconds?: number;
}
export declare class SoundManager {
    private readonly context;
    private readonly map;
    private readonly masterGain;
    readonly enabled: ObservableValueImpl<boolean>;
    constructor(context: AudioContext);
    load(): Promise<void>[];
    play(sound: Sound, options?: SoundPlayOptions): () => void;
    private register;
}
