import {Boot, Dependency, newAudioContext, preloadImagesOfCssFile} from "./lib/boot.js"
import {fetchAndTranslate} from "./atomix/model/format.js"
import {GameContext} from "./atomix/game.js"
import {ArenaPainter, AtomPainter} from "./atomix/design.js"
import {Level} from "./atomix/model/model.js"

const showProgress = (() => {
    const progress: SVGSVGElement = document.querySelector("svg.preloader")
    window.onerror = () => progress.classList.add("error")
    window.onunhandledrejection = () => progress.classList.add("error")
    return (percentage: number) => progress.style.setProperty("--percentage", percentage.toFixed(2))
})();

(async () => {
    console.debug("booting...")

    // --- BOOT STARTS ---
    const boot = new Boot()
    boot.addObserver(boot => showProgress(boot.normalizedPercentage()))
    boot.registerProcess(preloadImagesOfCssFile("./bin/main.css"))
    boot.registerProcess(document["fonts"].load('10pt "Amatica SC"'))
    const arenaPainter: Dependency<ArenaPainter> = boot.registerProcess(ArenaPainter.load())
    const atomPainter: Dependency<AtomPainter> = boot.registerProcess(AtomPainter.load())
    const levels: Dependency<Level[]> = boot.registerProcess(fetchAndTranslate("https://raw.githubusercontent.com/figlief/kp-atomix/master/levels/original.json"))
    const context = newAudioContext()
    await boot.waitForCompletion()
    // --- BOOT ENDS ---

    const game = new GameContext(document.querySelector("canvas"), arenaPainter.get(), atomPainter.get(), levels.get()[0])

    document.getElementById("undo-button").addEventListener("click", () => game.undo())
    document.getElementById("redo-button").addEventListener("click", () => game.redo())

    // prevent dragging entire document on mobile
    document.addEventListener('touchmove', (event: TouchEvent) => event.preventDefault(), {passive: false})
    document.addEventListener('dblclick', (event: Event) => event.preventDefault(), {passive: false})
    const resize = () => document.body.style.height = `${window.innerHeight}px`
    window.addEventListener("resize", resize)
    resize()
    requestAnimationFrame(() => {
        document.querySelectorAll("body svg.preloader").forEach(element => element.remove())
        document.querySelectorAll("body main").forEach(element => element.classList.remove("invisible"))
    })
    console.debug("boot complete.")
})()