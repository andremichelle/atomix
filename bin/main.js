var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Boot, newAudioContext, preloadImagesOfCssFile } from "./lib/boot.js";
import { fetchAndTranslateLevels, fetchAndTranslateSolutions } from "./atomix/model/format.js";
import { GameContext } from "./atomix/game.js";
import { ArenaPainter, AtomPainter } from "./atomix/display/painter.js";
import { SoundManager } from "./atomix/sounds.js";
import { Hold } from "./lib/common.js";
const showProgress = (() => {
    const progress = document.querySelector("svg.preloader");
    window.onerror = () => progress.classList.add("error");
    window.onunhandledrejection = () => progress.classList.add("error");
    return (percentage) => progress.style.setProperty("--percentage", percentage.toFixed(2));
})();
(() => __awaiter(void 0, void 0, void 0, function* () {
    console.debug("booting...");
    const boot = new Boot();
    boot.addObserver(boot => showProgress(boot.normalizedPercentage()));
    boot.registerFont('Inter', 'url(./fonts/Inter/static/Inter-Regular.ttf)');
    boot.registerFont('PressStart2P', 'url(./fonts/Press_Start_2P/PressStart2P-Regular.ttf)');
    boot.registerProcess(preloadImagesOfCssFile("./bin/main.css"));
    const arenaPainter = boot.registerProcess(ArenaPainter.load());
    const atomPainter = boot.registerProcess(AtomPainter.load());
    const levels = boot.registerProcess(fetchAndTranslateLevels("./level/original.json", yield fetchAndTranslateSolutions("./level/original-solutions.json")));
    const context = newAudioContext();
    const soundManager = new SoundManager(context);
    soundManager.load().forEach(promise => boot.registerProcess(promise));
    yield boot.waitForCompletion();
    const layerElement = document.querySelector("div.play-field div.layers");
    const game = new GameContext(layerElement, soundManager, arenaPainter.get(), atomPainter.get(), levels.get());
    const startButton = document.querySelector("button.play-button");
    startButton.onclick = () => {
        game.start();
        startButton.classList.add("disappear");
        Hold.forAnimationComplete(startButton).then(() => startButton.remove());
    };
    document.addEventListener('touchmove', (event) => event.preventDefault(), { passive: false });
    document.addEventListener('dblclick', (event) => event.preventDefault(), { passive: false });
    const resize = () => document.body.style.height = `${window.innerHeight}px`;
    window.addEventListener("resize", resize);
    resize();
    requestAnimationFrame(() => {
        document.querySelectorAll("body svg.preloader").forEach(element => element.remove());
        document.querySelectorAll("body main").forEach(element => element.classList.remove("invisible"));
    });
    console.debug("boot complete.");
}))();
//# sourceMappingURL=main.js.map