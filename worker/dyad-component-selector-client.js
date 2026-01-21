(() => {
  const OVERLAY_ID = "__dyad_overlay__";
  let overlay, label;

  // The possible states are:
  // { type: 'inactive' }
  // { type: 'inspecting', element: ?HTMLElement }
  // { type: 'selected', element: HTMLElement }
  let state = { type: "inactive" };

  /* ---------- helpers --------------------------------------------------- */
  const css = (el, obj) => Object.assign(el.style, obj);

  function makeOverlay() {
    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    css(overlay, {
      position: "absolute",
      border: "2px solid #7f22fe",
      background: "rgba(0,170,255,.05)",
      pointerEvents: "none",
      zIndex: "2147483647", // max
      borderRadius: "4px",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
    });

    label = document.createElement("div");
    css(label, {
      position: "absolute",
      left: "0",
      top: "100%",
      transform: "translateY(4px)",
      background: "#7f22fe",
      color: "#fff",
      fontFamily: "monospace",
      fontSize: "12px",
      lineHeight: "1.2",
      padding: "3px 5px",
      whiteSpace: "nowrap",
      borderRadius: "4px",
      boxShadow: "0 1px 4px rgba(0, 0, 0, 0.1)",
    });
    overlay.appendChild(label);
    document.body.appendChild(overlay);
  }

  function updateOverlay(el, isSelected = false) {
    if (!overlay) makeOverlay();

    const rect = el.getBoundingClientRect();
    css(overlay, {
      top: `${rect.top + window.scrollY}px`,
      left: `${rect.left + window.scrollX}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      display: "block",
      border: isSelected ? "3px solid #7f22fe" : "2px solid #7f22fe",
      background: isSelected
        ? "rgba(127, 34, 254, 0.05)"
        : "rgba(0,170,255,.05)",
    });

    css(label, {
      background: "#7f22fe",
    });

    // Clear previous contents
    while (label.firstChild) {
      label.removeChild(label.firstChild);
    }

    if (isSelected) {
      const editLine = document.createElement("div");
      editLine.style.cursor = "pointer";
      editLine.style.padding = "4px 8px";
      editLine.style.borderRadius = "4px";
      editLine.style.transition = "background-color 0.2s";
      
      // Add hover effect
      editLine.addEventListener("mouseenter", () => {
        editLine.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
      });
      editLine.addEventListener("mouseleave", () => {
        editLine.style.backgroundColor = "transparent";
      });
      
      // Make it clickable - send message to parent to focus chat input
      editLine.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Send message to parent to focus chat input with selected component
        window.parent.postMessage(
          {
            type: "dyad-edit-with-ai-clicked",
            id: el.dataset.dyadId,
            name: el.dataset.dyadName,
          },
          "*",
        );
      });

      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("width", "12");
      svg.setAttribute("height", "12");
      svg.setAttribute("viewBox", "0 0 16 16");
      svg.setAttribute("fill", "none");
      Object.assign(svg.style, {
        display: "inline-block",
        verticalAlign: "-2px",
        marginRight: "4px",
      });
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute(
        "d",
        "M8 0L9.48528 6.51472L16 8L9.48528 9.48528L8 16L6.51472 9.48528L0 8L6.51472 6.51472L8 0Z",
      );
      path.setAttribute("fill", "white");
      svg.appendChild(path);

      editLine.appendChild(svg);
      editLine.appendChild(document.createTextNode("Edit with AI"));
      label.appendChild(editLine);
    }

    const name = el.dataset.dyadName || "<unknown>";
    const file = (el.dataset.dyadId || "").split(":")[0];

    const nameEl = document.createElement("div");
    nameEl.textContent = name;
    label.appendChild(nameEl);

    if (file) {
      const fileEl = document.createElement("span");
      css(fileEl, { fontSize: "10px", opacity: ".8" });
      fileEl.textContent = file;
      label.appendChild(fileEl);
    }
  }

  /* ---------- event handlers -------------------------------------------- */
  function onMouseMove(e) {
    if (state.type !== "inspecting") return;

    let el = e.target;
    while (el && !el.dataset.dyadId) el = el.parentElement;

    if (state.element === el) return;
    state.element = el;

    if (el) {
      updateOverlay(el, false);
    } else {
      if (overlay) overlay.style.display = "none";
    }
  }

  function onClick(e) {
    if (state.type !== "inspecting" || !state.element) return;
    e.preventDefault();
    e.stopPropagation();

    state = { type: "selected", element: state.element };
    updateOverlay(state.element, true);

    window.parent.postMessage(
      {
        type: "dyad-component-selected",
        id: state.element.dataset.dyadId,
        name: state.element.dataset.dyadName,
      },
      "*",
    );
  }

  /* ---------- activation / deactivation --------------------------------- */
  function activate() {
    if (state.type === "inactive") {
      window.addEventListener("mousemove", onMouseMove, true);
      window.addEventListener("click", onClick, true);
    }
    state = { type: "inspecting", element: null };
    if (overlay) {
      overlay.style.display = "none";
    }
  }

  function deactivate() {
    if (state.type === "inactive") return;

    window.removeEventListener("mousemove", onMouseMove, true);
    window.removeEventListener("click", onClick, true);
    if (overlay) {
      overlay.remove();
      overlay = null;
      label = null;
    }
    state = { type: "inactive" };
  }

  // Helper to convert RGB/RGBA to hex
  function rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent' || rgb === 'none' || rgb === 'rgba(0, 0, 0, 0)' || rgb === 'initial' || rgb === 'inherit') {
      return '';
    }
    // If already hex, return as is (handle both 3 and 6 digit hex)
    if (rgb.startsWith('#')) {
      // Normalize 3-digit hex to 6-digit
      if (rgb.length === 4) {
        const r = rgb[1];
        const g = rgb[2];
        const b = rgb[3];
        return '#' + r + r + g + g + b + b;
      }
      return rgb.length === 7 ? rgb : '';
    }
    // Convert rgb/rgba to hex
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return '#' + r + g + b;
    }
    // Return empty string for unrecognized formats
    return '';
  }

  /* ---------- message bridge -------------------------------------------- */
  window.addEventListener("message", (e) => {
    if (e.source !== window.parent) return;
    if (e.data.type === "activate-dyad-component-selector") activate();
    if (e.data.type === "deactivate-dyad-component-selector") deactivate();
    
    // Handle element style requests
    if (e.data.type === "visual-editing-request-element-data" || 
        e.data.type === "request-element-styles") {
      const elementId = e.data.elementId;
      if (!elementId) return;
      
      // Find element by data-dyad-id
      let element = null;
      const allElements = document.querySelectorAll('[data-dyad-id]');
      for (let i = 0; i < allElements.length; i++) {
        const dyadId = allElements[i].getAttribute('data-dyad-id');
        if (dyadId === elementId || dyadId?.replace(/\\/g, '/') === elementId.replace(/\\/g, '/')) {
          element = allElements[i];
          break;
        }
      }
      
      if (element) {
        // Try to get inline styles first (actual set values), then fall back to computed
        const inlineStyle = element.style;
        const computedStyle = window.getComputedStyle(element);
        
        // Get background color (convert to hex if needed)
        // Always use computed style for background color to get the actual rendered color
        let bgColor = computedStyle.backgroundColor || '';
        // Convert to hex - handle all color formats
        if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'initial' && bgColor !== 'inherit') {
          bgColor = rgbToHex(bgColor);
          // If conversion failed, fallback to original computed value
          if (!bgColor) {
            bgColor = computedStyle.backgroundColor;
          }
        } else {
          bgColor = ''; // Empty string for transparent/no background
        }
        
        // Get text color (convert to hex if needed)
        let textColor = inlineStyle.color || computedStyle.color;
        textColor = rgbToHex(textColor);
        
        // Get border color (convert to hex if needed)
        let borderColor = inlineStyle.borderColor || computedStyle.borderColor;
        borderColor = rgbToHex(borderColor);
        
        const styles = {
          width: inlineStyle.width || computedStyle.width || '',
          height: inlineStyle.height || computedStyle.height || '',
          display: inlineStyle.display || computedStyle.display || '',
          position: inlineStyle.position || computedStyle.position || '',
          flexDirection: inlineStyle.flexDirection || computedStyle.flexDirection || '',
          justifyContent: inlineStyle.justifyContent || computedStyle.justifyContent || '',
          alignItems: inlineStyle.alignItems || computedStyle.alignItems || '',
          marginTop: inlineStyle.marginTop || computedStyle.marginTop || '',
          marginRight: inlineStyle.marginRight || computedStyle.marginRight || '',
          marginBottom: inlineStyle.marginBottom || computedStyle.marginBottom || '',
          marginLeft: inlineStyle.marginLeft || computedStyle.marginLeft || '',
          paddingTop: inlineStyle.paddingTop || computedStyle.paddingTop || '',
          paddingRight: inlineStyle.paddingRight || computedStyle.paddingRight || '',
          paddingBottom: inlineStyle.paddingBottom || computedStyle.paddingBottom || '',
          paddingLeft: inlineStyle.paddingLeft || computedStyle.paddingLeft || '',
          borderWidth: inlineStyle.borderWidth || computedStyle.borderWidth || '',
          borderRadius: inlineStyle.borderRadius || computedStyle.borderRadius || '',
          borderColor: borderColor || '',
          backgroundColor: bgColor || '',
          opacity: inlineStyle.opacity || computedStyle.opacity || '',
          boxShadow: inlineStyle.boxShadow || (computedStyle.boxShadow !== 'none' ? computedStyle.boxShadow : '') || '',
          zIndex: inlineStyle.zIndex || (computedStyle.zIndex !== 'auto' ? computedStyle.zIndex : '') || '',
          fontSize: inlineStyle.fontSize || computedStyle.fontSize || '',
          fontWeight: inlineStyle.fontWeight || computedStyle.fontWeight || '',
          color: textColor || '',
          textAlign: inlineStyle.textAlign || computedStyle.textAlign || '',
        };
        
        // Get file/line info from data-dyad-id
        const dyadId = element.getAttribute('data-dyad-id');
        let filePath = null;
        let lineNumber = null;
        let columnNumber = null;
        if (dyadId) {
          const parts = dyadId.split(':');
          if (parts.length >= 3) {
            const columnStr = parts.pop();
            const lineStr = parts.pop();
            filePath = parts.join(':');
            lineNumber = parseInt(lineStr, 10);
            columnNumber = parseInt(columnStr, 10);
          }
        }
        
        // Get text content
        let textContent = '';
        if (element.childNodes.length > 0) {
          const textNodes = Array.from(element.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent?.trim())
            .filter(text => text && text.length > 0);
          textContent = textNodes.join(' ') || '';
        }
        
        window.parent.postMessage({
          type: 'visual-editing-element-data-response',
          elementId: elementId,
          element: {
            tagName: element.tagName.toLowerCase(),
            className: element.className || '',
            id: element.id || '',
            selector: '[data-dyad-id="' + elementId + '"]',
            styles: styles,
            file: filePath || undefined,
            line: lineNumber || undefined,
            column: columnNumber || undefined,
            textContent: textContent || undefined,
          }
        }, '*');
      }
    }
  });

  function initializeComponentSelector() {
    if (!document.body) {
      console.error(
        "Dyad component selector initialization failed: document.body not found.",
      );
      return;
    }
    setTimeout(() => {
      if (document.body.querySelector("[data-dyad-id]")) {
        window.parent.postMessage(
          {
            type: "dyad-component-selector-initialized",
          },
          "*",
        );
        console.debug("Dyad component selector initialized");
      } else {
        console.warn(
          "Dyad component selector not initialized because no DOM elements were tagged",
        );
      }
    }, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeComponentSelector);
  } else {
    initializeComponentSelector();
  }
})();
