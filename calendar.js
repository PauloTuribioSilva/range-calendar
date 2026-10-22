(() => {
  const DOW = ['S','T','Q','Q','S','S','D'];
  const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const cal       = document.getElementById('calendar');
  const rangeLyr  = document.getElementById('range-layer');
  const yearEl    = document.getElementById('month-year');
  const nameEl    = document.getElementById('month-name');
  const statusEl  = document.getElementById('status-dates');
  const hintEl    = document.getElementById('hint');
  const prevBtn   = document.getElementById('btn-prev');
  const nextBtn   = document.getElementById('btn-next');
  const monthBtn  = document.getElementById('btn-month');
  const clearBtn  = document.getElementById('btn-clear');

  const today = new Date(2026, 0, 1);
  let viewYear  = today.getFullYear();
  let viewMonth = today.getMonth();
  let start = null;
  let end   = null;
  let hover = null;

  const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const sameDay = (a,b) => a && b && ymd(a) === ymd(b);
  const cmp = (a,b) => a - b;
  const fmtShort = d => d ? d.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }).replace('.', '') : '';
  const firstOfMonth = (y,m) => new Date(y, m, 1);
  const daysInMonth  = (y,m) => new Date(y, m+1, 0).getDate();
  const mondayIndex  = d => (d.getDay() + 6) % 7;

  function render() {
    yearEl.textContent = viewYear;
    nameEl.textContent = MONTHS[viewMonth];

    [...cal.querySelectorAll('.dow, .blank, .day')].forEach(el => el.remove());
    rangeLyr.innerHTML = '';

    for (const d of DOW) {
      const el = document.createElement('div');
      el.className = 'dow';
      el.textContent = d;
      el.setAttribute('role', 'columnheader');
      cal.appendChild(el);
    }

    const lead  = mondayIndex(firstOfMonth(viewYear, viewMonth));
    const total = daysInMonth(viewYear, viewMonth);
    const trail = (7 - ((lead + total) % 7)) % 7;

    for (let i = 0; i < lead; i++) {
      const b = document.createElement('div');
      b.className = 'blank';
      b.setAttribute('aria-hidden', 'true');
      cal.appendChild(b);
    }

    for (let day = 1; day <= total; day++) {
      const date = new Date(viewYear, viewMonth, day);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'day';
      btn.textContent = day;
      btn.dataset.date = ymd(date);

      paintCell(btn, date);

      btn.setAttribute('aria-selected', (sameDay(date, start) || sameDay(date, end)) ? 'true' : 'false');
      btn.setAttribute('aria-label', date.toLocaleDateString('pt-BR', {
        weekday:'long', day:'numeric', month:'long', year:'numeric'
      }));

      btn.addEventListener('click', () => pick(date));
      btn.addEventListener('mouseenter', () => {
        hover = date;
        if (start && !end) paintPreview();
      });
      btn.addEventListener('mouseleave', () => {
        hover = null;
        if (start && !end) paintPreview();
      });

      cal.appendChild(btn);
    }

    for (let i = 0; i < trail; i++) {
      const b = document.createElement('div');
      b.className = 'blank';
      b.setAttribute('aria-hidden', 'true');
      cal.appendChild(b);
    }

    requestAnimationFrame(paintRangeLayer);

    if (start && !end && hover) paintPreview();
    updateStatus();
  }

  function paintCell(btn, date) {
    delete btn.dataset.inrange;
    delete btn.dataset.endpoint;

    if (!start) return;

    const isStart = sameDay(date, start);
    const isEnd   = end && sameDay(date, end);

    if (isStart || isEnd) btn.dataset.endpoint = 'true';

    if (start && end && cmp(start, end) !== 0) {
      const [lo, hi] = cmp(start, end) < 0 ? [start, end] : [end, start];
      const strictlyInside = cmp(date, lo) > 0 && cmp(date, hi) < 0;
      if (strictlyInside) btn.dataset.inrange = 'true';
    }
  }

  function paintRangeLayer() {
    rangeLyr.innerHTML = '';

    const effEnd = end ?? (start && hover ? hover : null);
    if (!start || !effEnd) return;

    const [lo, hi] = cmp(start, effEnd) <= 0 ? [start, effEnd] : [effEnd, start];

    const calRect = cal.getBoundingClientRect();
    const days = [...cal.querySelectorAll('.day')];
    if (!days.length) return;

    const rows = new Map();
    for (const el of days) {
      const r = el.getBoundingClientRect();
      const key = Math.round(r.top - calRect.top);
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key).push({ el, r });
    }

    for (const [, cells] of rows) {
      cells.sort((a,b) => a.r.left - b.r.left);

      const inRow = cells.filter(({ el }) => {
        const d = new Date(el.dataset.date + 'T00:00:00');
        return cmp(d, lo) >= 0 && cmp(d, hi) <= 0;
      });
      if (!inRow.length) continue;

      const first = inRow[0];
      const last  = inRow[inRow.length - 1];

      const firstIsEndpoint = sameDay(new Date(first.el.dataset.date + 'T00:00:00'), lo);
      const lastIsEndpoint  = sameDay(new Date(last.el.dataset.date + 'T00:00:00'), hi);

      const firstCenter = first.r.left - calRect.left + first.r.width / 2;
      const lastCenter  = last.r.left  - calRect.left + last.r.width  / 2;

      const top    = first.r.top - calRect.top;
      const height = first.r.height;

      const isPreview = !end && effEnd && cmp(start, effEnd) !== 0;

      const bar = document.createElement('div');
      bar.className = 'range-bar' + (isPreview ? ' preview' : '');

      const left  = firstIsEndpoint ? firstCenter : first.r.left - calRect.left;
      const right = lastIsEndpoint  ? lastCenter  : last.r.right - calRect.left;

      bar.style.left   = `${left}px`;
      bar.style.width  = `${right - left}px`;
      bar.style.top    = `${top}px`;
      bar.style.height = `${height}px`;

      rangeLyr.appendChild(bar);
    }
  }

  function paintPreview() {
    const cells = cal.querySelectorAll('.day');
    cells.forEach(c => { delete c.dataset.preview; });

    if (start && !end && hover) {
      const [lo, hi] = cmp(start, hover) <= 0 ? [start, hover] : [hover, start];
      cells.forEach(c => {
        const d = new Date(c.dataset.date + 'T00:00:00');
        if (cmp(d, lo) > 0 && cmp(d, hi) < 0) c.dataset.preview = 'true';
      });
    }

    paintRangeLayer();
  }

  function pick(date) {
    if (!start || (start && end)) { start = date; end = null; }
    else {
      if (cmp(date, start) < 0) { end = start; start = date; }
      else if (cmp(date, start) === 0) { end = null; }
      else { end = date; }
    }
    hover = null;
    render();
  }

  function updateStatus() {
    if (!start) {
      statusEl.innerHTML = '—';
      hintEl.textContent = 'Clique no início, depois no fim do período.';
    } else if (!end) {
      statusEl.innerHTML = `<strong>${fmtShort(start)}</strong> → …`;
      hintEl.textContent = 'Agora escolha o fim do período.';
    } else {
      const days = Math.round((end - start) / 86400000) + 1;
      statusEl.innerHTML = `<strong>${fmtShort(start)}</strong> → <strong>${fmtShort(end)}</strong>`;
      hintEl.textContent = `${days} dia${days > 1 ? 's' : ''} selecionado${days > 1 ? 's' : ''} · clique em qualquer dia para recomeçar`;
    }
  }

  function go(delta) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    viewYear = d.getFullYear();
    viewMonth = d.getMonth();
    render();
  }
  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));
  monthBtn.addEventListener('click', () => {
    viewYear = today.getFullYear();
    viewMonth = today.getMonth();
    render();
  });
  clearBtn.addEventListener('click', () => {
    start = end = hover = null;
    render();
  });

  cal.addEventListener('keydown', e => {
    const btn = document.activeElement.closest?.('.day');
    if (!btn) return;
    const map = { ArrowLeft:-1, ArrowRight:1, ArrowUp:-7, ArrowDown:7 };
    if (!(e.key in map)) return;
    e.preventDefault();
    const cur = new Date(btn.dataset.date + 'T00:00:00');
    cur.setDate(cur.getDate() + map[e.key]);
    if (cur.getMonth() !== viewMonth || cur.getFullYear() !== viewYear) {
      viewYear = cur.getFullYear();
      viewMonth = cur.getMonth();
      render();
    }
    const next = cal.querySelector(`.day[data-date="${ymd(cur)}"]`);
    next?.focus();
  });

  window.addEventListener('resize', () => paintRangeLayer());

  render();
})();
