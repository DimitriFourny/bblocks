(() => {
  'use strict';

  const svg = document.getElementById('graph');
  const sampleSelect = document.getElementById('sample');
  const editor = document.getElementById('graph-json');
  const editorPanel = document.querySelector('.editor-panel');
  const errorMessage = document.getElementById('editor-error');
  const successMessage = document.getElementById('editor-success');
  const counts = document.getElementById('counts');
  const selection = document.getElementById('selection');
  const darkMode = window.matchMedia('(prefers-color-scheme: dark)');
  const branchColor = '#5384c9';
  const alternateColor = '#b46a45';

  const samples = {
    branch: {
      nodes: [
        { id: 'entry', lines: ['entry:', '  load  r0, [input]', '  cmp   r0, 0'] },
        { id: 'positive', lines: ['positive:', '  mul   r0, 2', '  jump  merge'] },
        { id: 'negative', lines: ['negative:', '  neg   r0', '  jump  merge'] },
        { id: 'merge', lines: ['merge:', '  store [output], r0', '  return'] }
      ],
      edges: [
        { from: 'entry', to: 'positive', label: 'r0 ≥ 0', color: branchColor },
        { from: 'entry', to: 'negative', label: 'r0 < 0', color: alternateColor },
        { from: 'positive', to: 'merge' },
        { from: 'negative', to: 'merge' }
      ]
    },
    loop: {
      nodes: [
        { id: 'entry', lines: ['entry:', '  mov   i, 0', '  mov   sum, 0'] },
        { id: 'test', lines: ['test:', '  cmp   i, count'] },
        { id: 'body', lines: ['body:', '  add   sum, values[i]', '  inc   i'] },
        { id: 'exit', lines: ['exit:', '  return sum'] }
      ],
      edges: [
        { from: 'entry', to: 'test' },
        { from: 'test', to: 'body', label: 'i < count', color: branchColor },
        { from: 'test', to: 'exit', label: 'done', color: alternateColor },
        { from: 'body', to: 'test', label: 'next iteration' }
      ]
    },
    disconnected: {
      nodes: [
        { id: 'main', lines: ['main:', '  call helper', '  return'] },
        { id: 'helper', lines: ['helper:', '  load r0, [cache]'] },
        { id: 'return', lines: ['return:', '  return r0'] },
        { id: 'idle', lines: ['idle:', '  wait for event'] },
        { id: 'isolated', lines: ['isolated:', '  unreachable block'] }
      ],
      edges: [
        { id: 'cache-hit', from: 'helper', to: 'return', label: 'cache hit', color: branchColor },
        { id: 'cache-miss', from: 'helper', to: 'return', label: 'cache miss', color: alternateColor },
        { from: 'idle', to: 'idle', label: 'waiting' }
      ]
    },
    large: makeLargeGraph()
  };

  function makeLargeGraph() {
    const nodes = [];
    const edges = [];
    for (let stage = 0; stage < 12; stage += 1) {
      const prefix = `stage_${String(stage + 1).padStart(2, '0')}`;
      for (const name of ['entry', 'check', 'fast', 'slow', 'merge', 'exit']) {
        const id = `${prefix}_${name}`;
        const operations = {
          entry: ['  load  value, [stream]', `  mov   stage, ${stage + 1}`],
          check: ['  cmp   value, threshold'],
          fast: ['  add   value, offset', '  jump  merge'],
          slow: ['  call  normalize', '  jump  merge'],
          merge: ['  store [result], value'],
          exit: ['  advance stream', '  test  retry, retry']
        };
        nodes.push({ id, lines: [`${id}:`, ...operations[name]] });
      }
      const link = (from, to, extras = {}) => edges.push({
        from: `${prefix}_${from}`, to: `${prefix}_${to}`, ...extras
      });
      link('entry', 'check');
      link('check', 'fast', { label: 'ready', color: branchColor });
      link('check', 'slow', { label: 'normalize', color: alternateColor });
      link('fast', 'merge');
      link('slow', 'merge');
      link('merge', 'exit');
      if (stage % 3 === 2) link('exit', 'entry', { label: 'retry' });
      if (stage < 11) {
        edges.push({
          from: `${prefix}_exit`,
          to: `stage_${String(stage + 2).padStart(2, '0')}_entry`
        });
      }
    }
    return { nodes, edges };
  }

  function theme() {
    return darkMode.matches ? {
      background: '#18202a', grid: '#283443', nodeBackground: '#222e3d',
      nodeBorder: '#718399', text: '#e4eaf2', edge: '#a4b5c9', accent: '#91adff'
    } : {
      background: '#f8fafc', grid: '#e7ecf3', nodeBackground: '#ffffff',
      nodeBorder: '#8293a8', text: '#172433', edge: '#61758f', accent: '#3459c5'
    };
  }

  let graph;
  let currentData = samples.branch;
  let selectedId = null;

  function options() {
    return {
      interactive: true,
      theme: theme(),
      onNodeSelect: id => {
        selectedId = id;
        selection.textContent = `Selected: ${id}`;
      }
    };
  }

  function updateStatus() {
    counts.textContent = `${currentData.nodes.length} blocks · ${currentData.edges.length} edges`;
    if (!currentData.nodes.some(node => node.id === selectedId)) selectedId = null;
    selection.textContent = selectedId === null ? 'No block selected' : `Selected: ${selectedId}`;
  }

  function clearMessages() {
    errorMessage.hidden = true;
    successMessage.hidden = true;
    editor.removeAttribute('aria-invalid');
  }

  function showError(error, prefix = '') {
    successMessage.hidden = true;
    errorMessage.textContent = prefix + (error instanceof Error ? error.message : String(error));
    errorMessage.hidden = false;
    editorPanel.open = true;
  }

  function replaceGraph(data, sampleName) {
    // setGraph validates before replacing the existing graph. Only commit demo
    // state after it succeeds, so errors never discard the last valid data.
    graph.setGraph(data);
    currentData = data;
    sampleSelect.value = sampleName;
    updateStatus();
    clearMessages();
  }

  try {
    if (!window.bblocks || typeof window.bblocks.Graph !== 'function') {
      throw new Error('The BBlocks bundle is missing. Run npm run dev, then open the local demo URL.');
    }
    graph = new window.bblocks.Graph(svg, currentData, options());
    editor.value = JSON.stringify(currentData, null, 2);
    updateStatus();
  } catch (error) {
    const startupError = document.getElementById('startup-error');
    startupError.textContent = error instanceof Error ? error.message : String(error);
    startupError.hidden = false;
    counts.textContent = 'Graph unavailable';
    document.querySelectorAll('button, select').forEach(control => { control.disabled = true; });
    return;
  }

  sampleSelect.addEventListener('change', () => {
    const data = samples[sampleSelect.value];
    if (!data) return;
    try {
      replaceGraph(data, sampleSelect.value);
      editor.value = JSON.stringify(data, null, 2);
    } catch (error) {
      showError(error);
    }
  });

  document.getElementById('apply').addEventListener('click', () => {
    let data;
    try {
      data = JSON.parse(editor.value);
    } catch (error) {
      editor.setAttribute('aria-invalid', 'true');
      showError(error, 'JSON syntax error: ');
      return;
    }
    try {
      replaceGraph(data, 'custom');
      editor.value = JSON.stringify(data, null, 2);
      successMessage.textContent = 'Graph applied successfully.';
      successMessage.hidden = false;
    } catch (error) {
      editor.setAttribute('aria-invalid', 'true');
      showError(error, 'Invalid graph: ');
    }
  });

  const actions = {
    fit: () => graph.fit(),
    'zoom-in': () => graph.zoom(1.25),
    'zoom-out': () => graph.zoom(0.8),
    relayout: () => graph.draw(),
    download: () => {
      const blob = new Blob([graph.exportSVG()], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'bblocks-graph.svg';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };
  for (const [id, action] of Object.entries(actions)) {
    document.getElementById(id).addEventListener('click', () => {
      try { action(); } catch (error) { showError(error); }
    });
  }

  darkMode.addEventListener('change', () => {
    try {
      graph.destroy();
      graph = new window.bblocks.Graph(svg, currentData, options());
      selectedId = null;
      updateStatus();
    } catch (error) {
      showError(error);
    }
  });
  window.addEventListener('pagehide', event => {
    if (!event.persisted) graph.destroy();
  });
})();
