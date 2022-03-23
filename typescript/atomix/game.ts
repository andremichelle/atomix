import {Atom, Connector, Level, Map2d} from "./model/model.js"
import {ControlHost, MoveOperation} from "./controls/controls.js"
import {TouchControl} from "./controls/touch.js"
import {ArrayUtils, Direction, Hold, Option, Options, Point} from "../lib/common.js"
import {ArenaPainter, AtomPainter, TILE_SIZE} from "./display/painter.js"
import {Sound, SoundManager} from "./sounds.js"
import {AtomSprite} from "./display/sprites.js"

class MovePreview {
    constructor(readonly atomSprite: AtomSprite,
                readonly direction: Direction,
                readonly hidePreview: () => void) {
    }
}

class ArenaCanvas {
    private readonly canvas: HTMLCanvasElement = document.querySelector("canvas#background-layer")
    private readonly context: CanvasRenderingContext2D = this.canvas.getContext("2d")

    constructor(private readonly arenaPainter: ArenaPainter) {
    }

    get element(): HTMLElement {
        return this.canvas
    }

    resizeTo(width: number, height: number) {
        this.canvas.width = width * devicePixelRatio
        this.canvas.height = height * devicePixelRatio
    }

    paint(arena: Map2d): void {
        this.context.save()
        this.context.scale(devicePixelRatio, devicePixelRatio)
        this.arenaPainter.paint(this.context, arena, TILE_SIZE)
        this.context.restore()
    }
}

export class AtomsLayer {
    constructor(private readonly element: HTMLElement) {
    }

    addSprite(atomSprite: AtomSprite) {
        this.element.appendChild(atomSprite.element())
    }

    removeAllSprites(): void {
        while (this.element.lastChild !== null) {
            this.element.lastChild.remove()
        }
    }

    showMovePreview(source: Point, target: Point): () => void {
        const div = document.createElement("div")
        div.classList.add("move-preview")
        const y0 = Math.min(source.y, target.y) + 0.4
        const y1 = Math.max(source.y, target.y) + 0.6
        const x0 = Math.min(source.x, target.x) + 0.4
        const x1 = Math.max(source.x, target.x) + 0.6
        div.style.top = `${y0 * TILE_SIZE}px`
        div.style.left = `${x0 * TILE_SIZE}px`
        div.style.width = `${(x1 - x0) * TILE_SIZE}px`
        div.style.height = `${(y1 - y0) * TILE_SIZE}px`
        div.style.borderRadius = `${TILE_SIZE * 0.2}px`
        this.element.prepend(div)
        return () => div.remove()
    }
}

class Clock {
    private interval: number = -1
    private seconds: number = 0

    constructor(private readonly durationInSeconds: number,
                private readonly clockUpdate: (seconds: number) => void,
                private readonly clockComplete: () => void) {
    }

    restart(): void {
        this.stop()
        this.seconds = this.durationInSeconds
        this.clockUpdate(this.seconds)
        this.interval = setInterval(() => {
            if (this.seconds > 0) {
                this.seconds--
                this.clockUpdate(this.seconds)
            } else {
                this.clockComplete()
            }
        }, 1000)
    }

    stop(): void {
        if (this.interval) {
            clearInterval(this.interval)
            this.interval = -1
        }
    }

    async rewind(addScore: (() => void)): Promise<void> {
        this.stop()
        while (this.seconds > 0) {
            await Hold.forFrames(1)
            addScore()
            this.clockUpdate(--this.seconds)
        }
    }
}

export class GameContext implements ControlHost {
    private readonly arenaCanvas: ArenaCanvas = new ArenaCanvas(this.arenaPainter)
    private readonly atomsLayer: AtomsLayer = new AtomsLayer(this.element.querySelector("div#atom-layer"))
    private readonly atomSprites: AtomSprite[] = []
    private readonly history: MoveOperation[] = []

    private readonly labelTitle: HTMLElement = document.getElementById("title")
    private readonly labelScore: HTMLElement = document.getElementById("score")
    private readonly labelLevelId: HTMLElement = document.getElementById("level-id")
    private readonly labelLevelName: HTMLElement = document.getElementById("level-name")
    private readonly labelLevelTime: HTMLElement = document.getElementById("level-time")

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

    acceptUserInput: boolean = false

    constructor(private readonly element: HTMLElement,
                private readonly soundManager: SoundManager,
                private readonly arenaPainter: ArenaPainter,
                private readonly atomPainter: AtomPainter,
                private readonly levels: Level[]) {
        document.getElementById("undo-button").addEventListener("click", () => this.undo())
        document.getElementById("redo-button").addEventListener("click", () => this.redo())
        document.getElementById("reset-button").addEventListener("click", () => this.reset())
        this.labelTitle.addEventListener("touchstart", async (event: TouchEvent) => {
            if (!this.acceptUserInput) return
            if (event.targetTouches.length > 1) {
                await this.solve()
            }
        })
        new TouchControl(this)
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
        this.atomSprites.forEach((atomSprite: AtomSprite) => {
            const dx = x - (atomSprite.x + 0.5) * TILE_SIZE
            const dy = y - (atomSprite.y + 0.5) * TILE_SIZE
            const distance = Math.sqrt(dx * dx + dy * dy)
            if (distance > TILE_SIZE) return
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
            new MovePreview(atomSprite, direction, this.atomsLayer.showMovePreview(atomSprite, atomSprite.predictMove(direction))))
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
        return TILE_SIZE
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
        ArrayUtils.clear(this.history)
        this.labelLevelId.textContent = (<string>level.id).padStart(2, "0")
        this.labelLevelName.textContent = level.name
        this.atomsLayer.removeAllSprites()
        const arena: Map2d = level.arena
        this.resizeTo(arena.numColumns() * TILE_SIZE, arena.numRows() * TILE_SIZE)
        this.arenaCanvas.paint(arena)
        this.renderMoleculePreview(level.molecule)
        this.element.classList.add("appear")
        await Hold.forAnimationComplete(this.element)
        this.transitionSoundStop.ifPresent(stop => stop())
        this.transitionSoundStop = Options.None
        this.soundManager.play(Sound.LevelDocked)
        this.element.classList.remove("appear")
        await Hold.forFrames(40)
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
            console.log("ALL DONE")
            return
        } else {
            await this.startLevel(this.levels[this.levelPointer])
            await Hold.forEvent(this.labelTitle, "animationiteration")
            this.labelTitle.classList.remove("animate")
            this.clock.restart()
            this.acceptUserInput = true
        }
        // await this.solve()
    }

    private resizeTo(width: number, height: number) {
        this.arenaCanvas.resizeTo(width, height)
        this.element.style.width = `${width}px`
        this.element.style.height = `${height}px`
    }

    private async initAtomSprites(arena: Map2d): Promise<AtomSprite[]> {
        const atomSprites: AtomSprite[] = []
        let count = 0
        arena.iterateFields(async (maybeAtom, x, y) => {
            if (maybeAtom instanceof Atom) {
                const atomSprite = new AtomSprite(this.atomPainter, arena, maybeAtom, x, y)
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
}