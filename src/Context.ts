import Block from './Block';
import Arrow from './Arrow';
import { defaultTheme } from './Theme';
import ViewBox from './ViewBox';
import { layoutGraph } from './Layout';
import { element, SVG_NS } from './svg';
import type { Bounds, GraphData, GraphOptions, Point, Theme } from './types';

let nextInstance = 0;
const owners = new WeakMap<SVGSVGElement, Context>();

function snapshot(data: GraphData): GraphData {
  if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    throw new TypeError('Graph data must contain nodes and edges arrays.');
  }
  const ids = new Set<string>();
  const nodes = data.nodes.map((node, index) => {
    if (!node || typeof node.id !== 'string' || !node.id || ids.has(node.id)) {
      throw new TypeError(`Node ${index} must have a unique, non-empty string id.`);
    }
    if (!Array.isArray(node.lines) || !node.lines.every((line: unknown) => typeof line === 'string')) {
      throw new TypeError(`Node "${node.id}" must have an array of text lines.`);
    }
    ids.add(node.id);
    return { id: node.id, lines: [...node.lines] };
  });
  const edgeIds = new Set<string>();
  const edges = data.edges.map((edge, index) => {
    if (!edge || !ids.has(edge.from) || !ids.has(edge.to)) {
      throw new TypeError(`Edge ${index} must reference existing node ids.`);
    }
    if (edge.id !== undefined && (typeof edge.id !== 'string' || !edge.id || edgeIds.has(edge.id))) {
      throw new TypeError(`Edge ${index} must have a unique, non-empty string id when supplied.`);
    }
    if (edge.id !== undefined) edgeIds.add(edge.id);
    for (const name of ['color', 'label'] as const) {
      if (edge[name] !== undefined && typeof edge[name] !== 'string') {
        throw new TypeError(`Edge ${index} ${name} must be a string.`);
      }
    }
    return { ...edge };
  });
  return { nodes, edges };
}

/** A container-sized SVG graph viewer. Owns only its root and its listeners. */
export default class Context {
  private readonly prefix = `bblocks-${nextInstance++}`;
  private readonly theme: Theme;
  private readonly interactive: boolean;
  private readonly onNodeSelect?: (id: string) => void;
  private readonly root: SVGGElement;
  private readonly camera = new ViewBox();
  private readonly originalAttributes = new Map<string, string | null>();
  private readonly cleanup: (() => void)[] = [];
  private readonly pointers = new Map<number, Point>();
  private blocks = new Map<string, Block>();
  private data: GraphData;
  private background!: SVGRectElement;
  private bounds: Bounds = { x: 0, y: 0, width: 0, height: 0 };
  private selected: string | null = null;
  private pressedTarget: EventTarget | null = null;
  private moved = false;
  private travel = 0;
  private destroyed = false;
  private lastWidth = 0;
  private lastHeight = 0;

