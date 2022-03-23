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
import { Easing } from "../lib/easing.js";
import { Sound } from "./sounds.js";
import { AtomSprite } from "./display/sprites.js";
class MovePreview {
    constructor(atomSprite, direction) {
        this.atomSprite = atomSprite;
        this.direction = direction;
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
        this.movePreview = Options.None;
        this.historyPointer = 0;
        this.level = Options.None;
        this.levelPointer = 0;
        this.initLevel(this.levels[this.levelPointer]);
        document.getElementById("undo-button").addEventListener("click", () => this.undo());
        document.getElementById("redo-button").addEventListener("click", () => this.redo());
        document.getElementById("reset-button").addEventListener("click", () => this.reset());
        document.getElementById("solve-button").addEventListener("click", () => this.solve());
        this.soundManager.play(Sound.StartLevel);
        new TouchControl(this);
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
        this.movePreview = Options.valueOf(new MovePreview(atomSprite, direction));
    }
    hidePreviewMove(commit) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.movePreview.nonEmpty()) {
                const preview = this.movePreview.get();
                this.movePreview = Options.None;
                if (commit) {
                    yield this.executeMove(preview.atomSprite, preview.direction);
                }
            }
        });
    }
    undo() {
        if (this.historyPointer === 0) {
            return;
        }
        this.history[--this.historyPointer].revert();
    }
    redo() {
        if (this.historyPointer === this.history.length) {
            return;
        }
        this.history[this.historyPointer++].execute();
    }
    reset() {
        this.initLevel(this.levels[this.levelPointer]);
    }
    solve() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.historyPointer !== 0) {
                return;
            }
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
    showSolvedAnimation() {
        return __awaiter(this, void 0, void 0, function* () {
            this.soundManager.play(Sound.Complete);
            this.labelTitle.classList.add("animate");
            yield Hold.forFrames(60);
            this.atomSprites.sort((a, b) => {
                if (a.y > b.y)
                    return 1;
                if (a.y < b.y)
                    return -1;
                return a.x - b.x;
            });
            while (this.atomSprites.length > 0) {
                this.soundManager.play(Sound.DisposeAtom);
                yield this.atomSprites.shift().dispose();
            }
            const stopSound = this.soundManager.play(Sound.NextLevel);
            const boundingClientRect = this.element.getBoundingClientRect();
            yield Hold.forAnimation(phase => {
                phase = Easing.easeInQuad(phase);
                this.element.style.top = `${-phase * boundingClientRect.bottom}px`;
            }, 20);
            this.initLevel(this.levels[++this.levelPointer]);
            yield Hold.forAnimation(phase => {
                phase = Easing.easeOutQuad(phase);
                this.element.style.top = `${(1.0 - phase) * boundingClientRect.bottom}px`;
            }, 20);
            stopSound();
            yield Hold.forEvent(this.labelTitle, "animationiteration");
            this.labelTitle.classList.remove("animate");
            this.soundManager.play(Sound.StartLevel);
            return new Promise(resolve => {
                resolve();
            });
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
            this.history.push(new HistoryStep(atomSprite, fromX, fromY, toX, toY).execute());
            this.historyPointer = this.history.length;
            const stopMoveSound = this.soundManager.play(Sound.Move);
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
    initLevel(level) {
        level = level.clone();
        this.level = Options.valueOf(level);
        this.historyPointer = 0;
        ArrayUtils.clear(this.history);
        this.labelLevelId.textContent = level.id.padStart(2, "0");
        this.labelLevelName.textContent = level.name;
        this.atomsLayer.removeAllSprites();
        const arena = level.arena;
        ArrayUtils.replace(this.atomSprites, this.initAtomSprites(arena));
        this.resizeTo(arena.numColumns() * TILE_SIZE, arena.numRows() * TILE_SIZE);
        this.arenaCanvas.paint(arena);
        this.renderMoleculePreview(level.molecule);
    }
    resizeTo(width, height) {
        this.arenaCanvas.resizeTo(width, height);
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;
    }
    initAtomSprites(arena) {
        const atomSprites = [];
        let count = 0;
        arena.iterateFields((maybeAtom, x, y) => {
            if (maybeAtom instanceof Atom) {
                const atomSprite = new AtomSprite(this.atomPainter, arena, maybeAtom, x, y);
                this.atomsLayer.addSprite(atomSprite);
                atomSprites.push(atomSprite);
                count++;
            }
        });
        return atomSprites;
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
}
//# sourceMappingURL=game.js.map