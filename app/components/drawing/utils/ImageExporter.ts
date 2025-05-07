import { LayerContexts } from "../tools/DrawingTool";

export interface ExportOptions {
  quality?: number; // 0-1 para JPEG
  scale?: number; // Factor de escala para resolución
  filename?: string; // Nombre de archivo sugerido para descarga
  backgroundColor?: string; // Color de fondo para transparencia en JPEG
}

export type ImageFormat = "png" | "jpeg" | "svg";

export class ImageExporter {
  private contexts: LayerContexts;
  private width: number;
  private height: number;

  constructor(contexts: LayerContexts, width: number, height: number) {
    this.contexts = contexts;
    this.width = width;
    this.height = height;
  }

  /**
   * Exporta la imagen del canvas en el formato especificado.
   * @param format Formato de imagen (png, jpeg, svg)
   * @param options Opciones de exportación
   * @returns URL de datos o null si hay error
   */
  public exportImage(format: ImageFormat, options: ExportOptions = {}): string | null {
    switch (format) {
      case "png":
        return this.toPNG(options);
      case "jpeg":
        return this.toJPEG(options);
      case "svg":
        return this.toSVG(options);
      default:
        console.error(`Formato no soportado: ${format}`);
        return null;
    }
  }

  /**
   * Descarga la imagen del canvas al dispositivo del usuario.
   * @param format Formato de imagen
   * @param options Opciones de exportación
   */
  public downloadImage(format: ImageFormat, options: ExportOptions = {}): void {
    const dataUrl = this.exportImage(format, options);
    if (!dataUrl) return;

    const filename = options.filename || `dibujo-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}`;
    const extension = format === "jpeg" ? "jpg" : format;
    const link = document.createElement("a");
    
    link.href = dataUrl;
    link.download = `${filename}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Genera imagen PNG a partir del canvas
   */
  private toPNG(options: ExportOptions = {}): string | null {
    return this.toImageDataURL("image/png", options);
  }

  /**
   * Genera imagen JPEG a partir del canvas
   */
  private toJPEG(options: ExportOptions = {}): string | null {
    // El valor por defecto para calidad JPEG es 0.92
    const quality = options.quality ?? 0.92;
    
    // Para JPEG necesitamos asegurar que no hay transparencia
    const canvas = this.createCompositeCanvas(options.backgroundColor || "#FFFFFF", options);
    if (!canvas) return null;
    
    return canvas.toDataURL("image/jpeg", quality);
  }

  /**
   * Genera imagen SVG a partir del canvas
   * Nota: Conversión básica, óptima para formas geométricas
   */
  private toSVG(options: ExportOptions = {}): string | null {
    try {
      // Para una implementación completa de SVG se necesitaría un análisis
      // de los comandos de dibujo o una biblioteca especializada.
      // Esta es una implementación básica que convierte la imagen a base64 en SVG.
      
      const dataUrl = this.toImageDataURL("image/png", options);
      if (!dataUrl) return null;
      
      const scale = options.scale || 1;
      const scaledWidth = this.width * scale;
      const scaledHeight = this.height * scale;
      
      // Crear SVG con imagen incrustada
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${scaledWidth}" height="${scaledHeight}" viewBox="0 0 ${scaledWidth} ${scaledHeight}">
          <image width="${scaledWidth}" height="${scaledHeight}" href="${dataUrl}" />
        </svg>
      `;
      
      return `data:image/svg+xml;base64,${btoa(svg)}`;
    } catch (error) {
      console.error("Error generando SVG:", error);
      return null;
    }
  }

  /**
   * Genera un dataURL a partir del canvas con las opciones especificadas
   */
  private toImageDataURL(mimeType: string, options: ExportOptions = {}): string | null {
    const canvas = this.createCompositeCanvas(options.backgroundColor || "#FFFFFF", options);
    if (!canvas) return null;
    
    return canvas.toDataURL(mimeType);
  }
  
  /**
   * Crea un canvas combinado de todas las capas para exportar
   */
  private createCompositeCanvas(backgroundColor?: string, options: ExportOptions = {}): HTMLCanvasElement | null {
    try {
      const { mainCtx, backgroundCtx, previewCtx } = this.contexts;
      if (!mainCtx) {
        console.error("No se puede exportar: contexto principal no disponible");
        return null;
      }
      
      const scale = this.getDevicePixelRatio();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      
      // Configurar dimensiones del canvas
      const exportScale = (options?.scale || 1) * scale;
      canvas.width = this.width * exportScale;
      canvas.height = this.height * exportScale;
      
      // Escalar el contexto
      ctx.scale(exportScale, exportScale);
      
      // Establecer fondo si se especifica
      if (backgroundColor) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, this.width, this.height);
      }
      
      // Dibujar capas en orden
      if (backgroundCtx) {
        ctx.drawImage(
          backgroundCtx.canvas, 
          0, 0, backgroundCtx.canvas.width / scale, backgroundCtx.canvas.height / scale,
          0, 0, this.width, this.height
        );
      }
      
      // Dibujar capa principal
      ctx.drawImage(
        mainCtx.canvas, 
        0, 0, mainCtx.canvas.width / scale, mainCtx.canvas.height / scale,
        0, 0, this.width, this.height
      );
      
      // Dibujar capa de previsualización si existe y hay contenido
      if (previewCtx) {
        ctx.drawImage(
          previewCtx.canvas, 
          0, 0, previewCtx.canvas.width / scale, previewCtx.canvas.height / scale,
          0, 0, this.width, this.height
        );
      }
      
      return canvas;
    } catch (error) {
      console.error("Error creando canvas compuesto:", error);
      return null;
    }
  }
  
  /**
   * Obtiene la relación de píxeles del dispositivo
   */
  private getDevicePixelRatio(): number {
    return window.devicePixelRatio || 1;
  }
} 