import { type StoreState, type Telemetry } from "../app/store";
import { evaluateFollow } from "../exercises/follow";
import { evaluateWide } from "../exercises/wide";

// Monitor guides and exercise markers, drawn over the picture in SVG and updated every frame
// from the same frame and projection the evaluator uses, so what you see is what is judged.

const NS = "http://www.w3.org/2000/svg";
const W = 1600;
const H = 900;

const toX = (ndc: number) => ((ndc + 1) / 2) * W;
const toY = (ndc: number) => ((1 - ndc) / 2) * H;

function el<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string | number>, parent: SVGElement): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  parent.appendChild(node);
  return node;
}

function show(node: SVGElement, visible: boolean): void {
  node.style.display = visible ? "" : "none";
}

function rectFor(node: SVGRectElement, widthFraction: number, heightFraction: number): void {
  const w = W * widthFraction;
  const h = H * heightFraction;
  node.setAttribute("x", String((W - w) / 2));
  node.setAttribute("y", String((H - h) / 2));
  node.setAttribute("width", String(w));
  node.setAttribute("height", String(h));
}

export class MonitorOverlay {
  private readonly safe: SVGRectElement;
  private readonly centre: SVGGElement;
  private readonly thirds: SVGGElement;
  private readonly wide: SVGGElement;
  private readonly wideMarkers: Array<{ group: SVGGElement; dot: SVGCircleElement; text: SVGTextElement }> = [];
  private readonly follow: SVGGElement;
  private readonly followBox: SVGRectElement;
  private readonly followDot: SVGCircleElement;
  private readonly followSize: SVGLineElement;

  constructor(svg: SVGSVGElement) {
    svg.replaceChildren();
    const guides = el("g", { class: "ov-guides" }, svg);
    this.safe = el("rect", { class: "ov-safe" }, guides);
    this.centre = el("g", { class: "ov-centre" }, guides);
    el("line", { x1: W / 2 - 34, y1: H / 2, x2: W / 2 + 34, y2: H / 2 }, this.centre);
    el("line", { x1: W / 2, y1: H / 2 - 34, x2: W / 2, y2: H / 2 + 34 }, this.centre);
    this.thirds = el("g", { class: "ov-thirds" }, guides);
    for (const f of [1 / 3, 2 / 3]) {
      el("line", { x1: W * f, y1: 0, x2: W * f, y2: H }, this.thirds);
      el("line", { x1: 0, y1: H * f, x2: W, y2: H * f }, this.thirds);
    }

    this.wide = el("g", { class: "ov-wide" }, svg);
    for (let i = 0; i < 5; i += 1) {
      const group = el("g", { class: "ov-marker" }, this.wide);
      const dot = el("circle", { r: 13 }, group);
      const text = el("text", { dy: -22, "text-anchor": "middle" }, group);
      this.wideMarkers.push({ group, dot, text });
    }

    this.follow = el("g", { class: "ov-follow" }, svg);
    this.followBox = el("rect", { class: "ov-target" }, this.follow);
    this.followSize = el("line", { class: "ov-size" }, this.follow);
    this.followDot = el("circle", { class: "ov-chest", r: 14 }, this.follow);
  }

  update(t: Telemetry, state: StoreState): void {
    const { guides } = state.project.session.preferences;
    const settings = state.project.session.exerciseSettings;
    const safe = settings.wide.safeAreaPct / 100;
    rectFor(this.safe, safe, safe);
    show(this.safe, guides.safeArea || state.exercise?.id === "wide");
    show(this.centre, guides.centre);
    show(this.thirds, guides.thirds);

    const exercise = state.exercise;
    const running = exercise?.progress.status === "running";

    if (exercise?.id === "wide" && running) {
      const evaluation = evaluateWide(t.frame, t.geometry, settings.wide);
      evaluation.markers.forEach((marker, i) => {
        const slot = this.wideMarkers[i];
        if (!slot) return;
        const visible = marker.projection.inFront && Math.abs(marker.projection.x) < 1.6 && Math.abs(marker.projection.y) < 1.6;
        show(slot.group, visible);
        if (!visible) return;
        slot.group.setAttribute("transform", `translate(${toX(marker.projection.x).toFixed(1)} ${toY(marker.projection.y).toFixed(1)})`);
        slot.group.setAttribute("class", `ov-marker ${marker.inside ? "is-in" : "is-out"}`);
        slot.text.textContent = marker.label;
      });
      show(this.wide, true);
    } else {
      show(this.wide, false);
    }

    if (exercise?.id === "follow" && running) {
      const f = settings.follow;
      rectFor(this.followBox, f.targetWidthPct / 100, f.targetHeightPct / 100);
      const evaluation = evaluateFollow(t.frame, t.performer, settings);
      const inView = Math.abs(evaluation.x) < 1.2 && Math.abs(evaluation.y) < 1.2 && evaluation.error < 2;
      show(this.followDot, inView);
      show(this.followSize, inView);
      if (inView) {
        const x = toX(evaluation.x);
        const y = toY(evaluation.y);
        this.followDot.setAttribute("cx", x.toFixed(1));
        this.followDot.setAttribute("cy", y.toFixed(1));
        this.followDot.setAttribute("class", `ov-chest ${evaluation.onTarget ? "is-in" : "is-out"}`);
        const half = (evaluation.sizePct / 100) * H * 0.5;
        this.followSize.setAttribute("x1", (x + 40).toFixed(1));
        this.followSize.setAttribute("x2", (x + 40).toFixed(1));
        this.followSize.setAttribute("y1", (y - half * 0.56).toFixed(1));
        this.followSize.setAttribute("y2", (y + half * 1.44).toFixed(1));
        this.followSize.setAttribute("class", `ov-size ${evaluation.sizeOk ? "is-in" : "is-out"}`);
      }
      this.followBox.setAttribute("class", `ov-target ${evaluation.inBox ? "is-in" : ""}`);
      show(this.follow, true);
    } else {
      show(this.follow, false);
    }
  }
}
