(function() {

// ── Default SVG ──────────────────────────────────────────

var DEFAULT_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg"\n' +
  '     width="400" height="300"\n' +
  '     viewBox="0 0 400 300">\n' +
  '  <rect width="400" height="300" fill="#f5f5f5" rx="8" />\n' +
  '  <circle cx="200" cy="120" r="50" fill="#61afef" opacity="0.8" />\n' +
  '  <rect x="100" y="190" width="200" height="40" rx="6" fill="#e06c75" opacity="0.8" />\n' +
  '  <text x="200" y="270"\n' +
  '        text-anchor="middle"\n' +
  '        font-family="sans-serif"\n' +
  '        font-size="14"\n' +
  '        fill="#888">\n' +
  '    Drop images here or edit SVG code\n' +
  '  </text>\n' +
  '</svg>';

// ── DOM refs ─────────────────────────────────────────────

var previewEl = document.getElementById("preview");
var previewPane = document.getElementById("preview-pane");
var dropOverlay = document.getElementById("drop-overlay");
var divider = document.getElementById("divider");
var editorPane = document.getElementById("editor-pane");
var btnExportPng = document.getElementById("btn-export-png");
var btnSaveSvg = document.getElementById("btn-save-svg");
var btnCopySvg = document.getElementById("btn-copy-svg");
var btnCopyPng = document.getElementById("btn-copy-png");
var exportCanvas = document.getElementById("export-canvas");
var coordDisplay = document.getElementById("coord-display");

// ── CodeMirror 5 setup ──────────────────────────────────

var editor = CodeMirror.fromTextArea(document.getElementById("editor-textarea"), {
  mode: "xml",
  theme: "material-darker",
  inputStyle: "textarea",
  lineNumbers: true,
  lineWrapping: true,
  autoCloseTags: true,
  foldGutter: true,
  gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
  tabSize: 2,
  indentWithTabs: false,
  hintOptions: {
    schemaInfo: window.svgSchema,
    completeSingle: false,
  },
  extraKeys: {
    "Ctrl-Space": "autocomplete",
    "Ctrl-S": function (cm) { saveSvg(); },
    "Cmd-S": function (cm) { saveSvg(); },
  },
});

var STORAGE_KEY = "usvg-document";

var imageCounter = 0;

// Restore from appStorage or use default
var savedSvg = localStorage.getItem(STORAGE_KEY);
editor.setValue(savedSvg || DEFAULT_SVG);

// Auto-fold image assets on load
setTimeout(function () { foldImageAssets(); }, 0);

// Count existing image IDs so new ones don't collide
var existingIds = (savedSvg || "").match(/\bid="img-(\d+)"/g);
if (existingIds) {
  existingIds.forEach(function (m) {
    var n = parseInt(m.match(/\d+/)[0], 10);
    if (n > imageCounter) imageCounter = n;
  });
}

// Auto-trigger completion when typing inside tags
editor.on("inputRead", function (cm, change) {
  if (change.origin !== "+input") return;

  var cur = cm.getCursor();
  var line = cm.getLine(cur.line);
  var upToCursor = line.slice(0, cur.ch);

  // Check if we're typing a url(#...) reference
  var urlHashMatch = upToCursor.match(/url\(#([a-zA-Z0-9_-]*)$/);
  if (urlHashMatch) {
    cm.showHint({
      hint: urlIdHint,
      completeSingle: false,
    });
    return;
  }

  // Check if we're typing an href="#..." reference
  var hrefHashMatch = upToCursor.match(/href="#([a-zA-Z0-9_-]*)$/);
  if (hrefHashMatch) {
    cm.showHint({
      hint: urlIdHint,
      completeSingle: false,
    });
    return;
  }

  // Standard XML/SVG completion for tags and attributes
  var token = cm.getTokenAt(cur);
  var text = change.text && change.text[0];

  // Only trigger on meaningful input: "<" starts a tag, or we're mid-token
  if (token.string === "<" ||
      (token.type === "tag" && text && /[a-zA-Z]/.test(text)) ||
      (token.type === "attribute" && text && /[a-zA-Z-]/.test(text))) {
    CodeMirror.commands.autocomplete(cm, null, { completeSingle: false });
  }
});

// ── url(#...) and href="#..." ID completion ──────────────

function collectIds(source) {
  var ids = [];
  var re = /\bid="([^"]+)"/g;
  var match;
  while ((match = re.exec(source)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

function urlIdHint(cm) {
  var cur = cm.getCursor();
  var line = cm.getLine(cur.line);
  var upToCursor = line.slice(0, cur.ch);

  // Find the start of the ID being typed (after # in url(# or href="#)
  var hashIndex = upToCursor.lastIndexOf("#");
  if (hashIndex === -1) return;

  var prefix = upToCursor.slice(hashIndex + 1);
  var from = CodeMirror.Pos(cur.line, hashIndex + 1);

  var ids = collectIds(cm.getValue());
  var list = ids.filter(function (id) {
    return id.indexOf(prefix) === 0 || prefix === "";
  });

  // Deduplicate
  list = list.filter(function (v, i, a) { return a.indexOf(v) === i; });

  return {
    list: list,
    from: from,
    to: cur,
  };
}

// ── New document ─────────────────────────────────────────

document.getElementById("btn-new").addEventListener("click", function () {
  if (confirm("Start a new document? Current work is saved in the browser.")) {
    imageCounter = 0;
    editor.setValue(DEFAULT_SVG);
    localStorage.setItem(STORAGE_KEY, DEFAULT_SVG);
  }
});

// ── Save SVG ─────────────────────────────────────────────

btnSaveSvg.addEventListener("click", saveSvg);

function saveSvg() {
  var svgSource = editor.getValue();
  var blob = new Blob([svgSource], { type: "image/svg+xml;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.download = "drawing.svg";
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Live preview on change
var saveTimer = null;
var cleanupTimer = null;
var isCleaningUp = false;

editor.on("change", function () {
  // Skip preview rebuild while dragging — we manipulate the DOM directly
  if (!overlayDragMode) {
    renderPreview(editor.getValue());
  }

  // Debounced auto-save to appStorage (500ms)
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function () {
    localStorage.setItem(STORAGE_KEY, editor.getValue());
  }, 500);

  // Debounced cleanup of unused image assets (1s)
  if (!isCleaningUp) {
    clearTimeout(cleanupTimer);
    cleanupTimer = setTimeout(function () {
      cleanupUnusedAssets();
    }, 1000);
  }
});

// ── SVG preview rendering ────────────────────────────────

function renderPreview(svgSource) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(svgSource, "image/svg+xml");
  var parseError = doc.querySelector("parsererror");

  if (parseError) {
    previewEl.innerHTML =
      '<div class="svg-error">SVG Parse Error:\n' +
      parseError.textContent +
      "</div>";
    return;
  }

  var svgEl = doc.documentElement;
  if (svgEl.tagName.toLowerCase() !== "svg") {
    previewEl.innerHTML =
      '<div class="svg-error">Root element is not &lt;svg&gt;</div>';
    return;
  }

  previewEl.innerHTML = "";
  var imported = document.importNode(svgEl, true);
  previewEl.appendChild(imported);
}

// Initial render
renderPreview(DEFAULT_SVG);

// ── Resizable divider ────────────────────────────────────

var isDragging = false;

divider.addEventListener("mousedown", function (e) {
  isDragging = true;
  divider.classList.add("active");
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  e.preventDefault();
});

document.addEventListener("mousemove", function (e) {
  if (!isDragging) return;
  var containerRect = document.getElementById("main").getBoundingClientRect();
  var newWidth = e.clientX - containerRect.left;
  var minWidth = 200;
  var maxWidth = containerRect.width - 200 - 6;
  var clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
  editorPane.style.width = clampedWidth + "px";
  editorPane.style.flex = "none";
  // Refresh CodeMirror after resize so it reflows correctly
  editor.refresh();
});

document.addEventListener("mouseup", function () {
  if (isDragging) {
    isDragging = false;
    divider.classList.remove("active");
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    editor.refresh();
    // Reposition element overlay after pane resize
    if (typeof updateOverlay === "function") {
      setTimeout(updateOverlay, 50);
    }
  }
});

// ── Cursor coordinate display ────────────────────────────

previewPane.addEventListener("mousemove", function (e) {
  var svgEl = previewEl.querySelector("svg");
  if (!svgEl) {
    coordDisplay.textContent = "";
    return;
  }
  var pt = svgEl.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  var svgPt = pt.matrixTransform(svgEl.getScreenCTM().inverse());
  coordDisplay.textContent = Math.round(svgPt.x) + ", " + Math.round(svgPt.y);
});

previewPane.addEventListener("mouseleave", function () {
  coordDisplay.textContent = "";
});

// ── Drag and drop images ─────────────────────────────────

var dragCounter = 0;

previewPane.addEventListener("dragenter", function (e) {
  e.preventDefault();
  dragCounter++;
  dropOverlay.classList.add("visible");
});

previewPane.addEventListener("dragleave", function (e) {
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    dropOverlay.classList.remove("visible");
  }
});

previewPane.addEventListener("dragover", function (e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
});

previewPane.addEventListener("drop", function (e) {
  e.preventDefault();
  dragCounter = 0;
  dropOverlay.classList.remove("visible");

  var files = Array.from(e.dataTransfer.files).filter(function (f) {
    return f.type.startsWith("image/");
  });

  if (files.length === 0) return;

  files.forEach(function (file) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      var dataUri = ev.target.result;
      var img = new Image();
      img.onload = function () {
        insertImageIntoSvg(dataUri, img.naturalWidth, img.naturalHeight);
      };
      img.src = dataUri;
    };
    reader.readAsDataURL(file);
  });
});

function insertImageIntoSvg(dataUri, width, height) {
  var currentSource = editor.getValue();
  imageCounter++;
  var imgId = "img-" + imageCounter;

  // The <image> definition goes in <defs> > <g id="image-assets">
  var imageDef =
    '      <image id="' + imgId + '"\n' +
    '             href="' + dataUri + '"\n' +
    '             width="' + width + '" height="' + height + '" />';
  var useTag = '  <use href="#' + imgId + '" x="0" y="0" width="' + width + '" height="' + height + '" />';

  var newSource;

  // Check if <g id="image-assets"> already exists inside <defs>
  var assetsMatch = currentSource.match(/<g\s[^>]*id="image-assets"[^>]*>/);
  var assetsCloseIndex = assetsMatch ? currentSource.indexOf("</g>", assetsMatch.index) : -1;

  if (assetsMatch && assetsCloseIndex !== -1) {
    // Append new image inside existing <g id="image-assets">
    newSource =
      currentSource.slice(0, assetsCloseIndex) +
      imageDef + "\n" +
      currentSource.slice(assetsCloseIndex);
  } else {
    // Check if <defs> exists (user may have added their own)
    var defsOpenMatch = currentSource.match(/<defs[^>]*>/);

    if (defsOpenMatch) {
      // Insert <g id="image-assets"> right after opening <defs>
      var insertAfterDefs = defsOpenMatch.index + defsOpenMatch[0].length;
      newSource =
        currentSource.slice(0, insertAfterDefs) +
        '\n    <g id="image-assets">\n' + imageDef + '\n    </g>' +
        currentSource.slice(insertAfterDefs);
    } else {
      // Create <defs> with <g id="image-assets"> after <svg> opening tag
      var svgOpenMatch = currentSource.match(/<svg[^>]*>/);
      if (svgOpenMatch) {
        var insertAfter = svgOpenMatch.index + svgOpenMatch[0].length;
        newSource =
          currentSource.slice(0, insertAfter) +
          '\n  <defs>\n    <g id="image-assets">\n' + imageDef + '\n    </g>\n  </defs>' +
          currentSource.slice(insertAfter);
      } else {
        // No <svg> tag at all — create everything
        newSource =
          '<svg xmlns="http://www.w3.org/2000/svg" width="' + width +
          '" height="' + height +
          '" viewBox="0 0 ' + width + ' ' + height + '">\n' +
          '  <defs>\n    <g id="image-assets">\n' + imageDef + '\n    </g>\n  </defs>\n' +
          useTag + '\n</svg>';
        newSource = maybeExpandSvgCanvas(newSource, width, height);
        editor.setValue(newSource);
        foldImageAssets();
        return;
      }
    }
  }

  // Insert <use> before </svg>
  var closingTagIndex = newSource.lastIndexOf("</svg>");
  if (closingTagIndex !== -1) {
    newSource =
      newSource.slice(0, closingTagIndex) +
      useTag + "\n" +
      newSource.slice(closingTagIndex);
  }

  newSource = maybeExpandSvgCanvas(newSource, width, height);
  editor.setValue(newSource);
  foldImageAssets();
}

// Auto-fold the <g id="image-assets"> block so the base64 data is hidden
function foldImageAssets() {
  var lineCount = editor.lineCount();
  for (var i = 0; i < lineCount; i++) {
    var lineText = editor.getLine(i);
    if (lineText.match(/<g\s[^>]*id="image-assets"/)) {
      editor.foldCode(CodeMirror.Pos(i, 0));
      break;
    }
  }
}

// Remove <image> definitions in <g id="image-assets"> that are no longer
// referenced anywhere else in the document (e.g. their <use> was deleted).
function cleanupUnusedAssets() {
  var source = editor.getValue();

  // Find the <g id="image-assets">...</g> block
  var groupStart = source.match(/<g\s[^>]*id="image-assets"[^>]*>/);
  if (!groupStart) return;

  var groupStartIndex = groupStart.index;
  var groupCloseIndex = source.indexOf("</g>", groupStartIndex);
  if (groupCloseIndex === -1) return;

  var groupContent = source.slice(groupStartIndex + groupStart[0].length, groupCloseIndex);

  // Find all image IDs defined in the assets group
  var imageIds = [];
  var idRe = /<image\s[^>]*id="([^"]+)"/g;
  var m;
  while ((m = idRe.exec(groupContent)) !== null) {
    imageIds.push(m[1]);
  }
  if (imageIds.length === 0) return;

  // The rest of the document (everything outside the assets group)
  var outsideAssets = source.slice(0, groupStartIndex) +
    source.slice(groupCloseIndex + "</g>".length);

  // Check which image IDs are still referenced
  var unused = imageIds.filter(function (id) {
    // Look for href="#id", url(#id), or xlink:href="#id" outside the assets block
    var refPattern = new RegExp('(?:href|xlink:href)="#' + id.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '"' +
      '|url\\(#' + id.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\)');
    return !refPattern.test(outsideAssets);
  });

  if (unused.length === 0) return;

  // Remove unused <image> elements from the source
  var newSource = source;
  unused.forEach(function (id) {
    // Match the full <image ...id="ID"... /> (self-closing) or <image ...>...</image>
    var selfClosing = new RegExp('\\s*<image\\s[^>]*id="' + id.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '"[^>]*/>' + '\\n?', 'g');
    var withClose = new RegExp('\\s*<image\\s[^>]*id="' + id.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '"[^>]*>.*?</image>' + '\\n?', 'gs');
    newSource = newSource.replace(selfClosing, '');
    newSource = newSource.replace(withClose, '');
  });

  // If no images remain in the group, remove the entire <g> and possibly <defs>
  var remainingGroup = newSource.match(/<g\s[^>]*id="image-assets"[^>]*>([\s\S]*?)<\/g>/);
  if (remainingGroup && remainingGroup[1].trim() === '') {
    // Remove the empty <g id="image-assets">...</g>
    newSource = newSource.replace(/\s*<g\s[^>]*id="image-assets"[^>]*>\s*<\/g>\n?/, '');

    // If <defs> is now empty, remove it too
    var emptyDefs = newSource.match(/<defs[^>]*>([\s\S]*?)<\/defs>/);
    if (emptyDefs && emptyDefs[1].trim() === '') {
      newSource = newSource.replace(/\s*<defs[^>]*>\s*<\/defs>\n?/, '');
    }
  }

  if (newSource !== source) {
    // Preserve cursor position across the edit
    var cursor = editor.getCursor();
    isCleaningUp = true;
    editor.setValue(newSource);
    // Clamp cursor to valid range after cleanup
    var maxLine = editor.lineCount() - 1;
    var safeLine = Math.min(cursor.line, maxLine);
    var safeCh = Math.min(cursor.ch, editor.getLine(safeLine).length);
    editor.setCursor({ line: safeLine, ch: safeCh });
    foldImageAssets();
    isCleaningUp = false;
  }
}

function maybeExpandSvgCanvas(svgSource, imgWidth, imgHeight) {
  var widthMatch = svgSource.match(/<svg[^>]*\bwidth="(\d+)"/);
  var heightMatch = svgSource.match(/<svg[^>]*\bheight="(\d+)"/);

  if (!widthMatch || !heightMatch) return svgSource;

  var currentW = parseInt(widthMatch[1], 10);
  var currentH = parseInt(heightMatch[1], 10);

  var newW = Math.max(currentW, imgWidth);
  var newH = Math.max(currentH, imgHeight);

  if (newW !== currentW) {
    svgSource = svgSource.replace(
      new RegExp('(<svg[^>]*\\bwidth=")' + currentW + '"'),
      "$1" + newW + '"'
    );
  }
  if (newH !== currentH) {
    svgSource = svgSource.replace(
      new RegExp('(<svg[^>]*\\bheight=")' + currentH + '"'),
      "$1" + newH + '"'
    );
  }

  var vbMatch = svgSource.match(
    /<svg[^>]*\bviewBox="(\d+)\s+(\d+)\s+(\d+)\s+(\d+)"/
  );
  if (vbMatch) {
    var vbW = parseInt(vbMatch[3], 10);
    var vbH = parseInt(vbMatch[4], 10);
    var newVbW = Math.max(vbW, imgWidth);
    var newVbH = Math.max(vbH, imgHeight);
    svgSource = svgSource.replace(
      'viewBox="' + vbMatch[1] + " " + vbMatch[2] + " " + vbW + " " + vbH + '"',
      'viewBox="' + vbMatch[1] + " " + vbMatch[2] + " " + newVbW + " " + newVbH + '"'
    );
  }

  return svgSource;
}

// ── Paste image from clipboard ───────────────────────────

// Button click: use Clipboard API
document.getElementById("btn-paste-img").addEventListener("click", function () {
  if (!navigator.clipboard || !navigator.clipboard.read) {
    alert("Clipboard API not supported in this browser. Try Ctrl/Cmd+V instead.");
    return;
  }
  navigator.clipboard.read().then(function (items) {
    var found = false;
    items.forEach(function (item) {
      var imageType = item.types.find(function (t) {
        return t.startsWith("image/");
      });
      if (imageType) {
        found = true;
        item.getType(imageType).then(function (blob) {
          processImageBlob(blob);
        });
      }
    });
    if (!found) {
      alert("No image found on clipboard.");
    }
  }).catch(function (err) {
    alert("Could not read clipboard: " + err.message);
  });
});

// Global paste event: catches Ctrl/Cmd+V anywhere
document.addEventListener("paste", function (e) {
  var items = e.clipboardData && e.clipboardData.items;
  if (!items) return;

  for (var i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image/") === 0) {
      e.preventDefault();
      processImageBlob(items[i].getAsFile());
      return;
    }
  }
  // No image — let normal paste (text) proceed
});

function processImageBlob(blob) {
  var reader = new FileReader();
  reader.onload = function (ev) {
    var dataUri = ev.target.result;
    var img = new Image();
    img.onload = function () {
      insertImageIntoSvg(dataUri, img.naturalWidth, img.naturalHeight);
    };
    img.src = dataUri;
  };
  reader.readAsDataURL(blob);
}

// ── PNG export ───────────────────────────────────────────

btnExportPng.addEventListener("click", exportPng);

function exportPng() {
  var svgSource = editor.getValue();

  var parser = new DOMParser();
  var doc = parser.parseFromString(svgSource, "image/svg+xml");
  var parseError = doc.querySelector("parsererror");

  if (parseError) {
    alert("Cannot export: SVG has parse errors.");
    return;
  }

  var svgEl = doc.documentElement;

  var width = parseFloat(svgEl.getAttribute("width"));
  var height = parseFloat(svgEl.getAttribute("height"));

  if (!width || !height) {
    var vb = svgEl.getAttribute("viewBox");
    if (vb) {
      var parts = vb.split(/[\s,]+/).map(Number);
      width = parts[2];
      height = parts[3];
    }
  }

  if (!width || !height) {
    alert(
      "Cannot determine SVG dimensions. Set width and height on the <svg> element."
    );
    return;
  }

  if (!svgEl.getAttribute("xmlns")) {
    svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }

  var serializer = new XMLSerializer();
  var svgString = serializer.serializeToString(svgEl);
  var blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  var url = URL.createObjectURL(blob);

  var img = new Image();
  img.onload = function () {
    exportCanvas.width = width;
    exportCanvas.height = height;
    var ctx = exportCanvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);

    var dataUrl = exportCanvas.toDataURL("image/png");
    var link = document.createElement("a");
    link.download = "export.png";
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  img.onerror = function () {
    URL.revokeObjectURL(url);
    alert("Failed to render SVG to image. Check for invalid SVG content.");
  };

  img.src = url;
}

// ── Copy SVG to clipboard ───────────────────────────────

btnCopySvg.addEventListener("click", copySvg);

function copySvg() {
  var svgSource = editor.getValue();
  navigator.clipboard.writeText(svgSource).then(function () {
    flashButton(btnCopySvg, "Copied!");
  });
}

// ── Copy PNG to clipboard ───────────────────────────────

btnCopyPng.addEventListener("click", copyPng);

function copyPng() {
  var svgSource = editor.getValue();

  var parser = new DOMParser();
  var doc = parser.parseFromString(svgSource, "image/svg+xml");
  var parseError = doc.querySelector("parsererror");

  if (parseError) {
    alert("Cannot copy: SVG has parse errors.");
    return;
  }

  var svgEl = doc.documentElement;

  var width = parseFloat(svgEl.getAttribute("width"));
  var height = parseFloat(svgEl.getAttribute("height"));

  if (!width || !height) {
    var vb = svgEl.getAttribute("viewBox");
    if (vb) {
      var parts = vb.split(/[\s,]+/).map(Number);
      width = parts[2];
      height = parts[3];
    }
  }

  if (!width || !height) {
    alert(
      "Cannot determine SVG dimensions. Set width and height on the <svg> element."
    );
    return;
  }

  if (!svgEl.getAttribute("xmlns")) {
    svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }

  var serializer = new XMLSerializer();
  var svgString = serializer.serializeToString(svgEl);
  var blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  var url = URL.createObjectURL(blob);

  var img = new Image();
  img.onload = function () {
    exportCanvas.width = width;
    exportCanvas.height = height;
    var ctx = exportCanvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);

    exportCanvas.toBlob(function (pngBlob) {
      navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob })
      ]).then(function () {
        flashButton(btnCopyPng, "Copied!");
      });
    }, "image/png");
  };

  img.onerror = function () {
    URL.revokeObjectURL(url);
    alert("Failed to render SVG to image. Check for invalid SVG content.");
  };

  img.src = url;
}

