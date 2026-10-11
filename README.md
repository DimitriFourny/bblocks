# BBlocks

A reusable, typed SVG viewer for basic-block graphs. BBlocks measures your text, lays out blocks and directed edges with Dagre, and provides pan, zoom, selection, and standalone SVG export. It has **no framework dependency**; the layout dependency is `@dagrejs/dagre`.

## Build and run the demo

Use Node.js 18 or newer and npm:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

Open **http://127.0.0.1:8080**. `npm run dev` builds first, then starts a Node built-in HTTP server bound only to the local loopback interface. The server exposes only the demo files and browser bundles, not the repository or a directory listing. For a different port:

```sh
PORT=8090 npm run dev
```

The demo includes branch-and-merge, loop, disconnected/multiedge, and 72-block samples. Its toolbar fits, zooms, relayouts, and downloads the entire graph. A collapsible JSON editor applies new data with readable errors; invalid graph data leaves the previous graph in place. Block/edge counts and selected block IDs are shown beneath the viewer. The interface supports narrow screens and the system light/dark preference.

There is no automatic rebuild or browser reload. After a source change, run `npm run build` in another terminal and refresh the page. To start the server without rebuilding, use `node scripts/dev-server.cjs`.

### Build outputs

| File | Purpose |
| --- | --- |
| `dist/bblocks.js` | UMD bundle, including Dagre; browser global `window.bblocks` |
| `dist/bblocks.mjs` | Native ESM bundle, including Dagre |
| `dist/types/index.d.ts` | Public TypeScript declarations (with referenced declarations alongside it) |
| `dist/types/index.d.mts` | ESM declaration entrypoint for NodeNext/native ESM consumers |

`npm run typecheck` checks strict ES2020/DOM TypeScript without emitting files. `npm test` runs the TypeScript Node tests through `tsx`. `npm run build` produces both webpack bundles and declarations with separate ESM/CommonJS entrypoints. `npm pack` runs the build through `prepack`; package metadata exposes `main`, `module`, `types`, and conditional `exports`, and includes the `dist` directory.

## Direct script use

After building, load the UMD bundle from a path relative to your page:

```html
<div style="width: 100%; height: 480px;">
  <svg id="flow" style="display: block; width: 100%; height: 100%;"
       xmlns="http://www.w3.org/2000/svg" aria-label="Function control flow"></svg>
</div>
<script src="./dist/bblocks.js"></script>
<script>
  const data = {
    nodes: [
      { id: 'entry', lines: ['entry:', '  cmp r0, 0'] },
      { id: 'exit', lines: ['exit:', '  return'] }
    ],
    edges: [{ from: 'entry', to: 'exit', label: 'done' }]
  };
  const graph = new window.bblocks.Graph(document.getElementById('flow'), data, {
    onNodeSelect: id => console.log('Selected block:', id)
  });
  // The constructor renders and fits immediately; no initial draw() is needed.
</script>
```

Set the SVG's size through its element or container. BBlocks does not style `document.body` or take over the page. Keep one live `Graph` per SVG; separate SVG elements can host independent viewers.

## ESM and TypeScript

For direct browser ESM use, keep the bundle path relative to your page and use a module script:

```html
<script type="module">
  import Graph, { defaultTheme } from './dist/bblocks.mjs';

  const svg = document.querySelector('#flow');
  const data = { nodes: [{ id: 'only', lines: ['return'] }], edges: [] };
  const graph = new Graph(svg, data, {
    theme: { ...defaultTheme, accent: '#7c3aed' }
  });
</script>
```

When installed into a package-consuming application, import from the package name:

```ts
import Graph, { defaultTheme } from 'bblocks';
import type { GraphData, GraphOptions, GraphNode, GraphEdge, Theme } from 'bblocks';

const svg = document.querySelector<SVGSVGElement>('#flow');
if (!svg) throw new Error('Missing graph SVG');

const data: GraphData = {
  nodes: [{ id: 'entry', lines: ['entry:', '  return'] }],
  edges: []
};
const options: GraphOptions = {
  theme: { ...defaultTheme, fontSize: 14, lineHeight: 22 },
  onNodeSelect: id => console.log(id)
};
const graph = new Graph(svg, data, options);
```

