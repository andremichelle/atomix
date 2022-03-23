export class HistoryStep {
    constructor(atomSprite, fromX, fromY, toX, toY) {
        this.atomSprite = atomSprite;
        this.fromX = fromX;
        this.fromY = fromY;
        this.toX = toX;
        this.toY = toY;
    }
    execute() {
        this.atomSprite.moveTo({ x: this.toX, y: this.toY });
        return this;
    }
    revert() {
        this.atomSprite.moveTo({ x: this.fromX, y: this.fromY });
        return this;
    }
}
//# sourceMappingURL=controls.js.map