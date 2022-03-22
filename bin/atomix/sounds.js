var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export var Sound;
(function (Sound) {
    Sound[Sound["Move"] = 0] = "Move";
    Sound[Sound["Dock"] = 1] = "Dock";
    Sound[Sound["Complete"] = 2] = "Complete";
    Sound[Sound["StartLevel"] = 3] = "StartLevel";
    Sound[Sound["DisposeAtom"] = 4] = "DisposeAtom";
    Sound[Sound["NextLevel"] = 5] = "NextLevel";
})(Sound || (Sound = {}));
export class SoundManager {
    constructor(context) {
        this.context = context;
        this.map = new Map();
    }
    load() {
        return [
            this.register(Sound.Move, "samples/move.wav"),
            this.register(Sound.Dock, "samples/dock.wav"),
            this.register(Sound.Complete, "samples/complete.wav"),
            this.register(Sound.StartLevel, "samples/start-level.wav"),
            this.register(Sound.DisposeAtom, "samples/dispose-atom.wav"),
            this.register(Sound.NextLevel, "samples/next-level.wav"),
        ];
    }
    play(sound) {
        const gainNode = this.context.createGain();
        const bufferSource = this.context.createBufferSource();
        bufferSource.buffer = this.map.get(sound);
        bufferSource.onended = () => bufferSource.disconnect();
        bufferSource.connect(gainNode).connect(this.context.destination);
        bufferSource.start();
        return () => {
            const endTime = this.context.currentTime + 0.1;
            gainNode.gain.linearRampToValueAtTime(0.0, endTime);
            bufferSource.stop(endTime);
        };
    }
    register(sound, url) {
        return __awaiter(this, void 0, void 0, function* () {
            this.map.set(sound, yield fetch(url).then(x => x.arrayBuffer()).then(x => this.context.decodeAudioData(x)));
            return Promise.resolve();
        });
    }
}
//# sourceMappingURL=sounds.js.map