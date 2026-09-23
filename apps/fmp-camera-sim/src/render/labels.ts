import { CanvasTexture, LinearFilter, Sprite, SpriteMaterial, SRGBColorSpace } from "three";

export interface LabelOptions {
  /** Height of the label in metres. */
  height: number;
  color?: string;
  background?: string;
  /** Draw on top of geometry (for the camera and cone labels). */
  alwaysVisible?: boolean;
}

/** A text sprite for the venue view. Labels live on the overview-only layer. */
export function makeLabel(text: string, options: LabelOptions): Sprite {
  const scale = 4;
  const fontPx = 28 * scale;
  const padX = 14 * scale;
  const padY = 8 * scale;
  const canvas = document.createElement("canvas");
  const measure = canvas.getContext("2d");
  const font = `600 ${fontPx}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
  let width = 200;
  if (measure) {
    measure.font = font;
    width = Math.ceil(measure.measureText(text).width);
  }
  canvas.width = width + padX * 2;
  canvas.height = fontPx + padY * 2;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.font = font;
    ctx.fillStyle = options.background ?? "rgba(12, 16, 22, 0.78)";
    const r = canvas.height / 2.6;
    ctx.beginPath();
    ctx.roundRect(0, 0, canvas.width, canvas.height, r);
    ctx.fill();
    ctx.fillStyle = options.color ?? "#f4f0e8";
    ctx.textBaseline = "middle";
    ctx.fillText(text, padX, canvas.height / 2 + scale);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  const material = new SpriteMaterial({
    toneMapped: false,
    map: texture,
    transparent: true,
    depthTest: !options.alwaysVisible,
    depthWrite: false,
  });
  const sprite = new Sprite(material);
  const aspect = canvas.width / canvas.height;
  sprite.scale.set(options.height * aspect, options.height, 1);
  sprite.renderOrder = options.alwaysVisible ? 20 : 5;
  sprite.name = `label:${text}`;
  return sprite;
}