  constructor(private readonly svg: SVGSVGElement, data: GraphData, options: GraphOptions = {}) {
    if (!svg || svg.namespaceURI !== SVG_NS || svg.localName !== 'svg') {
      throw new TypeError('Graph requires an SVGSVGElement.');
    }
    if (owners.has(svg)) throw new Error('This SVG already has a Graph. Destroy it before creating another.');
    this.data = snapshot(data);
    this.theme = { ...defaultTheme, ...options.theme };
    for (const key of ['fontSize', 'lineHeight', 'padding'] as const) {
      if (!Number.isFinite(this.theme[key]) || this.theme[key] <= 0) {
        throw new TypeError(`Theme ${key} must be a finite positive number.`);
      }
    }
    if (this.theme.lineHeight < this.theme.fontSize) throw new TypeError('Theme lineHeight must be at least fontSize.');
    this.interactive = options.interactive ?? true;
    this.onNodeSelect = options.onNodeSelect;
    for (const name of ['viewBox', 'role', 'aria-label', 'tabindex', 'style']) {
      this.originalAttributes.set(name, svg.getAttribute(name));
    }
    this.root = element(svg.ownerDocument, 'g', { id: this.prefix });
    this.root.style.setProperty('--bb-accent', this.theme.accent);
    svg.append(this.root);
    svg.setAttribute('role', 'group');
    if (!svg.hasAttribute('aria-label')) svg.setAttribute('aria-label', 'Basic block graph');
    if (this.interactive) {
      svg.setAttribute('tabindex', '0');
      svg.style.touchAction = 'none';
    }
    owners.set(svg, this);
    try {
      this.draw();
      if (this.interactive) this.bindInteractions();
      const Observer = svg.ownerDocument.defaultView?.ResizeObserver;
      if (Observer) {
        const observer = new Observer(() => {
          if (this.destroyed) return;
          const { width, height } = this.viewport();
          if (width === this.lastWidth && height === this.lastHeight) return;
          this.lastWidth = width;
          this.lastHeight = height;
          this.camera.resize(width, height);
          this.applyCamera();
        });
        observer.observe(svg);
        this.cleanup.push(() => observer.disconnect());
      }
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  private assertAlive(): void {
    if (this.destroyed) throw new Error('This Graph has been destroyed.');
  }

  private viewport(): { width: number; height: number } {
    const rect = this.svg.getBoundingClientRect();
    return { width: rect.width || 800, height: rect.height || 600 };
  }

  /** Remeasure text and restore automatic layout, retaining node selection. */
  draw(): void {
    this.assertAlive();
    const document = this.svg.ownerDocument;
    this.root.replaceChildren();
    this.blocks.clear();
    const defs = element(document, 'defs');
    const patternId = `${this.prefix}-grid`;
    const pattern = element(document, 'pattern', {
      id: patternId, width: 24, height: 24, patternUnits: 'userSpaceOnUse',
    });
    pattern.append(element(document, 'circle', { cx: 1, cy: 1, r: 1, fill: this.theme.grid }));
    defs.append(pattern);
    const style = element(document, 'style');
    style.textContent = `#${this.prefix} .bb-node { outline: none; }\n` +
      `#${this.prefix} .bb-node:hover > rect, #${this.prefix} .bb-node:focus > rect, #${this.prefix} .bb-selected > rect { stroke: var(--bb-accent); stroke-width: 2.5; }\n` +
      `#${this.prefix} text { user-select: none; }`;
    this.root.append(defs, style);
    this.background = element(document, 'rect', { fill: this.theme.background, 'data-background': '' });
    const grid = element(document, 'rect', { fill: `url(#${patternId})`, 'pointer-events': 'none', 'data-grid': '' });
    const edgesGroup = element(document, 'g', { class: 'bb-edges' });
    const nodesGroup = element(document, 'g', { class: 'bb-nodes' });
    this.root.append(this.background, grid, edgesGroup, nodesGroup);
    const sizes = this.data.nodes.map(node => {
      const block = new Block(nodesGroup, node, this.theme, this.interactive);
      this.blocks.set(node.id, block);
      block.select(node.id === this.selected);
      return { id: node.id, width: block.width, height: block.height };
    });
    const labelSizes = this.data.edges.map(edge => {
      if (!edge.label) return { width: 0, height: 0 };
      const text = element(document, 'text', { 'font-family': this.theme.fontFamily, 'font-size': this.theme.fontSize });
      text.textContent = edge.label;
      this.root.append(text);
      const width = Math.ceil(text.getComputedTextLength()) + 10;
      text.remove();
      return { width, height: this.theme.lineHeight + 6 };
    });
    const layout = layoutGraph(this.data, sizes, labelSizes);
    this.bounds = layout.bounds;
    for (const node of layout.nodes) this.blocks.get(node.id)!.position(node.x, node.y);
    for (const route of layout.edges) new Arrow(edgesGroup, defs, this.data.edges[route.index], route, this.theme, this.prefix);
    this.fit();
  }

  /** Validate before replacing the visible graph. Caller data is never mutated. */
  setGraph(data: GraphData): void {
    this.assertAlive();
    const next = snapshot(data);
    this.data = next;
    if (!next.nodes.some(node => node.id === this.selected)) this.selected = null;
    this.draw();
  }

  fit(): void {
    this.assertAlive();
    const { width, height } = this.viewport();
    this.lastWidth = width;
    this.lastHeight = height;
    this.camera.fit(this.bounds, width, height);
    this.applyCamera();
  }

  /** Factor > 1 zooms in; factor < 1 zooms out. */
  zoom(factor: number): void {
    this.assertAlive();
    if (!Number.isFinite(factor) || factor <= 0) throw new TypeError('Zoom factor must be finite and positive.');
    this.camera.zoom(factor, { x: this.camera.x + this.camera.width / 2, y: this.camera.y + this.camera.height / 2 });
    this.applyCamera();
  }

  /** Export the complete graph, independent of the current pan/zoom. */
  exportSVG(): string {
    this.assertAlive();
    const document = this.svg.ownerDocument;
    const exported = element(document, 'svg', {
      xmlns: SVG_NS,
      viewBox: `${this.bounds.x - 40} ${this.bounds.y - 40} ${Math.max(160, this.bounds.width + 80)} ${Math.max(120, this.bounds.height + 80)}`,
      width: Math.max(160, this.bounds.width + 80), height: Math.max(120, this.bounds.height + 80),
      role: 'img', 'aria-label': this.svg.getAttribute('aria-label') ?? 'Basic block graph',
    });
    const clone = this.root.cloneNode(true) as SVGGElement;
    for (const rect of clone.querySelectorAll('[data-background], [data-grid]')) {
      rect.setAttribute('x', String(this.bounds.x - 40));
      rect.setAttribute('y', String(this.bounds.y - 40));
      rect.setAttribute('width', String(Math.max(160, this.bounds.width + 80)));
      rect.setAttribute('height', String(Math.max(120, this.bounds.height + 80)));
    }
    for (const node of clone.querySelectorAll('[tabindex]')) node.removeAttribute('tabindex');
    exported.append(clone);
    const Serializer = document.defaultView?.XMLSerializer ?? XMLSerializer;
    return new Serializer().serializeToString(exported);
  }

  /** Release observers/listeners and restore the host SVG. Safe to call twice. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const dispose of this.cleanup) dispose();
    for (const id of this.pointers.keys()) {
      if (this.svg.hasPointerCapture(id)) this.svg.releasePointerCapture(id);
    }
    this.pointers.clear();
    this.root.remove();
    this.blocks.clear();
    for (const [name, value] of this.originalAttributes) {
      if (value === null) this.svg.removeAttribute(name);
      else this.svg.setAttribute(name, value);
    }
    owners.delete(this.svg);
  }

  private applyCamera(): void {
    this.camera.apply(this.svg);
    for (const rect of [this.background, this.root.querySelector<SVGRectElement>('[data-grid]')!]) {
      rect.setAttribute('x', String(this.camera.x));
      rect.setAttribute('y', String(this.camera.y));
      rect.setAttribute('width', String(this.camera.width));
      rect.setAttribute('height', String(this.camera.height));
    }
  }

  private world(point: Point): Point {
    const matrix = this.svg.getScreenCTM();
    if (!matrix) return { x: this.camera.x, y: this.camera.y };
    const svgPoint = this.svg.createSVGPoint();
    svgPoint.x = point.x;
    svgPoint.y = point.y;
    return svgPoint.matrixTransform(matrix.inverse());
  }

  private select(target: EventTarget | null): void {
    const node = (target as Element | null)?.closest?.<SVGGElement>('.bb-node');
    if (!node || !this.root.contains(node)) return;
    const id = node.getAttribute('data-node-id')!;
    if (this.selected !== null) this.blocks.get(this.selected)?.select(false);
    this.selected = id;
    this.blocks.get(id)!.select(true);
    this.onNodeSelect?.(id);
  }

  private listen<K extends keyof SVGElementEventMap>(type: K, handler: (event: SVGElementEventMap[K]) => void, options?: AddEventListenerOptions): void {
    this.svg.addEventListener(type, handler as EventListener, options);
    this.cleanup.push(() => this.svg.removeEventListener(type, handler as EventListener, options));
  }

  private bindInteractions(): void {
    this.listen('pointerdown', event => {
      if (event.button !== 0) return;
      if (!this.pointers.size) {
        this.moved = false;
        this.travel = 0;
        this.pressedTarget = event.target;
      }
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      this.svg.setPointerCapture(event.pointerId);
      if (this.pointers.size > 1) this.moved = true;
    });
    this.listen('pointermove', event => {
      const previous = this.pointers.get(event.pointerId);
      if (!previous) return;
      event.preventDefault();
      const old = [...this.pointers.values()];
      const current = { x: event.clientX, y: event.clientY };
      this.travel += Math.hypot(current.x - previous.x, current.y - previous.y);
      if (this.travel > 4) this.moved = true;
      this.pointers.set(event.pointerId, current);
      const next = [...this.pointers.values()];
      if (old.length === 2) {
        const mid = (points: Point[]) => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 });
        const distance = (points: Point[]) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        const before = distance(old);
        const after = distance(next);
        if (before > 0 && after > 0) this.camera.zoom(after / before, this.world(mid(old)));
        this.applyCamera();
        const a = this.world(mid(old));
        const b = this.world(mid(next));
        this.camera.x -= b.x - a.x;
        this.camera.y -= b.y - a.y;
      } else if (old.length === 1) {
        const a = this.world(previous);
        const b = this.world(current);
        this.camera.x -= b.x - a.x;
        this.camera.y -= b.y - a.y;
      }
      this.applyCamera();
    });
    this.listen('pointerup', event => {
      this.pointers.delete(event.pointerId);
      if (!this.moved && !this.pointers.size) this.select(this.pressedTarget);
      if (this.svg.hasPointerCapture(event.pointerId)) this.svg.releasePointerCapture(event.pointerId);
    });
    this.listen('pointercancel', event => { this.pointers.delete(event.pointerId); this.moved = true; });
    this.listen('lostpointercapture', event => this.pointers.delete(event.pointerId));
    this.listen('click', event => { if (event.detail === 0) this.select(event.target); });
    this.listen('wheel', event => {
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.viewport().height : 1;
      this.camera.zoom(Math.exp(-Math.max(-500, Math.min(500, event.deltaY * unit)) * 0.002), this.world({ x: event.clientX, y: event.clientY }));
      this.applyCamera();
    }, { passive: false });
    this.listen('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const step = this.camera.width / this.viewport().width * 50;
      switch (event.key) {
        case '+': case '=': this.zoom(1.2); break;
        case '-': case '_': this.zoom(1 / 1.2); break;
        case '0': case 'f': case 'F': this.fit(); break;
        case 'ArrowLeft': this.camera.x -= step; break;
        case 'ArrowRight': this.camera.x += step; break;
        case 'ArrowUp': this.camera.y -= step; break;
        case 'ArrowDown': this.camera.y += step; break;
        case 'Enter': case ' ': this.select(event.target); break;
        default: return;
      }
      event.preventDefault();
      this.applyCamera();
    });
  }
}
