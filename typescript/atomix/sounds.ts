export enum Sound {
    Move, Dock, Complete, StartLevel, DisposeAtom, NextLevel
}

export class SoundManager {
    private readonly map: Map<Sound, AudioBuffer> = new Map()

    constructor(private readonly context: AudioContext) {
    }

    load(): Promise<void>[] {
        return [
            this.register(Sound.Move, "samples/move.wav"),
            this.register(Sound.Dock, "samples/dock.wav"),
            this.register(Sound.Complete, "samples/complete.wav"),
            this.register(Sound.StartLevel, "samples/start-level.wav"),
            this.register(Sound.DisposeAtom, "samples/dispose-atom.wav"),
            this.register(Sound.NextLevel, "samples/next-level.wav"),
        ]
    }

    play(sound: Sound): () => void {
        const gainNode = this.context.createGain()
        const bufferSource = this.context.createBufferSource()
        bufferSource.buffer = this.map.get(sound)
        bufferSource.onended = () => bufferSource.disconnect()
        bufferSource.connect(gainNode).connect(this.context.destination)
        bufferSource.start()
        return () => {
            const endTime = this.context.currentTime + 0.1
            gainNode.gain.linearRampToValueAtTime(0.0, endTime)
            bufferSource.stop(endTime)
        }
    }

    private async register(sound: Sound, url: string): Promise<void> {
        this.map.set(sound, await fetch(url).then(x => x.arrayBuffer()).then(x => this.context.decodeAudioData(x)))
        return Promise.resolve()
    }
}