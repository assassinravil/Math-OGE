/* ================================================================
   Геометрия 7–9 · ОГЭ — общий движок
   - проверка ответов (числа, дроби, корни, несколько полей, ответы №19)
   - подсказки, прогресс (сохраняется в браузере)
   - режим учителя по коду: ответы и решения у каждой задачи
   ================================================================ */
(function(){
  'use strict';

  /* ►►► Код для режима учителя. Поменяйте на свой. ◄◄◄ */
  var TEACHER_CODE = 'geo2027';

  /* ---------- безопасное хранилище ---------- */
  var store = {
    get: function(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
    set: function(k,v){ try{ localStorage.setItem(k,v); }catch(e){} },
    del: function(k){ try{ localStorage.removeItem(k); }catch(e){} }
  };
  window.GeoStore = store;

  /* ---------- разбор ответа ---------- */
  function norm(s){
    return String(s == null ? '' : s).toLowerCase()
      .replace(/[\s ]+/g,'')
      .replace(/[−–—]/g,'-')
      .replace(/,/g,'.')
      .replace(/°|градус(а|ов)?|град\.?/g,'')
      .replace(/(см²|см2|см|мм|дм|км|м²|м2|м)$/,'')
      .replace(/×/g,'*').replace(/·/g,'*').replace(/:/g,'/');
  }
  function toNumber(s){
    var t = norm(s);
    if(t === '') return NaN;
    if(/^-?\d+(\.\d+)?$/.test(t)) return parseFloat(t);
    // корни: 2√5, √(20), sqrt(20)
    t = t.replace(/sqrt/g,'√');
    t = t.replace(/√\(/g,'S(');
    t = t.replace(/√(\d+(\.\d+)?)/g,'S($1)');
    // неявное умножение: 2S(5), 2(3), )(
    t = t.replace(/(\d|\))(S|\()/g,'$1*$2');
    if(!/^[0-9.+\-*/()S]+$/.test(t)) return NaN;
    t = t.replace(/S\(/g,'Math.sqrt(');
    try{ var v = Function('"use strict";return (' + t + ');')(); return (typeof v === 'number' && isFinite(v)) ? v : NaN; }
    catch(e){ return NaN; }
  }
  function sameDigits(a,b){
    var x = norm(a).replace(/[^0-9]/g,'').split('').sort().join('');
    var y = norm(b).replace(/[^0-9]/g,'').split('').sort().join('');
    return x.length > 0 && x === y;
  }
  function matches(user, spec, mode){
    var alts = String(spec).split('|');
    for(var i=0;i<alts.length;i++){
      var a = alts[i];
      if(mode === 'digits'){ if(sameDigits(user,a)) return true; continue; }
      if(mode === 'text'){ if(norm(user) === norm(a)) return true; continue; }
      var u = toNumber(user), v = toNumber(a);
      if(!isNaN(u) && !isNaN(v)){ if(Math.abs(u - v) < 1e-6 * Math.max(1, Math.abs(v))) return true; }
      else if(norm(user) !== '' && norm(user) === norm(a)) return true;
    }
    return false;
  }
  window.GeoCheck = { matches: matches, toNumber: toNumber };

  /* ---------- тост ---------- */
  var toastEl;
  function toast(msg){
    if(!toastEl){ toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function(){ toastEl.classList.remove('show'); }, 1800);
  }
  window.GeoToast = toast;

  /* ---------- прогресс ---------- */
  var LESSON = document.body.getAttribute('data-lesson') || '';
  var solved = {};
  if(LESSON){ try{ solved = JSON.parse(store.get('geo:solved:' + LESSON) || '{}') || {}; }catch(e){ solved = {}; } }
  var allTasks = [];
  function saveProgress(){
    if(!LESSON) return;
    var counted = allTasks.filter(function(t){ return !t.hasAttribute('data-nocount'); });
    var n = counted.filter(function(t){ return solved[t.dataset.id]; }).length;
    store.set('geo:solved:' + LESSON, JSON.stringify(solved));
    store.set('geo:progress:' + LESSON, JSON.stringify({ solved: n, total: counted.length }));
    var bar = document.querySelector('.progress-bar i'), lbl = document.querySelector('.progress-pill b');
    if(bar) bar.style.width = (counted.length ? 100 * n / counted.length : 0) + '%';
    if(lbl) lbl.textContent = n + ' / ' + counted.length;
  }

  /* ---------- задачи ---------- */
  function firstAlt(spec){ return String(spec).split('|')[0]; }

  function setupTask(task, idx){
    if(!task.dataset.id){
      var sec = task.closest('section');
      task.dataset.id = (sec && sec.id ? sec.id : 's') + '-' + idx;
    }
    var inputs = Array.prototype.slice.call(task.querySelectorAll('input.ans'));
    var mode = task.getAttribute('data-mode') || '';

    // ответ для учителя: создаём блок, если его нет, и добавляем строку «Ответ»
    var sol = task.querySelector('.sol');
    if(!sol){ sol = document.createElement('div'); sol.className = 'sol'; task.appendChild(sol); }
    sol.classList.add('teacher-only');
    var answerText = task.getAttribute('data-answer-text');
    if(!answerText && inputs.length){
      answerText = inputs.map(function(i){
        var lab = i.getAttribute('data-label');
        return (lab ? lab + ' = ' : '') + firstAlt(i.getAttribute('data-a')).replace(/\./g, ',');
      }).join('; ');
    }
    if(answerText && !task.hasAttribute('data-noauto')){
      var al = document.createElement('div'); al.className = 'ansline'; al.textContent = 'Ответ: ' + answerText;
      sol.insertBefore(al, sol.firstChild);
    }

    if(!inputs.length){ // задачи без полей (доказательства) не входят в счётчик; игры и тренажёры — входят
      if(!task.hasAttribute('data-noauto')) task.setAttribute('data-nocount', '');
      return;
    }

    // кнопки
    var actions = task.querySelector('.task-actions');
    if(!actions){ actions = document.createElement('div'); actions.className = 'task-actions'; sol.parentNode.insertBefore(actions, sol); }
    var btn = document.createElement('button'); btn.className = 'btn small'; btn.type = 'button'; btn.textContent = 'Проверить';
    actions.appendChild(btn);
    var hint = task.querySelector('.hint');
    if(hint){
      var hb = document.createElement('button'); hb.className = 'btn small ghost'; hb.type = 'button'; hb.textContent = 'Подсказка';
      hb.addEventListener('click', function(){ hint.classList.toggle('show'); });
      actions.appendChild(hb);
      actions.parentNode.insertBefore(hint, actions.nextSibling);
    }
    var fb = document.createElement('span'); fb.className = 'feedback'; actions.appendChild(fb);

    function check(silent){
      var allOk = true, empty = false;
      inputs.forEach(function(inp){
        var ok = matches(inp.value, inp.getAttribute('data-a'), inp.getAttribute('data-mode') || mode);
        if(inp.value.trim() === '') empty = true;
        inp.classList.toggle('good', ok);
        inp.classList.toggle('wrong', !ok && inp.value.trim() !== '');
        if(!ok) allOk = false;
      });
      if(silent) return allOk;
      if(empty && !allOk){ fb.className = 'feedback bad'; fb.textContent = 'Заполните все поля'; return; }
      task.classList.toggle('ok', allOk); task.classList.toggle('bad', !allOk);
      if(allOk){
        fb.className = 'feedback ok'; fb.textContent = '✓ Верно!';
        if(!solved[task.dataset.id]){ solved[task.dataset.id] = 1; saveProgress(); toast('Задача решена ✓'); }
      } else {
        task._tries = (task._tries || 0) + 1;
        fb.className = 'feedback bad';
        fb.textContent = task._tries >= 2 && hint ? '✗ Пока неверно — загляните в подсказку' : '✗ Пока неверно, попробуйте ещё';
      }
    }
    btn.addEventListener('click', function(){ check(false); });
    inputs.forEach(function(inp){ inp.addEventListener('keydown', function(e){ if(e.key === 'Enter') check(false); }); });

    // восстановить решённые
    if(solved[task.dataset.id]){
      task.classList.add('ok'); fb.className = 'feedback ok'; fb.textContent = '✓ Решено ранее';
    }
  }

  /* ---------- навигация по секциям ---------- */
  function buildNav(){
    var links = document.querySelector('.topnav .links');
    if(!links) return;
    document.querySelectorAll('section[data-nav]').forEach(function(s){
      var a = document.createElement('a'); a.href = '#' + s.id; a.textContent = s.getAttribute('data-nav');
      links.appendChild(a);
    });
  }

  /* ---------- режим учителя ---------- */
  function setTeacher(on){
    document.body.classList.toggle('teacher', on);
    if(on) store.set('geo:teacher','1'); else store.del('geo:teacher');
    var lock = document.querySelector('.tlock'); if(lock){ lock.textContent = on ? '🔓' : '🔒'; lock.title = on ? 'Выключить режим учителя' : 'Режим учителя'; }
  }
  function buildTeacher(){
    var lock = document.createElement('button'); lock.className = 'tlock'; lock.type = 'button'; lock.textContent = '🔒'; lock.title = 'Режим учителя';
    document.body.appendChild(lock);
    var modal = document.createElement('div'); modal.className = 'modal';
    modal.innerHTML = '<div class="dlg" role="dialog" aria-modal="true"><h3>Режим учителя</h3>' +
      '<div class="muted" style="font-size:14px">Покажет ответы и решения ко всем задачам на странице.</div>' +
      '<input type="password" placeholder="Код учителя" autocomplete="off">' +
      '<div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" type="button" data-x>Отмена</button><button class="btn" type="button" data-ok>Войти</button></div></div>';
    document.body.appendChild(modal);
    var inp = modal.querySelector('input');
    function close(){ modal.classList.remove('show'); inp.value = ''; }
    function tryIn(){
      if(inp.value.trim() === TEACHER_CODE){ setTeacher(true); close(); toast('Режим учителя включён'); }
      else { inp.style.borderColor = 'var(--a)'; toast('Неверный код'); }
    }
    lock.addEventListener('click', function(){
      if(document.body.classList.contains('teacher')){ setTeacher(false); toast('Режим учителя выключен'); }
      else { modal.classList.add('show'); inp.style.borderColor = ''; setTimeout(function(){ inp.focus(); }, 50); }
    });
    modal.querySelector('[data-x]').addEventListener('click', close);
    modal.querySelector('[data-ok]').addEventListener('click', tryIn);
    inp.addEventListener('keydown', function(e){ if(e.key === 'Enter') tryIn(); if(e.key === 'Escape') close(); });
    modal.addEventListener('click', function(e){ if(e.target === modal) close(); });
    setTeacher(store.get('geo:teacher') === '1');
  }

  /* ---------- SVG-помощники для лабораторий ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  var G = {
    el: function(t, a, parent){ var e = document.createElementNS(NS, t); for(var k in a) e.setAttribute(k, a[k]); if(parent) parent.appendChild(e); return e; },
    clear: function(svg){ while(svg.firstChild) svg.removeChild(svg.firstChild); },
    dist: function(p, q){ return Math.hypot(p.x - q.x, p.y - q.y); },
    mid: function(p, q){ return {x:(p.x + q.x) / 2, y:(p.y + q.y) / 2}; },
    angle: function(p, q, r){ // угол при вершине p, в градусах
      var a1 = Math.atan2(q.y - p.y, q.x - p.x), a2 = Math.atan2(r.y - p.y, r.x - p.x);
      var d = Math.abs(a1 - a2); if(d > Math.PI) d = 2 * Math.PI - d; return d * 180 / Math.PI;
    },
    unit: function(p, q){ var l = Math.hypot(q.x - p.x, q.y - p.y) || 1; return {x:(q.x - p.x) / l, y:(q.y - p.y) / l}; },
    foot: function(p, a, b){ // основание перпендикуляра из p на прямую ab
      var dx = b.x - a.x, dy = b.y - a.y, t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
      return {x:a.x + t * dx, y:a.y + t * dy, t:t};
    },
    arc: function(svg, p, q, r, rad, color, w){
      var u1 = G.unit(p, q), u2 = G.unit(p, r), cross = u1.x * u2.y - u1.y * u2.x;
      var s = {x:p.x + rad * u1.x, y:p.y + rad * u1.y}, e = {x:p.x + rad * u2.x, y:p.y + rad * u2.y};
      return G.el('path', {d:'M' + s.x + ' ' + s.y + ' A' + rad + ' ' + rad + ' 0 0 ' + (cross > 0 ? 1 : 0) + ' ' + e.x + ' ' + e.y, fill:'none', stroke:color, 'stroke-width':w || 3}, svg);
    },
    rightMark: function(svg, p, q, r, size, color){ // значок прямого угла при p
      var u1 = G.unit(p, q), u2 = G.unit(p, r), s = size || 12;
      return G.el('path', {d:'M' + (p.x + s * u1.x) + ' ' + (p.y + s * u1.y) + ' L' + (p.x + s * u1.x + s * u2.x) + ' ' + (p.y + s * u1.y + s * u2.y) + ' L' + (p.x + s * u2.x) + ' ' + (p.y + s * u2.y), fill:'none', stroke:color || 'currentColor', 'stroke-width':2}, svg);
    },
    tick: function(svg, p, q, n, color){ // штрихи равенства на отрезке pq
      var m = G.mid(p, q), u = G.unit(p, q), nx = -u.y, ny = u.x;
      for(var i = 0; i < (n || 1); i++){
        var off = (i - ((n || 1) - 1) / 2) * 6;
        G.el('line', {x1:m.x + off * u.x - 7 * nx, y1:m.y + off * u.y - 7 * ny, x2:m.x + off * u.x + 7 * nx, y2:m.y + off * u.y + 7 * ny, stroke:color || 'currentColor', 'stroke-width':2.2}, svg);
      }
    },
    text: function(svg, x, y, txt, cls, style){ var t = G.el('text', {x:x, y:y, 'text-anchor':'middle', 'class':cls || 'tx'}, svg); if(style) t.setAttribute('style', style); t.textContent = txt; return t; },
    angleLabel: function(svg, p, q, r, dist, txt, color){
      var u1 = G.unit(p, q), u2 = G.unit(p, r), m = {x:u1.x + u2.x, y:u1.y + u2.y}, l = Math.hypot(m.x, m.y) || 1;
      return G.text(svg, p.x + dist * m.x / l, p.y + dist * m.y / l + 5, txt, 'tx', 'fill:' + color + ';font-size:14px');
    },
    handle: function(svg, p, name, color){
      G.el('circle', {cx:p.x, cy:p.y, r:11, fill:color || '#2f5bea', 'fill-opacity':'.18', stroke:color || '#2f5bea', 'stroke-width':2, 'class':'handle', 'data-v':name}, svg);
    },
    /* перетаскивание: svg, функция (имя, точка) → true, если принять */
    draggable: function(svg, onMove){
      var drag = null;
      function pos(e){ var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); }
      svg.addEventListener('pointerdown', function(e){ var v = e.target.getAttribute && e.target.getAttribute('data-v'); if(v){ drag = v; svg.setPointerCapture(e.pointerId); e.preventDefault(); } });
      svg.addEventListener('pointermove', function(e){ if(drag) onMove(drag, pos(e)); });
      svg.addEventListener('pointerup', function(){ drag = null; });
      svg.addEventListener('pointercancel', function(){ drag = null; });
    },
    triArea: function(a, b, c){ return Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2; }
  };
  window.GeoSVG = G;

  /* ---------- построитель графиков функций ----------
     var P = GeoPlot(svg, {xmin:-6, xmax:6, ymin:-5, ymax:7, w:600, h:420});
     P.grid(); P.curve(function(x){ return x*x; }, '#2f5bea'); P.point(1, 1, '#e5484d', 'A');  */
  window.GeoPlot = function(svg, o){
    var W = o.w || 600, H = o.h || 420, x0 = o.xmin, x1 = o.xmax, y0 = o.ymin, y1 = o.ymax;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    function X(x){ return (x - x0) / (x1 - x0) * W; }
    function Y(y){ return H - (y - y0) / (y1 - y0) * H; }
    var P = {X:X, Y:Y, W:W, H:H,
      invX:function(px){ return x0 + px / W * (x1 - x0); },
      invY:function(py){ return y0 + (H - py) / H * (y1 - y0); },
      clear:function(){ G.clear(svg); }};
    P.grid = function(){
      var stepL = (x1 - x0) > 24 ? 5 : ((x1 - x0) > 14 ? 2 : 1), stepLy = (y1 - y0) > 24 ? 5 : ((y1 - y0) > 14 ? 2 : 1);
      for(var x = Math.ceil(x0); x <= x1; x++) G.el('line', {x1:X(x), y1:0, x2:X(x), y2:H, stroke:'var(--line)', 'stroke-width':1}, svg);
      for(var y = Math.ceil(y0); y <= y1; y++) G.el('line', {x1:0, y1:Y(y), x2:W, y2:Y(y), stroke:'var(--line)', 'stroke-width':1}, svg);
      G.el('line', {x1:0, y1:Y(0), x2:W, y2:Y(0), stroke:'var(--muted)', 'stroke-width':1.6}, svg);
      G.el('line', {x1:X(0), y1:0, x2:X(0), y2:H, stroke:'var(--muted)', 'stroke-width':1.6}, svg);
      G.el('path', {d:'M' + (W - 10) + ' ' + (Y(0) - 5) + ' L' + W + ' ' + Y(0) + ' L' + (W - 10) + ' ' + (Y(0) + 5), fill:'none', stroke:'var(--muted)', 'stroke-width':1.6}, svg);
      G.el('path', {d:'M' + (X(0) - 5) + ' 10 L' + X(0) + ' 0 L' + (X(0) + 5) + ' 10', fill:'none', stroke:'var(--muted)', 'stroke-width':1.6}, svg);
      for(x = Math.ceil(x0 / stepL) * stepL; x < x1; x += stepL) if(x !== 0 && X(x) > 14 && X(x) < W - 14) G.text(svg, X(x), Y(0) + 16, String(x).replace('-', '−'), 'txs', 'font-size:12px');
      for(y = Math.ceil(y0 / stepLy) * stepLy; y < y1; y += stepLy) if(y !== 0 && Y(y) > 12 && Y(y) < H - 8) G.text(svg, X(0) - 12, Y(y) + 4, String(y).replace('-', '−'), 'txs', 'font-size:12px');
      G.text(svg, X(0) - 10, Y(0) + 16, '0', 'txs', 'font-size:12px');
      G.text(svg, W - 12, Y(0) - 8, 'x', 'tx', 'font-size:14px'); G.text(svg, X(0) + 12, 14, 'y', 'tx', 'font-size:14px');
    };
    P.curve = function(f, color, opt){
      opt = opt || {}; var a = opt.from != null ? opt.from : x0, b = opt.to != null ? opt.to : x1, n = 600, d = '', pen = false, py = null;
      for(var i = 0; i <= n; i++){
        var x = a + (b - a) * i / n, y = f(x), sy = Y(y);
        var ok = typeof y === 'number' && isFinite(y) && sy > -H && sy < 2 * H;
        if(ok && pen && py !== null && Math.abs(sy - py) > H * 0.9) pen = false;
        if(ok){ d += (pen ? ' L' : ' M') + X(x).toFixed(2) + ' ' + sy.toFixed(2); pen = true; py = sy; } else { pen = false; py = null; }
      }
      return G.el('path', {d:d, fill:'none', stroke:color || '#2f5bea', 'stroke-width':opt.width || 3, 'stroke-dasharray':opt.dash || '', 'stroke-linecap':'round', 'clip-path':''}, svg);
    };
    P.point = function(x, y, color, label, hollow){
      G.el('circle', {cx:X(x), cy:Y(y), r:5, fill:hollow ? 'var(--card)' : (color || '#e5484d'), stroke:color || '#e5484d', 'stroke-width':2}, svg);
      if(label) G.text(svg, X(x) + 14, Y(y) - 10, label, 'tx', 'font-size:13px;fill:' + (color || '#e5484d'));
    };
    P.seg = function(xa, ya, xb, yb, color, w, dash){ return G.el('line', {x1:X(xa), y1:Y(ya), x2:X(xb), y2:Y(yb), stroke:color || 'currentColor', 'stroke-width':w || 2, 'stroke-dasharray':dash || ''}, svg); };
    P.text = function(x, y, t, color, size){ return G.text(svg, X(x), Y(y), t, 'tx', 'font-size:' + (size || 14) + 'px;fill:' + (color || 'var(--ink)')); };
    return P;
  };

  /* ---------- тренажёр с генератором задач ----------
     GeoTrainer(rootEl, {rounds, gen: () => ({q: html, a: '...', why: '...'}), id})  */
  window.GeoTrainer = function(root, cfg){
    var rounds = cfg.rounds || 6, round = 0, score = 0, cur = null, done = false;
    root.innerHTML = '<div class="controls" style="justify-content:space-between;margin:0"><b data-r></b><span class="pill" data-s>Верно: 0</span></div>' +
      '<p data-q style="margin:10px 0"></p><div class="ans-row" style="margin:0"><label>Ответ: <input class="ans" data-in></label>' +
      '<button class="btn small" type="button" data-c>Проверить</button><button class="btn small ghost" type="button" data-n style="display:none">Дальше →</button></div>' +
      '<div class="feedback" data-f style="margin-top:8px"></div>';
    var q = root.querySelector('[data-q]'), inp = root.querySelector('[data-in]'), fb = root.querySelector('[data-f]');
    var nb = root.querySelector('[data-n]'), cb = root.querySelector('[data-c]');
    function next(){
      if(round >= rounds){ round = 0; score = 0; }
      round++; done = false; cur = cfg.gen();
      q.innerHTML = cur.q; inp.value = ''; inp.className = 'ans'; fb.textContent = ''; fb.className = 'feedback'; nb.style.display = 'none'; cb.style.display = '';
      root.querySelector('[data-r]').textContent = 'Раунд ' + round + ' / ' + rounds;
      root.querySelector('[data-s]').textContent = 'Верно: ' + score;
      if(cfg.onRound) cfg.onRound(cur);
    }
    function check(){
      if(done || inp.value.trim() === '') return; done = true;
      var ok = matches(inp.value, cur.a, cur.mode);
      if(ok) score++;
      inp.className = 'ans ' + (ok ? 'good' : 'wrong');
      fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
      fb.innerHTML = (ok ? '✓ Верно. ' : '✗ Ответ: ' + String(cur.a).split('|')[0].replace('.', ',') + '. ') + (cur.why || '');
      root.querySelector('[data-s]').textContent = 'Верно: ' + score;
      cb.style.display = 'none'; nb.style.display = '';
      if(round >= rounds){
        var pass = score >= Math.ceil(rounds * 0.7);
        fb.innerHTML += '<br><b>' + (pass ? 'Тренажёр пройден: ' : 'Итог: ') + score + ' из ' + rounds + (pass ? ' 🎉' : '. Попробуйте ещё раз.') + '</b>';
        nb.textContent = 'Ещё раз ↻';
        if(pass && cfg.id){ window.GeoMarkSolved(cfg.id); var t = root.closest('.task'); if(t) t.classList.add('ok'); }
      } else nb.textContent = 'Дальше →';
    }
    cb.addEventListener('click', check); nb.addEventListener('click', next);
    inp.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ if(done) next(); else check(); } });
    next();
  };
  window.GeoRand = function(a, b){ return a + Math.floor(Math.random() * (b - a + 1)); };
  window.GeoPick = function(arr){ return arr[Math.floor(Math.random() * arr.length)]; };

  /* ---------- сброс прогресса ---------- */
  window.GeoResetLesson = function(){
    if(!LESSON) return;
    if(!confirm('Сбросить прогресс этого занятия?')) return;
    store.del('geo:solved:' + LESSON); store.del('geo:progress:' + LESSON); location.reload();
  };

  /* ---------- запуск ---------- */
  function init(){
    buildNav();
    allTasks = Array.prototype.slice.call(document.querySelectorAll('.task'));
    allTasks.forEach(setupTask);
    document.querySelectorAll('.hw .sol, .hw-sol').forEach(function(s){ s.classList.add('teacher-only'); if(!s.classList.contains('sol')) s.classList.add('sol'); });
    buildTeacher();
    saveProgress();
    document.dispatchEvent(new CustomEvent('geo:ready'));
  }
  window.GeoMarkSolved = function(id){ if(!solved[id]){ solved[id] = 1; saveProgress(); } };
  window.GeoIsSolved = function(id){ return !!solved[id]; };
  window.GeoRegisterExtra = function(el){ allTasks.push(el); saveProgress(); };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
