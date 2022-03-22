export declare enum Sound {
    Move = 0,
    Dock = 1,
    Complete = 2,
    StartLevel = 3,
    DisposeAtom = 4,
    NextLevel = 5
}
export declare class SoundManager {
    private readonly context;
    private readonly map;
    constructor(context: AudioContext);
    load(): Promise<void>[];
    play(sound: Sound): () => void;
    private register;
}
