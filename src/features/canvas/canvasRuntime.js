import { createRafThrottle, debounce } from "../../utils/performance.js";

const CANVAS_UI_DEFAULTS = {
  leftPanelOpen: false,
  rightPanelOpen: false,
  templatePickerOpen: false,
  quickInsertOpen: false,
  focusMode: false,
  propertiesTab: "content",
  inlineEditNodeId: null,
  selectedIds: [],
  recentTypes: ["text", "sticky", "feature"],
  favoriteTypes: ["text", "sticky", "feature", "milestone"],
  quickInsertAnchor: { x: 220, y: 140 },
  saveState: "saved",
};

const COLOR_PRESETS = ["#8b5cf6", "#f59e0b", "#22c55e", "#38bdf8", "#ec4899", "#14b8a6", "#ef4444", "#a78bfa"];

const TYPE_LABELS = {
  text: "Text Note",
  sticky: "Sticky Note",
  checklist: "Checklist",
  feature: "Feature Card",
  mechanic: "Mechanic Card",
  milestone: "Milestone",
  section: "Section Header",
  risk: "Risk Marker",
};

export function createCanvasRuntime(deps) {
  const {
    els,
    getState,
    getActiveDoc,
    save,
    uid,
    escape,
    escapeAttr,
    showToast,
    clampNumber,
    templates,
    templateLayouts,
    openContextMenu,
    closeContextMenu,
  } = deps;

  let dragState = null;
  let panState = null;
  let pendingCommit = false;

  const scheduleRender = createRafThrottle(() => {
    renderCanvasWorkspace();
  });

  const debouncedSave = debounce(() => {
    const doc = getActiveDoc();
    if (!doc || doc.docType !== "canvas" || !pendingCommit) return;
    pendingCommit = false;
    doc.canvas.ui.saveState = "saved";
    save();
    updateStatusReadout(doc);
  }, 140);

  function normalizeCanvas(doc) {
    if (!doc || doc.docType !== "canvas") return;
    if (!doc.canvas || typeof doc.canvas !== "object") doc.canvas = {};
    if (!Array.isArray(doc.canvas.nodes)) doc.canvas.nodes = [];
    if (!Array.isArray(doc.canvas.edges)) doc.canvas.edges = [];
    if (!doc.canvas.view || typeof doc.canvas.view !== "object") doc.canvas.view = { x: 0, y: 0, scale: 1 };
    if (!doc.canvas.filters || typeof doc.canvas.filters !== "object") doc.canvas.filters = { query: "", type: "all", showLocked: true };
    if (!doc.canvas.ui || typeof doc.canvas.ui !== "object") doc.canvas.ui = {};
    doc.canvas.ui = {
      ...CANVAS_UI_DEFAULTS,
      ...doc.canvas.ui,
      quickInsertAnchor: {
        ...CANVAS_UI_DEFAULTS.quickInsertAnchor,
        ...(doc.canvas.ui.quickInsertAnchor || {}),
      },
    };
    if (typeof doc.canvas.snapToGrid !== "boolean") doc.canvas.snapToGrid = true;
    if (typeof doc.canvas.gridVisible !== "boolean") doc.canvas.gridVisible = true;
    if (typeof doc.canvas.presentationMode !== "boolean") doc.canvas.presentationMode = false;
    doc.canvas.nodes = doc.canvas.nodes.map((node, index) => ({
      id: node.id || uid(),
      type: node.type || "text",
      title: node.title || `Node ${index + 1}`,
      body: node.body || "",
      x: Number(node.x || index * 220),
      y: Number(node.y || index * 120),
      width: Number(node.width || (node.type === "section" ? 320 : 248)),
      height: Number(node.height || (node.type === "section" ? 110 : 168)),
      color: node.color || getState().settings.canvas?.defaultNodeColor || "#8b5cf6",
      locked: Boolean(node.locked),
      collapsed: Boolean(node.collapsed),
      pinned: Boolean(node.pinned),
      tags: Array.isArray(node.tags) ? node.tags : [],
      linkTarget: node.linkTarget || "",
      linkType: node.linkType || "",
      stylePreset: node.stylePreset || "default",
    }));
    const validIds = new Set(doc.canvas.nodes.map((node) => node.id));
    doc.canvas.ui.selectedIds = doc.canvas.ui.selectedIds.filter((id) => validIds.has(id));
    if (!doc.canvas.ui.selectedIds.length && doc.canvas.activeNodeId && validIds.has(doc.canvas.activeNodeId)) {
      doc.canvas.ui.selectedIds = [doc.canvas.activeNodeId];
    }
  }

  function canvasNodeFactory(templateId) {
    const template = templates.find((entry) => entry.id === templateId) || templates[0];
    return {
      id: uid(),
      type: template.type,
      title: template.name,
      body: template.type === "checklist" ? "- Task 1\n- Task 2" : "Add planning detail here.",
      x: 96 + Math.random() * 80,
      y: 96 + Math.random() * 60,
      width: template.type === "section" ? 340 : 248,
      height: template.type === "section" ? 110 : 168,
      color: template.color,
      locked: false,
      collapsed: false,
      pinned: false,
      tags: [],
      linkTarget: "",
      linkType: "",
      stylePreset: "default",
    };
  }

  function getSelectedNodes(doc) {
    const ids = doc.canvas.ui.selectedIds || [];
    const selected = doc.canvas.nodes.filter((node) => ids.includes(node.id));
    if (selected.length) return selected;
    return doc.canvas.activeNodeId
      ? doc.canvas.nodes.filter((node) => node.id === doc.canvas.activeNodeId)
      : [];
  }

  function getPrimarySelectedNode(doc, filteredNodes = null) {
    const selected = getSelectedNodes(doc)[0];
    if (selected) return selected;
    return filteredNodes?.[0] || null;
  }

  function setSelection(doc, ids, activeId = ids[0] || null) {
    doc.canvas.ui.selectedIds = [...new Set(ids)];
    doc.canvas.activeNodeId = activeId;
  }

  function setSaveState(doc, value) {
    if (!doc?.canvas?.ui) return;
    doc.canvas.ui.saveState = value;
    updateStatusReadout(doc);
  }

  function markDirty() {
    const doc = getActiveDoc();
    if (!doc || doc.docType !== "canvas") return;
    doc.updatedAt = Date.now();
    pendingCommit = true;
    setSaveState(doc, "saving");
    debouncedSave();
  }

  function updateStatusReadout(doc) {
    const statusNode = document.querySelector("#canvasSaveState");
    const countNode = document.querySelector("#canvasNodeCount");
    const zoomNode = document.querySelector("#canvasZoomState");
    if (statusNode) statusNode.textContent = doc.canvas.ui.saveState === "saving" ? "Saving..." : "Autosaved";
    if (countNode) countNode.textContent = `${getFilteredNodes(doc).length} nodes`;
    if (zoomNode) zoomNode.textContent = `${Math.round((doc.canvas.view.scale || 1) * 100)}% zoom`;
  }

  function updateViewportTransform(doc) {
    const viewport = document.querySelector("#canvasViewport");
    if (!viewport || !doc?.canvas?.view) return;
    viewport.style.transform = `translate3d(${doc.canvas.view.x}px, ${doc.canvas.view.y}px, 0) scale(${doc.canvas.view.scale})`;
    updateStatusReadout(doc);
  }

  function updateNodeElement(node) {
    if (!node) return;
    const nodeElement = document.querySelector(`[data-canvas-node="${node.id}"]`);
    if (!nodeElement) return;
    nodeElement.style.left = `${node.x}px`;
    nodeElement.style.top = `${node.y}px`;
    nodeElement.style.width = `${node.width}px`;
    nodeElement.style.height = `${node.height}px`;
    nodeElement.style.setProperty("--node-color", node.color);
    const titleNode = nodeElement.querySelector(".canvas-node-title");
    const bodyNode = nodeElement.querySelector(".canvas-node-body");
    if (titleNode) titleNode.textContent = node.title;
    if (bodyNode) bodyNode.textContent = node.collapsed ? "" : node.body;
  }

  function getFilteredNodes(doc) {
    const query = (doc.canvas.filters?.query || "").trim().toLowerCase();
    return doc.canvas.nodes.filter((node) => (
      (!query || [node.title, node.body, ...(node.tags || [])].join(" ").toLowerCase().includes(query))
      && ((doc.canvas.filters?.type || "all") === "all" || node.type === doc.canvas.filters.type)
      && (doc.canvas.filters?.showLocked !== false || !node.locked)
    ));
  }

  function rememberRecentType(doc, templateId) {
    const list = [templateId, ...(doc.canvas.ui.recentTypes || []).filter((item) => item !== templateId)];
    doc.canvas.ui.recentTypes = list.slice(0, 5);
  }

  function closeCanvasPopovers(doc) {
    doc.canvas.ui.quickInsertOpen = false;
    doc.canvas.ui.templatePickerOpen = false;
  }

  function openQuickInsert(doc, anchor = null) {
    closeCanvasPopovers(doc);
    doc.canvas.ui.leftPanelOpen = true;
    doc.canvas.ui.quickInsertOpen = true;
    if (anchor) doc.canvas.ui.quickInsertAnchor = anchor;
    renderCanvasWorkspace();
  }

  function openTemplatePicker(doc) {
    closeCanvasPopovers(doc);
    doc.canvas.ui.leftPanelOpen = true;
    doc.canvas.ui.templatePickerOpen = true;
    renderCanvasWorkspace();
  }

  function addCanvasNode(templateId = "text", origin = null) {
    const doc = getActiveDoc();
    if (!doc || doc.docType !== "canvas") return;
    normalizeCanvas(doc);
    const node = canvasNodeFactory(templateId);
    if (origin) {
      node.x = origin.x;
      node.y = origin.y;
    }
    rememberRecentType(doc, templateId);
    doc.canvas.nodes.push(node);
    setSelection(doc, [node.id], node.id);
    doc.canvas.ui.leftPanelOpen = false;
    closeCanvasPopovers(doc);
    save();
    renderCanvasWorkspace();
  }

  function applyCanvasPreset(presetId) {
    const doc = getActiveDoc();
    if (!doc || doc.docType !== "canvas") return;
    normalizeCanvas(doc);
    const rows = presetId === "org-chart"
      ? ["Leadership", "Discipline Leads", "Contributors"]
      : presetId === "economy-loop"
        ? ["Earn", "Spend", "Upgrade", "Retention"]
        : presetId === "roadmap-map"
          ? ["Now", "Next", "Later", "Risks"]
          : presetId === "risk-map"
            ? ["Critical Risks", "Mitigation", "Owners", "Review"]
            : presetId === "feature-dependencies"
              ? ["Core Feature", "Dependencies", "Blockers", "Validation"]
              : presetId === "milestone-map"
                ? ["Alpha", "Beta", "Content Lock", "Ship"]
                : presetId === "scope-breakdown"
                  ? ["Pillars", "Must Ship", "Nice To Have", "Cut List"]
                  : ["Discovery", "Build", "Review", "Ship"];
    doc.canvas.nodes = rows.map((label, index) => ({
      ...canvasNodeFactory(index === 0 ? "section" : "feature"),
      id: uid(),
      title: label,
      x: 120 + index * 300,
      y: 120 + (index % 2) * 132,
    }));
    setSelection(doc, doc.canvas.nodes[0] ? [doc.canvas.nodes[0].id] : [], doc.canvas.nodes[0]?.id || null);
    closeCanvasPopovers(doc);
    save();
    renderCanvasWorkspace();
    showToast("Canvas template applied");
  }

  function fitCanvasView(doc, nodes = doc.canvas.nodes) {
    if (!nodes.length) return;
    const minX = Math.min(...nodes.map((node) => node.x));
    const minY = Math.min(...nodes.map((node) => node.y));
    const maxX = Math.max(...nodes.map((node) => node.x + node.width));
    const maxY = Math.max(...nodes.map((node) => node.y + node.height));
    const stage = document.querySelector("#canvasStage");
    const width = stage?.clientWidth || 1080;
    const height = stage?.clientHeight || 700;
    const contentWidth = Math.max(maxX - minX + 180, 420);
    const contentHeight = Math.max(maxY - minY + 180, 320);
    const scale = clampNumber(Math.min(width / contentWidth, height / contentHeight), 0.45, 1.25);
    doc.canvas.view.scale = scale;
    doc.canvas.view.x = Math.round((width - (maxX - minX) * scale) / 2 - minX * scale);
    doc.canvas.view.y = Math.round((height - (maxY - minY) * scale) / 2 - minY * scale);
    save();
    renderCanvasWorkspace();
  }

  function zoomToSelection(doc) {
    const selected = getSelectedNodes(doc);
    if (!selected.length) return;
    fitCanvasView(doc, selected);
  }

  function alignSelection(doc, mode = "left") {
    const selected = getSelectedNodes(doc);
    if (selected.length < 2) return;
    if (mode === "left") {
      const x = Math.min(...selected.map((node) => node.x));
      selected.forEach((node) => {
        node.x = x;
        updateNodeElement(node);
      });
    } else if (mode === "top") {
      const y = Math.min(...selected.map((node) => node.y));
      selected.forEach((node) => {
        node.y = y;
        updateNodeElement(node);
      });
    }
    markDirty();
    scheduleRender();
  }

  function distributeSelection(doc) {
    const selected = getSelectedNodes(doc).slice().sort((a, b) => a.x - b.x);
    if (selected.length < 3) return;
    const first = selected[0];
    const last = selected[selected.length - 1];
    const span = last.x - first.x;
    const step = span / (selected.length - 1);
    selected.forEach((node, index) => {
      node.x = first.x + index * step;
      updateNodeElement(node);
    });
    markDirty();
    scheduleRender();
  }

  function tidySelection(doc) {
    const selected = getSelectedNodes(doc);
    if (!selected.length) return;
    const originX = Math.min(...selected.map((node) => node.x));
    const originY = Math.min(...selected.map((node) => node.y));
    selected.forEach((node, index) => {
      node.x = originX + (index % 2) * 280;
      node.y = originY + Math.floor(index / 2) * 190;
      updateNodeElement(node);
    });
    markDirty();
    scheduleRender();
  }

  function toggleNodeFlag(doc, flag) {
    getSelectedNodes(doc).forEach((node) => {
      node[flag] = !node[flag];
      updateNodeElement(node);
    });
    markDirty();
    scheduleRender();
  }

  function duplicateSelection(doc) {
    const selected = getSelectedNodes(doc);
    if (!selected.length) return;
    const clones = selected.map((node, index) => ({
      ...node,
      id: uid(),
      x: node.x + 42 + index * 12,
      y: node.y + 42 + index * 12,
      title: selected.length === 1 ? `${node.title} Copy` : `${node.title} ${index + 1}`,
    }));
    doc.canvas.nodes.push(...clones);
    setSelection(doc, clones.map((node) => node.id), clones[0]?.id || null);
    save();
    renderCanvasWorkspace();
  }

  function deleteSelection(doc) {
    const ids = new Set((doc.canvas.ui.selectedIds || []).length ? doc.canvas.ui.selectedIds : [doc.canvas.activeNodeId].filter(Boolean));
    if (!ids.size) return;
    doc.canvas.nodes = doc.canvas.nodes.filter((node) => !ids.has(node.id));
    setSelection(doc, [], null);
    save();
    renderCanvasWorkspace();
  }

  function nodeTypeOptions(selectedType) {
    return templates.map((template) => `<option value="${escapeAttr(template.type)}" ${selectedType === template.type ? "selected" : ""}>${escape(TYPE_LABELS[template.type] || template.name)}</option>`).join("");
  }

  function renderQuickInsert(doc) {
    if (!doc.canvas.ui.quickInsertOpen) return "";
    const anchor = doc.canvas.ui.quickInsertAnchor || CANVAS_UI_DEFAULTS.quickInsertAnchor;
    const favorites = (doc.canvas.ui.favoriteTypes || []).map((id) => templates.find((template) => template.id === id)).filter(Boolean);
    const recent = (doc.canvas.ui.recentTypes || []).map((id) => templates.find((template) => template.id === id)).filter(Boolean);
    return `
      <div class="canvas-popover quick-insert-popover" style="left:${anchor.x}px;top:${anchor.y}px;">
        <div class="canvas-popover-header">
          <div>
            <p class="eyebrow">Quick Insert</p>
            <strong>Add a planning block</strong>
          </div>
          <button id="canvasCloseQuickInsertButton" class="compact-icon-button" type="button">x</button>
        </div>
        <div class="canvas-insert-section">
          <span>Favorites</span>
          <div class="canvas-chip-grid">
            ${favorites.map((template) => `<button class="secondary-button" type="button" data-canvas-template="${escapeAttr(template.id)}">${escape(template.name)}</button>`).join("")}
          </div>
        </div>
        <div class="canvas-insert-section">
          <span>Recent</span>
          <div class="canvas-chip-grid">
            ${recent.map((template) => `<button class="secondary-button" type="button" data-canvas-template="${escapeAttr(template.id)}">${escape(template.name)}</button>`).join("")}
          </div>
        </div>
        <div class="canvas-insert-section">
          <span>All node types</span>
          <div class="canvas-command-list">
            ${templates.map((template) => `<button class="canvas-command-button" type="button" data-canvas-template="${escapeAttr(template.id)}"><strong>${escape(template.name)}</strong><small>${escape(TYPE_LABELS[template.type] || template.type)}</small></button>`).join("")}
          </div>
        </div>
      </div>
    `;
  }

  function openCanvasStageMenu(doc, x, y) {
    openContextMenu(x, y, [
      ...templates.slice(0, 8).map((template) => ({
        label: `Add ${template.name}`,
        action: () => addCanvasNode(template.id, {
          x: (x - 120 - doc.canvas.view.x) / Math.max(doc.canvas.view.scale || 1, 0.45),
          y: (y - 140 - doc.canvas.view.y) / Math.max(doc.canvas.view.scale || 1, 0.45),
        }),
      })),
      { label: "Open template gallery", action: () => openTemplatePicker(doc) },
      { label: "Fit view", action: () => fitCanvasView(doc) },
      { label: "Reset view", action: () => { doc.canvas.view = { x: 0, y: 0, scale: 1 }; save(); renderCanvasWorkspace(); } },
      { label: doc.canvas.presentationMode ? "Exit presentation mode" : "Enter presentation mode", action: () => { doc.canvas.presentationMode = !doc.canvas.presentationMode; renderCanvasWorkspace(); } },
      { label: doc.canvas.ui.focusMode ? "Exit focus mode" : "Enter focus mode", action: () => { doc.canvas.ui.focusMode = !doc.canvas.ui.focusMode; renderCanvasWorkspace(); } },
    ]);
  }

  function renderTemplatePicker(doc) {
    if (!doc.canvas.ui.templatePickerOpen) return "";
    return `
      <div class="canvas-template-drawer">
        <div class="canvas-popover-header">
          <div>
            <p class="eyebrow">Templates</p>
            <strong>Start from a proven map</strong>
          </div>
          <button id="canvasCloseTemplatePickerButton" class="compact-icon-button" type="button">x</button>
        </div>
        <div class="canvas-template-gallery">
          ${templateLayouts.map((template) => `
            <button class="canvas-template-card" type="button" data-canvas-layout="${escapeAttr(template.id)}">
              <strong>${escape(template.name)}</strong>
              <p>${escape(template.summary || "Visual planning structure")}</p>
              <span>Insert template</span>
            </button>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderPropertiesPanel(doc, selected, filteredNodes) {
    const selectedNodes = getSelectedNodes(doc);
    const activeTab = doc.canvas.ui.propertiesTab || "content";
    if (!doc.canvas.ui.rightPanelOpen && !doc.canvas.ui.focusMode) return "";
    if (!selectedNodes.length || !selected) {
      return `
        <aside class="canvas-properties premium-surface">
          <div class="canvas-properties-head">
            <div>
              <p class="eyebrow">Inspector</p>
              <strong>Nothing selected</strong>
            </div>
            <button id="canvasCloseInspectorButton" class="compact-icon-button" type="button">x</button>
          </div>
          <div class="canvas-empty-inspector">
            <p>Select a node to edit content, style, links, and actions.</p>
            <div class="canvas-empty-actions">
              <button id="canvasEmptyQuickAddButton" class="primary-button" type="button">Quick Add</button>
              <button id="canvasEmptyTemplateButton" class="secondary-button" type="button">Open Templates</button>
            </div>
            <div class="canvas-shortcut-list">
              <span>\`/\` quick insert</span>
              <span>\`Delete\` remove selection</span>
              <span>\`Ctrl/Cmd + D\` duplicate</span>
            </div>
            <div class="canvas-suggestion-grid">
              ${filteredNodes.slice(0, 3).map((node) => `<button class="canvas-suggestion-card" data-canvas-focus-node="${escapeAttr(node.id)}" type="button"><strong>${escape(node.title)}</strong><small>${escape(TYPE_LABELS[node.type] || node.type)}</small></button>`).join("") || "<div class=\"empty-state\">Try a template or start with a feature card.</div>"}
            </div>
          </div>
        </aside>
      `;
    }

    if (selectedNodes.length > 1) {
      return `
        <aside class="canvas-properties premium-surface">
          <div class="canvas-properties-head">
            <div>
              <p class="eyebrow">Multi-select</p>
              <strong>${selectedNodes.length} nodes selected</strong>
            </div>
            <button id="canvasCloseInspectorButton" class="compact-icon-button" type="button">x</button>
          </div>
          <div class="canvas-bulk-grid">
            <button id="canvasAlignLeftButton" class="secondary-button" type="button">Align Left</button>
            <button id="canvasAlignTopButton" class="secondary-button" type="button">Align Top</button>
            <button id="canvasDistributeButton" class="secondary-button" type="button">Distribute</button>
            <button id="canvasTidySelectionButton" class="secondary-button" type="button">Tidy</button>
            <button id="canvasZoomSelectionButton" class="secondary-button" type="button">Zoom To Selection</button>
            <button id="canvasDuplicateSelectionButton" class="secondary-button" type="button">Duplicate</button>
          </div>
          <div class="document-card-actions">
            <button id="canvasLockSelectionButton" class="secondary-button" type="button">Lock / Unlock</button>
            <button id="canvasDeleteSelectionButton" class="secondary-button danger-button" type="button">Delete</button>
          </div>
        </aside>
      `;
    }

    return `
      <aside class="canvas-properties premium-surface">
        <div class="canvas-properties-head">
          <div>
            <p class="eyebrow">Inspector</p>
            <strong>${escape(selected.title)}</strong>
          </div>
          <button id="canvasCloseInspectorButton" class="compact-icon-button" type="button">x</button>
        </div>
        <div class="canvas-tab-row">
          ${["content", "appearance", "links", "actions"].map((tab) => `<button class="canvas-tab-button ${activeTab === tab ? "active" : ""}" data-canvas-tab="${tab}" type="button">${tab}</button>`).join("")}
        </div>
        <div class="canvas-properties-body">
          ${activeTab === "content" ? `
            <label class="profile-field"><span>Title</span><input id="canvasNodeTitleInput" class="modal-input" type="text" value="${escapeAttr(selected.title)}" /></label>
            <label class="profile-field"><span>Body</span><textarea id="canvasNodeBodyInput" class="modal-input canvas-body-editor">${escape(selected.body)}</textarea></label>
            <label class="profile-field"><span>Tags</span><input id="canvasNodeTagsInput" class="modal-input" type="text" value="${escapeAttr((selected.tags || []).join(", "))}" placeholder="combat, economy, onboarding" /></label>
          ` : ""}
          ${activeTab === "appearance" ? `
            <label class="profile-field"><span>Node Type</span><select id="canvasNodeTypeSelect" class="modal-input">${nodeTypeOptions(selected.type)}</select></label>
            <div class="canvas-color-grid">
              ${COLOR_PRESETS.map((color) => `<button class="canvas-color-chip ${selected.color === color ? "active" : ""}" type="button" data-canvas-color="${color}" style="--chip:${color}"></button>`).join("")}
            </div>
            <div class="document-card-actions">
              <button id="canvasNodePinButton" class="secondary-button" type="button">${selected.pinned ? "Unpin" : "Pin"}</button>
              <button id="canvasNodeCollapseButton" class="secondary-button" type="button">${selected.collapsed ? "Expand" : "Collapse"}</button>
              <button id="canvasNodeLockButton" class="secondary-button" type="button">${selected.locked ? "Unlock" : "Lock"}</button>
            </div>
          ` : ""}
          ${activeTab === "links" ? `
            <label class="profile-field"><span>Linked Item</span><input id="canvasNodeLinkTargetInput" class="modal-input" type="text" value="${escapeAttr(selected.linkTarget || "")}" placeholder="Document, board, task, file" /></label>
            <label class="profile-field"><span>Link Type</span><input id="canvasNodeLinkTypeInput" class="modal-input" type="text" value="${escapeAttr(selected.linkType || "")}" placeholder="doc / board / task / file" /></label>
            <div class="canvas-link-hint">Use links to connect planning nodes to docs, boards, tasks, or storage items.</div>
          ` : ""}
          ${activeTab === "actions" ? `
            <div class="canvas-bulk-grid single">
              <button id="canvasNodeDuplicateButton" class="secondary-button" type="button">Duplicate</button>
              <button id="canvasZoomSelectionButton" class="secondary-button" type="button">Zoom To Node</button>
              <button id="canvasInlineEditButton" class="secondary-button" type="button">Inline Rename</button>
              <button id="canvasDeleteSelectionButton" class="secondary-button danger-button" type="button">Delete</button>
            </div>
            <div class="canvas-meta-grid">
              <div><span>Type</span><strong>${escape(TYPE_LABELS[selected.type] || selected.type)}</strong></div>
              <div><span>Size</span><strong>${Math.round(selected.width)} x ${Math.round(selected.height)}</strong></div>
            </div>
          ` : ""}
        </div>
      </aside>
    `;
  }

  function renderNode(node, selectedIds, inlineEditId) {
    const selected = selectedIds.includes(node.id);
    return `
      <article class="canvas-node-card ${selected ? "active" : ""} ${node.locked ? "locked" : ""} ${node.collapsed ? "collapsed" : ""}" data-canvas-node="${escapeAttr(node.id)}" data-node-type="${escapeAttr(node.type)}" style="left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px;--node-color:${escape(node.color)}">
        <header>
          ${inlineEditId === node.id ? `<input class="canvas-node-inline-title" data-canvas-inline-input="${escapeAttr(node.id)}" type="text" value="${escapeAttr(node.title)}" />` : `<strong class="canvas-node-title">${escape(node.title)}</strong>`}
          <span class="canvas-node-type">${escape(TYPE_LABELS[node.type] || node.type)}</span>
        </header>
        ${node.collapsed ? "" : `<p class="canvas-node-body">${escape(node.body)}</p>`}
        <footer>
          <div class="canvas-node-badges">
            ${node.locked ? `<span class="notification-category-badge">Locked</span>` : ""}
            ${node.pinned ? `<span class="notification-category-badge">Pinned</span>` : ""}
            ${(node.tags || []).slice(0, 2).map((tag) => `<span class="notification-category-badge">${escape(tag)}</span>`).join("")}
          </div>
        </footer>
      </article>
    `;
  }

  function renderCanvasWorkspace() {
    if (!els.canvasPanel) return;
    const doc = getActiveDoc();
    if (!doc || doc.docType !== "canvas") return;
    normalizeCanvas(doc);
    const filteredNodes = getFilteredNodes(doc);
    const selected = getPrimarySelectedNode(doc, filteredNodes);
    if (selected && (!doc.canvas.ui.selectedIds || !doc.canvas.ui.selectedIds.length)) {
      setSelection(doc, [selected.id], selected.id);
    }
    const selectedIds = doc.canvas.ui.selectedIds || [];
    const stageClasses = [
      "canvas-workbench",
      doc.canvas.ui.leftPanelOpen ? "left-open" : "left-collapsed",
      doc.canvas.ui.rightPanelOpen ? "right-open" : "right-collapsed",
      doc.canvas.ui.focusMode ? "focus-mode" : "",
      doc.canvas.presentationMode ? "presentation-mode" : "",
    ].filter(Boolean).join(" ");
    els.canvasPanel.innerHTML = `
      <div class="${stageClasses}">
        <aside class="canvas-rail premium-surface">
          <button id="canvasRailInsertButton" class="canvas-rail-button ${doc.canvas.ui.leftPanelOpen && doc.canvas.ui.quickInsertOpen ? "active" : ""}" type="button">+</button>
          <button id="canvasRailTemplateButton" class="canvas-rail-button ${doc.canvas.ui.leftPanelOpen && doc.canvas.ui.templatePickerOpen ? "active" : ""}" type="button">Tpl</button>
          <button id="canvasRailSearchButton" class="canvas-rail-button" type="button">Find</button>
          <button id="canvasRailFocusButton" class="canvas-rail-button ${doc.canvas.ui.focusMode ? "active" : ""}" type="button">Focus</button>
          <button id="canvasRailInspectorButton" class="canvas-rail-button ${doc.canvas.ui.rightPanelOpen ? "active" : ""}" type="button">Edit</button>
        </aside>
        <aside class="canvas-side-drawer premium-surface ${doc.canvas.ui.leftPanelOpen ? "" : "hidden"}">
          <div class="canvas-drawer-head">
            <div>
              <p class="eyebrow">Create</p>
              <strong>${doc.canvas.ui.templatePickerOpen ? "Template Gallery" : "Quick Insert"}</strong>
            </div>
            <button id="canvasCloseLeftPanelButton" class="compact-icon-button" type="button">x</button>
          </div>
          ${doc.canvas.ui.templatePickerOpen ? renderTemplatePicker(doc) : `
            <div class="canvas-drawer-search">
              <input id="canvasInsertSearchInput" class="modal-input" type="search" placeholder="Search node types or workflows" />
            </div>
            <div class="canvas-drawer-section">
              <span class="eyebrow">Favorites</span>
              <div class="canvas-chip-grid">
                ${(doc.canvas.ui.favoriteTypes || []).map((id) => templates.find((template) => template.id === id)).filter(Boolean).map((template) => `<button class="secondary-button" data-canvas-template="${escapeAttr(template.id)}" type="button">${escape(template.name)}</button>`).join("")}
              </div>
            </div>
            <div class="canvas-drawer-section">
              <span class="eyebrow">Recent</span>
              <div class="canvas-chip-grid">
                ${(doc.canvas.ui.recentTypes || []).map((id) => templates.find((template) => template.id === id)).filter(Boolean).map((template) => `<button class="secondary-button" data-canvas-template="${escapeAttr(template.id)}" type="button">${escape(template.name)}</button>`).join("")}
              </div>
            </div>
            <div class="canvas-command-list drawer">
              ${templates.map((template) => `<button class="canvas-command-button" data-canvas-template="${escapeAttr(template.id)}" type="button"><strong>${escape(template.name)}</strong><small>${escape(TYPE_LABELS[template.type] || template.type)}</small></button>`).join("")}
            </div>
          `}
        </aside>
        <section class="canvas-mainstage premium-surface">
          <div class="canvas-topbar">
            <div class="canvas-topbar-left">
              <button id="canvasQuickAddButton" class="primary-button" type="button">Quick Add</button>
              <button id="canvasTemplateButton" class="secondary-button" type="button">Templates</button>
              <label class="workspace-search overlay-search canvas-search-field">
                <span>Search</span>
                <input id="canvasNodeSearchInput" type="search" value="${escapeAttr(doc.canvas.filters.query || "")}" placeholder="Jump to nodes, tags, structures" />
              </label>
            </div>
            <div class="canvas-topbar-right">
              <div class="toolbar-group toolbar-group-tight">
                <button class="secondary-button ${doc.canvas.gridVisible ? "active" : ""}" id="toggleCanvasGridButton" type="button">Grid</button>
                <button class="secondary-button ${doc.canvas.snapToGrid ? "active" : ""}" id="toggleCanvasSnapButton" type="button">Snap</button>
                <button class="secondary-button" id="canvasZoomOutButton" type="button">-</button>
                <button class="secondary-button" id="canvasZoomInButton" type="button">+</button>
                <button class="secondary-button" id="canvasFitViewButton" type="button">Fit</button>
                <button class="secondary-button" id="canvasResetViewButton" type="button">Reset</button>
              </div>
              <div class="canvas-topbar-meta">
                <span id="canvasSaveState" class="state-badge">${doc.canvas.ui.saveState === "saving" ? "Saving..." : "Autosaved"}</span>
                <span id="canvasNodeCount" class="state-badge">${filteredNodes.length} nodes</span>
                <span id="canvasZoomState" class="state-badge">${Math.round((doc.canvas.view.scale || 1) * 100)}% zoom</span>
              </div>
            </div>
          </div>
          <div class="canvas-stage-shell">
            <div class="canvas-stage-toolbar">
              <div class="canvas-stage-title">
                <p class="eyebrow">Visual Planning</p>
                <strong>${escape(doc.name || "Canvas")}</strong>
              </div>
              <div class="canvas-stage-actions">
                ${selectedIds.length > 1 ? `
                  <button id="canvasAlignLeftButton" class="secondary-button" type="button">Align</button>
                  <button id="canvasDistributeButton" class="secondary-button" type="button">Distribute</button>
                  <button id="canvasTidySelectionButton" class="secondary-button" type="button">Tidy</button>
                ` : ""}
                <button id="canvasZoomSelectionButton" class="secondary-button" type="button">${selectedIds.length > 1 ? "Zoom Selection" : "Zoom Node"}</button>
                <button id="canvasPresentationButton" class="secondary-button ${doc.canvas.presentationMode ? "active" : ""}" type="button">${doc.canvas.presentationMode ? "Exit Present" : "Present"}</button>
              </div>
            </div>
            <div id="canvasStage" class="canvas-stage ${doc.canvas.gridVisible ? "with-grid" : ""} ${doc.canvas.presentationMode ? "presentation" : ""}" tabindex="0">
              ${!filteredNodes.length ? `
                <div class="canvas-empty-state">
                  <div>
                    <p class="eyebrow">Start Planning</p>
                    <h2>Build systems, roadmaps, flows, and dependencies with room to think.</h2>
                    <p>Use a quick insert, start from a template, or double click anywhere on the stage.</p>
                  </div>
                  <div class="canvas-empty-actions">
                    <button id="canvasEmptyInsertButton" class="primary-button" type="button">Add First Node</button>
                    <button id="canvasEmptyTemplateButton" class="secondary-button" type="button">Browse Templates</button>
                  </div>
                </div>
              ` : ""}
              <div id="canvasViewport" class="canvas-viewport" style="transform: translate3d(${doc.canvas.view.x}px, ${doc.canvas.view.y}px, 0) scale(${doc.canvas.view.scale});">
                ${filteredNodes.map((node) => renderNode(node, selectedIds, doc.canvas.ui.inlineEditNodeId)).join("")}
              </div>
              <button id="canvasFloatingInsertButton" class="canvas-floating-add" type="button">+</button>
              ${renderQuickInsert(doc)}
            </div>
          </div>
        </section>
        ${renderPropertiesPanel(doc, selected, filteredNodes)}
      </div>
    `;

    bindControls(doc, selected);
    updateStatusReadout(doc);
  }

  function bindControls(doc, selected) {
    document.querySelectorAll("[data-canvas-template]").forEach((button) => button.addEventListener("click", () => addCanvasNode(button.dataset.canvasTemplate, doc.canvas.ui.quickInsertAnchor)));
    document.querySelectorAll("[data-canvas-layout]").forEach((button) => button.addEventListener("click", () => applyCanvasPreset(button.dataset.canvasLayout)));
    document.querySelectorAll("[data-canvas-node]").forEach((node) => bindCanvasNode(node));
    document.querySelectorAll("[data-canvas-tab]").forEach((button) => button.addEventListener("click", () => {
      doc.canvas.ui.propertiesTab = button.dataset.canvasTab || "content";
      renderCanvasWorkspace();
    }));
    document.querySelectorAll("[data-canvas-color]").forEach((button) => button.addEventListener("click", () => {
      if (!selected) return;
      selected.color = button.dataset.canvasColor;
      updateNodeElement(selected);
      markDirty();
      scheduleRender();
    }));
    document.querySelectorAll("[data-canvas-focus-node]").forEach((button) => button.addEventListener("click", () => {
      const node = doc.canvas.nodes.find((entry) => entry.id === button.dataset.canvasFocusNode);
      if (!node) return;
      setSelection(doc, [node.id], node.id);
      renderCanvasWorkspace();
    }));

    bindAction("#canvasRailInsertButton", () => openQuickInsert(doc));
    bindAction("#canvasRailTemplateButton", () => openTemplatePicker(doc));
    bindAction("#canvasRailSearchButton", () => document.querySelector("#canvasNodeSearchInput")?.focus());
    bindAction("#canvasRailFocusButton", () => { doc.canvas.ui.focusMode = !doc.canvas.ui.focusMode; renderCanvasWorkspace(); });
    bindAction("#canvasRailInspectorButton", () => { doc.canvas.ui.rightPanelOpen = !doc.canvas.ui.rightPanelOpen; renderCanvasWorkspace(); });
    bindAction("#canvasCloseLeftPanelButton", () => { doc.canvas.ui.leftPanelOpen = false; closeCanvasPopovers(doc); renderCanvasWorkspace(); });
    bindAction("#canvasCloseInspectorButton", () => { doc.canvas.ui.rightPanelOpen = false; renderCanvasWorkspace(); });
    bindAction("#canvasTemplateButton", () => openTemplatePicker(doc));
    bindAction("#canvasQuickAddButton", () => openQuickInsert(doc));
    bindAction("#canvasFloatingInsertButton", () => openQuickInsert(doc, { x: 28, y: 28 }));
    bindAction("#canvasCloseQuickInsertButton", () => { doc.canvas.ui.quickInsertOpen = false; renderCanvasWorkspace(); });
    bindAction("#canvasCloseTemplatePickerButton", () => { doc.canvas.ui.templatePickerOpen = false; renderCanvasWorkspace(); });
    bindAction("#toggleCanvasGridButton", () => { doc.canvas.gridVisible = !doc.canvas.gridVisible; save(); renderCanvasWorkspace(); });
    bindAction("#toggleCanvasSnapButton", () => { doc.canvas.snapToGrid = !doc.canvas.snapToGrid; save(); renderCanvasWorkspace(); });
    bindAction("#canvasZoomOutButton", () => { doc.canvas.view.scale = clampNumber(doc.canvas.view.scale - 0.1, 0.45, 1.8); updateViewportTransform(doc); markDirty(); scheduleRender(); });
    bindAction("#canvasZoomInButton", () => { doc.canvas.view.scale = clampNumber(doc.canvas.view.scale + 0.1, 0.45, 1.8); updateViewportTransform(doc); markDirty(); scheduleRender(); });
    bindAction("#canvasResetViewButton", () => { doc.canvas.view = { x: 0, y: 0, scale: 1 }; save(); renderCanvasWorkspace(); });
    bindAction("#canvasPresentationButton", () => { doc.canvas.presentationMode = !doc.canvas.presentationMode; renderCanvasWorkspace(); });
    bindAction("#canvasFitViewButton", () => fitCanvasView(doc));
    bindAction("#canvasZoomSelectionButton", () => zoomToSelection(doc));
    bindAction("#canvasAlignLeftButton", () => alignSelection(doc, "left"));
    bindAction("#canvasAlignTopButton", () => alignSelection(doc, "top"));
    bindAction("#canvasDistributeButton", () => distributeSelection(doc));
    bindAction("#canvasTidySelectionButton", () => tidySelection(doc));
    bindAction("#canvasDuplicateSelectionButton", () => duplicateSelection(doc));
    bindAction("#canvasNodeDuplicateButton", () => duplicateSelection(doc));
    bindAction("#canvasDeleteSelectionButton", () => deleteSelection(doc));
    bindAction("#canvasNodeCollapseButton", () => toggleNodeFlag(doc, "collapsed"));
    bindAction("#canvasNodeLockButton", () => toggleNodeFlag(doc, "locked"));
    bindAction("#canvasLockSelectionButton", () => toggleNodeFlag(doc, "locked"));
    bindAction("#canvasNodePinButton", () => toggleNodeFlag(doc, "pinned"));
    bindAction("#canvasInlineEditButton", () => {
      if (!selected) return;
      doc.canvas.ui.inlineEditNodeId = selected.id;
      renderCanvasWorkspace();
      document.querySelector(`[data-canvas-inline-input="${selected.id}"]`)?.focus();
    });
    bindAction("#canvasEmptyQuickAddButton", () => openQuickInsert(doc));
    bindAction("#canvasEmptyInsertButton", () => openQuickInsert(doc));
    bindAction("#canvasEmptyTemplateButton", () => openTemplatePicker(doc));

    document.querySelector("#canvasNodeSearchInput")?.addEventListener("input", (event) => {
      doc.canvas.filters.query = event.target.value || "";
      markDirty();
      scheduleRender();
    });
    document.querySelector("#canvasInsertSearchInput")?.addEventListener("input", (event) => {
      const query = (event.target.value || "").trim().toLowerCase();
      document.querySelectorAll(".canvas-command-button").forEach((button) => {
        button.classList.toggle("hidden", !button.textContent.toLowerCase().includes(query));
      });
    });
    document.querySelector("#canvasNodeTitleInput")?.addEventListener("input", (event) => {
      if (!selected) return;
      selected.title = event.target.value || "";
      updateNodeElement(selected);
      markDirty();
    });
    document.querySelector("#canvasNodeBodyInput")?.addEventListener("input", (event) => {
      if (!selected) return;
      selected.body = event.target.value || "";
      updateNodeElement(selected);
      markDirty();
    });
    document.querySelector("#canvasNodeTagsInput")?.addEventListener("input", (event) => {
      if (!selected) return;
      selected.tags = (event.target.value || "").split(",").map((item) => item.trim()).filter(Boolean);
      markDirty();
    });
    document.querySelector("#canvasNodeTypeSelect")?.addEventListener("change", (event) => {
      if (!selected) return;
      selected.type = event.target.value || selected.type;
      markDirty();
      scheduleRender();
    });
    document.querySelector("#canvasNodeLinkTargetInput")?.addEventListener("input", (event) => {
      if (!selected) return;
      selected.linkTarget = event.target.value || "";
      markDirty();
    });
    document.querySelector("#canvasNodeLinkTypeInput")?.addEventListener("input", (event) => {
      if (!selected) return;
      selected.linkType = event.target.value || "";
      markDirty();
    });
    document.querySelectorAll("[data-canvas-inline-input]").forEach((input) => {
      input.addEventListener("input", (event) => {
        const node = doc.canvas.nodes.find((entry) => entry.id === event.target.dataset.canvasInlineInput);
        if (!node) return;
        node.title = event.target.value || "";
        updateNodeElement(node);
        markDirty();
      });
      input.addEventListener("blur", (event) => {
        const node = doc.canvas.nodes.find((entry) => entry.id === event.target.dataset.canvasInlineInput);
        if (node && !node.title.trim()) node.title = TYPE_LABELS[node.type] || "Untitled Node";
        doc.canvas.ui.inlineEditNodeId = null;
        scheduleRender();
      });
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        event.currentTarget.blur();
      });
    });

    const stage = document.querySelector("#canvasStage");
    stage?.addEventListener("pointerdown", (event) => {
      if (event.target.closest("[data-canvas-node], .canvas-popover")) return;
      closeContextMenu();
      setSelection(doc, [], null);
      if (!doc.canvas.ui.focusMode) doc.canvas.ui.inlineEditNodeId = null;
      panState = { startX: event.clientX, startY: event.clientY, x: doc.canvas.view.x, y: doc.canvas.view.y };
      scheduleRender();
    });
    stage?.addEventListener("dblclick", (event) => {
      if (event.target.closest("[data-canvas-node]")) return;
      const bounds = stage.getBoundingClientRect();
      const scale = Math.max(doc.canvas.view.scale || 1, 0.45);
      addCanvasNode("text", {
        x: (event.clientX - bounds.left - doc.canvas.view.x) / scale,
        y: (event.clientY - bounds.top - doc.canvas.view.y) / scale,
      });
    });
    stage?.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      openCanvasStageMenu(doc, event.clientX, event.clientY);
    });
    stage?.addEventListener("wheel", (event) => {
      event.preventDefault();
      doc.canvas.view.scale = clampNumber(doc.canvas.view.scale + (event.deltaY < 0 ? 0.08 : -0.08), 0.45, 1.8);
      updateViewportTransform(doc);
      markDirty();
      scheduleRender();
    }, { passive: false });
  }

  function bindAction(selector, action) {
    const node = document.querySelector(selector);
    if (node) node.addEventListener("click", action);
  }

  function bindCanvasNode(nodeElement) {
    const doc = getActiveDoc();
    if (!doc || doc.docType !== "canvas") return;
    const node = doc.canvas.nodes.find((entry) => entry.id === nodeElement.dataset.canvasNode);
    if (!node) return;
    nodeElement.addEventListener("click", (event) => {
      const additive = event.metaKey || event.ctrlKey || event.shiftKey;
      if (additive) {
        const selectedIds = new Set(doc.canvas.ui.selectedIds || []);
        if (selectedIds.has(node.id)) selectedIds.delete(node.id);
        else selectedIds.add(node.id);
        setSelection(doc, [...selectedIds], node.id);
      } else {
        setSelection(doc, [node.id], node.id);
      }
      doc.canvas.ui.rightPanelOpen = true;
      renderCanvasWorkspace();
    });
    nodeElement.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      doc.canvas.ui.inlineEditNodeId = node.id;
      renderCanvasWorkspace();
      document.querySelector(`[data-canvas-inline-input="${node.id}"]`)?.focus();
    });
    nodeElement.addEventListener("pointerdown", (event) => {
      if (node.locked || event.target.closest("input, textarea, button")) return;
      event.stopPropagation();
      if (!doc.canvas.ui.selectedIds.includes(node.id)) setSelection(doc, [node.id], node.id);
      dragState = {
        ids: [...(doc.canvas.ui.selectedIds || [node.id])],
        startX: event.clientX,
        startY: event.clientY,
        positions: doc.canvas.nodes
          .filter((entry) => (doc.canvas.ui.selectedIds || [node.id]).includes(entry.id))
          .map((entry) => ({ id: entry.id, x: entry.x, y: entry.y })),
      };
    });
  }

  function handleGlobalPointerMove(event) {
    const doc = getActiveDoc();
    if (!doc || doc.docType !== "canvas") return false;
    if (dragState) {
      const scale = Math.max(doc.canvas.view.scale || 1, 0.45);
      const grid = Number(getState().settings.canvas?.gridSize || 24);
      dragState.positions.forEach((origin) => {
        const node = doc.canvas.nodes.find((entry) => entry.id === origin.id);
        if (!node) return;
        const nextX = origin.x + (event.clientX - dragState.startX) / scale;
        const nextY = origin.y + (event.clientY - dragState.startY) / scale;
        node.x = doc.canvas.snapToGrid ? Math.round(nextX / grid) * grid : nextX;
        node.y = doc.canvas.snapToGrid ? Math.round(nextY / grid) * grid : nextY;
        updateNodeElement(node);
      });
      markDirty();
      return true;
    }
    if (panState) {
      doc.canvas.view.x = panState.x + (event.clientX - panState.startX);
      doc.canvas.view.y = panState.y + (event.clientY - panState.startY);
      updateViewportTransform(doc);
      markDirty();
      return true;
    }
    return false;
  }

  function handleGlobalPointerUp() {
    if (!dragState && !panState) return false;
    dragState = null;
    panState = null;
    scheduleRender();
    save();
    return true;
  }

  function handleGlobalKeydown(event) {
    const doc = getActiveDoc();
    if (!doc || doc.docType !== "canvas") return false;
    if (document.activeElement?.matches("input, textarea, [contenteditable='true']")) return false;
    const meta = event.ctrlKey || event.metaKey;
    if (event.key === "/") {
      event.preventDefault();
      openQuickInsert(doc);
      return true;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      deleteSelection(doc);
      return true;
    }
    if (meta && event.key.toLowerCase() === "d") {
      event.preventDefault();
      duplicateSelection(doc);
      return true;
    }
    if (meta && event.key === "0") {
      event.preventDefault();
      fitCanvasView(doc);
      return true;
    }
    if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      document.querySelector("#canvasNodeSearchInput")?.focus();
      return true;
    }
    return false;
  }

  return {
    normalizeCanvas,
    canvasNodeFactory,
    addCanvasNode,
    applyCanvasPreset,
    renderCanvasWorkspace,
    bindCanvasNode,
    handleGlobalPointerMove,
    handleGlobalPointerUp,
    handleGlobalKeydown,
  };
}
