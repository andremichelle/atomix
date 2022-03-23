var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ObservableValueImpl } from "../lib/common.js";
export var Sound;
(function (Sound) {
    Sound[Sound["BackgroundLoop"] = 0] = "BackgroundLoop";
    Sound[Sound["Move"] = 1] = "Move";
    Sound[Sound["Dock"] = 2] = "Dock";
    Sound[Sound["Complete"] = 3] = "Complete";
    Sound[Sound["StartLevel"] = 4] = "StartLevel";
    Sound[Sound["AtomAppear"] = 5] = "AtomAppear";
    Sound[Sound["AtomDispose"] = 6] = "AtomDispose";
    Sound[Sound["TransitionLevel"] = 7] = "TransitionLevel";
})(Sound || (Sound = {}));
export class SoundManager {
    constructor(context) {
        this.context = context;
        this.map = new Map();
        this.masterGain = this.context.createGain();
        this.enabled = new ObservableValueImpl(false);
        this.enabled.addObserver(enabled => this.masterGain.gain.value = enabled ? 1.0 : 0.0, true);
        this.masterGain.connect(this.context.destination);
    }
    load() {
        return [
            this.register(Sound.BackgroundLoop, "samples/background-loop.wav"),
            this.register(Sound.Move, "samples/move.wav"),
            this.register(Sound.Dock, "samples/dock.wav"),
            this.register(Sound.Complete, "samples/complete.wav"),
            this.register(Sound.StartLevel, "samples/start-level.wav"),
            this.register(Sound.AtomAppear, "samples/atom-appear.wav"),
            this.register(Sound.AtomDispose, "samples/atom-dispose.wav"),
            this.register(Sound.TransitionLevel, "samples/transition-level.wav"),
        ];
    }
    play(sound, options) {
        const loop = options === undefined ? false : options.loop === true;
        const fadeInSeconds = options === undefined || options.fadeInSeconds === undefined ? 0.001 : options.fadeInSeconds;
        const fadeOutSeconds = options === undefined || options.fadeOutSeconds === undefined ? 0.1 : options.fadeOutSeconds;
        const gainNode = this.context.createGain();
        gainNode.gain.value = 0.0;
        gainNode.gain.linearRampToValueAtTime(1.0, this.context.currentTime + fadeInSeconds);
        const bufferSource = this.context.createBufferSource();
        bufferSource.buffer = this.map.get(sound);
        bufferSource.loop = loop;
        bufferSource.onended = () => bufferSource.disconnect();
        bufferSource.connect(gainNode).connect(this.masterGain);
        bufferSource.start();
        return () => {
            const endTime = this.context.currentTime + fadeOutSeconds;
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