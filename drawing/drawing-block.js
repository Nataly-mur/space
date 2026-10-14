/* ============================================================
   БЛОК РИСОВАНИЯ — логика
   Автоматически инициализируется при загрузке страницы
   ============================================================ */

(function() {
  "use strict";

  function init() {
    // Проверка: есть ли на странице нужные элементы
    var canvas = document.getElementById('drawCanvas');
    var drawToggle = document.getElementById('drawToggle');
    var toolbar = document.getElementById('toolbar');

    if (!canvas || !drawToggle || !toolbar) {
      // На этой странице нет блока рисования — выходим без ошибок
      return;
    }

    var ctx = canvas.getContext('2d');
    var colorBtn = document.getElementById('colorBtn');
    var colorCircle = document.getElementById('colorCircle');
    var sizeBtn = document.getElementById('sizeBtn');
    var sizeBtnLabel = document.getElementById('sizeBtnLabel');
    var eraserBtn = document.getElementById('eraserBtn');
    var shapesBtn = document.getElementById('shapesBtn');
    var undoBtn = document.getElementById('undoBtn');
    var redoBtn = document.getElementById('redoBtn');
    var colorDropdown = document.getElementById('colorDropdown');
    var sizeDropdown = document.getElementById('sizeDropdown');
    var shapesDropdown = document.getElementById('shapesDropdown');
    var sizeRange = document.getElementById('sizeRange');
    var sizeLabel = document.getElementById('sizeLabel');
    var eraserRange = document.getElementById('eraserRange');
    var eraserLabel = document.getElementById('eraserLabel');
    var hotkeysHint = document.getElementById('hotkeysHint');
    var colorSwatches = document.querySelectorAll('.color-swatch');
    var shapeBtns = document.querySelectorAll('.shape-btn');

    var COLORS = ['#000000', '#1565c0', '#2e7d32', '#fbc02d', '#d32f2f', '#757575'];
    var ALT_MULTIPLIER = 1.5;
    var ALT_FADE_DURATION = 1000;
    var MAX_HISTORY = 10;
    var ARC_AMPLIFY = 2.0;

    var state = {
      enabled: false,
      tool: 'pen',
      shape: null,
      color: '#d32f2f',
      size: 4,
      eraserSize: 8,
      drawing: false,
      drawingTemp: false,
      lastX: 0, lastY: 0,
      startX: 0, startY: 0,
      shiftPressed: false,
      altPressed: false,
      snapshotBeforeShift: null,
      tempStrokes: [],
      tempSnapshot: null,
      tempAnimFrame: null,
      shapePhase: 'idle',
      shapeData: null
    };

    var history = [];
    var redoStack = [];

    // ============ UNDO/REDO ============
    function updateUndoButtons() {
      undoBtn.style.opacity = history.length > 0 ? '1' : '0.35';
      undoBtn.style.pointerEvents = history.length > 0 ? 'auto' : 'none';
      redoBtn.style.opacity = redoStack.length > 0 ? '1' : '0.35';
      redoBtn.style.pointerEvents = redoStack.length > 0 ? 'auto' : 'none';
    }

    function pushHistory() {
      try {
        var dataURL = canvas.toDataURL();
        history.push(dataURL);
        if (history.length > MAX_HISTORY) history.shift();
        redoStack = [];
        updateUndoButtons();
      } catch (e) {}
    }

    function restoreFromDataURL(dataURL) {
      var img = new Image();
      img.onload = function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = dataURL;
    }

    function undo() {
      if (history.length === 0) return;
      try {
        redoStack.push(canvas.toDataURL());
        if (redoStack.length > MAX_HISTORY) redoStack.shift();
      } catch (e) {}
      var prev = history.pop();
      restoreFromDataURL(prev);
      updateUndoButtons();
    }

    function redo() {
      if (redoStack.length === 0) return;
      try {
        history.push(canvas.toDataURL());
        if (history.length > MAX_HISTORY) history.shift();
      } catch (e) {}
      var next = redoStack.pop();
      restoreFromDataURL(next);
      updateUndoButtons();
    }

    // ============ КООРДИНАТЫ ============
    function getPos(e) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var clientX, clientY;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    }

    // ============ ИНСТРУМЕНТЫ ============
    function setTool(tool) {
      state.tool = tool;
      state.shape = null;
      state.shapePhase = 'idle';
      state.shapeData = null;
      if (tool === 'pen') {
        colorBtn.classList.add('active');
        eraserBtn.classList.remove('active');
        canvas.classList.remove('eraser-mode');
      } else {
        eraserBtn.classList.add('active');
        colorBtn.classList.remove('active');
        canvas.classList.add('eraser-mode');
      }
      shapeBtns.forEach(function(b){ b.classList.remove('active'); });
    }

    function setShape(shape) {
      state.shape = shape;
      state.tool = 'pen';
      state.shapePhase = 'idle';
      state.shapeData = null;
      colorBtn.classList.add('active');
      eraserBtn.classList.remove('active');
      canvas.classList.remove('eraser-mode');
      shapeBtns.forEach(function(b){
        b.classList.toggle('active', b.getAttribute('data-shape') === shape);
      });
    }

    function clearShapeSelection() {
      if (state.tempSnapshot) {
        ctx.putImageData(state.tempSnapshot, 0, 0);
        state.tempSnapshot = null;
      }
      state.shape = null;
      state.shapePhase = 'idle';
      state.shapeData = null;
      state.drawing = false;
      shapeBtns.forEach(function(b){ b.classList.remove('active'); });
    }

    function cancelShapeProcess() {
      if (state.tempSnapshot) {
        ctx.putImageData(state.tempSnapshot, 0, 0);
        state.tempSnapshot = null;
      }
      state.shapePhase = 'idle';
      state.shapeData = null;
      state.drawing = false;
    }

    function setColor(color) {
      state.color = color;
      colorCircle.style.background = color;
      colorSwatches.forEach(function(sw) {
        sw.classList.toggle('active', sw.getAttribute('data-color') === color);
      });
    }

    function setSize(size) {
      state.size = size;
      sizeRange.value = size;
      sizeLabel.textContent = size;
      sizeBtnLabel.textContent = size;
    }

    function setEraserSize(size) {
      state.eraserSize = size;
      eraserRange.value = size;
      eraserLabel.textContent = size;
    }

    // ============ ALT-ЛИНИИ ============
    function ensureTempSnapshot() {
      if (!state.tempSnapshot) {
        state.tempSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
    }

    function redrawWithTemp() {
      if (state.tempStrokes.length === 0) {
        if (state.tempSnapshot) {
          ctx.putImageData(state.tempSnapshot, 0, 0);
        }
        return;
      }
      if (!state.tempSnapshot) return;
      ctx.putImageData(state.tempSnapshot, 0, 0);

      var now = Date.now();
      state.tempStrokes.forEach(function(stroke) {
        var alpha = 1;
        if (stroke.releasedAt !== null) {
          var elapsed = now - stroke.releasedAt;
          alpha = Math.max(0, 1 - elapsed / ALT_FADE_DURATION);
          if (alpha <= 0) return;
        }
        ctx.beginPath();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (stroke.path.length === 1) {
          ctx.arc(stroke.path[0].x, stroke.path[0].y, stroke.size / 2, 0, Math.PI * 2);
          ctx.fillStyle = stroke.color;
          ctx.fill();
        } else {
          ctx.moveTo(stroke.path[0].x, stroke.path[0].y);
          for (var i = 1; i < stroke.path.length; i++) {
            ctx.lineTo(stroke.path[i].x, stroke.path[i].y);
          }
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;
    }

    function startTempAnim() {
      if (state.tempAnimFrame) return;
      function frame() {
        redrawWithTemp();
        var now = Date.now();
        var before = state.tempStrokes.length;
        state.tempStrokes = state.tempStrokes.filter(function(s) {
          if (s.releasedAt === null) return true;
          return (now - s.releasedAt) < ALT_FADE_DURATION;
        });
        if (state.tempStrokes.length !== before) {
          redrawWithTemp();
        }
        if (state.tempStrokes.length > 0) {
          state.tempAnimFrame = requestAnimationFrame(frame);
        } else {
          state.tempAnimFrame = null;
          if (state.tempSnapshot) {
            ctx.putImageData(state.tempSnapshot, 0, 0);
          }
          state.tempSnapshot = null;
        }
      }
      state.tempAnimFrame = requestAnimationFrame(frame);
    }

    function releaseAllTempStrokes() {
      var now = Date.now();
      state.tempStrokes.forEach(function(s) {
        if (s.releasedAt === null) {
          s.releasedAt = now;
        }
      });
      if (state.tempStrokes.length > 0) {
        startTempAnim();
      }
    }

    function cancelRelease() {
      state.tempStrokes.forEach(function(s) {
        s.releasedAt = null;
      });
    }

    // ============ ФИГУРЫ ============
    function getArcControlPoint(d) {
      var mx = (d.startX + d.endX) / 2;
      var my = (d.startY + d.endY) / 2;
      var cx = mx + (d.curveX - mx) * ARC_AMPLIFY;
      var cy = my + (d.curveY - my) * ARC_AMPLIFY;
      return { cx: cx, cy: cy };
    }

    function drawShape(shape, x1, y1, x2, y2, cx, cy, color, size) {
      ctx.beginPath();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (shape === 'line') {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      } else if (shape === 'rect') {
        ctx.rect(
          Math.min(x1, x2),
          Math.min(y1, y2),
          Math.abs(x2 - x1),
          Math.abs(y2 - y1)
        );
      } else if (shape === 'circle') {
        var r = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
        ctx.arc(x1, y1, r, 0, Math.PI * 2);
      } else if (shape === 'arc') {
        if (cx === undefined || cy === undefined) {
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        } else {
          ctx.moveTo(x1, y1);
          ctx.quadraticCurveTo(cx, cy, x2, y2);
        }
      }
      ctx.stroke();
    }

    function drawShapePreview() {
      if (!state.tempSnapshot) return;
      ctx.putImageData(state.tempSnapshot, 0, 0);
      var d = state.shapeData;
      if (!d) return;

      if (d.shape === 'arc' && state.shapePhase === 'arc-curve') {
        var cp = getArcControlPoint(d);
        drawShape('arc', d.startX, d.startY, d.endX, d.endY, cp.cx, cp.cy, d.color, d.size);
      } else {
        drawShape(d.shape, d.startX, d.startY, d.endX, d.endY, undefined, undefined, d.color, d.size);
      }
    }

    // ============ ОБРАБОТЧИКИ РИСОВАНИЯ ============
    function onPointerDown(e) {
      if (!state.enabled) return;
      e.preventDefault();
      var pos = getPos(e);

      if (state.shape) {
        if (state.shape === 'arc') {
          if (state.shapePhase === 'idle') {
            state.shapePhase = 'arc-wait-2';
            state.shapeData = {
              startX: pos.x, startY: pos.y,
              endX: pos.x, endY: pos.y,
              curveX: pos.x, curveY: pos.y,
              shape: 'arc',
              color: state.color,
              size: state.size
            };
            ensureTempSnapshot();
            ctx.beginPath();
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            ctx.fillStyle = state.color;
            ctx.arc(pos.x, pos.y, Math.max(4, state.size), 0, Math.PI * 2);
            ctx.fill();
            return;
          }
          if (state.shapePhase === 'arc-wait-2') {
            state.shapeData.endX = pos.x;
            state.shapeData.endY = pos.y;
            state.shapePhase = 'arc-wait-3';
            drawShapePreview();
            return;
          }
          if (state.shapePhase === 'arc-wait-3') {
            state.shapePhase = 'arc-curve';
            state.drawing = true;
            state.shapeData.curveX = pos.x;
            state.shapeData.curveY = pos.y;
            drawShapePreview();
            return;
          }
          return;
        }

        if (state.shapePhase === 'idle') {
          state.shapePhase = 'drag';
          state.shapeData = {
            startX: pos.x, startY: pos.y,
            endX: pos.x, endY: pos.y,
            curveX: pos.x, curveY: pos.y,
            shape: state.shape,
            color: state.color,
            size: state.size
          };
          state.drawing = true;
          ensureTempSnapshot();
          pushHistory();
          return;
        }
        return;
      }

      state.drawing = true;
      state.lastX = pos.x;
      state.lastY = pos.y;
      state.startX = pos.x;
      state.startY = pos.y;

      var isTemp = state.altPressed && state.tool === 'pen';

      if (isTemp) {
        state.drawingTemp = true;
        ensureTempSnapshot();
        state.tempStrokes.push({
          path: [{ x: pos.x, y: pos.y }],
          color: state.color,
          size: state.size * ALT_MULTIPLIER,
          releasedAt: null
        });
        return;
      }

      state.drawingTemp = false;
      pushHistory();

      if (state.shiftPressed && state.tool === 'pen') {
        state.snapshotBeforeShift = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }

      ctx.beginPath();
      if (state.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = state.eraserSize;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = state.color;
        ctx.lineWidth = state.size;
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(pos.x + 0.01, pos.y + 0.01);
      ctx.stroke();
    }

    function onPointerMove(e) {
      if (state.shape && state.shapeData) {
        if (state.shape === 'arc') {
          if (state.shapePhase === 'arc-curve' && state.drawing) {
            e.preventDefault();
            var pos = getPos(e);
            state.shapeData.curveX = pos.x;
            state.shapeData.curveY = pos.y;
            drawShapePreview();
            return;
          }
          return;
        }
        if (state.shapePhase === 'drag' && state.drawing) {
          e.preventDefault();
          var pos2 = getPos(e);
          state.shapeData.endX = pos2.x;
          state.shapeData.endY = pos2.y;
          drawShapePreview();
          return;
        }
        return;
      }

      if (!state.drawing) return;
      e.preventDefault();
      var pos = getPos(e);

      if (state.drawingTemp) {
        var stroke = state.tempStrokes[state.tempStrokes.length - 1];
        if (stroke) {
          stroke.path.push({ x: pos.x, y: pos.y });
          redrawWithTemp();
        }
        return;
      }

      if (state.shiftPressed && state.tool === 'pen') {
        if (state.snapshotBeforeShift) {
          ctx.putImageData(state.snapshotBeforeShift, 0, 0);
        }
        ctx.beginPath();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = state.color;
        ctx.lineWidth = state.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(state.startX, state.startY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        if (state.tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineWidth = state.eraserSize;
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = state.color;
          ctx.lineWidth = state.size;
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(state.lastX, state.lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();

        state.lastX = pos.x;
        state.lastY = pos.y;
      }
    }

    function onPointerUp(e) {
      if (state.shape && state.shapeData) {
        if (state.shape === 'arc') {
          if (state.shapePhase === 'arc-wait-2' || state.shapePhase === 'arc-wait-3') {
            return;
          }
          if (state.shapePhase === 'arc-curve') {
            state.drawing = false;
            var cp = getArcControlPoint(state.shapeData);
            drawShape('arc',
              state.shapeData.startX, state.shapeData.startY,
              state.shapeData.endX, state.shapeData.endY,
              cp.cx, cp.cy,
              state.shapeData.color, state.shapeData.size);
            state.shapePhase = 'idle';
            state.shapeData = null;
            state.tempSnapshot = null;
            return;
          }
          return;
        }

        if (state.shapePhase === 'drag') {
          var dx = state.shapeData.endX - state.shapeData.startX;
          var dy = state.shapeData.endY - state.shapeData.startY;
          var dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 8) {
            state.shapePhase = 'idle';
            state.shapeData = null;
            state.drawing = false;
            if (state.tempSnapshot) {
              ctx.putImageData(state.tempSnapshot, 0, 0);
              state.tempSnapshot = null;
            }
            return;
          }

          drawShape(state.shapeData.shape,
            state.shapeData.startX, state.shapeData.startY,
            state.shapeData.endX, state.shapeData.endY,
            undefined, undefined,
            state.shapeData.color, state.shapeData.size);
          state.shapePhase = 'idle';
          state.shapeData = null;
          state.drawing = false;
          state.tempSnapshot = null;
          return;
        }
        return;
      }

      if (!state.drawing) return;

      if (state.drawingTemp) {
        state.drawingTemp = false;
        state.drawing = false;
        if (!state.altPressed) {
          releaseAllTempStrokes();
        }
        return;
      }

      state.drawing = false;
      state.snapshotBeforeShift = null;
    }

    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('mouseleave', function(e) {
      if (state.shapePhase === 'arc-curve') return;
      onPointerUp(e);
    });
    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    canvas.addEventListener('touchmove', onPointerMove, { passive: false });
    canvas.addEventListener('touchend', onPointerUp);
    canvas.addEventListener('touchcancel', onPointerUp);

    // ============ ТУМБЛЕР ============
    function setEnabled(on) {
      state.enabled = on;
      drawToggle.classList.toggle('on', on);
      canvas.classList.toggle('active', on);
      if (on) {
        toolbar.classList.add('open');
        restoreToolbarPosIfNeeded();
        setTool('pen');
        showHotkeysHint();
      } else {
        toolbar.classList.remove('open');
        hideAllDropdowns();
        state.tempStrokes = [];
        state.tempSnapshot = null;
        if (state.tempAnimFrame) {
          cancelAnimationFrame(state.tempAnimFrame);
          state.tempAnimFrame = null;
        }
        state.shapePhase = 'idle';
        state.shapeData = null;
        state.drawing = false;
        state.drawingTemp = false;
        redrawWithTemp();
      }
    }

    drawToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      setEnabled(!state.enabled);
    });

    // ============ ПЕРЕТАСКИВАНИЕ ПАНЕЛИ ============
    var STORAGE_KEY = 'drawToolbarPos_v2';
    var dragState = {
      dragging: false,
      offsetX: 0,
      offsetY: 0,
      lastLeft: undefined,
      lastTop: undefined,
      longPressTimer: null
    };

    function saveToolbarPos(left, top) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ left: left, top: top }));
      } catch (e) {}
    }

    function loadToolbarPos() {
      try {
        var s = localStorage.getItem(STORAGE_KEY);
        if (!s) return null;
        return JSON.parse(s);
      } catch (e) { return null; }
    }

    function applyToolbarPos(left, top) {
      var tbW = toolbar.offsetWidth;
      var tbH = toolbar.offsetHeight;
      var winW = window.innerWidth;
      var winH = window.innerHeight;

      var minLeft = -tbW + 40;
      var maxLeft = winW - 40;
      var minTop = 0;
      var maxTop = winH - 40;

      left = Math.max(minLeft, Math.min(left, maxLeft));
      top = Math.max(minTop, Math.min(top, maxTop));

      toolbar.style.left = left + 'px';
      toolbar.style.top = top + 'px';
      toolbar.style.right = 'auto';
      return { left: left, top: top };
    }

    function resetToolbarPos() {
      toolbar.style.left = 'auto';
      toolbar.style.top = '56px';
      toolbar.style.right = '8px';
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }

    function restoreToolbarPosIfNeeded() {
      var saved = loadToolbarPos();
      if (saved) {
        setTimeout(function() {
          applyToolbarPos(saved.left, saved.top);
        }, 20);
      }
    }

    function startDrag(clientX, clientY) {
      var tbRect = toolbar.getBoundingClientRect();
      dragState.dragging = true;
      dragState.offsetX = clientX - tbRect.left;
      dragState.offsetY = clientY - tbRect.top;
      toolbar.classList.add('dragging');
    }

    function moveDrag(clientX, clientY) {
      if (!dragState.dragging) return;
      var left = clientX - dragState.offsetX;
      var top = clientY - dragState.offsetY;
      var pos = applyToolbarPos(left, top);
      if (pos) {
        dragState.lastLeft = pos.left;
        dragState.lastTop = pos.top;
      }
    }

    function endDrag() {
      if (!dragState.dragging) return;
      dragState.dragging = false;
      toolbar.classList.remove('dragging');
      if (dragState.lastLeft !== undefined) {
        saveToolbarPos(dragState.lastLeft, dragState.lastTop);
      }
    }

    toolbar.addEventListener('mousedown', function(e) {
      if (e.target.closest('button') || e.target.closest('.dropdown')) return;
      e.preventDefault();
      startDrag(e.clientX, e.clientY);
    });

    document.addEventListener('mousemove', function(e) {
      if (dragState.dragging) {
        e.preventDefault();
        moveDrag(e.clientX, e.clientY);
      }
    });

    document.addEventListener('mouseup', function() {
      endDrag();
    });

    toolbar.addEventListener('touchstart', function(e) {
      if (e.target.closest('button') || e.target.closest('.dropdown')) return;
      var t = e.touches[0];
      clearTimeout(dragState.longPressTimer);
      dragState.longPressTimer = setTimeout(function() {
        startDrag(t.clientX, t.clientY);
      }, 200);
    }, { passive: true });

    toolbar.addEventListener('touchmove', function(e) {
      if (dragState.dragging) {
        e.preventDefault();
        var t = e.touches[0];
        moveDrag(t.clientX, t.clientY);
      } else {
        clearTimeout(dragState.longPressTimer);
      }
    }, { passive: false });

    toolbar.addEventListener('touchend', function() {
      clearTimeout(dragState.longPressTimer);
      endDrag();
    });

    toolbar.addEventListener('touchcancel', function() {
      clearTimeout(dragState.longPressTimer);
      endDrag();
    });

    toolbar.addEventListener('dblclick', function(e) {
      if (e.target.closest('button') || e.target.closest('.dropdown')) return;
      resetToolbarPos();
    });

    var resetLongPressTimer = null;
    toolbar.addEventListener('touchstart', function(e) {
      if (e.target.closest('button') || e.target.closest('.dropdown')) return;
      clearTimeout(resetLongPressTimer);
      resetLongPressTimer = setTimeout(function() {
        resetToolbarPos();
      }, 1200);
    }, { passive: true });

    toolbar.addEventListener('touchend', function() {
      clearTimeout(resetLongPressTimer);
    });

    window.addEventListener('resize', function() {
      var r = toolbar.getBoundingClientRect();
      if (r.right < 40 || r.left > window.innerWidth - 40 ||
          r.bottom < 40 || r.top > window.innerHeight - 40) {
        applyToolbarPos(r.left, r.top);
      }
    });

    // ============ DROPDOWN ============
    function hideAllDropdowns() {
      colorDropdown.classList.remove('open');
      sizeDropdown.classList.remove('open');
      shapesDropdown.classList.remove('open');
    }

    function toggleDropdown(dd) {
      var wasOpen = dd.classList.contains('open');
      hideAllDropdowns();
      if (!wasOpen) dd.classList.add('open');
    }

    var colorClickTimer = null;
    var colorLongPressTimer = null;
    var isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    function activatePen() { setTool('pen'); }
    function openColorPalette() { toggleDropdown(colorDropdown); }

    colorBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (isTouchDevice) return;
      if (colorClickTimer) {
        clearTimeout(colorClickTimer);
        colorClickTimer = null;
        openColorPalette();
        return;
      }
      colorClickTimer = setTimeout(function() {
        colorClickTimer = null;
        activatePen();
      }, 250);
    });

    colorBtn.addEventListener('touchstart', function(e) {
      e.stopPropagation();
      clearTimeout(colorLongPressTimer);
      colorLongPressTimer = setTimeout(function() {
        colorLongPressTimer = null;
        openColorPalette();
        colorBtn._longPressFired = true;
      }, 500);
    }, { passive: true });

    colorBtn.addEventListener('touchend', function(e) {
      e.stopPropagation();
      clearTimeout(colorLongPressTimer);
      colorLongPressTimer = null;
      if (colorBtn._longPressFired) {
        colorBtn._longPressFired = false;
        return;
      }
      activatePen();
    });

    colorBtn.addEventListener('touchmove', function() {
      clearTimeout(colorLongPressTimer);
      colorLongPressTimer = null;
    }, { passive: true });

    sizeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleDropdown(sizeDropdown);
    });

    shapesBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleDropdown(shapesDropdown);
    });

    colorSwatches.forEach(function(sw) {
      sw.addEventListener('click', function(e) {
        e.stopPropagation();
        setColor(sw.getAttribute('data-color'));
        if (state.tool === 'eraser') setTool('pen');
        state.shape = null;
        shapeBtns.forEach(function(b){ b.classList.remove('active'); });
        hideAllDropdowns();
      });
    });

    shapeBtns.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var shape = btn.getAttribute('data-shape');
        if (state.shape === shape) {
          clearShapeSelection();
        } else {
          setShape(shape);
        }
        hideAllDropdowns();
      });
    });

    document.addEventListener('click', function(e) {
      if (!colorDropdown.contains(e.target) && !sizeDropdown.contains(e.target) &&
          !shapesDropdown.contains(e.target) &&
          !colorBtn.contains(e.target) && !sizeBtn.contains(e.target) &&
          !shapesBtn.contains(e.target)) {
        hideAllDropdowns();
      }
    });

    sizeRange.addEventListener('input', function() {
      setSize(parseInt(sizeRange.value, 10));
    });

    eraserRange.addEventListener('input', function() {
      setEraserSize(parseInt(eraserRange.value, 10));
    });

    eraserBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      setTool('eraser');
      hideAllDropdowns();
    });

    undoBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      undo();
    });
    redoBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      redo();
    });

    var hintTimer = null;
    function showHotkeysHint() {
      hotkeysHint.classList.add('show');
      clearTimeout(hintTimer);
      hintTimer = setTimeout(function() {
        hotkeysHint.classList.remove('show');
      }, 5000);
    }

    toolbar.addEventListener('touchstart', function() {
      toolbar.classList.add('touched');
      clearTimeout(toolbar._touchTimer);
      toolbar._touchTimer = setTimeout(function() {
        toolbar.classList.remove('touched');
      }, 3000);
    }, { passive: true });

    toolbar.addEventListener('mouseenter', function() {
      toolbar.classList.add('touched');
    });
    toolbar.addEventListener('mouseleave', function() {
      setTimeout(function() {
        if (!toolbar.querySelector('.dropdown.open')) {
          toolbar.classList.remove('touched');
        }
      }, 500);
    });

    // ============ ГОРЯЧИЕ КЛАВИШИ ============
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Shift') {
        state.shiftPressed = true;
        return;
      }
      if (e.key === 'Alt') {
        if (!state.altPressed) {
          state.altPressed = true;
          cancelRelease();
        }
        e.preventDefault();
        return;
      }
      if (e.key === 'Escape') {
        if (state.shape && state.shapePhase !== 'idle') {
          cancelShapeProcess();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z' || e.key === 'я' || e.key === 'Я')) {
        if (!state.enabled) return;
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }

      if (!state.enabled) return;

      var key = e.key.toLowerCase();

      if (key === 'p' || key === 'з') {
        e.preventDefault(); setTool('pen');
      } else if (key === 'e' || key === 'у') {
        e.preventDefault(); setTool('eraser');
      } else if (key >= '1' && key <= '6') {
        e.preventDefault();
        var idx = parseInt(key, 10) - 1;
        if (COLORS[idx]) {
          setColor(COLORS[idx]);
          if (state.tool === 'eraser') setTool('pen');
          state.shape = null;
          shapeBtns.forEach(function(b){ b.classList.remove('active'); });
        }
      } else if (key === '[' || key === 'х') {
        e.preventDefault(); setSize(Math.max(1, state.size - 1));
      } else if (key === ']' || key === 'ъ') {
        e.preventDefault(); setSize(Math.min(30, state.size + 1));
      }
      else if (key === 'l' || key === 'д') {
        e.preventDefault();
        if (state.shape === 'line') clearShapeSelection();
        else setShape('line');
      } else if (key === 'r' || key === 'к') {
        e.preventDefault();
        if (state.shape === 'rect') clearShapeSelection();
        else setShape('rect');
      } else if (key === 'd' || key === 'в') {
        e.preventDefault();
        if (state.shape === 'arc') clearShapeSelection();
        else setShape('arc');
      } else if (key === 'c' || key === 'с') {
        e.preventDefault();
        if (state.shape === 'circle') clearShapeSelection();
        else setShape('circle');
      }
    });

    document.addEventListener('keyup', function(e) {
      if (e.key === 'Shift') state.shiftPressed = false;
      if (e.key === 'Alt') {
        if (state.altPressed) {
          state.altPressed = false;
          if (!state.drawingTemp) {
            releaseAllTempStrokes();
          }
        }
      }
    });

    // ============ ИНИЦИАЛИЗАЦИЯ ============
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setColor('#d32f2f');
    setSize(4);
    setEraserSize(8);
    setTool('pen');
    updateUndoButtons();
  }

  // Автозапуск
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();