The default export and named `Graph` export refer to the same constructor. `defaultTheme` is a named value export; `GraphData`, `GraphOptions`, `GraphNode`, `GraphEdge`, and `Theme` are type exports.

## Graph data

Supply explicit stable string IDs rather than positional links:

```ts
const data: GraphData = {
  nodes: [
    { id: 'entry', lines: ['entry:', '  test ready'] },
    { id: 'work', lines: ['work:', '  process item'] },
    { id: 'exit', lines: ['exit:', '  return'] }
  ],
  edges: [
    { id: 'ready', from: 'entry', to: 'work', color: '#5384c9', label: 'ready' },
    { id: 'skip', from: 'entry', to: 'exit', color: '#b46a45', label: 'skip' },
    { from: 'work', to: 'entry', label: 'next item' }
  ]
};
```

- `nodes`: a readonly array of `{ id: string, lines: readonly string[] }`. IDs must be unique and non-empty. Text lines are literal text, not HTML or SVG markup. Empty line arrays are allowed.
- `edges`: a readonly array of `{ from: string, to: string, id?: string, color?: string, label?: string }`. Both endpoints must name existing nodes. If supplied, edge IDs must be unique and non-empty. Colors and labels are optional strings; missing colors use the theme's `edge` color.
- Input arrays and objects are not mutated by BBlocks. Use `setGraph` to update the viewer rather than mutating previously supplied data.
- Empty graphs (`{ nodes: [], edges: [] }`), disconnected components, cycles, self-edges, and parallel edges are supported. Parallel edges do not require explicit IDs.

Invalid data throws an error with a readable message. `setGraph` validates data before replacing the current graph, so a malformed JSON graph can be rejected without losing the visible graph.

## Options and theme

`new Graph(svg, data, options?)` accepts:

| Option | Meaning |
| --- | --- |
| `theme?: Partial<Theme>` | Override any of the defaults below |
| `interactive?: boolean` | Enable pointer, wheel, touch, keyboard, and node-selection interactions; defaults to `true` |
| `onNodeSelect?: (id: string) => void` | Called when the user selects a block by click/tap or keyboard |

Theme colors and the font family are strings. Numeric settings use SVG layout units. The exported `defaultTheme` provides these defaults:

| Theme property | Default | Purpose |
| --- | --- | --- |
| `background` | `#f8fafc` | Canvas background |
| `grid` | `#d5dce5` | Canvas grid |
| `nodeBackground` | `#ffffff` | Block fill |
| `nodeBorder` | `#b8c5d6` | Block outline |
| `text` | `#25344b` | Block body text (edge labels use their edge color) |
| `edge` | `#60758f` | Default directed-edge color |
| `accent` | `#2563eb` | Block heading and selection/focus accent |
| `fontFamily` | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` | Text font stack |
| `fontSize` | `12` | Text size |
| `lineHeight` | `20` | Distance between text lines |
| `padding` | `16` | Interior block padding |

`fontSize`, `lineHeight`, and `padding` must be finite positive numbers; `lineHeight` must be at least `fontSize`. Options are chosen at construction. To change options or theme, destroy the instance and construct another on the same SVG with your graph data.

## Graph methods

| Method | Behavior |
| --- | --- |
| `setGraph(data: GraphData): void` | Validate and replace the graph, remeasure/layout, and fit all content |
| `draw(): void` | Remeasure text and recompute layout, then fit; safe to call repeatedly without accumulating rendering elements |
| `fit(): void` | Fit the full graph into the current SVG viewport |
| `zoom(factor: number): void` | Zoom around the viewport center; `> 1` zooms in, `0 < factor < 1` zooms out; factor must be finite and positive |
| `exportSVG(): string` | Return a standalone SVG string sized to the entire graph, not just the currently visible camera region |
| `destroy(): void` | Remove owned SVG content, listeners, and resize observation; restore the host SVG attributes changed by the viewer; safe to call more than once |

For example, `graph.zoom(1.25)` zooms in, and `graph.zoom(0.8)` zooms out. Programmatic controls still work with `interactive: false`. Release the instance with `destroy()` when its host is removed or reused; do not call other methods on a destroyed instance.

A `ResizeObserver`, where available, keeps the camera aligned with SVG size changes. Call `fit()` when you want to refit all content; call `draw()` after a font change or once a web font finishes loading so that block dimensions can be measured again.

For download:

```js
const url = URL.createObjectURL(new Blob([graph.exportSVG()], {
  type: 'image/svg+xml;charset=utf-8'
}));
const link = document.createElement('a');
link.href = url;
link.download = 'graph.svg';
document.body.appendChild(link);
link.click();
link.remove();
setTimeout(() => URL.revokeObjectURL(url), 1000);
```

SVG exports contain the full graph and its rendering styles. Referenced fonts are not embedded; install the same fonts for identical text metrics on another system.

## Navigation and accessibility

With interaction enabled:

- Drag the canvas to pan, including a drag starting over a block. Blocks themselves are not draggable.
- Scroll the wheel to zoom around the pointer position.
- Use one-finger drag to pan and two-finger pinch to zoom on touch devices. Touch gestures within the SVG are reserved for graph navigation.
- Focus the SVG and use arrow keys to pan, `+`/`=` to zoom in, `-` to zoom out, and `0` or `F` to fit.
- Click/tap a block to select it. Blocks are keyboard-focusable; use Tab to reach one and Enter or Space to select it. Selection invokes `onNodeSelect` with its ID.

Give the host SVG an informative `aria-label`. Native HTML controls can call the public methods, as the demo does. Setting `interactive: false` disables viewer navigation and user selection for a static embedded graph.

## Limitations

- BBlocks is a graph viewer, **not an assembly parser**. Parse assembly or another source format yourself and provide `GraphData`.
- Dagre produces practical directed-graph layouts, not a guaranteed collision-free or globally optimal drawing. Dense cyclic graphs and long labels can still be difficult to read.
- Rendering needs a **modern browser and an attached, visible SVG with nonzero dimensions** for real text measurement. A detached SVG, a hidden `display: none` container, or a DOM emulator without SVG text measurement is not a supported rendering target. Show and size the element before creating the graph.
- This is a browser renderer, not a headless/server-side SVG generation API. ES2020, SVG APIs, Pointer Events, and standard DOM support are expected.
- The viewer does not offer node dragging, editing, or parsing. The demo's JSON editor is an example application built around `setGraph`, not an additional library API.

## 1.0.0 release and migration

Version 1.0.0 introduces the typed `Graph` API, measured block text, Dagre multigraph layout, container-based camera controls, node selection, lifecycle cleanup, SVG export, UMD/ESM bundles, declarations, and the standalone demo.

This is a **clean breaking cutover** from the old `new bblocks.new(svg, blocksLines, links)` API. The old constructor alias and positional-data API are removed. Convert your arrays at the application boundary:

```js
const nodes = blocksLines.map((lines, index) => ({ id: String(index), lines }));
const edges = links.map(([from, to, color]) => ({
  from: String(from),
  to: String(to),
  ...(color === undefined ? {} : { color })
}));
const graph = new window.bblocks.Graph(svg, { nodes, edges });
```

Rendering happens in the constructor; remove the old mandatory initial `draw()` call. Use stable meaningful IDs for new data. The Node demo server replaces the former Python `serveit.py` helper.

### Publishing status

The repository is configured to build and pack **`bblocks@1.0.0`**. Packaging readiness is not registry publication: these source changes do not publish the package or establish availability of the npm name. Before publishing, run the checks, inspect `npm pack --dry-run`, and confirm registry/package-name access.

## License

MIT. See [LICENSE](./LICENSE) for the license terms.

The standalone bundles retain the MIT notices for bundled Dagre and Graphlib.