// ── Button flash helper ─────────────────────────────────

function flashButton(btn, message) {
  var original = btn.textContent;
  btn.textContent = message;
  setTimeout(function () {
    btn.textContent = original;
  }, 1200);
}

// ── Element selection overlay ────────────────────────────
// When the text cursor sits inside a visible SVG element,
// draw an outline in the preview pane and allow
// drag-to-move and drag-to-resize.

var overlayEl = document.getElementById("element-overlay");
var handleRight = overlayEl.querySelector(".overlay-handle-right");
var handleBottom = overlayEl.querySelector(".overlay-handle-bottom");
var handleCorner = overlayEl.querySelector(".overlay-handle-corner");

// State for the currently highlighted element
var currentOverlayInfo = null;   // { tagName, line, attrs, previewElement }
var overlayDragMode = null;      // "move" | "resize-right" | "resize-bottom" | "resize-corner"
var overlayDragStart = null;     // { x, y, origAttrs: {...} }

// ── Visible SVG element tags (things that actually render) ──
var VISIBLE_TAGS = [
  "rect", "circle", "ellipse", "line", "polyline", "polygon",
  "path", "text", "image", "use", "g", "foreignObject",
  "a", "switch", "svg"
];

// ── Find the innermost element at the cursor ────────────
// Walk backwards from cursor to find the nearest opening tag
// that hasn't been closed yet.

