import {ObservableValueImpl} from "../lib/common.js"

export enum Sound {
    BackgroundLoop, Move, Dock, Complete, LevelDocked,
    AtomAppear, ClockElapsed, ClockRewind, AtomDispose, TransitionLevel
}

export interface SoundPlayOptions {
    loop?: boolean
    fadeInSeconds?: number
    fadeOutSeconds?: number
}

export class SoundManager {
    private readonly map: Map<Sound, AudioBuffer> = new Map()
    private readonly masterGain: GainNode = this.context.createGain()

    readonly enabled: ObservableValueImpl<boolean> = new ObservableValueImpl<boolean>(true)

    constructor(private readonly context: AudioContext) {
        this.enabled.addObserver(enabled => this.masterGain.gain.value = enabled ? 1.0 : 0.0, true)
        this.masterGain.connect(this.context.destination)
    }

    load(): Promise<void>[] {
        return [
            this.register(Sound.BackgroundLoop, "samples/background-loop.wav"),
            this.register(Sound.Move, "samples/move.wav"),
            this.register(Sound.Dock, "samples/dock.wav"),
            this.register(Sound.Complete, "samples/complete.wav"),
            this.register(Sound.LevelDocked, "samples/level-docked.wav"),
            this.register(Sound.AtomAppear, "samples/atom-appear.wav"),
            this.register(Sound.ClockElapsed, "samples/clock-elapsed.wav"),
            this.register(Sound.ClockRewind, "samples/clock-rewind.wav"),
            this.register(Sound.AtomDispose, "samples/atom-dispose.wav"),
            this.register(Sound.TransitionLevel, "samples/transition-level.wav"),
        ]
    }

    play(sound: Sound, options?: SoundPlayOptions): () => void {
        const loop = options === undefined ? false : options.loop === true
        const fadeInSeconds = options === undefined || options.fadeInSeconds === undefined ? 0.001 : options.fadeInSeconds
        const fadeOutSeconds = options === undefined || options.fadeOutSeconds === undefined ? 0.1 : options.fadeOutSeconds
        const gainNode = this.context.createGain()
        gainNode.gain.value = 0.0
        gainNode.gain.linearRampToValueAtTime(1.0, this.context.currentTime + fadeInSeconds)
        const bufferSource = this.context.createBufferSource()
        bufferSource.buffer = this.map.get(sound)
        bufferSource.loop = loop
        bufferSource.onended = () => bufferSource.disconnect()
        bufferSource.connect(gainNode).connect(this.masterGain)
        bufferSource.start()
        return () => {
            const endTime = this.context.currentTime + fadeOutSeconds
            gainNode.gain.linearRampToValueAtTime(0.0, endTime)
            bufferSource.stop(endTime)
        }
    }

    private async register(sound: Sound, url: string): Promise<void> {
        this.map.set(sound, await fetch(url).then(x => x.arrayBuffer()).then(x => this.context.decodeAudioData(x)))
        return Promise.resolve()
    }
}