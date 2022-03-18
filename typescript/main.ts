import {Boot, newAudioContext, preloadImagesOfCssFile} from "./lib/boot.js"
import {fetchAndTranslate} from "./atomix/format.js"
import {Atom, Direction, Level, TileAtom} from "./atomix/model.js"
import {MapRenderer} from "./atomix/view.js"

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
    const levels: Level[] = await fetchAndTranslate("https://raw.githubusercontent.com/figlief/kp-atomix/master/levels/original.json")
    // --- BOOT ENDS ---

    const tileAtoms: TileAtom[] = []
    levels[0].iterateFields((item, x, y) => {
        if (item instanceof Atom) {
            tileAtoms.push(new TileAtom(levels[0], item, x, y))
        }
    })

    const clone = levels[0].clone()
    tileAtoms[0].executeMove(Direction.Left)
    tileAtoms[0].executeMove(Direction.Down)
    tileAtoms[0].executeMove(Direction.Right)
    tileAtoms[0].executeMove(Direction.Up)
    tileAtoms[0].executeMove(Direction.Up)
    console.log(levels[0].print())
    console.log(clone.print())

    new MapRenderer(document.querySelector("canvas"), levels[0]).update()

    // prevent dragging entire document on mobile
    document.addEventListener('touchmove', (event: TouchEvent) => event.preventDefault(), {passive: false})
    const resize = () => document.body.style.height = `${window.innerHeight}px`
    window.addEventListener("resize", resize)
    resize()
    requestAnimationFrame(() => {
        document.querySelectorAll("body svg.preloader").forEach(element => element.remove())
        document.querySelectorAll("body main").forEach(element => element.classList.remove("invisible"))
    })
    console.debug("boot complete.")
})()