function findElementAtCursor(cm) {
  var cur = cm.getCursor();
  var source = cm.getValue();
  var lines = source.split("\n");

  // Convert cursor position to character offset
  var offset = 0;
  for (var i = 0; i < cur.line; i++) {
    offset += lines[i].length + 1;
  }
  offset += cur.ch;

  // Find the innermost unclosed visible element surrounding the cursor.
  // Strategy: use a simple tag-stack parser up to the cursor offset.
  var tagStack = []; // [{tagName, startOffset, line, attrs}]
  // Match opening/closing/self-closing tags.
  // The inner part uses [^>]* but > inside attribute values is rare in SVG.
  // We handle multi-line tags by enabling the 's' flag equivalent:
  // since JS regex [^>] already does NOT match > but DOES match \n, this works.
  var tagRe = /<\/?([a-zA-Z][a-zA-Z0-9_-]*)\b([^>]*?)(\/?)>/g;
  var m;

  while ((m = tagRe.exec(source)) !== null) {
    if (m.index >= offset) break;

    var isClosing = m[0].charAt(1) === "/";
    var isSelfClosing = m[3] === "/" || m[0].slice(-2) === "/>";
    var tagName = m[1];

    if (isClosing) {
      // Pop matching open tag from stack
      for (var j = tagStack.length - 1; j >= 0; j--) {
        if (tagStack[j].tagName === tagName) {
          tagStack.splice(j, 1);
          break;
        }
      }
    } else {
      // Calculate line number
      var before = source.slice(0, m.index);
      var lineNum = before.split("\n").length - 1;

      // Parse attributes from the tag
      var attrs = parseAttributes(m[0]);

      if (isSelfClosing) {
        // Self-closing: only counts if cursor is within the tag itself
        var tagEnd = m.index + m[0].length;
        if (offset >= m.index && offset <= tagEnd) {
          tagStack.push({
            tagName: tagName,
            startOffset: m.index,
            line: lineNum,
            attrs: attrs
          });
        }
      } else {
        tagStack.push({
          tagName: tagName,
          startOffset: m.index,
          line: lineNum,
          attrs: attrs
        });
      }
    }
  }

  // Walk from innermost outward, find the first visible tag (skip <svg> root, <defs>, <g id="image-assets">)
  for (var k = tagStack.length - 1; k >= 0; k--) {
    var entry = tagStack[k];
    if (VISIBLE_TAGS.indexOf(entry.tagName) === -1) continue;
    // Skip the root <svg> itself
    if (entry.tagName === "svg" && k === 0) continue;
    // Skip <defs> children
    var inDefs = false;
    for (var d = 0; d < k; d++) {
      if (tagStack[d].tagName === "defs") { inDefs = true; break; }
    }
    if (inDefs) continue;

    return entry;
  }

  return null;
}

