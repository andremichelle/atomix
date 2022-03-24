import {Atom, Connector, Level, Map2d} from "./model/model.js"
import {Clock, ControlHost, MoveOperation} from "./controls/controls.js"
import {TouchControl} from "./controls/touch.js"
import {ArrayUtils, Direction, Hold, ObservableValue, ObservableValueImpl, Option, Options} from "../lib/common.js"
import {ArenaPainter, AtomPainter} from "./display/painter.js"
import {Sound, SoundManager} from "./sounds.js"
import {ArenaCanvas, AtomsLayer, AtomSprite, MovePreview} from "./display/sprites.js"
import {MouseControl} from "./controls/mouse.js"

export class GameContext implements ControlHost {
    private readonly arenaCanvas: ArenaCanvas = new ArenaCanvas(this.arenaPainter)
    private readonly atomsLayer: AtomsLayer = new AtomsLayer(this.element.querySelector("div#atom-layer"))
    private readonly atomSprites: AtomSprite[] = []
    private readonly history: MoveOperation[] = []

    private readonly labelTitle: HTMLElement = document.getElementById("title")
    private readonly labelScore: HTMLElement = document.getElementById("score")
    private readonly labelCountMoves: HTMLElement = document.getElementById("count-moves")
    private readonly labelLevelId: HTMLElement = document.getElementById("level-id")
    private readonly labelLevelName: HTMLElement = document.getElementById("level-name")
    private readonly labelLevelTime: HTMLElement = document.getElementById("level-time")

    private readonly tileSizeValue: ObservableValue<number> = new ObservableValueImpl<number>(64)

    private readonly clock: Clock = new Clock(
        3 * 60,
        (seconds: number) => {
            const mm = Math.floor(seconds / 60).toString().padStart(2, "0")
            const ss = (seconds % 60).toString().padStart(2, "0")
            this.labelLevelTime.textContent = `${mm}:${ss}`
        }, () => this.soundManager.play(Sound.ClockElapsed))

    private backgroundAudioStop: Option<() => void> = Options.None
    private transitionSoundStop: Option<() => void> = Options.None

    private movePreview: Option<MovePreview> = Options.None
    private historyPointer = 0

    private level: Option<Level> = Options.None
    private levelPointer = 0

    private score = 0
    private moveCount = 0

    acceptUserInput: boolean = false

    constructor(private readonly element: HTMLElement,
                private readonly soundManager: SoundManager,
                private readonly arenaPainter: ArenaPainter,
                private readonly atomPainter: AtomPainter,
                private readonly levels: Level[]) {
        document.getElementById("undo-button").addEventListener("click", () => this.undo())
        document.getElementById("redo-button").addEventListener("click", () => this.redo())
        document.getElementById("reset-button").addEventListener("click", () => this.reset())
        window.addEventListener("resize", () => {
            this.level.ifPresent(level => this.paintLevel(level))
            this.atomSprites.forEach(atomSprite => atomSprite.updatePaint())
        })
        this.labelTitle.addEventListener("touchstart", async (event: TouchEvent) => {
            if (!this.acceptUserInput) return
            if (event.targetTouches.length > 1) {
                await this.solve()
            }
        })
        TouchControl.installUserInput(this)
        MouseControl.installUserInput(this)
    }

    async start() {
        this.transitionSoundStop = Options.valueOf(this.soundManager.play(Sound.TransitionLevel))
        this.element.classList.remove("invisible")
        await this.startLevel(this.levels[this.levelPointer])
        this.clock.restart()
        this.acceptUserInput = true
    }

    getTargetElement(): HTMLElement {
        return this.element
    }

    nearestAtomSprite(x: number, y: number): AtomSprite | null {
        let nearestDistance: number = Number.MAX_VALUE
        let nearestMovableAtom: AtomSprite = null
        const tileSize = this.tileSizeValue.get()
        this.atomSprites.forEach((atomSprite: AtomSprite) => {
            const dx = x - (atomSprite.x + 0.5) * tileSize
            const dy = y - (atomSprite.y + 0.5) * tileSize
            const distance = Math.sqrt(dx * dx + dy * dy)
            if (distance > tileSize) return
            if (nearestDistance > distance) {
                nearestDistance = distance
                nearestMovableAtom = atomSprite
            }
        })
        return nearestMovableAtom
    }

