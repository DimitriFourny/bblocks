import { element } from './svg';
import type { GraphEdge, RoutedEdge, Theme } from './types';

export default class Arrow {
  constructor(parent: SVGGElement, defs: SVGDefsElement, edge: GraphEdge, route: RoutedEdge, theme: Theme, prefix: string) {
    const document = parent.ownerDocument;
    const color = edge.color ?? theme.edge;
    const markerId = `${prefix}-arrow-${route.index}`;
    const marker = element(document, 'marker', {
      id: markerId, viewBox: '0 0 10 10', refX: 10, refY: 5,
      markerWidth: 7, markerHeight: 7, orient: 'auto', markerUnits: 'userSpaceOnUse',
    });
    marker.append(element(document, 'path', { d: 'M 0 0 L 10 5 L 0 10 Z', fill: color }));
    defs.append(marker);
    const group = element(document, 'g', { class: 'bb-edge', 'data-edge-index': route.index });
    const title = element(document, 'title');
    title.textContent = edge.label ? `${edge.from} → ${edge.to}: ${edge.label}` : `${edge.from} → ${edge.to}`;
    group.append(title);
    group.append(element(document, 'path', {
      d: route.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' '),
      stroke: color, 'stroke-width': 1.6, fill: 'none',
      'stroke-linejoin': 'round', 'marker-end': `url(#${markerId})`,
    }));
    if (edge.label && route.labelPosition) {
      const text = element(document, 'text', {
        x: route.labelPosition.x, y: route.labelPosition.y,
        fill: color, 'font-family': theme.fontFamily, 'font-size': theme.fontSize,
        'text-anchor': 'middle', 'dominant-baseline': 'central',
        stroke: theme.background, 'stroke-width': 5, 'paint-order': 'stroke', 'stroke-linejoin': 'round',
      });
      text.textContent = edge.label;
      group.append(text);
    }
    parent.append(group);
  }
}