function parseAttributes(tagStr) {
  var attrs = {};
  var attrRe = /\b([a-zA-Z_:][a-zA-Z0-9_:.-]*)="([^"]*)"/g;
  var m;
  while ((m = attrRe.exec(tagStr)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

// ── Map source element to preview DOM element ────────────
// Given the tag info from the source, find the corresponding
// element in the rendered SVG by counting occurrences.

function findPreviewElement(info) {
  var svgEl = previewEl.querySelector("svg");
  if (!svgEl) return null;

  // Strategy: Collect all matching elements in source order,
  // determine the index of our element, then use querySelectorAll
  // on the rendered SVG to pick the same index.
  var source = editor.getValue();
  var tagName = info.tagName;

  // Count how many opening tags of this type appear before our offset
  var re = new RegExp("<" + tagName + "\\b", "g");
  var index = 0;
  var m;
  while ((m = re.exec(source)) !== null) {
    if (m.index === info.startOffset) break;
    // Skip ones inside <defs>
    var before = source.slice(0, m.index);
    var defsOpen = (before.match(/<defs[\s>]/g) || []).length;
    var defsClose = (before.match(/<\/defs>/g) || []).length;
    if (defsOpen > defsClose) continue;
    index++;
  }

  // Now find the same element in the rendered SVG (excluding defs)
  var candidates = [];
  var allEls = svgEl.querySelectorAll(tagName);
  for (var i = 0; i < allEls.length; i++) {
    // Skip elements inside <defs>
    var el = allEls[i];
    var inDefs = false;
    var p = el.parentElement;
    while (p && p !== svgEl) {
      if (p.tagName.toLowerCase() === "defs") { inDefs = true; break; }
      p = p.parentElement;
    }
    if (!inDefs) candidates.push(el);
  }

  return candidates[index] || null;
}

// ── Position the overlay over a preview element ──────────

function positionOverlay(previewElement) {
  if (!previewElement) {
    overlayEl.classList.remove("active");
    currentOverlayInfo = null;
    return;
  }

  var bbox;
  try {
    if (typeof previewElement.getBBox === "function") {
      bbox = previewElement.getBBox();
    } else {
      overlayEl.classList.remove("active");
      return;
    }
  } catch (e) {
    overlayEl.classList.remove("active");
    return;
  }

  // getBBox gives us SVG user-space coordinates.
  // We need to convert them to screen coordinates relative to preview-pane.
  var svgEl = previewEl.querySelector("svg");
  if (!svgEl) return;

  var ctm = previewElement.getCTM();
  if (!ctm) {
    overlayEl.classList.remove("active");
    return;
  }

  // Transform the four corners of the bounding box
  var svgPt = svgEl.createSVGPoint();

  svgPt.x = bbox.x;
  svgPt.y = bbox.y;
  var topLeft = svgPt.matrixTransform(ctm);

  svgPt.x = bbox.x + bbox.width;
  svgPt.y = bbox.y + bbox.height;
  var bottomRight = svgPt.matrixTransform(ctm);

  // The CTM maps to the SVG element's viewport. We need screen coords.
  var svgRect = svgEl.getBoundingClientRect();
  var paneRect = previewPane.getBoundingClientRect();

  // SVG element's own CTM starts from its viewport origin.
  // We need to use getScreenCTM instead for screen coordinates.
  var screenCTM = previewElement.getScreenCTM();
  if (!screenCTM) {
    overlayEl.classList.remove("active");
    return;
  }

  svgPt.x = bbox.x;
  svgPt.y = bbox.y;
  var screenTL = svgPt.matrixTransform(screenCTM);

  svgPt.x = bbox.x + bbox.width;
  svgPt.y = bbox.y + bbox.height;
  var screenBR = svgPt.matrixTransform(screenCTM);

  // Convert to preview-pane-relative coordinates (accounting for scroll)
  var left = screenTL.x - paneRect.left + previewPane.scrollLeft;
  var top = screenTL.y - paneRect.top + previewPane.scrollTop;
  var width = screenBR.x - screenTL.x;
  var height = screenBR.y - screenTL.y;

  // Don't show overlay for zero-size or degenerate elements
  if (width < 1 && height < 1) {
    overlayEl.classList.remove("active");
    return;
  }

  overlayEl.style.left = left + "px";
  overlayEl.style.top = top + "px";
  overlayEl.style.width = Math.max(width, 1) + "px";
  overlayEl.style.height = Math.max(height, 1) + "px";
  overlayEl.classList.add("active");
}

// ── Cursor activity handler ──────────────────────────────

function updateOverlay() {
  var info = findElementAtCursor(editor);
  if (!info) {
    overlayEl.classList.remove("active");
    currentOverlayInfo = null;
    return;
  }

  var previewElement = findPreviewElement(info);
  if (!previewElement) {
    overlayEl.classList.remove("active");
    currentOverlayInfo = null;
    return;
  }

  currentOverlayInfo = {
    tagName: info.tagName,
    line: info.line,
    startOffset: info.startOffset,
    attrs: info.attrs,
    previewElement: previewElement
  };

  positionOverlay(previewElement);
}

editor.on("cursorActivity", function () {
  updateOverlay();
});

// Also update overlay after content changes (renderPreview rebuilds the DOM)
var origRenderPreview = renderPreview;
renderPreview = function (svgSource) {
  origRenderPreview(svgSource);
  updateOverlay();
};

window.addEventListener("resize", function () {
  updateOverlay();
});

previewPane.addEventListener("scroll", function () {
  if (currentOverlayInfo && currentOverlayInfo.previewElement) {
    positionOverlay(currentOverlayInfo.previewElement);
  }
});

// ── Drag-to-move and drag-to-resize ─────────────────────
//
// During drag: only move/resize the overlay <div>.  Zero SVG DOM mutations,
// zero text edits, zero layout queries.  We accumulate the total SVG-space
// delta and apply it once on mouseup.

function roundAttr(v) {
  return Math.round(v * 100) / 100;
}

// ── Source text attribute writer (used only at commit) ────

function updateSourceAttribute(attrName, newValue, startOffset) {
  var source = editor.getValue();
  var tagEnd = source.indexOf(">", startOffset);
  if (tagEnd === -1) return;
  var tag = source.slice(startOffset, tagEnd + 1);

  var esc = attrName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  var attrRe = new RegExp('[\\s\\n]' + esc + '="([^"]*)"');
  var match = tag.match(attrRe);

  if (match) {
    var valueStart = startOffset + match.index + 1 + attrName.length + 2;
    var valueEnd = valueStart + match[1].length;
    var from = offsetToPos(source, valueStart);
    var to = offsetToPos(source, valueEnd);
    editor.replaceRange(String(newValue), from, to);
  } else {
    var insertOffset = (tag.slice(-2) === "/>")
      ? startOffset + tag.length - 2
      : startOffset + tag.length - 1;
    var insertPos = offsetToPos(source, insertOffset);
    editor.replaceRange(' ' + attrName + '="' + newValue + '"', insertPos, insertPos);
  }
}

function offsetToPos(source, offset) {
  var remaining = offset;
  var lines = source.split("\n");
  for (var i = 0; i < lines.length; i++) {
    if (remaining <= lines[i].length) return { line: i, ch: remaining };
    remaining -= lines[i].length + 1;
  }
  return { line: lines.length - 1, ch: lines[lines.length - 1].length };
}

// ── Commit accumulated delta to source text (once on mouseup) ──

function commitDragToSource(svgDx, svgDy, svgDw, svgDh, mode) {
  if (!currentOverlayInfo) return;
  var tagName = currentOverlayInfo.tagName;
  var info = findElementAtCursor(editor);
  if (!info) return;

  // Collect [attrName, delta] pairs depending on element type and drag mode
  var pairs = [];

  if (mode === "move") {
    switch (tagName) {
      case "rect": case "image": case "use": case "foreignObject": case "svg":
        pairs.push(["x", svgDx]); pairs.push(["y", svgDy]); break;
      case "circle":
        pairs.push(["cx", svgDx]); pairs.push(["cy", svgDy]); break;
      case "ellipse":
        pairs.push(["cx", svgDx]); pairs.push(["cy", svgDy]); break;
      case "text":
        pairs.push(["x", svgDx]); pairs.push(["y", svgDy]); break;
      case "line":
        pairs.push(["x1", svgDx]); pairs.push(["y1", svgDy]);
        pairs.push(["x2", svgDx]); pairs.push(["y2", svgDy]); break;
      default:
        // handled separately below
        break;
    }
  }

  // For transform-based elements (g, path, etc.) handle move via transform
  if (mode === "move" && pairs.length === 0) {
    var inf = findElementAtCursor(editor);
    if (!inf) return;
    var existingTransform = inf.attrs.transform || "";
    var newTransform;
    var translateRe = /translate\(([^,)]+),?\s*([^)]*)\)/;
    var tm = existingTransform.match(translateRe);
    if (tm) {
      var tx = parseFloat(tm[1]) + svgDx;
      var ty = parseFloat(tm[2] || "0") + svgDy;
      newTransform = existingTransform.replace(translateRe,
        "translate(" + roundAttr(tx) + ", " + roundAttr(ty) + ")");
    } else {
      newTransform = "translate(" + roundAttr(svgDx) + ", " + roundAttr(svgDy) + ")" +
        (existingTransform ? " " + existingTransform : "");
    }
    editor.operation(function () {
      updateSourceAttribute("transform", newTransform, inf.startOffset);
    });
    return;
  }

  // For resize, collect size deltas
  if (mode !== "move") {
    var applyW = (mode === "resize-right" || mode === "resize-corner");
    var applyH = (mode === "resize-bottom" || mode === "resize-corner");
    switch (tagName) {
      case "rect": case "image": case "use": case "foreignObject": case "svg":
        if (applyW) pairs.push(["width", svgDw]);
        if (applyH) pairs.push(["height", svgDh]);
        break;
      case "circle":
        var rDelta = 0;
        if (applyW) rDelta += svgDw / 2;
        if (applyH) rDelta += svgDh / 2;
        pairs.push(["r", rDelta]);
        break;
      case "ellipse":
        if (applyW) pairs.push(["rx", svgDw / 2]);
        if (applyH) pairs.push(["ry", svgDh / 2]);
        break;
    }
  }

  // Apply: read current value, add delta, write back
  editor.operation(function () {
    for (var i = 0; i < pairs.length; i++) {
      var attrName = pairs[i][0];
      var delta = pairs[i][1];
      var inf = findElementAtCursor(editor);
      if (!inf) break;
      var cur = parseFloat(inf.attrs[attrName] || "0");
      var min = (attrName === "width" || attrName === "height" ||
                 attrName === "r" || attrName === "rx" || attrName === "ry") ? 1 : -Infinity;
      updateSourceAttribute(attrName, roundAttr(Math.max(min, cur + delta)), inf.startOffset);
    }
  });
}

