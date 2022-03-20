import {Boot, newAudioContext, preloadImagesOfCssFile} from "./lib/boot.js"
import {fetchAndTranslate} from "./atomix/model/format.js"
import {Level} from "./atomix/model/model.js"
import {Game} from "./atomix/game.js"
import {ArenaPainter, AtomPainter} from "./atomix/design.js"

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
    const context = newAudioContext()
    await boot.waitForCompletion()
    const arenaPainter = await ArenaPainter.load()
    const atomPainter = await AtomPainter.load()
    const levels: Level[] = await fetchAndTranslate("https://raw.githubusercontent.com/figlief/kp-atomix/master/levels/original.json")
    // --- BOOT ENDS ---

    const game = new Game(document.querySelector("canvas"), arenaPainter, atomPainter, levels[0])
    game.render()

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