    showPreviewMove(atomSprite: AtomSprite, direction: Direction) {
        if (!this.acceptUserInput) return
        this.movePreview.ifPresent(preview => preview.hidePreview())
        this.movePreview = Options.valueOf(
            new MovePreview(atomSprite, direction,
                this.atomsLayer.showMovePreview(atomSprite, atomSprite.predictMove(direction), this.tileSizeValue.get())))
    }

    async hidePreviewMove(commit: boolean) {
        if (!this.acceptUserInput) return
        if (this.movePreview.nonEmpty()) {
            const preview = this.movePreview.get()
            preview.hidePreview()
            this.movePreview = Options.None
            if (commit) {
                await this.executeMove(preview.atomSprite, preview.direction)
            }
        }
    }

    tileSize(): number {
        return this.tileSizeValue.get()
    }

    private async undo(): Promise<void> {
        if (!this.acceptUserInput) return
        if (this.historyPointer === 0) return
        this.acceptUserInput = false
        await this.history[--this.historyPointer].revert()
        this.acceptUserInput = true
    }

    private async redo(): Promise<void> {
        if (!this.acceptUserInput) return
        if (this.historyPointer === this.history.length) return
        this.acceptUserInput = false
        await this.history[this.historyPointer++].execute()
        this.acceptUserInput = true
    }

    private async reset(): Promise<void> {
        if (!this.acceptUserInput) return
        this.acceptUserInput = false
        this.backgroundAudioStop.ifPresent(stop => stop())
        this.backgroundAudioStop = Options.None
        await this.startLevel(this.levels[this.levelPointer])
        this.acceptUserInput = true
    }

    private async solve(): Promise<void> {
        if (!this.acceptUserInput) return
        if (this.historyPointer !== 0) return
        this.level.ifPresent(async level => {
            for (const move of level.solution) {
                const atomSprite: AtomSprite = this.atomSprites.find(atomSprite => {
                    return atomSprite.x === move.x && atomSprite.y === move.y
                })
                console.assert(atomSprite !== undefined)
                await this.executeMove(atomSprite, move.direction)
                await Hold.forFrames(12)
            }
        })
    }

    private async startLevel(level: Level): Promise<void> {
        level = level.clone()
        this.level = Options.valueOf(level)
        this.historyPointer = 0
        this.labelCountMoves.textContent = `${this.moveCount = 0}`.padStart(2, "0")
        ArrayUtils.clear(this.history)
        this.atomsLayer.removeAllSprites()
        const arena: Map2d = level.arena
        this.paintLevel(level)
        this.element.classList.add("appear")
        await Hold.forAnimationComplete(this.element)
        this.element.classList.remove("appear")
        this.transitionSoundStop.ifPresent(stop => stop())
        this.transitionSoundStop = Options.None
        this.labelLevelId.textContent = (<string>level.id).padStart(2, "0")
        this.labelLevelName.textContent = level.name
        this.renderMoleculePreview(level.molecule)
        this.soundManager.play(Sound.LevelDocked)
        await Hold.forFrames(30)
        this.backgroundAudioStop = Options.valueOf(this.soundManager.play(Sound.BackgroundLoop, {
            loop: true,
            fadeInSeconds: 1.0,
            fadeOutSeconds: 1.0,
            volume: -9.0
        }))
        ArrayUtils.replace(this.atomSprites, await this.initAtomSprites(arena))
    }

    private async executeMove(atomSprite: AtomSprite, direction: Direction): Promise<void> {
        const fromX = atomSprite.x
        const fromY = atomSprite.y
        const target = atomSprite.predictMove(direction)
        const toX = target.x
        const toY = target.y
        if (toX === fromX && toY === fromY) return Promise.resolve()
        this.history.splice(this.historyPointer, this.history.length - this.historyPointer)
        const moveOperation = new MoveOperation(this.soundManager, atomSprite, fromX, fromY, toX, toY)
        await moveOperation.execute()
        const shakeClassName = GameContext.resolveShakeClassName(direction)
        this.element.classList.add(shakeClassName)
        Hold.forAnimationComplete(this.element).then(() => this.element.classList.remove(shakeClassName))
        this.labelCountMoves.textContent = `${++this.moveCount}`.padStart(2, "0")
        this.history.push(moveOperation)
        this.historyPointer = this.history.length
        this.atomSprites.forEach(atomSprite => atomSprite.updatePaint())
        if (this.level.get().isSolved()) {
            this.clock.stop()
            await Hold.forFrames(12)
            await this.showSolvedAnimation()
        }
        return Promise.resolve()
    }