// ── Mouse event handlers for the overlay ─────────────────

handleRight.addEventListener("mousedown", function (e) {
  e.stopPropagation();
  startOverlayDrag(e, "resize-right");
});

handleBottom.addEventListener("mousedown", function (e) {
  e.stopPropagation();
  startOverlayDrag(e, "resize-bottom");
});

handleCorner.addEventListener("mousedown", function (e) {
  e.stopPropagation();
  startOverlayDrag(e, "resize-corner");
});

overlayEl.addEventListener("mousedown", function (e) {
  if (e.target === overlayEl) {
    startOverlayDrag(e, "move");
  }
});

// Accumulated SVG-space deltas during the drag
var dragTotalSvgDx = 0;
var dragTotalSvgDy = 0;
var dragCachedScale = null; // cached inverse CTM from drag start

function startOverlayDrag(e, mode) {
  if (!currentOverlayInfo || !currentOverlayInfo.previewElement) return;
  e.preventDefault();

  overlayDragMode = mode;
  overlayDragStart = { x: e.clientX, y: e.clientY };
  dragTotalSvgDx = 0;
  dragTotalSvgDy = 0;

  // Cache the CTM inverse once — never query layout again during drag
  var svgEl = previewEl.querySelector("svg");
  if (svgEl) {
    var ctm = svgEl.getScreenCTM();
    if (ctm) {
      var inv = ctm.inverse();
      dragCachedScale = { a: inv.a, b: inv.b, c: inv.c, d: inv.d };
    }
  }

  document.body.style.userSelect = "none";
  document.addEventListener("mousemove", onOverlayDragMove);
  document.addEventListener("mouseup", onOverlayDragEnd);
}

