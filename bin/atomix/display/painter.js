var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { resolveAtomName, Tile } from "../model/model.js";
import { loadImageBitmaps } from "../../lib/common.js";
import { Mulberry32 } from "../../lib/math.js";
export const TILE_SIZE = 48;
export class ArenaPainter {
    constructor(floors, walls) {
        this.floors = floors;
        this.walls = walls;
    }
    static load() {
        return __awaiter(this, void 0, void 0, function* () {
            const floors = yield loadImageBitmaps(index => `./assets/floor${index}.jpg`, 2);
            const walls = yield loadImageBitmaps(index => `./assets/wall${index}.jpg`, 6);
            return new ArenaPainter(floors, walls);
        });
    }
    paint(context, arena) {
        const random = new Mulberry32();
        arena.iterateFields((entry, x, y) => {
            if (entry !== Tile.Wall) {
                context.drawImage(random.nextDouble(0.0, 1.0) < 0.05 ? this.floors[1] : this.floors[0], x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        });
        arena.iterateFields((entry, x, y) => {
            if (entry === Tile.Wall) {
                context.fillStyle = "rgba(0, 0, 0, 0.5)";
                context.fillRect(x * TILE_SIZE, y * TILE_SIZE + TILE_SIZE / 8, TILE_SIZE, TILE_SIZE);
            }
        });
        arena.iterateFields((entry, x, y) => {
            if (entry === Tile.Wall) {
                context.drawImage(random.nextDouble(0.0, 1.0) < 0.1 ? random.nextElement(this.walls) : this.walls[0], x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        });
    }
}
export class AtomPainter {
    constructor(images) {
        this.images = images;
    }
    static load() {
        return __awaiter(this, void 0, void 0, function* () {
            return new AtomPainter(yield loadImageBitmaps(index => `./assets/atom${index}.png`, 18));
        });
    }
    paint(context, atom, connected, x, y, size) {
        context.save();
        context.translate(x, y);
        const radius = size * 0.33;
        const shadowY = size / 6;
        const gradient = context.createRadialGradient(0.0, shadowY, 0.0, 0.0, shadowY, radius);
        gradient.addColorStop(0.6, "rgba(0, 0, 0, 0.8)");
        gradient.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(0.0, shadowY, radius, 0.0, Math.PI * 2.0);
        context.fill();
        atom.connectors.forEach(connector => AtomPainter
            .paintConnectors(context, connector, connected.has(connector), size));
        context.drawImage(this.images[atom.kind], -radius, -radius, radius * 2, radius * 2);
        resolveAtomName(atom.kind).ifPresent(name => {
            context.fillStyle = "rgba(255, 255, 255, 0.6)";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.font = `normal ${size * 0.25}px "Inter"`;
            context.fillText(name, 0, 0);
        });
        context.restore();
    }
    static paintConnectors(context, connection, connected, size) {
        const bondThickness = size * 0.07;
        const bondDistance = size * 0.10;
        context.lineWidth = bondThickness;
        context.lineCap = "butt";
        const nx = connection.bond.xAxis;
        const ny = connection.bond.yAxis;
        const nn = Math.sqrt(nx * nx + ny * ny);
        const length = size * (connected ? 0.5 : 0.475 / nn);
        for (let order = 0; order < connection.order; order++) {
            const offset = order * bondDistance - (connection.order - 1) * bondDistance * 0.5;
            const min = offset - bondThickness * 0.5;
            const max = offset + bondThickness * 0.5;
            const gradient = context.createLinearGradient(-min * ny, min * nx, -max * ny, max * nx);
            if (connected) {
                gradient.addColorStop(0.0, "#777");
                gradient.addColorStop(0.5, "#BBB");
                gradient.addColorStop(1.0, "#777");
            }
            else {
                gradient.addColorStop(0.0, "#555");
                gradient.addColorStop(0.5, "#999");
                gradient.addColorStop(1.0, "#555");
            }
            context.strokeStyle = gradient;
            context.beginPath();
            context.moveTo(-ny * offset, nx * offset);
            context.lineTo(-ny * offset + nx * length, nx * offset + ny * length);
            context.stroke();
        }
    }
}
//# sourceMappingURL=painter.js.map