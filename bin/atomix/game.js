var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Atom } from "./model/model.js";
import { Clock, MoveOperation } from "./controls/controls.js";
import { TouchControl } from "./controls/touch.js";
import { ArrayUtils, Direction, Hold, ObservableValueImpl, Options } from "../lib/common.js";
import { Sound } from "./sounds.js";
import { ArenaCanvas, AtomsLayer, AtomSprite, MovePreview } from "./display/sprites.js";
import { MouseControl } from "./controls/mouse.js";
export class GameContext {
    constructor(element, soundManager, arenaPainter, atomPainter, levels) {
        this.element = element;
        this.soundManager = soundManager;
        this.arenaPainter = arenaPainter;
        this.atomPainter = atomPainter;
        this.levels = levels;
        this.arenaCanvas = new ArenaCanvas(this.arenaPainter);
        this.atomsLayer = new AtomsLayer(this.element.querySelector("div#atom-layer"));
        this.atomSprites = [];
        this.history = [];
        this.labelTitle = document.getElementById("title");
        this.labelScore = document.getElementById("score");
        this.labelCountMoves = document.getElementById("count-moves");
        this.labelLevelId = document.getElementById("level-id");
        this.labelLevelName = document.getElementById("level-name");
        this.labelLevelTime = document.getElementById("level-time");
        this.tileSizeValue = new ObservableValueImpl(64);
        this.clock = new Clock(3 * 60, (seconds) => {
            const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
            const ss = (seconds % 60).toString().padStart(2, "0");
            this.labelLevelTime.textContent = `${mm}:${ss}`;
        }, () => this.soundManager.play(Sound.ClockElapsed));
        this.backgroundAudioStop = Options.None;
        this.transitionSoundStop = Options.None;
        this.movePreview = Options.None;
        this.historyPointer = 0;
        this.level = Options.None;
        this.levelPointer = 0;
        this.score = 0;
        this.moveCount = 0;
        this.acceptUserInput = false;
        document.getElementById("undo-button").addEventListener("click", () => this.undo());
        document.getElementById("redo-button").addEventListener("click", () => this.redo());
        document.getElementById("reset-button").addEventListener("click", () => this.reset());
        window.addEventListener("resize", () => {
            this.level.ifPresent(level => this.paintLevel(level));
            this.atomSprites.forEach(atomSprite => atomSprite.updatePaint());
        });
        this.labelTitle.addEventListener("touchstart", (event) => __awaiter(this, void 0, void 0, function* () {
            if (!this.acceptUserInput)
                return;
            if (event.targetTouches.length > 1) {
                yield this.solve();
            }
        }));
        TouchControl.installUserInput(this);
        MouseControl.installUserInput(this);
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            this.transitionSoundStop = Options.valueOf(this.soundManager.play(Sound.TransitionLevel));
            this.element.classList.remove("invisible");
            yield this.startLevel(this.levels[this.levelPointer]);
            this.clock.restart();
            this.acceptUserInput = true;
        });
    }
    getTargetElement() {
        return this.element;
    }
    nearestAtomSprite(x, y) {
        let nearestDistance = Number.MAX_VALUE;
        let nearestMovableAtom = null;
        const tileSize = this.tileSizeValue.get();
        this.atomSprites.forEach((atomSprite) => {
            const dx = x - (atomSprite.x + 0.5) * tileSize;
            const dy = y - (atomSprite.y + 0.5) * tileSize;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > tileSize)
                return;
            if (nearestDistance > distance) {
                nearestDistance = distance;
                nearestMovableAtom = atomSprite;
            }
        });
        return nearestMovableAtom;
    }
    showPreviewMove(atomSprite, direction) {
        if (!this.acceptUserInput)
            return;
        this.movePreview.ifPresent(preview => preview.hidePreview());
        this.movePreview = Options.valueOf(new MovePreview(atomSprite, direction, this.atomsLayer.showMovePreview(atomSprite, atomSprite.predictMove(direction), this.tileSizeValue.get())));
    }
    hidePreviewMove(commit) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.acceptUserInput)
                return;
            if (this.movePreview.nonEmpty()) {
                const preview = this.movePreview.get();
                preview.hidePreview();
                this.movePreview = Options.None;
                if (commit) {
                    yield this.executeMove(preview.atomSprite, preview.direction);
                }
            }
        });
    }
    tileSize() {
        return this.tileSizeValue.get();
    }
    undo() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.acceptUserInput)
                return;
            if (this.historyPointer === 0)
                return;
            this.acceptUserInput = false;
            yield this.history[--this.historyPointer].revert();
            this.acceptUserInput = true;
        });
    }
    redo() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.acceptUserInput)
                return;
            if (this.historyPointer === this.history.length)
                return;
            this.acceptUserInput = false;
            yield this.history[this.historyPointer++].execute();
            this.acceptUserInput = true;
        });
    }
    reset() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.acceptUserInput)
                return;
            this.acceptUserInput = false;
            this.backgroundAudioStop.ifPresent(stop => stop());
            this.backgroundAudioStop = Options.None;
            yield this.startLevel(this.levels[this.levelPointer]);
            this.acceptUserInput = true;
        });
    }
    solve() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.acceptUserInput)
                return;
            if (this.historyPointer !== 0)
                return;
            this.level.ifPresent((level) => __awaiter(this, void 0, void 0, function* () {
                for (const move of level.solution) {
                    const atomSprite = this.atomSprites.find(atomSprite => {
                        return atomSprite.x === move.x && atomSprite.y === move.y;
                    });
                    console.assert(atomSprite !== undefined);
                    yield this.executeMove(atomSprite, move.direction);
                    yield Hold.forFrames(12);
                }
            }));
        });
    }
    startLevel(level) {
        return __awaiter(this, void 0, void 0, function* () {
            level = level.clone();
            this.level = Options.valueOf(level);
            this.historyPointer = 0;
            this.labelCountMoves.textContent = `${this.moveCount = 0}`.padStart(2, "0");
            ArrayUtils.clear(this.history);
            this.atomsLayer.removeAllSprites();
            const arena = level.arena;
            this.paintLevel(level);
            this.element.classList.add("appear");
            yield Hold.forAnimationComplete(this.element);
            this.element.classList.remove("appear");
            this.transitionSoundStop.ifPresent(stop => stop());
            this.transitionSoundStop = Options.None;
            this.labelLevelId.textContent = level.id.padStart(2, "0");
            this.labelLevelName.textContent = level.name;
            this.renderMoleculePreview(level.molecule);
            this.soundManager.play(Sound.LevelDocked);
            yield Hold.forFrames(30);
            this.backgroundAudioStop = Options.valueOf(this.soundManager.play(Sound.BackgroundLoop, {
                loop: true,
                fadeInSeconds: 1.0,
                fadeOutSeconds: 1.0,
                volume: -9.0
            }));
            ArrayUtils.replace(this.atomSprites, yield this.initAtomSprites(arena));
        });
    }
    executeMove(atomSprite, direction) {
        return __awaiter(this, void 0, void 0, function* () {
            const fromX = atomSprite.x;
            const fromY = atomSprite.y;
            const target = atomSprite.predictMove(direction);
            const toX = target.x;
            const toY = target.y;
            if (toX === fromX && toY === fromY)
                return Promise.resolve();
            this.history.splice(this.historyPointer, this.history.length - this.historyPointer);
            const moveOperation = new MoveOperation(this.soundManager, atomSprite, fromX, fromY, toX, toY);
            yield moveOperation.execute();
            const shakeClassName = GameContext.resolveShakeClassName(direction);
            this.element.classList.add(shakeClassName);
            Hold.forAnimationComplete(this.element).then(() => this.element.classList.remove(shakeClassName));
            this.labelCountMoves.textContent = `${++this.moveCount}`.padStart(2, "0");
            this.history.push(moveOperation);
            this.historyPointer = this.history.length;
            this.atomSprites.forEach(atomSprite => atomSprite.updatePaint());
            if (this.level.get().isSolved()) {
                this.clock.stop();
                yield Hold.forFrames(12);
                yield this.showSolvedAnimation();
            }
            return Promise.resolve();
        });
    }
    showSolvedAnimation() {
        return __awaiter(this, void 0, void 0, function* () {
            this.backgroundAudioStop.ifPresent(stop => stop());
            this.backgroundAudioStop = Options.None;
            this.atomSprites.forEach(atomSprite => atomSprite.element().classList.add("flash"));
            this.soundManager.play(Sound.Complete);
            this.labelTitle.classList.add("animate");
            yield Hold.forFrames(60);
            yield this.clock.rewind(() => {
                this.soundManager.play(Sound.ClockRewind);
                this.score += 100;
                this.labelScore.textContent = `${this.score}`.padStart(6, "0");
            });
            GameContext.sortAtomSprites(this.atomSprites);
            while (this.atomSprites.length > 0) {
                this.soundManager.play(Sound.AtomDispose);
                yield this.atomSprites.shift().dispose();
            }
            this.transitionSoundStop = Options.valueOf(this.soundManager.play(Sound.TransitionLevel));
            this.element.classList.add("disappear");
            yield Hold.forAnimationComplete(this.element);
            this.element.classList.remove("disappear");
            if (++this.levelPointer === this.levels.length) {
                this.gameComplete();
                return;
            }
            else {
                yield this.startLevel(this.levels[this.levelPointer]);
                yield Hold.forEvent(this.labelTitle, "animationiteration");
                this.labelTitle.classList.remove("animate");
                this.clock.restart();
                this.acceptUserInput = true;
            }
        });
    }
    paintLevel(level) {
        const arena = level.arena;
        const padding = 64;
        const parentElement = this.element.parentElement;
        this.element.style.width = `initial`;
        this.element.style.height = `initial`;
        this.tileSizeValue.set(Math.min(Math.min(48, Math.floor((parentElement.clientWidth - padding) / arena.numColumns()), Math.floor((parentElement.clientHeight - padding) / arena.numRows()))));
        const tileSize = this.tileSizeValue.get();
        const width = arena.numColumns() * tileSize;
        const height = arena.numRows() * tileSize;
        this.arenaCanvas.resizeTo(width, height);
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;
        this.arenaCanvas.paint(arena, tileSize);
    }
    initAtomSprites(arena) {
        return __awaiter(this, void 0, void 0, function* () {
            const atomSprites = [];
            let count = 0;
            arena.iterateFields((maybeAtom, x, y) => __awaiter(this, void 0, void 0, function* () {
                if (maybeAtom instanceof Atom) {
                    const atomSprite = new AtomSprite(this.atomPainter, this.tileSizeValue, arena, maybeAtom, x, y);
                    atomSprites.push(atomSprite);
                    count++;
                }
            }));
            GameContext.sortAtomSprites(atomSprites);
            for (const atomSprite of atomSprites) {
                this.soundManager.play(Sound.AtomAppear);
                this.atomsLayer.addSprite(atomSprite);
                yield Hold.forAnimationComplete(atomSprite.element());
            }
            return atomSprites;
        });
    }
    renderMoleculePreview(molecule) {
        const canvas = document.querySelector(".preview canvas");
        const context = canvas.getContext("2d");
        const numRows = molecule.numRows();
        const numColumns = molecule.numColumns();
        const size = 36;
        const width = numColumns * size;
        const height = numRows * size;
        canvas.width = width * devicePixelRatio;
        canvas.height = height * devicePixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.classList.remove("hidden");
        context.save();
        context.scale(devicePixelRatio, devicePixelRatio);
        molecule.iterateFields((maybeAtom, x, y) => {
            if (maybeAtom instanceof Atom) {
                this.atomPainter.paint(context, maybeAtom, new Set(maybeAtom.connectors), (x + 0.5) * size, (y + 0.5) * size, size);
            }
        });
        context.restore();
    }
    static sortAtomSprites(atomSprites) {
        atomSprites.sort((a, b) => {
            if (a.y > b.y)
                return 1;
            if (a.y < b.y)
                return -1;
            return a.x - b.x;
        });
    }
    static resolveShakeClassName(direction) {
        switch (direction) {
            case Direction.Up:
                return "shake-top";
            case Direction.Left:
                return "shake-left";
            case Direction.Right:
                return "shake-right";
            case Direction.Down:
                return "shake-bottom";
        }
    }
    gameComplete() {
        const main = document.querySelector("main");
        main.classList.add("end");
        while (main.lastChild)
            main.lastChild.remove();
        const div = document.createElement("div");
        div.textContent = "YOU ARE AWESOME!";
        main.appendChild(div);
        this.soundManager.play(Sound.GameComplete);
    }
}
//# sourceMappingURL=game.js.map