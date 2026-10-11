import { element } from './svg';
import type { GraphNode, Theme } from './types';

/** Owns its SVG elements; no document-global IDs or queries. */
export default class Block {
  readonly element: SVGGElement;
  readonly width: number;
  readonly height: number;

  constructor(parent: SVGGElement, node: GraphNode, theme: Theme, interactive: boolean) {
    const document = parent.ownerDocument;
    this.element = element(document, 'g', {
      class: 'bb-node', 'data-node-id': node.id,
      role: interactive ? 'button' : 'group',
      'aria-label': node.lines.join('\n') || node.id,
    });
    if (interactive) {
      this.element.setAttribute('tabindex', '0');
      this.element.setAttribute('aria-pressed', 'false');
    }
    parent.append(this.element);
    const title = element(document, 'title');
    title.textContent = node.id;
    this.element.append(title);
    let textWidth = 0;
    node.lines.forEach((line, index) => {
      const text = element(document, 'text', {
        x: theme.padding,
        y: theme.padding + theme.fontSize + index * theme.lineHeight,
        fill: index === 0 ? theme.accent : theme.text,
        'font-family': theme.fontFamily, 'font-size': theme.fontSize,
        'font-weight': index === 0 ? '600' : '400',
        'xml:space': 'preserve',
      });
      text.style.whiteSpace = 'pre';
      text.textContent = line;
      this.element.append(text);
      textWidth = Math.max(textWidth, text.getComputedTextLength());
    });
    this.width = Math.max(120, Math.ceil(textWidth) + 2 * theme.padding);
    this.height = Math.max(1, node.lines.length) * theme.lineHeight + 2 * theme.padding;
    this.element.prepend(element(document, 'rect', {
      width: this.width, height: this.height, rx: 7,
      fill: theme.nodeBackground, stroke: theme.nodeBorder, 'stroke-width': 1.5,
    }));
  }

  position(x: number, y: number): void {
    this.element.setAttribute('transform', `translate(${x} ${y})`);
  }

  select(selected: boolean): void {
    this.element.classList.toggle('bb-selected', selected);
    if (this.element.hasAttribute('aria-pressed')) this.element.setAttribute('aria-pressed', String(selected));
  }
}
