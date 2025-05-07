import { DrawingTool, DrawingToolOptions, Point } from "./DrawingTool";

export class PencilTool implements DrawingTool {
  type: "pencil" = "pencil";
  options: DrawingToolOptions;

  constructor(options: DrawingToolOptions) {
    this.options = options;
  }

  startDrawing(ctx: CanvasRenderingContext2D, point: Point): void {
    // Guardar configuración actual
    ctx.save();

    // Aplicar configuración de lápiz
    ctx.strokeStyle = this.options.color;
    ctx.lineWidth = this.options.lineWidth;
    ctx.globalAlpha = this.options.opacity || 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Comenzar una nueva ruta
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  continueDrawing(ctx: CanvasRenderingContext2D, from: Point, to: Point): void {
    // Dibujar una línea desde el punto anterior al actual
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Iniciar una nueva subtrazo desde el punto actual
    // Esto evita el suavizado excesivo en líneas largas
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
  }

  endDrawing(ctx: CanvasRenderingContext2D, point: Point): void {
    // Finalizar la línea en el punto final
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    // Restaurar configuración original
    ctx.restore();
  }
}
