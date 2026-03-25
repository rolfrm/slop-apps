// SVG schema for CodeMirror xml-hint autocomplete
// Format: https://codemirror.net/5/doc/manual.html#addon_xml-hint

(function () {
  "use strict";

  // ── Shared attribute groups ────────────────────────────

  var presentationAttrs = {
    fill: null,
    "fill-opacity": null,
    "fill-rule": ["nonzero", "evenodd"],
    stroke: null,
    "stroke-width": null,
    "stroke-opacity": null,
    "stroke-linecap": ["butt", "round", "square"],
    "stroke-linejoin": ["miter", "round", "bevel"],
    "stroke-dasharray": null,
    "stroke-dashoffset": null,
    "stroke-miterlimit": null,
    opacity: null,
    visibility: ["visible", "hidden", "collapse"],
    display: ["inline", "block", "none"],
    "clip-path": null,
    "clip-rule": ["nonzero", "evenodd"],
    filter: null,
    mask: null,
    "pointer-events": ["none", "visiblePainted", "visibleFill", "visibleStroke", "visible", "painted", "fill", "stroke", "all"],
    "font-family": null,
    "font-size": null,
    "font-style": ["normal", "italic", "oblique"],
    "font-weight": ["normal", "bold", "bolder", "lighter", "100", "200", "300", "400", "500", "600", "700", "800", "900"],
    "font-variant": ["normal", "small-caps"],
    "text-anchor": ["start", "middle", "end"],
    "text-decoration": ["none", "underline", "overline", "line-through"],
    "dominant-baseline": ["auto", "text-bottom", "alphabetic", "ideographic", "middle", "central", "mathematical", "hanging", "text-top"],
    "alignment-baseline": ["auto", "baseline", "before-edge", "text-before-edge", "middle", "central", "after-edge", "text-after-edge", "ideographic", "alphabetic", "hanging", "mathematical"],
    "letter-spacing": null,
    "word-spacing": null,
    direction: ["ltr", "rtl"],
    "writing-mode": ["lr-tb", "rl-tb", "tb-rl", "lr", "rl", "tb"],
    color: null,
    "color-interpolation": ["auto", "sRGB", "linearRGB"],
    "color-interpolation-filters": ["auto", "sRGB", "linearRGB"],
    "flood-color": null,
    "flood-opacity": null,
    "lighting-color": null,
    "stop-color": null,
    "stop-opacity": null,
    "image-rendering": ["auto", "optimizeSpeed", "optimizeQuality"],
    "shape-rendering": ["auto", "optimizeSpeed", "crispEdges", "geometricPrecision"],
    "text-rendering": ["auto", "optimizeSpeed", "optimizeLegibility", "geometricPrecision"],
    overflow: ["visible", "hidden", "scroll", "auto"],
    cursor: ["auto", "crosshair", "default", "pointer", "move", "text", "wait", "help", "n-resize", "ne-resize", "e-resize", "se-resize", "s-resize", "sw-resize", "w-resize", "nw-resize"],
  };

  var coreAttrs = {
    id: null,
    class: null,
    style: null,
    tabindex: null,
    "xml:lang": null,
    "xml:space": ["default", "preserve"],
  };

  var xformAttr = {
    transform: null,
  };

  var condAttrs = {
    requiredFeatures: null,
    requiredExtensions: null,
    systemLanguage: null,
  };

  // Merge multiple attr objects
  function merge() {
    var result = {};
    for (var i = 0; i < arguments.length; i++) {
      var obj = arguments[i];
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) result[key] = obj[key];
      }
    }
    return result;
  }

  var shapeBase = merge(coreAttrs, presentationAttrs, xformAttr, condAttrs);

  // ── SVG child element lists ────────────────────────────

  var structuralChildren = [
    "svg", "g", "defs", "symbol", "use",
  ];

  var shapeChildren = [
    "rect", "circle", "ellipse", "line", "polyline", "polygon", "path",
  ];

  var textChildren = [
    "text", "tspan", "textPath",
  ];

  var paintChildren = [
    "linearGradient", "radialGradient", "pattern",
  ];

  var filterChildren = [
    "filter",
  ];

  var imageChildren = [
    "image",
  ];

  var descriptiveChildren = [
    "title", "desc", "metadata",
  ];

  var markerChildren = [
    "marker",
  ];

  var maskClipChildren = [
    "mask", "clipPath",
  ];

  var allContent = [].concat(
    structuralChildren, shapeChildren, textChildren,
    paintChildren, filterChildren, imageChildren,
    descriptiveChildren, markerChildren, maskClipChildren,
    ["a", "foreignObject", "switch", "animate", "animateTransform", "animateMotion", "set"]
  );

  var filterPrimitives = [
    "feBlend", "feColorMatrix", "feComponentTransfer",
    "feComposite", "feConvolveMatrix", "feDiffuseLighting",
    "feDisplacementMap", "feDistantLight", "feFlood",
    "feGaussianBlur", "feImage", "feMerge", "feMergeNode",
    "feMorphology", "feOffset", "fePointLight",
    "feSpecularLighting", "feSpotLight", "feTile",
    "feTurbulence",
  ];

  // ── The schema ─────────────────────────────────────────

  var svgSchema = {
    "!top": ["svg"],

    svg: {
      attrs: merge(shapeBase, {
        xmlns: ["http://www.w3.org/2000/svg"],
        "xmlns:xlink": ["http://www.w3.org/1999/xlink"],
        version: ["1.1"],
        width: null,
        height: null,
        viewBox: null,
        preserveAspectRatio: ["none", "xMinYMin", "xMidYMin", "xMaxYMin", "xMinYMid", "xMidYMid", "xMaxYMid", "xMinYMax", "xMidYMax", "xMaxYMax",
          "xMinYMin meet", "xMidYMin meet", "xMaxYMin meet", "xMinYMid meet", "xMidYMid meet", "xMaxYMid meet", "xMinYMax meet", "xMidYMax meet", "xMaxYMax meet",
          "xMinYMin slice", "xMidYMin slice", "xMaxYMin slice", "xMinYMid slice", "xMidYMid slice", "xMaxYMid slice", "xMinYMax slice", "xMidYMax slice", "xMaxYMax slice"],
        x: null,
        y: null,
      }),
      children: allContent,
    },

    g: {
      attrs: shapeBase,
      children: allContent,
    },

    defs: {
      attrs: merge(coreAttrs, presentationAttrs, xformAttr),
      children: allContent,
    },

    symbol: {
      attrs: merge(coreAttrs, presentationAttrs, {
        viewBox: null,
        preserveAspectRatio: null,
        refX: null,
        refY: null,
        x: null,
        y: null,
        width: null,
        height: null,
      }),
      children: allContent,
    },

    use: {
      attrs: merge(shapeBase, {
        href: null,
        "xlink:href": null,
        x: null,
        y: null,
        width: null,
        height: null,
      }),
      children: descriptiveChildren,
    },

    // ── Shapes ──

    rect: {
      attrs: merge(shapeBase, {
        x: null,
        y: null,
        width: null,
        height: null,
        rx: null,
        ry: null,
      }),
      children: descriptiveChildren.concat(["animate", "set"]),
    },

    circle: {
      attrs: merge(shapeBase, {
        cx: null,
        cy: null,
        r: null,
      }),
      children: descriptiveChildren.concat(["animate", "set"]),
    },

    ellipse: {
      attrs: merge(shapeBase, {
        cx: null,
        cy: null,
        rx: null,
        ry: null,
      }),
      children: descriptiveChildren.concat(["animate", "set"]),
    },

    line: {
      attrs: merge(shapeBase, {
        x1: null,
        y1: null,
        x2: null,
        y2: null,
      }),
      children: descriptiveChildren.concat(["animate", "set"]),
    },

    polyline: {
      attrs: merge(shapeBase, {
        points: null,
      }),
      children: descriptiveChildren.concat(["animate", "set"]),
    },

    polygon: {
      attrs: merge(shapeBase, {
        points: null,
      }),
      children: descriptiveChildren.concat(["animate", "set"]),
    },

    path: {
      attrs: merge(shapeBase, {
        d: null,
        pathLength: null,
      }),
      children: descriptiveChildren.concat(["animate", "animateMotion", "set"]),
    },

    // ── Text ──

    text: {
      attrs: merge(shapeBase, {
        x: null,
        y: null,
        dx: null,
        dy: null,
        rotate: null,
        textLength: null,
        lengthAdjust: ["spacing", "spacingAndGlyphs"],
      }),
      children: ["tspan", "textPath", "a", "animate", "set"].concat(descriptiveChildren),
    },

    tspan: {
      attrs: merge(shapeBase, {
        x: null,
        y: null,
        dx: null,
        dy: null,
        rotate: null,
        textLength: null,
        lengthAdjust: ["spacing", "spacingAndGlyphs"],
      }),
      children: ["tspan", "a", "animate", "set"],
    },

    textPath: {
      attrs: merge(shapeBase, {
        href: null,
        "xlink:href": null,
        startOffset: null,
        method: ["align", "stretch"],
        spacing: ["auto", "exact"],
        textLength: null,
        lengthAdjust: ["spacing", "spacingAndGlyphs"],
      }),
      children: ["tspan", "a", "animate", "set"],
    },

    // ── Image ──

    image: {
      attrs: merge(shapeBase, {
        href: null,
        "xlink:href": null,
        x: null,
        y: null,
        width: null,
        height: null,
        preserveAspectRatio: null,
        crossorigin: ["anonymous", "use-credentials"],
      }),
      children: descriptiveChildren.concat(["animate", "set"]),
    },

    // ── Gradients & patterns ──

    linearGradient: {
      attrs: merge(coreAttrs, presentationAttrs, {
        x1: null,
        y1: null,
        x2: null,
        y2: null,
        gradientUnits: ["userSpaceOnUse", "objectBoundingBox"],
        gradientTransform: null,
        spreadMethod: ["pad", "reflect", "repeat"],
        href: null,
        "xlink:href": null,
      }),
      children: ["stop", "animate", "set"].concat(descriptiveChildren),
    },

    radialGradient: {
      attrs: merge(coreAttrs, presentationAttrs, {
        cx: null,
        cy: null,
        r: null,
        fx: null,
        fy: null,
        fr: null,
        gradientUnits: ["userSpaceOnUse", "objectBoundingBox"],
        gradientTransform: null,
        spreadMethod: ["pad", "reflect", "repeat"],
        href: null,
        "xlink:href": null,
      }),
      children: ["stop", "animate", "set"].concat(descriptiveChildren),
    },

    stop: {
      attrs: merge(coreAttrs, {
        offset: null,
        "stop-color": null,
        "stop-opacity": null,
        style: null,
      }),
      children: ["animate", "set"],
    },

    pattern: {
      attrs: merge(coreAttrs, presentationAttrs, {
        x: null,
        y: null,
        width: null,
        height: null,
        viewBox: null,
        preserveAspectRatio: null,
        patternUnits: ["userSpaceOnUse", "objectBoundingBox"],
        patternContentUnits: ["userSpaceOnUse", "objectBoundingBox"],
        patternTransform: null,
        href: null,
        "xlink:href": null,
      }),
      children: allContent,
    },

    // ── Mask & clip ──

    mask: {
      attrs: merge(coreAttrs, presentationAttrs, {
        x: null,
        y: null,
        width: null,
        height: null,
        maskUnits: ["userSpaceOnUse", "objectBoundingBox"],
        maskContentUnits: ["userSpaceOnUse", "objectBoundingBox"],
      }),
      children: allContent,
    },

    clipPath: {
      attrs: merge(coreAttrs, presentationAttrs, xformAttr, {
        clipPathUnits: ["userSpaceOnUse", "objectBoundingBox"],
      }),
      children: shapeChildren.concat(["text", "use"]).concat(descriptiveChildren),
    },

    // ── Marker ──

    marker: {
      attrs: merge(coreAttrs, presentationAttrs, {
        viewBox: null,
        preserveAspectRatio: null,
        refX: null,
        refY: null,
        markerUnits: ["strokeWidth", "userSpaceOnUse"],
        markerWidth: null,
        markerHeight: null,
        orient: ["auto", "auto-start-reverse"],
      }),
      children: allContent,
    },

    // ── Filter ──

    filter: {
      attrs: merge(coreAttrs, presentationAttrs, {
        x: null,
        y: null,
        width: null,
        height: null,
        filterUnits: ["userSpaceOnUse", "objectBoundingBox"],
        primitiveUnits: ["userSpaceOnUse", "objectBoundingBox"],
      }),
      children: filterPrimitives.concat(descriptiveChildren),
    },

    // ── Filter primitives ──

    feBlend: {
      attrs: merge(coreAttrs, presentationAttrs, {
        "in": null,
        in2: null,
        mode: ["normal", "multiply", "screen", "darken", "lighten", "overlay", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"],
        x: null, y: null, width: null, height: null,
        result: null,
      }),
      children: ["animate", "set"],
    },

    feColorMatrix: {
      attrs: merge(coreAttrs, presentationAttrs, {
        "in": null,
        type: ["matrix", "saturate", "hueRotate", "luminanceToAlpha"],
        values: null,
        x: null, y: null, width: null, height: null,
        result: null,
      }),
      children: ["animate", "set"],
    },

    feComponentTransfer: {
      attrs: merge(coreAttrs, presentationAttrs, {
        "in": null,
        x: null, y: null, width: null, height: null,
        result: null,
      }),
      children: ["feFuncR", "feFuncG", "feFuncB", "feFuncA"],
    },

    feFuncR: { attrs: { type: ["identity", "table", "discrete", "linear", "gamma"], tableValues: null, slope: null, intercept: null, amplitude: null, exponent: null, offset: null }, children: [] },
    feFuncG: { attrs: { type: ["identity", "table", "discrete", "linear", "gamma"], tableValues: null, slope: null, intercept: null, amplitude: null, exponent: null, offset: null }, children: [] },
    feFuncB: { attrs: { type: ["identity", "table", "discrete", "linear", "gamma"], tableValues: null, slope: null, intercept: null, amplitude: null, exponent: null, offset: null }, children: [] },
    feFuncA: { attrs: { type: ["identity", "table", "discrete", "linear", "gamma"], tableValues: null, slope: null, intercept: null, amplitude: null, exponent: null, offset: null }, children: [] },

    feComposite: {
      attrs: merge(coreAttrs, presentationAttrs, {
        "in": null,
        in2: null,
        operator: ["over", "in", "out", "atop", "xor", "lighter", "arithmetic"],
        k1: null, k2: null, k3: null, k4: null,
        x: null, y: null, width: null, height: null,
        result: null,
      }),
      children: ["animate", "set"],
    },

    feConvolveMatrix: {
      attrs: merge(coreAttrs, presentationAttrs, {
        "in": null,
        order: null,
        kernelMatrix: null,
        divisor: null,
        bias: null,
        targetX: null,
        targetY: null,
        edgeMode: ["duplicate", "wrap", "none"],
        preserveAlpha: ["true", "false"],
        x: null, y: null, width: null, height: null,
        result: null,
      }),
      children: ["animate", "set"],
    },

    feDiffuseLighting: {
      attrs: merge(coreAttrs, presentationAttrs, {
        "in": null,
        surfaceScale: null,
        diffuseConstant: null,
        x: null, y: null, width: null, height: null,
        result: null,
      }),
      children: ["feDistantLight", "fePointLight", "feSpotLight"],
    },

    feDisplacementMap: {
      attrs: merge(coreAttrs, presentationAttrs, {
        "in": null,
        in2: null,
        scale: null,
        xChannelSelector: ["R", "G", "B", "A"],
        yChannelSelector: ["R", "G", "B", "A"],
        x: null, y: null, width: null, height: null,
        result: null,
      }),
      children: ["animate", "set"],
    },

    feDistantLight: {
      attrs: { azimuth: null, elevation: null },
      children: ["animate", "set"],
    },

    feFlood: {
      attrs: merge(coreAttrs, presentationAttrs, {
        "flood-color": null,
        "flood-opacity": null,
        x: null, y: null, width: null, height: null,
        result: null,
      }),
      children: ["animate", "set"],
    },

    feGaussianBlur: {
      attrs: merge(coreAttrs, presentationAttrs, {
        "in": null,
        stdDeviation: null,
        edgeMode: ["duplicate", "wrap", "none"],
        x: null, y: null, width: null, height: null,
        result: null,
      }),
      children: ["animate", "set"],
    },

    feImage: {
      attrs: merge(coreAttrs, presentationAttrs, {
        href: null,
        "xlink:href": null,
        preserveAspectRatio: null,
        x: null, y: null, width: null, height: null,
        result: null,
      }),
      children: ["animate", "set"],
    },

    feMerge: {
      attrs: merge(coreAttrs, presentationAttrs, {
        x: null, y: null, width: null, height: null,
        result: null,
      }),
      children: ["feMergeNode"],
    },

    feMergeNode: {
      attrs: { "in": null },
      children: [],
    },

    feMorphology: {
      attrs: merge(coreAttrs, presentationAttrs, {
        "in": null,
        operator: ["erode", "dilate"],
        radius: null,
        x: null, y: null, width: null, height: null,
        result: null,
      }),
      children: ["animate", "set"],
    },

    feOffset: {
      attrs: merge(coreAttrs, presentationAttrs, {
        "in": null,
        dx: null,
        dy: null,
        x: null, y: null, width: null, height: null,
        result: null,
      }),
      children: ["animate", "set"],
    },

    fePointLight: {
      attrs: { x: null, y: null, z: null },
      children: ["animate", "set"],
    },

    feSpecularLighting: {
      attrs: merge(coreAttrs, presentationAttrs, {
        "in": null,
        surfaceScale: null,
        specularConstant: null,
        specularExponent: null,
        x: null, y: null, width: null, height: null,
        result: null,
      }),
      children: ["feDistantLight", "fePointLight", "feSpotLight"],
    },

    feSpotLight: {
      attrs: { x: null, y: null, z: null, pointsAtX: null, pointsAtY: null, pointsAtZ: null, specularExponent: null, limitingConeAngle: null },
      children: ["animate", "set"],
    },

    feTile: {
      attrs: merge(coreAttrs, presentationAttrs, {
        "in": null,
        x: null, y: null, width: null, height: null,
        result: null,
      }),
      children: ["animate", "set"],
    },

    feTurbulence: {
      attrs: merge(coreAttrs, presentationAttrs, {
        baseFrequency: null,
        numOctaves: null,
        seed: null,
        stitchTiles: ["stitch", "noStitch"],
        type: ["fractalNoise", "turbulence"],
        x: null, y: null, width: null, height: null,
        result: null,
      }),
      children: ["animate", "set"],
    },

    // ── Animation ──

    animate: {
      attrs: merge(coreAttrs, condAttrs, {
        attributeName: null,
        from: null,
        to: null,
        by: null,
        values: null,
        begin: null,
        dur: null,
        end: null,
        repeatCount: null,
        repeatDur: null,
        fill: ["freeze", "remove"],
        calcMode: ["discrete", "linear", "paced", "spline"],
        keyTimes: null,
        keySplines: null,
        additive: ["replace", "sum"],
        accumulate: ["none", "sum"],
      }),
      children: descriptiveChildren,
    },

    animateTransform: {
      attrs: merge(coreAttrs, condAttrs, {
        attributeName: null,
        type: ["translate", "scale", "rotate", "skewX", "skewY"],
        from: null,
        to: null,
        by: null,
        values: null,
        begin: null,
        dur: null,
        end: null,
        repeatCount: null,
        repeatDur: null,
        fill: ["freeze", "remove"],
        calcMode: ["discrete", "linear", "paced", "spline"],
        keyTimes: null,
        keySplines: null,
        additive: ["replace", "sum"],
        accumulate: ["none", "sum"],
      }),
      children: descriptiveChildren,
    },

    animateMotion: {
      attrs: merge(coreAttrs, condAttrs, {
        path: null,
        keyPoints: null,
        rotate: null,
        from: null,
        to: null,
        by: null,
        values: null,
        begin: null,
        dur: null,
        end: null,
        repeatCount: null,
        repeatDur: null,
        fill: ["freeze", "remove"],
        calcMode: ["discrete", "linear", "paced", "spline"],
        keyTimes: null,
        keySplines: null,
        additive: ["replace", "sum"],
        accumulate: ["none", "sum"],
      }),
      children: ["mpath"].concat(descriptiveChildren),
    },

    mpath: {
      attrs: merge(coreAttrs, { href: null, "xlink:href": null }),
      children: [],
    },

    set: {
      attrs: merge(coreAttrs, condAttrs, {
        attributeName: null,
        to: null,
        begin: null,
        dur: null,
        end: null,
        repeatCount: null,
        repeatDur: null,
        fill: ["freeze", "remove"],
      }),
      children: descriptiveChildren,
    },

    // ── Other ──

    a: {
      attrs: merge(shapeBase, {
        href: null,
        "xlink:href": null,
        target: ["_self", "_parent", "_top", "_blank"],
      }),
      children: allContent,
    },

    foreignObject: {
      attrs: merge(shapeBase, {
        x: null,
        y: null,
        width: null,
        height: null,
      }),
      children: [], // can contain any non-SVG content
    },

    switch: {
      attrs: merge(coreAttrs, presentationAttrs, xformAttr, condAttrs),
      children: allContent,
    },

    title: {
      attrs: coreAttrs,
      children: [],
    },

    desc: {
      attrs: coreAttrs,
      children: [],
    },

    metadata: {
      attrs: coreAttrs,
      children: [],
    },
  };

  // Export globally for app.js to use
  window.svgSchema = svgSchema;
})();
