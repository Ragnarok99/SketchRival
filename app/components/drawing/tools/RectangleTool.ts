import { DrawingTool, DrawingToolOptions, Point } from "./DrawingTool";

export class RectangleTool implements DrawingTool {
  type: "rectangle" = "rectangle";
  options: DrawingToolOptions;
  private startPoint: Point | null = null;

  constructor(options: DrawingToolOptions) {
    this.options = options;
  }

  startDrawing(ctx: CanvasRenderingContext2D, point: Point): void {
    // Guardar el punto inicial
    this.startPoint = { ...point };

    // Guardar configuración actual
    ctx.save();

    // Aplicar configuración
    ctx.strokeStyle = this.options.color;
    ctx.lineWidth = this.options.lineWidth;
    ctx.globalAlpha = this.options.opacity || 1;
  }

  continueDrawing(ctx: CanvasRenderingContext2D, from: Point, to: Point): void {
    if (!this.startPoint) return;

    // Calcular dimensiones del rectángulo
    const width = to.x - this.startPoint.x;
    const height = to.y - this.startPoint.y;

    // Limpiar solo la región del rectángulo + borde
    const x = width >= 0 ? this.startPoint.x : to.x;
    const y = height >= 0 ? this.startPoint.y : to.y;
    const w = Math.abs(width);
    const h = Math.abs(height);

    ctx.clearRect(
      x - this.options.lineWidth,
      y - this.options.lineWidth,
      w + this.options.lineWidth * 2,
      h + this.options.lineWidth * 2,
    );

    // Dibujar el rectángulo
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.stroke();
  }

  endDrawing(ctx: CanvasRenderingContext2D, point: Point): void {
    if (!this.startPoint) return;

    // Calcular dimensiones finales
    const width = point.x - this.startPoint.x;
    const height = point.y - this.startPoint.y;

    // Ajustar coordenadas para manejar rectángulos dibujados en diferentes direcciones
    const x = width >= 0 ? this.startPoint.x : point.x;
    const y = height >= 0 ? this.startPoint.y : point.y;
    const w = Math.abs(width);
    const h = Math.abs(height);

    // Dibujar el rectángulo final
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.stroke();

    // Restaurar configuración y limpiar punto inicial
    ctx.restore();
    this.startPoint = null;
  }
}
