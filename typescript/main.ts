import {Boot, Loadable, newAudioContext, preloadImagesOfCssFile} from "./lib/boot.js"
import {fetchAndTranslateLevels, fetchAndTranslateSolutions} from "./atomix/model/format.js"
import {GameContext} from "./atomix/game.js"
import {ArenaPainter, AtomPainter} from "./atomix/display/painter.js"
import {Level} from "./atomix/model/model.js"
import {SoundManager} from "./atomix/sounds.js"
import {Hold} from "./lib/common.js"

const showProgress = (() => {
        const progress: SVGSVGElement = document.querySelector("svg.preloader")
        window.onerror = () => progress.classList.add("error")
        window.onunhandledrejection = () => progress.classList.add("error")
        return (percentage: number) => progress.style.setProperty("--percentage", percentage.toFixed(2))
    })()

;(async () => {
    console.debug("booting...")

    // --- BOOT STARTS ---
    const boot = new Boot()
    boot.addObserver(boot => showProgress(boot.normalizedPercentage()))
    boot.registerFont('Inter', 'url(./fonts/Inter/static/Inter-Regular.ttf)')
    boot.registerFont('PressStart2P', 'url(./fonts/Press_Start_2P/PressStart2P-Regular.ttf)')
    boot.registerProcess(preloadImagesOfCssFile("./bin/main.css"))
    const arenaPainter: Loadable<ArenaPainter> = boot.registerProcess(ArenaPainter.load())
    const atomPainter: Loadable<AtomPainter> = boot.registerProcess(AtomPainter.load())
    const levels: Loadable<Level[]> = boot.registerProcess(fetchAndTranslateLevels("./level/original.json",
        await fetchAndTranslateSolutions("./level/original-solutions.json")))
    const context = newAudioContext()
    const soundManager = new SoundManager(context)
    soundManager.load().forEach(loading => boot.registerProcess(loading))
    await boot.waitForCompletion()
    // --- BOOT ENDS ---

    const layerElement: HTMLElement = document.querySelector("div.play-field div.layers")
    const game = new GameContext(layerElement, soundManager, arenaPainter.get(), atomPainter.get(), levels.get())
    const startButton: HTMLButtonElement = document.querySelector("button.play-button")
    startButton.onclick = () => {
        game.start()
        startButton.classList.add("disappear")
        Hold.forAnimationComplete(startButton).then(() => startButton.remove())
    }

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