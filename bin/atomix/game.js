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
import { HistoryStep } from "./controls/controls.js";
import { TouchControl } from "./controls/touch.js";
import { ArrayUtils, Hold, Options } from "../lib/common.js";
import { TILE_SIZE } from "./display/painter.js";
import { Sound } from "./sounds.js";
import { AtomSprite } from "./display/sprites.js";
class MovePreview {
    constructor(atomSprite, direction, hidePreview) {
        this.atomSprite = atomSprite;
        this.direction = direction;
        this.hidePreview = hidePreview;
    }
}
class ArenaCanvas {
    constructor(arenaPainter) {
        this.arenaPainter = arenaPainter;
        this.canvas = document.querySelector("canvas#background-layer");
        this.context = this.canvas.getContext("2d");
    }
    get element() {
        return this.canvas;
    }
    resizeTo(width, height) {
        this.canvas.width = width * devicePixelRatio;
        this.canvas.height = height * devicePixelRatio;
    }
    paint(arena) {
        this.context.save();
        this.context.scale(devicePixelRatio, devicePixelRatio);
        this.arenaPainter.paint(this.context, arena);
        this.context.restore();
    }
}
export class AtomsLayer {
    constructor(element) {
        this.element = element;
    }
    addSprite(atomSprite) {
        this.element.appendChild(atomSprite.element());
    }
    removeAllSprites() {
        while (this.element.lastChild !== null) {
            this.element.lastChild.remove();
        }
    }
    showMovePreview(source, target) {
        const div = document.createElement("div");
        div.classList.add("move-preview");
        const y0 = Math.min(source.y, target.y) + 0.4;
        const y1 = Math.max(source.y, target.y) + 0.6;
        const x0 = Math.min(source.x, target.x) + 0.4;
        const x1 = Math.max(source.x, target.x) + 0.6;
        div.style.top = `${y0 * TILE_SIZE}px`;
        div.style.left = `${x0 * TILE_SIZE}px`;
        div.style.width = `${(x1 - x0) * TILE_SIZE}px`;
        div.style.height = `${(y1 - y0) * TILE_SIZE}px`;
        div.style.borderRadius = `${TILE_SIZE * 0.2}px`;
        this.element.prepend(div);
        return () => div.remove();
    }
}
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
        this.labelLevelId = document.getElementById("level-id");
        this.labelLevelName = document.getElementById("level-name");
        this.backgroundLoopStop = Options.None;
        this.movePreview = Options.None;
        this.historyPointer = 0;
        this.level = Options.None;
        this.levelPointer = 0;
        this.acceptUserInput = false;
        document.getElementById("undo-button").addEventListener("click", () => this.undo());
        document.getElementById("redo-button").addEventListener("click", () => this.redo());
        document.getElementById("reset-button").addEventListener("click", () => this.reset());
        document.getElementById("solve-button").addEventListener("click", () => this.solve());
        new TouchControl(this);
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            this.soundManager.play(Sound.TransitionLevel);
            this.element.classList.remove("invisible");
            yield this.startLevel(this.levels[this.levelPointer]);
            this.acceptUserInput = true;
        });
    }
    getTargetElement() {
        return this.element;
    }
    nearestAtomSprite(x, y) {
        let nearestDistance = Number.MAX_VALUE;
        let nearestMovableAtom = null;
        this.atomSprites.forEach((atomSprite) => {
            const dx = x - (atomSprite.x + 0.5) * TILE_SIZE;
            const dy = y - (atomSprite.y + 0.5) * TILE_SIZE;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > TILE_SIZE)
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
        this.movePreview = Options.valueOf(new MovePreview(atomSprite, direction, this.atomsLayer.showMovePreview(atomSprite, atomSprite.predictMove(direction))));
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
    undo() {
        if (!this.acceptUserInput)
            return;
        if (this.historyPointer === 0)
            return;
        this.history[--this.historyPointer].revert();
    }
    redo() {
        if (!this.acceptUserInput)
            return;
        if (this.historyPointer === this.history.length)
            return;
        this.history[this.historyPointer++].execute();
    }
    reset() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.acceptUserInput)
                return;
            this.acceptUserInput = false;
            yield this.startLevel(this.levels[this.levelPointer]);
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
            ArrayUtils.clear(this.history);
            this.labelLevelId.textContent = level.id.padStart(2, "0");
            this.labelLevelName.textContent = level.name;
            this.atomsLayer.removeAllSprites();
            const arena = level.arena;
            this.resizeTo(arena.numColumns() * TILE_SIZE, arena.numRows() * TILE_SIZE);
            this.arenaCanvas.paint(arena);
            this.renderMoleculePreview(level.molecule);
            this.element.classList.add("appear");
            yield Hold.forAnimationComplete(this.element);
            this.element.classList.remove("appear");
            yield Hold.forFrames(40);
            this.backgroundLoopStop = Options.valueOf(this.soundManager.play(Sound.BackgroundLoop, {
                loop: true,
                fadeInSeconds: 3.0,
                fadeOutSeconds: 5.0
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
            const distance = Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY));
            atomSprite.mapMoveDuration(distance);
            const stopMoveSound = this.soundManager.play(Sound.Move);
            this.history.splice(this.historyPointer, this.history.length - this.historyPointer);
            this.history.push(new HistoryStep(atomSprite, fromX, fromY, toX, toY).execute());
            this.historyPointer = this.history.length;
            yield Hold.forTransitionComplete(atomSprite.element());
            stopMoveSound();
            this.soundManager.play(Sound.Dock);
            this.atomSprites.forEach(atomSprite => atomSprite.updatePaint());
            if (this.level.get().isSolved()) {
                yield Hold.forFrames(12);
                yield this.showSolvedAnimation();
            }
            return Promise.resolve();
        });
    }
    showSolvedAnimation() {
        return __awaiter(this, void 0, void 0, function* () {
            this.backgroundLoopStop.ifPresent(stop => stop());
            this.backgroundLoopStop = Options.None;
            this.atomSprites.forEach(atomSprite => atomSprite.element().classList.add("flash"));
            this.soundManager.play(Sound.Complete);
            this.labelTitle.classList.add("animate");
            yield Hold.forFrames(60);
            GameContext.sortAtomSprites(this.atomSprites);
            while (this.atomSprites.length > 0) {
                this.soundManager.play(Sound.AtomDispose);
                yield this.atomSprites.shift().dispose();
            }
            const stopTransitionSound = this.soundManager.play(Sound.TransitionLevel);
            this.element.classList.add("disappear");
            yield Hold.forAnimationComplete(this.element);
            this.element.classList.remove("disappear");
            yield this.startLevel(this.levels[++this.levelPointer]);
            stopTransitionSound();
            yield Hold.forEvent(this.labelTitle, "animationiteration");
            this.labelTitle.classList.remove("animate");
            this.acceptUserInput = true;
        });
    }
    resizeTo(width, height) {
        this.arenaCanvas.resizeTo(width, height);
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;
    }
    initAtomSprites(arena) {
        return __awaiter(this, void 0, void 0, function* () {
            const atomSprites = [];
            let count = 0;
            arena.iterateFields((maybeAtom, x, y) => __awaiter(this, void 0, void 0, function* () {
                if (maybeAtom instanceof Atom) {
                    const atomSprite = new AtomSprite(this.atomPainter, arena, maybeAtom, x, y);
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
}
//# sourceMappingURL=game.js.map