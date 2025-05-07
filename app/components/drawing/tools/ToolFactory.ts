import {
  DrawingTool,
  DrawingToolOptions,
  DrawingToolType,
} from "./DrawingTool";
import { PencilTool } from "./PencilTool";
import { OptimizedPencilTool } from "./OptimizedPencilTool";
import { BrushTool } from "./BrushTool";
import { CircleTool } from "./CircleTool";
import { RectangleTool } from "./RectangleTool";
import { LineTool } from "./LineTool";
import { PrecisionEraserTool } from "./EraserTool";
import { AreaEraserTool } from "./AreaEraserTool";
import { ToolAdapter } from "./ToolAdapter";

/**
 * Factory para crear herramientas de dibujo
 */
export class ToolFactory {
  /**
   * Opción para usar implementaciones optimizadas
   * Si es true, se usarán versiones optimizadas cuando estén disponibles
   */
  private static useOptimizedTools: boolean = true;

  /**
   * Controla el uso de herramientas optimizadas
   * @param useOptimized Si es true, se usarán versiones optimizadas cuando estén disponibles
   */
  static setUseOptimizedTools(useOptimized: boolean): void {
    ToolFactory.useOptimizedTools = useOptimized;
  }

  /**
   * Crea una instancia de herramienta de dibujo según el tipo especificado
   * @param type Tipo de herramienta a crear
   * @param options Opciones de configuración para la herramienta
   * @returns Instancia de la herramienta de dibujo
   */
  static createTool(
    type: DrawingToolType,
    options: DrawingToolOptions,
  ): DrawingTool {
    // Primero verificamos si hay versiones optimizadas disponibles
    if (ToolFactory.useOptimizedTools) {
      switch (type) {
        case "pencil":
          return new OptimizedPencilTool(options);
        // Podemos añadir más herramientas optimizadas aquí a medida que se implementen
      }
    }

    // Para herramientas sin versión optimizada usamos la versión original con adaptador
    let legacyTool;
    switch (type) {
      case "pencil":
        legacyTool = new PencilTool(options);
        break;
      case "brush":
        legacyTool = new BrushTool(options);
        break;
      case "circle":
        legacyTool = new CircleTool(options);
        break;
      case "rectangle":
        legacyTool = new RectangleTool(options);
        break;
      case "line":
        legacyTool = new LineTool(options);
        break;
      case "eraser-precision":
        legacyTool = new PrecisionEraserTool(options);
        break;
      case "eraser-area":
        legacyTool = new AreaEraserTool(options);
        break;
      default:
        console.warn(`Tipo de herramienta no reconocido: ${type}, usando lápiz por defecto`);
        legacyTool = new PencilTool(options);
    }

    // Envolvemos la herramienta legada con el adaptador para compatibilidad
    return new ToolAdapter(legacyTool);
  }
}