function onOverlayDragMove(e) {
  if (!overlayDragMode || !overlayDragStart) return;

  var screenDx = e.clientX - overlayDragStart.x;
  var screenDy = e.clientY - overlayDragStart.y;
  if (screenDx === 0 && screenDy === 0) return;

  overlayDragStart.x = e.clientX;
  overlayDragStart.y = e.clientY;

  // Accumulate SVG-space delta
  var s = dragCachedScale;
  if (s) {
    dragTotalSvgDx += screenDx * s.a + screenDy * s.c;
    dragTotalSvgDy += screenDx * s.b + screenDy * s.d;
  } else {
    dragTotalSvgDx += screenDx;
    dragTotalSvgDy += screenDy;
  }

  // Move / resize the overlay div only — pure CSS, no SVG DOM, no layout
  if (overlayDragMode === "move") {
    overlayEl.style.left = (parseFloat(overlayEl.style.left) + screenDx) + "px";
    overlayEl.style.top  = (parseFloat(overlayEl.style.top)  + screenDy) + "px";
  } else {
    if (overlayDragMode === "resize-right" || overlayDragMode === "resize-corner") {
      overlayEl.style.width = Math.max(1, parseFloat(overlayEl.style.width) + screenDx) + "px";
    }
    if (overlayDragMode === "resize-bottom" || overlayDragMode === "resize-corner") {
      overlayEl.style.height = Math.max(1, parseFloat(overlayEl.style.height) + screenDy) + "px";
    }
  }
}

function onOverlayDragEnd() {
  var mode = overlayDragMode;
  overlayDragMode = null;
  overlayDragStart = null;
  document.body.style.userSelect = "";
  document.removeEventListener("mousemove", onOverlayDragMove);
  document.removeEventListener("mouseup", onOverlayDragEnd);

  if (mode) {
    commitDragToSource(dragTotalSvgDx, dragTotalSvgDy,
                       dragTotalSvgDx, dragTotalSvgDy, mode);
  }

  dragTotalSvgDx = 0;
  dragTotalSvgDy = 0;
  dragCachedScale = null;
}

})();