    private async showSolvedAnimation(): Promise<void> {
        this.backgroundAudioStop.ifPresent(stop => stop())
        this.backgroundAudioStop = Options.None
        this.atomSprites.forEach(atomSprite => atomSprite.element().classList.add("flash"))
        this.soundManager.play(Sound.Complete)
        this.labelTitle.classList.add("animate")
        await Hold.forFrames(60)
        await this.clock.rewind(() => {
            this.soundManager.play(Sound.ClockRewind)
            this.score += 100
            this.labelScore.textContent = `${this.score}`.padStart(6, "0")
        })
        GameContext.sortAtomSprites(this.atomSprites)
        while (this.atomSprites.length > 0) {
            this.soundManager.play(Sound.AtomDispose)
            await this.atomSprites.shift().dispose()
        }
        this.transitionSoundStop = Options.valueOf(this.soundManager.play(Sound.TransitionLevel))
        this.element.classList.add("disappear")
        await Hold.forAnimationComplete(this.element)
        this.element.classList.remove("disappear")
        if (++this.levelPointer === this.levels.length) {
            this.gameComplete()
            return
        } else {
            await this.startLevel(this.levels[this.levelPointer])
            await Hold.forEvent(this.labelTitle, "animationiteration")
            this.labelTitle.classList.remove("animate")
            this.clock.restart()
            this.acceptUserInput = true
        }
    }

    private paintLevel(level: Level): void {
        const arena = level.arena
        const padding = 64
        const parentElement = this.element.parentElement

        this.element.style.width = `initial`
        this.element.style.height = `initial`
        this.tileSizeValue.set(Math.min(Math.min(48,
            Math.floor((parentElement.clientWidth - padding) / arena.numColumns()),
            Math.floor((parentElement.clientHeight - padding) / arena.numRows()))
        ))
        const tileSize = this.tileSizeValue.get()
        const width = arena.numColumns() * tileSize
        const height = arena.numRows() * tileSize
        this.arenaCanvas.resizeTo(width, height)
        this.element.style.width = `${width}px`
        this.element.style.height = `${height}px`
        this.arenaCanvas.paint(arena, tileSize)
    }

    private async initAtomSprites(arena: Map2d): Promise<AtomSprite[]> {
        const atomSprites: AtomSprite[] = []
        let count = 0
        arena.iterateFields(async (maybeAtom, x, y) => {
            if (maybeAtom instanceof Atom) {
                const atomSprite = new AtomSprite(this.atomPainter, this.tileSizeValue, arena, maybeAtom, x, y)
                atomSprites.push(atomSprite)
                count++
            }
        })
        GameContext.sortAtomSprites(atomSprites)
        for (const atomSprite of atomSprites) {
            this.soundManager.play(Sound.AtomAppear)
            this.atomsLayer.addSprite(atomSprite)
            await Hold.forAnimationComplete(atomSprite.element())
        }
        return atomSprites
    }

    private renderMoleculePreview(molecule: Map2d) {
        const canvas: HTMLCanvasElement = document.querySelector(".preview canvas")
        const context = canvas.getContext("2d")
        const numRows = molecule.numRows()
        const numColumns = molecule.numColumns()
        const size = 36
        const width = numColumns * size
        const height = numRows * size
        canvas.width = width * devicePixelRatio
        canvas.height = height * devicePixelRatio
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
        canvas.classList.remove("hidden")
        context.save()
        context.scale(devicePixelRatio, devicePixelRatio)
        molecule.iterateFields((maybeAtom, x, y) => {
            if (maybeAtom instanceof Atom) {
                this.atomPainter.paint(context, maybeAtom, new Set<Connector>(maybeAtom.connectors),
                    (x + 0.5) * size, (y + 0.5) * size, size)
            }
        })
        context.restore()
    }

    private static sortAtomSprites(atomSprites: AtomSprite[]) {
        atomSprites.sort((a: AtomSprite, b: AtomSprite) => {
            if (a.y > b.y) return 1
            if (a.y < b.y) return -1
            return a.x - b.x
        })
    }

    private static resolveShakeClassName(direction: Direction): string {
        switch (direction) {
            case Direction.Up:
                return "shake-top"
            case Direction.Left:
                return "shake-left"
            case Direction.Right:
                return "shake-right"
            case Direction.Down:
                return "shake-bottom"
        }
    }

    private gameComplete() {
        const main = document.querySelector("main")
        main.classList.add("end")
        while (main.lastChild) main.lastChild.remove()
        const div = document.createElement("div")
        div.textContent = "YOU ARE AWESOME!"
        main.appendChild(div)
        this.soundManager.play(Sound.GameComplete)
    }
}