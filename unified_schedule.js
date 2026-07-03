  /* ── THEME ───────────────────────────────────────────── */
  (function () {
    const THEME_KEY = 'cqw-theme';
    const root      = document.documentElement;

    function applyTheme(t) {
      root.dataset.theme = t || 'dark';
      document.querySelectorAll('[data-theme-btn]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.themeBtn === (t || 'dark'));
      });
      localStorage.setItem(THEME_KEY, t || 'dark');
    }

    // Apply saved or default before first paint
    applyTheme(localStorage.getItem(THEME_KEY) || 'dark');

    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('[data-theme-btn]').forEach(btn => {
        btn.addEventListener('click', () => applyTheme(btn.dataset.themeBtn));
      });
      // Re-apply to set active state on buttons now that they're in the DOM
      applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
    });
  })();

  function showTab(name) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + name)?.classList.add('active');
    // event.target only exists on real clicks; fall back to finding the button by name
    if (event?.target?.classList) {
      event.target.classList.add('active');
      document.querySelector('.tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      document.querySelector(`.tab[onclick*="'${name}'"]`)?.classList.add('active');
    }
  }

  function toggleWeek(header) {
    const card = header.parentElement;
    card.classList.toggle('open');
  }

  // Week 2 (current) opens by default; all others closed.
  document.querySelectorAll('.week-card').forEach(c => {
    if (!c.classList.contains('current')) c.classList.remove('open');
  });
/* ═══════════════════════════════════════════════════════════
   CQIEA Sprint State v2
   Features: persistence · auto-jump · dashboard · today card
             quiz mode · daily journals
   Leave sprint: June 17 – July 15 2026 (Days 1–29)
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── STORAGE ─────────────────────────────────────────── */
  const STORAGE_KEY = 'cqw-sprint-v1';
  function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'); } catch { return {}; } }
  function save(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

  /* ── SPRINT TIMING ───────────────────────────────────── */
  const SPRINT_START = new Date(2026, 5, 17);
  const MILESTONES   = [
    { day:21, label:'Mock #1',         short:'Mock #1'  },
    { day:22, label:'Applications ⭐', short:'Apps ⭐'   },
    { day:26, label:'Mock #2',         short:'Mock #2'  },
    { day:29, label:'Sprint End',      short:'End'      },
  ];

  function sprintDay() {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff  = Math.round((today - SPRINT_START) / 86400000);
    return (diff >= 0 && diff <= 28) ? diff + 1 : null;
  }

  function sprintDateStr(day) {
    const d = day || sprintDay();
    if (!d) return '';
    const dt = new Date(SPRINT_START.getTime() + (d - 1) * 86400000);
    return dt.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }).toUpperCase();
  }

  /* ── CHECKBOX REGISTRY (cross-sync today card ↔ day blocks) ── */
  const cbRegistry = new Map();

  function registerCb(key, cb) {
    if (!cbRegistry.has(key)) cbRegistry.set(key, new Set());
    cbRegistry.get(key).add(cb);
  }

  function syncCb(key, checked, source) {
    const s = load(); s[key] = checked; save(s);
    cbRegistry.get(key)?.forEach(cb => {
      if (cb !== source) cb.checked = checked;
      cb.closest('.task, .tc-task-row')?.classList.toggle('task-done', checked);
    });
  }

  /* ── ANNOTATE WEEK CARDS ─────────────────────────────── */
  function annotateWeekCards() {
    document.querySelectorAll('.week-card').forEach(card => {
      const numEl = card.querySelector('.week-num');
      if (!numEl) return;
      const m = numEl.textContent.match(/LEAVE\s+WK\s+(\d+)/i);
      if (!m) return;
      card.dataset.leaveWeek = m[1];
      const header = card.querySelector('.week-header');
      if (!header || header.querySelector('.week-progress')) return;
      const badge  = document.createElement('span');
      badge.className = 'week-progress';
      const toggle = header.querySelector('.week-toggle');
      toggle ? header.insertBefore(badge, toggle) : header.appendChild(badge);
    });
  }

  /* ── ANNOTATE DAY BLOCKS ─────────────────────────────── */
  function annotateDayBlocks() {
    document.querySelectorAll('.day-name').forEach(el => {
      const m = el.textContent.trim().match(/^Day\s+(\d+)\s*[—–-]/);
      if (!m) return;
      const block = el.closest('.day-block');
      if (!block) return;
      block.dataset.sprintDay = parseInt(m[1]);
      block.id = `sprint-day-${m[1]}`;
    });
  }

  /* ── DISCIPLINE DETECTION ───────────────────────────── */
  function discipline(task) {
    const tag = task.querySelector('.task-tag');
    if (!tag) return null;
    if (tag.classList.contains('code'))      return 'code';
    if (tag.classList.contains('file-def'))  return 'file';
    if (tag.classList.contains('interview')) return 'qa';
    return 'build';
  }

  /* ── CHECKBOX INJECTION (day blocks) ─────────────────── */
  function initCheckboxes() {
    document.querySelectorAll('[data-sprint-day]').forEach(block => {
      const day = block.dataset.sprintDay;
      block.querySelectorAll('.day-tasks .task').forEach((task, i) => {
        const disc = discipline(task);
        if (!disc || task.querySelector('.task-check')) return;
        const key = `d${day}-${disc}-${i}`;
        const s   = load();
        const cb  = document.createElement('input');
        cb.type = 'checkbox'; cb.className = 'task-check'; cb.checked = !!s[key];
        cb.setAttribute('aria-label', 'Mark done');
        if (cb.checked) task.classList.add('task-done');
        registerCb(key, cb);
        cb.addEventListener('change', () => {
          syncCb(key, cb.checked, cb);
          refreshWeekProgress(block.closest('[data-leave-week]'));
          refreshDashboard();
        });
        task.insertBefore(cb, task.firstChild);
      });
    });
  }

  /* ── WEEK PROGRESS ──────────────────────────────────── */
  function isDayDone(block) {
    return ['code','file-def','interview'].every(cls => {
      const task = [...block.querySelectorAll('.task')]
        .find(t => t.querySelector(`.task-tag.${cls}`));
      return task ? !!task.querySelector('.task-check:checked') : false;
    });
  }

  function refreshWeekProgress(weekCard) {
    if (!weekCard) return;
    const blocks = weekCard.querySelectorAll('[data-sprint-day]');
    if (!blocks.length) return;
    let done = 0;
    blocks.forEach(b => { if (isDayDone(b)) done++; });
    const badge = weekCard.querySelector('.week-progress');
    if (!badge) return;
    badge.textContent = `${done}/${blocks.length} days`;
    badge.classList.toggle('all-done', done === blocks.length);
  }

  function refreshAllProgress() {
    document.querySelectorAll('[data-leave-week]').forEach(refreshWeekProgress);
  }

  /* ── CODING BANK TOGGLES ────────────────────────────── */
  function initCodingBank() {
    const state = load();
    document.querySelectorAll('.coding-bank-table').forEach(table => {
      const thead = table.querySelector('thead tr');
      if (thead && !thead.querySelector('.check-col')) {
        const th = document.createElement('th');
        th.className = 'check-col'; th.textContent = '✓';
        thead.appendChild(th);
      }
      table.querySelectorAll('tbody tr').forEach(row => {
        if (row.querySelector('.check-col-td')) return;
        const name = (row.querySelector('td')?.textContent||'').trim().slice(0,50);
        const key  = 'pb-' + name.replace(/\W+/g,'_').toLowerCase().slice(0,40);
        const td = document.createElement('td'); td.className = 'check-col-td';
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.className = 'problem-check'; cb.checked = !!state[key];
        cb.setAttribute('aria-label', `Solved: ${name}`);
        if (cb.checked) row.classList.add('problem-solved');
        cb.addEventListener('change', () => {
          const s = load(); s[key] = cb.checked; save(s);
          row.classList.toggle('problem-solved', cb.checked);
          refreshDashboard();
          buildProgressTab();
        });
        td.appendChild(cb); row.appendChild(td);
      });
    });
  }

  /* ── DASHBOARD ──────────────────────────────────────── */
  function buildDashboard() {
    const hq = document.getElementById('sprint-hq');
    if (!hq) return;

    const dash = document.createElement('div');
    dash.id = 'sprint-dashboard';
    dash.innerHTML = `
      <div class="dash-metric"><div class="dash-val" id="dv-days">—</div><div class="dash-lbl">days done</div></div>
      <div class="dash-metric"><div class="dash-val" id="dv-probs">—</div><div class="dash-lbl">problems solved</div></div>
      <div class="dash-metric"><div class="dash-val" id="dv-streak">—</div><div class="dash-lbl">day streak</div></div>
      <div class="dash-metric"><div class="dash-val" id="dv-apps">—</div><div class="dash-lbl">days to apps</div></div>
    `;
    hq.appendChild(dash);

    const ms = document.createElement('div');
    ms.id = 'milestone-bar';
    MILESTONES.forEach(m => {
      const el = document.createElement('div');
      el.className = 'ms-item'; el.dataset.day = m.day;
      el.innerHTML = `<span class="ms-label">${m.short}</span><span class="ms-day">Day ${m.day}</span>`;
      ms.appendChild(el);
    });
    hq.appendChild(ms);
  }

  function refreshDashboard() {
    const today = sprintDay(); if (!today) return;
    const daysDone = [...document.querySelectorAll('[data-sprint-day]')].filter(b => isDayDone(b)).length;
    const probsSolved = document.querySelectorAll('.problem-check:checked').length;
    const appsIn = Math.max(0, 22 - today);

    let streak = 0;
    for (let d = today; d >= 1; d--) {
      const b = document.getElementById(`sprint-day-${d}`);
      if (b && isDayDone(b)) streak++;
      else break;
    }

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('dv-days',   daysDone);
    set('dv-probs',  probsSolved);
    set('dv-streak', streak > 0 ? `${streak}🔥` : '0');
    set('dv-apps',   today >= 22 ? '✓ done' : appsIn + 'd');

    document.querySelectorAll('.ms-item').forEach(el => {
      const d = parseInt(el.dataset.day);
      el.classList.toggle('ms-past',   today > d);
      el.classList.toggle('ms-current', today === d);
      el.classList.toggle('ms-future', today < d);
    });

    refreshCalendar();
  }

  /* ── TODAY CARD ─────────────────────────────────────── */
  function buildTodayCard() {
    const day = sprintDay(); if (!day) return;
    const hq  = document.getElementById('sprint-hq'); if (!hq) return;
    const block = document.getElementById(`sprint-day-${day}`); if (!block) return;

    const ICONS = { code:'🔢', file:'📁', qa:'🎤', build:'🔨' };

    const card = document.createElement('div');
    card.id = 'today-card';

    // Find next milestone
    const nextMs = MILESTONES.find(m => m.day >= day);
    const msText = nextMs
      ? (nextMs.day === day ? `${nextMs.label} — TODAY` : `${nextMs.label} in ${nextMs.day - day}d`)
      : 'Sprint complete';

    card.innerHTML = `
      <div class="tc-header">
        <span class="tc-day">DAY ${day} <span class="tc-of">/ 29</span></span>
        <span class="tc-date">${sprintDateStr(day)}</span>
        <span class="tc-ms">${msText}</span>
      </div>
      <div class="tc-tasks" id="tc-tasks"></div>
    `;

    const taskContainer = card.querySelector('#tc-tasks');

    block.querySelectorAll('.day-tasks .task').forEach((task, i) => {
      const disc = discipline(task);
      if (!disc) return;
      const key   = `d${day}-${disc}-${i}`;
      const textEl = task.querySelector('.task-text');

      let summary = '';
      if (disc === 'code') {
        summary = textEl?.querySelector('strong')?.textContent || textEl?.textContent?.slice(0,70) || '';
      } else if (disc === 'file') {
        summary = textEl?.querySelector('code')?.textContent || textEl?.textContent?.slice(0,50) || '';
      } else if (disc === 'qa') {
        const raw = textEl?.querySelector('em')?.textContent || textEl?.textContent?.slice(0,90) || '';
        summary = raw.replace(/^["\u201C]|["\u201D]$/g, '');
      } else {
        const tag = task.querySelector('.task-tag');
        summary = (tag?.textContent?.trim() || '') + ' — ' + (textEl?.textContent?.slice(0,40) || '');
      }
      summary = summary.trim().replace(/\s+/g, ' ');

      const row = document.createElement('div');
      row.className = 'tc-task-row';

      const s  = load();
      const cb = document.createElement('input');
      cb.type  = 'checkbox'; cb.className = 'task-check'; cb.checked = !!s[key];
      if (cb.checked) row.classList.add('task-done');
      registerCb(key, cb);

      cb.addEventListener('change', () => {
        syncCb(key, cb.checked, cb);
        row.classList.toggle('task-done', cb.checked);
        refreshWeekProgress(block.closest('[data-leave-week]'));
        refreshDashboard();
      });

      const icon = document.createElement('span');
      icon.className = 'tc-icon';
      icon.textContent = ICONS[disc] || '·';

      const text = document.createElement('span');
      text.className = 'tc-summary';
      text.textContent = summary;

      row.appendChild(cb);
      row.appendChild(icon);
      row.appendChild(text);
      taskContainer.appendChild(row);
    });

    hq.insertBefore(card, hq.firstChild);
  }

  /* ── QUIZ MODE ──────────────────────────────────────── */
  let quizData     = { qa:[], file:[], coding:[] };
  let quizMode     = 'qa';
  let quizIdx      = 0;
  let quizRevealed = false;

  function extractQuizItems() {
    const qa = [], file = [], coding = [];
    document.querySelectorAll('[data-sprint-day]').forEach(block => {
      const day = parseInt(block.dataset.sprintDay);
      block.querySelectorAll('.task').forEach(task => {
        const tag    = task.querySelector('.task-tag');
        const textEl = task.querySelector('.task-text');
        if (!tag || !textEl) return;
        if (tag.classList.contains('interview')) {
          const em = textEl.querySelector('em');
          qa.push({
            day,
            prompt: em ? em.textContent.replace(/^["\u201C]|["\u201D]$/g,'') : textEl.textContent.slice(0,100),
            answer: textEl.innerHTML,
          });
        } else if (tag.classList.contains('file-def')) {
          const code = textEl.querySelector('code');
          file.push({
            day,
            prompt: code ? code.textContent : '???',
            answer: textEl.innerHTML,
          });
        } else if (tag.classList.contains('code')) {
          const strong = textEl.querySelector('strong');
          coding.push({
            day,
            prompt: strong ? strong.textContent : textEl.textContent.slice(0,60),
            answer: textEl.innerHTML,
            tier:   tag.textContent.trim(),
          });
        }
      });
    });
    return { qa, file, coding };
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
    return a;
  }

  function renderQuizCard() {
    const items = quizData[quizMode];
    if (!items.length) return;
    quizRevealed  = false;
    const item    = items[quizIdx];

    const promptEl   = document.getElementById('qz-prompt');
    const answerEl   = document.getElementById('qz-answer');
    const metaEl     = document.getElementById('qz-meta');
    const revealBtn  = document.getElementById('qz-reveal');
    const actionsEl  = document.getElementById('qz-actions');
    const progressEl = document.getElementById('qz-progress');
    if (!promptEl) return;

    metaEl.textContent    = `Day ${item.day}`;
    progressEl.textContent= `${quizIdx+1} / ${items.length}`;
    answerEl.innerHTML    = item.answer;
    answerEl.style.display= 'none';
    revealBtn.style.display = '';
    actionsEl.style.display = 'none';

    promptEl.innerHTML = '';
    const qText = document.createElement('div');
    qText.className  = 'qz-question';
    qText.textContent = item.prompt;
    promptEl.appendChild(qText);
    if (item.tier) {
      const tier = document.createElement('div');
      tier.className = 'qz-tier';
      tier.textContent = item.tier;
      promptEl.appendChild(tier);
    }
  }

  function buildQuizMode() {
    const coursesTab = document.getElementById('tab-courses');
    if (!coursesTab) return;
    quizData = extractQuizItems();

    const wrap = document.createElement('div');
    wrap.id = 'quiz-mode';
    wrap.innerHTML = `
      <div class="qz-bar">
        <span class="qz-title">Practice Mode</span>
        <div class="qz-cats">
          <button class="qz-cat active" data-cat="qa">Q&amp;A <span class="qz-n">${quizData.qa.length}</span></button>
          <button class="qz-cat" data-cat="file">File Defense <span class="qz-n">${quizData.file.length}</span></button>
          <button class="qz-cat" data-cat="coding">Coding <span class="qz-n">${quizData.coding.length}</span></button>
        </div>
        <div class="qz-right">
          <span id="qz-progress" class="qz-prog">1 / 29</span>
          <button class="qz-sm" id="qz-shuffle">⇄ Shuffle</button>
        </div>
      </div>
      <div id="qz-card">
        <div id="qz-meta" class="qz-meta">Day 1</div>
        <div id="qz-prompt" class="qz-prompt"></div>
        <div class="qz-reveal-row">
          <button id="qz-reveal" class="qz-reveal-btn">▶ Reveal Answer</button>
          <span class="qz-hint">Space to reveal · ← → to navigate · Enter = Got it</span>
        </div>
        <div id="qz-answer" class="qz-answer"></div>
        <div id="qz-actions" class="qz-actions">
          <button class="qz-act qz-prev"   id="qz-prev">← Prev</button>
          <button class="qz-act qz-retry"  id="qz-retry">↺ Retry</button>
          <button class="qz-act qz-got"    id="qz-got">✓ Got it</button>
          <button class="qz-act qz-next"   id="qz-next">Next →</button>
        </div>
      </div>
    `;
    coursesTab.insertBefore(wrap, coursesTab.firstChild);

    wrap.querySelectorAll('.qz-cat').forEach(btn => btn.addEventListener('click', () => {
      wrap.querySelectorAll('.qz-cat').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      quizMode = btn.dataset.cat; quizIdx = 0; renderQuizCard();
    }));

    document.getElementById('qz-reveal')?.addEventListener('click', () => {
      document.getElementById('qz-answer').style.display = '';
      document.getElementById('qz-reveal').style.display = 'none';
      document.getElementById('qz-actions').style.display = '';
      quizRevealed = true;
    });

    const go = (delta) => {
      const items = quizData[quizMode];
      quizIdx = Math.max(0, Math.min(items.length-1, quizIdx+delta));
      renderQuizCard();
    };
    document.getElementById('qz-prev')   ?.addEventListener('click', () => go(-1));
    document.getElementById('qz-next')   ?.addEventListener('click', () => go(+1));
    document.getElementById('qz-got')    ?.addEventListener('click', () => go(+1));
    document.getElementById('qz-retry')  ?.addEventListener('click', renderQuizCard);
    document.getElementById('qz-shuffle')?.addEventListener('click', () => {
      quizData[quizMode] = shuffle(quizData[quizMode]); quizIdx = 0; renderQuizCard();
    });

    // Keyboard navigation
    document.addEventListener('keydown', e => {
      if (!document.getElementById('tab-courses')?.classList.contains('active')) return;
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      const items = quizData[quizMode]; if (!items?.length) return;
      if      (e.key === 'ArrowLeft')                     { e.preventDefault(); go(-1); }
      else if (e.key === 'ArrowRight')                    { e.preventDefault(); go(+1); }
      else if (e.key === ' ' && !quizRevealed)            { e.preventDefault(); document.getElementById('qz-reveal')?.click(); }
      else if ((e.key === 'Enter') && quizRevealed)       { e.preventDefault(); go(+1); }
    });

    renderQuizCard();
  }

  /* ── DAILY JOURNALS ──────────────────────────────────── */
  const MOCK_DAYS  = new Set([21, 26]);
  const RETRO_DAYS = new Set([7, 14]);

  function addJournals() {
    document.querySelectorAll('[data-sprint-day]').forEach(block => {
      const day = parseInt(block.dataset.sprintDay);
      if (block.querySelector('.day-journal')) return;

      const placeholder = MOCK_DAYS.has(day)
        ? 'Mock feedback: what was sharp, what you stumbled on, what to fix before next mock...'
        : RETRO_DAYS.has(day)
        ? 'Week retro: gate pass/fail, weakest area, where to shift emphasis next week...'
        : 'Notes, blockers, what you\'d answer differently...';

      const key = `journal-d${day}`;
      const val = load()[key] || '';

      const wrap = document.createElement('div');
      wrap.className = 'day-journal';

      const hasContent = val.length > 0;
      const btn = document.createElement('button');
      btn.className = 'journal-toggle';
      btn.setAttribute('aria-expanded', String(hasContent));
      btn.textContent = hasContent ? '📓 Notes ✎' : '📓 Notes';

      const body = document.createElement('div');
      body.className = 'journal-body';
      body.style.display = hasContent ? '' : 'none';

      const area = document.createElement('textarea');
      area.className   = 'journal-area';
      area.rows        = 4;
      area.placeholder = placeholder;
      area.value       = val;

      const footer = document.createElement('div');
      footer.className = 'journal-footer';

      const countEl = document.createElement('span');
      countEl.className = 'journal-count';
      countEl.textContent = `${val.length} chars`;

      const savedEl = document.createElement('span');
      savedEl.className = 'journal-saved';

      footer.appendChild(countEl);
      footer.appendChild(savedEl);
      body.appendChild(area);
      body.appendChild(footer);
      wrap.appendChild(btn);
      wrap.appendChild(body);

      btn.addEventListener('click', () => {
        const open = body.style.display !== 'none';
        body.style.display = open ? 'none' : '';
        btn.setAttribute('aria-expanded', String(!open));
      });

      let timer;
      area.addEventListener('input', () => {
        countEl.textContent = `${area.value.length} chars`;
        savedEl.textContent = '';
        clearTimeout(timer);
        timer = setTimeout(() => {
          const s = load(); s[key] = area.value; save(s);
          btn.textContent = area.value ? '📓 Notes ✎' : '📓 Notes';
          savedEl.textContent = '· saved';
          setTimeout(() => { savedEl.textContent = ''; }, 1800);
        }, 700);
      });

      block.querySelector('.day-tasks')?.after(wrap);
    });
  }

  /* ── JUMP TO SPECIFIC SPRINT DAY ────────────────────── */
  function jumpToSprintDay(dayNum) {
    const wk = dayNum <= 7 ? 1 : dayNum <= 14 ? 2 : dayNum <= 21 ? 3 : 4;
    if (typeof showTab === 'function') showTab('weekly');
    const wkCard = document.querySelector(`[data-leave-week="${wk}"]`);
    if (wkCard && !wkCard.classList.contains('open')) wkCard.querySelector('.week-header')?.click();
    const block = document.getElementById(`sprint-day-${dayNum}`);
    if (!block) return;
    block.classList.add('today-block');
    const nameEl = block.querySelector('.day-name');
    if (nameEl && !nameEl.querySelector('.today-label')) {
      const lbl = document.createElement('span');
      lbl.className = 'today-label';
      lbl.textContent = sprintDay() === dayNum ? '← TODAY' : `← DAY ${dayNum}`;
      nameEl.appendChild(lbl);
    }
    setTimeout(() => block.scrollIntoView({ behavior:'smooth', block:'start' }), 200);
  }

  /* ── CALENDAR CELL DOTS ─────────────────────────────── */
  const DISC_DOT_MAP = { code: 'code', file: 'file-def', qa: 'interview' };

  function updateCellDots(dayNum) {
    const cell  = document.querySelector(`.cal-sprint[data-sd-num="${dayNum}"]`);
    const block = document.getElementById(`sprint-day-${dayNum}`);
    if (!cell || !block) return;
    Object.entries(DISC_DOT_MAP).forEach(([dotCls, tagCls]) => {
      const dot  = cell.querySelector(`.cal-dot.d-${dotCls}`);
      if (!dot) return;
      const task = [...block.querySelectorAll('.task')].find(t => t.querySelector(`.task-tag.${tagCls}`));
      dot.classList.toggle('done', task ? !!task.querySelector('.task-check:checked') : false);
    });
  }

  /* ── PANEL CHECKBOX CLEANUP ─────────────────────────── */
  const panelCbKeys = new Set();

  function clearPanelCbs() {
    panelCbKeys.forEach(key => {
      const set = cbRegistry.get(key);
      if (!set) return;
      set.forEach(cb => { if (!document.body.contains(cb)) set.delete(cb); });
      if (set.size === 0) cbRegistry.delete(key);
    });
    panelCbKeys.clear();
  }

  /* ── CALENDAR DETAIL PANEL ──────────────────────────── */
  const DISC_ICONS  = { code:'🔢', file:'📁', qa:'🎤', build:'🔨' };

  function showDetailPanel(dayNum) {
    clearPanelCbs();
    const panel = document.getElementById('cal-detail');
    if (!panel) return;
    const block = document.getElementById(`sprint-day-${dayNum}`);
    if (!block) return;

    const rawTitle = block.querySelector('.day-name')?.textContent?.replace('← TODAY','').replace(/← DAY \d+/,'').trim() || '';
    const wk       = dayNum <= 7 ? 1 : dayNum <= 14 ? 2 : dayNum <= 21 ? 3 : 4;

    // Header
    const hdr = document.createElement('div');
    hdr.className = 'cal-detail-header';

    const badge = document.createElement('span');
    badge.className = 'cal-detail-day-badge';
    badge.textContent = `Day ${dayNum} · Leave Week ${wk}`;

    const title = document.createElement('span');
    title.className = 'cal-detail-title';
    title.textContent = rawTitle;

    const actions = document.createElement('div');
    actions.className = 'cal-detail-actions';

    const jumpBtn = document.createElement('button');
    jumpBtn.className = 'cal-detail-jump';
    jumpBtn.textContent = '↗ Go to day block';
    jumpBtn.addEventListener('click', () => jumpToSprintDay(dayNum));

    const closeBtn = document.createElement('button');
    closeBtn.className = 'cal-detail-close';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => {
      panel.classList.remove('open');
      document.querySelectorAll('.cal-sprint.selected').forEach(c => c.classList.remove('selected'));
    });

    actions.appendChild(jumpBtn);
    actions.appendChild(closeBtn);
    hdr.appendChild(badge);
    hdr.appendChild(title);
    hdr.appendChild(actions);

    // Tasks grid
    const grid = document.createElement('div');
    grid.className = 'cal-detail-tasks';

    block.querySelectorAll('.day-tasks .task').forEach((task, i) => {
      const disc   = discipline(task);
      if (!disc) return;
      const key    = `d${dayNum}-${disc}-${i}`;
      const textEl = task.querySelector('.task-text');
      const timeEl = task.querySelector('.task-time');
      const tagEl  = task.querySelector('.task-tag');

      const card = document.createElement('div');
      card.className = 'cal-dt';
      const s = load();
      if (s[key]) card.classList.add('task-done');

      // Synced checkbox
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.className = 'task-check'; cb.checked = !!s[key];
      registerCb(key, cb);
      panelCbKeys.add(key);
      cb.addEventListener('change', () => {
        syncCb(key, cb.checked, cb);
        card.classList.toggle('task-done', cb.checked);
        refreshWeekProgress(block.closest('[data-leave-week]'));
        refreshDashboard();
        updateCellDots(dayNum);
        refreshRhythmToday();
      });

      const top = document.createElement('div');
      top.className = 'cal-dt-top';

      const icon = document.createElement('span');
      icon.className = 'cal-dt-icon';
      icon.textContent = DISC_ICONS[disc] || '·';

      // Reuse existing task-tag style
      const tagClone = tagEl?.cloneNode(true);
      if (tagClone) {
        tagClone.className = 'cal-dt-tag ' + [...tagEl.classList].filter(cl => cl !== 'task-tag').join(' ');
      }

      const time = document.createElement('span');
      time.className = 'cal-dt-time';
      time.textContent = timeEl?.textContent || '';

      top.appendChild(cb);
      top.appendChild(icon);
      if (tagClone) top.appendChild(tagClone);
      top.appendChild(time);

      // Content — clone innerHTML, strip injected checkboxes
      const body = document.createElement('div');
      body.className = 'cal-dt-body';
      if (textEl) {
        body.innerHTML = textEl.innerHTML;
        body.querySelectorAll('.task-check').forEach(el => el.remove());
      }

      card.appendChild(top);
      card.appendChild(body);
      grid.appendChild(card);
    });

    panel.innerHTML = '';
    panel.appendChild(hdr);
    panel.appendChild(grid);
    panel.classList.add('open');
    setTimeout(() => panel.scrollIntoView({ behavior:'smooth', block:'nearest' }), 60);
  }

  /* ── CALENDAR ENHANCEMENT (HTML is pre-rendered, JS enhances) ── */
  let _selectedCalDay = null;

  function initCalendar() {
    const now      = new Date();
    const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const sprStart = new Date(2026, 5, 17);
    const todayDt  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff     = Math.round((todayDt - sprStart) / 86400000);
    const todaySD  = (diff >= 0 && diff <= 28) ? diff + 1 : null;

    document.querySelectorAll('.cal-sprint[data-sd-num]').forEach(cell => {
      const sd    = parseInt(cell.dataset.sdNum);
      const block = document.getElementById(`sprint-day-${sd}`);

      // Mark today
      if (sd === todaySD) cell.classList.add('cal-today');

      // Completion dots from checkbox state
      if (block) {
        if (isDayDone(block)) cell.classList.add('cal-done');
        updateCellDots(sd);
      }

      // Click → detail panel
      const go = () => {
        const already = _selectedCalDay === sd;
        document.querySelectorAll('.cal-sprint.selected').forEach(c => c.classList.remove('selected'));
        const panel = document.getElementById('cal-detail');
        if (already) {
          _selectedCalDay = null;
          if (panel) panel.classList.remove('open');
        } else {
          _selectedCalDay = sd;
          cell.classList.add('selected');
          showDetailPanel(sd);
        }
      };
      cell.addEventListener('click', go);
      cell.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); go(); } });
    });
  }

  function buildCalendar() { initCalendar(); }
  function refreshCalendar() {
    document.querySelectorAll('.cal-sprint[data-sd-num]').forEach(cell => {
      const n     = parseInt(cell.dataset.sdNum);
      const block = document.getElementById(`sprint-day-${n}`);
      cell.classList.toggle('cal-done', block ? isDayDone(block) : false);
      updateCellDots(n);
    });
  }

  /* ── DAILY RHYTHM — TODAY ────────────────────────────── */
  function buildRhythmToday() {
    const day = sprintDay(); if (!day) return;
    const tab = document.getElementById('tab-rhythm'); if (!tab) return;
    const block = document.getElementById(`sprint-day-${day}`); if (!block) return;
    if (tab.querySelector('.rhythm-today-wrap')) return;

    const wrap = document.createElement('div');
    wrap.className = 'rhythm-today-wrap';

    const hdr = document.createElement('div');
    hdr.className = 'rhythm-today-hdr';
    hdr.innerHTML = `
      <span class="rhythm-today-day">TODAY · DAY ${day} OF 29</span>
      <span class="rhythm-today-date">${sprintDateStr(day)}</span>`;
    const jumpBtn = document.createElement('button');
    jumpBtn.className = 'rhythm-today-jump';
    jumpBtn.textContent = '↗ Jump to day block';
    jumpBtn.addEventListener('click', () => jumpToSprintDay(day));
    hdr.appendChild(jumpBtn);
    wrap.appendChild(hdr);

    const TIMES = { code:'30m', file:'20m', qa:'15m', build:'≥60m' };

    block.querySelectorAll('.day-tasks .task').forEach((task, i) => {
      const disc   = discipline(task); if (!disc) return;
      const key    = `d${day}-${disc}-${i}`;
      const textEl = task.querySelector('.task-text');
      const s      = load();

      // Summary text
      let summary = '';
      if (disc === 'code') { summary = textEl?.querySelector('strong')?.textContent || textEl?.textContent?.slice(0,70) || ''; }
      else if (disc === 'file') { summary = textEl?.querySelector('code')?.textContent || textEl?.textContent?.slice(0,50) || ''; }
      else if (disc === 'qa') {
        const raw = textEl?.querySelector('em')?.textContent || textEl?.textContent?.slice(0,80) || '';
        summary = raw.replace(/^[""\u201C]|[""\u201D]$/g, '');
      } else {
        const tag = task.querySelector('.task-tag');
        summary = (tag?.textContent?.trim() || '') + ' — ' + (textEl?.textContent?.slice(0,50) || '');
      }
      summary = summary.trim().replace(/\s+/g, ' ');

      const row = document.createElement('div');
      row.className = 'rhythm-today-row';
      if (s[key]) row.classList.add('task-done');

      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.className = 'task-check'; cb.checked = !!s[key];
      registerCb(key, cb);
      cb.addEventListener('change', () => {
        syncCb(key, cb.checked, cb);
        row.classList.toggle('task-done', cb.checked);
        refreshWeekProgress(block.closest('[data-leave-week]'));
        refreshDashboard();
        updateCellDots(day);
      });

      const tm = document.createElement('span');
      tm.className = 'rhythm-tm';
      tm.textContent = TIMES[disc] || '';

      const icon = document.createElement('span');
      icon.className = 'rhythm-disc-icon';
      icon.textContent = DISC_ICONS[disc] || '·';

      const txt = document.createElement('span');
      txt.className = 'rhythm-today-text';
      txt.textContent = summary;

      row.appendChild(cb);
      row.appendChild(tm);
      row.appendChild(icon);
      row.appendChild(txt);
      wrap.appendChild(row);
    });

    tab.insertBefore(wrap, tab.firstChild);
  }

  function refreshRhythmToday() {
    const day = sprintDay(); if (!day) return;
    const block = document.getElementById(`sprint-day-${day}`); if (!block) return;
    document.querySelectorAll('.rhythm-today-row').forEach((row, i) => {
      const tasks = [...block.querySelectorAll('.day-tasks .task')];
      if (i >= tasks.length) return;
      const disc = discipline(tasks[i]); if (!disc) return;
      const key  = `d${day}-${disc}-${i}`;
      const s    = load();
      row.classList.toggle('task-done', !!s[key]);
    });
  }

  /* ── JUMP TO TODAY ───────────────────────────────────── */  /* ── JUMP TO TODAY ───────────────────────────────────── */
  function jumpToToday() {
    const day = sprintDay(); if (!day) return;
    const wk  = day <= 7 ? 1 : day <= 14 ? 2 : day <= 21 ? 3 : 4;
    if (typeof showTab === 'function') showTab('weekly');
    const wkCard = document.querySelector(`[data-leave-week="${wk}"]`);
    if (wkCard && !wkCard.classList.contains('open')) wkCard.querySelector('.week-header')?.click();
    const block = document.getElementById(`sprint-day-${day}`); if (!block) return;
    block.classList.add('today-block');
    const nameEl = block.querySelector('.day-name');
    if (nameEl && !nameEl.querySelector('.today-label')) {
      const lbl = document.createElement('span');
      lbl.className = 'today-label'; lbl.textContent = '← TODAY';
      nameEl.appendChild(lbl);
    }
    setTimeout(() => block.scrollIntoView({ behavior:'smooth', block:'start' }), 200);
  }

  /* ── DAY N JUMP BUTTON ───────────────────────────────── */
  function addJumpButton() {
    const day = sprintDay(); if (!day) return;
    const tabs = document.querySelector('.tabs'); if (!tabs || tabs.querySelector('.today-jump-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'tab today-jump-btn';
    btn.textContent = `Day ${day}`;
    btn.title = `Jump to Day ${day} of leave sprint`;
    btn.addEventListener('click', jumpToToday);
    tabs.appendChild(btn);
  }

  /* ── SPRINT HQ CONTAINER ─────────────────────────────── */
  function buildSprintHQ() {
    if (!sprintDay()) return;
    if (document.getElementById('sprint-hq')) return;
    const hq = document.createElement('div');
    hq.id = 'sprint-hq';
    /* Insert at the top of the weekly tab so it scrolls with content, not sticky */
    const weeklyTab = document.getElementById('tab-weekly');
    if (weeklyTab) weeklyTab.insertBefore(hq, weeklyTab.firstChild);
    else {
      const tabs2 = document.querySelector('.sticky-top') || document.querySelector('.tabs');
      if (tabs2) tabs2.parentElement.insertBefore(hq, tabs2.nextSibling);
    }
  }

  /* ═══════════════ PROGRESS TAB ═══════════════
     Scalable by design: add a track to PG_TRACKS or an entry to PG_ACTIVITY
     and it renders automatically — no other code changes needed. ── */

  const PG_COLORS = { done: '#10b981', watch: '#f59e0b', risk: '#f472b6' };

  // pct: null means "compute live from checkboxes" via the pctFn below.
  const PG_TRACKS = [
    { id:'coding',       name:'Coding challenges (Tier A–D)', cat:'prep',  status:'risk',
      note:'Biggest active gap heading into Mock #1',
      pctFn: () => {
        const boxes = document.querySelectorAll('.problem-check');
        if (!boxes.length) return 0;
        return Math.round(100 * document.querySelectorAll('.problem-check:checked').length / boxes.length);
      } },
    { id:'walkthroughs', name:'Project walkthroughs', cat:'prep', status:'risk', pct:0,
      note:'"Walk an interviewer through what you built" — not started' },
    { id:'sql',          name:'SQL / Snowflake', cat:'prep', status:'watch', pct:0,
      note:'Sprint sub-item, not started' },
    { id:'kotlin',       name:'Kotlin', cat:'prep', status:'watch', pct:0,
      note:'Sprint sub-item, not started' },
    { id:'rag',    name:'CQIEA / RAG engine',      cat:'build', status:'done', pct:100, note:'Maintenance / polish only' },
    { id:'java',   name:'Java · Spring Boot API',  cat:'build', status:'done', pct:100 },
    { id:'react',  name:'React / TS review UI',    cat:'build', status:'done', pct:100 },
    { id:'etl',    name:'ETL pipeline',             cat:'build', status:'done', pct:100 },
    { id:'audit',  name:'3-system audit',           cat:'build', status:'done', pct:100 },
  ];

  // Add new entries here as things happen — newest first, renders automatically.
  const PG_ACTIVITY = [
    { date:'2026-07-02', status:'risk', text:'<strong>Day 16 review:</strong> build fully shipped (RAG, Java, React, ETL, audit). Coding challenges and project walkthroughs flagged as the live risk with 13 days to Mock #1.' },
    { date:'2026-06-17', status:'watch', text:'Leave sprint begins. SQL/Snowflake and Kotlin slotted into the daily rhythm alongside Tier A–D coding drills.' },
    { date:'2026-06-14', status:'done', text:'Phase 5 (React/TS review UI) shipped — 3 PRs merged. Build portion of the workbench complete ahead of leave.' },
  ];

  function pgPct(t) { return typeof t.pctFn === 'function' ? t.pctFn() : (t.pct ?? 0); }

  function pgRingSVG(pct, colorHex, size) {
    size = size || 88;
    const r = size / 2 - 8, c = size / 2, circ = 2 * Math.PI * r;
    const offset = circ * (1 - Math.max(0, Math.min(100, pct)) / 100);
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--border)" stroke-width="7"/>
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${colorHex}" stroke-width="7"
        stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}" stroke-linecap="round"
        transform="rotate(-90 ${c} ${c})"/>
      <text x="${c}" y="${c - 2}" text-anchor="middle" fill="var(--text)" font-size="${size > 70 ? 17 : 13}"
        font-weight="600" font-family="var(--mono)">${Math.round(pct)}%</text>
    </svg>`;
  }

  function pgRingCard(t, opts) {
    opts = opts || {};
    const pct = pgPct(t);
    const small = !!opts.small;
    return `<div class="pg-ring-card ${t.status} ${small ? 'small' : ''}">
      ${pgRingSVG(pct, PG_COLORS[t.status], small ? 64 : 92)}
      <div class="pg-ring-name">${t.name}</div>
      ${small ? '' : `<div class="pg-badge ${t.status}">${t.status === 'done' ? 'done' : t.status === 'watch' ? 'watch' : 'at risk'}</div>`}
    </div>`;
  }

  function pgBurndownSVG(gapTracks) {
    const W = 560, H = 170, PL = 34, PR = 14, PT = 16, PB = 30;
    const IW = W - PL - PR, IH = H - PT - PB, DAYS = 29;
    const day = sprintDay() || 16;
    const px = d => PL + (d / DAYS) * IW;
    const py = v => PT + IH - (v / 100) * IH;
    let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" style="max-width:${W}px;display:block;">`;
    for (let v = 0; v <= 100; v += 25) {
      const y = py(v);
      svg += `<line x1="${PL}" x2="${W-PR}" y1="${y}" y2="${y}" stroke="rgba(100,120,140,${v===0?'0.2':'0.08'})" stroke-width="0.7"/>
        <text x="${PL-6}" y="${y+3}" text-anchor="end" font-size="8" fill="rgba(100,120,140,0.55)" font-family="monospace">${v}</text>`;
    }
    for (let d = 0; d <= DAYS; d += 7) {
      svg += `<line x1="${px(d)}" x2="${px(d)}" y1="${PT+IH}" y2="${PT+IH+3}" stroke="rgba(100,120,140,0.3)" stroke-width="0.7"/>
        <text x="${px(d)}" y="${PT+IH+13}" text-anchor="middle" font-size="8" fill="rgba(100,120,140,0.5)" font-family="monospace">D${d}</text>`;
    }
    // Ideal pace line: 0% day1 -> 100% day29
    svg += `<line x1="${px(0)}" y1="${py(0)}" x2="${px(DAYS)}" y2="${py(100)}" stroke="rgba(100,120,140,0.4)" stroke-width="1.2" stroke-dasharray="5,3"/>`;
    // Today marker
    svg += `<line x1="${px(day)}" x2="${px(day)}" y1="${PT}" y2="${PT+IH}" stroke="rgba(100,120,140,0.25)" stroke-width="0.7" stroke-dasharray="2,2"/>
      <text x="${px(day)}" y="${PT-4}" text-anchor="middle" font-size="8" fill="rgba(100,120,140,0.6)" font-family="monospace">TODAY</text>`;
    // Actual point per gap track at today
    gapTracks.forEach(t => {
      const pct = pgPct(t);
      svg += `<circle cx="${px(day)}" cy="${py(pct)}" r="4" fill="${PG_COLORS[t.status]}" stroke="var(--surface)" stroke-width="1.5"/>`;
    });
    svg += `</svg>`;
    return svg;
  }

  function buildProgressTab() {
    const panel = document.getElementById('pg-tracks');
    if (!panel) return;

    const day = sprintDay();
    const dayLabel = day ? `Day ${day} / 29` : 'Pre-sprint';
    const gapTracks = PG_TRACKS.filter(t => t.status === 'risk');
    const watchTracks = PG_TRACKS.filter(t => t.status === 'watch');
    const doneTracks = PG_TRACKS.filter(t => t.status === 'done');

    let html = `
      <div class="pg-hero">
        <div class="pg-hero-row">
          <span class="pg-hero-title">Where things actually stand</span>
          <span class="pg-hero-meta">${dayLabel} · updated ${sprintDateStr(day) || ''}</span>
        </div>
        <div class="pg-hero-sub">Build tracks are done. Interview-prep tracks are the live risk — foregrounded below rather than shown at parity with everything else.</div>
      </div>

      <div class="pg-section-title">Focus — at risk</div>
      <div class="pg-focus-grid">${gapTracks.map(t => pgRingCard(t)).join('')}</div>

      <div class="pg-section-title">Also open</div>
      <div class="pg-focus-grid">${watchTracks.map(t => pgRingCard(t)).join('')}</div>

      <div class="pg-section-title">Shipped</div>
      <div class="pg-all-grid">${doneTracks.map(t => pgRingCard(t, {small:true})).join('')}</div>

      <div class="pg-section-title">Burndown — gap tracks vs. ideal sprint pace</div>
      <div class="pg-burndown-wrap">
        <div class="pg-burndown-legend">
          <span class="pg-burndown-leg-item"><span class="pg-burndown-leg-line" style="background:rgba(100,120,140,0.4);border-top:2px dashed rgba(100,120,140,0.5);"></span>Ideal pace (0% → 100% over 29 days)</span>
          ${gapTracks.concat(watchTracks).map(t => `<span class="pg-burndown-leg-item"><span class="pg-burndown-leg-dot" style="background:${PG_COLORS[t.status]}"></span>${t.name}</span>`).join('')}
        </div>
        ${pgBurndownSVG(gapTracks.concat(watchTracks))}
      </div>

      <div class="pg-section-title">Activity</div>
      <div class="pg-feed">
        ${PG_ACTIVITY.map(a => `<div class="pg-feed-item">
          <div class="pg-feed-dot ${a.status}"></div>
          <div class="pg-feed-body">
            <div class="pg-feed-text">${a.text}</div>
            <div class="pg-feed-date">${a.date}</div>
          </div>
        </div>`).join('')}
      </div>
    `;
    panel.innerHTML = html;
    if (window.buildProgressNav) window.buildProgressNav();
  }

  /* ── STICKY JUMP NAV — auto-built from whatever section headers exist,
     so it stays correct as tracks/sections are added later ── */
  window.buildProgressNav = function buildProgressNav() {
    const nav = document.getElementById('pg-nav');
    if (!nav) return;
    nav.innerHTML = '';
    const usedIds = new Set();
    const groups = [
      { label: 'Tracks',         root: document.getElementById('pg-tracks'),      selector: '.pg-section-title' },
      { label: 'Mock Interview', root: document.getElementById('pg-rubric-live'), selector: '.r-section-label' }
    ];
    const observed = [];
    groups.forEach(g => {
      if (!g.root) return;
      const headers = [...g.root.querySelectorAll(g.selector)].filter(h => h.textContent.trim());
      if (!headers.length) return;
      const gEl = document.createElement('div');
      gEl.className = 'pg-nav-group';
      gEl.textContent = g.label;
      nav.appendChild(gEl);
      headers.forEach(h => {
        const raw = h.textContent.trim();
        let slug = 'pg-' + raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);
        let base = slug, n = 1;
        while (usedIds.has(slug)) { slug = base + '-' + (++n); }
        usedIds.add(slug);
        h.id = slug;
        h.style.scrollMarginTop = 'calc(var(--sticky-h, 44px) + 12px)';
        const a = document.createElement('a');
        a.className = 'pg-nav-link';
        a.href = '#' + slug;
        a.textContent = raw.replace(/\s*\([^)]*\)\s*$/, ''); // trim trailing (§17.x) refs for brevity
        nav.appendChild(a);
        observed.push(h);
      });
    });
    if (window.__pgNavObserver) window.__pgNavObserver.disconnect();
    const links = [...nav.querySelectorAll('.pg-nav-link')];
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(a => a.classList.remove('active'));
        const link = links.find(a => a.getAttribute('href') === '#' + e.target.id);
        if (link) link.classList.add('active');
      });
    }, { rootMargin: '-15% 0px -70% 0px' });
    observed.forEach(h => obs.observe(h));
    window.__pgNavObserver = obs;
  };

  /* ── INIT ────────────────────────────────────────────── */
  function init() {
    buildSprintHQ();
    annotateWeekCards();
    annotateDayBlocks();
    initCheckboxes();
    initCodingBank();
    refreshAllProgress();
    addJumpButton();
    if (sprintDay()) {
      buildDashboard();
      buildTodayCard();
      refreshDashboard();
      jumpToToday();
    }
    buildQuizMode();
    addJournals();
    buildCalendar();
    if (sprintDay()) buildRhythmToday();
    buildProgressTab();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
/* ── QUESTION BANK — Level I Foundations (60 questions) ── */

const QBANK_L1 = {
  swe: {
    label: `Software Engineering I`, short: `SWE I`,
    icon: `☕`, color: `spring`,
    questions: [
            {
        id:`swe-1`,
        q:`What is the difference between a variable, a value, and a data type?`,
        anchor:`A variable is a named place that refers to a value, and the data type describes what kind of value it is and what operations are valid.`,
        compressed:`A variable is a named place that refers to a value, and the data type describes what kind of value it is and what operations are valid.`,
        detail:`A value is the actual piece of data, such as 42, "hello", or true. A variable is a name used to refer to that value so the program can reuse or update it. A data type describes the category of the value and usually determines what operations are allowed. For example, integers can be added numerically, while strings can be concatenated. In statically typed languages such as Java, the compiler checks many type rules before the program runs. In dynamically typed languages such as Python, the value carries its type at runtime, although type hints can still improve clarity and tooling. Types reduce ambiguity, document intent, and prevent invalid operations, but a type system cannot prove every business rule.`,
        followup:`Why might age: int still require runtime validation?`,
        followupAnswer:`Type hints describe intent but don't enforce values. \`age: int = -500\` passes type checking and function signatures without complaint. Runtime validation (Pydantic, manual guards, DTO validation) enforces business rules — age must be positive, below a maximum, and actually an integer at the API boundary. Types catch one class of mistake; runtime validation catches another.`,
        tie:`Relate this to Python type hints, Pydantic runtime validation, and Java request DTOs in the compounding-quality project.`,
        trap:`Saying a variable is simply “a box in memory” without distinguishing the name, the value, and the type system.`,
        l2q:`In a layered application, where should type and value validation live, and why not everywhere?`,
        l2a:`Validate at the boundary, then trust inward. The edge — request deserialization, queue-message parsing, file ingestion — is where untrusted external data becomes a trusted internal object, so that is where Pydantic models and DTO validation belong. Once data has been parsed into a validated domain type, internal layers should rely on the type rather than re-checking the same invariant at every call; scattering the same guard across controller, service, and repository duplicates rules that then drift out of sync. This is the "parse, don't validate" idea: turn raw input into a type that *cannot* hold an invalid value, so the validation happens once and the type carries the guarantee from then on.`,
        l3q:`How can the type system itself make invalid states unrepresentable, rather than relying on runtime checks?`,
        l3a:`Model the domain so the compiler rejects illegal combinations before any code runs. Instead of one struct with a \`status: str\` plus several nullable fields where only certain combinations are legal, use a discriminated union / sealed hierarchy where each state is its own variant carrying exactly the fields valid for it — a \`PendingReview\` type literally has no \`resolutionCode\` field, so "approved with no approver" becomes a compile error, not a runtime guard you might forget. This shrinks the state space tests must cover, documents the domain in the types, and shifts a whole class of bug from runtime to compile time. The cost is more types and more upfront modeling, and dynamically-typed Python supports it only partially (Literal types and Pydantic discriminated unions get you part of the way, sealed Java interfaces + records or TypeScript discriminated unions get you further) — so you reserve it for the states whose invariants actually matter, like the disposition lifecycle in the compounding-quality workflow.`,
      },
            {
        id:`swe-2`,
        q:`What is a function or method, and why do programs use them?`,
        anchor:`A function groups reusable behavior behind a name, accepts inputs, and may return an output.`,
        compressed:`A function groups reusable behavior behind a name, accepts inputs, and may return an output.`,
        detail:`A function is a named block of logic that performs one focused task. Its parameters are the inputs supplied by the caller, and its return value is the result it gives back. Methods are functions associated with an object or class. Functions help reduce duplicated code, make behavior testable, and let programmers reason about a program in smaller units. A good function usually has a clear contract: what inputs it accepts, what it returns, what errors it can raise, and whether it changes external state. Very large functions are harder to understand and test, while excessively tiny functions can fragment simple logic. The goal is cohesion: keep code together when it changes for the same reason.`,
        followup:`What are signs that a function is doing too much?`,
        followupAnswer:`Signs: the function name contains 'and', it has multiple return types or abstraction levels, it has more than one reason to change, or you need a paragraph docstring just to describe what it does. A practical test: if you can't write a single-sentence unit test name that describes one specific behavior, the function is probably doing too much.`,
        tie:`Use examples such as separate ingestion, retrieval, evaluation, and final-assessment functions rather than one giant pipeline function.`,
        trap:`Defining a function only as “code you can call” without discussing contract, reuse, or testability.`,
        l2q:`How do you make a function testable when it depends on the current time, randomness, or external I/O?`,
        l2a:`Inject the dependency instead of reaching for it inside the function. A function that calls \`datetime.now()\`, seeds its own RNG, or opens a database connection internally is hard to test deterministically; pass a clock, a seeded random source, or a repository interface as a parameter (or constructor dependency) so the test can supply a fake. This separates the *decision* (pure, deterministic, easy to assert on) from the *effect* (talking to the outside world). It's the same discipline that makes \`stat_render.py\` reproducible — the determinism comes from controlling the inputs rather than capturing ambient state.`,
        l3q:`How does "functional core, imperative shell" scale this idea to whole-system design?`,
        l3a:`Push all I/O, mutation, and nondeterminism to a thin outer shell and keep the decision logic in a pure inner core that takes data and returns data. The core has no side effects, so it's trivially testable, parallelizable, and reusable; the shell does the unavoidable messy work (reading requests, writing the database, calling services) but contains almost no branching logic to get wrong. The payoff is that the hard-to-test part (the shell) becomes thin and boring, while the part that holds your actual business rules becomes a pile of pure functions you can hammer with property-based tests. The constraint is discipline — it's tempting to let a database call leak into the core "just here" — and it fits the Realmwalkers pipeline well: keep the gate/render decision logic pure and let the FastAPI/Postgres layer be the shell.`,
      },
            {
        id:`swe-3`,
        q:`What is the difference between a class and an object?`,
        anchor:`A class defines a structure and behavior; an object is one concrete instance created from that definition.`,
        compressed:`A class defines a structure and behavior; an object is one concrete instance created from that definition.`,
        detail:`A class describes what data an object can hold and what operations it can perform. An object is a specific runtime instance of that class. For example, a DocumentChunk class might define fields such as documentId, text, and section, while an individual chunk object contains the values for one particular section of one document. Classes help organize related state and behavior, but not every concept needs a class. Simple immutable records or functions may be clearer when there is little behavior. A useful class should represent a coherent concept rather than merely wrapping unrelated fields.`,
        followup:`When would a plain record or data class be better than a behavior-heavy class?`,
        followupAnswer:`When the data is just transferred between layers without invariants — request DTOs, database rows, intermediate results. A ChecklistResult record that carries fields is clearer than a class with heavy behavior when the only operation is 'read this field.' Behavior-heavy classes earn their cost when invariants need protecting; records earn their cost when clarity matters more.`,
        tie:`Relate this to ReviewSummary, SearchResult, request DTOs, or document/chunk models.`,
        trap:`Saying a class is a “blueprint” and stopping there without explaining state, behavior, or when not to use one.`,
        l2q:`What's the difference between value semantics and identity semantics, and when does it matter?`,
        l2a:`Ask whether two instances with identical field values should be considered equal. A \`Money(5, "USD")\` should equal another \`Money(5, "USD")\` — it's a value object, equal by content, and ideally immutable. A \`User\` with the same name is *not* the same user — it's an entity, equal by identity (its ID), and its fields can change over its lifetime. This distinction drives how you implement \`equals\`/\`hashCode\` (or \`__eq__\`/\`__hash__\`): get it wrong and value objects fail to dedupe in a set, or two distinct entities collide. In your models, \`SearchResult\` and \`ReviewSummary\` are usually value-like (compare by content), while a persisted review is an entity (compare by ID).`,
        l3q:`How do you decide the boundaries of a class — what state and behavior belong together?`,
        l3a:`Group by reason-to-change and by the consistency boundary, not by superficial similarity. The Single Responsibility Principle, read properly, says a class should answer to one actor/concern so it has one reason to change; a class that mixes persistence, business rules, and presentation will be pulled in three directions and churn constantly. The deeper tool is the aggregate idea from domain modeling: identify the set of objects that must stay mutually consistent under a single transaction, make one of them the entry point (the aggregate root), and let *it* own the invariants for everything inside. Watch for the anemic-domain-model smell — classes that are pure data with all the logic living in "service" classes — which is fine for CRUD and DTOs but a problem when real invariants get scattered and duplicated across services instead of being protected in one place.`,
      },
            {
        id:`swe-4`,
        q:`What is encapsulation?`,
        anchor:`Encapsulation keeps an object’s internal state controlled and exposes safe operations instead of unrestricted mutation.`,
        compressed:`Encapsulation keeps an object’s internal state controlled and exposes safe operations instead of unrestricted mutation.`,
        detail:`Encapsulation means an object owns the rules for changing its state. Making fields private is one tool, but the deeper goal is to prevent invalid state transitions. A bank account should expose deposit and withdraw, not let callers set the balance to any number. A review task should expose assign, approve, or reject, not independent setters that can create contradictory states. Encapsulation centralizes validation and reduces duplicated rules across controllers, services, and callers. It also makes later changes easier because callers depend on stable behavior rather than internal representation. Too much hiding can make simple data objects awkward, so the amount of encapsulation should match the importance of the invariants.`,
        followup:`When is a public setter acceptable?`,
        followupAnswer:`When the field is independently mutable with no invariants attached — a display name, a preference toggle, a configuration value. A setter becomes a problem when changing one field must be coordinated with another, when validation depends on state, or when the change triggers side effects. If you'd add logic to the setter anyway, that's a signal the operation needs a real method name.`,
        tie:`Use the separation of formal classification, risk lane, handling path, and resolution options rather than one overloaded mutable disposition field.`,
        trap:`“Encapsulation means private fields with getters and setters.”`,
        l2q:`What is an invariant, and how does encapsulation protect it?`,
        l2a:`An invariant is a condition that must hold for an object to be valid at all times — an order's total equals the sum of its line items, a review can't be "approved" without an approver. Encapsulation protects it two ways: by constructing objects in a valid state (a constructor or factory that rejects bad arguments, so no half-built object ever exists) and by funneling every state change through methods that re-check the invariant before committing it. The "tell, don't ask" principle follows from this — callers tell the object to perform an operation (\`account.withdraw(x)\`) rather than reading its fields, deciding externally, and writing them back, because external logic can't be trusted to maintain the invariant the way the object itself can.`,
        l3q:`How do invariants extend beyond a single object to an aggregate or transaction boundary?`,
        l3a:`Some invariants span multiple objects and can't be enforced by one object's encapsulation — "a tournament slot can't hold two players" involves the slot, the players, and the bracket together. You enforce those within a consistency boundary: an aggregate root that's the only entry point for changes inside the boundary, mutated within a single transaction so the whole group stays consistent. Across aggregates, immediate consistency is impossible without distributed transactions you'll want to avoid, so you accept eventual consistency and coordinate with domain events and compensating actions instead. The senior move is choosing these boundaries deliberately: invariants that *must* be atomic live inside one transactional aggregate; invariants that can tolerate a brief lag live across aggregates with events and compensation — which is exactly the "persist review state, then publish an audit event" shape in Q13.`,
      },
            {
        id:`swe-5`,
        q:`What is the difference between inheritance and composition?`,
        anchor:`Inheritance models an “is-a” relationship; composition builds an object from other objects it “has” or “uses.”`,
        compressed:`Inheritance models an “is-a” relationship; composition builds an object from other objects it “has” or “uses.”`,
        detail:`Inheritance lets a subclass reuse and specialize behavior from a parent class. It can work well when the subtype genuinely preserves the parent contract. Composition means an object receives or contains collaborators and delegates work to them. Composition is often safer because behavior can be swapped without inheriting unwanted state or lifecycle assumptions. For example, a ReviewService can use a Retriever interface rather than subclassing a large base workflow class. Inheritance can create tight coupling when subclasses depend on internal parent behavior. Composition can create more small interfaces and wiring, so the design should stay proportional to the problem.`,
        followup:`Why is extending a class only to reuse one helper method often a smell?`,
        followupAnswer:`You inherit the parent's entire contract, lifecycle, fields, and constraints — even the parts you don't want. If you only needed one method, a static utility function, a shared service, or a collaborator gives you that reuse without the coupling. The child class is also harder to understand because readers expect 'is-a' semantics when they see inheritance.`,
        tie:`Connect this to composing keyword, embedding, and hybrid retrieval components behind shared contracts.`,
        trap:`“Composition is always better.”`,
        l2q:`What is the Liskov Substitution Principle, and how can inheritance violate it?`,
        l2a:`LSP says any code that works with the parent type must keep working when handed a subtype, without knowing the difference. Inheritance violates it whenever a subclass strengthens what callers must provide or weakens what the parent guaranteed: the classic case is \`Square extends Rectangle\`, where \`setWidth\` is forced to also change the height, breaking every caller that assumed width and height move independently. A \`ReadOnlyList\` that extends \`List\` but throws on \`add()\` is the same failure — it's an "is-a" in name but not in contract. When you find yourself overriding a method to do nothing, throw, or behave incompatibly, that's the signal the relationship is wrong and composition (or a redesigned hierarchy) is the fix.`,
        l3q:`How do you design for extension without inheritance, and what is the fragile base class problem?`,
        l3a:`Replace "extend the class" with explicit extension points: strategy objects, decorators, injected collaborators, and plugin/hook interfaces, all wired through composition. This realizes the open-closed principle — you extend behavior by adding new implementations rather than editing or subclassing existing ones — and it's exactly the shape of your Reusable Core, where domain packs extend a fixed mechanism by injection rather than by subclassing a base workflow. The problem you're avoiding is the *fragile base class*: in a deep hierarchy, an innocent change to a parent method can silently break distant subclasses that depended on its internal call sequence, and you often can't tell from the parent which subclasses you've broken. Inheritance-for-extension survives in narrow, well-understood spots (the template-method pattern, where the parent fixes a skeleton and subclasses fill named holes), but as a default for reuse it couples lifecycle and state in ways that composition keeps separate.`,
      },
            {
        id:`swe-6`,
        q:`What is an interface, and why is it useful?`,
        anchor:`An interface defines what an implementation must do without forcing callers to know how it does it.`,
        compressed:`An interface defines what an implementation must do without forcing callers to know how it does it.`,
        detail:`An interface is a contract made of operations and their expected behavior. Callers program against the interface, while concrete classes provide the implementation. This separates stable policy from replaceable details. A RagEngineClient might define a method for obtaining a checklist, while one implementation invokes a Python subprocess and another later calls an HTTP service. The controller does not need to change when the implementation changes. Interfaces also make testing easier because a fake or mock implementation can be injected. Creating an interface for every class adds unnecessary indirection, so interfaces are most valuable at boundaries where multiple implementations, testing seams, or future replacement are plausible.`,
        followup:`When is an interface premature abstraction?`,
        followupAnswer:`When there is only one implementation today with no credible second one, when the interface maps one-to-one onto the class with identical method names, or when it adds indirection without enabling testing or replacement. Interfaces earn their place at process or service boundaries where substitution, multiple implementations, or testing seams are plausible. Inside a single cohesive module, they can add noise.`,
        tie:`Use the Java RagEngineClient boundary around the Python engine.`,
        trap:`Explaining only that an interface “contains methods without bodies.”`,
        l2q:`What's the difference between an interface's signature and its behavioral contract (Design by Contract)?`,
        l2a:`A signature tells you which methods exist and their types; it says nothing about what must be true before you call them, what's guaranteed after, or what invariants hold throughout. Two implementations can satisfy the same signature while violating the same behavioral contract — one returns an empty list when nothing matches, the other throws; one is thread-safe, the other isn't; one preserves input order, the other doesn't. Design by Contract makes those expectations explicit (preconditions, postconditions, invariants), and it's where LSP bites: a substitutable implementation must honor the contract, not just the types. For your \`RagEngineClient\`, the subprocess and HTTP implementations must agree on timeout semantics, error shape, and result ordering — otherwise the controller "works" against one and breaks against the other despite an identical signature.`,
        l3q:`How do you design interfaces that stay stable as implementations and requirements evolve, and what is the cost of a leaky abstraction?`,
        l3a:`Design the interface around what the *consumer* needs, keep it small and role-focused (interface segregation — many narrow interfaces beat one fat one, so clients depend only on what they use), and evolve it additively at process boundaries (add methods, deprecate slowly, never silently change or remove). Accept the Law of Leaky Abstractions: every abstraction eventually exposes some implementation detail (latency, failure modes, ordering), so the real question is how much it leaks and how gracefully — your subprocess→HTTP migration is exactly a case where the interface should have hidden the transport so completely that the consumer never noticed the swap. The hardest and most consequential interface decisions are about what *not* to expose, because every exposed method, field, and behavior becomes a constraint you must preserve forever (see Hyrum's Law in Q12: with enough consumers, even undocumented behavior becomes a depended-on contract).`,
      },
            {
        id:`swe-7`,
        q:`When would you use a list, set, map, stack, or queue?`,
        anchor:`Choose the data structure based on the operations the program needs most often.`,
        compressed:`Choose the data structure based on the operations the program needs most often.`,
        detail:`A list is useful when order and indexed iteration matter and duplicates are allowed. A set is useful for uniqueness and fast membership checks. A map stores key-value pairs and is useful for lookup by identifier. A stack follows last-in, first-out behavior and fits nested structures, undo operations, and delimiter validation. A queue follows first-in, first-out behavior and fits task processing and breadth-first traversal. The correct choice depends on workload, not habit. A map may give average constant-time lookup but uses more memory than a list. A sorted structure may cost more on insertion but support ordered iteration or range queries.`,
        followup:`Which structure would you use to deduplicate document IDs while preserving first-seen order?`,
        followupAnswer:`A LinkedHashSet (Java) or an ordered dict combined with a set (Python) — the set enforces uniqueness while the ordered structure preserves insertion order. An ordinary HashSet loses order; a plain list allows duplicates; a sorted structure imposes alphabetical rather than insertion order.`,
        tie:`Use maps for chunk lookup, sets for deduplication, queues for work processing, and heaps for top-k retrieval.`,
        trap:`Memorizing structure definitions without tying them to operations.`,
        l2q:`How do you choose when you have competing access patterns — fast point lookup *and* ordered iteration *and* range queries?`,
        l2a:`No single structure is best at everything, so you either pick the one tuned to the dominant pattern or maintain two structures in sync as an index. A hash map gives O(1) point lookup but no order; a balanced tree (TreeMap, sorted container) gives ordered iteration and range queries at O(log n) but slower point lookup; when you genuinely need both, you keep both and pay the cost of keeping them consistent on every write. The canonical example is an LRU cache, which combines a hash map (O(1) lookup) with a doubly linked list (O(1) move-to-front for recency) — neither structure alone does the job, but together they hit every required operation in constant time. Your top-k retrieval is the same reasoning applied to selection: a heap, not a full sort, because you only need the best k.`,
        l3q:`How does the right structure change when data exceeds memory, is accessed concurrently, or is persisted?`,
        l3a:`The in-memory Big-O ranking can invert once you cross those boundaries. Cache locality means a contiguous array often beats a linked list in practice despite identical Big-O, because the linked list's pointer-chasing thrashes the CPU cache; disk-resident data wants B-trees rather than binary trees because the cost model is disk seeks, not comparisons (which is why databases use B-trees); and concurrent access introduces synchronization cost and contention, so a "slower" lock-free or sharded structure can outperform a "faster" one under a lock. At scale you also reach for probabilistic structures that trade exactness for space: Bloom filters for "probably-present / definitely-absent" membership, HyperLogLog for cardinality, count-min sketch for frequency. The senior framing: once you leave a single thread and a single memory tier, the bottleneck moves from algorithmic complexity to the memory hierarchy, I/O, and contention — and your MarketMind content-addressable registry (BLAKE3/SHA-256 keys) is exactly a hash-addressing scheme chosen for verifiable lookup and dedup at scale, not in-memory speed.`,
      },
            {
        id:`swe-8`,
        q:`What does Big-O notation tell you?`,
        anchor:`Big-O describes how an algorithm’s time or memory grows as the input becomes larger.`,
        compressed:`Big-O describes how an algorithm’s time or memory grows as the input becomes larger.`,
        detail:`Big-O is a growth-rate model. It does not predict an exact runtime, but it helps compare algorithms as input size increases. A linear scan is O(n) because doubling the input roughly doubles the work. A nested comparison of every pair is often O(n²). Binary search is O(log n) because each step removes half of the remaining search space. Hash-map lookup is average O(1), although collisions and implementation details still matter. Engineers should also consider constants, memory use, database/network costs, and typical input sizes. A theoretically better algorithm can be worse for tiny inputs or more difficult to maintain.`,
        followup:`Why can an O(n) database query still be much slower than an O(n²) loop over ten items in memory?`,
        followupAnswer:`Big-O describes relative growth rate, not absolute speed. A database query adds network latency, connection overhead, serialization, and disk I/O. n=10 in memory is nearly instant even at O(n²). The same n at a database boundary involves milliseconds per call. Algorithm choice matters at scale; constant factors and I/O costs dominate at small input sizes.`,
        tie:`Compare full sorting with top-k retrieval or repeated linear chunk lookup with a map.`,
        trap:`Treating Big-O as a benchmark measurement or ignoring input scale.`,
        l2q:`What is amortized complexity, and why can an operation that's occasionally O(n) still be O(1) on average?`,
        l2a:`Amortized analysis looks at the cost averaged over a sequence of operations rather than the worst single operation. A dynamic array's append is usually O(1), but when it fills it must allocate a bigger buffer and copy everything — an O(n) step; because it *doubles* capacity, those expensive copies happen rarely enough that the cost per append, averaged over many appends, is still O(1). The same logic explains hash-table resizing. This matters because naive worst-case-per-operation thinking would wrongly reject these structures; the guarantee is over the sequence. Keep it distinct from *average-case* complexity, which is a probabilistic statement about typical inputs — amortized is a deterministic guarantee about a run of operations, even adversarial ones.`,
        l3q:`How do you reason about performance for a whole system rather than a single algorithm, and where does Big-O mislead?`,
        l3a:`At system scale you stop caring about average-case complexity and start caring about *distributions* and *bottlenecks*. Tail latency dominates user experience — p99 matters more than the mean, and in a fan-out request you're as slow as your slowest dependency — so a system can have great average Big-O and still feel terrible. Amdahl's law tells you to optimize the actual bottleneck: speeding up code that's 5% of runtime caps your gain at 5%, so profile before optimizing. You also distinguish latency from throughput (batching trades one for the other) and watch for algorithmic-complexity attacks where a malicious input triggers the worst case — hash-collision DoS, catastrophic-backtracking regex (ReDoS) — which Big-O's "average case" hides entirely. The senior posture: measure real distributions under realistic load, attack the dominant cost, and treat worst-case behavior as a security and reliability concern, not a footnote — relevant to MarketMind's latency-sensitive backtesting where the constant factors and I/O are the whole game.`,
      },
            {
        id:`swe-9`,
        q:`What is an exception, and how should errors be handled?`,
        anchor:`An exception represents a failure that interrupts the normal flow of a program.`,
        compressed:`An exception represents a failure that interrupts the normal flow of a program.`,
        detail:`Exceptions allow code to signal that it could not complete an operation. The caller may catch the exception if it can recover, retry, return an error response, or release resources. Good error handling preserves context and translates low-level failures into language meaningful at the current boundary. A controller should not expose a raw database stack trace to a client. It might convert a missing record into a 404 response and a validation failure into a 400 response. Catching every exception and continuing can hide corruption. Catching an exception only to log and rethrow it repeatedly can create noisy duplicate logs. Errors should be handled where a real decision can be made.`,
        followup:`Which failures should be retried, and which should fail immediately?`,
        followupAnswer:`Retry transient infrastructure failures — network timeouts, temporary unavailability, rate limits with bounded backoff. Fail immediately on permanent errors — invalid input (400), unauthorized (401/403), not found (404), or business rule violations. Retrying a 400 wastes effort and won't succeed. The question is: could a second attempt produce a different outcome?`,
        tie:`Relate Python-process failures to structured Spring API errors and correlation-friendly logs.`,
        trap:`“Use try/catch so the program does not crash.”`,
        l2q:`What's the difference between recoverable failures, programming bugs, and how do exceptions vs. result types (Result/Either/Optional) handle each?`,
        l2a:`There are roughly three categories and they want different handling. Expected failures that are part of normal flow — validation failed, record not found — are best modeled as *values* the caller must handle: a \`Result\`/\`Either\` type or \`Optional\` puts the failure in the type system so it can't be silently ignored. Programming bugs — null dereference, illegal state, a broken invariant — should *fail fast* and loudly rather than be caught, because catching them hides corruption. Truly exceptional infrastructure failures sit in between and suit exceptions. The anti-pattern to avoid is using exceptions for ordinary control flow (throwing to signal "not found" on a hot path), and the anti-pattern at the other extreme is a bare \`catch (Exception)\` that swallows everything including the bugs. Your fail-closed gate runner already leans this way — explicit exit codes are a result-type-style signal that a caller *must* observe.`,
        l3q:`How do you design error handling and failure semantics across a distributed system or async pipeline?`,
        l3a:`Across process and network boundaries, errors lose their stack and their type, so you need explicit error *contracts* — stable codes and structured error responses — rather than leaked stack traces. You must also confront partial failure: in a distributed call "did it fail?" is often unanswerable, because the request may have succeeded while the acknowledgment was lost, which forces idempotency keys plus retries plus dedup so a retried request is safe. You isolate failures so one sick dependency doesn't take down the system — circuit breakers to stop hammering a failing service, bulkheads to wall off resource pools, backpressure and load-shedding under overload, dead-letter queues for messages that can't be processed. The decision that defines each component is *fail-closed vs. fail-open*: a correctness or security check (your gate, an auth check) should deny on error; an availability-first feature (a recommendation widget) might allow on error. The senior framing: choose fail-open vs. fail-closed deliberately per component based on whether correctness or availability is the priority, and treat partial failure as a first-class design concern, not an edge case.`,
      },
            {
        id:`swe-10`,
        q:`What is a unit test?`,
        anchor:`A unit test checks one small behavior in isolation and gives fast feedback when that behavior changes.`,
        compressed:`A unit test checks one small behavior in isolation and gives fast feedback when that behavior changes.`,
        detail:`A unit test exercises a focused unit such as a function, class, or service method. It controls the inputs and verifies the observable output or state change. Dependencies are often replaced with fakes or mocks so the test remains fast and deterministic. Unit tests are valuable for business rules, transformations, edge cases, and regression protection. They do not prove that components integrate correctly, so applications also need integration and end-to-end tests. Tests should protect meaningful behavior rather than implementation details; otherwise harmless refactoring breaks the test suite. A useful test name explains the scenario and expected result.`,
        followup:`What is a test that is too tightly coupled to implementation?`,
        followupAnswer:`A test that breaks when you rename a private method, reorganize internal fields, or change a collaborator — without any change in observable behavior. Testing that processOrder calls validateInventory as a mock expectation is implementation-coupled. Testing that a submitted order with insufficient inventory is rejected is behavior-coupled. Good tests document what code does for callers, not how it does it.`,
        tie:`Use the structured severe-trigger regression tests and Spring controller/service tests as examples.`,
        trap:`“A unit test tests one function” without discussing isolation, determinism, or behavior.`,
        l2q:`What is the test pyramid, and what goes wrong when it's inverted? And what's the difference between mocks, stubs, fakes, and spies?`,
        l2a:`The pyramid says have many fast unit tests at the base, fewer integration tests in the middle, and very few slow end-to-end tests at the top. Invert it into an "ice cream cone" — mostly slow, flaky E2E tests — and you get slow feedback, failures that are hard to localize, and a brittle suite people learn to ignore. The test doubles differ by purpose: a *stub* returns canned answers, a *fake* is a working lightweight implementation (an in-memory repository), a *mock* is preconfigured with expectations you assert against, and a *spy* records calls for later inspection. Over-mocking is the trap that connects to the follow-up — when you assert on *interactions* (mock expectations) instead of *outcomes*, the suite stays green while the system is actually broken, because you've tested how the code is wired rather than what it does.`,
        l3q:`Beyond example-based unit tests, what strategies catch the bugs unit tests miss — and how do you test things that are hard to test?`,
        l3a:`Match the technique to the failure mode. Example tests verify known cases; *property-based* tests assert invariants over generated inputs ("parse then serialize round-trips", "the output is always sorted") and explore the input space you'd never enumerate by hand — your strength, and the right tool for the deterministic stat renderer. *Metamorphic* testing helps when you don't know the correct answer but know a relationship that must hold (a refined search should return a subset of the broader search) — which is the realistic situation in RAG evaluation where ground truth is fuzzy. *Mutation testing* tests your tests by injecting bugs and checking the suite catches them; *fuzzing* finds crashes; *contract tests* guard service boundaries; and for nondeterministic systems you inject seeds and fake clocks to make them deterministic. For ML/RAG specifically you test *properties* and use a held-out labeled set as a regression gate rather than asserting exact outputs — your 15 labeled CQIEA eval questions *are* that gate. The senior insight: example tests pin known behavior, property tests explore the space, and where correctness is inherently fuzzy you assert invariants and treat curated evals as the regression suite.`,
      },
            {
        id:`swe-11`,
        q:`What happens in an HTTP request and response?`,
        anchor:`A client sends an HTTP request to a server, and the server returns a status, headers, and usually a body.`,
        compressed:`A client sends an HTTP request to a server, and the server returns a status, headers, and usually a body.`,
        detail:`An HTTP request includes a method such as GET or POST, a URL, headers, and sometimes a body. The server routes the request, validates inputs, runs application logic, and returns a response. The response contains a status code, headers, and an optional body. Status codes communicate categories of outcomes: 2xx success, 4xx client-side problems, and 5xx server-side failures. HTTP is stateless by default, so authentication or session context must be sent or resolved on each request. Network calls can fail, time out, or be retried, which is why idempotency and clear error contracts matter.`,
        followup:`What is the difference between a 400, 404, 409, and 500 response?`,
        followupAnswer:`400 Bad Request: the client sent something malformed — fix the request. 404 Not Found: the resource doesn't exist. 409 Conflict: the request is valid but clashes with current state — a duplicate create or optimistic-lock violation. 500 Internal Server Error: the server failed for reasons the client can't fix by changing the request.`,
        tie:`Use GET /health, POST /api/checklist, and structured API error responses.`,
        trap:`Listing methods and status codes without explaining the request lifecycle.`,
        l2q:`What does idempotency mean for HTTP methods, and why does it matter for safe retries?`,
        l2a:`An idempotent method produces the same end state whether you call it once or many times. GET, PUT, and DELETE are idempotent; POST is not. This is the practical foundation for resilient clients: when a request times out, a client can't tell whether it succeeded, so it must retry — and retrying an idempotent request is safe, while retrying a POST risks creating a duplicate resource. The fix for non-idempotent creates is an *idempotency key*: the client sends a unique token, the server records it, and a retried request with the same token returns the original result instead of creating a second record. Combined with safe methods (GET has no side effects) and statelessness (each request carries its own context, which is what lets you scale horizontally behind a load balancer), idempotency is what makes HTTP survivable over an unreliable network.`,
        l3q:`How do you design HTTP APIs for evolution, resilience, and scale — versioning, pagination, long-running operations, and read-after-write consistency?`,
        l3a:`The happy-path request/response is the easy part; the senior work is the failure and scale surfaces. *Versioning*: you can rarely break clients, so you version (URL, header, or media type) and evolve additively. *Pagination* of large collections: prefer cursor-based over offset-based, because offset pagination silently skips or repeats rows when the underlying data changes under concurrent inserts, while a cursor is stable. *Long-running operations* don't fit a synchronous request — you can't hold a connection for a ten-minute job — so you return \`202 Accepted\` with a status resource the client polls, or you call back via webhook; your checklist-generation and final-assessment endpoints are exactly the candidates to ask "is this fast enough to be synchronous, or should it be an async job with a status URL?" You also design for \`429\` rate limiting and for *read-after-write* surprises, where a client creates a record then immediately reads it and gets a \`404\` from a read replica that hasn't caught up — eventual consistency leaking through the API. The senior framing: HTTP is a transport with hard constraints, so design for the client's failure modes (retries, partial reads, stale reads) and for change over time, not just the happy path.`,
      },
            {
        id:`swe-12`,
        q:`What makes an API RESTful?`,
        anchor:`A REST-style API models resources with predictable URLs and uses HTTP methods and status codes consistently.`,
        compressed:`A REST-style API models resources with predictable URLs and uses HTTP methods and status codes consistently.`,
        detail:`REST is an architectural style, not a single library. A RESTful API usually exposes resources through URLs, uses HTTP methods according to intent, communicates outcomes with status codes, and keeps requests stateless. For example, GET /reviews/123 retrieves a review, while POST /reviews creates one. Good APIs separate transport DTOs from internal models, validate inputs, and return consistent error shapes. REST does not automatically guarantee good design; an API can use JSON and HTTP while still having confusing semantics. Operations that are workflows rather than simple CRUD may still use action-oriented endpoints when that is clearer.`,
        followup:`When is an action endpoint such as /reviews/{id}/approve reasonable?`,
        followupAnswer:`When the operation is a meaningful state transition with attached business rules — not just a field update. Approval might trigger notifications, lock the record, log the actor, or enforce workflow constraints. Forcing those into PATCH /reviews/{id} with {"status": "approved"} hides the semantics. Action endpoints are justified when transitions do more than change a field value.`,
        tie:`Discuss why checklist generation and final assessment are workflow endpoints rather than direct database CRUD.`,
        trap:`“REST means using GET, POST, PUT, and DELETE.”`,
        l2q:`REST vs. RPC vs. GraphQL — how do you choose, and what does each optimize for?`,
        l2a:`Choose by the shape of the interaction and the consumers, not by fashion. REST is resource-oriented and cache-friendly, a good fit for CRUD-ish, publicly consumed APIs. RPC (e.g., gRPC) is action-oriented, efficient, and strongly typed via a schema like protobuf — a good fit for internal service-to-service calls where the operations are verbs, not nouns. GraphQL lets the client specify exactly the fields it wants, which solves the over-fetching/under-fetching problem when you have varied clients (a mobile app and a web app with different needs), but it makes HTTP caching and rate-limiting harder and can hide expensive queries behind innocent-looking requests. Most real systems are a pragmatic mix and aren't purely RESTful, which is fine — your Java↔Python boundary could reasonably be REST or a typed RPC depending on whether you value cache-friendly resources or efficient typed calls.`,
        l3q:`How do you design API contracts that many teams or clients depend on, and evolve them safely?`,
        l3a:`Treat the API as a long-lived product with a contract you'll maintain for years, and design it consumer-first. Use *consumer-driven contracts* and contract testing — consumers declare the expectations they actually rely on, and the provider verifies them in CI — so you can change the implementation without breaking anyone or coordinating a lockstep deploy. Follow strict compatibility rules: additive changes are safe, but you never remove or repurpose a field, and clients should be *tolerant readers* that ignore unknown fields rather than choke on them. Respect Hyrum's Law: with enough consumers, every observable behavior — including undocumented quirks — becomes something someone depends on, so the surface you expose is a liability you can't easily retract. Schema-first / contract-first development makes this tractable, which is exactly your JSON-Schema-canonical-with-codegen approach: the schema is the single source of truth and you generate the Pydantic/TypeScript/Java types from it, so the contract can't silently drift from the implementations. The senior insight: at scale the contract is the expensive, permanent part — design it consumer-first, evolve it additively, and enforce it with contract tests so implementations stay swappable.`,
      },
            {
        id:`swe-13`,
        q:`What is a database transaction?`,
        anchor:`A transaction groups database operations so they succeed or fail as one logical unit.`,
        compressed:`A transaction groups database operations so they succeed or fail as one logical unit.`,
        detail:`A transaction protects a business operation that requires multiple related database changes. If one step fails, the transaction can roll back the earlier changes so the database does not remain partially updated. Transactions are commonly described with ACID properties: atomicity, consistency, isolation, and durability. Isolation determines how concurrent transactions can observe one another, and stronger isolation can reduce concurrency. Transactions should usually be kept short because long-running transactions hold locks or retain versions. A database transaction cannot automatically include an email service or external API, so cross-system workflows may need an outbox, retry logic, or compensating action.`,
        followup:`Why is calling a slow external API inside a database transaction risky?`,
        followupAnswer:`The database transaction holds locks or versioned rows for its entire duration. A slow external call extends that duration, blocking concurrent writes to the same rows. If the external call hangs or fails mid-transaction, you also face a harder rollback problem. The pattern: commit the database work first, then make the external call — and design for compensation if the external call fails after the commit.`,
        tie:`Apply this later to persisting review state and publishing an audit event.`,
        trap:`Saying a transaction is only “a SQL query that changes data.”`,
        l2q:`What do the SQL isolation levels actually protect against, and what anomalies remain at each?`,
        l2a:`Isolation levels trade concurrency for consistency by controlling which anomalies are possible. *Read uncommitted* allows dirty reads (seeing another transaction's uncommitted changes); *read committed* fixes that but allows non-repeatable reads (a row's value changes between two reads in the same transaction); *repeatable read* fixes that but can still allow phantoms (new rows appearing in a re-run query) and *write skew* (two transactions each read a consistent snapshot and write changes that are individually valid but jointly violate an invariant); *serializable* eliminates all of them by making concurrent transactions behave as if run one at a time, at the cost of throughput. Most applications run at read committed and handle the remaining gaps explicitly — typically with optimistic locking via a version column, where a stale update is rejected and surfaced as a \`409 Conflict\` (the tie back to Q11). You reach for serializable only when an invariant genuinely can't tolerate write skew, such as your review-state transitions if two reviewers could otherwise both act on the same case.`,
        l3q:`How do you maintain consistency across services when a single database transaction can't span them?`,
        l3a:`This is the heart of distributed systems, and the honest answer is that cross-system atomicity is effectively impossible to do well, so you decompose it. Two-phase commit exists but is usually avoided because it blocks and is fragile to coordinator failure. The *Saga* pattern replaces one distributed transaction with a sequence of local transactions, each with a compensating action that undoes it if a later step fails. The *Outbox* pattern solves the dual-write problem — you can't atomically update the database *and* publish to a message queue, so instead you write the business change and an event row to an outbox table in one local transaction, and a separate relay reads the outbox and publishes, guaranteeing the event fires if and only if the data committed. Consumers must be *idempotent* because messages will be redelivered (exactly-once delivery is a myth; the real world is at-least-once plus idempotency). Your "persist review state and then publish an audit event" tie-in is precisely the outbox pattern — name it as such. The senior framing: you can't have cross-service atomicity, so you build it from local transactions, events, compensation, and idempotent consumers, and you expose the resulting eventual consistency honestly rather than pretending it's instantaneous.`,
      },
            {
        id:`swe-14`,
        q:`Why do teams use Git branches and pull requests?`,
        anchor:`Git records code history, while branches and pull requests let people develop and review changes safely before merging them.`,
        compressed:`Git records code history, while branches and pull requests let people develop and review changes safely before merging them.`,
        detail:`Git is a distributed version-control system. A branch lets a developer make a sequence of changes without immediately altering the main line. A pull request presents the change for review, automated tests, and discussion. Good commits are focused and explain intent. Code review catches defects, spreads knowledge, and checks maintainability, but it should not become a substitute for testing or ownership. Merge conflicts occur when branches modify overlapping lines or assumptions. Small, frequent changes reduce conflict and make reviews more effective.`,
        followup:`What makes a pull request easy to review?`,
        followupAnswer:`A focused change that does one thing, a description explaining why not just what, small enough to review in one sitting, tests alongside the code, and no formatting changes mixed with logic changes. Reviewers should understand the intent in the first paragraph and verify the approach without reading every line sequentially.`,
        tie:`Use CI checks, architecture decision records, and focused milestones in MarketMind or the RAG project.`,
        trap:`“Branches stop people from overwriting each other” without discussing review, CI, or history.`,
        l2q:`How do branching strategies (trunk-based vs. GitFlow vs. long-lived feature branches) affect integration risk and delivery speed?`,
        l2a:`The longer a branch lives, the more the mainline drifts away from it, so integration debt and merge pain grow roughly with branch lifetime — and a painful merge is also a risky one, because you're reconciling weeks of divergent assumptions at once. Trunk-based development minimizes this by merging small changes into main continuously, using feature flags to keep half-finished work dormant in production rather than isolated on a branch; this decouples *deploy* (shipping the code) from *release* (turning it on). GitFlow's heavier branch structure suits projects with explicit release trains and versioned products but adds ceremony and longer-lived branches. CI is the safety net that makes frequent small merges viable: each merge runs the full test suite, so "integrate often" doesn't mean "break often." Your CI checks and focused milestones already point this way — small, frequently-integrated changes over big long-running branches.`,
        l3q:`How do you keep a useful, bisectable history and manage large-scale change across a codebase?`,
        l3a:`History is a debugging tool, so optimize commits for it: each commit should build and pass tests on its own, which makes \`git bisect\` a binary search that can pinpoint the exact commit that introduced a bug — worthless if commits are broken or lump unrelated changes together. Understand the merge-vs-rebase tradeoff: rebasing gives a clean linear history but rewrites commits (so you never rebase a shared branch), while merging preserves the true topology at the cost of a noisier graph. For changes too big to land atomically, use *expand-contract* (parallel-change): add the new code path, migrate callers incrementally while both paths coexist, then remove the old — never a big-bang rename across the whole repo, which is unreviewable and unbisectable. Repo-wide mechanical changes are better done with codemods than by hand, and the monorepo-vs-polyrepo choice trades atomic cross-project changes against build and tooling complexity. Your architecture decision records complement git history here: history records *what* changed and lets you bisect it, ADRs record *why* a direction was chosen so future-you doesn't relitigate it. The senior insight: treat history as part of your tooling — atomic, working, bisectable commits — and make large changes through incremental parallel-change rather than coordinated big-bang merges.`,
      },
            {
        id:`swe-15`,
        q:`How do you debug a problem systematically?`,
        anchor:`Reproduce the issue, narrow the failing layer, inspect evidence, form a hypothesis, test it, fix the root cause, and add regression protection.`,
        compressed:`Reproduce the issue, narrow the failing layer, inspect evidence, form a hypothesis, test it, fix the root cause, and add regression protection.`,
        detail:`Debugging starts by making the failure reproducible and describing expected versus actual behavior. Then reduce the problem: determine whether it is input data, application logic, database behavior, a dependency, configuration, or the environment. Use logs, traces, test cases, and small experiments to gather evidence. Form one hypothesis at a time and change one variable so the result is interpretable. After finding the cause, fix the underlying mechanism rather than only the visible symptom. Finally, add a test, validation rule, monitor, or runbook step that prevents recurrence. Random code changes may occasionally work, but they do not build confidence or understanding.`,
        followup:`How would you debug an API that works locally but fails in a container?`,
        followupAnswer:`Compare environment variables, configuration files, and secret injection between local and container. Check for platform differences (ARM vs x86, glibc vs musl). Verify port bindings, network names, and service discovery work inside the container network. Look at startup order — the container might start before its dependencies are ready. Review container logs for the exact error before guessing.`,
        tie:`Use the negation bug, stale SOP IDs, or retrieval misses from the failure log.`,
        trap:`“Check the logs and Google the error.”`,
        l2q:`How do you debug a problem you can't reproduce locally — an intermittent or production-only failure?`,
        l2a:`When you can't reproduce it, you invest in *observability* before you guess: structured logs with a correlation ID (your structlog setup), distributed traces, and metrics that make the invisible failure visible at the point it occurs. Then you reason *differentially* — what's different between the cases that pass and the cases that fail? Environment, data, timing, load, concurrency? — and you try to reproduce by capturing real production inputs and replaying them rather than inventing synthetic ones that work. Be aware of Heisenbugs: concurrency-timing bugs can vanish when you add logging because the logging changes the timing, which is itself a clue that the bug is timing-dependent. You can also binary-search the problem space in production safely with feature flags or by selectively disabling components, the same bisection instinct as \`git bisect\` applied to a running system.`,
        l3q:`How do you debug emergent failures in a distributed system — where no single component is broken but the system misbehaves?`,
        l3a:`Some failures live in the *interactions*, not the components, and looking at any single service in isolation tells you nothing. Retry storms and thundering herds, cascading failures, and *metastable* failures (a system that's stable until a trigger tips it into a self-sustaining bad state — retries raise load, which causes timeouts, which trigger more retries) are feedback-loop pathologies you can only see by reasoning about the system as a dynamic system with loops, not a static collection of parts. The tools are system-level: distributed tracing to follow one request across every service, correlation IDs to stitch logs together, and comparing healthy versus unhealthy nodes to isolate the variable. You still use hypotheses and controlled experiments, but at scale they look like canaries, dark launches, and load tests that deliberately reproduce the condition. Resist the single-root-cause story — complex systems usually fail from several contributing causes interacting, so postmortems should map the chain of contributors rather than crown one culprit, and chaos engineering surfaces these interactions before they surface themselves. Both MarketMind (a multi-language pipeline) and the Realmwalkers agent pipeline (the gate loop and the unproven planner surface) have exactly this character — the bug you'll chase hardest is in the interaction and the feedback loop, not in any one function.`,
      }
    ],
  },
  mle: {
    label: `Machine Learning I`, short: `MLE I`,
    icon: `🧠`, color: `mle`,
    questions: [
            {
        id:`mle-1`,
        q:`What is machine learning, and how is it different from rules-based programming?`,
        anchor:`Rules-based programs follow logic written directly by a developer; machine-learning systems learn patterns from examples.`,
        compressed:`Rules-based programs follow logic written directly by a developer; machine-learning systems learn patterns from examples.`,
        detail:`In rules-based programming, the developer explicitly writes conditions that map inputs to outputs. In machine learning, an algorithm uses historical examples to estimate a function that can make predictions on new data. For example, a rules engine might flag an order as delayed when a fixed threshold is exceeded, while a model might learn how several variables jointly relate to delay risk. Machine learning is useful when the relationship is too complex or changes too often for simple rules. It is not automatically better: rules can be more transparent, easier to validate, and safer when requirements are deterministic. Many production systems combine rules and models, using rules for hard constraints and models for uncertain ranking or prediction.`,
        followup:`Give an example where a rule should override a model prediction.`,
        followupAnswer:`A model might predict a borderline escalation probability of 0.48, falling just below a threshold. But if the case contains a keyword from a controlled vocabulary that triggers mandatory legal review, the rule must override. Rules encode hard constraints and safety requirements that probabilistic models should not be allowed to override — especially in regulated or safety-critical workflows.`,
        tie:`Contrast deterministic severe-trigger routing with probabilistic or retrieval-based assistance in the compounding-quality workflow.`,
        trap:`“Machine learning means the computer teaches itself.”`,
        l2q:`How do you decide between rules, ML, or a hybrid — and what's the maintenance cost of each?`,
        l2a:`Reach for ML when the pattern is complex or shifting, you have representative labeled data, and probabilistic errors are tolerable; reach for rules when requirements are deterministic, must be auditable, or labels are scarce. The maintenance profiles are opposite and often counterintuitive: rules rot *visibly* as exceptions pile up — the dreaded rule explosion where the hundredth special case contradicts the third — while ML rots *invisibly* through drift, looking healthy until performance has quietly decayed. The mature design is usually a hybrid, exactly the shape of your compounding-quality workflow: deterministic rules enforce the hard constraints and safety triggers, and the model handles the uncertain ranking and prioritization underneath them. And sometimes the right call is *no* ML — when you can't get representative labels, when errors are unacceptable, or when a three-line rule already solves it.`,
        l3q:`What does it take to operate ML responsibly in a regulated or safety-critical domain, and when is the ML risk not worth it?`,
        l3a:`The model is the easy ten percent; the responsible ninety percent is the operational and governance burden around it — monitoring, drift detection, retraining pipelines, model and data versioning with full lineage, and human-in-the-loop design. Two failure modes deserve special attention in regulated settings. The *feedback-loop / selection-bias* trap: a model whose decisions filter future data never learns about the cases it suppressed — a system that denies cases never sees whether those denials were correct — so its training data becomes progressively biased by its own past behavior. And *automation bias*: a human "reviewer" who rubber-stamps the model isn't a safeguard, so the review step has to be designed to provoke genuine scrutiny. In your pharma context, the principle is that the deterministic safety net is the *authority* and the model is *advisory*, the whole system is validated before deployment and monitored after, and you keep an explicit answer to "could this model's error harm a patient, and what stops that?" The senior framing — and the one an MLE II Legal role will probe — is that auditability, lineage, feedback-loop management, and a clear boundary between "ML may act" and "ML may only advise" are the real deliverables, not the model's accuracy number.`,
      },
            {
        id:`mle-2`,
        q:`What is the difference between supervised and unsupervised learning?`,
        anchor:`Supervised learning uses labeled examples; unsupervised learning looks for structure without a known target label.`,
        compressed:`Supervised learning uses labeled examples; unsupervised learning looks for structure without a known target label.`,
        detail:`In supervised learning, each training example has input features and a target value. The model learns to predict that target, such as a category or numeric amount. Classification and regression are supervised tasks. In unsupervised learning, there is no target label; the system may group similar records, reduce dimensionality, or discover patterns. Clustering is a common unsupervised task. Unsupervised results require careful interpretation because a discovered cluster is not automatically a meaningful business segment. Semi-supervised learning combines a small labeled set with a larger unlabeled set, while self-supervised learning creates learning signals from the data itself.`,
        followup:`Why can clustering produce technically valid but operationally useless groups?`,
        followupAnswer:`The algorithm optimizes a mathematical criterion like within-cluster distance, not a business objective. A cluster might group records sharing a numerical pattern but representing completely different business situations. The labels assigned are arbitrary numbers, not meaningful categories. Interpreting them as actionable segments requires domain knowledge, and the clusters may change when data updates.`,
        tie:`Relate supervised labels to hand-written expected outputs and unsupervised similarity to embeddings.`,
        trap:`Saying supervised means “a human watches the model train.”`,
        l2q:`Where do self-supervised and semi-supervised learning fit, and why have they become dominant for text and images?`,
        l2a:`They exist because labels are expensive and raw data is nearly free, so techniques that exploit unlabeled data win on economics. *Self-supervised* learning manufactures labels from the data itself — predict the next token, predict a masked word, pull augmented views of the same image together and different images apart (contrastive learning) — which is exactly how the embeddings in your RAG system and the LLMs behind it are pretrained on enormous unlabeled corpora. *Semi-supervised* learning combines a small labeled set with a large unlabeled one, via pseudo-labeling or by using active learning to spend your scarce labeling budget on the most informative examples. The practical upshot for you: the embedding model you retrieve with isn't trained on your labels at all — it inherited its sense of similarity from self-supervised pretraining, which is both why it works out of the box and why it can encode notions of "similar" that don't match your domain.`,
        l3q:`How do you validate that an unsupervised result (clusters, embeddings, topics) is actually meaningful and stable, rather than an artifact?`,
        l3a:`The hard truth is that unsupervised learning has no ground truth, so "meaningful" has to be defined by something outside the algorithm. Internal metrics like silhouette score or within-cluster cohesion are circular — they measure how well the data fits the criterion the algorithm already optimized — so real validation is *external*: does the structure hold up against held-out labels, or does it improve a downstream task you actually care about? You also test *stability*: re-run across bootstraps, seeds, and data refreshes, and if the clusters reshuffle each time, they're an artifact, not a finding (your own observation that clusters change when data updates). For embeddings specifically, intrinsic similarity benchmarks are a weak proxy; the only validation that matters is *extrinsic* — whether retrieval improves on your labeled eval set — not whether the clusters look tidy. And beware post-hoc storytelling: any cluster can be given a plausible narrative, and that narrative feels like confirmation, but it isn't evidence. The senior framing: unsupervised methods generate *hypotheses*, not conclusions — you validate them against a downstream objective or a held-out signal and check stability before trusting them.`,
      },
            {
        id:`mle-3`,
        q:`What are features and labels?`,
        anchor:`Features are the inputs a model uses; the label is the outcome the model is trained to predict.`,
        compressed:`Features are the inputs a model uses; the label is the outcome the model is trained to predict.`,
        detail:`A feature is a measurable input such as dosage form, order age, text length, or previous event count. The label is the target, such as whether a case belongs to a category or how long a process will take. Good features should be available at the time the prediction is made and should represent the problem without leaking future information. Features may be raw, transformed, aggregated, encoded, or derived from other data. Labels also need clear definitions because inconsistent labeling creates a ceiling on model quality. A model can only learn the patterns present in its feature and label construction.`,
        followup:`Why is “final resolution code” a dangerous feature for predicting a case’s initial risk?`,
        followupAnswer:`The final resolution code is assigned after the case is decided — it describes the outcome, not the initial condition. Using it as a feature means the model learns to predict the resolution using the resolution itself. At prediction time (when the case is first submitted), that code doesn't exist yet. The model appears highly accurate in evaluation but fails completely in production.`,
        tie:`Use controlled taxonomy fields, retrieval metadata, and expected-output labels as examples of explicit definitions.`,
        trap:`Treating every available column as a valid feature.`,
        l2q:`What's the difference between feature engineering and representation learning, and when is each appropriate?`,
        l2a:`Hand-crafted feature engineering encodes domain knowledge into explicit, interpretable inputs and works well with limited data — it dominates tabular problems like MarketMind, where a well-chosen derived feature can carry real signal. Representation learning instead lets the model learn its own features from raw data (embeddings, deep networks), which dominates text, vision, and audio but needs lots of data to pay off. The crossover point is largely about data scale: below it, your domain knowledge beats whatever a model would learn; above it, learned representations capture structure you'd never hand-engineer. Two practical cautions: more features isn't better — too many invite overfitting, multicollinearity, and the curse of dimensionality, so feature selection matters — and whichever approach you use, the features must be computed identically at training and serving time (the consistency problem the Level III answer takes up).`,
        l3q:`How do you ensure feature consistency between training and serving, and prevent the point-in-time leakage that plagues feature pipelines?`,
        l3a:`The single most common production-ML failure isn't a bad model — it's *training/serving skew*: features computed one way in the offline training pipeline and a different way in the online serving path, so the model meets a different input distribution in production than it trained on and silently underperforms. The fix is shared transformation code or a feature store, so both paths compute features from one implementation rather than two that drift. The subtler hazard is *point-in-time correctness*: when you join features to labels for training, each feature must reflect only what was known at the label's timestamp, or you leak the future into the past. This bites hardest with aggregations — a "30-day average" feature can quietly include data from *after* the prediction point if the windowing is sloppy, producing a model that's brilliant in backtest and useless live. Your MarketMind discipline of time-aware splits and canonical preprocessing outputs is precisely what guards against this. The senior insight: most "the model got worse in prod" incidents are feature-pipeline incidents — skew and point-in-time leakage — and preventing them takes shared transformation code and point-in-time-correct feature computation, not more careful modeling.`,
      },
            {
        id:`mle-4`,
        q:`Why do we split data into training, validation, and test sets?`,
        anchor:`Training data fits the model, validation data guides choices, and test data estimates final performance on unseen data.`,
        compressed:`Training data fits the model, validation data guides choices, and test data estimates final performance on unseen data.`,
        detail:`The training set is used to learn model parameters. The validation set is used to compare models, choose features, tune hyperparameters, and set thresholds. The test set should remain untouched until the design is mostly finalized so it can provide a less biased estimate of generalization. If the same data guides every decision and reports final performance, the result becomes overly optimistic. The split must respect the real deployment setting. Time-dependent data should usually be split chronologically, and records from the same person, site, or entity may need to remain in one partition to prevent leakage. Small datasets may use cross-validation, but a final held-out test is still valuable.`,
        followup:`Why is a random split risky for time-series or repeated-customer data?`,
        followupAnswer:`Random splitting lets future data leak into training — a model trained on month-12 records sees patterns unavailable when predicting month-3 cases. For repeated customers, the same person may appear in both partitions, so the model learns individual quirks rather than generalizable patterns. The split must preserve temporal order and keep all records for one entity in one partition.`,
        tie:`Apply this to retrieval evaluation fixtures or MarketMind’s time-based model validation.`,
        trap:`“Use 80/20 because that is the standard.”`,
        l2q:`What's the practical difference between the validation set and the test set, and how does repeatedly looking at validation degrade it?`,
        l2a:`The validation set is used *many* times — every model comparison, hyperparameter sweep, feature decision, and threshold choice consults it — and each consultation lets your choices fit the validation set a little more, so over a project it slowly stops being an unbiased estimate. This is adaptive overfitting, sometimes called "leakage through the researcher," and it's why Kaggle teams who top the public leaderboard often drop on the private one: they overfit the feedback signal. The test set exists to escape this — you touch it once, at the end, after the design is frozen. When you both tune *and* need an honest estimate, nested cross-validation separates the two roles. The direct caution for CQIEA: if you keep tuning retrieval against the same 15 eval questions, those questions gradually become a training signal, and their reported numbers will overstate how the system handles genuinely new questions.`,
        l3q:`How do you evaluate with very little labeled data, severe imbalance, or non-stationary data — and what are the limits of held-out evaluation?`,
        l3a:`Each pathology needs a tailored scheme: nested cross-validation stretches small data, stratification preserves class ratios under imbalance, and time-series CV — walk-forward, or your MarketMind CPCV (combinatorial purged cross-validation, which purges samples whose label windows overlap the test fold) — handles non-stationarity and overlapping labels. But the deeper point is that *all* held-out evaluation assumes train and deployment are drawn from the same distribution, and under drift that assumption fails, so offline metrics systematically overstate online performance. Two specific traps live here. *Backtest overfitting* via multiple testing: try enough strategies or configurations and one looks excellent by pure chance, which is exactly what your deflated Sharpe ratio corrects for by adjusting for the number of trials. And the fact that the only truly honest test of a deployed system is *online* — A/B testing or interleaving on live traffic — because that's the one setting where the deployment distribution is real. The senior framing: held-out test sets estimate generalization only under the i.i.d. assumption; for non-stationary or heavily-searched problems you need purged/walk-forward validation plus multiple-testing correction, and ultimately online evaluation, because every offline number is optimistic. This is squarely MarketMind territory.`,
      },
            {
        id:`mle-5`,
        q:`What is data leakage?`,
        anchor:`Leakage occurs when training or evaluation uses information that would not actually be available at prediction time.`,
        compressed:`Leakage occurs when training or evaluation uses information that would not actually be available at prediction time.`,
        detail:`Leakage makes a model appear better than it will be in production. Target leakage occurs when a feature directly or indirectly contains the outcome. Train-test contamination occurs when preprocessing, duplicates, or related entities cross the split boundary. Temporal leakage occurs when future information is used to predict the past. For example, fitting a scaler on the full dataset lets test-set statistics influence training. Leakage can also occur through labels created after the decision point. Prevention requires defining the prediction timestamp, fitting transformations only on training data, grouping related records, and reviewing feature lineage. Extremely high validation performance should trigger a leakage investigation.`,
        followup:`How can duplicate records create leakage even when the target column is removed?`,
        followupAnswer:`If the same underlying event appears in both train and test with slightly different IDs or timestamps, the model sees the exact input during training and essentially memorizes it. At test time it retrieves that memorized pattern rather than generalizing, inflating metrics artificially. Deduplication on a stable content hash — not just an ID — is needed before splitting.`,
        tie:`Connect content-hash deduplication and time-aware MarketMind splits to leakage prevention.`,
        trap:`Defining leakage only as “including the label as a feature.”`,
        l2q:`What are the most common subtle leakage sources beyond duplicates and target leakage, and how do you audit for them?`,
        l2a:`The recurring culprits are: *preprocessing before splitting* (fitting a scaler, imputer, or feature selector on the full dataset so test statistics bleed into training — the same mechanism as Q10's follow-up), *group leakage* (the same patient, site, or entity landing on both sides of the split), *temporal leakage* via look-ahead features, *label-definition leakage* (the label depends on information generated after the decision point), and *join leakage* (merging external data without aligning timestamps). The audit procedure is mechanical and worth ritualizing: trace every feature's lineage and ask "was this knowable at the moment of prediction?", and treat any suspiciously high metric as a leakage alarm rather than a victory. Your content-hash deduplication is the right instrument for the duplicate case specifically.`,
        l3q:`How does leakage manifest in modern pipelines — embeddings, pretrained models, confounded features — and how do you reason about it?`,
        l3a:`Two newer forms and one deep one. *Pretraining contamination*: your test questions, or near-duplicates of them, may have been in the foundation model's or embedding model's pretraining corpus, so benchmark scores are inflated by memorization rather than capability — a live, much-discussed problem in LLM and RAG evaluation that directly touches your work. *Learned-representation leakage*: if the embeddings were trained on data overlapping your evaluation set, similarity is artificially easy. The deepest form is a *confounded / spuriously-correlated* feature — one that's predictive in training through a non-causal path that won't survive deployment: a hospital ID that encodes severity because sicker patients route to specialist hospitals, so the model learns "this hospital ⇒ high risk" and then fails when deployed elsewhere. You can't catch that by checking column overlap; you catch it by reasoning about whether the relationship is *causal* and will hold under intervention or distribution shift. Financial features are notoriously confounded and non-causal, so this is a MarketMind hazard as much as a clinical one. The senior insight: in the foundation-model era, leakage includes pretraining contamination and representation leakage, and its subtlest form is a feature predictive through a spurious path — detectable only by asking whether the relationship is causal and shift-stable, not by checking for shared rows.`,
      },
            {
        id:`mle-6`,
        q:`What are overfitting and underfitting?`,
        anchor:`Underfitting means the model is too simple to learn the pattern; overfitting means it learns the training data too specifically and fails on new data.`,
        compressed:`Underfitting means the model is too simple to learn the pattern; overfitting means it learns the training data too specifically and fails on new data.`,
        detail:`An underfit model performs poorly on both training and validation data because it has insufficient capacity, weak features, or too much regularization. An overfit model performs very well on training data but substantially worse on validation or production data because it learned noise or dataset-specific details. The goal is not maximum training accuracy but good generalization. Remedies for underfitting include better features, a more suitable model, or less restrictive assumptions. Remedies for overfitting include more representative data, simpler models, regularization, early stopping, pruning, and stronger validation. Learning curves comparing train and validation performance help diagnose the problem.`,
        followup:`What pattern in training and validation scores suggests overfitting?`,
        followupAnswer:`Training accuracy is high and improving while validation accuracy plateaus or decreases. The gap between training and validation performance grows rather than converging. On a learning curve, overfitting shows as low training error that stays low while validation error rises as model complexity increases.`,
        tie:`Relate this to adding complex retrieval or model features only when evaluation evidence supports them.`,
        trap:`“Overfitting means the model is too accurate.”`,
        l2q:`What is the bias-variance tradeoff, and how do regularization techniques actually reduce variance?`,
        l2a:`Total expected error decomposes into bias (error from wrong assumptions — the model is too rigid, underfitting), variance (error from sensitivity to the particular training sample — the model chases noise, overfitting), and irreducible noise. Plotting test error against model complexity gives the classic U-curve: high-bias on the left, high-variance on the right, sweet spot in the middle. Regularization reduces variance by constraining the model's effective freedom: L2/weight decay shrinks weights toward zero, L1 drives some to exactly zero (doubling as feature selection), dropout approximates training an ensemble, early stopping caps effective capacity before it memorizes, and data augmentation manufactures more effective samples. More data also reduces variance (not bias) by making the training sample more representative. Your rule of adding retrieval or model features only when evaluation evidence supports them is variance management in practice — every added degree of freedom is a chance to fit noise.`,
        l3q:`Where does the classical bias-variance U-curve break down for modern over-parameterized models, and what does that change?`,
        l3a:`Deep networks violate the classical picture through *double descent*: as you increase capacity, test error follows the usual U down then up, peaks at the *interpolation threshold* (where the model has just enough parameters to fit the training data exactly), and then — counterintuitively — descends *again* as the model grows even larger, so a massively over-parameterized network can generalize well despite fitting its training data perfectly. The explanation involves the *implicit regularization* of SGD, which among the infinitely many interpolating solutions tends to find "simple" ones; this is why the huge models behind your embeddings and LLMs generalize at all (sometimes called benign overfitting, and the related "grokking" phenomenon). The practical consequence is that "reduce capacity to fix overfitting" is *wrong advice* for deep nets — you regularize with data, augmentation, dropout, and early stopping, and you often go *bigger*, not smaller. The crucial caveat: this is regime-dependent. For your tabular MarketMind models, the classical bias-variance tradeoff still rules and capacity control is still the right lever; double descent is a deep-network phenomenon, so the senior move is knowing which regime your model class is in before choosing your overfitting strategy.`,
      },
            {
        id:`mle-7`,
        q:`What is the difference between classification and regression?`,
        anchor:`Classification predicts categories; regression predicts numeric values.`,
        compressed:`Classification predicts categories; regression predicts numeric values.`,
        detail:`A classification model predicts a discrete class such as approved, rejected, or needs_review. It may output class probabilities that are later converted into a decision using a threshold. A regression model predicts a continuous numeric value such as duration, demand, or cost. The choice should follow the business question rather than the algorithm name. Some problems can be framed either way: predicting exact delay minutes is regression, while predicting whether delay exceeds two days is classification. Evaluation metrics differ, and converting a continuous outcome into categories loses information but may align better with an operational decision.`,
        followup:`When would converting a regression target into risk bands be useful or harmful?`,
        followupAnswer:`Useful when the business decision is categorical — escalate if high risk, monitor if medium, close if low — because a label maps directly to an action. Harmful when the threshold is arbitrary, hides important variation within a band, or loses the ranking precision needed to prioritize cases (all 'high risk' cases get the same treatment even if one has 0.99 probability and another has 0.72).`,
        tie:`Compare predicting a risk lane with predicting a continuous processing time.`,
        trap:`Saying regression is only linear regression or classification is only binary.`,
        l2q:`How do you handle ordinal targets, multi-label problems, and probability calibration — cases that don't fit clean binary classification or plain regression?`,
        l2a:`Real targets often sit between the textbook categories. *Ordinal* targets have ordered classes — your risk bands aren't just three labels, low < medium < high — so ordinal regression respects the ordering that plain multiclass throws away and that regression-then-threshold handles awkwardly. *Multi-label* problems let one instance carry several labels at once (a case tagged with multiple issue types), which is structurally different from multiclass where the classes are mutually exclusive. *Probability calibration* is the one people skip: a model's "0.8" should actually mean 80% in the long run, but many models output uncalibrated scores, so you apply Platt scaling or isotonic regression to make the numbers trustworthy. Calibration matters specifically because you *threshold* and *rank* by these probabilities in your risk-lane prediction — and threshold selection is a separate decision from training the model, driven by costs rather than baked in.`,
        l3q:`What does it mean for predicted probabilities to be calibrated, and why does calibration matter more than accuracy for risk-based decisions?`,
        l3a:`*Discrimination* (does the model rank positives above negatives, measured by AUC) and *calibration* (are the probabilities numerically truthful) are independent — a model can rank perfectly while being wildly overconfident, or be well-calibrated while discriminating poorly. The reason calibration often matters more is that you *act on the probability itself*: you escalate when P exceeds 0.7, size a MarketMind position by the predicted probability, or route a case by its risk score — and if the model says 0.7 when the true rate is 0.5, every one of those thresholds is misplaced even though accuracy might look fine. Modern neural nets are frequently badly miscalibrated (systematically overconfident), proper scoring rules like log loss and Brier score reward calibration while plain accuracy ignores it, and distribution shift tends to break calibration before it breaks ranking. This connects directly to your documented RQ2 work: when you need *reliable* uncertainty rather than just a point estimate, conformal prediction gives distribution-free coverage guarantees — a principled way to say "this prediction set contains the truth with 90% probability" without assuming the model's probabilities are correct. The senior insight: for any decision that acts on a probability or ranks by risk, calibration and reliable uncertainty quantification outrank raw accuracy — you measure them with proper scoring rules and reliability diagrams, recalibrate when they drift, and reach for conformal methods when you need guaranteed coverage.`,
      },
            {
        id:`mle-8`,
        q:`What do accuracy, precision, recall, and F1 measure?`,
        anchor:`Accuracy measures overall correctness; precision measures how often positive predictions are right; recall measures how many real positives are found; F1 balances precision and recall.`,
        compressed:`Accuracy measures overall correctness; precision measures how often positive predictions are right; recall measures how many real positives are found; F1 balances precision and recall.`,
        detail:`Accuracy is the fraction of all predictions that are correct. It can be misleading when one class is much more common than another. Precision is true positives / predicted positives, so it answers: when the model flags something, how often is it correct? Recall is true positives / actual positives, so it answers: of all real cases, how many did the model find? F1 is the harmonic mean of precision and recall and is useful when both matter. The correct metric depends on the cost of false positives and false negatives. A safety-screening system may prioritize recall, while an expensive manual-review queue may need adequate precision to avoid overwhelming reviewers.`,
        followup:`Which metric would you prioritize for detecting a rare severe escalation case, and why?`,
        followupAnswer:`Recall. A false negative (missed severe case) causes patient or regulatory harm; a false positive (unnecessary escalation) wastes reviewer time. The asymmetry of consequences means catching every real case matters more than avoiding false alarms. You then manage the false-positive rate through threshold tuning, reviewer capacity, or secondary triage.`,
        tie:`Relate recall to severe-trigger detection and precision to avoiding unnecessary leadership escalation.`,
        trap:`Choosing F1 automatically without discussing business costs or class imbalance.`,
        l2q:`Why is accuracy misleading under class imbalance, and what metrics handle it — PR curves, ROC, and the precision-recall tradeoff?`,
        l2a:`With 1% positives, a model that predicts "negative" for everything scores 99% accuracy and 0% recall — useless but impressive-looking, which is why accuracy is the wrong headline metric under imbalance. The confusion matrix is the foundation, and from it you read a *precision-recall curve* by sweeping the decision threshold; under heavy imbalance the PR curve is more informative than an ROC curve, because ROC's false-positive rate is diluted by the enormous negative class and can look deceptively good while precision is actually poor. Precision and recall trade off as the threshold moves, so you don't pick a default operating point — you choose it from the business costs, which for your severe-trigger detection means accepting more false positives to push recall up. PR-AUC summarizes the curve when you need a single number for an imbalanced problem.`,
        l3q:`How do you choose an operating point and evaluate when costs are asymmetric, uncertain, or changing — and how does the metric connect to the actual decision and its downstream load?`,
        l3a:`Step up from "which metric" to *cost-sensitive decision theory*: the model output feeds a decision with real utilities, so the right objective is expected cost — cost_FP × (false positives) + cost_FN × (false negatives) — and you choose the threshold that minimizes it rather than the one that maximizes F1. Crucially, that optimal threshold depends on *both* the base rate and the cost ratio, and both can shift over time, so the operating point isn't set-and-forget. You also have to respect *capacity constraints*: if reviewers can only handle k cases a day, the metric that matters is precision@k, not global precision — your manual-review-queue concern made quantitative. The deepest framing is that metrics are *proxies* for the expected utility of a decision, and a system can hit a great F1 while being something nobody wants if F1 wasn't the real objective (metric gaming, proxy misalignment), which is why you usually monitor several metrics and re-evaluate as costs move. Your instinct to prioritize recall for severe cases *and* protect reviewer precision is the seed of exactly this — two competing costs under a capacity limit. The senior insight: frame evaluation as cost-sensitive decision-making under a capacity constraint and shifting base rates, set the operating point from real costs, and watch for the metric quietly diverging from the actual objective.`,
      },
            {
        id:`mle-9`,
        q:`Why should you build a baseline model first?`,
        anchor:`A baseline gives a simple reference that more complex models must beat.`,
        compressed:`A baseline gives a simple reference that more complex models must beat.`,
        detail:`A baseline prevents the team from confusing complexity with value. For classification, a baseline might predict the majority class, use a simple rule, or fit logistic regression. For regression, it might predict the mean or median. The baseline establishes whether the features contain useful signal and whether a sophisticated approach creates a meaningful improvement. It also provides a fallback that is easier to debug and operate. A complex model that gains a tiny metric improvement but greatly increases latency, cost, or maintenance may not be worthwhile. Baselines should include both predictive performance and operational characteristics.`,
        followup:`What would be a useful baseline for a document-retrieval system?`,
        followupAnswer:`Keyword search (BM25 or TF-IDF) is the right baseline — interpretable, fast, deterministic, and often competitive. It gives you a concrete score to beat. A model that only marginally outperforms keyword search on expensive embeddings may not justify the added cost and complexity. The baseline must be measured on the same labeled evaluation set as any fancier approach.`,
        tie:`Use keyword retrieval as the transparent baseline before embeddings and hybrid retrieval.`,
        trap:`Treating the baseline as a disposable toy rather than a measured comparator.`,
        l2q:`What makes a baseline *fair*, and how do you avoid the two opposite mistakes — a strawman baseline and an unfairly-tuned comparison?`,
        l2a:`A fair baseline gets the same data, the same evaluation set, the same preprocessing, and a reasonable (not adversarial, not lovingly hand-optimized) amount of effort. The strawman mistake is comparing your model to a deliberately weak, untuned baseline so that any improvement looks impressive — false progress. The opposite mistake is comparing a carefully tuned model to an untuned baseline, which is unfair *to the baseline* and overstates your gain; if you tune one, tune both comparably or report the asymmetry honestly. Ablations are baselines turned inward — remove one component at a time and check whether the model still wins, which tells you whether each piece earns its keep. For CQIEA the concrete instance is BM25 versus embeddings on the *same* 15 questions with the *same* preprocessing, so the comparison measures the method and not an accidental advantage.`,
        l3q:`How do you design an evaluation harness and ablation strategy that tells you which components actually contribute, and guards against fooling yourself across many experiments?`,
        l3a:`Treat the eval harness as an experimental apparatus whose primary job is to keep *you* honest, because the default failure mode of model development is mistaking noise for signal. Run *ablations* that remove one component at a time — reranker, hybrid fusion, query expansion — to attribute the gain to its actual source, and control confounds by changing exactly one variable per run with fixed seeds, data, and eval (the same discipline as systematic debugging). Confront the *multiple-comparisons* trap head-on: try fifty configurations and the best one looks great by luck, so you need held-out confirmation and an awareness of how many things you tested — your MarketMind DSR is exactly this correction applied to strategies. Report *variance*, not a single number: a lone eval score with no spread is unreliable, so you bootstrap confidence intervals on the metric and use paired significance tests to ask whether an improvement is real or within noise. And value *negative* results — learning that embeddings *don't* beat BM25 on your data saves real cost and complexity. Your structured RQ research program and MarketMind statistical controls already embody this mindset. The senior insight: a good eval harness is an apparatus for not fooling yourself — fair baselines, one-variable ablations, variance and significance reporting, and multiple-testing discipline — because believing noise is signal is the most expensive mistake in modeling.`,
      },
            {
        id:`mle-10`,
        q:`Why do preprocessing steps need to be part of the model pipeline?`,
        anchor:`Training and inference must transform data in the same way.`,
        compressed:`Training and inference must transform data in the same way.`,
        detail:`Models expect inputs with the same meaning and representation they saw during training. Preprocessing may include missing-value handling, scaling, category encoding, tokenization, or feature generation. If training code and production code implement these steps separately, they can drift and produce inconsistent features. A pipeline packages transformations with the model so the same fitted parameters are reused at inference. Transformations that learn statistics, such as means or category vocabularies, must be fit only on training data. Versioning the preprocessing logic is as important as versioning the model because a feature change can alter predictions even when model weights stay the same.`,
        followup:`Why is fitting a scaler before splitting the dataset a form of leakage?`,
        followupAnswer:`The scaler learns statistics (mean, standard deviation, minimum, maximum) from the data it is fit on. If fit on the full dataset including test rows, those test-row statistics influence the transformation applied during training. The model then sees slightly different feature values than a truly unseen row would produce. Scalers must be fit only on training data and applied to validation and test data.`,
        tie:`Relate this to canonical preprocessing outputs and avoiding ad hoc experiment-specific feature frames in MarketMind.`,
        trap:`Treating preprocessing as harmless cleanup that can be repeated differently in each script.`,
        l2q:`How do you package preprocessing so it can't drift, and what do serialized pipelines and feature stores actually solve?`,
        l2a:`The mechanism that prevents drift is *one* implementation of the transformations, fitted on training data, serialized *with* the model, and re-applied at inference — a scikit-learn \`Pipeline\` or equivalent that travels as a single artifact, so there's no second hand-written copy of the logic in the serving code to fall out of sync. A *feature store* generalizes this across an organization: it computes features once and serves the identical values to both the training pipeline (offline) and the live model (online), which is how teams guarantee online/offline parity at scale. The discipline that ties it together is versioning preprocessing in lockstep with the model, because a change to a transformation can move predictions even when the weights are byte-for-byte identical — so a "model version" that doesn't pin its preprocessing version is underspecified. Your Spring↔Python boundary is precisely where this risk lives: if feature computation happens on both sides, they must share code or a contract.`,
        l3q:`How do you make preprocessing pipelines reproducible and safe to evolve in production — data contracts, schema validation, and versioned feature definitions?`,
        l3a:`At production scale, preprocessing is *code plus data plus schema*, and all three need governance. *Data contracts and schema validation* sit at the pipeline's input (think Great-Expectations-style checks) and fail loudly when an upstream feed changes type, range, or null-rate — because the alternative is a silent transformation of garbage that produces a confident wrong prediction (the same "fail explicitly, don't silently impute" principle as the deployment question). *Versioning* must cover the transformation code, the fitted parameters, and the feature *definitions*, because changing a definition silently changes predictions for everyone downstream and may require *backfilling* historical features so old and new aren't mixed. You also distinguish *code* versioning (Git) from *data/artifact* versioning (content-addressed snapshots), since the same code over different data is a different result — your BLAKE3 content-addressable registry is exactly this idea done rigorously. And you watch for *input* drift at the pipeline boundary as an early signal that the world has moved under your transformations. The senior insight: production preprocessing is a versioned, schema-validated data pipeline, not a cleanup script — you enforce data contracts at the input, version code and data and feature definitions together, and evolve feature definitions through backfills rather than silent in-place changes.`,
      },
            {
        id:`mle-11`,
        q:`What is cross-validation?`,
        anchor:`Cross-validation evaluates a model across several train/validation partitions instead of relying on one split.`,
        compressed:`Cross-validation evaluates a model across several train/validation partitions instead of relying on one split.`,
        detail:`In k-fold cross-validation, the data is divided into k folds. The model trains on k minus one folds and validates on the remaining fold, repeating until each fold has served as validation. The results are averaged to estimate performance and variability. Cross-validation uses limited data efficiently and helps reveal sensitivity to a particular split. The folds still need to respect groups, time, or hierarchy; ordinary random k-fold is not valid for every problem. Cross-validation can be computationally expensive because the full pipeline is fitted multiple times. It should be performed inside the training workflow so preprocessing does not leak across folds.`,
        followup:`What is the difference between ordinary k-fold and time-series cross-validation?`,
        followupAnswer:`Ordinary k-fold assigns records to folds randomly, which can put future records in training and past records in validation. Time-series cross-validation always trains on earlier data and validates on later data, using an expanding or sliding training window. For any time-dependent signal, ordinary k-fold is invalid because it violates the temporal ordering constraint.`,
        tie:`Connect this to combinatorial purged cross-validation concepts in MarketMind, while explaining the simpler k-fold foundation first.`,
        trap:`“Cross-validation means testing the model multiple times.”`,
        l2q:`What are stratified, group, and nested cross-validation, and what problem does each solve?`,
        l2a:`They're k-fold adapted to the structure of your data. *Stratified* k-fold preserves the class proportions in every fold, which is essential under imbalance — without it, a rare class can be absent from some folds entirely, making those folds meaningless. *Group* k-fold (GroupKFold, leave-one-group-out) keeps all records belonging to one entity — a patient, a customer, a site — together in a single fold, preventing the group leakage from your repeated-customer follow-up where the model otherwise learns individual quirks that don't generalize. *Nested* cross-validation runs an inner loop for hyperparameter tuning inside an outer loop for performance estimation, which you need when you both select a model and report its score; a single CV used for both purposes overstates performance for the same adaptive-overfitting reason the validation set does. The skill is matching the scheme to the data's structure rather than reflexively running random k-fold.`,
        l3q:`Why does naive cross-validation fail for time-series and overlapping-label data, and what do purging and embargoing fix?`,
        l3a:`CV's validity rests on the i.i.d. assumption — samples independent and identically distributed — and time-series violates *both* halves: autocorrelation breaks independence, and non-stationarity breaks identical distribution, so the standard machinery quietly lies. Even a time-ordered split can leak when *labels overlap*: in finance a label computed over a forward window means adjacent samples share information, so a training sample's label window can overlap a validation sample, leaking the future. *Purging* removes training samples whose label windows overlap the validation set; *embargoing* additionally drops samples immediately after the validation period to kill serial-correlation leakage across the boundary. *Combinatorial Purged Cross-Validation* — your CPCV — generates many purged train/test combinations to produce a robust, leakage-free *distribution* of performance rather than a single fragile number, and walk-forward analysis is the simpler sequential cousin. The senior insight: cross-validation is only valid under i.i.d. assumptions, so for time-series and overlapping-label problems you must purge and embargo to remove inter-fold information leakage — otherwise CV produces confidently wrong estimates, which is the canonical way backtests deceive quants. This is core MarketMind.`,
      },
            {
        id:`mle-12`,
        q:`What happens when a trained model is deployed?`,
        anchor:`Deployment makes the trained model available to produce predictions on new inputs.`,
        compressed:`Deployment makes the trained model available to produce predictions on new inputs.`,
        detail:`A deployed model needs more than a serialized file. The serving system must load the correct model and preprocessing versions, validate requests, transform inputs, generate predictions, and return a stable response. It also needs latency limits, error handling, logging, access controls, and health checks. Models may run synchronously behind an API, asynchronously in batch jobs, or inside a streaming pipeline. Deployment should include a rollback path and a way to compare the new version with the previous version. A model can be statistically good and still fail operationally because of missing dependencies, incompatible schemas, excessive latency, or unavailable features.`,
        followup:`What should happen when a required feature is missing at inference time?`,
        followupAnswer:`The system should fail explicitly with a clear error rather than silently substituting a default or zero. A missing required feature often means the upstream data pipeline failed, not that the feature is genuinely zero. Silently imputing produces a prediction based on incorrect assumptions. The error should identify which feature is missing so the issue can be diagnosed upstream.`,
        tie:`Use the Spring API boundary and Python engine as an example of separating application serving from model/RAG behavior.`,
        trap:`“Deploy the .pkl file to the cloud.”`,
        l2q:`What deployment patterns let you release a model safely — shadow, canary, blue-green, A/B — and what does each tell you?`,
        l2a:`Each separates *deploy* from *release* and gives you a different signal. *Shadow* deployment runs the new model on real traffic without acting on its outputs, so you can compare predictions and catch errors with zero user impact — the safest first step. *Canary* routes a small percentage of live traffic to the new model, watches metrics, and ramps up only if they hold. *Blue-green* keeps two environments so you can switch instantly and, just as importantly, roll back instantly. *A/B testing* measures the *business* metric, not just the model metric, and is the only one of these that actually tells you whether the new model *helps* rather than merely scores better offline. The unifying principle, and your stated tie-in, is to always have a rollback path and to validate on real traffic before trusting a model — because offline metrics are optimistic (Q4) and the production distribution is the only honest test.`,
        l3q:`What does production ML serving require beyond the model — latency budgets, the online/offline gap, feedback loops, and graceful degradation?`,
        l3a:`The model is a small piece of a serving *system*, and the senior concerns are the surfaces around it. *Latency*: the model may be fast while fetching its features from an online store is slow, and what the user feels is the p99 across the *whole* path, so you budget feature-retrieval plus inference together, decide between batching and real-time, and account for cold starts. The *online/offline gap*: offline you have every feature and all the time you want, while online you have a latency budget and possibly stale or missing features, so a model that's brilliant in the notebook can fail at the boundary. *Feedback loops*: in ranking and recommendation systems the model's own predictions shape what users see and therefore what future training data looks like, so the data stops being representative — a trap your potential MLE work will hit directly. You monitor the right things (input drift and prediction drift immediately, label-based performance later when ground truth arrives), load model and feature versions in lockstep (the reproducibility tie to Q15), and design *graceful degradation* — fall back to a simpler model or to rules when the ML path fails, which is the fail-open/fail-closed decision from the error-handling question applied to inference. The senior insight: a deployed model lives inside a serving system whose hard parts are the latency budget across feature retrieval and inference, the online/offline gap, feedback loops that corrupt future training data, version lockstep, and graceful degradation — an offline-accurate model routinely fails on exactly these. Your Spring↔Python separation and the unproven planner/gate surfaces in the Realmwalkers pipeline are this territory.`,
      },
            {
        id:`mle-13`,
        q:`What is model drift?`,
        anchor:`Drift means the production data or the relationship between inputs and outcomes changes over time.`,
        compressed:`Drift means the production data or the relationship between inputs and outcomes changes over time.`,
        detail:`Data drift occurs when the distribution of input features changes. Concept drift occurs when the relationship between features and the target changes. Label drift refers to changes in the target distribution. Drift does not automatically mean the model is wrong; seasonal or expected changes may be harmless. Monitoring should compare current feature distributions, prediction distributions, data quality, and delayed outcome-based performance when labels become available. Teams need thresholds, investigation procedures, and retraining criteria rather than retraining whenever any statistic moves. Drift monitoring is most useful when tied to business impact and known failure modes.`,
        followup:`Why might prediction distribution drift while model accuracy remains stable?`,
        followupAnswer:`If the class distribution in production shifts — more easy cases or fewer borderline ones — the model may maintain accuracy on the cases it sees while the business volume or case mix changes in ways that matter operationally. Prediction distribution drift can signal that the population of requests has shifted even when per-case accuracy hasn't changed.`,
        tie:`Connect process-shift monitoring in the Tableau quality dashboard with the same monitoring mindset for models.`,
        trap:`“Drift means the model gets old and should be retrained.”`,
        l2q:`How do you actually detect drift, and what's the difference between input drift and performance degradation?`,
        l2a:`The key practical distinction is *what you can detect now versus what you have to wait for*. *Input/feature drift* you can catch immediately with no labels, by running statistical comparisons of current feature distributions against a training reference — KS tests, population stability index (PSI), KL divergence. *Prediction drift* you catch by monitoring the output distribution, also label-free. *Performance drift* — the thing you actually care about — requires ground truth, which often arrives late or not at all, so it's a *lagging* indicator. That gives you a hierarchy: input and prediction drift are early-warning signals, performance drift is the truth but delayed. The operational craft is setting thresholds that catch real shifts without drowning you in alerts on harmless wiggles (your "don't retrain on every statistic" point), the same monitoring mindset behind your Tableau quality dashboard applied to a model instead of a process.`,
        l3q:`How do you design a retraining strategy that responds to drift without overreacting — and handle the labeling-delay and feedback-loop problems that make drift hard to even measure?`,
        l3a:`Drift response is best understood as a *control problem* with badly delayed and sometimes corrupted feedback. Retraining triggers can be scheduled, performance-triggered, or drift-triggered, but performance-triggered retraining presumes timely labels you may not have — the *labeling-delay problem*, where in domains like your compounding cases ground truth comes weeks later or only after manual review, so you're forced to lean on input/prediction drift as leading indicators and live with uncertainty. Worse, *feedback loops* corrupt the measurement itself: a model whose actions filter the data (a fraud model that blocks transactions never observes the true labels of what it blocked) gives you a *biased* view of drift, conflating real-world change with the model's own influence. Two consequences follow. First, retraining on recently-collected data can *amplify* a feedback loop or chase noise, so sometimes the correct action is to *not* retrain — "do nothing" is a legitimate, sometimes optimal, decision. Second, you distinguish drift that *matters* (tied to business impact) from harmless seasonal drift, and you tie triggers to impact rather than to raw statistical movement, often running champion/challenger so a candidate proves itself before promotion. The senior insight: monitor leading indicators because true performance is lagged and sometimes unobservable, tie retraining to business impact not statistics, and recognize that retraining on biased recent data can make things worse — so a deliberate "no retrain" is part of the strategy. Your regulated domain and process-shift monitoring make this concrete.`,
      },
            {
        id:`mle-14`,
        q:`What is RAG, and how is it different from fine-tuning?`,
        anchor:`RAG retrieves relevant documents at request time and gives them to a language model; fine-tuning changes the model’s learned parameters.`,
        compressed:`RAG retrieves relevant documents at request time and gives them to a language model; fine-tuning changes the model’s learned parameters.`,
        detail:`Retrieval-augmented generation separates knowledge access from language generation. A user question is transformed into a search query, relevant chunks are retrieved, and those chunks are supplied as context to the language model. This can improve grounding, provide citations, and make knowledge updates easier because documents can change without retraining the model. Fine-tuning changes model weights to improve behavior, format, style, or task performance. Fine-tuning is not an efficient way to keep rapidly changing factual knowledge current. RAG can still fail through poor chunking, weak retrieval, misleading sources, or unsupported synthesis, so it requires evaluation and refusal behavior.`,
        followup:`Why can a RAG system hallucinate even when the correct document exists in the corpus?`,
        followupAnswer:`The retriever might rank the correct document too low to appear in the top-k results. Even when retrieved, the language model may not faithfully use it — it may blend retrieved content with parametric knowledge, misread the evidence, or synthesize across documents in ways that distort facts. Retrieval solves the access problem; grounding and faithfulness are separate failure modes.`,
        tie:`Use the compounding-quality assistant’s ingestion, chunking, retrieval, citation metadata, and refusal boundaries.`,
        trap:`“RAG eliminates hallucinations.”`,
        l2q:`How do you decide between RAG, fine-tuning, long-context, and tool-use — and when do you combine them?`,
        l2a:`Match the technique to what's actually failing. *RAG* fits changing or large knowledge that needs citations and freshness — its whole advantage is that you update documents without retraining. *Fine-tuning* changes behavior, format, style, or domain tone, or teaches a skill; it's a poor way to inject fast-changing facts, which people repeatedly learn the hard way. *Long-context* (stuffing the relevant material directly into the prompt) works when it fits and retrieval overhead isn't worth it, but you pay in cost, latency, and the "lost in the middle" degradation where models attend poorly to the center of a long context. *Tools / function-calling* handle actions and exact computation the model shouldn't guess at. They combine naturally — fine-tune for format *and* use RAG for knowledge is a common pairing — and the decision rule is diagnostic: wrong facts point to retrieval, wrong style points to fine-tuning, missing actions point to tools. CQIEA is correctly a RAG system because the SOPs change and citations are mandatory — fine-tuning the facts in would be the wrong tool.`,
        l3q:`How do you evaluate and harden a RAG system end-to-end — separating retrieval quality from generation faithfulness, and building in refusal and citation integrity?`,
        l3a:`This is your deepest area, so the senior answer is to stop treating RAG as one system and treat it as *two* with independent failure modes, then instrument each. *Retrieval* you measure with labeled relevance judgments — recall@k, MRR, nDCG on your 15-question set — because if the right chunk never enters the top-k, no amount of generation skill recovers it. *Generation* you measure separately for *faithfulness/groundedness* (does every claim trace to a retrieved source?), answer relevance, and *citation correctness* — and conflating the two is why your follow-up's distinction matters: you can only fix the right stage if you've localized the failure to it. Faithfulness checking is itself a design choice with a spectrum of rigor: LLM-as-judge (convenient but with its own reliability caveats), NLI/entailment checks, or — your RQ3 finding — narrow deterministic checklets that are more reliable than a broad LLM critic for specific, checkable properties. *Refusal/abstention* must be a first-class, separately-evaluated behavior: the system has to say "not in the corpus" rather than fabricate, and you test that explicitly with adversarial out-of-corpus questions (your refusal boundaries). *Citation integrity* means the cited span must actually support the claim — a citation that doesn't is worse than none, because it manufactures false confidence. Your documented RQ program *is* the hardening toolkit: selective verification (RQ2), checklets vs. broad critics (RQ3), task-graph control (RQ4), and best-of-N with verified selection (RQ5), with the keystone rigor that the false-waiver guarantee *changes type with oracle availability* — a true-correctness bound where a sound oracle exists, only a human-agreement bound where it doesn't. The senior insight: a production RAG system is two systems with independent failure modes, so you evaluate retrieval and faithful generation separately on labeled sets, enforce citation integrity and explicit abstention, and add verification layers whose guarantees you can state precisely rather than hand-wave — exactly the program you've been running against CQIEA.`,
      },
            {
        id:`mle-15`,
        q:`What makes an ML experiment reproducible?`,
        anchor:`Reproducibility means another run can use the same data, code, configuration, and environment to obtain the same or explainably similar result.`,
        compressed:`Reproducibility means another run can use the same data, code, configuration, and environment to obtain the same or explainably similar result.`,
        detail:`Reproducibility requires versioning more than model code. The dataset or dataset snapshot, feature definitions, split logic, preprocessing, model parameters, random seeds, dependency versions, and evaluation code all affect the result. Experiments should record these inputs together with outputs and metrics. Deterministic seeds help, but some hardware and parallel operations can still introduce nondeterminism. Reproducibility also means documenting how an artifact was produced and preventing later runs from silently overwriting it. Strong lineage makes debugging and governance easier because engineers can trace a model result back to its exact inputs.`,
        followup:`Why is saving only the best model file insufficient?`,
        followupAnswer:`The model file captures the weights but not which dataset version, feature definitions, split logic, preprocessing, hyperparameters, or evaluation code produced them. Without that lineage you can't reproduce the run, compare it fairly to a new candidate, or explain why it performs differently on new data. Reproducibility requires the full artifact lineage, not just the weights.`,
        tie:`Use MarketMind’s governed artifacts, architecture decisions, tests, and run-scoped outputs as the concrete example.`,
        trap:`“Set random_state=42.”`,
        l2q:`What's the difference between experiment tracking, model versioning, and data versioning — and what does each capture?`,
        l2a:`They answer three different questions and you need all three. *Experiment tracking* (MLflow / Weights & Biases style) logs the parameters, metrics, code version, and artifacts of each run — it answers "what did I try and what happened?" *A model registry* stores versioned models with stages and lineage — it answers "which model is in production and how was it built?" *Data versioning* (DVC, lakeFS, immutable snapshots) pins the exact data — it answers "which data produced this?", and it's the one people skip even though data changes silently, which is precisely why a code-only version is insufficient (your follow-up). Put together, the full lineage is data version + code version + config + environment → result, and your MarketMind content-addressable artifact registry (BLAKE3/SHA-256) is data-and-artifact versioning done about as rigorously as it gets.`,
        l3q:`How do you achieve true reproducibility and lineage at scale — content-addressing, deterministic pipelines, the irreducible nondeterminism — and why does governance need it?`,
        l3a:`The gold standard is *content-addressable artifacts*: hash the inputs so identical inputs produce the same address, which gives you automatic deduplication and verifiable, tamper-evident provenance — your BLAKE3 registry exactly. You pair that with *deterministic pipelines* (pinned dependencies, fixed seeds, a controlled environment via Docker or Nix), while accepting that some nondeterminism is *irreducible*: floating-point reduction isn't associative, so GPU parallel reductions can differ run to run, and library or hardware differences add more — which is why the honest target is "explainably similar," not bitwise identical, and why you record enough metadata to *account* for any difference rather than pretending there is none (your "some hardware introduces nondeterminism" point). You build *lineage graphs* that trace a prediction back through model → training run → data snapshot → raw source, and you keep artifacts *immutable* with append-only ledgers so a later run can't silently overwrite an earlier one — your Resolution Ledger and fail-closed gate are this discipline made operational, addressing your explicit concern about silent overwrites. The governance angle is the punchline, and it's exactly what an MLE II Legal role cares about: in a regulated domain reproducibility isn't a convenience, it's a compliance requirement — you must be able to reproduce *and explain* any decision the model made, which is impossible without the full lineage chain. The senior insight: reproducibility at scale means content-addressed, immutable artifacts with full lineage graphs and deterministic-as-possible pipelines, accepting irreducible hardware nondeterminism so you target explainable similarity — and in regulated settings that lineage is a legal requirement, not an engineering nicety. Your MarketMind governance stack is a textbook realization of this.`,
      }
    ],
  },
  ds: {
    label: `Data Science I`, short: `DS I`,
    icon: `📊`, color: `rag`,
    questions: [
            {
        id:`ds-1`,
        q:`What does a data scientist do?`,
        anchor:`A data scientist turns an ambiguous question into a measurable analysis, model, experiment, or recommendation.`,
        compressed:`A data scientist turns an ambiguous question into a measurable analysis, model, experiment, or recommendation.`,
        detail:`Data science begins with problem framing rather than modeling. The data scientist clarifies the decision, defines the outcome, identifies available data, evaluates data quality, chooses an appropriate method, and communicates results. Depending on the problem, the deliverable may be descriptive analysis, a dashboard, an experiment, a forecast, or a predictive model. The role overlaps with analytics, statistics, machine learning, and data engineering, but the center is evidence-based decision support. A technically correct analysis can still fail if it answers the wrong question, uses a misleading denominator, or cannot be acted on. Good data science makes assumptions and limitations explicit.`,
        followup:`When is a dashboard a better deliverable than a machine-learning model?`,
        followupAnswer:`When the decision is recurring and the user needs to see current state to decide — a model automates the decision but a dashboard informs it. When the relationship is too uncertain to model reliably. When the business needs to retain judgment, audit the reasoning, or explain the decision. When building a model would take longer than the value it would produce.`,
        tie:`Use the compounding-quality dashboard and operational root-cause work as examples of decision support without forcing ML.`,
        trap:`“A data scientist builds machine-learning models.”`,
        l2q:`How do you decide whether a problem even warrants a data scientist versus an analyst with a SQL query?`,
        l2a:`The dividing line is uncertainty and method, not data size. If the question has a known answer that a query or report simply retrieves — "how many orders shipped last week" — that is analytics, not data science. Data science earns its keep when the question requires estimating something unobserved, quantifying uncertainty, designing an experiment, or building a model whose behavior has to be validated. The honest position in an interview is that a great deal of "data science" work is actually well-scoped analytics, and recognizing that saves the organization from over-engineering a dashboard into a model nobody needed.`,
        l3q:`How do you keep a data science function from producing technically-correct analyses that never change a decision?`,
        l3a:`You tie every project to a decision and a decision-maker before any data is pulled — if no one can name the action a result would trigger, the project is decoration. The senior practice is to work backward from the decision: what threshold flips it, who owns it, what the cost of being wrong is in each direction, and whether the analysis is even on the critical path of that decision. The classic failure is the "insight" that is interesting but inert — a finding no one is positioned to act on, often delivered after the window to act has already closed. The senior insight: a data scientist's real output is not analysis but decisions changed, and the discipline is ruthlessly pruning work that cannot move one — exactly the framing that keeps the compounding-quality root-cause work pointed at operational action rather than retrospective storytelling.`,
      },
            {
        id:`ds-2`,
        q:`How do you turn a business question into an analytical question?`,
        anchor:`Identify the decision, define the outcome, specify the population and time window, and choose a measurable success metric.`,
        compressed:`Identify the decision, define the outcome, specify the population and time window, and choose a measurable success metric.`,
        detail:`Business questions are often vague, such as “Why is quality getting worse?” A data scientist makes the question operational: which quality measure, for which sites, over what time period, compared with what baseline, and what action could follow? The outcome and denominator must be defined carefully. For example, raw incident count and incident rate per 1,000 orders answer different questions. The data grain should match the question, and important exclusions should be explicit. The final analytical question should be answerable with available data and linked to a decision. If the data cannot support causality, the question should be framed as association or diagnosis rather than proof.`,
        followup:`How would you refine “Which site performs best?”`,
        followupAnswer:`Best on what measure — incident rate, resolution time, percentage severe, customer complaints? Over what time period and compared to what baseline? Adjusted for case mix, volume, or acuity differences between sites? Including sites with zero incidents (denominator problem) or only sites with enough volume to be meaningful? Each clarification can reverse the answer.`,
        tie:`Use governed definitions for QRE rate, negative-review rate per 1,000 orders, or RRC value.`,
        trap:`Starting analysis before defining the metric and denominator.`,
        l2q:`A stakeholder insists on a single number to rank sites. How do you give them one without it being misleading?`,
        l2a:`You can deliver a single ranking metric, but you engineer it deliberately and disclose its construction. Pick a rate with a defensible denominator (incidents per 1,000 orders, not raw count), adjust for case mix if the sites differ systematically, and pair the point estimate with an uncertainty band so a low-volume site with one bad month is not crowned worst on noise. The skill is satisfying the request for simplicity while building in the guards — a composite or adjusted metric with documented weights — rather than refusing the question or handing over a naive average that inverts the moment someone scrutinizes it.`,
        l3q:`How do metric definitions become a source of organizational conflict, and how do you prevent it?`,
        l3a:`When two teams compute "the same" metric differently — different denominators, time windows, inclusion rules, or grain — they end up arguing about reality when they are really arguing about definitions, and trust in all the numbers erodes. The senior move is governed metric definitions: a single source of truth where QRE rate, negative-review rate per 1,000 orders, and RRC value each have one canonical SQL definition, one owner, and a versioned changelog, so a number means exactly one thing across the organization. This is as much a political and process problem as a technical one, because the hard part is getting teams to adopt the shared definition, not computing it. The senior insight: at scale the value of a metric is its agreed, stable definition, and ungoverned definitions silently fork until no one trusts the dashboard — which is why the governed definitions in the compounding-quality work are infrastructure, not bureaucracy.`,
      },
            {
        id:`ds-3`,
        q:`What is the difference between a population and a sample?`,
        anchor:`A population is the full group of interest; a sample is the subset actually observed.`,
        compressed:`A population is the full group of interest; a sample is the subset actually observed.`,
        detail:`The population is the complete set about which we want to draw a conclusion, such as all orders processed by a network during a year. A sample is the subset available for analysis. Sampling allows estimation when observing the full population is expensive or impossible. The sample must represent the population relevant to the decision. Selection bias occurs when inclusion depends on factors related to the outcome, such as analyzing only customers who submitted reviews. Sampling variability means different random samples would produce different estimates. Statistical inference quantifies some of that uncertainty, but it cannot repair a systematically biased sample.`,
        followup:`Why are customer reviews not a representative sample of all customer experiences?`,
        followupAnswer:`Reviews are submitted voluntarily, which selects for extreme experiences — the very satisfied and the very dissatisfied. Neutral experiences are systematically underrepresented. Customers who encountered a problem and gave up without contacting support are excluded. Any conclusion from review data applies to 'customers who left reviews,' not to all customers, and that distinction can reverse an inference.`,
        tie:`Discuss review-selection bias when interpreting customer-review dashboards.`,
        trap:`Assuming a large sample is automatically representative.`,
        l2q:`You only have a biased sample (reviews) but must still say something useful. What can and can't you legitimately claim?`,
        l2a:`You scope every claim to the sampled population and resist the urge to generalize. From review data you can legitimately describe what reviewers say, track how that population changes over time, and surface themes worth investigating — that is real value. What you cannot do is estimate the rate of a problem across all customers, because the silent majority is missing and the selection is correlated with the outcome. The applied skill is reframing the deliverable from "X% of customers experienced this" to "among customers who reviewed, this theme rose 30% — worth a follow-up through a representative channel," which is honest and still actionable.`,
        l3q:`How do selection effects compound when a biased sample becomes training data or feeds a downstream model?`,
        l3a:`A selection bias that is merely an analysis caveat becomes a structural defect once the biased sample trains a model, because the model learns the selection mechanism as if it were the world. Build a complaint-classifier on reviews and it is calibrated to reviewers, not customers, and its error rate on the unobserved majority is unknown and unmeasurable from the same data. Worse, if the model's outputs influence which cases get reviewed next, you get a feedback loop that amplifies the original bias — the model manufactures its own future training distribution. The senior insight: in a static analysis selection bias bounds your conclusions, but in a deployed system it propagates and compounds, so you must either correct it at the source (deliberately sample the silent population) or continuously validate against an unbiased holdout — a concern that is front-of-mind for any model feeding decisions in a regulated, auditable setting like the MLE II Legal domain.`,
      },
            {
        id:`ds-4`,
        q:`What are mean, median, and mode, and when would you use each?`,
        anchor:`Mean is the arithmetic average, median is the middle value, and mode is the most frequent value.`,
        compressed:`Mean is the arithmetic average, median is the middle value, and mode is the most frequent value.`,
        detail:`The mean uses every numeric value and is useful when the distribution is reasonably symmetric and outliers are meaningful parts of the process. The median is the middle ordered value and is more resistant to extreme observations, making it useful for skewed data such as turnaround time or cost. The mode is the most common value and can describe categories or repeated discrete values. No single summary describes a distribution completely. Two datasets can have the same mean but different spread or shape. Analysts should pair central tendency with sample size, variability, and a distribution view.`,
        followup:`Why might median processing time improve while the 95th percentile gets worse?`,
        followupAnswer:`The median is the middle value. If the bulk of routine cases are processed faster (pulling the median down) but a small number of complex cases take much longer (pushing the 95th percentile up), both can happen simultaneously. Reporting only the median hides deterioration at the tail, which may be where the most important or harmed cases live.`,
        tie:`Apply this to pharmacy processing times, latency, or financial-impact distributions.`,
        trap:`Saying median is always better because it ignores outliers.`,
        l2q:`Which central-tendency or summary statistic would you put on an operational SLA, and why not the mean?`,
        l2a:`For latency or turnaround SLAs you target a high percentile — p95 or p99 — not the mean, because users and harmed cases live in the tail and the mean hides them. A mean can look healthy while a meaningful slice of cases blow past the limit; a percentile target ("95% of cases under N minutes") directly constrains the experience you actually care about. The tradeoff is that percentiles need enough volume to estimate stably and can be noisy for low-traffic segments, so you pair the percentile with a count and sometimes a hard maximum-acceptable ceiling.`,
        l3q:`How do you summarize a distribution that's multimodal or generated by distinct subpopulations mixed together?`,
        l3a:`When a distribution is a blend of distinct processes — routine compounds finishing fast and complex ones finishing slow — a single mean or median describes a population that does not exist, the "average" landing in a valley where no real cases are. The senior move is to find and report the structure: segment by the variable that splits the modes (dosage form, complexity, site), summarize each segment on its own terms, and only then decide whether an overall number is honest. This connects to mixture thinking — recognizing that one observed distribution is several latent ones — and to control charts, where mixing subpopulations inflates apparent variation and triggers false signals. The senior insight: before summarizing, ask whether the distribution is one thing or several, because reporting a single statistic over a mixture manufactures a phantom "typical" case and masks the very heterogeneity that explains the process.`,
      },
            {
        id:`ds-5`,
        q:`What do variance and standard deviation tell you?`,
        anchor:`They describe how spread out numeric values are around the mean.`,
        compressed:`They describe how spread out numeric values are around the mean.`,
        detail:`Variance is the average squared distance from the mean, with an adjustment for sample variance when estimating from a sample. Standard deviation is the square root of variance, so it is expressed in the original unit. A small standard deviation indicates values cluster near the mean; a large one indicates greater variation. Standard deviation is most interpretable for distributions where the mean is meaningful and does not fully describe skewed or multimodal data. Variation is not always bad: some processes naturally have heterogeneous cases. Analysts should distinguish expected common-cause variation from unusual process shifts.`,
        followup:`Can two groups have the same mean and standard deviation but very different distributions?`,
        followupAnswer:`Yes. A bimodal distribution (two clusters of values) and a normal distribution can have identical means and standard deviations but look completely different. Anscombe's Quartet demonstrates this with datasets identical in mean, variance, and correlation but with visually different structures. Summary statistics alone cannot describe distribution shape.`,
        tie:`Connect standard deviation and 3-sigma control limits to the quality dashboard, while distinguishing control limits from specification limits.`,
        trap:`Interpreting standard deviation as an error or assuming high variation always means poor quality.`,
        l2q:`On a control chart, how do you tell normal process variation from a real shift, and what's the cost of getting the threshold wrong?`,
        l2a:`Statistical process control distinguishes common-cause variation (the inherent noise of a stable process, inside the control limits) from special-cause variation (a signal — a point beyond 3-sigma or a non-random run pattern) that warrants investigation. The threshold is a direct false-positive/false-negative tradeoff: tighten the limits and you chase noise and breed alert fatigue; loosen them and you miss real deterioration. The applied skill is choosing limits and run rules (e.g., the Western Electric rules) matched to the cost of a missed shift versus the cost of a wasted investigation, and remembering that control limits describe the process, not the customer-facing spec.`,
        l3q:`Why is the distinction between control limits and specification limits so often confused, and what goes wrong when a team conflates them?`,
        l3a:`Control limits come from the process's own variation (what it does do); specification limits come from requirements (what it should do), and they are computed from entirely different inputs. Teams conflate them because both render as horizontal lines on a chart, but the failure modes are opposite: a process can be in statistical control yet routinely out of spec (stably bad), or capable against spec yet showing a special-cause signal (drifting but still passing). Acting on the wrong one means either tampering with a stable process — Deming's funnel experiment shows that adjusting to noise increases variation — or ignoring a real shift because points are still inside the spec. The senior insight: control limits answer "is the process stable?" and spec limits answer "is the output acceptable?", and conflating them leads to tampering or complacency — which is exactly why the quality dashboard keeps the two explicitly separate.`,
      },
            {
        id:`ds-6`,
        q:`What is the difference between correlation and causation?`,
        anchor:`Correlation means two variables move together; causation means changing one variable produces a change in the other.`,
        compressed:`Correlation means two variables move together; causation means changing one variable produces a change in the other.`,
        detail:`Correlation measures association, not a causal mechanism. Two variables may correlate because one causes the other, because a third variable affects both, because the direction is reversed, or by chance. For example, a site with more incidents may simply process more orders, so volume is a confounder. Causal claims usually require randomized experiments or strong observational designs with defensible assumptions. Temporal order, domain knowledge, and alternative explanations should be considered. Correlation is still useful for prediction and investigation, but the language should match the evidence.`,
        followup:`How would you communicate a strong association when you cannot establish causality?`,
        followupAnswer:`State the direction and magnitude of the association clearly, name the confounders you couldn't rule out, describe what a causal mechanism would require and why your data can't prove it, and frame the recommendation accordingly — 'this association is consistent with X causing Y and warrants investigation' rather than 'X causes Y.' Being precise about evidence strength builds credibility.`,
        tie:`Use site-level quality rates and incident types as examples where root-cause claims need care.`,
        trap:`Saying “correlation does not imply causation” without explaining what would strengthen a causal claim.`,
        l2q:`Given only observational data, what designs or adjustments can strengthen a causal claim short of a randomized experiment?`,
        l2a:`You can move from naive correlation toward credible causal inference with observational designs that make assumptions explicit: control for measured confounders via stratification or regression, use difference-in-differences when you have before/after across a treated and an untreated group, regression discontinuity around a threshold, or instrumental variables when you have a quasi-random nudge. Each buys causal credibility in exchange for assumptions you must defend — no unmeasured confounding, parallel trends, a valid instrument — and stating those assumptions plainly is what separates a defensible quasi-experiment from hand-waving. The applied skill is matching the design to the data-generating situation and being honest that adjustment only handles the confounders you actually measured.`,
        l3q:`How can controlling for the wrong variable make a causal estimate worse, not better?`,
        l3a:`Adding controls is not free goodness — conditioning on a collider (a variable caused by both your treatment and outcome) or on a mediator (a variable on the causal path) can induce spurious association or erase a real effect, so "controlling for everything" is actively dangerous. The discipline is to reason about the causal structure first — a DAG of what causes what — then adjust only for confounders and never for colliders or mediators, which is the opposite of throwing every available column into a regression. This is where data science meets genuine causal modeling: the variables you must include and exclude are dictated by the assumed graph, not by what improves fit. The senior insight: causal inference is a modeling assumption about structure, not a property of the data, so more controls can degrade an estimate, and credibility comes from defending the graph — a standard worth internalizing before any model output is used to justify a decision with legal or regulatory weight.`,
      },
            {
        id:`ds-7`,
        q:`What is a hypothesis test?`,
        anchor:`A hypothesis test asks whether observed data are sufficiently inconsistent with a specified null hypothesis.`,
        compressed:`A hypothesis test asks whether observed data are sufficiently inconsistent with a specified null hypothesis.`,
        detail:`A hypothesis test starts with a null hypothesis, such as no difference between two groups. A test statistic summarizes the observed difference relative to expected sampling variation. The p-value is the probability, assuming the null hypothesis and model assumptions are true, of observing a result at least as extreme as the one obtained. A small p-value is evidence against the null, but it is not the probability that the null is true. Statistical significance does not guarantee practical importance. The result also depends on sample size and assumptions such as independence or distributional form. Effect sizes and confidence intervals should accompany the test.`,
        followup:`Why can a tiny difference become statistically significant with a huge sample?`,
        followupAnswer:`Statistical significance depends on both effect size and sample size. A difference that explains almost no variance can still produce a p-value near zero when n is large because the standard error shrinks toward zero as n grows. Large-sample significance tests require effect size reporting — Cohen's d, relative risk, or a practical threshold — so readers know whether the finding is operationally meaningful.`,
        tie:`Apply this to comparing rates before and after a workflow change while reporting effect size and operational relevance.`,
        trap:`“A p-value below 0.05 proves the effect is real.”`,
        l2q:`You run multiple comparisons across sites, categories, and time windows. Why is that a problem and how do you handle it?`,
        l2a:`Every additional test at α=0.05 is another 5% shot at a false positive, so testing twenty site-category slices nearly guarantees a "significant" finding that is pure noise — the multiple-comparisons problem. You handle it by controlling the family-wise error rate (Bonferroni, Holm) when any single false positive is costly, or the false discovery rate (Benjamini-Hochberg) when you can tolerate a known fraction of false discoveries among many exploratory tests. The applied judgment is pre-registering the primary comparison versus flagging the rest as exploratory and correcting accordingly, rather than mining all slices and reporting the winners as if they were planned.`,
        l3q:`Why is "peeking" at an experiment and stopping when it hits significance statistically invalid, and what's the right way to monitor a running test?`,
        l3a:`Fixed-horizon p-values assume you look exactly once, at the planned sample size; if you peek repeatedly and stop the moment p dips below 0.05, the actual false-positive rate balloons far above the nominal level because you have given noise many independent chances to cross the line. The correct approaches are sequential methods designed for continuous monitoring — group-sequential designs with alpha-spending (O'Brien-Fleming), or always-valid inference via mixture sequential probability ratio tests and confidence sequences that hold no matter when you stop. This is exactly the discipline behind MarketMind's statistical controls: continuous evaluation requires inference that is valid under optional stopping, not naive repeated t-tests. The senior insight: a significance test is only valid under the stopping rule it was designed for, so a system that monitors results continuously needs always-valid or alpha-spending methods — naive peeking is one of the most common and most invisible ways teams fool themselves.`,
      },
            {
        id:`ds-8`,
        q:`What is a confidence interval?`,
        anchor:`A confidence interval gives a range of plausible values for an estimated population quantity under a statistical procedure.`,
        compressed:`A confidence interval gives a range of plausible values for an estimated population quantity under a statistical procedure.`,
        detail:`A confidence interval combines a point estimate with uncertainty from sampling. A 95% confidence procedure is designed so that, across repeated samples, 95% of intervals constructed by that method contain the true parameter. It is commonly described informally as a plausible range, but it is not strictly a 95% probability statement about a fixed parameter under frequentist statistics. Wider intervals indicate greater uncertainty, often because of small samples or high variability. Narrow intervals may still center on a biased estimate if the sample or model is flawed. Intervals help distinguish statistical precision from practical significance.`,
        followup:`What does it mean when a treatment-effect confidence interval includes zero?`,
        followupAnswer:`Zero is a plausible estimate of the true effect under the statistical procedure used. The data are compatible with no treatment effect. It does not prove the effect is zero, only that the sample doesn't provide strong evidence it's nonzero. Combined with a large point estimate and wide interval (small sample), it's compatible with a practically important effect the study was underpowered to detect.`,
        tie:`Use rate estimates for low-volume sites where point estimates alone can overstate certainty.`,
        trap:`“There is a 95% chance the true value is inside this specific interval.”`,
        l2q:`A low-volume site shows the "worst" rate but a huge confidence interval. How do you present this responsibly?`,
        l2a:`You present the uncertainty as the headline, not a footnote: the point estimate is the worst, but the interval is so wide that the site is statistically indistinguishable from the average, so ranking it last would be acting on noise. Concretely, you would use the interval to say "we can't yet tell this site apart from the pack — it needs more data before we act," and you might apply shrinkage so small-sample estimates are pulled toward the overall mean rather than taken at face value. The applied skill is letting interval width gate the strength of the recommendation, which prevents the recurring error of crowning a low-n outlier as best or worst.`,
        l3q:`When you're ranking many groups by an estimated rate, why do naive point estimates systematically mislead, and what's the principled fix?`,
        l3a:`Ranking groups by raw rates systematically promotes the smallest groups to the extremes, because low-n estimates have the highest variance and therefore produce the most extreme highs and lows by chance alone — the "ranking on noise" problem that plagues hospital and school league tables. The principled fix is partial pooling via a hierarchical / empirical-Bayes model: estimate each group's rate as a compromise between its own data and the population, shrinking unreliable small-sample estimates toward the global mean in proportion to their uncertainty. This gives more honest rankings and stable estimates for sparse groups, at the cost of a more complex model and the assumption that groups are exchangeable. The senior insight: comparing estimated rates across groups of different sizes is a shrinkage problem, not a sorting problem, and naive league tables reliably reward small-sample noise — which is why low-volume sites deserve pooled estimates before anyone ranks them.`,
      },
            {
        id:`ds-9`,
        q:`How should missing data be handled?`,
        anchor:`First understand why values are missing; then choose a treatment that matches the missingness mechanism and the analysis.`,
        compressed:`First understand why values are missing; then choose a treatment that matches the missingness mechanism and the analysis.`,
        detail:`Missing data should not be handled automatically. Missing completely at random means missingness is unrelated to observed or unobserved values. Missing at random means it can be explained by observed variables. Missing not at random means the missingness depends on the missing value or an unobserved factor. Options include leaving values missing, filtering records, simple imputation, model-based imputation, adding a missingness indicator, or collecting better data. Dropping all incomplete rows can bias the sample and waste information. Imputation should be fit within the training data for predictive modeling to avoid leakage. The analysis should report missingness rates and sensitivity to the chosen approach.`,
        followup:`When can “missing” itself be a useful signal?`,
        followupAnswer:`When missingness is not random — when data is absent because of the behavior or condition being studied. A missing discharge date might mean the patient is still admitted. A missing credit inquiry might mean the customer never applied. A missing severity field in a compounding record might indicate informal handling. The absence is informative and should be encoded as a feature rather than filled.`,
        tie:`Relate explicit missing-information fields in the review workflow to preserving uncertainty rather than fabricating values.`,
        trap:`“Fill numeric nulls with the mean and categorical nulls with the mode.”`,
        l2q:`Why is mean imputation often the worst defensible choice, and what would you do instead for a predictive model?`,
        l2a:`Mean imputation quietly damages a model: it shrinks variance, distorts correlations, and pretends to certainty by inventing a value with no uncertainty attached, which is why it is both a common default and a common mistake. Better options depend on the mechanism — model-based imputation (e.g., iterative / MICE) that predicts the missing value from the other features, or simply adding a missingness indicator so the model can learn that absence itself is informative. Critically, any imputation must be fit on the training fold and applied to validation and test, the same boundary discipline as any other learned transformation, or you leak information about the held-out data.`,
        l3q:`How do you handle missingness that isn't random (MNAR), where the fact of being missing depends on the unobserved value itself?`,
        l3a:`MNAR is the hard case because no imputation from observed data can recover information the data-generating process actively hid — a severity field left blank precisely because the case was handled informally encodes its outcome in its absence. You cannot statistically "fix" MNAR from the same dataset; the honest responses are to model the missingness mechanism explicitly (selection models, pattern-mixture models), to encode missingness as a first-class feature and let the model use it, and above all to run sensitivity analyses showing how conclusions shift under different assumptions about what the missing values are. The senior insight: under MNAR the absence is data, so the goal is not to fill the gap but to model why it is there and bound how much your answer depends on the unknown — which is exactly why the review workflow keeps explicit "missing-information" fields rather than fabricating values, preserving the signal instead of erasing it.`,
      },
            {
        id:`ds-10`,
        q:`What is an outlier, and should it be removed?`,
        anchor:`An outlier is an observation far from the rest of the data, but it may be an error, a rare valid case, or an important signal.`,
        compressed:`An outlier is an observation far from the rest of the data, but it may be an error, a rare valid case, or an important signal.`,
        detail:`Outliers can result from data-entry mistakes, unit mismatches, duplicate records, system failures, or genuine rare events. Detection methods include visualization, domain thresholds, z-scores, interquartile ranges, and model residuals. Removal should follow investigation, not convenience. In safety or quality work, an extreme event may be the most important record in the dataset. If an outlier is corrected or excluded, the rule and rationale should be documented and applied consistently. Robust statistics or transformations may reduce sensitivity without discarding valid information.`,
        followup:`Why can automatic three-standard-deviation filtering be dangerous in quality analysis?`,
        followupAnswer:`In quality work the most extreme values are often exactly the cases that matter most — events that caused patient harm, batches that failed specification, sites with incident clusters. Three-sigma filtering would automatically exclude them as statistical noise, hiding the most important signal. Outlier removal in quality analysis should require human judgment and domain review, not automatic rules.`,
        tie:`Use the June out-of-control signal as an example of an extreme value worth investigating rather than deleting.`,
        trap:`“Remove outliers because they skew the mean.”`,
        l2q:`How do you build an outlier-handling rule that's defensible and reproducible rather than ad hoc?`,
        l2a:`A defensible rule separates detection from action and documents both: detect candidates with a method appropriate to the distribution (IQR or robust z-scores for skewed data, model residuals for relationships), then route them to a decision — investigate, correct, exclude-with-reason, or keep — rather than auto-deleting. The rule must be versioned and applied consistently across runs so the same input always yields the same disposition, and every exclusion carries a recorded rationale so the analysis stays auditable. The applied skill is making outlier handling a logged, repeatable policy instead of a one-off judgment that can't be reproduced or explained later.`,
        l3q:`In a quality or safety domain, why might the outlier be the entire point of the analysis, and how does that invert standard practice?`,
        l3a:`In most modeling, outliers are nuisances that degrade a fit; in quality and safety, the extreme event — the batch that failed spec, the incident cluster, the June out-of-control signal — is frequently the most valuable record in the dataset, and discarding it discards the signal you were hired to find. This inverts the usual toolkit: instead of robust methods that down-weight extremes, you build detection that surfaces and escalates them, and you treat any automated exclusion as a safety risk requiring human review and documentation. There is also a governance dimension — silently dropping the worst cases in a regulated setting can look like, or become, suppression of adverse signals. The senior insight: whether an outlier is noise or the most important data point depends entirely on the domain's goal, and in safety-critical work the default flips from "remove" to "investigate and preserve" — which is why automatic sigma-filtering has no place in the quality pipeline.`,
      },
            {
        id:`ds-11`,
        q:`What is exploratory data analysis?`,
        anchor:`EDA is the structured process of understanding the data before formal modeling or conclusions.`,
        compressed:`EDA is the structured process of understanding the data before formal modeling or conclusions.`,
        detail:`Exploratory data analysis examines schema, grain, distributions, missingness, duplicates, relationships, anomalies, and time patterns. It checks whether the data represent the intended process and whether assumptions are reasonable. Typical tools include summary statistics, frequency tables, plots, grouped comparisons, and targeted queries. EDA is not an excuse to search endlessly for interesting patterns and then present them as confirmed findings. Insights discovered during exploration may require separate validation. Good EDA produces documented data-quality findings, candidate hypotheses, and a clearer analysis plan.`,
        followup:`What checks would you run first on a newly delivered incident table?`,
        followupAnswer:`Row count and date range to confirm scope matches expectations. Distinct values on key identifiers to check for duplicates or missing records. Null rates on required fields like incident date, site, and category. Distribution of the category field to spot unexpected values or encoding changes. Time trend to see if there are obvious gaps or spikes. These five checks reveal most structural quality problems.`,
        tie:`Use row-count reconciliation, schema validation, duplicate detection, category distributions, and time trends from the ETL pipeline.`,
        trap:`“EDA means making charts until something looks interesting.”`,
        l2q:`How do you keep EDA from turning into p-hacking, where you explore until something looks significant and then report it as a finding?`,
        l2a:`The guard is a firewall between exploration and confirmation: anything discovered while fishing through the data is a hypothesis, not a result, and it must be validated on data that wasn't used to generate it. Practically that means reserving a holdout, pre-registering the confirmatory analysis before touching it, and reporting exploratory findings honestly as "generated here, not yet tested" rather than dressing them up with a p-value computed on the same data that suggested them. The applied skill is tracking which claims are exploratory versus confirmatory and never letting the former cross the line silently.`,
        l3q:`What's the "garden of forking paths," and why can a researcher p-hack without ever consciously running multiple tests?`,
        l3a:`Gelman's garden of forking paths is the subtler cousin of multiple comparisons: even an analyst who runs a single test can inflate false positives, because the many defensible choices made along the way — which outliers to drop, how to bin, which subgroup to focus on, which covariates to include — were themselves influenced by the data, so a different dataset would have led to a different "single" test. The false-positive rate reflects all the analyses you would have run had the data looked different, not just the one you did run, which is why honest exploratory work can still mislead without any conscious cherry-picking. The defenses are pre-registration, blinding analytic decisions to the outcome, and multiverse analysis that reports results across many reasonable analytic choices. The senior insight: data-dependent analytic decisions are an invisible form of multiple testing, so reproducibility on fresh data — not the cleanliness of any single p-value — is the real evidence, a standard built into MarketMind's evaluation discipline precisely to avoid fooling yourself.`,
      },
            {
        id:`ds-12`,
        q:`How do you choose an appropriate visualization?`,
        anchor:`Match the chart to the analytical question and the structure of the data.`,
        compressed:`Match the chart to the analytical question and the structure of the data.`,
        detail:`Bar charts compare categories, line charts show change over ordered time, histograms show numeric distributions, scatterplots show relationships between two numeric variables, and boxplots summarize group distributions. The chart should make the intended comparison easy and should not distort scale or area. Axes, units, denominators, time windows, and sample sizes should be labeled. Color should carry meaning rather than decoration, and too many categories can obscure the message. A dashboard may support exploration, but an executive presentation often needs a focused chart with one clear takeaway and the necessary caveat.`,
        followup:`When should a bar chart’s y-axis start at zero, and why?`,
        followupAnswer:`When the bars represent counts, totals, or quantities where bar length encodes a whole value. Bar area visually encodes magnitude, so a non-zero baseline distorts perceived ratios — a 10% difference can look like a 500% difference. Exceptions: showing deviation from a meaningful reference (profit/loss around zero) or encoding position rather than magnitude. Line charts and scatter plots are less constrained.`,
        tie:`Apply this to quality rates, SPC charts, customer-review categories, and financial-impact views.`,
        trap:`Choosing charts based on appearance rather than the question.`,
        l2q:`How does a well-intentioned chart mislead, and what choices keep it honest for an executive audience?`,
        l2a:`Charts mislead through encoding choices that distort perceived magnitude even with correct data: truncated bar baselines, dual y-axes that manufacture a correlation, area or 3-D effects that exaggerate differences, missing denominators, and cherry-picked time windows. For an executive audience the discipline is one clear takeaway per chart with the necessary caveat on the same slide — the denominator, the time period, the comparison group, the sample size — so the headline can't be read out of context. The applied skill is matching the encoding to the comparison (length for magnitude, position for relationships) and labeling the things an audience would otherwise silently assume.`,
        l3q:`How do you design a dashboard that supports honest exploration without enabling people to construct whatever story they want?`,
        l3a:`A self-serve dashboard is a powerful tool and a liability, because the same flexibility that lets a user explore also lets them filter, slice, and window their way to a misleading narrative — the looser the guardrails, the easier it is to "prove" anything. Senior dashboard design builds in guardrails: governed metric definitions so a number means one thing, sensible default views and time windows, denominators and sample sizes shown alongside rates, and visual cues (or suppression) when a slice has too little data to trust. There is a real tension between flexibility and safety, and the resolution is to make the honest path the easy path — defaults and annotations that steer toward correct interpretation while still allowing depth. The senior insight: a dashboard is not neutral, its defaults and affordances shape what people conclude, so you design it to make misinterpretation hard rather than merely possible — the same governed-definition discipline that keeps the compounding-quality views consistent across the org.`,
      },
            {
        id:`ds-13`,
        q:`What are SQL aggregation and grouping used for?`,
        anchor:`Aggregation summarizes many rows into measures such as counts, sums, averages, or rates by one or more groups.`,
        compressed:`Aggregation summarizes many rows into measures such as counts, sums, averages, or rates by one or more groups.`,
        detail:`SQL aggregate functions such as COUNT, SUM, AVG, MIN, and MAX combine rows. GROUP BY defines the grain of the output. For example, grouping by site and month creates one output row per site-month. Rates require a numerator and denominator at compatible grains. WHERE filters rows before aggregation, while HAVING filters aggregated groups. Joining tables before grouping can multiply rows and inflate metrics, so analysts should inspect join cardinality and count distinct keys where appropriate. The output grain should be stated explicitly.`,
        followup:`Why can joining orders to order items inflate an order count?`,
        followupAnswer:`If one order has three line items, joining orders to order items creates three rows with the same order ID. Counting rows after the join counts line items, not orders. Fix: count distinct order IDs, aggregate at the right grain before joining, or join on a pre-aggregated subquery. This is one of the most common silent data errors in analytical SQL.`,
        tie:`Use monthly site-level QRE rates and order-denominator joins.`,
        trap:`Writing GROUP BY without being able to state the resulting grain.`,
        l2q:`Walk through how a rate metric silently breaks when numerator and denominator come from different grains or different joins.`,
        l2a:`A rate is only correct when numerator and denominator are counted at compatible grains, and a join is the usual place that breaks. If incidents are joined to order-items before counting orders, the denominator becomes line-items and the rate is understated; if a one-to-many join fans out the numerator, the rate is overstated. The fix is to aggregate each side to the intended grain in separate subqueries (or CTEs) and join the pre-aggregated results, or to count distinct keys explicitly, and to state the output grain so a reviewer can verify it. The applied skill is treating "what does one row mean after this join?" as a question you answer before trusting any ratio.`,
        l3q:`Why are fan-out and grain errors the most dangerous class of analytical SQL bug, and how do you defend against them systematically?`,
        l3a:`Grain and fan-out errors are uniquely dangerous because they produce no error and a plausible-looking number — the query runs, returns rows, and the total is just quietly wrong, so it survives review and ships into a decision. The systematic defenses are structural, not vigilance-based: build from a declared fact grain (one row per incident, per the data model), aggregate to grain before joining dimensions, assert row-count invariants and key-uniqueness as automated checks in the pipeline, and reconcile totals against an independent source. This is the same fail-closed philosophy worth applying everywhere — make the pipeline detect a grain violation and refuse to publish rather than emit a wrong rate. The senior insight: the worst data bugs are the ones that return a believable answer, so you defend against them with declared grains and automated invariant checks rather than hoping a reviewer eyeballs the join cardinality — exactly the row-count reconciliation the quality ETL enforces.`,
      },
            {
        id:`ds-14`,
        q:`What is an A/B test?`,
        anchor:`An A/B test randomly assigns comparable units to different experiences and measures the difference in outcomes.`,
        compressed:`An A/B test randomly assigns comparable units to different experiences and measures the difference in outcomes.`,
        detail:`In an A/B test, eligible units are randomly assigned to control and treatment groups. Randomization helps balance both observed and unobserved confounders on average, supporting a causal estimate. The primary metric, sample size, duration, eligibility rules, and stopping criteria should be defined before analyzing the result. Interference between users, noncompliance, repeated peeking, attrition, or changing assignment can bias results. Statistical significance should be paired with effect size and operational value. Not every change can or should be randomized, but when feasible, experiments provide stronger causal evidence than before-after comparisons.`,
        followup:`Why is comparing this month after launch with last month before launch weaker than an A/B test?`,
        followupAnswer:`The before-after comparison cannot control for time-based confounders — seasonal effects, market changes, other simultaneous initiatives, or natural trend. You can't tell whether the change came from the launch or from something else that changed simultaneously. An A/B test controls for these by having a concurrent control group experiencing the same time period without the treatment.`,
        tie:`Imagine testing a new internal review workflow on eligible teams while monitoring quality and cycle time.`,
        trap:`“Show version A to half the users and version B to half” without discussing randomization, eligibility, or metrics.`,
        l2q:`You need to estimate the sample size and duration for an A/B test before launching. What drives those numbers and what goes wrong if you skip it?`,
        l2a:`Required sample size is driven by the minimum effect you care to detect, the baseline rate and its variance, and your chosen significance and power — smaller effects and rarer events demand far more samples. Duration then depends on traffic and on covering full business cycles (weekday/weekend, seasonality) so you don't measure a partial week. Skipping the power calculation produces the two classic failures: an underpowered test that can't detect a real effect and gets misread as "no difference," or an open-ended test someone stops the moment it looks good, which inflates false positives. The applied skill is committing to sample size, duration, and the primary metric before launch.`,
        l3q:`What assumptions does A/B test validity rest on beyond randomization, and how do they break in a real product?`,
        l3a:`Randomization buys an unconfounded comparison only if the supporting assumptions hold, and in real systems they routinely do not: SUTVA (no interference between units) breaks when treated and control users interact — marketplace, social, or shared-resource effects mean one group's experience leaks into the other's; noncompliance and dilution break it when assigned users don't actually receive the treatment; attrition breaks it when dropout differs by arm; and novelty or primacy effects mean the early measured lift is not the long-run effect. Senior practice anticipates these — cluster-randomize when interference is likely, analyze by intent-to-treat to preserve randomization, monitor for differential attrition, and run long enough to see past novelty. The senior insight: the experiment's causal guarantee is only as good as its assumptions about interference, compliance, and time, so designing an A/B test is mostly about protecting those assumptions, not just splitting traffic in half.`,
      },
            {
        id:`ds-15`,
        q:`How should a data scientist communicate a result to stakeholders?`,
        anchor:`Start with the decision-relevant conclusion, show the evidence, explain uncertainty, and state the recommended next action.`,
        compressed:`Start with the decision-relevant conclusion, show the evidence, explain uncertainty, and state the recommended next action.`,
        detail:`Stakeholders usually need the answer before the method. A strong presentation states the question, the key finding, the practical magnitude, and the action it supports. Then it explains the data scope, method, and important limitations. Technical detail should be available but not allowed to hide the business meaning. The analyst should distinguish observed facts, interpretation, and recommendation. Negative or inconclusive results should be communicated honestly. A result should include the denominator, time period, comparison group, and uncertainty so the audience does not overgeneralize it.`,
        followup:`How would you explain a statistically significant but operationally tiny improvement?`,
        followupAnswer:`'The improvement is real statistically — our data strongly suggests it's not zero — but the size is about X, which is below our operational threshold of Y. We can be confident the change has some positive effect, but it's likely too small to justify the cost or be noticeable to users.' Separating 'real' from 'meaningful' is the key communication skill.`,
        tie:`Use director-level dashboard presentations and root-cause findings from compounding quality.`,
        trap:`Walking through every analysis step before stating the conclusion.`,
        l2q:`How do you tailor the same finding for a director, an operational lead, and a technical peer without telling three different stories?`,
        l2a:`The finding and its caveats stay fixed; the framing, depth, and call-to-action change per audience. A director needs the decision-relevant conclusion, the practical magnitude, and the recommended action up front, with method available but not foregrounded; an operational lead needs what changes in their workflow and the thresholds that trigger it; a technical peer needs the method, assumptions, and limitations so they can stress-test it. The discipline is one set of facts presented at three altitudes — never softening the uncertainty for the executive or inflating it for the peer — so the three accounts reconcile if anyone compares notes. The applied skill is leading with the answer and layering detail, rather than walking everyone through the analysis chronologically.`,
        l3q:`How do you communicate a negative, null, or inconclusive result without it being ignored or, worse, spun?`,
        l3a:`Negative and null results are where communication integrity is really tested, because the organization's incentive is to bury them or reframe them as wins, and a data scientist's credibility depends on refusing both. The senior approach distinguishes precisely between the three — "we found no effect and were powered to detect one if it existed" (an informative null), "the effect is real but below the operational threshold" (significant but immaterial), and "the data can't tell us either way" (inconclusive, needs more) — because conflating them is how a null gets spun into a success or a wasted test gets sold as a discovery. You state plainly what the result rules in and rules out, what decision it supports (often "don't ship" or "keep the simpler option"), and you treat a well-run null as a real finding that saved the cost of a bad change. The senior insight: a credible analyst is defined by how they report results nobody wanted, and the key skill is separating "no effect," "tiny effect," and "we can't tell" — because each supports a different decision and each is routinely misrepresented as the others.`,
      }
    ],
  },
  de: {
    label: `Data Engineering I`, short: `DE I`,
    icon: `🔧`, color: `python`,
    questions: [
            {
        id:`de-1`,
        q:`What is a data pipeline?`,
        anchor:`A data pipeline moves data from one or more sources through processing steps into a destination where it can be used reliably.`,
        compressed:`A data pipeline moves data from one or more sources through processing steps into a destination where it can be used reliably.`,
        detail:`A data pipeline is a repeatable flow that extracts or receives data, validates it, transforms it, and publishes it to a destination such as a database, warehouse, file, dashboard, or model feature store. A useful pipeline defines the input and output contracts, execution schedule, failure behavior, and ownership. It should preserve lineage so users can trace where a result came from. Production pipelines also need logging, data-quality checks, retries, alerting, and safe reruns. A script that succeeds once is not automatically a reliable pipeline. Reliability means the same logic can run repeatedly, detect bad inputs, and avoid silently publishing incomplete or duplicated outputs.`,
        followup:`What would make a working Python script unsuitable as a production pipeline?`,
        followupAnswer:`No error handling — a bad row crashes the whole run. No idempotency — rerunning it doubles the data. Hardcoded paths and credentials. No logging of what was processed, how many rows, or what failed. No data quality checks before publishing. No notification when it fails. Running it requires manually logging in and typing a command. These are the gaps between 'it works once' and 'it's reliable.'`,
        tie:`Use the multi-source quality ETL pipeline that ingests Smartsheet, Excel, and Snowflake and publishes governed outputs.`,
        trap:`“A pipeline is code that moves data from A to B.”`,
        l2q:`What does it take to make a pipeline observable, so you find out it's broken before a stakeholder does?`,
        l2a:`Observability means the pipeline emits enough signal to answer "is it healthy and did it do the right thing?" without reading the data by hand: structured logs with run ID, source, partition, row counts and timing; metrics on volume, freshness, and failure rate; and alerts tied to data assertions (row count outside expected range, null spike, schema drift) rather than just "did the process exit zero." The distinction that matters is between liveness ("the job ran") and correctness ("the job produced valid data") — a pipeline can succeed technically and publish garbage. The applied skill is instrumenting the data, not just the process, so a bad load pages you before it ever reaches the dashboard.`,
        l3q:`How do data-pipeline failures differ from application failures, and why is "the job succeeded" a dangerous definition of success?`,
        l3a:`Application failures are usually loud — an exception, a 500, a crash — but data pipelines fail silently and correctly: the job exits zero, writes rows, and the numbers are subtly wrong because a source changed a category, a join fanned out, or an upstream feed was a day stale. This is why exit code is the wrong success signal; the right one is a set of data contracts and quality assertions that must pass before publication, treating "valid data delivered" rather than "code ran" as the definition of done. The senior framing layers defenses — schema validation, row-count reconciliation, freshness checks, and a fail-closed gate that refuses to publish on violation, optionally preserving the last-known-good output clearly marked stale. The senior insight: the dangerous pipeline failure is the one that succeeds technically while corrupting the data, so production data engineering is mostly about detecting silent correctness failures — the philosophy behind the quality ETL's reconciliation and preserve-last-good behavior.`,
      },
            {
        id:`de-2`,
        q:`What is the difference between ETL and ELT?`,
        anchor:`ETL transforms data before loading it into the target; ELT loads raw data first and transforms it inside the target platform.`,
        compressed:`ETL transforms data before loading it into the target; ELT loads raw data first and transforms it inside the target platform.`,
        detail:`ETL stands for extract, transform, load. It is useful when the destination expects cleaned, shaped data or when sensitive and invalid data should be filtered before loading. ELT stands for extract, load, transform. It takes advantage of scalable warehouse compute and preserves raw data for later transformations. Modern systems often use a combination: land source data, apply basic validation and normalization, then perform business transformations in the warehouse. The choice depends on data volume, governance, latency, source constraints, and platform capabilities. Neither pattern removes the need for clear lineage and data contracts.`,
        followup:`Why might a team keep both raw and curated layers?`,
        followupAnswer:`The raw layer is an immutable record of what the source sent. If a transformation rule was wrong, you reprocess from raw without re-extracting from the source. The curated layer is what analysts query — cleaned, joined, typed, business logic applied. Bugs in curation are recoverable because the raw data is preserved. Without the raw layer, a pipeline bug means permanently lost data.`,
        tie:`Compare pulling source data into normalized intermediate frames with publishing CSV, XLSX, and Hyper outputs.`,
        trap:`Treating ELT as universally newer and therefore always better.`,
        l2q:`How does the cloud warehouse era shift the ETL-vs-ELT calculus, and where does ETL still win?`,
        l2a:`Cheap elastic warehouse compute (Snowflake, BigQuery) tilts the default toward ELT: land raw data fast, transform in-warehouse with SQL/dbt, and keep raw as a replayable record so logic bugs are fixable without re-extracting. But ETL still wins where transformation must happen before landing — stripping or masking PII for governance, filtering data you are not permitted to store, reducing volume at the edge for cost, or meeting a destination that demands a fixed shape. The applied judgment is driven by governance, source constraints, latency, and cost rather than fashion, and many real systems are hybrid: light normalization on landing, business logic in-warehouse.`,
        l3q:`How does the raw/curated split underpin reproducibility and recovery, and what does it cost you if you skip the raw layer?`,
        l3a:`An immutable raw layer is the foundation of reprocessing: when a transformation rule turns out to be wrong — a misclassification, a bad dedup, a timezone error — you rebuild the curated layer from raw without going back to the source, which may no longer hold the original data or may have changed. Skip the raw layer and a transformation bug becomes permanent data loss: you have discarded the source's record and can't recover what it actually sent. This is the data-engineering expression of the same principle behind content-addressable, immutable artifacts in MarketMind — preserve the source of truth so any downstream state can be regenerated and audited. The senior insight: raw is your recovery point and your audit trail, so the cost of skipping it isn't storage saved, it's the permanent inability to fix a curation bug or prove what the source delivered — which is why mature pipelines treat raw as sacred and curated as disposable.`,
      },
            {
        id:`de-3`,
        q:`What is the difference between batch and streaming data processing?`,
        anchor:`Batch processing handles accumulated data on a schedule; streaming processes events continuously or in very small windows.`,
        compressed:`Batch processing handles accumulated data on a schedule; streaming processes events continuously or in very small windows.`,
        detail:`Batch systems process a bounded collection such as yesterday’s orders or a weekly file. They are often simpler, cheaper, and easier to replay. Streaming systems process events near real time and are useful when freshness matters, such as fraud detection or operational alerts. Streaming introduces additional concerns: event ordering, duplicates, late-arriving data, windowing, state management, and exactly-once claims. Many business problems do not require true streaming and are better served by frequent micro-batches. The architecture should match the actual latency requirement instead of using streaming for prestige.`,
        followup:`When would a five-minute batch be preferable to a streaming architecture?`,
        followupAnswer:`When five-minute-old data satisfies the business requirement, which is most operational reporting. Streaming adds operational complexity — exactly-once guarantees, watermarking, late-data handling, checkpoint recovery, stateful operator debugging — that a simple scheduled batch avoids. If the downstream consumer checks every five minutes anyway, the extra infrastructure cost of streaming doesn't buy anything.`,
        tie:`The current quality dashboard is a batch reporting workflow; explain what business need would justify lower latency.`,
        trap:`“Streaming is faster and therefore better.”`,
        l2q:`Walk through the concrete operational complexity streaming adds that batch avoids. When is that complexity actually justified?`,
        l2a:`Streaming brings a tax batch never pays: event-time versus processing-time reasoning, watermarks for late data, windowing and state that must be checkpointed and recovered, exactly-once semantics that are genuinely hard to achieve, and operators that are far harder to debug and replay than a re-run of yesterday's batch. That complexity is justified only when freshness has real value measured in seconds — fraud blocking, real-time alerting, live personalization — where acting a minute later materially changes the outcome. The applied skill is sizing the latency requirement honestly: if the consumer polls every five minutes, streaming buys nothing, and a frequent micro-batch captures most of the benefit at a fraction of the operational cost.`,
        l3q:`What are exactly-once semantics really, and why is "exactly-once delivery" largely a myth that mature systems engineer around?`,
        l3a:`In a distributed system you generally cannot guarantee a message is delivered exactly once — network and failure realities force a choice between at-most-once (may lose) and at-least-once (may duplicate), and the honest target is at-least-once delivery plus exactly-once processing, achieved by making consumers idempotent or transactionally deduplicating. Practically that means stable business keys, idempotency keys, dedup windows, or transactional sinks so that replays and retries converge to the correct state regardless of duplicate delivery — the same idempotency discipline that makes a batch pipeline safe to rerun, applied continuously. Frameworks advertise "exactly-once" by combining at-least-once delivery with checkpointed state and idempotent commits, not by magically delivering each event once. The senior insight: you don't get exactly-once for free, you engineer effectively-once by making processing idempotent, which is why idempotency is the central reliability concept in both batch and streaming — the difference is only how relentlessly the duplicates arrive.`,
      },
            {
        id:`de-4`,
        q:`What is a source-to-target mapping?`,
        anchor:`It documents how each source field becomes a field in the destination, including transformations and validation rules.`,
        compressed:`It documents how each source field becomes a field in the destination, including transformations and validation rules.`,
        detail:`A source-to-target mapping makes the data contract explicit. It identifies source systems, source columns, target columns, data types, transformation logic, defaults, keys, and rejection conditions. It also records semantic differences, such as one source using local time and another using UTC. Without a mapping, pipelines accumulate hidden assumptions and inconsistent definitions. The mapping should be versioned with schema changes and tests. It is especially important when multiple systems use similar names for different concepts or different names for the same concept.`,
        followup:`What should happen when a source adds a new category value that the target does not recognize?`,
        followupAnswer:`Reject or quarantine the record and alert the team rather than silently mapping the unknown value to null or 'other.' An unrecognized category often means the source changed a controlled vocabulary without coordination — a data contract violation. Silently continuing hides the problem. Fail noisily, investigate, and update the mapping before continuing.`,
        tie:`Relate this to the data dictionary and controlled taxonomy for compounding-quality records.`,
        trap:`Treating it as a simple column-renaming spreadsheet.`,
        l2q:`What turns a source-to-target mapping into an enforceable data contract rather than documentation that drifts?`,
        l2a:`A mapping becomes a contract when it is executable and gated: the agreed schema, types, allowed enumerations, and required fields are encoded as validation (Pydantic models, a schema registry, dbt tests) that runs on every load and rejects or quarantines violations, rather than living in a spreadsheet nobody re-reads. The contract also assigns ownership and a change process — the producer can't silently alter a controlled vocabulary or rename a field without a coordinated, versioned update — so the document and the enforcement can't diverge. The applied skill is making the contract code that fails loudly on violation, which is the difference between a mapping that protects the pipeline and one that merely describes its intentions.`,
        l3q:`Who owns a data contract, and why is enforcing one as much an organizational problem as a technical one?`,
        l3a:`The hard part of data contracts is not writing the validation, it is that the producer and consumer are usually different teams with different incentives — the producing team optimizes their own system and experiences contract enforcement as friction, while the consuming team bears the cost of every silent break. A contract only holds when ownership and accountability are explicit: the producer commits to a stable interface and a deprecation process, breaking changes go through expand-contract migrations with notice, and violations are made visible to the producer (shifting the cost back to where the change originated) rather than absorbed silently downstream. This is the data analog of API versioning and consumer-driven contracts in service design. The senior insight: data contracts fail for organizational reasons more than technical ones, so the real work is aligning incentives and ownership across producer and consumer teams — the validation code is the easy 20%, the coordination is the hard 80%, and it maps directly to the governed taxonomy and synchronized schemas in the compounding-quality work.`,
      },
            {
        id:`de-5`,
        q:`What is the difference between an operational database, a data warehouse, and a data lake?`,
        anchor:`Operational databases support application transactions, warehouses support structured analytics, and lakes store large amounts of raw or varied data.`,
        compressed:`Operational databases support application transactions, warehouses support structured analytics, and lakes store large amounts of raw or varied data.`,
        detail:`An operational database is optimized for current application reads and writes, often at individual-record granularity with constraints and transactions. A data warehouse is optimized for analytical queries across historical, integrated data. It often uses dimensional models and columnar storage. A data lake stores large volumes of structured, semi-structured, and unstructured data, usually in object storage. A lakehouse adds table formats and management features intended to bring warehouse-like reliability to lake storage. These categories overlap in modern platforms, but the workload remains the important distinction: transactional consistency versus analytical scanning and history.`,
        followup:`Why should a dashboard usually not query a high-volume production application database directly?`,
        followupAnswer:`Production databases are tuned for low-latency transactional reads and writes, not analytical scans across large date ranges. A long-running dashboard query can hold connections, consume pool slots, degrade application response times, and impose load the operational SLA wasn't designed for. Analytical queries belong on a replica, reporting database, or warehouse synchronized from the operational system.`,
        tie:`Contrast operational Smartsheet/source systems with Snowflake and published Tableau extracts.`,
        trap:`“A data lake is just a cheaper warehouse.”`,
        l2q:`Why are OLTP and OLAP systems built so differently under the hood, and what does that mean for where each workload belongs?`,
        l2a:`OLTP systems are row-oriented and optimized for many small, low-latency transactions with strong consistency — indexes, locks, and storage all tuned for "read or write one record fast." OLAP systems are columnar and optimized for scanning and aggregating huge ranges across few columns — compression, vectorized execution, and partition pruning tuned for "summarize millions of rows." Running an analytical scan on an OLTP store fights its design (no column pruning, lock contention, cache eviction, SLA risk to the app), which is why analytics belongs on a replica, reporting DB, or warehouse fed from the operational system. The applied skill is matching the workload to the engine and synchronizing rather than co-locating them.`,
        l3q:`How do you choose among warehouse, lake, and lakehouse for a real workload, and what failure modes does each invite?`,
        l3a:`The choice follows the data and the access pattern, and each option fails in a characteristic way. A warehouse gives reliable structured analytics and governance but can be costly and rigid for semi/unstructured data; a raw lake on object storage is cheap and flexible but degrades into a "data swamp" — undiscoverable, ungoverned, unreliable — without cataloging, schema-on-read discipline, and ownership; a lakehouse adds table formats (Delta, Iceberg) to bring ACID, time travel, and schema enforcement to lake storage, at the cost of newer, more complex tooling. The honest senior position is that these categories blur in modern platforms and the durable distinction is the workload (transactional consistency vs. analytical scanning vs. cheap retention of varied data), not the marketing label. The senior insight: there is no universally best store, only a best fit for the access pattern, and the dangerous default is dumping everything into a lake and discovering a swamp — governance and cataloging are what separate a lake from a swamp.`,
      },
            {
        id:`de-6`,
        q:`What are fact and dimension tables?`,
        anchor:`Fact tables store measurable events at a defined grain; dimension tables store descriptive context used to group and filter those facts.`,
        compressed:`Fact tables store measurable events at a defined grain; dimension tables store descriptive context used to group and filter those facts.`,
        detail:`A fact table contains events or measurements such as orders, incidents, or review outcomes. Its grain states exactly what one row represents. Measures such as quantity, cost, or duration belong in the fact. Dimension tables contain descriptive entities such as date, site, product, customer, or concern category. Facts reference dimensions using keys. This structure supports consistent analytical slicing and reduces repeated descriptive data. The most important design step is declaring the fact grain before selecting columns. Mixing multiple grains in one fact table creates duplicate counts and confusing measures.`,
        followup:`What would the grain of a quality-incident fact table be?`,
        followupAnswer:`One row per incident — the smallest event representing one quality occurrence. Each row captures one reported issue for one batch or order at one site on one date. Aggregates like weekly counts or site totals are computed at query time by grouping the atomic fact. Mixing grains — individual incidents and weekly summaries in one table — creates joins that double-count.`,
        tie:`Use QRE incidents as facts and site, date, dosage form, and category as dimensions.`,
        trap:`Defining facts as numeric columns and dimensions as text columns.`,
        l2q:`Dimensions change over time — a site gets renamed or re-regioned. How do you preserve historical accuracy?`,
        l2a:`This is the slowly-changing-dimension problem, and the right type depends on whether history matters. Type 1 overwrites the old value (simple, but it rewrites the past — a report rerun shows the new region for old facts); Type 2 adds a new dimension row with effective-date ranges and a surrogate key, so each fact joins to the dimension version that was current when the event happened, preserving "as-was" reporting. The applied skill is recognizing that overwriting a dimension silently restates history, so when "what was true at the time" matters — most quality and financial reporting — you use Type 2 and join facts to the version valid at the event date.`,
        l3q:`Why is declaring the fact grain the single most important modeling decision, and what specifically goes wrong when grains are mixed?`,
        l3a:`The grain is the contract for what one row means, and every measure, join, and aggregation depends on it being singular and explicit — get it right and the model is composable; get it wrong and the dimensional model produces double counts that survive review because the numbers still look plausible. Mixing grains is the classic failure: storing individual incidents and weekly summaries in one fact table means any join or sum double-counts, and additive measures stop being safely additive. The senior discipline is to declare grain first ("one row per incident"), keep each fact table to a single grain, build separate aggregate tables rather than co-mingling, and know which measures are additive, semi-additive (like balances, summable across some dimensions but not time), or non-additive (like ratios, never summable). The senior insight: the grain is the foundation the entire model rests on, so you declare it before choosing a single column, because a mixed-grain fact table produces believable wrong totals — the most expensive kind of error.`,
      },
            {
        id:`de-7`,
        q:`What are primary keys and foreign keys?`,
        anchor:`A primary key uniquely identifies a row; a foreign key links a row to a valid row in another table.`,
        compressed:`A primary key uniquely identifies a row; a foreign key links a row to a valid row in another table.`,
        detail:`A primary key enforces row identity and uniqueness. It may be a natural business key or a generated surrogate key. A foreign key enforces referential integrity by ensuring that a referenced parent exists, unless null is allowed. These constraints protect data correctness under concurrent writes and alternate ingestion paths. Composite keys use multiple columns when identity naturally depends on more than one value. Keys are not just database syntax; they define the entities and relationships in the model. Poorly chosen mutable keys make updates and history management difficult.`,
        followup:`When would you use a surrogate key instead of a natural key?`,
        followupAnswer:`When the natural key is long, composite, or unstable (it changes when business data changes). A surrogate key is a generated integer or UUID that never changes regardless of what happens to the business data. Stable surrogates mean foreign key relationships survive data corrections. Natural keys work well when they are truly immutable and single-column.`,
        tie:`Consider stable document IDs, chunk IDs, retrieval-run IDs, and review-case IDs.`,
        trap:`Saying keys exist only to make queries faster.`,
        l2q:`In a distributed or high-ingest system, why can a single auto-incrementing primary key become a problem, and what are the alternatives?`,
        l2a:`A single monotonic auto-increment key requires central coordination, which becomes a bottleneck and a single point of failure at scale, and it can't be generated independently across nodes or before a row reaches the database. Alternatives trade coordination against locality: UUIDs/GUIDs generate anywhere with no coordination but are large and, if fully random, hurt index locality and insert performance; time-ordered IDs like ULIDs or Snowflake IDs restore sortability and index locality while staying distributed. The applied skill is choosing the key strategy to match write distribution and access pattern — random UUIDs for decentralized generation, ULID/Snowflake when you also need time-ordering and tight indexes.`,
        l3q:`Analytical/warehouse environments often don't enforce foreign keys. Why, and what does that shift onto the pipeline?`,
        l3a:`Many warehouses either don't enforce referential integrity or let you declare it as unvalidated metadata, because enforcing constraints on bulk loads of billions of rows is expensive and the warehouse assumes data was already validated upstream. That shifts the burden from the database to the pipeline: integrity becomes something you assert and test (orphan-key checks, referential-integrity assertions in dbt, reconciliation) rather than something the engine guarantees, and surrogate keys plus careful load ordering replace enforced FKs for stitching facts to dimensions. The tradeoff is load performance and flexibility in exchange for the pipeline owning correctness that an OLTP database would have enforced automatically. The senior insight: in analytical systems referential integrity moves from a database guarantee to a pipeline responsibility, so you replace enforced constraints with automated data-quality assertions — the same fail-closed, validate-before-publish discipline that keeps the quality ETL's keys consistent without a relational engine policing them.`,
      },
            {
        id:`de-8`,
        q:`What are common data-quality dimensions?`,
        anchor:`Data quality includes completeness, validity, uniqueness, consistency, accuracy, and timeliness.`,
        compressed:`Data quality includes completeness, validity, uniqueness, consistency, accuracy, and timeliness.`,
        detail:`Completeness asks whether required data are present. Validity checks whether values follow allowed types, ranges, and categories. Uniqueness checks duplicate business keys or records. Consistency checks whether related systems and fields agree. Accuracy asks whether data reflect reality, which often requires external verification or reconciliation. Timeliness asks whether data arrive soon enough for their use. Integrity checks relationships and keys. Data-quality rules should be tied to the downstream risk: a dashboard may tolerate a delayed optional description but not a missing denominator or duplicated incident record.`,
        followup:`Which quality checks would you block publication on versus only warn about?`,
        followupAnswer:`Block on: missing required fields, duplicate business keys, row counts outside expected range, foreign key violations, invalid enumeration values. Warn on: optional fields with high null rates, values near but not exceeding range limits, slower-than-expected processing. The blocking threshold should match business risk — duplicated incident counts produce wrong decisions, but a late optional description can wait.`,
        tie:`Use schema validation, row-count reconciliation, content-hash deduplication, and preserve-last-good-extract behavior.`,
        trap:`“Clean data means no nulls.”`,
        l2q:`How do you tie data-quality thresholds to downstream risk instead of picking arbitrary numbers?`,
        l2a:`You set thresholds by reasoning from the cost of being wrong in the specific decision the data feeds, not from round-number defaults. A duplicated incident or a missing denominator corrupts a rate that drives an operational decision, so those block publication; a high null rate on an optional free-text description degrades nothing decision-critical, so it warns. The applied skill is mapping each check to its blast radius — "what wrong decision does this error cause, and how costly is it?" — and calibrating block-vs-warn and the numeric bounds accordingly, so the gate is strict where harm is high and tolerant where it isn't.`,
        l3q:`How do you operationalize data quality as a continuous, monitored system rather than a one-time validation script?`,
        l3a:`Mature data quality is a control system, not a checklist run once: you encode expectations as versioned, executable tests (Great Expectations, dbt tests) that run on every load, you track quality metrics as first-class time series so you can see degradation trends before they cross a threshold, and you wire a fail-closed gate that refuses to publish on a blocking violation while clearly marking any preserved last-good output as stale. Crucially you also distinguish point-in-time validation from distributional monitoring — a value can be individually valid yet collectively anomalous (a sudden category-mix shift), which is a data-drift signal a row-level check misses. This is the data-engineering sibling of model monitoring, and the same fail-closed philosophy behind MarketMind's gates. The senior insight: data quality at scale is a monitored control loop with executable expectations and trend-aware alerting, not a script you run once — which is exactly the schema validation, row-count reconciliation, and content-hash dedup the quality pipeline runs on every cycle.`,
      },
            {
        id:`de-9`,
        q:`What does it mean for a pipeline to be idempotent?`,
        anchor:`An idempotent pipeline can process the same input again without creating duplicate or inconsistent results.`,
        compressed:`An idempotent pipeline can process the same input again without creating duplicate or inconsistent results.`,
        detail:`Pipelines are retried because of timeouts, partial failures, operator reruns, and backfills. If rerunning the same data appends duplicates or applies a transformation twice, the pipeline is unsafe. Idempotency can be achieved through stable business keys, upserts, partitions that are replaced atomically, content hashes, checkpoints, and transaction boundaries. The exact design depends on whether the output is a snapshot, append-only event log, or mutable table. Idempotency does not mean every run produces identical timestamps or logs; it means the intended business state remains correct.`,
        followup:`How would you make a daily file ingestion safe to rerun?`,
        followupAnswer:`On each run, compute a content hash of the file and compare it to previously ingested hashes. If already processed, skip. If new, upsert records using a stable business key so duplicate rows aren't created. Write to a staging table first, validate row counts and required fields, then swap or merge into the final table atomically. Log the file hash, row count, and run timestamp for lineage.`,
        tie:`Use content-hash deduplication and reproducible output generation in the quality pipeline.`,
        trap:`“Idempotent means the code can run more than once.”`,
        l2q:`Compare the concrete mechanisms for achieving idempotency across snapshot, append-only, and mutable-table outputs.`,
        l2a:`The right mechanism depends on the output shape. For a mutable table, upsert/merge on a stable business key so a rerun overwrites rather than appends; for partitioned outputs, replace the whole partition atomically (write-then-swap) so a rerun rebuilds a clean partition; for append-only event logs, dedupe on an idempotency key or content hash so replays don't duplicate events. Content hashing also lets you skip work entirely when the input is unchanged. The applied skill is picking the technique to match the destination's semantics — merge keys, atomic partition swaps, or dedup keys — rather than assuming one approach fits every sink, and writing to staging then publishing atomically so a mid-run failure never leaves a half-written result visible.`,
        l3q:`Why is idempotency the foundational reliability property of data systems, and how does it interact with exactly-once and retries?`,
        l3a:`Idempotency is what makes retries safe, and retries are unavoidable because timeouts, partial failures, operator reruns, and backfills all reprocess the same data — so without idempotency every reliability mechanism becomes a duplication hazard. It is also the practical resolution of the exactly-once myth: since distributed delivery is realistically at-least-once, you achieve effectively-once by making the consumer idempotent (dedup keys, merges, transactional commits) so duplicate deliveries converge to the correct state. The discipline composes — staging plus atomic publish, stable keys, content hashing, checkpoints — into a pipeline where "run it again" is always safe, which is the precondition for automated retries, orchestrated recovery, and confident backfills. The senior insight: idempotency is not a nice-to-have, it is the property that makes a data system safely retryable, and almost every other reliability guarantee (exactly-once processing, automated recovery, safe backfills) is built on top of it.`,
      },
            {
        id:`de-10`,
        q:`What is an incremental load?`,
        anchor:`An incremental load processes only data that are new or changed since the previous successful run.`,
        compressed:`An incremental load processes only data that are new or changed since the previous successful run.`,
        detail:`Full refreshes reread and rebuild all data, which is simple but can become slow and expensive. Incremental loads reduce work by using a watermark, modification timestamp, sequence number, change-data-capture stream, or source partition. The design must account for updates, deletes, late arrivals, clock issues, and failed checkpoints. Watermarks should advance only after successful publication. A small overlap window can capture late records, with deduplication protecting against repeats. Periodic reconciliation or full rebuilds may still be necessary to detect missed changes.`,
        followup:`Why can updated_at > last_run_time miss records?`,
        followupAnswer:`Clocks can differ between systems. Records might be created and updated within the same millisecond and land exactly on the boundary. Records from a replicated source may have an updated_at reflecting the original system's clock rather than the replica's ingestion time. A small overlap window combined with deduplication on the business key handles most of these edge cases.`,
        tie:`Apply this to API extraction windows and last-good-run tracking.`,
        trap:`Assuming timestamps are perfectly reliable and records never arrive late.`,
        l2q:`Walk through designing a watermark-based incremental load that's robust to late data and failures.`,
        l2a:`A robust incremental load advances its watermark only after the batch is successfully published — never before — so a failed run reprocesses rather than skips, and it reads with a small overlap window behind the last watermark to catch records that arrived or were updated late. Deduplication on a stable business key absorbs the repeats that the overlap creates, and you persist the watermark and run state durably so an interrupted run resumes correctly. The applied skill is the combination — advance-after-success, overlap window, dedup on key — which together handle clock skew, boundary collisions, and late arrivals that a naive "strictly greater than last run" filter silently drops.`,
        l3q:`Incremental loads improve performance but accumulate risk over time. How do you keep them trustworthy, and why still do periodic full rebuilds?`,
        l3a:`Incremental loads trade completeness for speed, and small gaps compound silently: a handful of late records missed by a too-narrow window, a few changes lost to clock skew, a missed delete, and over months the incremental table drifts from the source without any error firing. The senior practice is defense plus reconciliation: change-data-capture where available (which captures deletes that timestamp-based logic misses), periodic reconciliation counts against the source, and scheduled full rebuilds that reset accumulated drift and validate that incremental logic still matches a from-scratch computation. The deletes problem is especially insidious because a timestamp watermark can't see a row that is simply gone. The senior insight: incremental processing is an optimization that accrues silent drift, so you pair it with reconciliation and periodic full rebuilds to catch what the watermark misses — speed from incremental, correctness from the rebuild that proves the two agree.`,
      },
            {
        id:`de-11`,
        q:`What is orchestration?`,
        anchor:`Orchestration schedules pipeline tasks, manages dependencies, tracks state, and handles retries and alerts.`,
        compressed:`Orchestration schedules pipeline tasks, manages dependencies, tracks state, and handles retries and alerts.`,
        detail:`An orchestrator coordinates a workflow made of tasks. It determines when tasks run, which tasks depend on others, what parameters and environments they use, and how failures are retried or surfaced. Examples include Airflow, Dagster, Prefect, and managed cloud services. Orchestration should not contain all transformation logic; the tasks should remain testable outside the scheduler. Good workflows are observable and support rerunning a failed partition rather than restarting everything. Overly complex dependency graphs become difficult to operate, so workflows should be decomposed around meaningful data products and clear ownership.`,
        followup:`Why is a cron job sometimes enough, and when is it not?`,
        followupAnswer:`A cron job is enough when the pipeline is a single script with no inter-step dependencies, when partial failure is acceptable (just rerun tomorrow), and when the schedule is fixed. It's not enough when you need task-level retry without restarting everything, dependency management between steps, visibility into which step failed, dynamic parameters, or more specific alerts than 'the job ran at 2am.'`,
        tie:`Use the required order of the Smartsheet scheduling scripts as a simple dependency workflow that could later be orchestrated.`,
        trap:`“Airflow is an ETL tool.”`,
        l2q:`As pipelines multiply, what specific capabilities push you from cron to a real orchestrator, and what does the orchestrator deliberately not own?`,
        l2a:`You graduate from cron when you need things cron can't express: dependency management between tasks (run B only after A succeeds), task-level retry without restarting the whole job, backfills over historical partitions, dynamic parameters, and visibility into which step failed and why. An orchestrator (Airflow, Dagster, Prefect) coordinates the workflow — when tasks run, what depends on what, how failures retry and alert. What it deliberately should not own is the transformation logic itself: tasks should be testable outside the scheduler, so the orchestrator stays a thin coordination layer rather than absorbing business logic that then can't be unit-tested or run locally. The applied skill is keeping orchestration and computation separate.`,
        l3q:`Why is an idempotent, partition-based, observable DAG the durable design, and how does this connect to controllers you've built elsewhere?`,
        l3a:`The robust orchestration pattern is a DAG of idempotent, partition-scoped tasks: model the workflow as a dependency graph (not a linear script), make each task safely rerunnable so a failed node can be retried or backfilled without rerunning everything, scope work to partitions so you reprocess one day rather than all history, and instrument each task so failures are visible and actionable. This is the same DAG-controller-over-linear-chain principle from the RQ4 work on task-graph controllers — explicit dependencies and independent, retryable units beat a monolithic sequence for both reliability and recovery. The pattern degrades gracefully: a partition fails in isolation rather than taking down the run, and recovery is "retry that node," not "restart the job." The senior insight: orchestration maturity is a graph of idempotent, observable, partition-scoped tasks rather than a scheduled monolith — the same structural argument (explicit dependencies, independent retryable units) that favors task-graph controllers over linear chains in agentic systems.`,
      },
            {
        id:`de-12`,
        q:`What are partitioning and indexing?`,
        anchor:`Partitioning divides data into manageable physical groups; indexing creates a structure that speeds specific lookups.`,
        compressed:`Partitioning divides data into manageable physical groups; indexing creates a structure that speeds specific lookups.`,
        detail:`Partitioning often organizes a large table or file dataset by date, site, or another common filter. Query engines can skip irrelevant partitions, reducing scanned data. Poor partition choices create too many tiny partitions or fail to match query patterns. An index stores selected key values with references to rows, helping databases avoid full scans for filters, joins, or ordering. Indexes consume storage and slow writes because they must be maintained. Composite index order matters. Partitioning and indexing solve related but different problems and should be driven by observed workloads and query plans.`,
        followup:`Why is indexing every column a bad strategy?`,
        followupAnswer:`Every index slows down writes because the database must update the index structure on insert, update, and delete. Indexes consume storage and memory. The query planner may choose a wrong index, producing worse performance than no index. Indexes pay off when a column appears frequently in WHERE clauses, JOIN conditions, or ORDER BY with high selectivity (many distinct values).`,
        tie:`Think about partitioning retrieval-evaluation runs by date and indexing case IDs or document IDs.`,
        trap:`Treating partitions as folders only or indexes as free performance improvements.`,
        l2q:`How do you choose a partition key, and what does a bad choice cost you in practice?`,
        l2a:`A good partition key matches how queries filter — usually a date for time-bounded analytical queries — so the engine prunes irrelevant partitions and scans a fraction of the data. The failure modes are concrete: too-fine a key (partitioning by a high-cardinality ID) creates millions of tiny files with crushing metadata and per-file overhead — the "small files problem" — while too-coarse a key forces full scans because nothing can be pruned, and a key that doesn't match the query filter buys nothing at all. The applied skill is partitioning on the dominant filter dimension at a granularity that balances pruning against file count, and validating it against real query plans rather than guessing.`,
        l3q:`How do composite index order, write amplification, and the query planner interact, and why can "obvious" indexes hurt?`,
        l3a:`Indexing is a set of tradeoffs, not free speed. A composite index serves queries that filter on a left-prefix of its columns, so column order determines which queries it accelerates — wrong order and a seemingly relevant index goes unused. Every index also imposes write amplification: inserts, updates, and deletes must maintain each index structure, so over-indexing silently taxes every write and consumes storage and memory. And the planner uses statistics to choose an access path, so stale statistics or low selectivity can lead it to pick a worse index than a full scan, meaning an index can degrade performance rather than improve it. The senior insight: indexing trades write cost and storage for read speed on specific access patterns, so you index deliberately for observed query shapes — composite order matched to filters, selectivity high enough to matter — and verify via query plans, because the "obvious" index can slow writes and still go unused.`,
      },
            {
        id:`de-13`,
        q:`What is schema evolution?`,
        anchor:`Schema evolution is the controlled process of changing data fields and types without silently breaking producers or consumers.`,
        compressed:`Schema evolution is the controlled process of changing data fields and types without silently breaking producers or consumers.`,
        detail:`Schemas change when fields are added, renamed, removed, or retyped. Additive optional changes are usually easier to support than removals or semantic changes. Producers and consumers may deploy at different times, so compatibility matters. Data contracts, versioning, migration logic, default handling, and deprecation windows reduce breakage. Historical records may not contain new fields, and backfills may be required. A field can remain technically the same type while its business meaning changes, which is equally dangerous. Schema changes should trigger tests, documentation updates, and downstream impact review.`,
        followup:`Why is renaming a column often a breaking change even when the data are unchanged?`,
        followupAnswer:`Every upstream query, downstream consumer, API contract, ORM model, report, and dashboard that references that column by name breaks. The data is unchanged but all the code reading it is wrong. Renaming requires a migration strategy — adding the new name as an alias, deprecating the old name over a transition period, and coordinating all consumers — rather than a simple column rename.`,
        tie:`Use the synchronized Pydantic schemas, data dictionary, expected outputs, and workflow taxonomy.`,
        trap:`“Just add the new column and update the query.”`,
        l2q:`What's the difference between backward, forward, and full schema compatibility, and why does the direction matter when producers and consumers deploy independently?`,
        l2a:`Backward compatibility means new consumers can read old data; forward compatibility means old consumers can read new data; full compatibility is both. The direction matters because producers and consumers deploy at different times, so during a rollout you may have a new producer writing data an old consumer must still read (needs forward compatibility) or a new consumer reading historical data (needs backward). Additive optional fields are usually safe in both directions; removals, renames, and type changes break one or both. The applied skill is knowing which compatibility your deployment order requires and restricting schema changes to ones that preserve it, often enforced by a schema registry that rejects incompatible changes.`,
        l3q:`How do you safely rename or retype a column in a live system with many independent consumers, and why is the same-type-new-meaning change the most dangerous of all?`,
        l3a:`You never rename in place; you use expand-contract (parallel-change): add the new column alongside the old, dual-write both, migrate consumers one at a time onto the new name, and only drop the old column once nothing reads it — a multi-phase migration with a deprecation window, not a rename. The genuinely worst change is the one schema validation can't catch: a field keeps its name and type but its business meaning shifts (a status code is redefined, a unit silently changes from grams to milligrams), so every consumer keeps working while computing wrong results, and no compatibility check fires because the structure is unchanged. Defenses are semantic versioning of the contract, documented meaning, and tests that assert on values and distributions, not just types. The senior insight: structural schema changes are handled by expand-contract migrations, but the dangerous change is semantic — same type, new meaning — because it passes every type check while silently corrupting every consumer, which is why the synchronized schemas and data dictionary in the quality work govern meaning, not just shape.`,
      },
            {
        id:`de-14`,
        q:`How should a pipeline handle failures and retries?`,
        anchor:`Failures should be classified, logged with context, retried only when safe, and prevented from publishing corrupt partial results.`,
        compressed:`Failures should be classified, logged with context, retried only when safe, and prevented from publishing corrupt partial results.`,
        detail:`Transient failures such as a temporary network timeout may be retried with bounded attempts and backoff. Permanent failures such as invalid schema or missing required fields should fail fast and route the bad input for investigation. Retries must be idempotent so they do not duplicate outputs. Pipelines should write to staging locations and publish atomically after validation when possible. Logs should include run ID, source, partition, row counts, timing, and error category. Alerts should focus on actionable failures. A last-known-good output can preserve availability, but it must be clearly marked stale rather than silently presented as current.`,
        followup:`Why can unlimited retries make an outage worse?`,
        followupAnswer:`If many pipeline instances retry a failed operation simultaneously without backoff, they create a thundering herd that amplifies load on a recovering service. The recovering service gets overwhelmed by retry traffic before stabilizing, causing repeated failure. Exponential backoff with jitter, maximum retry limits, and circuit breakers prevent retry storms from converting a temporary outage into a prolonged one.`,
        tie:`Use preserve-last-good-extract behavior, row-count reconciliation, and structured logging from the quality pipeline.`,
        trap:`“Retry three times for every exception.”`,
        l2q:`How do you classify failures so retries are safe and useful rather than harmful?`,
        l2a:`The first move is to split transient from permanent. Transient failures (network timeout, throttling, a briefly unavailable dependency) are retried with bounded attempts, exponential backoff, and jitter so recovery doesn't trigger a thundering herd. Permanent failures (schema violation, missing required field, malformed input) should fail fast and route the bad record to a dead-letter queue or quarantine for investigation, because retrying them just wastes work and delays the alert. Retries are only safe if the operation is idempotent, so a retried write can't duplicate output. The applied skill is encoding this taxonomy — retry-with-backoff for transient, fail-fast-and-quarantine for permanent — rather than blindly retrying every exception N times.`,
        l3q:`What patterns keep a failure in one dependency from cascading into a system-wide outage, and how do you fail without corrupting data?`,
        l3a:`Resilience against cascading failure comes from a small family of patterns working together: exponential backoff with jitter prevents retry storms against a recovering service; circuit breakers stop hammering a failing dependency and let it heal; bulkheads isolate resources so one saturated component can't starve the rest; and timeouts bound how long any call can hang. Alongside availability you protect correctness with staging-then-atomic-publish so a partial failure never leaves half-written data visible, and a clearly-marked last-known-good output preserves availability without masquerading as current. The deepest lesson is that retries themselves are a load amplifier — naive retries convert a brief outage into a sustained one by piling traffic onto a recovering service. The senior insight: resilience is backoff, circuit breakers, bulkheads, and timeouts to contain cascades, plus atomic publish and clearly-stale fallbacks to fail without corrupting or silently misleading — designing the failure path as deliberately as the success path.`,
      },
            {
        id:`de-15`,
        q:`What is a backfill, and how do you run one safely?`,
        anchor:`A backfill reprocesses historical data to repair, enrich, or populate outputs using corrected logic.`,
        compressed:`A backfill reprocesses historical data to repair, enrich, or populate outputs using corrected logic.`,
        detail:`Backfills are needed after a bug fix, schema addition, missed ingestion period, or new derived field. They can consume far more compute and write volume than normal daily processing, so they should be scoped by partition and tested on a small range first. The logic should be versioned, idempotent, and isolated from current production runs. Teams should estimate downstream impact, monitor row counts and quality metrics, and preserve the ability to roll back. A backfill may change historical dashboards, so stakeholders need to know whether previous numbers will be restated. Successful completion should be reconciled against expected coverage.`,
        followup:`How would you backfill a year of data without overwhelming the source system?`,
        followupAnswer:`Process in small day-sized or week-sized partitions sequentially rather than one massive query. Add rate limiting or sleep intervals between requests. Run during off-peak hours on the source system. Use a read replica or export snapshot rather than querying production directly. Track completed partitions in a checkpoint table so you can resume from the last success if interrupted.`,
        tie:`Apply this to rebuilding historical quality outputs after a corrected normalization or deduplication rule.`,
        trap:`Running the normal full pipeline over all history without capacity, reconciliation, or rollback planning.`,
        l2q:`How do you run a backfill alongside live production without the two corrupting each other or restating numbers unexpectedly?`,
        l2a:`You isolate the backfill from the daily run so they can't collide on the same outputs — separate compute, careful partition targeting, and idempotent writes so reprocessing a partition replaces rather than duplicates. You scope and test on a small date range first to validate the corrected logic and estimate cost before scaling out, you monitor row counts and quality metrics as it runs, and you preserve rollback. Crucially, because a backfill can restate historical dashboards, you communicate to stakeholders whether and how prior numbers will change before they notice on their own. The applied skill is treating a backfill as a controlled, isolated, reversible operation with stakeholder communication, not just rerunning the normal pipeline over all history.`,
        l3q:`A backfill changes numbers people have already seen and made decisions on. How do you handle the integrity and trust dimension, not just the mechanics?`,
        l3a:`The hard part of a backfill is rarely compute — it is that restating history can erode trust and even reopen settled decisions, so the integrity work matters as much as the mechanics. Senior practice makes restatements visible and explainable: announce before the change what will move and why, version the logic so the before/after is reproducible, keep the raw layer so anyone can verify the restatement from source, and consider preserving the prior figures (as-reported vs. as-restated) so a decision made on old numbers remains auditable rather than silently rewritten. This is the data-lineage and immutable-artifact discipline applied to history — you don't quietly overwrite the past, you document the correction with full provenance. The senior insight: a backfill is a restatement of record, so the discipline is reproducible, communicated, provenance-tracked correction rather than silent overwrite — the same append-only, content-addressable thinking behind MarketMind's Resolution Ledger, where history is corrected transparently, never erased.`,
      }
    ],
  },
  react: {
    label: `React & TypeScript`, short: `React/TS`,
    icon: `⚛️`, color: `ui`,
    questions: [
      {
        id:`react-01`, q:`Where should React state be stored?`,
        anchor:`State should be stored in the component that owns and controls the data. If multiple components need the same state, it should usually be moved to their closest shared parent.`,
        compressed:`React state should live as close as possible to the components that use it. If only one component needs a value, keeping the state inside that component makes the code easier to understand and limits unnecessary rerendering. When two or more sibling components need to read or update the same value, the state should usually be lifted to their closest common parent. The parent then passes the value and any update functions down through props. This creates a single source of truth. It prevents two components from storing separate copies of the same information and becoming inconsistent. For example, if a search field changes which document rows are displayed, the filter state should not live inside an individual row. It should live in the table or page component that controls both the search field and the displayed rows.`,
        detail:``,
        followup:`What does "lifting state up" mean in React?`,
        followupAnswer:`Moving state from a child component to the closest common ancestor so multiple sibling components can share it. The parent becomes the single owner and passes the value and setter down through props. 'Up' means toward the first ancestor that controls all the components that need the shared state.`,
        tie:`The selected document, active filter, review-drawer visibility, and currently selected citation may need to live in a page-level or panel-level component because multiple child components use them.`,
        trap:`"All state should be global." "State should always stay in the child." Putting separate copies of the same state in sibling components. Moving state higher without explaining which components need it.`,
        l2q:`How would you decide between local component state, context, and a dedicated state-management library?`,
        l2a:`Use local state when only one component or a small subtree needs the value. Use context when many components need relatively stable shared values such as authentication, theme, locale, or feature flags. Use a dedicated state management library when state is large, changes frequently, must be shared across distant parts of the application, or requires advanced capabilities such as caching, synchronization, derived state, debugging tools, or cross-page coordination. The decision should consider scope, update frequency, debugging needs, and whether unrelated components need access to the data.`,
        l3q:`How would you redesign a React application where excessive lifted state causes large parts of the page to rerender?`,
        l3a:`First profile the application to identify which state updates are causing expensive re-renders. Split oversized page-level state by ownership and move state closer to the components that actually use it. Use component composition to isolate expensive subtrees. Avoid a single large context object — instead, separate contexts by domain or split read and write contexts. For frequently changing shared state, consider an external store with selector-based subscriptions so components only re-render when the specific data they consume changes. The goal is to reduce render blast radius while preserving a single source of truth.`,
      },
      {
        id:`react-02`, q:`What is a controlled input in React?`,
        anchor:`A controlled input is an input whose value is stored in React state and updated through an event handler.`,
        compressed:`In a controlled input, React state is the source of truth. The component passes the current value into the input through the <code>value</code> prop and updates that value through <code>onChange</code>. This gives the application direct control over the input. It makes validation, conditional UI, character counts, reset behavior, and submission logic straightforward. An uncontrolled input keeps its current value in the DOM. React can read it through a ref when needed. Uncontrolled inputs can be appropriate for very simple forms, file inputs, or integrations with code that manages the DOM directly. Controlled inputs are common when the interface must respond to every change in the value.`,
        detail:``,
        followup:`What is the difference between the input's <code>value</code> and <code>defaultValue</code> props?`,
        followupAnswer:`<code>value</code> makes the input controlled — React owns the value and it only changes through <code>onChange</code>. Without <code>onChange</code>, the field is read-only. <code>defaultValue</code> sets the initial value for an uncontrolled input and lets the DOM manage it afterward — React does not track subsequent changes. Use <code>value</code> + <code>onChange</code> for controlled inputs; use <code>defaultValue</code> only for uncontrolled ones.`,
        tie:`Reviewer comments, document filters, search fields, and approval-reason inputs are likely controlled because the application needs validation, draft preservation, or conditional actions.`,
        trap:`"Controlled means the user cannot edit it." "Uncontrolled means the input has no validation." Using <code>value</code> without an <code>onChange</code> handler and accidentally making the field read-only. Saying controlled inputs are always superior.`,
        l2q:`When might you choose an uncontrolled input instead of a controlled input?`,
        l2a:`Use an uncontrolled input when React does not need to respond to every keystroke or continuously own the current value. Common examples include simple forms, file inputs, third-party libraries that manipulate the DOM directly, and very large forms where field-level rerendering may become expensive. Uncontrolled inputs store their current value in the DOM and are usually read through a ref or a form library. Some form libraries use uncontrolled inputs internally to reduce rerenders while still providing validation and submission handling. The choice is not that uncontrolled inputs are always faster or controlled inputs are always better. It depends on whether the application needs immediate validation, conditional rendering, synchronization, or direct control over each change.`,
        l3q:`How would you design a large form containing hundreds of fields without causing every keystroke to rerender the entire form?`,
        l3a:`First, measure the form with React DevTools Profiler to identify whether rerendering is actually a bottleneck. Then isolate fields into smaller components so a change to one field does not rerender the entire form. Use field-level subscriptions or a form library that supports uncontrolled or hybrid input management. Avoid storing one giant form object in a page-level component if every update replaces the whole object. Separate immediate field updates from expensive derived work. Debounce operations such as autosave, server validation, or large recalculations. Keep synchronous validation close to the field when possible, and run cross-field validation only when required. The design goal is for each field or small group of related fields to subscribe only to the state it needs.`,
      },
      {
        id:`react-03`, q:`What is <code>useEffect</code> used for?`,
        anchor:`<code>useEffect</code> is used to synchronize a React component with something outside React, such as a network connection, timer, browser API, or external subscription.`,
        compressed:`An Effect runs after React has rendered and committed an update. It is appropriate when the component must interact with an external system. Common examples include subscribing to browser events, starting and cleaning up a timer, connecting to a WebSocket, synchronizing with a non-React library, and updating an external system when a value changes. The cleanup function runs when the component unmounts or before the Effect reruns. Effects should not normally be used to calculate values that can be derived from existing props or state. Derived values can be calculated during rendering — no need to store them in separate state and update through an Effect.`,
        detail:``,
        followup:`Why might an Effect return a cleanup function?`,
        followupAnswer:`To undo whatever the Effect set up, so it doesn't accumulate across rerenders. A timer needs to be cleared, an event listener needs to be removed, a subscription cancelled, a WebSocket closed. Without cleanup, these accumulate across rerenders and cause memory leaks, stale handlers, or incorrect behavior when the Effect reruns with new dependencies.`,
        tie:`An Effect may subscribe to job-status updates or connect to a streaming review service. Filtering retrieval results or calculating result counts should usually happen during rendering instead.`,
        trap:`"<code>useEffect</code> runs whenever something changes." Using an Effect for every calculation. Forgetting cleanup for subscriptions and timers. Omitting dependencies to force an Effect to run less often.`,
        l2q:`Give an example of an Effect that should be replaced with an event handler or render-time calculation.`,
        l2a:`An Effect should not be used to store a value that can be directly derived from existing props or state. For example, storing filtered items in state and updating them through an Effect duplicates derived state and causes an unnecessary render. The filtered value can be calculated directly during rendering: <code>const visibleItems = items.filter(item => item.name.includes(filter))</code>. Similarly, logic that happens because a user clicked a button should usually run inside the button's event handler rather than through an Effect watching for a state change caused by that button. Effects are appropriate for synchronizing with external systems, not for coordinating ordinary internal calculations.`,
        l3q:`How would you diagnose an Effect that repeatedly fetches data, uses stale values, or enters an infinite loop?`,
        l3a:`First, determine whether the Effect is necessary at all. If the work can happen during rendering or directly inside an event handler, remove the Effect. Then inspect the dependency array. An infinite loop often occurs because the Effect updates state that changes one of its own dependencies, or because an object, array, or function dependency is recreated on every render and therefore has a new identity each time. Stale values usually come from stale closures or missing dependencies — the Effect captures values from the render in which it was created. Also check whether functions or objects should be defined inside the Effect or stabilized, whether subscriptions and timers have cleanup functions, whether fetch requests should be cancelled with AbortController, and whether React Strict Mode is intentionally running setup and cleanup twice. The fix should preserve correct dependencies rather than suppressing warnings.`,
      },
      {
        id:`react-04`, q:`What is <code>useReducer</code>?`,
        anchor:`<code>useReducer</code> is a React hook that manages state by sending actions to a reducer function that calculates the next state.`,
        compressed:`A reducer receives the current state and an action and returns the next state. The component calls <code>dispatch</code> instead of calling separate setters. <code>useReducer</code> is useful when several values change together or when state transitions have clear meanings. It centralizes the transition logic and makes it easier to see which actions are allowed. Simple components with one or two independent values often remain clearer with <code>useState</code>.`,
        detail:``,
        followup:`What does the reducer function return?`,
        followupAnswer:`The next state — a new object representing what state should be after the action. A reducer must never mutate the current state directly; it returns a replacement. If no action matches, it returns the current state unchanged. The returned value is what React stores and passes to the next render.`,
        tie:`A review panel may have related transitions for loading a task, selecting citations, changing a comment, submitting a decision, and handling success or failure.`,
        trap:`Saying a reducer directly changes the current state. Using reducers for every component. Creating generic actions such as SET_FIELD without preserving meaningful domain transitions. Performing API calls directly inside the reducer.`,
        l2q:`When would <code>useReducer</code> be clearer than five separate <code>useState</code> calls?`,
        l2a:`<code>useReducer</code> is clearer when several state values change together or when state changes represent meaningful domain events. A review form might track current comment, selected citations, submission status, validation errors, and server error — if several handlers must update multiple values consistently, a reducer centralizes those transitions. Actions such as <code>reviewLoaded</code>, <code>commentChanged</code>, <code>submissionStarted</code>, <code>submissionSucceeded</code>, and <code>submissionFailed</code> are easier to understand than several unrelated setter calls spread across the component. A reducer is especially useful when updates must be atomic, the same transitions happen from several places, state transition logic needs unit testing, or some transitions should be impossible. Simple, independent values usually remain clearer with <code>useState</code>.`,
        l3q:`How would you model a review workflow as a state machine rather than a collection of loosely related booleans?`,
        l3a:`Define explicit states representing the valid stages of the workflow such as <code>idle</code>, <code>loading</code>, <code>ready</code>, <code>submitting</code>, <code>succeeded</code>, <code>failed</code>, and <code>conflict</code>. Then define which transitions are allowed — for example <code>ready -> submitting</code>, <code>submitting -> succeeded</code>, <code>submitting -> failed</code>. This prevents impossible combinations such as <code>isLoading = true, isSubmitted = true, hasError = true</code>. The state should include only the data valid for that state, using a discriminated union where the <code>status</code> field determines which other fields are present. Keep side effects such as API calls outside the reducer — the reducer decides the next state, application code performs the external work. For highly complex workflows, explicit state-machine tooling may improve visualization, guards, transition testing, and prevention of invalid states.`,
      },
      {
        id:`react-05`, q:`What do <code>useMemo</code> and <code>useCallback</code> do?`,
        anchor:`<code>useMemo</code> stores the result of a calculation between renders. <code>useCallback</code> stores a function reference between renders.`,
        compressed:`React normally reruns the component function on every render, which means calculations are performed again and new function objects are created. <code>useMemo</code> can reuse a previously calculated value until one of its dependencies changes. <code>useCallback</code> can preserve a callback reference. These hooks are performance tools, not correctness tools. Most calculations and function creation are inexpensive. Adding memoization everywhere can make code harder to read and can add its own comparison and memory costs. Memoization should be used when an expensive calculation or unstable prop reference causes a measured problem.`,
        detail:``,
        followup:`Does <code>useMemo</code> guarantee that a value will never be recalculated?`,
        followupAnswer:`No. React may discard memoized values between renders — for example, during offscreen work or to free memory. <code>useMemo</code> is a performance hint, not a behavioral guarantee. Code that depends on a value being calculated exactly once should not rely on <code>useMemo</code> for correctness. It should only be used to avoid expensive recalculation between renders when dependencies haven't changed.`,
        tie:`Memoization may help with expensive formatting of large document chunks or stable callback props passed into a virtualized result table.`,
        trap:`"<code>useMemo</code> makes the application faster." Memoizing every value and callback. Using memoization to fix incorrect logic. Being unable to explain which rerender or computation is being prevented.`,
        l2q:`How would you prove that memoization improved a component?`,
        l2a:`Measure before and after under repeatable conditions. Use React DevTools Profiler to compare how often the component renders, how long renders take, which props caused rerenders, and whether child components were skipped after memoization. Use browser performance tools for expensive calculations or long tasks. Test with realistic data sizes rather than tiny development fixtures. For a calculation, record its execution cost before and after <code>useMemo</code>. For a callback, verify that stabilizing the reference actually allows a memoized child to avoid rerendering. Memoization is justified only when the measured improvement outweighs its complexity and overhead.`,
        l3q:`How can memoization make performance worse?`,
        l3a:`Dependencies must be compared on each render, cached values and closures consume memory, and the memoized calculation may still rerun frequently if dependencies change often. Code becomes harder to understand and maintain. Unstable object or function dependencies can invalidate the cache every render, making memoization ineffective. Memoizing a trivial calculation can cost more than recalculating it. <code>useCallback</code> can also be ineffective if the receiving component is not memoized or if another prop changes every render anyway. Memoization can also cause developers to focus on avoiding renders instead of fixing larger architectural problems such as oversized state ownership, expensive component trees, or excessive network requests. Use it for measured bottlenecks, not as a default style.`,
      },
      {
        id:`react-06`, q:`How can TypeScript represent loading, success, and error states?`,
        anchor:`TypeScript can represent them with a discriminated union containing a status field.`,
        compressed:`A discriminated union defines the exact fields available in each state. The <code>status</code> field is the discriminator. TypeScript uses it to narrow the object. This prevents impossible or contradictory combinations such as <code>{ isLoading: true, isError: true, data: someData }</code>. With a discriminated union, loading cannot also contain success data unless the type explicitly permits it.`,
        detail:``,
        followup:`What does TypeScript narrowing mean?`,
        followupAnswer:`The process by which TypeScript uses a runtime check to refine a broad type to a more specific one within a code block. After <code>if (result.status === 'success')</code>, TypeScript knows <code>result</code> is the success variant and permits access to <code>result.data</code>. Without the check, accessing <code>.data</code> on the wider union would be a compile error. Narrowing converts a union type into one specific member based on the control flow.`,
        tie:`Retrieval previews, review submissions, document-processing jobs, and exports all move through identifiable asynchronous states.`,
        trap:`Using many unrelated optional booleans. Making every property optional. Using <code>any</code> for API state. Accessing <code>data</code> without first checking the state.`,
        l2q:`How would you enforce exhaustive handling of every union member?`,
        l2a:`Use a <code>switch</code> on the discriminating field and assign the default case to <code>never</code>. If a new union member is added but the <code>switch</code> is not updated, TypeScript reports that the unhandled value cannot be assigned to <code>never</code>. This turns missing state handling into a compile-time error. The pattern is: in the <code>default</code> case, declare <code>const exhaustiveCheck: never = state</code> — TypeScript will flag this as an error when <code>state</code> can still be any unhandled member. This ensures that every branch of the union is handled and future additions to the union are automatically caught.`,
        l3q:`How would you model background refresh where old data remains visible while a newer request is loading?`,
        l3a:`Do not represent every request with one <code>isLoading</code> boolean. Distinguish initial loading from refreshing by using a discriminated union that includes a <code>refreshing</code> state with the previous data attached. During the initial load there may be no data to display; during a background refresh, preserve the last successful data and indicate that it may be stale. The UI can continue showing the previous result while displaying a refresh indicator. If the refresh fails, the application may preserve the old data and show a non-blocking warning rather than replacing the entire screen with an error. The model should make freshness, refresh state, and retained data explicit.`,
      },
      {
        id:`react-07`, q:`Why should API responses be validated at runtime?`,
        anchor:`Because TypeScript types disappear at runtime and cannot guarantee that data received from an external service has the expected shape.`,
        compressed:`TypeScript verifies code during development and compilation. It does not inspect the actual data sent by a server. A type assertion does not validate anything — it only tells the compiler to trust the developer. The API could return missing fields, incorrect field types, unexpected null values, a new schema version, or an error document instead of the expected payload. Runtime validation checks the real value before the application uses it. Validation should usually happen near the API boundary. The rest of the application can then work with trusted domain objects rather than repeatedly checking raw network data.`,
        detail:``,
        followup:`What is the difference between a type assertion and validation?`,
        followupAnswer:`A type assertion (<code>as ReviewResponse</code>) tells the TypeScript compiler to treat a value as a given type — it doesn't inspect or change the runtime value at all. Validation actually checks the runtime value and confirms it matches the expected shape or produces an error. An assertion can silence type errors while leaving invalid data flowing through the application; validation catches real data problems at the point they enter the system.`,
        tie:`The review interface should validate retrieval results, citation structures, task statuses, and assessment responses before storing them in UI state.`,
        trap:`"The backend uses Java, so the response is safe." Treating <code>as ReviewResponse</code> as validation. Using <code>any</code> for network data. Performing random defensive checks throughout every component instead of validating at the boundary.`,
        l2q:`Where should validation errors be translated into user-facing errors?`,
        l2a:`Keep responsibilities separate. The transport or API layer should perform the request, check HTTP status, decode the response, validate the runtime shape, and return a typed result or a structured technical error. The domain or application layer can translate low-level failures into meaningful application categories such as network unavailable, authentication required, response schema invalid, version conflict, or service temporarily unavailable. The presentation layer decides how to show the error to the user — an inline field message, retry banner, modal, or generic failure notice. Components should not need to understand raw JSON decoding errors. The API boundary identifies malformed data; the UI chooses user-appropriate language.`,
        l3q:`How would you evolve a frontend and backend contract without breaking independently deployed clients?`,
        l3a:`Prefer backward-compatible, additive changes — add optional fields rather than renaming or removing existing ones, preserve existing meanings, and allow clients to ignore fields they do not understand. Use versioning when a breaking change is unavoidable. Maintain a deprecation period before removing old fields or endpoints. Use generated schemas or clients when practical and run contract tests. A safe deployment sequence is often: deploy backend support for both old and new contracts, deploy clients that understand the new contract, observe adoption and errors, then remove the old contract only after all clients have migrated. Add observability for schema validation failures, old-version traffic, and deprecated field usage.`,
      },
      {
        id:`react-08`, q:`How should a React component handle an API request?`,
        anchor:`It should show loading, success, and error states, prevent invalid duplicate actions, and ignore or cancel requests that are no longer relevant.`,
        compressed:`When the user starts an API request, the interface should clearly represent that the operation is in progress. A basic flow: set state to loading, send the request, store the result or error, re-enable actions when appropriate, and avoid updating state after the request becomes irrelevant. For submissions, the button may be disabled while the request is active. For searches or changing selections, a previous request may no longer matter — the application can cancel it with an AbortController or track which request is newest. This prevents an older, slower response from replacing the result of a newer request.`,
        detail:``,
        followup:`Why might disabling a submit button be useful?`,
        followupAnswer:`It prevents duplicate submissions. If the user clicks submit and the request takes two seconds, a second click without the disable sends a second request — creating duplicate records, double charges, or conflicting state. The disabled button also signals that the action was registered and is in progress, reducing uncertainty about whether the click was received.`,
        tie:`A reviewer should not accidentally submit the same approval twice, and an older retrieval-preview request should not overwrite results for a newly selected document.`,
        trap:`Only describing the happy path. Ignoring loading and error states. Assuming responses always arrive in request order. Permanently disabling the interface after an error.`,
        l2q:`How would you implement an optimistic approval action?`,
        l2a:`Update the UI immediately as though the approval succeeded, while preserving enough previous state to roll back. A basic sequence is: save the current item state, mark the item approved locally, disable duplicate approval actions, send the request, reconcile the local state with the server response, and if the request fails, restore the previous state or mark the item as needing attention. The optimistic state should be visibly distinguishable when appropriate, especially for important workflows. The server remains authoritative — if it returns a different version or rejects the action, the client must reconcile rather than silently keeping its optimistic result. Optimistic updates are best when failure is uncommon and rollback is understandable.`,
        l3q:`How would you handle simultaneous edits, stale versions, retries, and duplicate requests across multiple browser tabs?`,
        l3a:`Use server-side concurrency and idempotency controls. For stale edits, include an entity version or last-updated value with the request and have the server perform a conditional update — returning a conflict response such as HTTP 409 if the version changed. The client shows the newer server state and asks the user to reconcile. For retries and duplicate submissions, attach an idempotency key so repeating the same logical request returns the same result rather than applying the operation twice. Across tabs, use BroadcastChannel, storage events, or refreshed server queries when cross-tab coordination matters. The server must remain the authoritative source for versions, transitions, and duplicate prevention.`,
      },
    ],
  },
  sql: {
    label: `SQL & Data Modeling`, short: `SQL/Data`,
    icon: `🗄️`, color: `sql`,
    questions: [
      {
        id:`sql-01`, q:`What is a primary key?`,
        anchor:`A primary key is a column or set of columns that uniquely identifies each row in a table.`,
        compressed:`A primary key must identify one row and should not contain duplicate or null values. Primary keys are used by other tables to refer to the row through foreign keys. They also help the database enforce identity and usually create a unique index. A primary key should be stable — a value that frequently changes, such as a document title, is generally a poor primary key because every related reference would become harder to maintain.`,
        detail:``,
        followup:`Can a primary key contain more than one column?`,
        followupAnswer:`Yes — this is a composite primary key. Both columns together must be unique; neither column alone needs to be. Composite keys are natural for join tables (e.g., <code>reviewer_id + task_id</code> together identify one assignment). They are usually avoided on large tables when a single surrogate key is cleaner and easier to reference from other tables.`,
        tie:`Documents, document versions, chunks, answers, review tasks, and review events all need stable identifiers.`,
        trap:`"A primary key is the first column." Assuming it must always be an auto-incrementing integer. Using a mutable display value as identity. Confusing a primary key with any indexed column.`,
        l2q:`How would you choose between an integer key, UUID, and composite primary key?`,
        l2a:`Use an integer surrogate key when you want a compact, efficient, database-generated identifier with good index performance and simple foreign-key relationships. Use a UUID when identifiers must be generated across distributed systems, before database insertion, merged from multiple systems, or exposed publicly without revealing sequence information. Use a composite primary key when the natural identity of the row is the combination of multiple columns, such as reviewer_id and task_id in an assignment table. The choice should balance performance, uniqueness requirements, readability, and long-term maintainability.`,
        l3q:`How would key selection affect partitioning, replication, data migration, and high-volume index behavior?`,
        l3a:`Primary-key design affects both logical modeling and physical database behavior. Sequential integer keys provide excellent index locality and compact storage, but may create write hot spots and require coordination for uniqueness across systems. UUIDs provide global uniqueness and simplify distributed writes, replication, and data migration, but increase storage overhead and can reduce index locality, leading to page splits and less efficient caching. Composite keys model natural relationships well but increase index size, foreign-key complexity, and migration effort. Key selection should consider access patterns, write distribution, partitioning strategy, storage costs, and future operational requirements.`,
      },
      {
        id:`sql-02`, q:`What is database normalization?`,
        anchor:`Normalization organizes data into related tables so the same fact is not unnecessarily duplicated.`,
        compressed:`Normalization separates entities and relationships. Instead of storing a reviewer's name repeatedly on every task, the database could store the reviewer once and reference the reviewer's ID from each task. This reduces update problems — if the reviewer's name changes, it can be updated in one place. Normalization also helps enforce consistent relationships with primary and foreign keys. It does not mean every value must be separated into the maximum possible number of tables. The goal is a clear source of truth and fewer update anomalies.`,
        detail:``,
        followup:`What problem can duplicated data cause?`,
        followupAnswer:`Update anomalies — changing one fact requires finding and updating every copy, and missing any copy leaves the database with contradictory information. For example, if a reviewer's name is stored on every task and the reviewer changes their name, every task row must be updated. Duplication also makes it unclear which copy is authoritative.`,
        tie:`Documents, versions, chunks, answers, citations, reviewers, and review events should be modeled as related entities rather than repeated inside one giant table.`,
        trap:`"Normalization means making the database faster." Splitting every field into its own table. Treating duplicate cached or reporting data as automatically incorrect. Being unable to explain update inconsistency.`,
        l2q:`When might you intentionally denormalize data?`,
        l2a:`Denormalize when measured read-performance or reporting requirements justify storing duplicated or precomputed data. Examples include reporting tables, materialized views, search indexes, cached aggregates, precomputed dashboard projections, and read models optimized for a specific screen. The normalized model should remain the canonical source of truth. Denormalized copies should have a defined refresh strategy, ownership model, and acceptable freshness window. Denormalization should solve a measured problem, not be used simply to avoid joins.`,
        l3q:`How would you maintain consistency between a normalized write model and denormalized read models?`,
        l3a:`Treat the normalized transactional model as the source of truth. For changes that must update both, update them in one database transaction when they are in the same consistency boundary. For asynchronous read models, publish change events after the write — an outbox pattern can record the business change and the event in the same transaction, then a separate publisher safely forwards the event. Consumers should be idempotent so replaying an event does not corrupt the projection. Read models should be rebuildable from canonical data or an event history. Define freshness guarantees explicitly and add reconciliation jobs that compare canonical records with projections and repair drift.`,
      },
      {
        id:`sql-03`, q:`What is a foreign key?`,
        anchor:`A foreign key is a constraint that requires a value in one table to reference an existing row in another table.`,
        compressed:`A foreign key preserves referential integrity. The database will reject a row whose foreign key value does not refer to an existing referenced row. Foreign keys can also define what happens when the referenced row is updated or deleted, such as restricting deletion or cascading it. The delete behavior should reflect the domain — automatically deleting important audit history may be dangerous, even if cascading is technically convenient.`,
        detail:``,
        followup:`What does referential integrity mean?`,
        followupAnswer:`Every foreign key value in a child table must reference an existing row in the parent table — no orphaned records. A citation cannot reference a chunk that was deleted, and a review event cannot reference an unknown task. The database enforces this automatically, rejecting inserts or deletes that would leave dangling references.`,
        tie:`A citation should not refer to a chunk that does not exist, and a review event should not refer to an unknown review task.`,
        trap:`"A foreign key is just another ID column." Assuming naming a column <code>document_id</code> creates a relationship. Adding cascade deletion everywhere. Assuming foreign keys automatically create every useful index.`,
        l2q:`How would you model a many-to-many relationship between answers and cited chunks?`,
        l2a:`Create a join table containing foreign keys to both entities. The join table represents the relationship between an answer and a chunk. Add a uniqueness constraint or composite primary key to prevent duplicate relationships. Store relationship-specific metadata on the join table — citation order, supporting span, citation type, confidence, and added timestamp all belong on the relationship because they describe how that specific chunk supports that specific answer. The join table is a first-class entity, not just a link.`,
        l3q:`When might a high-scale system avoid or selectively use database-enforced foreign keys?`,
        l3a:`A system may avoid cross-table foreign keys when data is partitioned or sharded across independent databases, different services own the related records, high-volume ingestion requires fewer synchronous checks, or bulk imports would be slowed by validation. Removing foreign keys does not remove the consistency requirement — it transfers enforcement to application logic and operations. The system then requires validation before writes, idempotent ingestion, reconciliation jobs, orphan detection, event-driven cleanup, and monitoring of missing references. Foreign keys should not be removed merely for presumed performance; the operational cost of rebuilding referential integrity must be justified.`,
      },
      {
        id:`sql-04`, q:`What is a database index?`,
        anchor:`An index is a data structure that helps the database find rows more quickly.`,
        compressed:`Without a useful index, the database may need to scan many or all rows to find a result. Indexes improve many read operations, but they have costs: they consume storage, inserts and updates must maintain them, too many indexes can slow writes, and an index may not help if the query returns a large portion of the table. Indexes should be chosen based on actual query patterns rather than added to every column.`,
        detail:``,
        followup:`Why can an index slow down writes?`,
        followupAnswer:`Every write operation must keep all indexes on the table consistent. When a row is inserted, updated, or deleted, every index covering a column in that row must be updated. More indexes mean more maintenance work per write. On a write-heavy table with many indexes, this overhead accumulates and can significantly reduce write throughput.`,
        tie:`The review queue may frequently filter by reviewer, status, due date, or creation time.`,
        trap:`"Indexes always make the database faster." Indexing every column. Assuming an index is automatically used. Ignoring column order in a composite index.`,
        l2q:`How would you determine whether a query is using an index effectively?`,
        l2a:`Use <code>EXPLAIN</code> or <code>EXPLAIN ANALYZE</code>. Inspect whether the database performs an index scan or full table scan, estimated rows versus actual rows, execution time, rows filtered out, join strategy, sort operations, whether the index matches the query's filter and ordering, and whether the query returns so much of the table that an index is not beneficial. Test with realistic production-like data volume and distribution — a query that performs well on 100 rows may behave very differently with millions. Do not assume that creating an index means the database will use it.`,
        l3q:`How would you design indexes for a large, write-heavy queue with several competing access patterns?`,
        l3a:`Start by measuring the real workload: most frequent filters, sort orders, queue-polling queries, write rate, retention period, data distribution, and query latency targets. Create a small number of indexes aligned with important access patterns — composite index column order should match how queries filter and sort. Consider partial indexes for active or pending rows, covering indexes when avoiding table lookups materially helps, partitioning for large retained histories, and separate indexes for mutually important access paths. Monitor write amplification from every extra index and hot-page behavior on sequential inserts. Monitor index usage and remove unused or redundant indexes as workload and data distribution change.`,
      },
      {
        id:`sql-05`, q:`What is the difference between an inner join and a left join?`,
        anchor:`An inner join returns only matching rows from both tables. A left join returns every row from the left table and matching rows from the right table when they exist.`,
        compressed:`An inner join returns only rows with a match on both sides. A left join returns all rows from the left table — rows without a match on the right have NULL values for the right-side columns. The correct join depends on the business question. If the dashboard must show unreviewed tasks, an inner join would incorrectly hide them.`,
        detail:``,
        followup:`What value appears for right-side columns when a left join has no match?`,
        followupAnswer:`NULL. All columns from the right table are NULL for rows where no match exists on the right side. This also enables the anti-join pattern: <code>WHERE right_table.id IS NULL</code> after a left join returns only left-table rows that had no match on the right.`,
        tie:`A pending-work dashboard should preserve tasks that do not yet have a completed review.`,
        trap:`Repeating syntax without explaining which rows remain. Saying a left join is always slower. Forgetting that filters in the WHERE clause can accidentally remove unmatched rows. Using SELECT * across several tables.`,
        l2q:`How can a condition in the WHERE clause accidentally turn a left join into inner-join behavior?`,
        l2a:`A left join preserves unmatched rows by filling the right-side columns with NULL. If a WHERE filter references a nullable right-side column, rows where that column is NULL are removed — which eliminates all unmatched rows and produces inner-join behavior. To preserve unmatched left-side rows, place the right-side filter in the join condition rather than the WHERE clause. The join condition is evaluated per-row during matching; the WHERE clause is evaluated after the join is formed, when NULLs have already appeared. Alternatively, explicitly allow NULL in the WHERE filter when that matches the business requirement.`,
        l3q:`How would you diagnose duplicate rows caused by joins in a reporting query?`,
        l3a:`Determine the intended grain of the result and the cardinality of every relationship. Ask: should this query return one row per task? Can one task have many reviews? Can one review have many citations? A one-to-many join expands rows, and joining several one-to-many tables can multiply them further. Inspect row counts after each join and group by the expected key to identify which join introduces duplication. Do not use DISTINCT as a blind fix — it may hide a modeling or query error. Choose the correct approach: aggregate child rows before joining, select the latest child row with a window function, add missing join constraints, use EXISTS when only existence matters, or return nested or separate results when the relationship is genuinely one-to-many.`,
      },
      {
        id:`sql-06`, q:`What does GROUP BY do?`,
        anchor:`GROUP BY combines rows with the same grouping values so aggregate functions can calculate results for each group.`,
        compressed:`GROUP BY changes the result's grain. Instead of returning one row per source row, it returns one row per group. Common aggregate functions include COUNT, SUM, AVG, MIN, and MAX. Columns selected without an aggregate function generally need to appear in the GROUP BY clause.`,
        detail:``,
        followup:`What is the difference between WHERE and HAVING?`,
        followupAnswer:`WHERE filters individual rows before grouping — it cannot reference aggregate functions. HAVING filters groups after GROUP BY — it applies to the aggregated result and can use COUNT(), SUM(), etc. Example: <code>WHERE status = 'pending'</code> selects source rows; <code>HAVING COUNT(*) > 5</code> then keeps only groups with more than five rows.`,
        tie:`The dashboard may count pending tasks by reviewer, calculate average review time, or summarize retrieval failures by document.`,
        trap:`"GROUP BY sorts the rows." Selecting unrelated columns without understanding the grouping level. Using grouping when row-level detail must be preserved. Being unable to describe the result grain.`,
        l2q:`When would you use a window function instead of GROUP BY?`,
        l2a:`Use a window function when you need aggregate, ranking, or sequence information while preserving individual rows. GROUP BY collapses rows to one per group. A window function preserves every source row while adding a computed value in a new column. Use window functions for ranking, running totals, previous or next values, group counts attached to detail rows, latest-row selection, and percent-of-group calculations. The key distinction is whether you need the individual rows to remain in the result or whether you only need the aggregated summary.`,
        l3q:`How would you retrieve the latest review event per task and still make the result deterministic when timestamps tie?`,
        l3a:`Use a window function with a stable secondary ordering column. Partition by the task ID, order by created_at descending as the primary sort, and add a unique stable column such as event ID as a secondary sort. Assign a row number and select only row number 1. Ordering only by timestamp is not deterministic when two events share the same timestamp — adding a unique, stable secondary key guarantees the same row is chosen consistently regardless of how the database breaks ties internally.`,
      },
      {
        id:`sql-07`, q:`What is a database transaction?`,
        anchor:`A transaction groups multiple database operations so they succeed or fail as one unit.`,
        compressed:`If related operations must all succeed or all fail together, they belong in a transaction. If an error occurs before the commit, the transaction can be rolled back. Transactions protect related data changes, but the application must still define which business rules require atomicity. Holding transactions open while waiting for user input or remote API calls can cause serious problems.`,
        detail:``,
        followup:`What does rollback mean?`,
        followupAnswer:`Undoing all changes made within the transaction since it began, returning the database to its state before the transaction started. If an error occurs partway through a multi-step operation, rollback ensures none of the partial changes are permanently saved. The database is left consistent as if the transaction never ran.`,
        tie:`Assignment, approval, final assessment, and audit recording often need to remain consistent as a single operation.`,
        trap:`"A transaction is any SQL query." Assuming transactions prevent every concurrency problem. Holding transactions open while waiting for user input or remote API calls. Updating current state and audit history separately.`,
        l2q:`How can two reviewers still conflict even when each uses a transaction?`,
        l2a:`Transactions make each reviewer's set of operations atomic, but separate transactions can still read the same initial state before either commits. Both reviewers read task version 3, both decide to approve it, both submit their updates, and one overwrites the other without knowing a conflict occurred. Possible solutions include optimistic locking with a version column checked in the update condition, conditional updates that check expected state before committing, pessimistic row locks that prevent concurrent reads, and appropriate isolation levels. Transactions protect atomicity but do not automatically prevent every race condition.`,
        l3q:`How would you enforce that a review task can only move through valid transitions under heavy concurrency?`,
        l3a:`Use a conditional update that checks both the expected current state and a version number. If zero rows are updated, the state or version changed and the request should return a conflict. Additional protections may include database constraints for valid states, optimistic locking for common low-contention updates, pessimistic locking for rare high-contention workflows, atomic audit-event insertion in the same transaction, idempotency keys for retries, and clear retry behavior for transient conflicts. Every accepted or rejected transition should be auditable.`,
      },
    ],
  },
  sdlc: {
    label: `SDLC & DevOps`, short: `SDLC/Ops`,
    icon: `🔄`, color: `infra`,
    questions: [
      {
        id:`sdlc-01`, q:`What is continuous integration?`,
        anchor:`Continuous integration is the practice of frequently merging code and automatically checking that it builds and passes required tests and quality checks.`,
        compressed:`A CI pipeline runs when developers open or update a pull request, merge code, or trigger another configured event. Typical checks include compiling, running unit and integration tests, linting, formatting checks, type checking, security or dependency checks, and producing a deployable artifact after successful validation. The purpose is to detect problems early and consistently. A failed CI check should clearly identify which part of the system failed.`,
        detail:``,
        followup:`Why should CI run on pull requests?`,
        followupAnswer:`A pull request is the last point to catch problems before code affects everyone else's work. Running checks on the PR lets the author and reviewers see failures before they reach the shared branch. Catching a problem in a PR takes minutes; catching it after merge means tracking down an offending commit in a branch others have already built on.`,
        tie:`The Java API, React/TypeScript UI, and Python retrieval code should have separate, visible checks so a failure can be traced to the correct subsystem.`,
        trap:`"CI means automatically deploying every commit." Only mentioning unit tests. Allowing CI and local development to use unrelated commands. Producing artifacts even when required checks fail.`,
        l2q:`Which checks should block a merge, and which should run later before deployment?`,
        l2a:`Checks that are fast, deterministic, and necessary to keep the shared branch healthy should block merges: compilation, unit tests, linting, formatting checks, type checking, contract tests, and basic integration tests. Slower, more expensive, or environment-dependent checks should run later before deployment: full end-to-end tests, load and performance tests, long-running security scans, migration validation, staging smoke tests, and canary validation. The goal is to provide fast feedback during code review while still validating release readiness before deployment.`,
        l3q:`How would you design a reliable CI pipeline for a polyglot monorepo without rerunning every job for every change?`,
        l3a:`Use affected-change detection rather than running every job for every commit. Organize the repository into clearly defined ownership boundaries and maintain a dependency graph between projects. Use path-based triggers to run only the builds and tests affected by a change, while ensuring that changes to shared libraries, contracts, schemas, build tooling, or CI configuration trigger all dependent jobs. Cache language-specific dependencies and build artifacts to reduce execution time. Keep pull-request validation fast and deterministic, then run broader validation on the main branch, nightly schedules, or release pipelines. When dependency impact is uncertain, prefer running additional jobs rather than risking missed failures.`,
      },
      {
        id:`sdlc-02`, q:`What is a container?`,
        anchor:`A container packages an application with the runtime and dependencies it needs so it can run consistently in different environments.`,
        compressed:`A container image contains the application and its required filesystem dependencies. A container is a running instance of that image. Containers help reduce environment differences such as different runtime versions, missing system libraries, different package versions, and manual setup steps. Containers are generally intended to be replaceable. Persistent data should normally be stored outside the container. Containerization does not automatically provide orchestration, secret management, monitoring, backups, or scaling.`,
        detail:``,
        followup:`What is the difference between a container image and a running container?`,
        followupAnswer:`An image is an immutable snapshot describing everything needed to run the application — filesystem, runtime, code, and configuration. A container is a live running process spawned from that image. One image can produce many containers simultaneously. Stopping a container doesn't change the image; deleting a container loses any data written to its filesystem, but the image remains.`,
        tie:`The Spring API, frontend server, and Python worker can each be packaged as reproducible images while the database and document storage remain external.`,
        trap:`"A container is a lightweight virtual machine." Storing important persistent data only in the container filesystem. Baking secrets into the image. Assuming Docker alone makes a system production-ready.`,
        l2q:`What practices would you use to build secure and efficient container images?`,
        l2a:`Use small, trusted base images; pinned runtime and dependency versions; multistage builds so compilers and build tools are excluded from the final image; a non-root runtime user; a minimal build context with .dockerignore; no secrets in layers, environment defaults, or build arguments; vulnerability scanning; reproducible package installation; only the files required at runtime; read-only filesystems where practical; and explicit entrypoints and health behavior. Keep build and runtime concerns separate — the final image should contain the application and required runtime dependencies, not source-control metadata, test fixtures, package caches, or development tools.`,
        l3q:`How would you debug a container that works locally but repeatedly fails or restarts in production?`,
        l3a:`Compare the production environment against local assumptions. Inspect the container exit code, entrypoint and command, application logs before restart, environment variables and secret injection, CPU and memory limits, out-of-memory kills, filesystem permissions and write locations, read-only filesystem behavior, container architecture and base-image compatibility, health-check failures, startup and readiness timing, network and dependency availability, mounted files and volumes, signal handling and graceful shutdown, and production deployment configuration. Determine whether the orchestrator is restarting the process because it crashed, exceeded limits, or failed health checks. Reproduce the production image and runtime configuration as closely as possible rather than rebuilding a different local variant.`,
      },
      {
        id:`sdlc-03`, q:`What is infrastructure as code?`,
        anchor:`Infrastructure as code defines infrastructure resources in version-controlled files instead of creating them manually.`,
        compressed:`Infrastructure as code can describe networks, databases, storage buckets, queues, permissions, compute resources, and deployment environments. The configuration can be reviewed and applied repeatedly. Benefits include consistent environments, recorded change history, peer review, easier disaster recovery, reduced manual setup, and less dependence on undocumented knowledge. Infrastructure as code does not mean every environment must be identical — it means differences should be declared and understood rather than created through untracked manual changes.`,
        detail:``,
        followup:`Why is version control useful for infrastructure?`,
        followupAnswer:`It creates a history of every change — who changed what, when, and why. This enables pull-request review before applying changes, rollback to a previous known-good state, understanding why a system looks the way it does, and compliance auditing. Without version control, infrastructure changes are invisible and unrecoverable if something goes wrong.`,
        tie:`The product's database, object storage, queue, networking, service permissions, and deployment environment should be reproducible from code.`,
        trap:`"Infrastructure as code is just a setup script." Assuming it prevents all manual drift. Storing secrets directly in infrastructure files. Mixing product business rules into infrastructure definitions.`,
        l2q:`What is infrastructure drift, and how would you detect or correct it?`,
        l2a:`Infrastructure drift occurs when the real environment no longer matches the declared infrastructure configuration — a firewall rule changed manually, a resource created outside the code, a setting edited in the cloud console, or a deployed resource deleted manually. Detect drift with planning, preview, or drift-detection commands that compare declared and actual state. Correction options include applying the declared configuration to restore the expected state, importing legitimate manually created resources into managed state, updating code when the manual change was intended, or removing unauthorized resources. Reduce drift by limiting manual production access, requiring reviewed infrastructure changes, and auditing changes outside the normal pipeline.`,
        l3q:`How would you structure infrastructure code across development, staging, and production without copying entire configurations?`,
        l3a:`Create reusable modules for shared infrastructure patterns such as application service, database, queue, network, object storage, and monitoring. Keep environment-specific configuration explicit — instance size, replica count, domain, retention, feature flags, and backup policy. Use separate state files or state backends for each environment to prevent accidental cross-environment changes. Promote tested module versions through environments rather than independently rewriting infrastructure. Apply least privilege separately in each environment — production should not automatically inherit broad development permissions. Avoid over-abstracting modules into highly generic systems that hide important behavior; shared modules should remove duplication while keeping security, capacity, and environment differences visible.`,
      },
      {
        id:`sdlc-04`, q:`What is a secret in an application?`,
        anchor:`A secret is sensitive information such as a password, API key, token, or private key that must not be exposed publicly.`,
        compressed:`Secrets allow systems to authenticate or access protected resources. Secrets should not be committed to source control, included in container images, printed in logs, shared in documentation or chat, or hard-coded in application source. They should be stored in an approved secret-management system and supplied to the application at runtime. Access should follow least privilege — each service receives only the secrets and permissions it actually needs.`,
        detail:``,
        followup:`Why is committing a secret and deleting it in a later commit still unsafe?`,
        followupAnswer:`Git preserves the full history of every commit, including ones 'deleted' in later commits. Anyone who clones the repository or accesses history can checkout the commit where the secret was present and read it. Automated scanners also search repository history. The secret must be considered fully compromised and rotated immediately — removing it from later commits does not remove it from history.`,
        tie:`Database credentials, embedding-provider credentials, and service-to-service tokens must be kept outside the repository and runtime image.`,
        trap:`"Environment variables are always secure." Committing .env files. Using one shared credential for every service. Logging entire configuration objects that contain secrets.`,
        l2q:`How should secrets be provided to CI jobs and production services?`,
        l2a:`Store secrets in the CI platform's secret store or an approved external secrets manager. For CI: scope secrets only to workflows, repositories, branches, or environments that need them; mask values in logs; avoid exposing secrets to untrusted pull requests; prefer short-lived identity federation over long-lived credentials; and do not place secrets in artifacts, caches, or generated files. For production: inject secrets at runtime, use workload identities or service accounts where possible, grant least-privilege access, audit secret access, and rotate credentials regularly. Environment variables may be a delivery mechanism, but they are not themselves a complete secret-management strategy.`,
        l3q:`How would you rotate a heavily used credential without downtime?`,
        l3a:`Support overlapping validity. A safe sequence is: create a new credential while the old one remains valid, update the secret store, roll out applications that can use the new credential, verify successful authentication and monitor errors, confirm all instances have migrated, revoke the old credential, and remove fallback support. Prefer dynamic or short-lived credentials when available because they reduce manual rotation risk. The process should include staged rollout, clear rollback, audit logs, expiration tracking, monitoring of old-key usage, and emergency revocation procedures. Never revoke the old credential before consumers have successfully adopted the new one.`,
      },
      {
        id:`sdlc-05`, q:`What is a health check?`,
        anchor:`A health check is an endpoint or command used to determine whether an application is running and able to perform its work.`,
        compressed:`In an orchestrated environment, health checks often have two different purposes. Liveness: should the process be restarted? Readiness: can the process receive traffic now? An application may be alive but not ready — it may still be starting, warming a cache, loading a model, or temporarily unable to reach a required dependency. Liveness checks should be simple and should not fail merely because one downstream service has a temporary problem. Restarting the application may not fix the downstream dependency.`,
        detail:``,
        followup:`Can an application be alive but not ready?`,
        followupAnswer:`Yes — and the distinction matters. An application starting up may be alive (the process is running) but not ready (still loading configuration, connecting to databases, or warming a cache). Sending traffic to an unready instance causes errors. Liveness determines if the process should be restarted; readiness determines if it should receive traffic. An instance can pass liveness while failing readiness.`,
        tie:`A Python worker may be alive while loading an index but not ready to accept retrieval work. The API may be alive while temporarily unable to access its database.`,
        trap:`Using one shallow endpoint for every health purpose. Restarting the application whenever any dependency is unavailable. Returning healthy without checking whether the service initialized correctly. Adding expensive work to every health request.`,
        l2q:`Which dependencies should be included in readiness, and which should be excluded from liveness?`,
        l2a:`Liveness should answer: is this process running, or is it stuck in a condition that restarting may fix? Keep liveness shallow — it should not usually fail because a database, queue, or external API is temporarily unavailable, since restarting the process will not repair those dependencies and may create a restart storm. Readiness should answer: can this instance safely receive traffic right now? Include dependencies that are essential to serving requests correctly. Exclude optional dependencies when the service can degrade gracefully. The decision should be based on whether the instance can safely serve traffic and whether removing it from traffic is useful.`,
        l3q:`How would you prevent health checks from causing cascading failures during a dependency outage?`,
        l3a:`Use short health-check timeouts, shallow liveness checks, readiness thresholds rather than failing on one transient error, backoff and jitter, circuit breakers, load shedding, cached dependency status where appropriate, low-frequency inexpensive probes, and conservative restart policies. Do not make every health check run expensive queries against an already failing dependency. During an outage, readiness may remove overloaded instances from traffic, but if every instance becomes unready simultaneously the system may have no capacity — design partial-degradation behavior where possible. Health checks should report useful status without amplifying dependency load.`,
      },
      {
        id:`sdlc-06`, q:`What is a deployment rollback?`,
        anchor:`A rollback restores a previously working application version after a new deployment causes a serious problem.`,
        compressed:`A safe deployment process should make it possible to identify the deployed version and replace it with a previously tested artifact. Rollback works best when artifacts are immutable, the previous artifact is retained, configuration changes are tracked, database changes are backward compatible, monitoring detects problems quickly, and the deployment process is automated. Rollback is not always enough — a new version may have changed data in a way the old version cannot understand. Sometimes rolling forward with a small corrective release is safer than rolling back.`,
        detail:``,
        followup:`Why can a database change make rollback difficult?`,
        followupAnswer:`The old application version may not understand the new database schema, and the new version may have already written data in the new format that the old version cannot read or that violates the old schema's constraints. If a column was renamed or a new NOT NULL column was added, the old application fails. This is why schema changes often need staged rollout — make the schema backward-compatible first, deploy the new application, then clean up.`,
        tie:`A retrieval regression or broken review-submission release should be containable without immediately affecting every reviewer.`,
        trap:`"Just redeploy the last commit." Rebuilding the old version instead of retaining the tested artifact. Ignoring configuration and database changes. Having no monitoring criteria for deciding when to roll back.`,
        l2q:`What is the difference between a canary deployment and a blue-green deployment?`,
        l2a:`A canary deployment gradually sends a small percentage of traffic to the new version — 1%, 5%, 25%, 50%, 100% — observing metrics at each stage and stopping if problems appear. A blue-green deployment maintains two complete environments, validates the new environment, then switches all traffic at once. Canary advantages: limits initial blast radius, measures real behavior under gradual load, supports progressive validation. Canary costs: requires traffic splitting, both versions may run simultaneously, and metrics must distinguish versions. Blue-green advantages: fast traffic switch and fast rollback to the previous environment. Blue-green costs: requires duplicate environment capacity, and a full traffic switch may expose problems suddenly.`,
        l3q:`How would you build an automated progressive-delivery policy for this product?`,
        l3a:`Define rollout stages and required observations: internal only, 1%, 10%, 25%, 50%, 100%. At each stage, evaluate technical metrics such as error rate, latency, timeouts, and resource usage, and business and quality metrics such as review completion rate, retrieval success, and human override rate. Require minimum traffic or sample sizes before promotion. Define automatic stop conditions and rollback thresholds. Use feature flags to disable risky behavior independently of the deployment. Ensure database changes are backward compatible with both old and new versions. Include automated pause or rollback, manual override, version-specific dashboards, audit history, explicit timeout for inconclusive stages, and clear ownership during rollout.`,
      },
      {
        id:`sdlc-07`, q:`What are application logs?`,
        anchor:`Logs are timestamped records of events that occurred while an application was running.`,
        compressed:`Logs help developers and operators understand what the application did. Production logs should usually be structured so tools can search fields rather than parse free-form sentences. Logs should include enough context to diagnose the event but must avoid passwords, tokens, unnecessary personal data, or full sensitive payloads. Logs are only one observability signal. Metrics summarize trends and traces show the path of a request across services.`,
        detail:``,
        followup:`Why is a request or correlation ID useful?`,
        followupAnswer:`It connects all the log entries, spans, and events from one request as it moves through multiple services. Without it, correlating logs across a React UI, Spring API, database call, and Python retrieval for a single failed request requires matching timestamps and guessing. With a correlation ID generated at the entry point and threaded through every service, you filter all logs to that ID and reconstruct exactly what happened.`,
        tie:`A request ID can connect the React submission, Spring request, database operation, and Python retrieval call involved in one user action.`,
        trap:`Logging everything, including secrets. Only logging generic messages such as "something failed." Depending on local console output in production. Treating logs as the only monitoring system.`,
        l2q:`What is the difference between logs, metrics, and traces?`,
        l2a:`Logs are detailed event records describing what happened — a specific review submission failed because version 4 was stale. Metrics are numerical measurements aggregated over time — request count, error rate, p95 latency, queue depth, CPU usage — best for dashboards, trends, and alerts. Traces follow one request or operation across service boundaries, showing which spans occurred and how long each step took across the browser, API, database, and downstream services. Use metrics to detect that something is wrong, traces to locate where time or failure occurred, and logs to inspect detailed context for a specific event.`,
        l3q:`How would you design observability for a slow or incorrect RAG response?`,
        l3a:`Assign a request or trace ID at the frontend or API boundary and propagate it through every service. Capture timing for frontend request duration, API processing, database calls, retrieval duration, number of chunks scanned, candidate count, reranking duration, model-call latency, token usage, and final response serialization. Record version information for the application deployment, retrieval configuration, embedding model, prompt or workflow version, and corpus or index version. For quality diagnosis, collect privacy-safe metadata such as retrieval scores, empty-result rate, citation coverage, refusal rate, and human override rate. Use metrics for trends and alerting, distributed traces for latency attribution, and structured logs for individual failures. Avoid logging full sensitive documents, secrets, private prompts, or unnecessary user content.`,
      },
    ],
  },
};

// ── State ─────────────────────────────────────────────────
const QB_KEY     = 'cqw-qbank-v1';
const QB_POS_KEY = 'cqw-qbank-pos';
let qbTrack = 'swe', qbIdx = 0, qbRev = false, qbDetail = false, qbFuRev = false;

function qbLoad()    { try { return JSON.parse(localStorage.getItem(QB_KEY)||'{}'); } catch { return {}; } }
function qbSave(s)   { localStorage.setItem(QB_KEY, JSON.stringify(s)); }
function qbGetSt(id) { return qbLoad()[id]; }
function qbSetSt(id, st) { const s=qbLoad(); if(st) s[id]=st; else delete s[id]; qbSave(s); }

function qbSavePos() { localStorage.setItem(QB_POS_KEY, JSON.stringify({track:qbTrack,idx:qbIdx})); }
function qbRestorePos() {
  try {
    const p = JSON.parse(localStorage.getItem(QB_POS_KEY)||'{}');
    if (p.track && QBANK_L1[p.track]) {
      qbTrack = p.track;
      const maxIdx = QBANK_L1[p.track].questions.length - 1;
      qbIdx = (typeof p.idx === 'number' && p.idx >= 0 && p.idx <= maxIdx) ? p.idx : 0;
    }
  } catch {}
}

function qbCounts(tk) {
  const s=qbLoad(), qs=QBANK_L1[tk].questions;
  return { mastered:qs.filter(q=>s[q.id]==='mastered').length, review:qs.filter(q=>s[q.id]==='review').length, total:qs.length };
}

/* ── Q BANK MARKDOWN EXPORT ─────────────────────────── */
function exportQBankMarkdown() {
  /* Strip inline HTML tags for clean markdown */
  function strip(s) {
    return (s || '').replace(/<[^>]+>/g, '').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&code;/g,'`');
  }

  const lines = [];
  const totalQ = Object.values(QBANK_L1).reduce((s, t) => s + t.questions.length, 0);
  const withStretch = Object.values(QBANK_L1).flatMap(t => t.questions).filter(q => q.l2q).length;

  lines.push('# Level I Question Bank');
  lines.push('');
  lines.push('*' + totalQ + ' questions · ' + Object.keys(QBANK_L1).length + ' tracks · ' + withStretch + ' with Level II/III stretch*');
  lines.push('');

  Object.entries(QBANK_L1).forEach(([, track]) => {
    lines.push('---');
    lines.push('');
    lines.push('## ' + track.icon + ' ' + track.label);
    lines.push('');

    track.questions.forEach((q, i) => {
      lines.push('### Q' + (i + 1) + ': ' + strip(q.q));
      lines.push('');

      lines.push('**Anchor answer**');
      lines.push('');
      lines.push(strip(q.anchor));
      lines.push('');

      lines.push('**Full answer**');
      lines.push('');
      lines.push(strip(q.detail));
      lines.push('');

      if (q.trap) {
        lines.push('**Common trap**');
        lines.push('');
        lines.push(strip(q.trap));
        lines.push('');
      }

      lines.push('**Follow-up:** ' + strip(q.followup));
      lines.push('');
      lines.push(strip(q.followupAnswer));
      lines.push('');

      if (q.tie) {
        lines.push('**Project tie-in**');
        lines.push('');
        lines.push(strip(q.tie));
        lines.push('');
      }

      if (q.l2q) {
        lines.push('#### Level II Stretch');
        lines.push('');
        lines.push('**Q:** ' + strip(q.l2q));
        lines.push('');
        lines.push(strip(q.l2a));
        lines.push('');
      }

      if (q.l3q) {
        lines.push('#### Level III Stretch');
        lines.push('');
        lines.push('**Q:** ' + strip(q.l3q));
        lines.push('');
        lines.push(strip(q.l3a));
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    });
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'qbank-level1-' + new Date().toISOString().slice(0, 10) + '.md';
  a.click();
}

function renderQBTrackBar() {
  const bar = document.getElementById('qb-track-bar'); if(!bar) return;
  bar.innerHTML='';
  Object.entries(QBANK_L1).forEach(([key,track]) => {
    const c=qbCounts(key);
    const btn=document.createElement('button');
    btn.className=`qb-track-btn${key===qbTrack?' active':''}`;
    btn.innerHTML=`${track.icon} ${track.short} <span class="qb-track-count">${c.mastered}/${c.total}</span>`;
    btn.addEventListener('click',()=>{ qbTrack=key;qbIdx=0;qbRev=false;qbDetail=false;qbFuRev=false;qbSavePos();renderQBTrackBar();renderQBCard(); });
    bar.appendChild(btn);
  });
  /* Export button */
  const exportBtn = document.createElement('button');
  exportBtn.className = 'qb-export-btn';
  exportBtn.textContent = '\u2193 Export MD';
  exportBtn.title = 'Download all questions as Markdown';
  exportBtn.addEventListener('click', exportQBankMarkdown);
  bar.appendChild(exportBtn);
}

function renderQBProgress() {
  const el=document.getElementById('qb-progress-wrap'); if(!el) return;
  const c=qbCounts(qbTrack), pct=c.total?Math.round(c.mastered/c.total*100):0;
  const reviewHint=c.review>0?` · <span style="color:var(--mle)">${c.review} to review</span>`:'';
  el.innerHTML=`<div class="qb-prog-track"><div class="qb-prog-fill" style="width:${pct}%"></div></div>
    <span class="qb-prog-text">${c.mastered}/${c.total} mastered${reviewHint}</span>`;
}

function renderQBCard() {
  const card=document.getElementById('qb-card'); if(!card) return;
  const track=QBANK_L1[qbTrack], q=track.questions[qbIdx];
  const st=qbGetSt(q.id), total=track.questions.length;
  renderQBProgress();
  const statusChip = st==='mastered'
    ? `<span class="qb-status-chip mastered">✓ mastered</span>`
    : st==='review' ? `<span class="qb-status-chip review">↺ review</span>` : '';

  card.innerHTML=`
    <div class="qb-card-header">
      <span class="qb-track-badge qb-color-${track.color}">${track.icon} ${track.short}</span>
      <span class="qb-q-num">Q ${qbIdx+1} <span class="qb-of">of ${total}</span></span>
      ${statusChip}
    </div>
    <div class="qb-question">${q.q}</div>
    <div class="qb-anchor"><span class="qb-anchor-icon">💡</span><span>${q.anchor}</span></div>
    <div id="qb-reveal-row" class="qb-reveal-row">
      <button id="qb-reveal-btn" class="qb-reveal-btn">▶ Reveal Answer</button>
      <span class="qb-hint">Space · ← → · M mastered · R review</span>
    </div>
    <div id="qb-answer" class="qb-answer-body" style="display:none">
      <div class="qb-section-label">Compressed Answer</div>
      <div class="qb-compressed">${q.compressed}</div>
      <button id="qb-detail-toggle" class="qb-detail-toggle">+ Full detail</button>
      <div id="qb-detail" style="display:none">
        <div class="qb-section-label">Detailed Answer</div>
        <div class="qb-detail-text">${q.detail}</div>
      </div>
      <div class="qb-meta-row">
        <div class="qb-meta-card followup">
          <div class="qb-meta-label">Follow-up</div>
          <div class="qb-meta-text qb-fu-q">${q.followup}</div>
          <button class="qb-fu-reveal-btn" id="qb-fu-reveal">▸ Show answer</button>
          <div class="qb-fu-answer" id="qb-fu-answer" style="display:none">${q.followupAnswer}</div>
        </div>
        <div class="qb-meta-card tie">
          <div class="qb-meta-label">Project tie-in</div>
          <div class="qb-meta-text">${q.tie}</div>
        </div>
      </div>
      <div class="qb-trap"><span class="qb-trap-label">⚠ Avoid</span>${q.trap}</div>
      ${q.l2q ? `
      <div class="qb-stretch qb-stretch-2">
        <div class="qb-stretch-header">
          <span class="qb-stretch-label">Level 2 stretch</span>
          <span class="qb-stretch-q">${q.l2q}</span>
        </div>
        <button class="qb-fu-reveal-btn qb-l2-btn" id="qb-l2-reveal">▸ Show answer</button>
        <div class="qb-stretch-answer" id="qb-l2-answer" style="display:none">${q.l2a}</div>
      </div>` : ''}
      ${q.l3q ? `
      <div class="qb-stretch qb-stretch-3">
        <div class="qb-stretch-header">
          <span class="qb-stretch-label">Level 3 stretch</span>
          <span class="qb-stretch-q">${q.l3q}</span>
        </div>
        <button class="qb-fu-reveal-btn qb-l3-btn" id="qb-l3-reveal">▸ Show answer</button>
        <div class="qb-stretch-answer" id="qb-l3-answer" style="display:none">${q.l3a}</div>
      </div>` : ''}
    </div>
    <div class="qb-nav-row">
      <button class="qb-nav-btn" id="qb-prev" ${qbIdx===0?'disabled':''}>← Prev</button>
      <div class="qb-status-btns">
        <button class="qb-status-btn review${st==='review'?' active':''}" id="qb-review-btn">↺ Review</button>
        <button class="qb-status-btn mastered${st==='mastered'?' active':''}" id="qb-mastered-btn">✓ Mastered</button>
      </div>
      <button class="qb-nav-btn" id="qb-next" ${qbIdx===total-1?'disabled':''}>Next →</button>
    </div>`;

  document.getElementById('qb-reveal-btn')?.addEventListener('click', qbReveal);
  document.getElementById('qb-detail-toggle')?.addEventListener('click', () => {
    qbDetail=!qbDetail;
    document.getElementById('qb-detail').style.display=qbDetail?'':'none';
    document.getElementById('qb-detail-toggle').textContent=qbDetail?'− Hide full detail':'+ Full detail';
  });
  document.getElementById('qb-fu-reveal')?.addEventListener('click', () => {
    qbFuRev=true;
    document.getElementById('qb-fu-answer').style.display='';
    document.getElementById('qb-fu-reveal').style.display='none';
  });
  document.getElementById('qb-l2-reveal')?.addEventListener('click', () => {
    document.getElementById('qb-l2-answer').style.display='';
    document.getElementById('qb-l2-reveal').style.display='none';
  });
  document.getElementById('qb-l3-reveal')?.addEventListener('click', () => {
    document.getElementById('qb-l3-answer').style.display='';
    document.getElementById('qb-l3-reveal').style.display='none';
  });
  document.getElementById('qb-prev')?.addEventListener('click', () => { if(qbIdx>0){qbIdx--;qbRev=false;qbDetail=false;qbFuRev=false;qbSavePos();renderQBCard();} });
  document.getElementById('qb-next')?.addEventListener('click', () => { if(qbIdx<total-1){qbIdx++;qbRev=false;qbDetail=false;qbFuRev=false;qbSavePos();renderQBCard();} });

  const markStatus = (s) => {
    qbSetSt(q.id, qbGetSt(q.id)===s?null:s);
    // Auto-advance to next question after marking (unless on last)
    if (qbIdx < total - 1) { qbIdx++; qbRev=false; qbDetail=false; qbFuRev=false; }
    qbSavePos();
    renderQBCard();
    renderQBTrackBar();
  };
  document.getElementById('qb-mastered-btn')?.addEventListener('click', ()=>markStatus('mastered'));
  document.getElementById('qb-review-btn')?.addEventListener('click', ()=>markStatus('review'));

  if(qbRev) qbReveal(true);
}

function qbReveal(silent) {
  qbRev=true;
  document.getElementById('qb-answer').style.display='';
  document.getElementById('qb-reveal-row').style.display='none';
  if(qbDetail){ document.getElementById('qb-detail').style.display=''; }
  if(qbFuRev){ document.getElementById('qb-fu-answer').style.display=''; document.getElementById('qb-fu-reveal').style.display='none'; }
}

function buildQuestionBank() {
  const tab=document.getElementById('tab-qbank'); if(!tab) return;
  tab.innerHTML=`
    <div class="qb-title-row">
      <span class="section-title" style="margin-bottom:0">Interview Question Bank</span>
      <span class="qb-level-badge">Level I · Foundations · 82 Questions</span>
    </div>
    <div id="qb-track-bar" class="qb-track-bar"></div>
    <div id="qb-progress-wrap" class="qb-progress-wrap"></div>
    <div id="qb-card" class="qb-card"></div>`;

  document.addEventListener('keydown', e => {
    if(!document.getElementById('tab-qbank')?.classList.contains('active')) return;
    if(e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT') return;
    const track=QBANK_L1[qbTrack], q=track.questions[qbIdx];
    if(e.key==='ArrowLeft')  { e.preventDefault(); if(qbIdx>0){qbIdx--;qbRev=false;qbDetail=false;qbFuRev=false;qbSavePos();renderQBCard();} }
    else if(e.key==='ArrowRight'||e.key==='Enter') { e.preventDefault(); if(qbIdx<track.questions.length-1){qbIdx++;qbRev=false;qbDetail=false;qbFuRev=false;qbSavePos();renderQBCard();} }
    else if(e.key===' '&&!qbRev) { e.preventDefault(); qbReveal(); }
    else if(e.key==='m'||e.key==='M') { qbSetSt(q.id,qbGetSt(q.id)==='mastered'?null:'mastered'); if(qbIdx<track.questions.length-1){qbIdx++;qbRev=false;qbDetail=false;qbFuRev=false;} qbSavePos(); renderQBCard();renderQBTrackBar(); }
    else if(e.key==='r'||e.key==='R') { qbSetSt(q.id,qbGetSt(q.id)==='review'?null:'review'); if(qbIdx<track.questions.length-1){qbIdx++;qbRev=false;qbDetail=false;qbFuRev=false;} qbSavePos(); renderQBCard();renderQBTrackBar(); }
  });

  qbRestorePos();
  renderQBTrackBar();
  renderQBCard();
}

if(document.readyState==='loading') {
  document.addEventListener('DOMContentLoaded', buildQuestionBank);
} else {
  buildQuestionBank();
}


/* ══════════════════════════════════════════════════════
   RUBRIC — Technical Competency Scoring System v1.5
══════════════════════════════════════════════════════ */

const RUBRIC_VERSION = '1.10';
const RUBRIC_LOG_KEY = 'rubric-log-v1';

/* ── REFERENCE DATA ─────────────────────────────────── */
const RD = {

  taskTypes: [
    { id: 'coding',      label: 'Coding',                 color: 'var(--rag)' },
    { id: 'debugging',   label: 'Debugging',              color: 'var(--audit)' },
    { id: 'knowledge',   label: 'Technical Knowledge',    color: 'var(--sql)' },
    { id: 'sysdesign',   label: 'System Design',          color: 'var(--react)' },
    { id: 'prodeng',     label: 'Production Engineering', color: 'var(--infra)' },
    { id: 'walkthrough', label: 'Project Walkthrough',    color: 'var(--java)' },
    { id: 'behavioral',  label: 'Behavioral Technical',   color: 'var(--mle)' }
  ],

  /* §7 Universal competency dimensions */
  universalDims: [
    { id: 'correctness',   label: 'Correctness and factual accuracy',    short: 'Correct', max: 25 },
    { id: 'reasoning',     label: 'Reasoning and decomposition',         short: 'Reason',  max: 20 },
    { id: 'judgment',      label: 'Technical judgment and tradeoffs',    short: 'Judge',   max: 15 },
    { id: 'validation',    label: 'Validation and evidence',             short: 'Valid',   max: 15 },
    { id: 'communication', label: 'Communication and explanation',       short: 'Comm',    max: 15 },
    { id: 'completeness',  label: 'Completeness and execution quality',  short: 'Compl',   max: 10 }
  ],

  /* §3 Level definitions */
  levels: [
    {
      id: 'L1', label: 'Level I', subtitle: 'Scoped Contributor',
      scope: 'Functions, small components, routine defects, clearly defined requirements.',
      standard: 'Completes bounded work using established patterns; explains fundamentals; writes basic tests; recovers with guidance.',
      difficultyRange: 'D1–D3', maxAssistance: 3
    },
    {
      id: 'L2', label: 'Level II', subtitle: 'Independent Owner',
      scope: 'Cross-file features, service boundaries, multi-layer defects, incomplete requirements.',
      standard: 'Owns a feature, service component, investigation, or technical workflow independently; makes sound tradeoffs and handles operational concerns.',
      difficultyRange: 'D3–D4', maxAssistance: 2
    },
    {
      id: 'L3', label: 'Level III', subtitle: 'Senior Technical Owner',
      scope: 'Architecture, lifecycle/state failures, reliability, migrations, cross-team or system-wide consequences.',
      standard: 'Owns ambiguous, high-impact problems; anticipates system-wide consequences; defines reusable standards and improves others\u2019 effectiveness.',
      difficultyRange: 'D4–D5', maxAssistance: 1
    }
  ],

  /* §3.2 Level-specific scoring lenses */
  scoringLenses: [
    { level: 'Level I',   lens: 'Correctness; fundamental concept or implementation; direct relevance; basic edge cases; readable explanation; basic verification.' },
    { level: 'Level II',  lens: 'Independent decomposition; mechanism-level reasoning; meaningful tradeoffs; cross-component effects; failure handling; strong tests/evidence; operational judgment.' },
    { level: 'Level III', lens: 'Ambiguity resolution; system-wide consequences; risk and blast radius; alternatives and evolution path; prevention/standards; long-term maintainability; guidance of others.' }
  ],

  /* §4 Mandatory gates */
  gates: [
    { gate: 'Correctness',             req: 'The central answer or implementation is substantially correct.' },
    { gate: 'Relevance',               req: 'The response solves the problem actually asked.' },
    { gate: 'Independent explanation', req: 'The candidate can explain the work without relying on generated wording.' },
    { gate: 'Evidence',                req: 'Claims are supported by tests, direct reproduction, or observable behavior.' },
    { gate: 'Safety and integrity',    req: 'No fabricated tests, results, ownership, or certainty.' },
    { gate: 'Completion',              req: 'The response reaches a usable conclusion or deliverable.' }
  ],

  /* §6 Difficulty */
  difficulty: [
    { d: 1, label: 'Direct',                    desc: 'Single-step, local, obvious failure; accurate failing test; minimal ambiguity.', level: 'Early Level I' },
    { d: 2, label: 'Local reasoning',            desc: 'Bounded component; straightforward reproduction; logic understanding required; local fix.', level: 'Level I' },
    { d: 3, label: 'Bounded semantic/policy',    desc: 'Code may run; output violates intended meaning or policy; weak semantic tests; bounded root cause.', level: 'Strong Level I / Level II' },
    { d: 4, label: 'Multi-layer contract',       desc: 'Crosses layers or data grains; producer/consumer assumptions disagree; tests may share the mistake.', level: 'Level II' },
    { d: 5, label: 'Hidden state/lifecycle',     desc: 'Plausible success; sequence, cache, fallback, retry, stale state, or provenance hides the defect.', level: 'Strong Level II / Level III' }
  ],

  /* §6.1 Difficulty attribute matrix */
  difficultyAttributes: [
    { dim: 'Scope',              v0: 'One function',          v1: 'Multiple files',          v2: 'Multiple layers/services' },
    { dim: 'Observability',      v0: 'Immediate failure',     v1: 'Clearly wrong output',    v2: 'Plausible successful output' },
    { dim: 'Reproduction',       v0: 'Direct',                v1: 'Special input',           v2: 'Sequence/state dependent' },
    { dim: 'Test quality',       v0: 'Accurate failing test', v1: 'Missing/incomplete test', v2: 'Misleading green test' },
    { dim: 'Root-cause distance',v0: 'Same line/function',    v1: 'Different component',     v2: 'Far from symptom' },
    { dim: 'Contract complexity',v0: 'Local behavior',        v1: 'One interface',           v2: 'Multiple contracts/invariants' },
    { dim: 'Fix coordination',   v0: 'Local edit',            v1: 'Code plus tests',         v2: 'Multi-layer/state-safe change' },
    { dim: 'False-lead density', v0: 'Low',                   v1: 'Moderate',                v2: 'Several plausible causes' }
  ],
  difficultyThresholds: [ {range:'0–2',d:1},{range:'3–5',d:2},{range:'6–8',d:3},{range:'9–12',d:4},{range:'13–16',d:5} ],

  /* §7 Universal competency score bands (per dimension) */
  universal: [
    { name: 'Correctness and factual accuracy',    weight: 25, bands: [
      { range: '23–25', std: 'Correct throughout; no meaningful defects' },
      { range: '19–22', std: 'Correct core answer with minor mistakes' },
      { range: '14–18', std: 'Partially correct; one material defect or omission' },
      { range: '8–13',  std: 'Major flaws despite some correct concepts' },
      { range: '0–7',   std: 'Incorrect, irrelevant, or unusable' }
    ]},
    { name: 'Reasoning and decomposition',         weight: 20, bands: [
      { range: '18–20', std: 'Breaks problem into correct components and handles dependencies' },
      { range: '15–17', std: 'Sound reasoning with minor gaps' },
      { range: '11–14', std: 'Understandable approach but incomplete structure' },
      { range: '6–10',  std: 'Jumps to conclusions or relies on weak assumptions' },
      { range: '0–5',   std: 'No coherent reasoning process' }
    ]},
    { name: 'Technical judgment and tradeoffs',    weight: 15, bands: [
      { range: '14–15', std: 'Identifies realistic alternatives and chooses deliberately' },
      { range: '11–13', std: 'Makes a sound choice and names important tradeoffs' },
      { range: '8–10',  std: 'Choice is acceptable but tradeoff analysis is shallow' },
      { range: '4–7',   std: 'Uses patterns mechanically without understanding implications' },
      { range: '0–3',   std: 'Poor or dangerous technical judgment' }
    ]},
    { name: 'Validation and evidence',             weight: 15, bands: [
      { range: '14–15', std: 'Verifies behavior directly and uses strong evidence' },
      { range: '11–13', std: 'Good validation with minor missing checks' },
      { range: '8–10',  std: 'Some testing or evidence, but important gaps remain' },
      { range: '4–7',   std: 'Relies primarily on assumption or intuition' },
      { range: '0–3',   std: 'Makes unsupported claims or ignores contradictory evidence' }
    ]},
    { name: 'Communication and explanation',       weight: 15, bands: [
      { range: '14–15', std: 'Precise, structured, concise, and technically defensible' },
      { range: '11–13', std: 'Clear and mostly complete' },
      { range: '8–10',  std: 'Understandable but vague, disorganized, or overly long' },
      { range: '4–7',   std: 'Difficult to follow or unable to explain key mechanisms' },
      { range: '0–3',   std: 'Explanation materially misrepresents the solution' }
    ]},
    { name: 'Completeness and execution quality',  weight: 10, bands: [
      { range: '9–10', std: 'Fully completes the task and addresses important edge conditions' },
      { range: '7–8',  std: 'Complete core solution with minor omissions' },
      { range: '5–6',  std: 'Usable but incomplete' },
      { range: '2–4',  std: 'Stops before a reliable conclusion' },
      { range: '0–1',  std: 'No usable deliverable' }
    ]}
  ],

  /* §8 Task-specific rubrics */
  taskRubrics: [
    {
      id: 'coding', label: 'Coding',
      categories: [
        { name: 'Functional correctness',          weight: 35 },
        { name: 'Algorithm/data-structure choice', weight: 20 },
        { name: 'Complexity analysis',             weight: 15 },
        { name: 'Edge cases',                      weight: 15 },
        { name: 'Code quality',                    weight: 10 },
        { name: 'Verification',                    weight: 5  }
      ]
    },
    {
      id: 'debugging', label: 'Debugging',
      categories: [
        { name: 'Reproduction and problem definition', weight: 10 },
        { name: 'Dependency-chain inspection',         weight: 15 },
        { name: 'Hypothesis quality',                  weight: 15 },
        { name: 'Evidence and falsification',          weight: 20 },
        { name: 'Root-cause accuracy',                 weight: 20 },
        { name: 'Contract-level fix',                  weight: 15 },
        { name: 'Regression prevention',               weight: 5  }
      ]
    },
    {
      id: 'knowledge', label: 'Technical Knowledge',
      categories: [
        { name: 'Conceptual accuracy',            weight: 30 },
        { name: 'Mechanism-level explanation',    weight: 25 },
        { name: 'Application to a real scenario', weight: 20 },
        { name: 'Tradeoffs and limitations',      weight: 15 },
        { name: 'Clarity and precision',          weight: 10 }
      ]
    },
    {
      id: 'sysdesign', label: 'System Design',
      categories: [
        { name: 'Requirements and assumptions',     weight: 15 },
        { name: 'Architecture and boundaries',      weight: 20 },
        { name: 'Data model and contracts',         weight: 15 },
        { name: 'Scalability and performance',      weight: 15 },
        { name: 'Reliability and failure handling', weight: 15 },
        { name: 'Security and operations',          weight: 10 },
        { name: 'Tradeoffs and evolution path',     weight: 10 }
      ]
    },
    {
      id: 'prodeng', label: 'Production Engineering',
      categories: [
        { name: 'Architecture and boundaries',        weight: 15 },
        { name: 'Testing strategy',                   weight: 15 },
        { name: 'Error handling and resilience',      weight: 15 },
        { name: 'Observability and diagnostics',      weight: 15 },
        { name: 'Deployment and reproducibility',     weight: 10 },
        { name: 'Data and migration safety',          weight: 10 },
        { name: 'Security and configuration',         weight: 10 },
        { name: 'Documentation and maintainability',  weight: 10 }
      ]
    },
    {
      id: 'walkthrough', label: 'Project Walkthrough',
      categories: [
        { name: 'Problem and user value',                  weight: 15 },
        { name: 'Architecture explanation',                weight: 20 },
        { name: 'Personal ownership',                      weight: 20 },
        { name: 'Design decisions and alternatives',       weight: 15 },
        { name: 'Failure and learning examples',           weight: 15 },
        { name: 'Production limitations and next steps',   weight: 15 }
      ],
      note: 'Candidate must distinguish what they personally implemented vs. generated/inherited/adapted. Inflated ownership claims \u2192 severe penalty.'
    },
    {
      id: 'behavioral', label: 'Behavioral Technical',
      categories: [
        { name: 'Situation, stakes, and technical context',           weight: 10 },
        { name: 'Personal ownership and scope',                       weight: 20 },
        { name: 'Actions, decisions, and technical judgment',         weight: 20 },
        { name: 'Technical mechanism and problem-solving depth',      weight: 15 },
        { name: 'Collaboration, disagreement, and stakeholder work',  weight: 15 },
        { name: 'Results, evidence, and measurable impact',           weight: 10 },
        { name: 'Reflection, learning, and recurrence prevention',    weight: 10 }
      ],
      note: 'Scored on whether the candidate establishes what happened, separates personal ownership, explains technical and interpersonal decisions, supports results with evidence, and shows learning. Not scored as presentation polish or generic likability.'
    }
  ],

  /* §9 Domain and role evidence model */
  domainGroups: [
    {
      group: 'Languages',
      domains: ['Java','Python','TypeScript','SQL']
    },
    {
      group: 'Frameworks & Platforms',
      domains: ['Spring Boot','React','AWS','Docker/CI/CD','Databases']
    },
    {
      group: 'Core Engineering',
      domains: ['Algorithms/DSA','Backend/API Engineering','Frontend Engineering','Distributed Systems','Observability/Reliability']
    },
    {
      group: 'Data & AI',
      domains: ['Data Modeling','Data Engineering','Statistical Analysis','Machine Learning','Retrieval/RAG','Evaluation/Experimentation']
    }
  ],

  domainSubcompetencies: [
    { domain: 'Java',             subs: 'Syntax/control flow; OOP; interfaces; collections/generics; exceptions; streams/lambdas; concurrency; testing; JVM concepts; DSA fluency' },
    { domain: 'Spring Boot',      subs: 'Controllers/HTTP; DTOs/validation; services; dependency injection; error translation; configuration; integration testing; persistence/migrations; security; observability' },
    { domain: 'TypeScript',       subs: 'Type fundamentals; narrowing; generics; unions; nullability; async/error typing; API contracts; strict-mode fluency' },
    { domain: 'React',            subs: 'Components; props/state; forms; async server state; rendering; hooks; loading/error states; accessibility; testing; performance' },
    { domain: 'Python',           subs: 'Core language; data structures; typing; exceptions; modules/packages; testing; data processing; APIs; concurrency; performance; reliability' },
    { domain: 'Machine Learning', subs: 'Problem formulation; feature/target design; baselines; validation; leakage; metrics; error analysis; reproducibility; monitoring; deployment implications' },
    { domain: 'Retrieval/RAG',    subs: 'Ingestion; chunking; retrieval; embeddings; ranking/hybrid; evaluation; structured output; refusal/grounding; human review; serving; cost/latency; monitoring' },
    { domain: 'Data Engineering', subs: 'Data modeling/grain; pipelines; data quality; SQL; reliability/idempotency; orchestration; scale/performance; lineage/provenance' }
  ],

  roles: [
    { id: 'SWE', label: 'SWE',
      weights: 'Implementation/code quality 20; Debugging 20; System/API design 15; Testing 15; Reliability/operations 15; Data/persistence 5; Communication/ownership 10' },
    { id: 'MLE', label: 'MLE',
      weights: 'Software engineering 20; ML implementation 15; Data/feature pipelines 15; Evaluation 15; Serving 10; Reliability/monitoring 10; Reproducibility 10; Communication 5' },
    { id: 'DS',  label: 'DS',
      weights: 'Problem formulation 15; Statistical reasoning 20; Data preparation/EDA 15; Modeling 15; Validation/error analysis 15; Experimentation/metrics 10; Communication/business interpretation 10' },
    { id: 'DE',  label: 'DE',
      weights: 'Data modeling/grain 15; Pipeline implementation 20; Data quality 15; SQL/query reasoning 15; Reliability/idempotency 15; Orchestration/operations 10; Scale/performance 5; Communication 5' }
  ],

  domainContributionWeights: [
    { role: 'Primary technical domain',          pct: '60%' },
    { role: 'First secondary technical domain',  pct: '25%' },
    { role: 'Second secondary technical domain', pct: '15%' },
    { role: 'Primary role',                      pct: '70%' },
    { role: 'Secondary role',                    pct: '20%' },
    { role: 'Tertiary role',                     pct: '10%' }
  ],

  /* §10 Retrospective evidence classes */
  evidenceClasses: [
    { id: 'prospective', label: 'Prospective controlled', weight: 1.00,
      desc: 'Difficulty precommitted; prompt, answer, assistance, tests, and expected behavior captured.' },
    { id: 'classA', label: 'Class A — Strong retrospective', weight: 0.75,
      desc: 'Complete prompt/answer/code, observable outputs, reconstructable assistance and expected behavior.' },
    { id: 'classB', label: 'Class B — Partial retrospective', weight: 0.40,
      desc: 'Answer exists, but testing, autonomy, or difficulty evidence is incomplete.' },
    { id: 'classC', label: 'Class C — Anecdotal', weight: 0.00,
      desc: 'Only summary claims or project bullets remain; not numerically scorable.' }
  ],

  /* §11 Multi-bug exercise */
  bugCompletionStandards: [
    { evidence: 'Symptom only',                                              maxCredit: '20%' },
    { evidence: 'Affected area only',                                        maxCredit: '40%' },
    { evidence: 'Exact root cause, incomplete fix',                          maxCredit: '70%' },
    { evidence: 'Correct fix without explanation',                           maxCredit: '75%' },
    { evidence: 'Root cause, invariant, source-level fix, regression proof', maxCredit: '100%' }
  ],
  difficultyMultipliers: [
    { d: 1, mult: 0.75 }, { d: 2, mult: 0.90 }, { d: 3, mult: 1.00 },
    { d: 4, mult: 1.25 }, { d: 5, mult: 1.50 }
  ],

  /* §12 Assistance */
  assistance: [
    { lvl: 0, desc: 'None',                                      autonomy: 'Full autonomy evidence' },
    { lvl: 1, desc: 'Task clarification only',                   autonomy: 'Full autonomy evidence' },
    { lvl: 2, desc: 'General directional hint',                  autonomy: 'Reduces autonomy confidence' },
    { lvl: 3, desc: 'Relevant subsystem identified',             autonomy: 'Cannot establish clean Level II independence' },
    { lvl: 4, desc: 'Affected file or contract identified',      autonomy: 'Cannot establish independent competency' },
    { lvl: 5, desc: 'Root cause or fix substantially revealed',  autonomy: 'Cannot establish independent competency' }
  ],

  /* §13 Caps */
  caps: [
    { condition: 'Correct result with materially wrong reasoning',       max: '65' },
    { condition: 'Correct code with no meaningful explanation',          max: '70' },
    { condition: 'Cannot reproduce or explain submitted code',           max: '60' },
    { condition: 'Claims testing without evidence',                      max: '55' },
    { condition: 'Debugging fix without reproduction',                   max: '70' },
    { condition: 'Debugging conclusion unsupported by evidence',         max: '60' },
    { condition: 'Symptom fix preserving root cause',                    max: '65' },
    { condition: 'Changes tests to accept wrong behavior',               max: '50' },
    { condition: 'System design omits failure handling',                 max: '70 at Level II; 60 at Level III' },
    { condition: 'Production work has no test strategy',                 max: '65' },
    { condition: 'Confident materially false claim',                     max: '50' },
    { condition: 'Fabricated results, tests, ownership, or experience',  max: '0\u201340' }
  ],

  /* §13 Penalties */
  penalties: [
    { deficiency: 'Minor factual error',                            penalty: '\u22122 to \u22125' },
    { deficiency: 'Material factual error',                         penalty: '\u22126 to \u221215' },
    { deficiency: 'Missed important edge case',                     penalty: '\u22123 to \u22128' },
    { deficiency: 'Vague tradeoff language',                        penalty: '\u22122 to \u22126' },
    { deficiency: 'Excessive prompting required',                   penalty: '\u22123 to \u221215' },
    { deficiency: 'Continues disproved debugging theory',           penalty: '\u22125 to \u221210' },
    { deficiency: 'Edits before reproducing',                       penalty: '\u22123 to \u22128' },
    { deficiency: 'Broad speculative refactor',                     penalty: '\u22125 to \u221215' },
    { deficiency: 'Counts unrelated technical debt as a seeded bug',penalty: '\u22125' },
    { deficiency: 'Breaks unrelated behavior',                      penalty: '\u221210 to \u221225' }
  ],

  /* §14 Demonstrated-level rules */
  levelRules: [
    { level: 'Level I',   pattern: 'Passing D1\u2013D3 work; bounded implementation/debugging; basic explanation and verification; some guidance acceptable.' },
    { level: 'Level II',  pattern: 'Passing D3\u2013D4 work; independent multi-file or multi-layer reasoning; contract understanding; meaningful tests; assistance \u22642.' },
    { level: 'Level III', pattern: 'Strong D4\u2013D5 work; ambiguous system-level reasoning; lifecycle/provenance/reliability judgment; blast-radius analysis; assistance \u22641.' }
  ],

  /* §15 Score bands */
  scoreBands: [
    { range: '90\u2013100', verdict: 'Exceptional',  cls: 'verdict-exceptional', min: 90 },
    { range: '80\u201389',  verdict: 'Strong pass',  cls: 'verdict-pass',        min: 80 },
    { range: '70\u201379',  verdict: 'Pass',          cls: 'verdict-pass',        min: 70 },
    { range: '60\u201369',  verdict: 'Borderline',    cls: 'verdict-border',      min: 60 },
    { range: '50\u201359',  verdict: 'Fail',          cls: 'verdict-fail',        min: 50 },
    { range: '<50',         verdict: 'Clear fail',    cls: 'verdict-fail',        min: 0  }
  ],

  demonstratedLevels: [
    'Below Level I','Emerging Level I','Level I','Strong Level I',
    'Level II','Strong Level II','Level III','Strong Level III'
  ],

  weaknessTags: [
    'Mechanism gap','Thin tradeoff analysis','Incomplete execution',
    'Insufficient evidence','Incorrect reasoning','Confident false claim',
    'Terminology imprecision','Scope boundary missed','Failure handling gap',
    'Validation gap','Edge-case gap','Complexity analysis missing',
    'Overprompted answer','Ownership unclear','Application gap',
    'Interview phrasing gap','Definition gap','Implementation detail gap'
  ],

  /* v1.10 attempt types */
  attemptTypes: [
    'initial','retry','assisted_retry','post_coaching_retry',
    'final_retry','retention_retest','session_parent','rollup'
  ],

  /* v1.10 assessment outcomes */
  assessmentOutcomes: ['Demonstrated','Partial discovery','Concept discovery'],

  /* v1.10 coverage statuses */
  coverageStatuses: ['included','excluded','suspected_missing','duplicate_linked','rollup_only'],

  /* §19 Grading principles */
  gradingPrinciples: [
    'Grade demonstrated behavior, not potential.',
    'Do not award points for effort.',
    'Do not reward terminology without mechanism.',
    'Do not assume missing evidence is favorable.',
    'Honest uncertainty is better than confident error.',
    'A correct answer does not prove sound reasoning.',
    'Passing tests do not prove the tests are meaningful.',
    'Project size does not prove ownership.',
    'Career transition does not lower the bar.',
    'Difficulty is assigned before performance whenever possible.',
    'A difficult task solved with heavy assistance does not prove independence.',
    'A simple task cannot establish seniority by itself.',
    'Stop pursuing disproved theories immediately.',
    'Prefer contract-level fixes over symptom patches.',
    'Always report all three level scores for every answer.',
    'Do not average the Level I, Level II, and Level III scores.',
    'Do not let a low-level problem establish higher-level readiness.',
    'Use the problem level to cap qualifying evidence, not to suppress developmental scoring.',
    'Version rubric changes explicitly.'
  ],

  /* §20 Promotion evidence standard (unchanged from v1.0 structure) */
  promotionEvidence: {
    L1: [
      { type: 'coding',      min: 3, label: 'Coding / implementation tasks' },
      { type: 'debugging',   min: 2, label: 'Debugging tasks' },
      { type: 'knowledge',   min: 3, label: 'Technical explanations' },
      { type: 'walkthrough', min: 1, label: 'Project or feature walkthrough' }
    ],
    L2: [
      { type: 'coding',     min: 3, label: 'Independent feature / medium-complexity coding', maxAssist: 2 },
      { type: 'debugging',  min: 3, label: 'Cross-file / cross-component debugging',         maxAssist: 2 },
      { type: 'sysdesign',  min: 2, label: 'System design exercises' },
      { type: 'walkthrough',min: 1, label: 'Production-shaped project walkthrough' }
    ],
    L3: [
      { type: 'prodeng',    min: 3, label: 'Ambiguous system or production investigations', minDiff: 4 },
      { type: 'sysdesign',  min: 3, label: 'System design at Difficulty 4 or 5',            minDiff: 4 },
      { type: 'walkthrough',min: 1, label: 'Architecture / reliability / migration judgment' },
      { type: 'behavioral', min: 1, label: 'Evidence of improving others or defining reusable standards' }
    ]
  }
};

/* ── STORAGE ─────────────────────────────────────────── */
function rLog()  { try { return JSON.parse(localStorage.getItem(RUBRIC_LOG_KEY) || '[]'); } catch { return []; } }
function rSave(e) {
  localStorage.setItem(RUBRIC_LOG_KEY, JSON.stringify(e));
  window.dispatchEvent(new CustomEvent('rubric-updated'));
}

function rComputeRaw(u, t) { return +(u * 0.60 + t * 0.40).toFixed(1); }
function rComputeFinal(raw, cap, pen) {
  let f = raw - (parseFloat(pen) || 0);
  if (cap !== '' && cap !== null && cap !== undefined && !isNaN(parseFloat(cap))) f = Math.min(f, parseFloat(cap));
  return +Math.max(0, f).toFixed(1);
}
function rScoreBand(score) {
  return RD.scoreBands.find(b => score >= b.min) || RD.scoreBands[RD.scoreBands.length - 1];
}
function rTaskColor(id) { return (RD.taskTypes.find(t => t.id === id) || {}).color || 'var(--text-dim)'; }
function rTaskLabel(id) { return (RD.taskTypes.find(t => t.id === id) || {}).label || id; }
function rEvidenceWeight(entry) {
  const cls = entry.evidenceClass || 'prospective';
  const ec = RD.evidenceClasses.find(e => e.id === cls);
  return ec ? ec.weight : 1.0;
}

/* Normalize sub-scores to 0-100% */
function rSubPct(subScores) {
  return RD.universalDims.map(d => {
    const v = subScores?.[d.id];
    return (v !== null && v !== undefined && v !== '') ? Math.round((parseFloat(v) / d.max) * 100) : null;
  });
}
function rSubTotal(subScores) {
  if (!subScores) return null;
  const vals = RD.universalDims.map(d => parseFloat(subScores[d.id]));
  return vals.some(isNaN) ? null : +vals.reduce((s, v) => s + v, 0).toFixed(1);
}
function rAvgSubPct(entries) {
  const w = entries.filter(e => e.universalSubScores && rSubTotal(e.universalSubScores) !== null);
  if (!w.length) return null;
  const totals = Array(RD.universalDims.length).fill(0);
  w.forEach(e => { rSubPct(e.universalSubScores).forEach((p, i) => { totals[i] += (p ?? 0); }); });
  return totals.map(t => Math.round(t / w.length));
}

/* §20.1 Entry normaliser — v1.5 field set */
function rNormaliseEntry(raw) {
  const id = raw.id || (Date.now() + '-' + Math.random().toString(36).slice(2, 6));
  const subs = raw.universalSubScores || null;
  const subTotal = subs ? rSubTotal(subs) : null;
  const u = parseFloat(raw.universalScore) || (subTotal !== null && !raw.universalScore ? subTotal : 0);
  const t = parseFloat(raw.taskSpecificScore) || 0;
  const rawScore   = raw.rawScore   !== undefined ? raw.rawScore   : rComputeRaw(u, t);
  const finalScore = raw.finalScore !== undefined ? raw.finalScore : rComputeFinal(rawScore, raw.cap ?? null, raw.penalties ?? 0);
  return {
    /* Core */
    id, rubricVersion: raw.rubricVersion || RUBRIC_VERSION,
    date: raw.date || new Date().toISOString().slice(0, 10),
    task: raw.task || '', taskType: raw.taskType || '',
    domain: raw.domain || '',
    /* Classification */
    problemLevel:       raw.problemLevel    || raw.targetLevel || '',
    targetLevel:        raw.targetLevel     || raw.problemLevel || '',
    answerLevel:        raw.answerLevel     || '',
    difficulty:         parseInt(raw.difficulty) || 0,
    difficultyAssignment: raw.difficultyAssignment || '',
    difficultyAttributeScore: raw.difficultyAttributeScore ?? null,
    /* Evidence class */
    evidenceClass:      raw.evidenceClass   || 'prospective',
    autonomyConfidence: raw.autonomyConfidence || '',
    assistanceLevel:    parseInt(raw.assistanceLevel) ?? 0,
    /* Domains and roles */
    primaryDomain:      raw.primaryDomain   || raw.domain || '',
    secondaryDomains:   raw.secondaryDomains || [],
    primaryRole:        raw.primaryRole     || '',
    secondaryRoles:     raw.secondaryRoles  || [],
    /* Scores */
    universalScore: u, taskSpecificScore: t,
    rawScore, cap: raw.cap !== undefined ? raw.cap : null,
    penalties: raw.penalties || 0, finalScore,
    universalSubScores: subs,
    levelScores: raw.levelScores || { L1: null, L2: null, L3: null },
    /* Verdict */
    demonstratedLevel:           raw.demonstratedLevel            || '',
    qualifyingEvidenceNote:      raw.qualifyingEvidenceNote        || '',
    mainReasonNextLevelNotReached:raw.mainReasonNextLevelNotReached || '',
    surviveProbing:              raw.surviveProbing                || '',
    confidence:                  raw.confidence                   || '',
    /* Gates and tags */
    gates: raw.gates || {}, weaknessTags: raw.weaknessTags || [],
    strengths: raw.strengths || '', weaknesses: raw.weaknesses || '',
    nextTarget: raw.nextTarget || '',
    quickLog: raw.quickLog || false,

    /* §17 Diagnostic Progress Model — v1.9 */
    knowledgeGapTags:    raw.knowledgeGapTags    || [],
    gapTypes:            raw.gapTypes            || [],
    expectedElements:    raw.expectedElements    || [],
    presentElements:     raw.presentElements     || [],
    missingElements:     raw.missingElements     || [],
    elementSource:       raw.elementSource       || '',
    probeReadiness:      raw.probeReadiness      || null,
    evidenceSource:      Array.isArray(raw.evidenceSource) ? raw.evidenceSource : (raw.evidenceSource ? [raw.evidenceSource] : []),
    retention:           raw.retention           || null,
    llmIndependence:     raw.llmIndependence     || null,
    roleRequirementCoverage: raw.roleRequirementCoverage || null,
    artifactReadiness:   raw.artifactReadiness   || null,
    staleness:           raw.staleness           || null,
    gapClosureStatus:    raw.gapClosureStatus    || null,
    priority:            raw.priority            || null,
    gapImpact:           raw.gapImpact           || null,
    assessmentMode:      raw.assessmentMode      || null,
    calibration:         raw.calibration         || null,
    retestPlan:          raw.retestPlan          || null,
    roleReadinessRollup: raw.roleReadinessRollup || null,
    proofStrength:       raw.proofStrength       || null,
    antiInflationChecks: raw.antiInflationChecks || null,

    /* §17 Diagnostic Progress Model — v1.9.x */
    assessmentOutcome:   raw.assessmentOutcome  || null,
    conceptDiscovery:    raw.conceptDiscovery   || null,

    /* §16 Attempt tracking — v1.9.3+ */
    sessionId:           raw.sessionId          || null,
    parentAssessmentId:  raw.parentAssessmentId || null,
    attemptGroupId:      raw.attemptGroupId     || null,
    attemptNumber:       raw.attemptNumber      || null,
    attemptType:         raw.attemptType        || 'initial',
    priorAssessmentId:   raw.priorAssessmentId  || null,
    sourceFile:          raw.sourceFile         || null,
    sourceItemId:        raw.sourceItemId       || null,
    coverageStatus:      raw.coverageStatus     || null,
    secondaryTaskSignals:raw.secondaryTaskSignals || [],
    problemName:         raw.problemName        || null,
    platform:            raw.platform           || null,
    codingPattern:       raw.codingPattern      || null,
    primaryDataStructure:raw.primaryDataStructure || null,
    compileStatus:       raw.compileStatus      || null,
    testStatus:          raw.testStatus         || null,
    labelSetVersion:     raw.labelSetVersion    || null,
    proposedNewTags:     raw.proposedNewTags    || [],

    /* §17 Decision quality — v1.10 */
    calibrationAnchors:         raw.calibrationAnchors         || [],
    scoreUncertainty:           raw.scoreUncertainty           || null,
    gapRecurrence:              raw.gapRecurrence              || null,
    transferSignal:             raw.transferSignal             || null,
    retestQueue:                raw.retestQueue                || null,
    assessmentQuality:          raw.assessmentQuality          || null,
    roleReadinessEvidenceFloor: raw.roleReadinessEvidenceFloor || null,
    recoveryBehavior:           raw.recoveryBehavior           || null,
    scoreLiftActions:           raw.scoreLiftActions           || null,
    trackerHealth:              raw.trackerHealth              || null
  };
}

/* ── DOM HELPERS ─────────────────────────────────────── */
function rEl(tag, cls, inner) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (inner !== undefined) el.innerHTML = inner;
  return el;
}
function rTbl(headers, rows, cls) {
  const t = rEl('table', 'rt' + (cls ? ' ' + cls : ''));
  const thead = rEl('thead'), tr0 = rEl('tr');
  headers.forEach(h => tr0.appendChild(rEl('th', '', h)));
  thead.appendChild(tr0); t.appendChild(thead);
  const tbody = rEl('tbody');
  rows.forEach(row => {
    const tr = rEl('tr');
    row.forEach((cell, i) => tr.appendChild(rEl('td', i === 0 ? 'rtk' : '', cell)));
    tbody.appendChild(tr);
  });
  t.appendChild(tbody); return t;
}
function rAccordion(title, body, open) {
  const d = rEl('details', 'rsec');
  if (open) d.setAttribute('open', '');
  d.appendChild(rEl('summary', 'rsec-title', title));
  d.appendChild(body); return d;
}
function rList(items, cls) {
  const ul = rEl('ul', 'rlist' + (cls ? ' ' + cls : ''));
  items.forEach(i => ul.appendChild(rEl('li', '', i)));
  return ul;
}

/* ── SPARKLINE ───────────────────────────────────────── */
function rSparkline(scores, color) {
  const W = 120, H = 36, PAD = 4;
  if (!scores.length) return rEl('span', 'spark-empty', '\u2014');
  const min = Math.min(...scores, 0), max = Math.max(...scores, 100), range = max - min || 1;
  const pts = scores.map((s, i) => {
    const x = PAD + (i / Math.max(scores.length - 1, 1)) * (W - PAD * 2);
    const y = H - PAD - ((s - min) / range) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const lx = PAD + (W - PAD * 2), last = scores[scores.length - 1];
  const ly = H - PAD - ((last - min) / range) * (H - PAD * 2);
  const passY = H - PAD - ((70 - min) / range) * (H - PAD * 2);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
  svg.className = 'sparkline';
  if (min < 70 && max > 60) {
    const l = document.createElementNS(NS, 'line');
    ['x1','x2','y1','y2'].forEach((a, i) => l.setAttribute(a, [PAD, W-PAD, passY, passY][i]));
    l.setAttribute('stroke', 'rgba(100,120,140,0.35)'); l.setAttribute('stroke-width', '0.8'); l.setAttribute('stroke-dasharray', '2,2');
    svg.appendChild(l);
  }
  const pl = document.createElementNS(NS, 'polyline');
  pl.setAttribute('points', pts.join(' ')); pl.setAttribute('fill', 'none');
  pl.setAttribute('stroke', color); pl.setAttribute('stroke-width', '1.8');
  pl.setAttribute('stroke-linejoin', 'round'); pl.setAttribute('stroke-linecap', 'round');
  svg.appendChild(pl);
  const c = document.createElementNS(NS, 'circle');
  c.setAttribute('cx', lx); c.setAttribute('cy', ly); c.setAttribute('r', '3'); c.setAttribute('fill', color);
  svg.appendChild(c); return svg;
}

/* ── SPIDER / RADAR ──────────────────────────────────── */
function rSpider(pcts, size, opts) {
  size = size || 160;
  const { showLabels = true, compact = false } = opts || {};
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width', size); svg.setAttribute('height', size);
  svg.className = 'r-spider';
  const cx = size / 2, cy = size / 2, labelPad = showLabels ? 20 : 6, r = (size / 2) - labelPad;
  const N = 6, angle = i => (Math.PI * 2 * i / N) - Math.PI / 2;
  const pt = (pct, i) => { const a = angle(i), d2 = (pct / 100) * r; return [cx + d2 * Math.cos(a), cy + d2 * Math.sin(a)]; };
  [50, 70, 100].forEach(ring => {
    const poly = document.createElementNS(NS, 'polygon');
    poly.setAttribute('points', Array.from({length: N}, (_, i) => pt(ring, i)).map(p => p.join(',')).join(' '));
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', ring === 70 ? 'rgba(16,185,129,0.25)' : 'rgba(100,120,140,0.15)');
    poly.setAttribute('stroke-width', ring === 70 ? '1' : '0.7');
    if (ring === 70) poly.setAttribute('stroke-dasharray', '3,2');
    svg.appendChild(poly);
  });
  for (let i = 0; i < N; i++) {
    const [x, y] = pt(100, i);
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', cx); l.setAttribute('y1', cy); l.setAttribute('x2', x); l.setAttribute('y2', y);
    l.setAttribute('stroke', 'rgba(100,120,140,0.2)'); l.setAttribute('stroke-width', '0.7');
    svg.appendChild(l);
  }
  const valid = pcts.filter(p => p !== null && p !== undefined);
  if (valid.length === N) {
    const poly = document.createElementNS(NS, 'polygon');
    poly.setAttribute('points', pcts.map((p, i) => pt(Math.max(0, p), i).join(',')).join(' '));
    poly.setAttribute('fill', 'rgba(99,102,241,0.18)'); poly.setAttribute('stroke', 'rgba(99,102,241,0.8)');
    poly.setAttribute('stroke-width', '1.5'); poly.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(poly);
    pcts.forEach((p, i) => {
      const [x, y] = pt(Math.max(0, p), i);
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', '2.5'); c.setAttribute('fill', 'rgba(99,102,241,0.9)');
      svg.appendChild(c);
    });
  }
  /* Labels intentionally removed — legend provides full names + values */
  return svg;
}

/* ── PROMOTION EVIDENCE ──────────────────────────────── */
function rCountPromoEvidence(entries, lvl) {
  return (RD.promotionEvidence[lvl] || []).map(req => {
    const all = entries.filter(e => e.taskType === req.type);
    const q   = all.filter(e =>
      e.finalScore >= 70 &&
      (req.maxAssist === undefined || e.assistanceLevel <= req.maxAssist) &&
      (req.minDiff   === undefined || e.difficulty    >= req.minDiff)
    );
    const reasons = [];
    const below70    = all.filter(e => e.finalScore < 70).length;
    const highAssist = req.maxAssist !== undefined ? all.filter(e => e.finalScore >= 70 && e.assistanceLevel > req.maxAssist).length : 0;
    const lowDiff    = req.minDiff   !== undefined ? all.filter(e => e.finalScore >= 70 && e.difficulty < req.minDiff).length : 0;
    if (below70)    reasons.push(below70 + ' below 70');
    if (highAssist) reasons.push(highAssist + ' A>' + req.maxAssist);
    if (lowDiff)    reasons.push(lowDiff + ' D<' + req.minDiff);
    return { ...req, count: q.length, total: all.length, met: q.length >= req.min, reasons };
  });
}
function rRollingAvg(entries, taskType) {
  const f = entries.filter(e => e.taskType === taskType).slice(-5);
  return f.length ? +(f.reduce((s, e) => s + e.finalScore, 0) / f.length).toFixed(1) : null;
}

/* ── REFERENCE MARKDOWN EXPORT ───────────────────────── */
function rExportRefMarkdown() {
  const lines = [];
  const h1 = s => lines.push(`# ${s}`, '');
  const h2 = s => lines.push(`## ${s}`, '');
  const h3 = s => lines.push(`### ${s}`, '');
  const p  = s => lines.push(s, '');
  const li = items => { items.forEach(i => lines.push(`- ${i}`)); lines.push(''); };
  const tbl = (headers, rows) => {
    lines.push('| ' + headers.join(' | ') + ' |');
    lines.push('| ' + headers.map(() => '---').join(' | ') + ' |');
    rows.forEach(r => lines.push('| ' + r.map(c => String(c).replace(/\|/g, '\\|')) + ' |'));
    lines.push('');
  };
  const pre = s => { lines.push('```'); lines.push(s); lines.push('```', ''); };

  lines.push('# Technical Competency Scoring System v1.5', '');
  lines.push('*Level I / II / III · Difficulty-Calibrated · Domain- and Role-Aware*', '');

  h1('§1.1 Mandatory Grader Output Contract');
  p('This section is controlling. Any evaluation that reports only one total score is **invalid**, even if it later labels Level I/II/III as demonstrated or not demonstrated.');
  h2('Required output fields (in order)');
  li([
    'Problem level: Level I / II / III',
    'Difficulty: 1–5',
    'Level I answer score: 0–100 with verdict',
    'Level II answer score: 0–100 with verdict',
    'Level III answer score: 0–100 with verdict',
    'Answer level: highest level whose score passes',
    'Qualifying demonstrated level: answer level capped by problem level, difficulty, and autonomy requirements'
  ]);
  h2('Required output template');
  pre(`Problem level: Level __\nDifficulty: __/5\n\nLevel I answer score:   __/100 — Pass / Borderline / Fail\nLevel II answer score:  __/100 — Pass / Borderline / Fail\nLevel III answer score: __/100 — Pass / Borderline / Fail\n\nAnswer level: Level __\nQualifying demonstrated level: Level __\nPrimary domain: __\nPrimary role: __\nAssistance: __\nCaps/penalties: __\nMain reason the next level was not reached: __`);
  p('**Validation rule:** If any of the three numerical answer scores is missing, the assessment must be regenerated before it is recorded in the progress tracker.');

  h1('§3 Level Definitions');
  tbl(['Level', 'Standard', 'Typical Scope'], RD.levels.map(l => [l.label + ' — ' + l.subtitle, l.standard, l.scope]));

  h1('§3.1–3.3 Three-Score Answer Model');
  p('Every question receives one problem level and one difficulty rating. Every answer receives **three separate criterion-referenced scores**: Level I, Level II, and Level III. The prior single-score output is retired.');
  h2('Scoring lenses');
  tbl(['Level score', 'Scoring lens'], RD.scoringLenses.map(l => [l.level, l.lens]));
  h2('Key rules');
  li([
    'The same evidence is evaluated three times against progressively stricter standards.',
    'Higher-level scores must not exceed lower-level scores: Level III ≤ Level II ≤ Level I.',
    'Answer level = highest level score ≥70 that also passes mandatory gates and autonomy requirements.',
    'Qualifying demonstrated level = the lower of answer level and problem level.',
    'A Level I problem cannot establish Level II or Level III readiness.',
    'Do not average the three scores. They answer different questions.'
  ]);

  h1('§4 Mandatory Gates');
  tbl(['Gate', 'Requirement'], RD.gates.map(g => [g.gate, g.req]));
  p('Failure in correctness, relevance, or integrity normally produces an overall failing result regardless of other strengths.');

  h1('§5 Task Classification');
  tbl(['Primary task type', 'Examples'], [
    ['Coding', 'LeetCode, implementation exercises, algorithms, data structures.'],
    ['Debugging', 'Broken code, failing tests, semantic defects, production-style failures.'],
    ['Technical knowledge', 'Java, Spring, React, TypeScript, Python, SQL, AWS, RAG, ML, SDLC.'],
    ['System design', 'Services, APIs, data models, architecture, scaling, reliability.'],
    ['Production engineering', 'Testing, CI, Docker, logging, migrations, observability, security.'],
    ['Project walkthrough', 'Architecture explanation, ownership, tradeoffs, limitations, failure stories.'],
    ['Behavioral technical', 'Ownership, incidents, disagreement, leadership, cross-functional delivery.']
  ]);

  h1('§6 Formal Difficulty System');
  p('Difficulty measures the **task**, not the candidate\'s struggle. Assign before the attempt whenever possible.');
  tbl(['D', 'Label', 'Definition', 'Typical level'], RD.difficulty.map(d => [d.d, d.label, d.desc, d.level]));
  h2('Calibration rules');
  li([
    'Do not raise difficulty because the candidate struggled.',
    'Do not lower difficulty because the candidate solved it quickly.',
    'Task category alone does not determine difficulty.',
    'A cache bug is not automatically Difficulty 5.',
    'Difficulty affects what the score proves; it does not provide bonus points or excuse weak work.'
  ]);

  h2('§6.1 Difficulty Attribute Matrix');
  tbl(['Dimension', 'Score 0', 'Score 1', 'Score 2'], RD.difficultyAttributes.map(a => [a.dim, a.v0, a.v1, a.v2]));
  tbl(['Attribute total', 'Difficulty'], RD.difficultyThresholds.map(t => [t.range, t.d]));

  h1('§7 Universal Competency Score (60% of final)');
  tbl(['Competency', 'Weight'], [...RD.universal.map(u => [u.name, u.weight + ' pts']), ['**Total**', '**100**']]);
  RD.universal.forEach(u => {
    h2(u.name + ` (${u.weight} pts)`);
    tbl(['Score', 'Standard'], u.bands.map(b => [b.range, b.std]));
  });

  h1('§8 Task-Specific Rubrics (40% of final)');
  RD.taskRubrics.forEach(tr => {
    h2('§8.x ' + tr.label);
    if (tr.note) p('> ' + tr.note);
    tbl(['Category', 'Weight'], [...tr.categories.map(c => [c.name, c.weight + ' pts']), ['**Total**', '**100**']]);
  });

  h1('§9 Domain & Role Evidence Model');
  h2('Technical Domain Taxonomy');
  RD.domainGroups.forEach(g => { h3(g.group); li(g.domains); });
  h2('Role Competency Taxonomy');
  tbl(['Role', 'Primary competency weights'], RD.roles.map(r => [r.label, r.weights]));
  h2('Contribution Weights');
  tbl(['Evidence mapping', 'Default contribution'], RD.domainContributionWeights.map(c => [c.role, c.pct]));
  h2('Domain Subcompetencies');
  RD.domainSubcompetencies.forEach(d => { h3(d.domain); p(d.subs); });

  h1('§10 Retrospective Scoring Protocol');
  tbl(['Evidence class', 'Definition', 'Trend weight'], RD.evidenceClasses.map(e => [e.label, e.desc, e.weight.toFixed(2)]));
  li([
    'Mark difficulty as retrospectively estimated.',
    'Record autonomy as verified, partially verified, or unverified.',
    'Do not infer favorable missing evidence.',
    'Do not score project summaries as if they were observed performances.',
    'Use retrospective results to establish a baseline, not to claim perfect historical comparability.',
    'Prospective assessments become the primary evidence as the dataset grows.'
  ]);

  h1('§11 Multi-Bug Debugging Assessments');
  p('Recommended seeded exercise mix: 1× D3, 2× D4, 1× D5');
  h2('Per-Bug Completion Standard');
  tbl(['Evidence achieved', 'Max credit'], RD.bugCompletionStandards.map(b => [b.evidence, b.maxCredit]));
  h2('Difficulty Multipliers');
  tbl(['Difficulty', 'Multiplier'], RD.difficultyMultipliers.map(m => [m.d, m.mult]));
  p('Exercise Score = Σ(Bug Score × Difficulty Multiplier) ÷ Σ(Difficulty Multipliers)');

  h1('§12 Assistance & Autonomy');
  tbl(['Level', 'Assistance', 'Autonomy implication'], RD.assistance.map(a => [a.lvl, a.desc, a.autonomy]));

  h1('§13 Caps & Penalties');
  h2('Caps');
  tbl(['Condition', 'Max score'], RD.caps.map(c => [c.condition, c.max]));
  p('Applied after raw score. The lowest applicable cap wins.');
  h2('Penalties');
  tbl(['Deficiency', 'Typical penalty'], RD.penalties.map(p2 => [p2.deficiency, p2.penalty]));

  h1('§14 Demonstrated-Level Rules');
  tbl(['Level', 'Minimum qualifying pattern'], RD.levelRules.map(r => [r.level, r.pattern]));
  h2('All of the following must hold');
  li([
    'The matching level score must be at least 70.',
    'Correctness gate must pass.',
    'No critical competency may be below 60.',
    'Required difficulty evidence must exist.',
    'Required autonomy level must be met.',
    'Applicable caps must not reduce the score below 70.'
  ]);

  h1('§15 Score Interpretation');
  tbl(['Score', 'Verdict'], RD.scoreBands.map(b => [b.range, b.verdict]));

  h1('§19 Grading Principles');
  li(RD.gradingPrinciples);

  h1('§20 Standard Assessment Record');
  pre(`Assessment ID:\nDate:\nRubric version: 1.5\nProspective or retrospective:\nEvidence class:\nEvidence confidence:\n\nQuestion/task:\nPrimary task type:\nProblem level: Level I / II / III\nDifficulty: 1–5\nDifficulty attribute score:\nDifficulty rationale:\nDifficulty assignment: Precommitted / Retrospectively estimated\n\nTechnology/framework:\nPrimary technical domain:\nSecondary technical domains:\nPrimary role:\nSecondary roles:\n\nAssistance level:\nAutonomy confidence:\n\nLevel I answer score:   /100\nLevel I verdict:        Pass / Borderline / Fail\nLevel II answer score:  /100\nLevel II verdict:       Pass / Borderline / Fail\nLevel III answer score: /100\nLevel III verdict:      Pass / Borderline / Fail\n\nAnswer level:\nQualifying demonstrated level:\nQualifying evidence note:\n\nMandatory gates:\n- Correctness:\n- Relevance:\n- Independent explanation:\n- Evidence:\n- Integrity:\n- Completion:\n\nCaps:\nPenalties:\nConfirmed strengths:\nConfirmed weaknesses:\nWould this survive interview probing:\nEvaluator confidence:\nNext improvement target:`);

  const md = lines.join('\n');
  const blob = new Blob([md], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `rubric-v1.5-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
}

/* ══════════════════════════════════════════════════════
   BUILD
══════════════════════════════════════════════════════ */
function buildRubric() {
  const tab = document.getElementById('tab-rubric');
  if (!tab || tab.querySelector('.r-wrap')) return;
  const wrap = rEl('div', 'r-wrap'); tab.appendChild(wrap);

  const bar = rEl('div', 'r-bar');
  const VIEWS = [
    { id: 'log-entry',label: '\uff0b Log Entry'  },
    { id: 'history',  label: '\ud83d\udccb History'   },
    { id: 'reference',label: '\ud83d\udcda Reference' }
  ];
  const btns = {}, panels = {};
  VIEWS.forEach((v, i) => {
    const b = rEl('button', 'r-subtab' + (i === 0 ? ' active' : ''), v.label);
    b.addEventListener('click', () => switchView(v.id));
    bar.appendChild(b); btns[v.id] = b;
  });
  wrap.appendChild(bar);
  const views = rEl('div', 'r-views'); wrap.appendChild(views);
  VIEWS.forEach(v => {
    const p = rEl('div', 'r-view'); p.id = 'r-view-' + v.id;
    views.appendChild(p); panels[v.id] = p;
  });

  function switchView(id) {
    Object.values(btns).forEach(b => b.classList.remove('active'));
    Object.values(panels).forEach(p => p.classList.remove('active'));
    btns[id].classList.add('active'); panels[id].classList.add('active');
    if (id === 'history')  buildHistory();
  }

  /* ════ PROGRESS ═══════════════════════════════════════ */
/* ── KNOWLEDGE GAP CLUSTER MAP ───────────────────────────────────────────
   Atomic knowledgeGapTags rolled up for dashboard display.
   Raw tags are preserved in entries for search and retest targeting.
──────────────────────────────────────────────────────────────────────── */
const KGTAG_CLUSTERS = {
  'React / TS UI state': [
    'React state ownership','Nearest common ancestor state placement','Single source of truth for shared UI state',
    'Local state versus context versus state library','Render-scope and rerender tradeoffs',
    'Controlled versus uncontrolled input behavior','React value versus defaultValue lifecycle',
    'useEffect external synchronization boundary','Effect cleanup lifecycle','Effect dependency and stale closure behavior',
    'useReducer state-transition model','Reducer immutability and side-effect boundary','State machine versus boolean flags',
    'useMemo versus useCallback distinction','Memoization as performance hint not correctness guarantee',
    'React profiling before memoization','TypeScript discriminated union state modeling','TypeScript narrowing',
    'Exhaustive union handling with never','Runtime API validation boundary','Type assertion versus runtime validation',
    'Frontend-backend contract evolution','API request loading success error states','Duplicate submit prevention',
    'Optimistic update rollback','Idempotency key and stale version handling','Large form field-level subscription strategy'
  ],
  'SQL / data modeling': [
    'Primary key uniqueness and stability','Composite key design','Surrogate key versus natural key',
    'Integer key versus UUID tradeoff','Key locality and index behavior','Normalization versus denormalization tradeoffs',
    'Update insert delete anomalies','Read/write model consistency','Foreign key constraint versus ID column',
    'Many-to-many join table modeling','Database-enforced versus application-enforced integrity',
    'Database index read-write tradeoff','Composite index column order','EXPLAIN plan interpretation',
    'Inner join versus left join row preservation','Left join filter placement','Join duplicate row diagnosis',
    'GROUP BY output grain','WHERE versus HAVING distinction','Window function versus GROUP BY',
    'Deterministic latest-row selection','Transaction rollback and atomicity','Optimistic locking version check',
    'Valid state transitions under concurrency'
  ],
  'CI/CD and Docker': [
    'Continuous integration practice definition','Configured CI gates versus business correctness','CI coverage limitations',
    'Merge-blocking versus deployment checks','Pull request versus git pull distinction','Polyglot monorepo affected-change detection',
    'Docker image versus running container','Container runtime isolation boundary','Host kernel sharing',
    'Docker Compose versus production orchestration','Dockerfile versus docker-compose.yml','Compose service discovery',
    'Compose build versus run responsibilities','Host port versus container port','Docker internal DNS',
    'Runtime configuration ownership','Environment variables as runtime configuration','Secure container image construction',
    'Container health checks and restart diagnosis','Infrastructure as code versus setup script','Infrastructure drift detection',
    'Environment module and state separation','Secret rotation and revocation','CI secret exposure boundary',
    'Health check liveness versus readiness','Dependency outage health-check cascade risk','Deployment rollback artifact versus rebuild',
    'Backward-compatible schema rollout','Canary versus blue-green deployment','Progressive delivery rollback threshold',
    'Logs metrics traces distinction','Correlation ID versus trace ID','MDC logging context','OpenTelemetry trace/span model',
    'RAG observability dimensions'
  ],
  'Spring API boundaries': [
    'Spring controller-service-client boundaries','DTO validation versus domain invariants','Java-Python bridge contract',
    'HTTP error translation','Spring controller-advice registration','Spring API boundary versus framework-owned concept',
    'Subprocess stdout/stderr capture','Subprocess envelope/environment propagation','React-visible error correlation ID',
    'OpenAPI contract documentation'
  ],
  'ML / RAG evaluation': [
    'Training versus inference distinction','Model objective versus business objective','Cluster validity versus operational usefulness',
    'Feature versus label distinction','Prediction-time feature availability','Data leakage through future information',
    'Train/validation/test split ownership','Temporal leakage','Group leakage','Duplicate-record leakage',
    'Overfitting versus underfitting pattern','Classification versus regression framing','Precision versus recall tradeoff',
    'F1 limitation under business-cost asymmetry','Baseline model comparison','Keyword baseline versus embedding retrieval',
    'Preprocessing pipeline ownership','Cross-validation fold independence','Time-series cross-validation','Model serving contract',
    'Inference-time missing feature handling','Data drift versus concept drift','RAG versus fine-tuning boundary',
    'RAG hallucination despite correct corpus','Retrieval intent versus corpus vocabulary mapping','RAG evaluation hit_rate@k versus MRR',
    'LLM boundary versus deterministic policy','Human-in-the-loop validation boundary','Experiment reproducibility lineage',
    'Learned parameters versus explicit rules','Deterministic guardrails versus probabilistic predictions','Hard policy constraints',
    'Rules-based versus learned pattern boundary'
  ],
  'Data engineering pipelines': [
    'Pipeline versus one-off script distinction','Pipeline input/output contract','ETL versus ELT transformation boundary',
    'Immutable raw layer','Curated layer as analyst-facing contract','Lineage, replay, and backfill',
    'Batch versus streaming boundary','Micro-batch latency tradeoff','Streaming bounded versus unbounded data',
    'Event time versus processing time','Watermarks and late-arriving data','Backpressure',
    'Source-to-target mapping contract','Controlled vocabulary drift','Operational database versus warehouse versus lake',
    'Fact table grain definition','Dimension table context role','Data-quality dimensions','Blocking versus warning data-quality checks',
    'Pipeline idempotency','Content-hash deduplication','Incremental load watermark safety','Late-arriving data overlap window',
    'Orchestration versus transformation logic','Cron versus orchestrator boundary','Partitioning versus indexing',
    'Schema evolution compatibility','Pipeline failure classification','Preserve-last-good extract staleness',
    'Backfill partitioning and source-load control','Pipeline production-readiness criteria'
  ],
  'Statistics / DS framing': [
    'Business decision to analytical question translation','Metric denominator and timeframe definition','Baseline and population definition',
    'Population versus sample distinction','Review-selection bias','Mean median mode distribution choice','Median versus tail-percentile interpretation',
    'Variance and standard deviation interpretation','Control limits versus specification limits','Correlation versus causation distinction',
    'Confounder and causal language boundary','Hypothesis test p-value interpretation','Statistical significance versus practical significance',
    'Confidence interval interpretation','Missingness mechanism classification','Informative missingness','Outlier removal versus rare valid signal',
    'EDA structural data-quality checks','Visualization choice by analytical question','SQL aggregation grain and denominator',
    'Join cardinality before aggregation','A/B test randomization and eligibility','Before-after comparison confounding',
    'Stakeholder result communication'
  ],
  'SWE / OOP fundamentals': [
    'Variable versus value versus type distinction','Static versus dynamic typing','Runtime validation versus static type checking',
    'Function versus method distinction','Input/output contract','Single responsibility and cohesion',
    'Class versus object distinction','Data record versus behavior-heavy class','Encapsulation and invariant protection',
    'Setter versus domain operation boundary','Inheritance versus composition tradeoff','Interface contract versus implementation detail',
    'Premature abstraction with interfaces','List/set/map/stack/queue operation selection','Hash-based lookup memory tradeoff',
    'Big-O growth versus runtime benchmark','I/O cost versus algorithmic complexity','Exception translation boundary',
    'Retryable versus permanent failure distinction','Unit test isolation and determinism','Behavior testing versus implementation-coupled testing',
    'HTTP request-response lifecycle','HTTP status code semantics','REST resource modeling and statelessness',
    'Workflow endpoint versus CRUD endpoint','Database transaction atomicity and rollback','External API inside transaction risk',
    'Git branch and pull request workflow','Systematic debugging loop','Dependency-chain inspection'
  ],
  'Java / coding invariants': [
    'Java String immutability','String.replaceFirst argument and return behavior','Regex semantics in string replacement',
    'Frequency-count invariant for anagrams','Single-pass min-price invariant','Greedy stock-profit state update',
    'Ordering constraint for buy before sell','O(1) state tracking','Odd-length two-pointer loop termination',
    'In-place reversal invariant','In-place prefix sum transformation','Space optimization using input mutation',
    'Complexity claim for implemented algorithm','Representative edge-case tests for coding'
  ]
};

  function buildProgress(el) {
    el.innerHTML = '';
    const entries = rLog();

    /* Sprint day */
    const SPRINT_START = new Date(2026, 5, 17);
    const sprintDay = Math.max(1, Math.min(29, Math.round((new Date() - SPRINT_START) / 86400000) + 1));

    /* Stats */
    const total = entries.length;
    const passes = entries.filter(e => e.finalScore >= 70).length;
    const assistFree = entries.filter(e => e.assistanceLevel <= 1).length;
    const lastFive = entries.slice(-5);
    const rollingAll = lastFive.length ? +(lastFive.reduce((s, e) => s + e.finalScore, 0) / lastFive.length).toFixed(1) : null;
    const sorted = [...entries].map(e => e.finalScore).sort((a, b) => a - b);
    const median = sorted.length ? (sorted.length % 2 ? sorted[Math.floor(sorted.length/2)] : +((sorted[sorted.length/2-1]+sorted[sorted.length/2])/2).toFixed(1)) : null;
    const trend = entries.length >= 2 ? entries[entries.length-1].finalScore - entries[entries.length-2].finalScore : null;
    const trendStr = trend === null ? '\u2014' : trend > 0 ? `\u25b2 ${trend.toFixed(1)}` : trend < 0 ? `\u25bc ${Math.abs(trend).toFixed(1)}` : '\u2192 0';

    const statsGrid = rEl('div', 'r-stats-grid');
    [
      { val: `Day ${sprintDay}/29`, lbl: 'sprint day' },
      { val: total,                  lbl: 'attempts' },
      { val: total ? `${passes}/${total}` : '\u2014', lbl: 'passed (\u226570)' },
      { val: rollingAll ?? '\u2014', lbl: 'rolling avg (5)' },
      { val: median ?? '\u2014',     lbl: 'median' },
      { val: total ? `${Math.round(assistFree/total*100)}%` : '\u2014', lbl: 'A\u22641' },
      { val: trendStr, lbl: 'last vs prev', cls: trend > 0 ? 'stat-up' : trend < 0 ? 'stat-down' : '' }
    ].forEach(s => {
      const card = rEl('div', 'r-stat-card');
      card.appendChild(rEl('div', 'r-stat-val' + (s.cls ? ' ' + s.cls : ''), String(s.val)));
      card.appendChild(rEl('div', 'r-stat-lbl', s.lbl));
      statsGrid.appendChild(card);
    });
    el.appendChild(statsGrid);

    /* Next recommended action */
    const recWrap = document.createElement('div');
    buildNextRecommended(recWrap);
    el.appendChild(recWrap);

    /* Burndown chart */
    const burnSec = rEl('div', 'r-burndown-section');
    burnSec.appendChild(rEl('div', 'r-section-label', 'L1 + L2 Evidence Burndown'));
    const burnLegend = rEl('div', 'r-burndown-legend');
    [['L1 (9 slots)', 'rgba(16,185,129,0.9)', null],
     ['L2 (9 slots)', 'rgba(99,102,241,0.9)', null],
     ['Ideal pace',   'rgba(100,120,140,0.5)', '4,3']].forEach(([lbl, col, dash]) => {
      const item = rEl('div', 'r-burndown-leg-item');
      const line = rEl('span', 'r-burndown-leg-line');
      line.style.background = col;
      if (dash) line.style.background = 'none';
      if (dash) { line.style.border = 'none'; line.style.borderTop = '2px dashed ' + col; }
      item.appendChild(line);
      item.appendChild(rEl('span', '', lbl));
      burnLegend.appendChild(item);
    });
    burnSec.appendChild(burnLegend);
    burnSec.id = 'r-burndown-live';
    burnSec.appendChild(rBurndownSVG());
    el.appendChild(burnSec);

    const _burnRefresh = () => {
      const sec = document.getElementById('r-burndown-live');
      if (!sec) return;
      const old = sec.querySelector('svg'); if (old) old.remove();
      sec.appendChild(rBurndownSVG());
      updateHeaderStats();
    };
    window.removeEventListener('rubric-updated', _burnRefresh);
    window.addEventListener('rubric-updated', _burnRefresh);

    /* Three-level score summary */
    if (total > 0) {
      const withL = entries.filter(e => e.levelScores?.L1 !== null);
      if (withL.length) {
        const lvlSec = rEl('div', 'r-level-scores-section');
        lvlSec.appendChild(rEl('div', 'r-section-label', 'Three-Score Averages'));
        const lvlGrid = rEl('div', 'r-three-score-grid');
        ['L1','L2','L3'].forEach(lk => {
          const scores = withL.map(e => e.levelScores[lk]).filter(v => v !== null);
          const avg = scores.length ? +(scores.reduce((s,v)=>s+v,0)/scores.length).toFixed(1) : null;
          const passes3 = scores.filter(v => v >= 70).length;
          const card = rEl('div', 'r-three-score-card');
          const band = avg !== null ? rScoreBand(avg) : null;
          card.appendChild(rEl('div', 'r-three-score-label', { L1: 'Level I', L2: 'Level II', L3: 'Level III' }[lk]));
          card.appendChild(rEl('div', 'r-three-score-val ' + (band ? band.cls : ''), avg !== null ? avg : '\u2014'));
          card.appendChild(rEl('div', 'r-three-score-sub', scores.length ? `${passes3}/${scores.length} pass` : 'no data'));
          lvlGrid.appendChild(card);
        });
        lvlSec.appendChild(lvlGrid);
        el.appendChild(lvlSec);
      }
    }

    /* Universal competency radar */
    const avgPcts = rAvgSubPct(entries);
    if (avgPcts) {
      const radarSec = rEl('div', 'r-radar-section');
      radarSec.appendChild(rEl('div', 'r-section-label', 'Average Universal Competency Profile'));
      const radarWrap = rEl('div', 'r-radar-center');
      radarWrap.appendChild(rSpider(avgPcts, 220, { showLabels: true }));
      const legend = rEl('div', 'r-radar-legend');
      RD.universalDims.forEach((d, i) => {
        const row = rEl('div', 'r-radar-leg-row');
        const bw = rEl('div', 'r-radar-leg-bar-wrap');
        const bf = rEl('div', 'r-radar-leg-bar');
        const pct = avgPcts[i];
        bf.style.width = pct + '%';
        bf.style.background = pct >= 70 ? 'var(--done)' : pct >= 50 ? 'var(--doing)' : 'var(--audit)';
        bw.appendChild(bf);
        row.appendChild(rEl('span', 'r-radar-leg-label', d.label));
        row.appendChild(bw);
        row.appendChild(rEl('span', 'r-radar-leg-val', pct + '%'));
        legend.appendChild(row);
      });
      radarWrap.appendChild(legend); radarSec.appendChild(radarWrap);
      el.appendChild(radarSec);
    }

    /* Domain breakdown */
    if (total > 0) {
      const withDomain = entries.filter(e => (e.primaryDomain || e.domain));
      if (withDomain.length) {
        const domSec = rEl('div', 'r-domain-section');
        domSec.appendChild(rEl('div', 'r-section-label', 'Domain Evidence'));
        const domGrid = rEl('div', 'r-domain-grid');
        const domainMap = {};
        withDomain.forEach(e => {
          const d = (e.primaryDomain || e.domain || '').trim();
          if (!d) return;
          if (!domainMap[d]) domainMap[d] = [];
          domainMap[d].push(e.finalScore);
        });
        Object.entries(domainMap)
          .sort((a, b) => b[1].length - a[1].length)
          .forEach(([dom, scores]) => {
            const avg = +(scores.reduce((s,v)=>s+v,0)/scores.length).toFixed(1);
            const band = rScoreBand(avg);
            const card = rEl('div', 'r-domain-card');
            card.appendChild(rEl('div', 'r-domain-name', dom));
            const barRow = rEl('div', 'r-domain-bar-row');
            const bw = rEl('div', 'r-domain-bar-wrap');
            const bf = rEl('div', 'r-domain-bar'); bf.style.width = avg + '%';
            bf.style.background = avg >= 70 ? 'var(--done)' : avg >= 60 ? 'var(--doing)' : 'var(--audit)';
            bw.appendChild(bf);
            barRow.appendChild(bw);
            barRow.appendChild(rEl('span', 'r-domain-avg ' + band.cls, avg));
            card.appendChild(barRow);
            card.appendChild(rEl('div', 'r-domain-count', `${scores.length} attempt${scores.length > 1 ? 's' : ''}`));
            domGrid.appendChild(card);
          });
        domSec.appendChild(domGrid);
        el.appendChild(domSec);
      }
    }

    /* Role breakdown */
    if (total > 0) {
      const withRole = entries.filter(e => e.primaryRole);
      if (withRole.length) {
        const roleSec = rEl('div', 'r-domain-section');
        roleSec.appendChild(rEl('div', 'r-section-label', 'Role Evidence'));
        const roleGrid = rEl('div', 'r-domain-grid');
        const roleMap = {};
        withRole.forEach(e => {
          const r = e.primaryRole;
          if (!roleMap[r]) roleMap[r] = [];
          roleMap[r].push(e.finalScore);
        });
        Object.entries(roleMap).forEach(([role, scores]) => {
          const avg = +(scores.reduce((s,v)=>s+v,0)/scores.length).toFixed(1);
          const band = rScoreBand(avg);
          const card = rEl('div', 'r-domain-card');
          card.appendChild(rEl('div', 'r-domain-name', role));
          const barRow = rEl('div', 'r-domain-bar-row');
          const bw = rEl('div', 'r-domain-bar-wrap');
          const bf = rEl('div', 'r-domain-bar'); bf.style.width = avg + '%';
          bf.style.background = avg >= 70 ? 'var(--done)' : avg >= 60 ? 'var(--doing)' : 'var(--audit)';
          bw.appendChild(bf);
          barRow.appendChild(bw);
          barRow.appendChild(rEl('span', 'r-domain-avg ' + band.cls, avg));
          card.appendChild(barRow);
          card.appendChild(rEl('div', 'r-domain-count', `${scores.length} attempt${scores.length>1?'s':''}`));
          roleGrid.appendChild(card);
        });
        roleSec.appendChild(roleGrid);
        el.appendChild(roleSec);
      }
    }

    /* Task-type sparklines */
    const sparkWrap = rEl('div', 'r-spark-section');
    sparkWrap.appendChild(rEl('div', 'r-section-label', 'Score Trend by Task Type'));
    const sparkGrid = rEl('div', 'r-spark-grid');
    RD.taskTypes.forEach(tt => {
      const te = entries.filter(e => e.taskType === tt.id);
      const scores = te.map(e => e.finalScore);
      const avg = rRollingAvg(entries, tt.id);
      const card = rEl('div', 'r-spark-card');
      const hdr = rEl('div', 'r-spark-hdr');
      const dot = rEl('span', 'r-spark-dot'); dot.style.background = tt.color;
      hdr.appendChild(dot); hdr.appendChild(rEl('span', 'r-spark-label', tt.label)); card.appendChild(hdr);
      if (!scores.length) {
        card.appendChild(rEl('div', 'r-spark-empty', 'no attempts'));
      } else {
        card.appendChild(rSparkline(scores, tt.color));
        const meta = rEl('div', 'r-spark-meta');
        meta.appendChild(rEl('span', '', `${te.filter(e=>e.finalScore>=70).length}/${scores.length} pass`));
        if (avg !== null) meta.appendChild(rEl('span', 'r-spark-avg', `avg ${avg}`));
        card.appendChild(meta);
      }
      sparkGrid.appendChild(card);
    });
    sparkWrap.appendChild(sparkGrid); el.appendChild(sparkWrap);

    /* Weakness tags */
    const allTags = entries.flatMap(e => e.weaknessTags || []);
    if (allTags.length) {
      const freq = {};
      allTags.forEach(t => { freq[t] = (freq[t]||0)+1; });
      const ws = rEl('div', 'r-weak-section');
      ws.appendChild(rEl('div', 'r-section-label', 'Recurring Weakness Tags'));
      const tr = rEl('div', 'r-weak-tags');
      Object.entries(freq).sort((a,b)=>b[1]-a[1]).forEach(([tag,count]) => {
        tr.appendChild(rEl('span', 'r-weak-tag'+(count>=3?' r-weak-hot':''), `${tag} <span class="r-weak-count">${count}</span>`));
      });
      ws.appendChild(tr); el.appendChild(ws);
    }

    /* Knowledge gap clustered display */
    const allKGTags = entries.flatMap(e => e.knowledgeGapTags || []);
    if (allKGTags.length) {
      const kgFreq = {};
      allKGTags.forEach(t => { kgFreq[t] = (kgFreq[t]||0)+1; });

      /* Score each cluster */
      const clusterData = Object.entries(KGTAG_CLUSTERS).map(([name, members]) => {
        const hits = members.filter(m => kgFreq[m]);
        const total = hits.reduce((s, m) => s + (kgFreq[m]||0), 0);
        const sorted = hits.sort((a,b)=>(kgFreq[b]||0)-(kgFreq[a]||0));
        return { name, total, sorted, allMembers: members };
      }).filter(c => c.total > 0).sort((a,b) => b.total - a.total);

      /* Unclassified tags */
      const classifiedSet = new Set(Object.values(KGTAG_CLUSTERS).flat());
      const unclassified = Object.entries(kgFreq)
        .filter(([t]) => !classifiedSet.has(t))
        .sort((a,b) => b[1]-a[1]);
      if (unclassified.length) {
        const unc = unclassified.reduce((s,[,c])=>s+c,0);
        clusterData.push({ name: 'Other', total: unc, sorted: unclassified.map(([t])=>t), allMembers: [] });
      }

      if (!clusterData.length) return;

      const kgSec = rEl('div', 'r-kg-section');
      const hdr = rEl('div', 'r-kg-header');
      hdr.appendChild(rEl('div', 'r-section-label', 'Knowledge Gap Clusters (§17.1)'));
      const toggle = rEl('button', 'r-kg-toggle', 'Show atomic tags');
      let atomicVisible = false;
      hdr.appendChild(toggle);
      kgSec.appendChild(hdr);

      const maxTotal = clusterData[0]?.total || 1;

      clusterData.forEach(cluster => {
        const card = rEl('div', 'r-kg-cluster-row');
        card.dataset.expanded = 'false';

        /* Top row: name + bar + count */
        const main = rEl('div', 'r-kg-cluster-main');
        const namEl = rEl('span', 'r-kg-cluster-name', cluster.name);
        const barWrap = rEl('div', 'r-kg-bar-wrap');
        const barFill = rEl('div', 'r-kg-bar-fill');
        barFill.style.width = Math.round(cluster.total / maxTotal * 100) + '%';
        barWrap.appendChild(barFill);
        const cntEl = rEl('span', 'r-kg-cluster-cnt', cluster.total);
        const expBtn = rEl('button', 'r-kg-exp-btn', '▸');
        main.appendChild(namEl); main.appendChild(barWrap);
        main.appendChild(cntEl); main.appendChild(expBtn);
        card.appendChild(main);

        /* Atomic tags (hidden by default) */
        const atomicWrap = rEl('div', 'r-kg-atomic-wrap');
        atomicWrap.style.display = 'none';
        const MAX_SHOWN = 5;
        const showTags = cluster.sorted.slice(0, MAX_SHOWN);
        showTags.forEach(tag => {
          const cnt = kgFreq[tag] || unclassified.find(([t])=>t===tag)?.[1] || 0;
          const t = rEl('span', 'r-weak-tag r-kgtag r-kgtag-sm',
            tag + ' <span class="r-weak-count">' + cnt + '</span>');
          atomicWrap.appendChild(t);
        });
        if (cluster.sorted.length > MAX_SHOWN) {
          const more = rEl('span', 'r-kg-more', '+' + (cluster.sorted.length - MAX_SHOWN) + ' more');
          more.addEventListener('click', () => {
            // show remaining
            cluster.sorted.slice(MAX_SHOWN).forEach(tag => {
              const cnt = kgFreq[tag] || 0;
              const t = rEl('span', 'r-weak-tag r-kgtag r-kgtag-sm',
                tag + ' <span class="r-weak-count">' + cnt + '</span>');
              atomicWrap.insertBefore(t, more);
            });
            more.remove();
          });
          atomicWrap.appendChild(more);
        }
        card.appendChild(atomicWrap);

        /* Expand/collapse on row click */
        main.addEventListener('click', () => {
          const open = card.dataset.expanded === 'true';
          card.dataset.expanded = open ? 'false' : 'true';
          atomicWrap.style.display = open ? 'none' : 'flex';
          expBtn.textContent = open ? '▸' : '▾';
        });

        kgSec.appendChild(card);
      });

      /* Toggle to show all atomic tags at once */
      toggle.addEventListener('click', () => {
        atomicVisible = !atomicVisible;
        toggle.textContent = atomicVisible ? 'Hide atomic tags' : 'Show atomic tags';
        kgSec.querySelectorAll('.r-kg-cluster-row').forEach(row => {
          const wrap = row.querySelector('.r-kg-atomic-wrap');
          const btn  = row.querySelector('.r-kg-exp-btn');
          if (wrap) wrap.style.display = atomicVisible ? 'flex' : 'none';
          if (btn)  btn.textContent   = atomicVisible ? '▾' : '▸';
          row.dataset.expanded = atomicVisible ? 'true' : 'false';
        });
      });

      el.appendChild(kgSec);
    }

    /* Open gaps + upcoming retests */
    const openGaps     = entries.filter(e => e.gapClosureStatus && e.gapClosureStatus.status === 'open');
    const inProgress   = entries.filter(e => e.gapClosureStatus && e.gapClosureStatus.status === 'in progress');
    const reopened     = entries.filter(e => e.gapClosureStatus && e.gapClosureStatus.status === 'reopened');
    const todayStr2    = new Date().toISOString().slice(0,10);
    const upcomingTests = entries
      .filter(e => e.retestPlan && e.retestPlan.retestDate && e.retestPlan.retestDate >= todayStr2)
      .sort((a,b) => a.retestPlan.retestDate.localeCompare(b.retestPlan.retestDate));

    if (openGaps.length || inProgress.length || reopened.length || upcomingTests.length) {
      const gapSec = rEl('div', 'r-gap-closure-section');
      gapSec.appendChild(rEl('div', 'r-section-label', 'Gap Closure & Retests (§17.11 / §17.16)'));
      const gcGrid = rEl('div', 'r-gc-grid');

      if (openGaps.length || inProgress.length || reopened.length) {
        const gcCard = rEl('div', 'r-gc-card');
        gcCard.appendChild(rEl('div', 'r-diag-card-title', 'Gap Status'));
        [['open', openGaps, 'r-gc-open'], ['in progress', inProgress, 'r-gc-inprog'], ['reopened', reopened, 'r-gc-reopen']].forEach(([lbl, arr, cls]) => {
          if (!arr.length) return;
          const row = rEl('div', 'r-gc-row');
          const badge = rEl('span', 'r-gc-badge ' + cls, lbl);
          row.appendChild(badge);
          row.appendChild(rEl('span', 'r-gc-cnt', arr.length));
          gcCard.appendChild(row);
          arr.slice(0,3).forEach(e => {
            const item = rEl('div', 'r-gc-item', e.task.slice(0,55) + (e.task.length>55?'…':''));
            gcCard.appendChild(item);
          });
        });
        gcGrid.appendChild(gcCard);
      }

      if (upcomingTests.length) {
        const rtCard = rEl('div', 'r-gc-card');
        rtCard.appendChild(rEl('div', 'r-diag-card-title', 'Upcoming Retests'));
        upcomingTests.slice(0, 5).forEach(e => {
          const row = rEl('div', 'r-retest-row');
          const daysAway = Math.round((new Date(e.retestPlan.retestDate) - new Date(todayStr2)) / 86400000);
          const urgency = daysAway <= 1 ? 'r-retest-urgent' : daysAway <= 3 ? 'r-retest-soon' : '';
          row.appendChild(rEl('span', 'r-retest-date ' + urgency, e.retestPlan.retestDate));
          row.appendChild(rEl('span', 'r-retest-task', e.task.slice(0,45) + (e.task.length>45?'…':'')));
          rtCard.appendChild(row);
        });
        gcGrid.appendChild(rtCard);
      }

      gapSec.appendChild(gcGrid);
      el.appendChild(gapSec);
    }

    /* Role readiness rollups */
    const withRoles = entries.filter(e => e.roleReadinessRollup && e.roleReadinessRollup.targetRole);
    if (withRoles.length) {
      const latestByRole = {};
      withRoles.forEach(e => {
        const role = e.roleReadinessRollup.targetRole;
        if (!latestByRole[role] || e.date > latestByRole[role].date) latestByRole[role] = e;
      });
      const roleSec = rEl('div', 'r-role-readiness-section');
      roleSec.appendChild(rEl('div', 'r-section-label', 'Role Readiness (§17.17)'));
      const roleGrid = rEl('div', 'r-role-grid');
      const READINESS_ORDER = ['Not ready','Emerging','Interviewable with risk','Interviewable','Strong fit'];
      const READINESS_COLOR = { 'Not ready': 'var(--audit)', 'Emerging': 'var(--doing)', 'Interviewable with risk': 'var(--doing)', 'Interviewable': 'var(--done)', 'Strong fit': 'var(--done)' };
      Object.entries(latestByRole).forEach(([role, e]) => {
        const r = e.roleReadinessRollup;
        const pct = Math.round(READINESS_ORDER.indexOf(r.readiness || 'Not ready') / (READINESS_ORDER.length-1) * 100);
        const card = rEl('div', 'r-role-card');
        card.appendChild(rEl('div', 'r-role-title', role));
        const badge = rEl('span', 'r-role-badge', r.readiness || 'Not ready');
        badge.style.color = READINESS_COLOR[r.readiness] || 'var(--text-dim)';
        badge.style.borderColor = READINESS_COLOR[r.readiness] || 'var(--border)';
        card.appendChild(badge);
        if (r.blockingGaps) card.appendChild(rEl('div', 'r-role-blocking', r.blockingGaps + ' blocking gap' + (r.blockingGaps>1?'s':'')));
        if (r.recommendedNextMilestone) card.appendChild(rEl('div', 'r-role-next', '→ ' + r.recommendedNextMilestone));
        roleGrid.appendChild(card);
      });
      roleSec.appendChild(roleGrid);
      el.appendChild(roleSec);
    }

    /* Evidence source distribution */
    const allSources = entries.flatMap(e => e.evidenceSource || []);
    if (allSources.length) {
      const srcFreq = {};
      allSources.forEach(s => { srcFreq[s] = (srcFreq[s]||0)+1; });
      const srcSec = rEl('div', 'r-weak-section');
      srcSec.appendChild(rEl('div', 'r-section-label', 'Evidence Sources (§17.5)'));
      const srcGrid = rEl('div', 'r-src-grid');
      const STRONG_SOURCES = new Set(['live coding','debugging transcript','mock interview','real interview feedback','verbal answer']);
      Object.entries(srcFreq).sort((a,b)=>b[1]-a[1]).forEach(([src, cnt]) => {
        const card = rEl('div', 'r-src-card');
        const dot = rEl('span', 'r-src-dot');
        dot.style.background = STRONG_SOURCES.has(src) ? 'var(--done)' : 'var(--border)';
        dot.title = STRONG_SOURCES.has(src) ? 'Strong readiness evidence' : 'Weaker readiness evidence';
        card.appendChild(dot);
        card.appendChild(rEl('span', 'r-src-label', src));
        card.appendChild(rEl('span', 'r-src-cnt', cnt));
        srcGrid.appendChild(card);
      });
      srcSec.appendChild(srcGrid);
      el.appendChild(srcSec);
    }

    /* Diagnostics summary — v1.9 */
    (function buildDiagnostics() {
      const dEntries = entries.filter(e =>
        e.probeReadiness || e.llmIndependence || (e.gapTypes && e.gapTypes.length) ||
        (e.knowledgeGapTags && e.knowledgeGapTags.length) || e.calibration ||
        (e.staleness && e.staleness.refreshNeeded) || (e.gapImpact && e.gapImpact.isBlocking)
      );
      if (!dEntries.length) return;

      const diagSec = rEl('div', 'r-diag-section');
      diagSec.appendChild(rEl('div', 'r-section-label', 'Diagnostics — v1.9'));

      const diagGrid = rEl('div', 'r-diag-grid');

      /* Probe Readiness */
      const withProbe = entries.filter(e => e.probeReadiness);
      if (withProbe.length) {
        const card = rEl('div', 'r-diag-card');
        card.appendChild(rEl('div', 'r-diag-card-title', 'Probe Readiness'));
        [['First answer', 'firstAnswer'], ['One follow-up', 'oneFollowUp'], ['Deep follow-up', 'deepFollowUp']].forEach(([lbl, key]) => {
          const vals = withProbe.map(e => e.probeReadiness[key]).filter(Boolean);
          if (!vals.length) return;
          const pass = vals.filter(v => v === 'Pass').length;
          const unc  = vals.filter(v => v === 'Uncertain').length;
          const fail = vals.filter(v => v === 'Fail').length;
          const row = rEl('div', 'r-diag-probe-row');
          row.appendChild(rEl('span', 'r-diag-probe-lbl', lbl));
          const bar = rEl('div', 'r-diag-probe-bar');
          if (pass) { const s = rEl('div', 'r-diag-probe-seg probe-pass'); s.style.width = (pass/vals.length*100)+'%'; s.title = pass+' Pass'; bar.appendChild(s); }
          if (unc)  { const s = rEl('div', 'r-diag-probe-seg probe-unc');  s.style.width = (unc/vals.length*100)+'%';  s.title = unc+' Uncertain'; bar.appendChild(s); }
          if (fail) { const s = rEl('div', 'r-diag-probe-seg probe-fail'); s.style.width = (fail/vals.length*100)+'%'; s.title = fail+' Fail'; bar.appendChild(s); }
          row.appendChild(bar);
          row.appendChild(rEl('span', 'r-diag-probe-pct', Math.round(pass/vals.length*100)+'%'));
          card.appendChild(row);
        });
        diagGrid.appendChild(card);
      }

      /* LLM Independence */
      const withLLM = entries.filter(e => e.llmIndependence);
      if (withLLM.length) {
        const card = rEl('div', 'r-diag-card');
        card.appendChild(rEl('div', 'r-diag-card-title', 'LLM Independence'));
        const llmUsed = withLLM.filter(e => e.llmIndependence.llmUsed).length;
        const pct = Math.round(llmUsed / withLLM.length * 100);
        const stat = rEl('div', 'r-diag-llm-stat');
        stat.innerHTML = `LLM used: <span class="${pct > 60 ? 'diag-warn' : 'diag-ok'}">${llmUsed}/${withLLM.length} (${pct}%)</span>`;
        card.appendChild(stat);
        const withFive = withLLM.filter(e => e.llmIndependence.fivePassStatus);
        if (withFive.length) {
          const passes = ['buildPass','rewritePass','testPass','explainPass','documentPass'];
          const labels = ['Build','Rewrite','Test','Explain','Document'];
          passes.forEach((p, i) => {
            const cnt = withFive.filter(e => e.llmIndependence.fivePassStatus[p]).length;
            const row = rEl('div', 'r-diag-five-row');
            row.appendChild(rEl('span', 'r-diag-five-lbl', labels[i]));
            const bw = rEl('div', 'r-diag-five-bar-wrap');
            const bf = rEl('div', 'r-diag-five-bar'); bf.style.width = (cnt/withFive.length*100)+'%';
            bf.style.background = cnt/withFive.length >= 0.6 ? 'var(--done)' : 'var(--audit)';
            bw.appendChild(bf);
            row.appendChild(bw);
            row.appendChild(rEl('span', 'r-diag-five-cnt', cnt+'/'+withFive.length));
            card.appendChild(row);
          });
        }
        diagGrid.appendChild(card);
      }

      /* Gap Type Distribution */
      const allGapTypes = entries.flatMap(e => e.gapTypes || []);
      if (allGapTypes.length) {
        const freq = {};
        allGapTypes.forEach(t => { freq[t] = (freq[t]||0)+1; });
        const sorted = Object.entries(freq).sort((a,b)=>b[1]-a[1]);
        const card = rEl('div', 'r-diag-card');
        card.appendChild(rEl('div', 'r-diag-card-title', 'Gap Types'));
        sorted.slice(0, 6).forEach(([type, count]) => {
          const row = rEl('div', 'r-diag-gap-row');
          const label = type.replace(' gap','');
          row.appendChild(rEl('span', 'r-diag-gap-lbl', label));
          const bw = rEl('div', 'r-diag-gap-bar-wrap');
          const bf = rEl('div', 'r-diag-gap-bar');
          bf.style.width = (count / sorted[0][1] * 100) + '%';
          bw.appendChild(bf); row.appendChild(bw);
          row.appendChild(rEl('span', 'r-diag-gap-cnt', count));
          card.appendChild(row);
        });
        diagGrid.appendChild(card);
      }

      /* Calibration */
      const withCal = entries.filter(e => e.calibration);
      if (withCal.length) {
        const card = rEl('div', 'r-diag-card');
        card.appendChild(rEl('div', 'r-diag-card-title', 'Calibration'));
        const evalFreq = {};
        withCal.forEach(e => { const t = e.calibration.evaluatorType || 'unknown'; evalFreq[t] = (evalFreq[t]||0)+1; });
        const humanReviewed = withCal.filter(e => e.calibration.humanReviewed).length;
        const realSig = withCal.filter(e => e.calibration.realInterviewSignal).length;
        Object.entries(evalFreq).sort((a,b)=>b[1]-a[1]).forEach(([type, count]) => {
          const row = rEl('div', 'r-diag-cal-row');
          row.appendChild(rEl('span', 'r-diag-cal-type', type));
          row.appendChild(rEl('span', 'r-diag-cal-cnt', count));
          card.appendChild(row);
        });
        if (humanReviewed || realSig) {
          const note = rEl('div', 'r-diag-cal-note');
          if (humanReviewed) note.innerHTML += `<span class="diag-ok">${humanReviewed} human-reviewed</span> `;
          if (realSig) note.innerHTML += `<span class="diag-ok">${realSig} real interview signal</span>`;
          card.appendChild(note);
        }
        diagGrid.appendChild(card);
      }

      /* Staleness / Blocking */
      const stale = entries.filter(e => e.staleness && e.staleness.refreshNeeded);
      const blocking = entries.filter(e => e.gapImpact && e.gapImpact.isBlocking);
      if (stale.length || blocking.length) {
        const card = rEl('div', 'r-diag-card');
        card.appendChild(rEl('div', 'r-diag-card-title', 'Alerts'));
        if (blocking.length) {
          const bl = rEl('div', 'r-diag-alert r-diag-alert-block');
          bl.textContent = '⚠ ' + blocking.length + ' blocking gap' + (blocking.length > 1 ? 's' : '');
          card.appendChild(bl);
          blocking.slice(0, 3).forEach(e => {
            const item = rEl('div', 'r-diag-alert-item');
            item.textContent = e.task.slice(0, 50) + (e.task.length > 50 ? '…' : '') + (e.gapImpact.blocksLevel ? ' → ' + e.gapImpact.blocksLevel : '');
            card.appendChild(item);
          });
        }
        if (stale.length) {
          const sl = rEl('div', 'r-diag-alert r-diag-alert-stale');
          sl.textContent = '⏰ ' + stale.length + ' need' + (stale.length === 1 ? 's' : '') + ' refresh';
          card.appendChild(sl);
          stale.slice(0, 3).forEach(e => {
            const item = rEl('div', 'r-diag-alert-item');
            item.textContent = e.task.slice(0, 50) + (e.task.length > 50 ? '…' : '') + (e.staleness.daysSincePractice ? ' (' + e.staleness.daysSincePractice + ' days)' : '');
            card.appendChild(item);
          });
        }
        diagGrid.appendChild(card);
      }

      diagSec.appendChild(diagGrid);
      el.appendChild(diagSec);
    })();

    /* ── v1.10 DIAGNOSTIC SECTIONS ──────────────────────── */

    /* 1. Tracker Health */
    (function buildTrackerHealth() {
      const healthEntries = entries.filter(e => e.trackerHealth && e.trackerHealth.overallHealth);
      if (!healthEntries.length) {
        // Compute health locally from entry quality
        const missingLS  = entries.filter(e => !e.levelScores || e.levelScores.L1 === undefined).length;
        const missingOut = entries.filter(e => !e.assessmentOutcome).length;
        const missingPL  = entries.filter(e => !e.problemLevel).length;
        if (!entries.length) return;
        const health = missingLS > 2 || missingOut > entries.length * 0.5 ? 'Warning' : 'Good';
        const sec = rEl('div', 'r-v110-section');
        sec.appendChild(rEl('div', 'r-section-label', 'Tracker Health (§17.33)'));
        const bar = rEl('div', 'r-th-bar');
        const badge = rEl('span', 'r-th-badge th-' + health.toLowerCase(), health);
        bar.appendChild(badge);
        if (missingLS)  bar.appendChild(rEl('span', 'r-th-item', missingLS  + ' missing level scores'));
        if (missingOut) bar.appendChild(rEl('span', 'r-th-item', missingOut + ' missing outcome'));
        if (missingPL)  bar.appendChild(rEl('span', 'r-th-item', missingPL  + ' missing problem level'));
        sec.appendChild(bar);
        el.appendChild(sec);
        return;
      }
      const latest = healthEntries[healthEntries.length - 1].trackerHealth;
      const sec = rEl('div', 'r-v110-section');
      sec.appendChild(rEl('div', 'r-section-label', 'Tracker Health (§17.33)'));
      const bar = rEl('div', 'r-th-bar');
      const h = latest.overallHealth || 'Unknown';
      bar.appendChild(rEl('span', 'r-th-badge th-' + h.toLowerCase(), h));
      const checks = [
        ['levelScores', latest.recordsWithMissingLevelScores],
        ['noncanonical tags', latest.recordsWithNoncanonicalTags],
        ['outcome', latest.recordsMissingAssessmentOutcome],
        ['problemLevel', latest.recordsMissingProblemLevel],
        ['coverage defects', latest.coverageDefects]
      ];
      checks.forEach(([lbl, val]) => {
        if (val) bar.appendChild(rEl('span', 'r-th-item', val + ' missing ' + lbl));
      });
      if (!checks.some(([,v]) => v)) bar.appendChild(rEl('span', 'r-th-ok', '\u2713 All checks clean'));
      sec.appendChild(bar);
      el.appendChild(sec);
    })();

    /* 2. Assessment Outcome Distribution */
    (function buildOutcomeDist() {
      const withOutcome = entries.filter(e => e.assessmentOutcome);
      if (!withOutcome.length) return;
      const OUTCOMES = ['Demonstrated', 'Partial discovery', 'Concept discovery'];
      const COLORS   = ['var(--done)', 'var(--doing)', '#a78bfa'];
      const freq = {};
      withOutcome.forEach(e => { freq[e.assessmentOutcome] = (freq[e.assessmentOutcome] || 0) + 1; });
      const sec = rEl('div', 'r-v110-section');
      sec.appendChild(rEl('div', 'r-section-label', 'Assessment Outcomes (§17)'));
      const grid = rEl('div', 'r-outcome-grid');
      OUTCOMES.forEach((outcome, i) => {
        const cnt = freq[outcome] || 0;
        const pct = withOutcome.length ? Math.round(cnt / withOutcome.length * 100) : 0;
        const card = rEl('div', 'r-outcome-card');
        const val  = rEl('div', 'r-outcome-val', cnt + '');
        val.style.color = COLORS[i];
        const lbl  = rEl('div', 'r-outcome-lbl', outcome);
        const bw   = rEl('div', 'r-outcome-bar-wrap');
        const bf   = rEl('div', 'r-outcome-bar');
        bf.style.width = pct + '%';
        bf.style.background = COLORS[i];
        bw.appendChild(bf);
        card.appendChild(val);
        card.appendChild(lbl);
        card.appendChild(bw);
        grid.appendChild(card);
      });
      sec.appendChild(grid);
      el.appendChild(sec);
    })();

    /* 3. Concept Discovery Aggregate */
    (function buildConceptDiscovery() {
      const cds = entries.filter(e => e.conceptDiscovery);
      if (!cds.length) return;
      const sec = rEl('div', 'r-v110-section');
      sec.appendChild(rEl('div', 'r-section-label', 'Concept Discovery (§17 §26)'));
      const grid = rEl('div', 'r-diag-grid');

      // Teaching need distribution
      const tnFreq = {};
      cds.forEach(e => { const tn = e.conceptDiscovery.teachingNeed; if (tn && tn !== 'None') tnFreq[tn] = (tnFreq[tn]||0)+1; });
      if (Object.keys(tnFreq).length) {
        const card = rEl('div', 'r-diag-card');
        card.appendChild(rEl('div', 'r-diag-card-title', 'Teaching Need'));
        Object.entries(tnFreq).sort((a,b)=>b[1]-a[1]).forEach(([lbl, cnt]) => {
          const row = rEl('div', 'r-diag-gap-row');
          row.appendChild(rEl('span', 'r-diag-gap-lbl', lbl.replace(' ', '\n')));
          const bw = rEl('div', 'r-diag-gap-bar-wrap'); const bf = rEl('div', 'r-diag-gap-bar');
          bf.style.width = (cnt / Math.max(...Object.values(tnFreq)) * 100) + '%'; bf.style.background = '#a78bfa';
          bw.appendChild(bf); row.appendChild(bw); row.appendChild(rEl('span', 'r-diag-gap-cnt', cnt));
          card.appendChild(row);
        });
        grid.appendChild(card);
      }

      // First-principles signal rate
      const fpFreq = {};
      cds.forEach(e => { const fp = e.conceptDiscovery.firstPrinciplesSignal; if (fp) fpFreq[fp] = (fpFreq[fp]||0)+1; });
      if (Object.keys(fpFreq).length) {
        const card = rEl('div', 'r-diag-card');
        card.appendChild(rEl('div', 'r-diag-card-title', 'First Principles Signal'));
        ['Strong','Moderate','Weak','None'].forEach(lbl => {
          const cnt = fpFreq[lbl] || 0; if (!cnt) return;
          const row = rEl('div', 'r-diag-gap-row');
          const col = lbl==='Strong'?'var(--done)':lbl==='Moderate'?'var(--doing)':lbl==='Weak'?'var(--audit)':'var(--border)';
          row.appendChild(rEl('span', 'r-diag-gap-lbl', lbl));
          const bw = rEl('div', 'r-diag-gap-bar-wrap'); const bf = rEl('div', 'r-diag-gap-bar');
          bf.style.width = (cnt / cds.length * 100) + '%'; bf.style.background = col;
          bw.appendChild(bf); row.appendChild(bw); row.appendChild(rEl('span', 'r-diag-gap-cnt', cnt));
          card.appendChild(row);
        });
        grid.appendChild(card);
      }

      sec.appendChild(grid);
      el.appendChild(sec);
    })();

    /* 4. Retest Queue */
    (function buildRetestQueue() {
      const today = new Date().toISOString().slice(0,10);
      // From retestQueue fields
      const dueNow  = entries.flatMap(e => e.retestQueue && e.retestQueue.dueNow  ? e.retestQueue.dueNow  : []);
      const dueSoon = entries.flatMap(e => e.retestQueue && e.retestQueue.dueSoon ? e.retestQueue.dueSoon : []);
      const blocked = entries.flatMap(e => e.retestQueue && e.retestQueue.blockedBy ? e.retestQueue.blockedBy : []);
      // Also pull from retestPlan
      const planNow  = entries.filter(e => e.retestPlan && e.retestPlan.retestDate && e.retestPlan.retestDate <= today);
      const planSoon = entries.filter(e => e.retestPlan && e.retestPlan.retestDate && e.retestPlan.retestDate > today);
      if (!dueNow.length && !dueSoon.length && !blocked.length && !planNow.length && !planSoon.length) return;

      const sec = rEl('div', 'r-v110-section');
      sec.appendChild(rEl('div', 'r-section-label', 'Retest Queue (§17.25)'));
      const grid = rEl('div', 'r-gc-grid');

      if (dueNow.length || planNow.length) {
        const card = rEl('div', 'r-gc-card');
        card.appendChild(rEl('div', 'r-diag-card-title', '\u26a0 Due Now'));
        [...new Set([...dueNow, ...planNow.map(e => e.task)])].slice(0,5).forEach(item => {
          card.appendChild(rEl('div', 'r-gc-item r-retest-urgent', item.slice(0,60)));
        });
        grid.appendChild(card);
      }
      if (dueSoon.length || planSoon.length) {
        const card = rEl('div', 'r-gc-card');
        card.appendChild(rEl('div', 'r-diag-card-title', 'Due Soon'));
        [...new Set([...dueSoon, ...planSoon.map(e => e.task + ' — ' + e.retestPlan.retestDate)])].slice(0,5).forEach(item => {
          card.appendChild(rEl('div', 'r-gc-item', item.slice(0,60)));
        });
        grid.appendChild(card);
      }
      if (blocked.length) {
        const card = rEl('div', 'r-gc-card');
        card.appendChild(rEl('div', 'r-diag-card-title', 'Blocked By'));
        [...new Set(blocked)].slice(0,5).forEach(item => {
          card.appendChild(rEl('div', 'r-gc-item', item.slice(0,60)));
        });
        grid.appendChild(card);
      }
      sec.appendChild(grid);
      el.appendChild(sec);
    })();

    /* 5. Gap Recurrence */
    (function buildGapRecurrence() {
      const recurring = entries.filter(e => e.gapRecurrence && e.gapRecurrence.isRecurring);
      if (!recurring.length) return;
      const sec = rEl('div', 'r-v110-section');
      sec.appendChild(rEl('div', 'r-section-label', 'Gap Recurrence (§17.23)'));
      const note = recurring.filter(e => e.gapRecurrence.worsening).length;
      if (note) sec.appendChild(rEl('p', 'r-th-item r-gap-warn', '\u26a0 ' + note + ' gap' + (note>1?'s':'')+' worsening'));

      const sorted = [...recurring].sort((a,b) => (b.gapRecurrence.priorOccurrences||0) - (a.gapRecurrence.priorOccurrences||0));
      sorted.slice(0, 6).forEach(e => {
        const row = rEl('div', 'r-recur-row');
        const gr  = e.gapRecurrence;
        const worsening = gr.worsening ? ' \u2191' : '';
        row.appendChild(rEl('span', 'r-recur-task', e.task.slice(0,45) + (e.task.length>45?'\u2026':'')));
        row.appendChild(rEl('span', 'r-recur-cnt' + (gr.worsening?' r-recur-warn':''), (gr.priorOccurrences||0) + 'x' + worsening));
        if (gr.pattern) row.appendChild(rEl('span', 'r-recur-pattern', gr.pattern.slice(0,50)));
        sec.appendChild(row);
      });
      el.appendChild(sec);
    })();

    /* 6. Recovery Behavior */
    (function buildRecoveryBehavior() {
      const withRB = entries.filter(e => e.recoveryBehavior);
      if (!withRB.length) return;
      const sec = rEl('div', 'r-v110-section');
      sec.appendChild(rEl('div', 'r-section-label', 'Recovery Behavior (§17.28)'));
      const grid = rEl('div', 'r-diag-grid');
      const card = rEl('div', 'r-diag-card');
      card.appendChild(rEl('div', 'r-diag-card-title', 'Under Uncertainty'));

      const checks = [
        ['Acknowledged uncertainty', 'acknowledgedUncertainty'],
        ['Reasoned from first principles', 'reasonedFromFirstPrinciples'],
        ['Asked clarifying question', 'askedClarifyingQuestion'],
        ['Avoided fabrication', 'avoidedFabrication']
      ];
      checks.forEach(([lbl, key]) => {
        const yes = withRB.filter(e => e.recoveryBehavior[key] === true).length;
        const row = rEl('div', 'r-diag-five-row');
        row.appendChild(rEl('span', 'r-diag-five-lbl', lbl.slice(0,18)));
        const bw = rEl('div', 'r-diag-five-bar-wrap'); const bf = rEl('div', 'r-diag-five-bar');
        const pct = withRB.length ? yes / withRB.length : 0;
        bf.style.width = (pct*100) + '%'; bf.style.background = pct >= 0.7 ? 'var(--done)' : 'var(--audit)';
        bw.appendChild(bf); row.appendChild(bw);
        row.appendChild(rEl('span', 'r-diag-five-cnt', yes + '/' + withRB.length));
        card.appendChild(row);
      });
      const qualFreq = {};
      withRB.forEach(e => { const q = e.recoveryBehavior.recoveryQuality; if (q) qualFreq[q]=(qualFreq[q]||0)+1; });
      ['Strong','Partial','Weak','None'].forEach(lbl => {
        if (!qualFreq[lbl]) return;
        const row = rEl('div', 'r-diag-five-row');
        const col = lbl==='Strong'?'var(--done)':lbl==='Partial'?'var(--doing)':lbl==='Weak'?'var(--audit)':'var(--text-dim)';
        row.appendChild(rEl('span', 'r-diag-five-lbl', lbl + ' quality'));
        const bw = rEl('div', 'r-diag-five-bar-wrap'); const bf = rEl('div', 'r-diag-five-bar');
        bf.style.width = (qualFreq[lbl]/withRB.length*100) + '%'; bf.style.background = col;
        bw.appendChild(bf); row.appendChild(bw);
        row.appendChild(rEl('span', 'r-diag-five-cnt', qualFreq[lbl]));
        card.appendChild(row);
      });
      grid.appendChild(card);
      sec.appendChild(grid);
      el.appendChild(sec);
    })();

    /* 7. Transfer Signal */
    (function buildTransferSignal() {
      const withTS = entries.filter(e => e.transferSignal && e.transferSignal.sourceConcept);
      if (!withTS.length) return;
      const sec = rEl('div', 'r-v110-section');
      sec.appendChild(rEl('div', 'r-section-label', 'Concept Transfer (§17.24)'));
      const qFreq = {};
      withTS.forEach(e => { const q = e.transferSignal.transferQuality || 'None'; qFreq[q]=(qFreq[q]||0)+1; });
      const strong = withTS.filter(e => (e.transferSignal.transferQuality||'')  === 'Strong').length;
      const pct = withTS.length ? Math.round(strong/withTS.length*100) : 0;
      const bar = rEl('div', 'r-th-bar');
      bar.appendChild(rEl('span', 'r-th-ok', strong + '/' + withTS.length + ' strong transfer (' + pct + '%)'));
      ['Strong','Partial','Weak','None'].forEach(lbl => {
        if (!qFreq[lbl]) return;
        const col = lbl==='Strong'?'var(--done)':lbl==='Partial'?'var(--doing)':lbl==='Weak'?'var(--audit)':'var(--text-dim)';
        const tag = rEl('span', 'r-th-item'); tag.style.color = col; tag.textContent = lbl + ': ' + qFreq[lbl];
        bar.appendChild(tag);
      });
      sec.appendChild(bar);
      // List strong transfers
      withTS.filter(e => e.transferSignal.transferQuality === 'Strong').slice(0,4).forEach(e => {
        const row = rEl('div', 'r-gc-item');
        row.textContent = e.transferSignal.sourceConcept + (e.transferSignal.transferredTo.length ? ' \u2192 ' + e.transferSignal.transferredTo.join(', ') : '');
        sec.appendChild(row);
      });
      el.appendChild(sec);
    })();

    /* 8. Score Lift Actions */
    (function buildScoreLiftActions() {
      const withSLA = entries.filter(e => e.scoreLiftActions && e.scoreLiftActions.toPassNextLevel && e.scoreLiftActions.toPassNextLevel.length);
      if (!withSLA.length) return;
      // Show the most recent 3 distinct actions
      const allActions = [...new Set(withSLA.flatMap(e => e.scoreLiftActions.toPassNextLevel))];
      const sec = rEl('div', 'r-v110-section');
      sec.appendChild(rEl('div', 'r-section-label', 'Score Lift Actions (§17.30)'));
      allActions.slice(0, 5).forEach(action => {
        const row = rEl('div', 'r-lift-row');
        row.appendChild(rEl('span', 'r-lift-dot', '\u25b8'));
        row.appendChild(rEl('span', 'r-lift-text', action));
        sec.appendChild(row);
      });
      el.appendChild(sec);
    })();

    /* 9. Score Uncertainty Summary */
    (function buildScoreUncertainty() {
      const withSU = entries.filter(e => e.scoreUncertainty && Array.isArray(e.scoreUncertainty.range) && e.scoreUncertainty.range.length === 2);
      if (!withSU.length) return;
      const avgRange = withSU.reduce((s, e) => s + (e.scoreUncertainty.range[1] - e.scoreUncertainty.range[0]), 0) / withSU.length;
      const wide = withSU.filter(e => (e.scoreUncertainty.range[1] - e.scoreUncertainty.range[0]) > 15).length;
      const sec = rEl('div', 'r-v110-section');
      sec.appendChild(rEl('div', 'r-section-label', 'Score Uncertainty (§17.22)'));
      const bar = rEl('div', 'r-th-bar');
      const cls = avgRange > 15 ? 'r-th-badge th-warning' : 'r-th-badge th-good';
      bar.appendChild(rEl('span', cls, '\u00b1' + avgRange.toFixed(1) + ' avg range'));
      if (wide) bar.appendChild(rEl('span', 'r-th-item', wide + ' wide-range entries'));
      sec.appendChild(bar);
      // Show top limiters
      const limiters = {};
      withSU.flatMap(e => e.scoreUncertainty.confidenceLimiters || []).forEach(l => { limiters[l]=(limiters[l]||0)+1; });
      Object.entries(limiters).sort((a,b)=>b[1]-a[1]).slice(0,3).forEach(([lbl, cnt]) => {
        sec.appendChild(rEl('div', 'r-gc-item', lbl + ' (' + cnt + ')'));
      });
      el.appendChild(sec);
    })();

    /* Promotion evidence */
    const promoWrap = rEl('div', 'r-promo-section');
    promoWrap.appendChild(rEl('div', 'r-section-label', 'Promotion Evidence Progress'));
    promoWrap.appendChild(rEl('p', 'r-promo-note', 'Each row needs a minimum number of <strong>passing attempts</strong> in that task type. Passing = final score ≥70 · assistance constraint met · difficulty constraint met where shown. Reasons shown below each bar explain why attempts didn’t qualify.'));
    ['L1','L2','L3'].forEach(lvl => {
      const counts = rCountPromoEvidence(entries, lvl);
      const allMet = counts.every(c => c.met);
      const block = rEl('div', 'r-promo-block');
      block.appendChild(rEl('div', 'r-promo-level-label'+(allMet?' r-promo-met':''), (allMet?'\u2713 ':'')+{L1:'Level I',L2:'Level II',L3:'Level III'}[lvl]));
      counts.forEach(c => {
        const row = rEl('div', 'r-promo-row');
        const bw = rEl('div', 'r-promo-bar-wrap'), bf = rEl('div', 'r-promo-bar');
        bf.style.width = Math.min(1, c.count/c.min)*100+'%';
        bf.style.background = c.met ? 'var(--done)' : 'var(--rag)';
        bw.appendChild(bf);
        const qualifyText = c.met
          ? c.count + '/' + c.min + ' ✓'
          : c.count + '/' + c.min + ' needed';
        const reasonText = c.total === 0
          ? 'no attempts yet'
          : c.reasons.length ? c.reasons.join(' · ') : '';
        const rowWrap = rEl('div', 'r-promo-row-wrap');
        const rowMain = rEl('div', 'r-promo-row');
        rowMain.appendChild(rEl('div', 'r-promo-row-label', c.label));
        rowMain.appendChild(rEl('span', 'r-promo-row-count'+(c.met?' r-promo-count-met':''), qualifyText));
        rowMain.appendChild(bw);
        rowWrap.appendChild(rowMain);
        if (reasonText) rowWrap.appendChild(rEl('div', 'r-promo-reason', reasonText));
        block.appendChild(rowWrap);
      });
      promoWrap.appendChild(block);
    });
    el.appendChild(promoWrap);

    if (!total) el.appendChild(rEl('div', 'r-empty', '\ud83d\udcca No entries yet \u2014 use <strong>\uff0b Log Entry</strong> to record or import evaluations.'));
  }

  /* ════ LOG ENTRY ══════════════════════════════════════ */
  (function buildLogEntry() {
    const el = panels['log-entry'];
    const modeBar = rEl('div', 'r-mode-bar');
    const pasteBtn = rEl('button', 'r-mode-btn active', '{ } Paste JSON');
    const quickBtn = rEl('button', 'r-mode-btn', '\u26a1 Quick Log');
    const modeDesc = rEl('p', 'r-mode-desc', 'Paste one entry or an array of entries.');
    modeBar.appendChild(pasteBtn); modeBar.appendChild(quickBtn); modeBar.appendChild(modeDesc);
    el.appendChild(modeBar);

    /* Paste panel */
    const pastePanel = rEl('div', 'r-paste-panel');
    const schemaToggle = rEl('button', 'r-schema-toggle', '\u25b6 Show JSON schema');
    const schemaBlock  = rEl('div', 'r-schema-block r-hidden');
    const SCHEMA_EXAMPLE = {
      date: "2026-06-19", task: "Implement LRU Cache", taskType: "coding",
      domain: "Java / Data Structures", difficulty: 3,
      targetLevel: "L2", assistanceLevel: 0, evidenceClass: "prospective",
      primaryDomain: "Java", secondaryDomains: ["Algorithms/DSA"],
      primaryRole: "SWE", secondaryRoles: [],
      universalSubScores: { correctness: 21, reasoning: 15, judgment: 11, validation: 12, communication: 13, completeness: 8 },
      universalScore: 80, taskSpecificScore: 76, cap: null, penalties: 0,
      levelScores: { L1: 90, L2: 78, L3: 55 },
      demonstratedLevel: "Strong Level I", confidence: "Medium",
      weaknessTags: ["Shallow reasoning","Thin tradeoffs"],
      knowledgeGapTags: ["LinkedHashMap insertion order", "O(1) amortized complexity proof"],
      gapTypes: ["Mechanism gap", "Verification gap"],
      expectedElements: ["Defines LinkedHashMap usage", "States O(1) access"],
      presentElements: ["Defines LinkedHashMap usage"],
      missingElements: ["States O(1) access"],
      elementSource: "Rubric-derived",
      probeReadiness: { firstAnswer: "Pass", oneFollowUp: "Uncertain", deepFollowUp: "Fail", likelyFailurePoint: "Cannot explain why LinkedHashMap maintains insertion order" },
      evidenceSource: ["live coding", "verbal answer"],
      llmIndependence: { llmUsed: false, llmUseType: ["none"], implementationGeneratedByLLM: false, testsGeneratedByLLM: false, answerDraftedByLLM: false, reproducedWithoutLLM: true, explainedWithoutLLM: true, fivePassStatus: { buildPass: true, rewritePass: false, testPass: true, explainPass: true, documentPass: false } },
      assessmentMode: { mode: "live coding", timeLimitMinutes: 25, notesAllowed: false, followUpsAsked: 1, pressureLevel: "Medium" },
      calibration: { evaluatorType: "AI grader", humanReviewed: false, realInterviewSignal: false, calibrationConfidence: "Medium" },
      gapClosureStatus: { status: "open", openedDate: "2026-06-19", closedDate: null, closureEvidence: "", retestRequired: true },
      priority: { severity: "Medium", urgency: "High", roleImpact: "High", nextActionType: "retest", recommendedAction: "Retest LRU Cache verbally with one follow-up about time complexity proof in 5 days." },
      gapImpact: { isBlocking: false, blocksRoles: [], blocksLevel: "None", reason: "" },
      retestPlan: { retestDate: "2026-06-24", retestPrompt: "Explain why LinkedHashMap maintains insertion order for LRU eviction.", successCriteria: ["Names doubly-linked list structure", "Explains O(1) access+removal", "States eviction rule"] },
      proofStrength: { score: 0.55, basis: ["code exists", "tests pass"], missingProof: ["human mock interview", "retest after 7 days"] },
      staleness: { lastPracticed: "2026-06-19", daysSincePractice: 0, stalenessRisk: "Low", refreshNeeded: false },
      antiInflationChecks: { overclaimRisk: "Low", productionClaimSafe: false, ownershipClaimSafe: true, llmDependencyRisk: "Low", notes: "" },
      strengths: "Correct implementation. Identified the right data structures unprompted.",
      weaknesses: "Complexity analysis surface-level. Cannot explain LinkedHashMap internals.",
      nextTarget: "Practice explaining invariants explicitly before writing code.",
      gates: { Correctness: "Pass", Relevance: "Pass", "Independent explanation": "Partial", Evidence: "Pass", "Safety and integrity": "Pass", Completion: "Pass" }
    }
    schemaBlock.appendChild(rEl('pre', 'r-template', JSON.stringify(SCHEMA_EXAMPLE, null, 2)));
    schemaToggle.addEventListener('click', () => {
      const open = !schemaBlock.classList.contains('r-hidden');
      schemaBlock.classList.toggle('r-hidden', open);
      schemaToggle.textContent = open ? '\u25b6 Show JSON schema' : '\u25bc Hide JSON schema';
    });
    pastePanel.appendChild(schemaToggle); pastePanel.appendChild(schemaBlock);
    const textarea = rEl('textarea', 'r-input r-paste-textarea');
    textarea.placeholder = 'Paste a single entry { } or an array [ { }, { } ] and hit Import.';
    pastePanel.appendChild(textarea);
    const pasteActions = rEl('div', 'r-form-actions');
    const importBtn   = rEl('button', 'r-btn', '\u2191 Import');
    const browseBtn   = rEl('button', 'r-btn r-btn-ghost', '\ud83d\udcc1 Browse File');
    const browseFile  = rEl('input', 'r-hidden-file');
    browseFile.type = 'file'; browseFile.accept = '.json';
    const clearBtn2   = rEl('button', 'r-btn r-btn-ghost', 'Clear');
    const pasteMsg    = rEl('div', 'r-save-msg');
    pasteActions.appendChild(importBtn);
    pasteActions.appendChild(browseBtn);
    pasteActions.appendChild(browseFile);
    pasteActions.appendChild(clearBtn2);
    pasteActions.appendChild(pasteMsg);
    pastePanel.appendChild(pasteActions); el.appendChild(pastePanel);

    function doImport(parsed) {
      const existing = rLog(), existIds = new Set(existing.map(e => e.id));
      const normed = parsed.map(rNormaliseEntry);
      const fresh = normed.filter(e => !existIds.has(e.id));
      rSave([...existing, ...fresh].sort((a,b)=>a.date.localeCompare(b.date)));
      const sk = parsed.length - fresh.length;
      pasteMsg.textContent = '\u2713 Imported ' + fresh.length + ' entr' + (fresh.length===1?'y':'ies') + (sk ? ' (' + sk + ' duplicate' + (sk>1?'s':'')+' skipped)' : '') + '.';
      pasteMsg.className = 'r-save-msg r-save-ok';
      if (typeof updateHeaderStats === 'function') updateHeaderStats();
      setTimeout(() => { pasteMsg.textContent=''; }, 5000);
    }

    importBtn.addEventListener('click', () => {
      const raw = textarea.value.trim();
      if (!raw) { pasteMsg.textContent = '\u26a0 Nothing to import.'; pasteMsg.className = 'r-save-msg r-save-err'; return; }
      try {
        let parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) parsed = [parsed];
        if (!parsed.length || typeof parsed[0] !== 'object') throw new Error('Expected an object or array of objects');
        doImport(parsed);
        textarea.value = '';
      } catch(e) {
        pasteMsg.textContent = '\u26a0 ' + e.message;
        pasteMsg.className = 'r-save-msg r-save-err';
      }
    });
    browseBtn.addEventListener('click', () => browseFile.click());
    browseFile.addEventListener('change', () => {
      const file = browseFile.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          let parsed = JSON.parse(ev.target.result);
          if (!Array.isArray(parsed)) parsed = [parsed];
          if (!parsed.length || typeof parsed[0] !== 'object') throw new Error('Expected an object or array of objects');
          doImport(parsed);
          browseFile.value = '';
        } catch(e) {
          pasteMsg.textContent = '\u26a0 ' + e.message;
          pasteMsg.className = 'r-save-msg r-save-err';
        }
      };
      reader.readAsText(file);
    });
    clearBtn2.addEventListener('click', () => { textarea.value=''; pasteMsg.textContent=''; });

    /* Quick log panel */
    const quickPanel = rEl('div', 'r-quick-form r-hidden');
    function qSel(id, opts) {
      const s = rEl('select', 'r-input'); s.id = id;
      opts.forEach(([v,t]) => { const o=document.createElement('option'); o.value=v; o.textContent=t; s.appendChild(o); });
      return s;
    }
    function qField(label, input) {
      const w = rEl('div', 'r-field');
      w.appendChild(rEl('label', 'r-field-label', label)); w.appendChild(input); quickPanel.appendChild(w); return input;
    }
    const qDate = Object.assign(rEl('input','r-input'),{type:'date',id:'ql-date',value:new Date().toISOString().slice(0,10)});
    qField('Date', qDate);
    const qTask = Object.assign(rEl('input','r-input'),{type:'text',id:'ql-task',placeholder:'Task description'});
    qField('Task', qTask);
    const qType = qSel('ql-type',[['','\u2014 type \u2014'],...RD.taskTypes.map(t=>[t.id,t.label])]);
    qField('Task Type', qType);
    const qMiniRow = rEl('div', 'r-score-row');
    [['ql-diff','Difficulty',[['','\u2014'],...RD.difficulty.map(d=>[d.d,`D${d.d}`])]],
     ['ql-assist','Assistance',RD.assistance.map(a=>[a.lvl,`A${a.lvl}`])]].forEach(([id,lbl,opts])=>{
      const f=rEl('div','r-score-field'); f.appendChild(rEl('label','r-field-label',lbl)); f.appendChild(qSel(id,opts)); qMiniRow.appendChild(f);
    });
    const qSF=rEl('div','r-score-field');
    qSF.appendChild(rEl('label','r-field-label','Final Score'));
    const qScore=Object.assign(rEl('input','r-input'),{type:'number',id:'ql-score',min:'0',max:'100',placeholder:'0\u2013100'});
    qSF.appendChild(qScore); qMiniRow.appendChild(qSF); quickPanel.appendChild(qMiniRow);
    const qTagWrap=rEl('div','r-field'); qTagWrap.appendChild(rEl('label','r-field-label','Weakness Tags'));
    const qTagGrid=rEl('div','r-tag-grid');
    RD.weaknessTags.forEach(tag=>{
      const lbl=rEl('label','r-tag-label'),cb=rEl('input','r-tag-cb');
      cb.type='checkbox'; cb.value=tag; cb.name='ql-tags';
      lbl.appendChild(cb); lbl.appendChild(document.createTextNode(' '+tag)); qTagGrid.appendChild(lbl);
    });
    qTagWrap.appendChild(qTagGrid); quickPanel.appendChild(qTagWrap);
    const qNextF=rEl('div','r-field'); qNextF.appendChild(rEl('label','r-field-label','Next Target'));
    const qNext=Object.assign(rEl('input','r-input'),{type:'text',id:'ql-next',placeholder:'Optional'});
    qNextF.appendChild(qNext); quickPanel.appendChild(qNextF);
    const qActions=rEl('div','r-form-actions');
    const qSave=rEl('button','r-btn','\u2713 Save'),qClear=rEl('button','r-btn r-btn-ghost','Clear'),qMsg=rEl('div','r-save-msg');
    qActions.appendChild(qSave); qActions.appendChild(qClear); qActions.appendChild(qMsg);
    quickPanel.appendChild(qActions); el.appendChild(quickPanel);
    qSave.addEventListener('click', () => {
      const task=qTask.value.trim(),taskType=qType.value,score=parseFloat(qScore.value);
      if(!task){qMsg.textContent='\u26a0 Task required.';qMsg.className='r-save-msg r-save-err';return;}
      if(!taskType){qMsg.textContent='\u26a0 Task type required.';qMsg.className='r-save-msg r-save-err';return;}
      if(isNaN(score)){qMsg.textContent='\u26a0 Score required.';qMsg.className='r-save-msg r-save-err';return;}
      const tags=[...quickPanel.querySelectorAll('input[name="ql-tags"]:checked')].map(c=>c.value);
      const entry=rNormaliseEntry({date:qDate.value,task,taskType,
        difficulty:parseInt(document.getElementById('ql-diff')?.value)||0,
        assistanceLevel:parseInt(document.getElementById('ql-assist')?.value)??0,
        universalScore:0,taskSpecificScore:0,finalScore:score,rawScore:score,
        weaknessTags:tags,nextTarget:qNext.value,quickLog:true});
      const ents=rLog(); ents.push(entry); rSave(ents);
      qMsg.textContent='\u2713 Saved.'; qMsg.className='r-save-msg r-save-ok';
      setTimeout(()=>{qMsg.textContent='';},3000);
      [qTask,qNext,qScore].forEach(i=>{i.value='';}); qType.value='';
      quickPanel.querySelectorAll('input[name="ql-tags"]:checked').forEach(c=>{c.checked=false;});
    });
    qClear.addEventListener('click', ()=>{
      [qTask,qNext,qScore].forEach(i=>{i.value='';}); qDate.value=new Date().toISOString().slice(0,10);
      qType.value=''; quickPanel.querySelectorAll('input[name="ql-tags"]').forEach(c=>{c.checked=false;});
      qMsg.textContent='';
    });
    pasteBtn.addEventListener('click',()=>{pasteBtn.classList.add('active');quickBtn.classList.remove('active');pastePanel.classList.remove('r-hidden');quickPanel.classList.add('r-hidden');modeDesc.textContent='Paste one entry or an array of entries.';});
    quickBtn.addEventListener('click',()=>{quickBtn.classList.add('active');pasteBtn.classList.remove('active');quickPanel.classList.remove('r-hidden');pastePanel.classList.add('r-hidden');modeDesc.textContent='Five fields. Score first, details later.';});
  })();

  /* ════ HISTORY ════════════════════════════════════════ */
  function buildHistory() {
    const el = panels['history']; el.innerHTML = '';
    const entries = rLog();
    const hdr = rEl('div', 'r-history-hdr');
    hdr.appendChild(rEl('span', 'r-section-label', `${entries.length} entries`));
    const exportBtn = rEl('button','r-btn r-btn-sm r-btn-ghost','\u2193 Export JSON');
    exportBtn.addEventListener('click', ()=>{
      const blob=new Blob([JSON.stringify(entries,null,2)],{type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
      a.download=`rubric-log-${new Date().toISOString().slice(0,10)}.json`; a.click();
    });
    const importBtn2=rEl('button','r-btn r-btn-sm r-btn-ghost','\u2191 Import JSON');
    const importFile=rEl('input','r-hidden-file'); importFile.type='file'; importFile.accept='.json';
    const importMsg=rEl('div','r-save-msg');
    importBtn2.addEventListener('click',()=>importFile.click());
    importFile.addEventListener('change',()=>{
      const file=importFile.files[0]; if(!file) return;
      const reader=new FileReader();
      reader.onload=ev=>{
        try {
          let parsed=JSON.parse(ev.target.result);
          if(!Array.isArray(parsed)) parsed=[parsed];
          const existing=rLog(),existIds=new Set(existing.map(e=>e.id));
          const normed=parsed.map(rNormaliseEntry);
          const fresh=normed.filter(e=>!existIds.has(e.id));
          rSave([...existing,...fresh].sort((a,b)=>a.date.localeCompare(b.date)));
          const sk=parsed.length-fresh.length;
          importMsg.textContent=`\u2713 Imported ${fresh.length} entr${fresh.length===1?'y':'ies'}${sk?` (${sk} skipped)`:''}`;
          importMsg.className='r-save-msg r-save-ok';
          setTimeout(()=>{importMsg.textContent='';},5000);
          importFile.value=''; buildHistory();
        } catch(e) { importMsg.textContent='\u26a0 '+e.message; importMsg.className='r-save-msg r-save-err'; }
      };
      reader.readAsText(file);
    });
    const clearAllBtn=rEl('button','r-btn r-btn-sm r-btn-ghost r-btn-danger','\u2715 Clear All');
    clearAllBtn.addEventListener('click',()=>{if(confirm('Delete all entries?')){rSave([]);buildHistory();}});
    hdr.appendChild(exportBtn); hdr.appendChild(importBtn2); hdr.appendChild(importFile);
    hdr.appendChild(clearAllBtn); hdr.appendChild(importMsg); el.appendChild(hdr);

    const filterBar=rEl('div','r-filter-bar');
    const typeFilter=rEl('select','r-input r-filter-sel'); typeFilter.id='r-filter-type';
    [['','All types'],...RD.taskTypes.map(t=>[t.id,t.label])].forEach(([v,t])=>{
      const o=document.createElement('option'); o.value=v; o.textContent=t; typeFilter.appendChild(o);
    });
    filterBar.appendChild(typeFilter); el.appendChild(filterBar);
    if(!entries.length){el.appendChild(rEl('div','r-empty','No entries yet.'));return;}
    const tableWrap=rEl('div','r-history-table-wrap'); el.appendChild(tableWrap);

    function renderTable() {
      tableWrap.innerHTML='';
      const ft=typeFilter.value;
      const filtered=[...entries].reverse().filter(e=>!ft||e.taskType===ft);
      if(!filtered.length){tableWrap.appendChild(rEl('div','r-empty','No entries match filter.'));return;}

      filtered.forEach(e=>{
        const band=rScoreBand(e.finalScore);
        const card=rEl('div','r-hist-card');
        const top=rEl('div','r-hist-top');
        const typeTag=rEl('span','r-hist-type');
        typeTag.style.borderColor=rTaskColor(e.taskType); typeTag.textContent=rTaskLabel(e.taskType);
        const title=rEl('div','r-hist-title',e.task+(e.quickLog?' <span class="r-ql-badge">quick</span>':''));
        const ecLabel = e.evidenceClass && e.evidenceClass !== 'prospective'
          ? ` \u00b7 <span class="r-ec-badge">${{classA:'A',classB:'B',classC:'C'}[e.evidenceClass]||e.evidenceClass}</span>` : '';
        const domLabel = (e.primaryDomain||e.domain) ? ` \u00b7 ${e.primaryDomain||e.domain}` : '';
        const roleLabel = e.primaryRole ? ` \u00b7 ${e.primaryRole}` : '';
        const meta=rEl('div','r-hist-meta',
          `${e.date} \u00b7 D${e.difficulty||'\u2014'} \u00b7 A${e.assistanceLevel??'\u2014'}${domLabel}${roleLabel}${ecLabel}`+
          (e.problemLevel?` \u00b7 ${e.problemLevel} problem`:'')+
          (e.demonstratedLevel?` \u00b7 ${e.demonstratedLevel}`:''));
        const right=rEl('div','r-hist-right');
        const score=rEl('span','r-hist-score '+band.cls,e.finalScore);
        const del=rEl('button','r-hist-del','\u2715');
        del.title='Delete entry';
        del.addEventListener('click',()=>{if(confirm('Delete this entry?')){rSave(rLog().filter(x=>x.id!==e.id));renderTable();}});
        right.appendChild(score); right.appendChild(del);
        top.appendChild(typeTag); top.appendChild(title); top.appendChild(meta);
        card.appendChild(top); card.appendChild(right);

        const detail=rEl('div','r-hist-detail r-hist-collapsed');
        const expandBtn=rEl('button','r-hist-expand','\u25b6 Details');

        /* Three level scores */
        if(e.levelScores&&(e.levelScores.L1!==null||e.levelScores.L2!==null||e.levelScores.L3!==null)){
          const lvlRow=rEl('div','r-hist-level-row');
          ['L1','L2','L3'].forEach(lk=>{
            const v=e.levelScores[lk];
            const col=rEl('div','r-hist-level-col');
            col.appendChild(rEl('div','r-hist-level-label',{L1:'Level I',L2:'Level II',L3:'Level III'}[lk]));
            const bnd=v!==null?rScoreBand(v):null;
            col.appendChild(rEl('div','r-hist-level-val '+(bnd?bnd.cls:''),v!==null?v:'\u2014'));
            lvlRow.appendChild(col);
          });
          detail.appendChild(lvlRow);
        }

        /* Radar */
        const pcts=e.universalSubScores?rSubPct(e.universalSubScores):null;
        if(pcts&&pcts.some(p=>p!==null)){
          const radarRow=rEl('div','r-hist-radar-row');
          radarRow.appendChild(rSpider(pcts,140,{showLabels:true,compact:true}));
          const dimList=rEl('div','r-hist-dim-list');
          RD.universalDims.forEach((d,i)=>{
            if(pcts[i]===null) return;
            const row2=rEl('div','r-hist-dim-row');
            const bw=rEl('div','r-hist-dim-bar-wrap'),bf=rEl('div','r-hist-dim-bar');
            bf.style.width=pcts[i]+'%';
            bf.style.background=pcts[i]>=70?'var(--done)':pcts[i]>=50?'var(--doing)':'var(--audit)';
            bw.appendChild(bf);
            row2.appendChild(rEl('span','r-hist-dim-name',d.label));
            row2.appendChild(rEl('span','r-hist-dim-val',`${e.universalSubScores[d.id]}/${d.max}`));
            row2.appendChild(bw); dimList.appendChild(row2);
          });
          radarRow.appendChild(dimList); detail.appendChild(radarRow);
        }

        /* Score table */
        const scoreRows=[
          ['Problem level', e.problemLevel||'\u2014'],['Answer level', e.answerLevel||'\u2014'],
          ['Universal', e.universalScore||'\u2014'],['Task-specific', e.taskSpecificScore||'\u2014'],
          ['Raw', e.rawScore],['Cap', e.cap!==null&&e.cap!==undefined?e.cap:'\u2014'],
          ['Penalty', e.penalties||0],['Final', e.finalScore],
          ['Evidence class', e.evidenceClass||'\u2014'],['Autonomy', e.autonomyConfidence||'\u2014'],
          ['Domain', e.primaryDomain||e.domain||'\u2014'],['Role', e.primaryRole||'\u2014'],
          ['Confidence', e.confidence||'\u2014'],['Survive probing', e.surviveProbing||'\u2014']
        ].filter(([,v])=>v!==undefined&&v!=='');
        detail.appendChild(rTbl(['Field','Value'],scoreRows.map(([f,v])=>[f,String(v)]),'r-hist-dtbl'));

        if(e.mainReasonNextLevelNotReached){
          const nr=rEl('div','r-hist-detail-row');
          nr.appendChild(rEl('span','r-hist-detail-lbl','Why next level not reached'));
          nr.appendChild(rEl('p','r-hist-text',e.mainReasonNextLevelNotReached));
          detail.appendChild(nr);
        }
        if(e.qualifyingEvidenceNote){
          const qn=rEl('div','r-hist-detail-row');
          qn.appendChild(rEl('span','r-hist-detail-lbl','Qualifying evidence note'));
          qn.appendChild(rEl('p','r-hist-text',e.qualifyingEvidenceNote));
          detail.appendChild(qn);
        }
        if(e.weaknessTags?.length){
          const tr2=rEl('div','r-hist-detail-row');
          tr2.appendChild(rEl('span','r-hist-detail-lbl','Weakness tags'));
          const tg=rEl('div','r-hist-tags');
          e.weaknessTags.forEach(t=>tg.appendChild(rEl('span','r-weak-tag r-weak-tag-sm',t)));
          tr2.appendChild(tg); detail.appendChild(tr2);
        }
        [['Strengths',e.strengths],['Weaknesses',e.weaknesses],['Next target',e.nextTarget]].filter(([,v])=>v).forEach(([lbl,v])=>{
          const r2=rEl('div','r-hist-detail-row');
          r2.appendChild(rEl('span','r-hist-detail-lbl',lbl));
          r2.appendChild(rEl('p','r-hist-text'+(lbl==='Next target'?' r-next-target':''),v));
          detail.appendChild(r2);
        });
        const ge=Object.entries(e.gates||{}).filter(([,v])=>v);
        if(ge.length){
          const gr=rEl('div','r-hist-detail-row'); gr.appendChild(rEl('span','r-hist-detail-lbl','Gates'));
          const gl=rEl('div','r-hist-gates');
          ge.forEach(([gate,result])=>{
            const cls=result==='Pass'?'gate-pass':result==='Fail'?'gate-fail':'gate-partial';
            gl.appendChild(rEl('span','r-gate-badge '+cls,`${gate}: ${result}`));
          });
          gr.appendChild(gl); detail.appendChild(gr);
        }
        /* v1.9 diagnostic fields */
        if (e.probeReadiness) {
          const pr = rEl('div','r-hist-detail-row');
          pr.appendChild(rEl('span','r-hist-detail-lbl','Probe readiness'));
          const prv = rEl('div','r-hist-probe-row');
          [['First answer','firstAnswer'],['One follow-up','oneFollowUp'],['Deep','deepFollowUp']].forEach(([lbl,key])=>{
            if (!e.probeReadiness[key]) return;
            const v = e.probeReadiness[key];
            const cls = v==='Pass'?'probe-pass':v==='Fail'?'probe-fail':'probe-unc';
            prv.appendChild(rEl('span','r-probe-badge '+cls, lbl+': '+v));
          });
          if (e.probeReadiness.likelyFailurePoint) {
            prv.appendChild(rEl('span','r-probe-fail-pt', '→ ' + e.probeReadiness.likelyFailurePoint));
          }
          pr.appendChild(prv); detail.appendChild(pr);
        }
        if (e.knowledgeGapTags && e.knowledgeGapTags.length) {
          const kg = rEl('div','r-hist-detail-row');
          kg.appendChild(rEl('span','r-hist-detail-lbl','Knowledge gaps'));
          const tg = rEl('div','r-hist-tags');
          e.knowledgeGapTags.forEach(t => tg.appendChild(rEl('span','r-weak-tag r-weak-tag-sm r-kgtag',t)));
          kg.appendChild(tg); detail.appendChild(kg);
        }
        if (e.gapTypes && e.gapTypes.length) {
          const gt = rEl('div','r-hist-detail-row');
          gt.appendChild(rEl('span','r-hist-detail-lbl','Gap types'));
          const tg = rEl('div','r-hist-tags');
          e.gapTypes.forEach(t => tg.appendChild(rEl('span','r-weak-tag r-weak-tag-sm',t)));
          gt.appendChild(tg); detail.appendChild(gt);
        }
        if (e.llmIndependence) {
          const li = rEl('div','r-hist-detail-row');
          li.appendChild(rEl('span','r-hist-detail-lbl','LLM independence'));
          const lis = rEl('div','r-hist-llm');
          const used = e.llmIndependence.llmUsed ? 'LLM used' : 'LLM-free';
          lis.appendChild(rEl('span', e.llmIndependence.llmUsed?'r-llm-used':'r-llm-free', used));
          if (e.llmIndependence.reproducedWithoutLLM !== undefined)
            lis.appendChild(rEl('span', e.llmIndependence.reproducedWithoutLLM?'r-llm-free':'r-llm-used',
              e.llmIndependence.reproducedWithoutLLM ? '\u2713 reproduced' : '\u2717 not reproduced'));
          if (e.llmIndependence.fivePassStatus) {
            const fps = e.llmIndependence.fivePassStatus;
            const p = ['buildPass','rewritePass','testPass','explainPass','documentPass'];
            const lbs = ['B','Re','T','Ex','D'];
            const frow = rEl('div','r-llm-five');
            p.forEach((k,i) => {
              const s = rEl('span','r-llm-five-item '+(fps[k]?'five-pass':'five-fail'), lbs[i]);
              s.title = ['Build','Rewrite','Test','Explain','Document'][i] + ': ' + (fps[k]?'Pass':'Fail');
              frow.appendChild(s);
            });
            lis.appendChild(frow);
          }
          li.appendChild(lis); detail.appendChild(li);
        }
        if (e.assessmentMode) {
          const am = rEl('div','r-hist-detail-row');
          am.appendChild(rEl('span','r-hist-detail-lbl','Assessment mode'));
          const amv = [
            e.assessmentMode.mode,
            e.assessmentMode.timeLimitMinutes ? e.assessmentMode.timeLimitMinutes+'min' : null,
            e.assessmentMode.notesAllowed ? 'notes allowed' : null,
            e.assessmentMode.followUpsAsked ? e.assessmentMode.followUpsAsked+' follow-ups' : null,
            e.assessmentMode.pressureLevel ? e.assessmentMode.pressureLevel+' pressure' : null
          ].filter(Boolean).join(' \u00b7 ');
          am.appendChild(rEl('p','r-hist-text',amv)); detail.appendChild(am);
        }
        if (e.calibration) {
          const cal = rEl('div','r-hist-detail-row');
          cal.appendChild(rEl('span','r-hist-detail-lbl','Calibration'));
          const calv = [
            e.calibration.evaluatorType,
            e.calibration.humanReviewed ? '\u2713 human reviewed' : null,
            e.calibration.realInterviewSignal ? '\u2713 real interview signal' : null,
            e.calibration.calibrationConfidence ? e.calibration.calibrationConfidence+' confidence' : null
          ].filter(Boolean).join(' \u00b7 ');
          cal.appendChild(rEl('p','r-hist-text',calv)); detail.appendChild(cal);
        }
        if (e.gapImpact && e.gapImpact.isBlocking) {
          const gi = rEl('div','r-hist-detail-row');
          gi.appendChild(rEl('span','r-hist-detail-lbl','\u26a0 Blocking gap'));
          const giv = [
            e.gapImpact.blocksLevel ? 'Blocks '+e.gapImpact.blocksLevel : '',
            e.gapImpact.blocksRoles && e.gapImpact.blocksRoles.length ? e.gapImpact.blocksRoles.join(', ') : '',
            e.gapImpact.reason || ''
          ].filter(Boolean).join(' \u00b7 ');
          gi.appendChild(rEl('p','r-hist-text r-hist-text-warn',giv)); detail.appendChild(gi);
        }
        if (e.priority && e.priority.recommendedAction) {
          const pri = rEl('div','r-hist-detail-row');
          pri.appendChild(rEl('span','r-hist-detail-lbl','Priority action'));
          const badge = rEl('span','r-priority-badge pri-'+( e.priority.severity||'').toLowerCase(), e.priority.severity||'');
          const act = rEl('p','r-hist-text');
          act.appendChild(badge);
          act.appendChild(document.createTextNode(' ' + e.priority.recommendedAction));
          pri.appendChild(act); detail.appendChild(pri);
        }
        if (e.retestPlan && e.retestPlan.retestDate) {
          const rp = rEl('div','r-hist-detail-row');
          rp.appendChild(rEl('span','r-hist-detail-lbl','Retest plan'));
          rp.appendChild(rEl('p','r-hist-text', '\u23f0 ' + e.retestPlan.retestDate + (e.retestPlan.retestPrompt ? ' \u2014 ' + e.retestPlan.retestPrompt : '')));
          detail.appendChild(rp);
        }
        if (e.proofStrength && e.proofStrength.score !== undefined) {
          const ps = rEl('div','r-hist-detail-row');
          ps.appendChild(rEl('span','r-hist-detail-lbl','Proof strength'));
          const pct = Math.round(e.proofStrength.score * 100);
          const bw = rEl('div','r-hist-proof-bar-wrap');
          const bf = rEl('div','r-hist-proof-bar');
          bf.style.width = pct + '%';
          bf.style.background = pct >= 75 ? 'var(--done)' : pct >= 50 ? 'var(--doing)' : 'var(--audit)';
          bw.appendChild(bf);
          const prow = rEl('div','r-hist-proof-row');
          prow.appendChild(bw);
          prow.appendChild(rEl('span','r-hist-proof-val', pct+'%'));
          ps.appendChild(prow); detail.appendChild(ps);
        }

        expandBtn.addEventListener('click',()=>{
          const open=!detail.classList.contains('r-hist-collapsed');
          detail.classList.toggle('r-hist-collapsed',open);
          expandBtn.textContent=open?'\u25b6 Details':'\u25bc Details';
        });
        card.appendChild(expandBtn); card.appendChild(detail); tableWrap.appendChild(card);
      });
    }
    typeFilter.addEventListener('change',renderTable); renderTable();
  }

  /* ════ REFERENCE ══════════════════════════════════════ */
  (function buildReference() {
    const el = panels['reference']; el.className = 'r-view r-ref-view';
    const layout = rEl('div', 'r-ref-layout');
    const nav = rEl('nav', 'r-ref-nav');
    [
      ['ref-contract',  '\u00a71.1 Output Contract'],
      ['ref-calc',      '\u27f3 Score Calculator'],
      ['ref-levels',    '\u00a73 Level Definitions'],
      ['ref-3score',    '\u00a73.1\u20133.3 Three-Score Model'],
      ['ref-gates',     '\u00a74 Mandatory Gates'],
      ['ref-tasks',     '\u00a75 Task Classification'],
      ['ref-diff',      '\u00a76 Difficulty System'],
      ['ref-diffattr',  '\u00a76.1 Attribute Matrix'],
      ['ref-univ',      '\u00a77 Universal Competency'],
      ['ref-taskrub',   '\u00a78 Task Rubrics'],
      ['ref-domains',   '\u00a79 Domain & Role Model'],
      ['ref-retro',     '\u00a710 Retrospective Protocol'],
      ['ref-multibug',  '\u00a711 Multi-Bug Debugging'],
      ['ref-assist',    '\u00a712 Assistance'],
      ['ref-caps',      '\u00a713 Caps & Penalties'],
      ['ref-levelrules','\u00a714 Level Rules'],
      ['ref-bands',     '\u00a715 Score Bands'],
      ['ref-promo',     'Promotion Standard'],
      ['ref-diag',     '\u00a717 Diagnostic Model'],
      ['ref-grading',   '\u00a720 Grading Principles']
    ].forEach(([id, label]) => {
      const a = rEl('a', 'r-ref-nav-link', label); a.href = '#' + id;
      a.addEventListener('click', e => { e.preventDefault(); const t=document.getElementById(id); if(t){t.open=true;t.scrollIntoView({behavior:'smooth',block:'start'});} });
      nav.appendChild(a);
    });
    /* Export button at bottom of nav */
    const exportMdBtn = rEl('button', 'r-ref-export-btn', '\u2193 Export as Markdown');
    exportMdBtn.addEventListener('click', rExportRefMarkdown);
    nav.appendChild(exportMdBtn);

    layout.appendChild(nav);
    const content = rEl('div', 'r-ref-content');

    function addAcc(id, title, fn, open) {
      const body = rEl('div'); fn(body);
      const acc = rAccordion(title, body, open); acc.id = id; content.appendChild(acc);
    }

    /* §1.1 Mandatory grader output contract */
    addAcc('ref-contract', '\u00a71.1 \u2014 Mandatory Grader Output Contract', body => {
      body.appendChild(rEl('p', 'r-note', 'This section is controlling. Any evaluation that reports only one total score is <strong>invalid</strong>, even if it later labels Level I/II/III as demonstrated or not demonstrated.'));
      body.appendChild(rEl('div', 'r-sub-title', 'Required output fields (in order)'));
      body.appendChild(rList([
        'Problem level: Level I / II / III',
        'Difficulty: 1\u20135',
        'Level I answer score: 0\u2013100 with verdict',
        'Level II answer score: 0\u2013100 with verdict',
        'Level III answer score: 0\u2013100 with verdict',
        'Answer level: highest level whose score passes',
        'Qualifying demonstrated level: answer level capped by problem level, difficulty, and autonomy requirements'
      ]));
      body.appendChild(rEl('div', 'r-sub-title', 'Required output template'));
      body.appendChild(rEl('pre', 'r-template',
`Problem level: Level __
Difficulty: __/5

Level I answer score:   __/100 \u2014 Pass / Borderline / Fail
Level II answer score:  __/100 \u2014 Pass / Borderline / Fail
Level III answer score: __/100 \u2014 Pass / Borderline / Fail

Answer level: Level __
Qualifying demonstrated level: Level __
Primary domain: __
Primary role: __
Assistance: __
Caps/penalties: __
Main reason the next level was not reached: __`));
      body.appendChild(rEl('p', 'r-note', '<strong>Validation rule:</strong> If any of the three numerical answer scores is missing, the assessment must be regenerated before it is recorded in the progress tracker.'));
    }, true);

    /* Calculator */
    const calcWrap = rEl('div', 'r-ref-calc-wrap'); calcWrap.id = 'ref-calc';
    calcWrap.appendChild(rEl('div', 'r-ref-plain-title', '\u27f3 Score Calculator'));
    calcWrap.innerHTML += `
      <p style="font-size:11px;color:var(--text-dim);margin:0 0 10px">For each level separately: Level Score = Universal \u00d7 0.60 + Task-Specific \u00d7 0.40</p>
      <div class="r-calc-grid">
        <div class="r-calc-field"><label class="r-field-label">Universal Score</label><input class="r-input" id="rc-u" type="number" min="0" max="100"></div>
        <div class="r-calc-field"><label class="r-field-label">Task-Specific Score</label><input class="r-input" id="rc-t" type="number" min="0" max="100"></div>
        <div class="r-calc-field"><label class="r-field-label">Cap (if any)</label><input class="r-input" id="rc-cap" type="number"></div>
        <div class="r-calc-field"><label class="r-field-label">Penalty Total</label><input class="r-input" id="rc-pen" type="number" value="0"></div>
      </div>
      <div id="rc-result" class="r-result-strip r-result-hidden">
        <div class="r-result-item"><span class="r-result-lbl">Raw (60/40)</span><span class="r-result-val" id="rc-raw">\u2014</span></div>
        <div class="r-result-item"><span class="r-result-lbl">Final Score</span><span class="r-result-val r-result-big" id="rc-final">\u2014</span></div>
        <div class="r-result-item"><span class="r-result-lbl">Verdict</span><span class="r-result-verdict" id="rc-verdict">\u2014</span></div>
      </div>
      <button class="r-btn" id="rc-run">Calculate</button>
      <button class="r-btn r-btn-ghost" id="rc-clear">Clear</button>`;
    content.appendChild(calcWrap);
    setTimeout(() => {
      document.getElementById('rc-run')?.addEventListener('click', ()=>{
        const u=parseFloat(document.getElementById('rc-u')?.value);
        const t=parseFloat(document.getElementById('rc-t')?.value);
        if(isNaN(u)||isNaN(t)) return;
        const raw=rComputeRaw(u,t);
        const final=rComputeFinal(raw,document.getElementById('rc-cap')?.value,parseFloat(document.getElementById('rc-pen')?.value)||0);
        const band=rScoreBand(final);
        document.getElementById('rc-raw').textContent=raw;
        document.getElementById('rc-final').textContent=final;
        const v=document.getElementById('rc-verdict'); v.textContent=band.verdict; v.className='r-result-verdict '+band.cls;
        document.getElementById('rc-result').classList.remove('r-result-hidden');
      });
      document.getElementById('rc-clear')?.addEventListener('click',()=>{
        ['rc-u','rc-t','rc-cap'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
        document.getElementById('rc-pen').value='0';
        document.getElementById('rc-result').classList.add('r-result-hidden');
      });
    }, 0);

    addAcc('ref-levels', '\u00a73 \u2014 Level Definitions', body => {
      body.appendChild(rTbl(['Level','Standard','Typical Scope'],
        RD.levels.map(l => [l.label+' \u2014 '+l.subtitle, l.standard, l.scope])));
    });

    addAcc('ref-3score', '\u00a73.1\u20133.3 \u2014 Three-Score Answer Model', body => {
      body.appendChild(rEl('p','r-note','Every question receives one problem level and one difficulty rating. Every answer receives <strong>three separate criterion-referenced scores</strong>: Level I, Level II, and Level III. The prior single-score output is retired.'));
      body.appendChild(rEl('div','r-sub-title','Scoring lenses'));
      body.appendChild(rTbl(['Level score','Scoring lens'], RD.scoringLenses.map(l=>[l.level,l.lens])));
      body.appendChild(rEl('div','r-sub-title','Key rules'));
      body.appendChild(rList([
        'The same evidence is evaluated three times against progressively stricter standards.',
        'Higher-level scores must not exceed lower-level scores: Level III \u2264 Level II \u2264 Level I.',
        'Answer level = highest level score \u226570 that also passes mandatory gates and autonomy requirements.',
        'Qualifying demonstrated level = the lower of answer level and problem level.',
        'A Level I problem cannot establish Level II or Level III readiness.',
        'Do not average the three scores. They answer different questions.'
      ]));
      body.appendChild(rEl('div','r-sub-title','Example'));
      body.appendChild(rEl('p','r-note','Problem Level II, Difficulty 4. Level I score 93, Level II score 78, Level III score 54. Answer level = Level II (78 \u2265 70). Qualifying demonstrated level = Level II (matches problem level). If same scores but problem was Level I, qualifying evidence = Level I only.'));
    });

    addAcc('ref-gates', '\u00a74 \u2014 Mandatory Gates', body => {
      body.appendChild(rTbl(['Gate','Requirement'], RD.gates.map(g=>[g.gate,g.req])));
      body.appendChild(rEl('p','r-note','Failure in correctness, relevance, or integrity normally produces an overall failing result regardless of other strengths.'));
    });

    addAcc('ref-tasks', '\u00a75 \u2014 Task Classification', body => {
      body.appendChild(rTbl(['Primary task type','Examples'],[
        ['Coding','LeetCode, implementation exercises, algorithms, data structures.'],
        ['Debugging','Broken code, failing tests, semantic defects, production-style failures.'],
        ['Technical knowledge','Java, Spring, React, TypeScript, Python, SQL, AWS, RAG, ML, SDLC.'],
        ['System design','Services, APIs, data models, architecture, scaling, reliability.'],
        ['Production engineering','Testing, CI, Docker, logging, migrations, observability, security.'],
        ['Project walkthrough','Architecture explanation, ownership, tradeoffs, limitations, failure stories.'],
        ['Behavioral technical','Ownership, incidents, disagreement, leadership, cross-functional delivery.']
      ]));
    });

    addAcc('ref-diff', '\u00a76 \u2014 Formal Difficulty System', body => {
      body.appendChild(rEl('p','r-note','Difficulty measures the <strong>task</strong>, not the candidate\u2019s struggle. Assign before the attempt whenever possible.'));
      body.appendChild(rTbl(['D','Label','Definition','Typical level'],
        RD.difficulty.map(d=>[d.d,d.label,d.desc,d.level])));
      body.appendChild(rEl('div','r-sub-title','Calibration rules'));
      body.appendChild(rList([
        'Do not raise difficulty because the candidate struggled.',
        'Do not lower difficulty because the candidate solved it quickly.',
        'Task category alone does not determine difficulty.',
        'A cache bug is not automatically Difficulty 5.',
        'Difficulty affects what the score proves; it does not provide bonus points or excuse weak work.'
      ]));
    });

    addAcc('ref-diffattr', '\u00a76.1 \u2014 Difficulty Attribute Matrix (interactive)', body => {
      const intro = document.createElement('p');
      intro.className = 'r-note';
      intro.innerHTML = 'Select one option per dimension. Score accumulates as you go. All 8 needed for a final D-rating.';
      body.appendChild(intro);

      const calcWrap = document.createElement('div');
      calcWrap.className = 'diff-calc-wrap';
      buildDiffCalculator(calcWrap, (d, total) => {
        // flash result
      });
      body.appendChild(calcWrap);

      body.appendChild(rEl('div', 'r-sub-title', 'Score thresholds'));
      body.appendChild(rTbl(['Attribute total','Difficulty'],
        RD.difficultyThresholds.map(t=>[t.range,'D'+t.d])));
    });

    addAcc('ref-univ', '\u00a77 \u2014 Universal Competency Score (60% of final)', body => {
      body.appendChild(rTbl(['Competency','Weight'],[...RD.universal.map(u=>[u.name,u.weight+' pts']),['<strong>Total</strong>','<strong>100</strong>']]));
      RD.universal.forEach(u=>{
        body.appendChild(rEl('div','r-sub-title',u.name+` <span class="r-weight-badge">${u.weight} pts</span>`));
        body.appendChild(rTbl(['Score','Standard'],u.bands.map(b=>[b.range,b.std]),'r-sub-tbl'));
      });
    });

    addAcc('ref-taskrub', '\u00a78 \u2014 Task-Specific Rubrics (40% of final)', body => {
      const taskNav=rEl('div','r-task-nav'), taskPanels=rEl('div');
      RD.taskRubrics.forEach((tr,idx)=>{
        const btn=rEl('button','r-task-btn'+(idx===0?' active':''),tr.label);
        btn.style.borderColor=rTaskColor(tr.id);
        if(idx===0) btn.style.background=rTaskColor(tr.id)+'22';
        const panel=rEl('div','r-task-panel'+(idx===0?' active':''));
        panel.appendChild(rTbl(['Category','Weight'],[...tr.categories.map(c=>[c.name,c.weight+' pts']),['<strong>Total</strong>','<strong>100</strong>']]));
        if(tr.note) panel.appendChild(rEl('p','r-note','\u26a0 '+tr.note));
        btn.addEventListener('click',()=>{
          taskNav.querySelectorAll('.r-task-btn').forEach((b,bi)=>{b.classList.toggle('active',bi===idx);b.style.background=bi===idx?rTaskColor(RD.taskRubrics[bi].id)+'22':'';});
          taskPanels.querySelectorAll('.r-task-panel').forEach((p,pi)=>p.classList.toggle('active',pi===idx));
        });
        taskNav.appendChild(btn); taskPanels.appendChild(panel);
      });
      body.appendChild(taskNav); body.appendChild(taskPanels);
    });

    addAcc('ref-domains', '\u00a79 \u2014 Domain & Role Evidence Model', body => {
      body.appendChild(rEl('div','r-sub-title','Technical Domain Taxonomy'));
      RD.domainGroups.forEach(g=>{
        body.appendChild(rEl('div','r-sub-title',g.group));
        body.appendChild(rList(g.domains));
      });
      body.appendChild(rEl('div','r-sub-title','Role Competency Taxonomy'));
      body.appendChild(rTbl(['Role','Primary competency weights'],RD.roles.map(r=>[r.label,r.weights])));
      body.appendChild(rEl('div','r-sub-title','Contribution Weights'));
      body.appendChild(rTbl(['Evidence mapping','Default contribution'],RD.domainContributionWeights.map(c=>[c.role,c.pct])));
      body.appendChild(rEl('p','r-note','Contribution weights determine how much an assessment influences rolling domain and role scores. They do not change the underlying performance score.'));
      body.appendChild(rEl('div','r-sub-title','Domain Subcompetencies'));
      RD.domainSubcompetencies.forEach(d=>{
        body.appendChild(rEl('div','r-sub-title',d.domain));
        body.appendChild(rEl('p',null,d.subs));
      });
    });

    addAcc('ref-retro', '\u00a710 \u2014 Retrospective Scoring Protocol', body => {
      body.appendChild(rTbl(['Evidence class','Definition','Trend weight'],
        RD.evidenceClasses.map(e=>[e.label,e.desc,e.weight.toFixed(2)])));
      body.appendChild(rEl('div','r-sub-title','Rules'));
      body.appendChild(rList([
        'Mark difficulty as retrospectively estimated.',
        'Record autonomy as verified, partially verified, or unverified.',
        'Do not infer favorable missing evidence.',
        'Do not score project summaries as if they were observed performances.',
        'Use retrospective results to establish a baseline, not to claim perfect historical comparability.',
        'Prospective assessments become the primary evidence as the dataset grows.'
      ]));
    });

    addAcc('ref-multibug', '\u00a711 \u2014 Multi-Bug Debugging Assessments', body => {
      body.appendChild(rEl('p','r-note','Recommended seeded exercise mix: 1\u00d7 D3, 2\u00d7 D4, 1\u00d7 D5'));
      body.appendChild(rEl('div','r-sub-title','Per-Bug Completion Standard'));
      body.appendChild(rTbl(['Evidence achieved','Max credit'],RD.bugCompletionStandards.map(b=>[b.evidence,b.maxCredit])));
      body.appendChild(rEl('div','r-sub-title','Difficulty Multipliers'));
      body.appendChild(rTbl(['Difficulty','Multiplier'],RD.difficultyMultipliers.map(m=>[m.d,m.mult])));
      body.appendChild(rEl('p','r-note','Exercise Score = \u03a3(Bug Score \u00d7 Difficulty Multiplier) \u00f7 \u03a3(Difficulty Multipliers)'));
    });

    addAcc('ref-assist', '\u00a712 \u2014 Assistance & Autonomy', body => {
      body.appendChild(rTbl(['Level','Assistance','Autonomy implication'],
        RD.assistance.map(a=>[a.lvl,a.desc,a.autonomy])));
    });

    addAcc('ref-caps', '\u00a713 \u2014 Caps & Penalties', body => {
      body.appendChild(rEl('div','r-sub-title','Caps'));
      body.appendChild(rTbl(['Condition','Max score'],RD.caps.map(c=>[c.condition,c.max])));
      body.appendChild(rEl('p','r-note','Applied after raw score. The lowest applicable cap wins.'));
      body.appendChild(rEl('div','r-sub-title','Penalties'));
      body.appendChild(rTbl(['Deficiency','Typical penalty'],RD.penalties.map(p=>[p.deficiency,p.penalty])));
    });

    addAcc('ref-levelrules', '\u00a714 \u2014 Demonstrated-Level Rules', body => {
      body.appendChild(rTbl(['Level','Minimum qualifying pattern'],RD.levelRules.map(r=>[r.level,r.pattern])));
      body.appendChild(rEl('div','r-sub-title','All of the following must hold'));
      body.appendChild(rList([
        'The matching level score must be at least 70.',
        'Correctness gate must pass.',
        'No critical competency may be below 60.',
        'Required difficulty evidence must exist.',
        'Required autonomy level must be met.',
        'Applicable caps must not reduce the score below 70.'
      ]));
    });

    addAcc('ref-bands', '\u00a715 \u2014 Score Interpretation', body => {
      body.appendChild(rTbl(['Score','Verdict'],RD.scoreBands.map(b=>[b.range,`<span class="${b.cls}">${b.verdict}</span>`])));
    });

    addAcc('ref-promo', 'Promotion Evidence Standard', body => {
      ['L1','L2','L3'].forEach(lvl=>{
        body.appendChild(rEl('div','r-sub-title',{L1:'Level I',L2:'Level II',L3:'Level III'}[lvl]+' \u2014 Minimum Evidence'));
        body.appendChild(rList(RD.promotionEvidence[lvl].map(r=>{
          const parts=[r.label];
          if(r.maxAssist!==undefined) parts.push(`assistance \u2264${r.maxAssist}`);
          if(r.minDiff!==undefined)   parts.push(`difficulty \u2265${r.minDiff}`);
          return parts.join(' \u00b7 ');
        })));
      });
      body.appendChild(rEl('p','r-note','Meeting the count alone does not guarantee the level. Quality and breadth of evidence must also meet the bar.'));
    });

    addAcc('ref-diag', '\u00a717 \u2014 Diagnostic Progress Model (v1.9)', body => {
      body.appendChild(rEl('p','r-note','New in v1.9. These fields explain what scores mean over time. They do not replace the three-score model. Populate every field the evidence supports; omit only when evidence is genuinely unavailable.'));
      body.appendChild(rEl('div','r-sub-title','\u00a717.2 Gap Type Classification'));
      body.appendChild(rTbl(['Gap type','Meaning','Typical fix'],[
        ['Conceptual gap','Does not know the concept.','Study and rebuild from fundamentals.'],
        ['Mechanism gap','Knows the label but not how it works.','Explain internals, lifecycle, invariants, or data flow.'],
        ['Application gap','Cannot map concept to real project or scenario.','Apply to repo, architecture, or artifact.'],
        ['Tradeoff gap','Cannot explain alternatives, limitations, or why-not.','Compare options and identify constraints.'],
        ['Recall gap','Likely knows material but could not retrieve it.','Spaced repetition and verbal reps.'],
        ['Verification gap','Makes claims without tests or observable evidence.','Add proof, tests, measurements, or citations.'],
        ['Autonomy gap','Needed too much assistance.','Rebuild unaided and retest.'],
        ['Communication gap','Understood more than communicated.','Practice concise mechanism-level explanation.'],
        ['Scope gap','Solved local issue but missed system impact.','Add dependency-chain and failure-mode analysis.'],
        ['Evidence quality gap','Record too incomplete to score confidently.','Re-run as prospective controlled assessment.']
      ]));
      body.appendChild(rEl('div','r-sub-title','\u00a717.4 Probe Readiness'));
      body.appendChild(rEl('p',null,'firstAnswer \u00b7 oneFollowUp \u00b7 deepFollowUp (Pass / Uncertain / Fail) \u00b7 likelyFailurePoint.'));
      body.appendChild(rEl('div','r-sub-title','\u00a717.7 LLM Independence'));
      body.appendChild(rEl('p',null,'llmUsed \u00b7 llmUseType \u00b7 implementationGeneratedByLLM \u00b7 testsGeneratedByLLM \u00b7 answerDraftedByLLM \u00b7 reproducedWithoutLLM \u00b7 explainedWithoutLLM \u00b7 fivePassStatus: build, rewrite, test, explain, document.'));
      body.appendChild(rEl('div','r-sub-title','\u00a717.8 Role Requirement Coverage'));
      body.appendChild(rEl('p',null,'targetRole \u00b7 requirementsHit \u00b7 requirementsMissing \u00b7 requirementsPartial \u00b7 coverageScore (0.00\u20131.00).'));
      body.appendChild(rEl('p','r-note','Archetypes: Chewy SWE II \u2014 HR Systems, SWE II \u2014 Backend, MLE II \u2014 Legal, DS II \u2014 Customer Care, DE / Analytics Engineering Bridge, Platform / DevOps.'));
      body.appendChild(rEl('div','r-sub-title','\u00a717.9 Artifact Readiness'));
      body.appendChild(rEl('p',null,'readinessStage: idea \u2192 in-progress \u2192 works locally \u2192 tested \u2192 documented \u2192 demo-ready \u2192 portfolio-ready \u2192 interview-defensible \u2192 production-shaped \u2192 production-deployed.'));
      body.appendChild(rEl('div','r-sub-title','\u00a717.10 Staleness'));
      body.appendChild(rTbl(['Days since practice','Default risk'],[['0\u201314','Low'],['15\u201345','Medium'],['46+','High']]));
      body.appendChild(rEl('div','r-sub-title','\u00a717.12 Priority'));
      body.appendChild(rEl('p',null,'severity (Low/Medium/High/Critical) \u00b7 urgency \u00b7 roleImpact \u00b7 nextActionType \u00b7 recommendedAction. High-severity gaps with low role impact should not outrank medium-severity gaps that block the active role.'));
      body.appendChild(rEl('div','r-sub-title','\u00a717.14 Assessment Mode'));
      body.appendChild(rEl('p',null,'mode: written, verbal, live coding, debugging session, project walkthrough, mock interview, real interview. Written untimed answers are weaker readiness evidence than verbal or live-screen evidence.'));
      body.appendChild(rEl('div','r-sub-title','\u00a717.15 Calibration'));
      body.appendChild(rEl('p',null,'evaluatorType: self, AI grader, peer, senior engineer, recruiter, hiring manager, real interviewer.'));
      body.appendChild(rEl('div','r-sub-title','\u00a717.18 Proof Strength (0.00\u20131.00)'));
      body.appendChild(rTbl(['Score','Meaning'],[
        ['0.00\u20130.24','Claim only or weak anecdotal evidence'],
        ['0.25\u20130.49','Partial evidence, not interview-defensible yet'],
        ['0.50\u20130.74','Usable evidence with meaningful gaps'],
        ['0.75\u20130.89','Strong evidence, likely defensible'],
        ['0.90\u20131.00','Very strong: tested, explained, retained, externally calibrated']
      ]));
      body.appendChild(rEl('div','r-sub-title','\u00a717.19 Anti-Inflation'));
      body.appendChild(rEl('p',null,'productionClaimSafe \u00b7 ownershipClaimSafe \u00b7 overclaimRisk \u00b7 llmDependencyRisk. production-shaped must not be described as production experience. ownershipClaimSafe = false when candidate cannot distinguish personal contribution from team, LLM, tutorial, or inherited work.'));
    });

    addAcc('ref-grading', '\u00a720 \u2014 Grading Principles', body => {
      body.appendChild(rList(RD.gradingPrinciples));
    });

    layout.appendChild(content); el.appendChild(layout);
  })();

  window.rubricBuildProgress = buildProgress;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    buildRubric();
    const rubricLive = document.getElementById('pg-rubric-live');
    if (rubricLive && window.rubricBuildProgress) window.rubricBuildProgress(rubricLive);
    if (window.buildProgressNav) window.buildProgressNav();
  });
} else {
  buildRubric();
  const rubricLive = document.getElementById('pg-rubric-live');
  if (rubricLive && window.rubricBuildProgress) window.rubricBuildProgress(rubricLive);
  if (window.buildProgressNav) window.buildProgressNav();
}

/* ══════════════════════════════════════════════════════
   HEADER STATS + STICKY HEIGHT + BURNDOWN
══════════════════════════════════════════════════════ */

/* Set CSS variable for sticky nav height so ref sidebar offsets correctly */
function updateStickyHeight() {
  const stickyEl = document.querySelector('.sticky-top');
  if (stickyEl) {
    document.documentElement.style.setProperty('--sticky-h', stickyEl.offsetHeight + 'px');
  }
}

/* Fill the #hdr-stats sprint bar from rubric log */
function updateHeaderStats() {
  const el = document.getElementById('hdr-stats');
  if (!el) return;

  const entries = (() => {
    try { return JSON.parse(localStorage.getItem('rubric-log-v1') || '[]'); } catch { return []; }
  })();

  const SPRINT_START = new Date(2026, 5, 17);
  const today = new Date();
  const sprintDay = Math.max(1, Math.min(29, Math.round((today - SPRINT_START) / 86400000) + 1));
  const daysLeft  = Math.max(0, 29 - sprintDay + 1);
  const todayStr  = today.toISOString().slice(0, 10);

  const total     = entries.length;
  const todayCount = entries.filter(e => e.date === todayStr).length;
  const passes    = entries.filter(e => e.finalScore >= 70).length;
  const passRate  = total ? Math.round(passes / total * 100) : null;
  const lastFive  = entries.slice(-5);
  const rollingAvg = lastFive.length
    ? +(lastFive.reduce((s, e) => s + e.finalScore, 0) / lastFive.length).toFixed(1) : null;
  const lastLevel = [...entries].reverse().find(e => e.demonstratedLevel)?.demonstratedLevel || null;

  /* Burndown pace calculation */
  const L1_TOTAL = 9, L2_TOTAL = 9;
  const l1Qualifying = (type, minScore) => entries.filter(e =>
    e.taskType === type && e.finalScore >= 70
  ).length;
  const l1Slots = [
    Math.max(0, 3 - entries.filter(e => e.taskType==='coding'    && e.finalScore>=70).length),
    Math.max(0, 2 - entries.filter(e => e.taskType==='debugging'  && e.finalScore>=70).length),
    Math.max(0, 3 - entries.filter(e => e.taskType==='knowledge'  && e.finalScore>=70).length),
    Math.max(0, 1 - entries.filter(e => e.taskType==='walkthrough'&& e.finalScore>=70).length)
  ].reduce((a,b)=>a+b,0);
  const l2Slots = [
    Math.max(0, 3 - entries.filter(e => e.taskType==='coding'    && e.finalScore>=70 && e.assistanceLevel<=2).length),
    Math.max(0, 3 - entries.filter(e => e.taskType==='debugging'  && e.finalScore>=70 && e.assistanceLevel<=2).length),
    Math.max(0, 2 - entries.filter(e => e.taskType==='sysdesign'  && e.finalScore>=70).length),
    Math.max(0, 1 - entries.filter(e => e.taskType==='walkthrough'&& e.finalScore>=70).length)
  ].reduce((a,b)=>a+b,0);
  const slotsLeft   = l1Slots + l2Slots;
  const paceNeeded  = daysLeft > 0 ? (slotsLeft / daysLeft).toFixed(1) : '—';

  el.innerHTML = '';

  const stats = [
    { lbl: 'Sprint Day',  val: `${sprintDay}/29`, cls: '' },
    { lbl: 'Today',       val: todayCount > 0 ? todayCount : 'none', cls: todayCount > 0 ? 'hdr-pass' : '' },
    { lbl: 'All-time',    val: total > 0 ? total : '—', cls: '' },
    { lbl: 'Pass rate',   val: passRate !== null ? passRate + '%' : '—',
      cls: passRate >= 70 ? 'hdr-pass' : passRate >= 50 ? 'hdr-warn' : passRate !== null ? 'hdr-fail' : '' },
    { lbl: 'Avg (5)',     val: rollingAvg !== null ? rollingAvg : '—',
      cls: rollingAvg >= 70 ? 'hdr-pass' : rollingAvg >= 60 ? 'hdr-warn' : rollingAvg !== null ? 'hdr-fail' : '' },
    { lbl: 'L1+L2 pace', val: slotsLeft > 0 ? `${slotsLeft} slots · ${paceNeeded}/day` : '✓ met', cls: slotsLeft === 0 ? 'hdr-pass' : '' },
    ...(lastLevel ? [{ lbl: 'Last level', val: lastLevel, cls: '' }] : [])
  ];

  stats.forEach(s => {
    const div = document.createElement('div');
    div.className = 'hdr-stat';
    div.innerHTML = s.lbl + '<span class="hdr-stat-val ' + s.cls + '">' + s.val + '</span>';
    el.appendChild(div);
  });

  updateStickyHeight();
}

/* Burndown: daily remaining evidence slots for L1 and L2 */
function rBurndownData() {
  const entries = (() => {
    try { return JSON.parse(localStorage.getItem('rubric-log-v1') || '[]'); } catch { return []; }
  })();
  const SPRINT_START = new Date(2026, 5, 17);
  const DAYS = 29;
  const today = new Date();
  const currentDay = Math.max(0, Math.min(DAYS, Math.round((today - SPRINT_START) / 86400000)));

  const L1_REQS = [
    { type: 'coding', min: 3 }, { type: 'debugging', min: 2 },
    { type: 'knowledge', min: 3 }, { type: 'walkthrough', min: 1 }
  ];
  const L2_REQS = [
    { type: 'coding', min: 3, maxAssist: 2 }, { type: 'debugging', min: 3, maxAssist: 2 },
    { type: 'sysdesign', min: 2 }, { type: 'walkthrough', min: 1 }
  ];
  const L1_TOTAL = L1_REQS.reduce((s, r) => s + r.min, 0);
  const L2_TOTAL = L2_REQS.reduce((s, r) => s + r.min, 0);

  function slotsRemaining(reqs, ents) {
    return reqs.reduce((s, req) => {
      const q = ents.filter(e =>
        e.taskType === req.type && e.finalScore >= 70 &&
        (req.maxAssist === undefined || (e.assistanceLevel ?? 0) <= req.maxAssist)
      ).length;
      return s + Math.max(0, req.min - q);
    }, 0);
  }

  const l1Points = [], l2Points = [];
  for (let d = 0; d <= DAYS; d++) {
    const cutoffDate = new Date(SPRINT_START.getTime() + d * 86400000);
    const cutoffStr  = cutoffDate.toISOString().slice(0, 10);
    const dayEntries = entries.filter(e => e.date <= cutoffStr);
    l1Points.push(slotsRemaining(L1_REQS, dayEntries));
    l2Points.push(slotsRemaining(L2_REQS, dayEntries));
  }

  return { l1Points, l2Points, L1_TOTAL, L2_TOTAL, currentDay, DAYS };
}

/* Draw SVG burndown chart */
function rBurndownSVG() {
  const { l1Points, l2Points, L1_TOTAL, L2_TOTAL, currentDay, DAYS } = rBurndownData();
  const W = 540, H = 150, PL = 36, PR = 14, PT = 18, PB = 32;
  const IW = W - PL - PR, IH = H - PT - PB;
  const maxY = L1_TOTAL + L2_TOTAL;

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', '100%'); svg.setAttribute('height', H);
  svg.style.maxWidth = W + 'px'; svg.style.display = 'block';

  const px = d => PL + (d / DAYS) * IW;
  const py = v => PT + IH - (v / maxY) * IH;

  function el(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
  }
  function polyline(points, color, dash, width) {
    return el('polyline', {
      points: points.map(([x,y]) => x+','+y).join(' '),
      fill: 'none', stroke: color,
      'stroke-width': width || '1.5',
      'stroke-linejoin': 'round', 'stroke-linecap': 'round',
      ...(dash ? { 'stroke-dasharray': dash } : {})
    });
  }
  function txt(x, y, content, size, fill, anchor, transform) {
    const t = el('text', {
      x, y, 'font-size': size || 8,
      fill: fill || 'rgba(100,120,140,0.6)',
      'font-family': 'monospace',
      'text-anchor': anchor || 'middle',
      ...(transform ? { transform } : {})
    });
    t.textContent = content;
    return t;
  }

  /* Shaded region under L1 ideal */
  const shadeL1 = el('polygon', {
    points: [
      [px(0), py(L1_TOTAL)], [px(DAYS), py(0)],
      [px(DAYS), py(0)], [px(0), py(L1_TOTAL)]
    ].map(([x,y])=>x+','+y).join(' '),
    fill: 'rgba(16,185,129,0.04)', stroke: 'none'
  });
  svg.appendChild(shadeL1);

  /* Grid lines with slot labels */
  for (let v = 0; v <= maxY; v += 3) {
    const y = py(v);
    svg.appendChild(el('line', { x1: PL, x2: W-PR, y1: y, y2: y,
      stroke: 'rgba(100,120,140,' + (v===0||v===maxY?'0.2':'0.08') + ')',
      'stroke-width': '0.7' }));
    if (v === 0 || v % 6 === 0) {
      svg.appendChild(txt(PL - 5, y + 3, v, 8, 'rgba(100,120,140,0.5)', 'end'));
    }
  }

  /* Day tick marks */
  for (let d = 1; d <= DAYS; d++) {
    svg.appendChild(el('line', { x1: px(d), x2: px(d), y1: PT+IH, y2: PT+IH+3,
      stroke: 'rgba(100,120,140,0.25)', 'stroke-width': '0.7' }));
  }

  /* Ideal burn lines */
  svg.appendChild(polyline([[px(0),py(L1_TOTAL)],[px(DAYS),py(0)]], 'rgba(16,185,129,0.3)', '5,3'));
  svg.appendChild(polyline([[px(0),py(L2_TOTAL)],[px(DAYS),py(0)]], 'rgba(99,102,241,0.3)', '5,3'));

  /* Detect days where slots actually changed (entry was logged) */
  function changeDays(pts, color) {
    for (let d = 1; d < pts.slice(0, currentDay+1).length; d++) {
      if (pts[d] < pts[d-1]) { // slots decreased = qualifying entry logged that day
        svg.appendChild(el('circle', { cx: px(d), cy: py(pts[d]), r: '3.5',
          fill: color, opacity: '0.9',
          stroke: 'var(--surface)', 'stroke-width': '1' }));
      }
    }
  }

  /* Actual lines */
  const l1Actual = l1Points.slice(0, currentDay+1).map((v,d) => [px(d), py(v)]);
  const l2Actual = l2Points.slice(0, currentDay+1).map((v,d) => [px(d), py(v)]);
  if (l1Actual.length > 1) svg.appendChild(polyline(l1Actual, 'rgba(16,185,129,0.9)', null, '2'));
  if (l2Actual.length > 1) svg.appendChild(polyline(l2Actual, 'rgba(99,102,241,0.9)', null, '2'));

  /* Progress dots (days where qualifying entries were logged) */
  changeDays(l1Points, 'rgba(16,185,129,0.9)');
  changeDays(l2Points, 'rgba(99,102,241,0.9)');

  /* Projected completion line based on current velocity */
  const daysElapsed = Math.max(1, currentDay);
  const l1Completed = L1_TOTAL - (l1Points[currentDay] || L1_TOTAL);
  const l2Completed = L2_TOTAL - (l2Points[currentDay] || L2_TOTAL);
  const combined_remaining = (l1Points[currentDay]||L1_TOTAL) + (l2Points[currentDay]||L2_TOTAL);
  const combined_completed = (l1Completed + l2Completed);
  if (combined_completed > 0 && combined_remaining > 0) {
    const slotsPerDay = combined_completed / daysElapsed;
    const daysToCompletion = Math.ceil(combined_remaining / slotsPerDay);
    const projDay = Math.min(currentDay + daysToCompletion, DAYS + 5);
    if (projDay <= DAYS) {
      svg.appendChild(polyline(
        [[px(currentDay), py(combined_remaining)], [px(projDay), py(0)]],
        'rgba(245,158,11,0.4)', '3,3', '1'
      ));
      // Projected finish label
      if (projDay <= DAYS) {
        svg.appendChild(txt(px(projDay), PT - 4, 'proj D'+projDay, 7, 'rgba(245,158,11,0.7)', 'middle'));
      }
    }
  }

  /* Today marker */
  if (currentDay >= 0 && currentDay <= DAYS) {
    svg.appendChild(el('line', { x1: px(currentDay), x2: px(currentDay), y1: PT, y2: PT+IH,
      stroke: 'rgba(245,158,11,0.5)', 'stroke-width': '1', 'stroke-dasharray': '3,2' }));
    // Remaining slot count at today
    const l1rem = l1Points[currentDay] ?? L1_TOTAL;
    const l2rem = l2Points[currentDay] ?? L2_TOTAL;
    const todayLabel = 'L1:' + l1rem + ' L2:' + l2rem;
    svg.appendChild(txt(px(currentDay), PT - 4, todayLabel, 7.5, 'rgba(245,158,11,0.85)', 'middle'));
  }

  /* X axis labels */
  [1, 5, 10, 15, 20, 25, 29].forEach(d => {
    svg.appendChild(txt(px(d), H - 8, 'D'+d, 7.5, undefined, 'middle'));
  });

  /* Y axis label */
  svg.appendChild(txt(9, PT + IH/2, 'slots', 7.5, 'rgba(100,120,140,0.5)', 'middle',
    'rotate(-90, 9, ' + (PT+IH/2) + ')'));

  return svg;
}

/* ── INIT ─────────────────────────────────────────────── */
function initGlobalUI() {
  updateHeaderStats();
  updateStickyHeight();
  window.addEventListener('resize', updateStickyHeight);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGlobalUI);
} else {
  initGlobalUI();
}

/* ══════════════════════════════════════════════════════
   FEATURE: Q BANK → RUBRIC BRIDGE
   When a question is marked Mastered, show a score
   prompt and auto-create a rubric log entry.
══════════════════════════════════════════════════════ */
const QB_TRACK_MAP = {
  swe:   { taskType: 'coding',    domain: 'Java',               role: 'SWE' },
  mle:   { taskType: 'knowledge', domain: 'Machine Learning',   role: 'MLE' },
  ds:    { taskType: 'knowledge', domain: 'Statistical Analysis',role: 'DS'  },
  de:    { taskType: 'knowledge', domain: 'Data Engineering',    role: 'DE'  },
  react: { taskType: 'coding',    domain: 'TypeScript',          role: 'SWE' },
  sql:   { taskType: 'knowledge', domain: 'SQL',                 role: 'DE'  },
  sdlc:  { taskType: 'knowledge', domain: 'Docker/CI/CD',        role: 'SWE' }
};

function qbShowMasteredPrompt(questionText, trackKey) {
  if (document.getElementById('qb-log-prompt')) return;

  const map  = QB_TRACK_MAP[trackKey] || { taskType: 'knowledge', domain: '', role: '' };
  const short = questionText.length > 80 ? questionText.slice(0, 77) + '...' : questionText;

  const overlay = document.createElement('div');
  overlay.id = 'qb-log-prompt';
  overlay.className = 'qb-prompt-overlay';
  overlay.innerHTML = `
    <div class="qb-prompt-box">
      <div class="qb-prompt-title">⚖️ Log to Rubric?</div>
      <div class="qb-prompt-q">${short}</div>
      <div class="qb-prompt-meta">${map.taskType} · ${map.domain} · ${map.role}</div>
      <div class="qb-prompt-row">
        <label class="qb-prompt-label">Your score for this answer (0–100)</label>
        <input id="qb-prompt-score" class="qb-prompt-input" type="number" min="0" max="100" placeholder="e.g. 78">
      </div>
      <div class="qb-prompt-row">
        <label class="qb-prompt-label">Assistance level</label>
        <select id="qb-prompt-assist" class="qb-prompt-input">
          <option value="0">A0 — None</option>
          <option value="1">A1 — Clarification only</option>
          <option value="2">A2 — Directional hint</option>
          <option value="3">A3 — Subsystem identified</option>
        </select>
      </div>
      <div class="qb-prompt-actions">
        <button id="qb-prompt-save" class="qb-prompt-btn qb-prompt-save">✓ Save to Log</button>
        <button id="qb-prompt-skip" class="qb-prompt-btn qb-prompt-skip">Skip</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  document.getElementById('qb-prompt-score').focus();

  function dismiss() { overlay.remove(); }

  document.getElementById('qb-prompt-skip').addEventListener('click', dismiss);
  overlay.addEventListener('click', e => { if (e.target === overlay) dismiss(); });

  document.getElementById('qb-prompt-save').addEventListener('click', () => {
    const scoreEl = document.getElementById('qb-prompt-score');
    const score   = parseFloat(scoreEl.value);
    if (isNaN(score) || score < 0 || score > 100) {
      scoreEl.style.borderColor = 'var(--audit)';
      scoreEl.focus();
      return;
    }
    const assist = parseInt(document.getElementById('qb-prompt-assist').value) || 0;
    const entry  = rNormaliseEntry({
      date:            new Date().toISOString().slice(0, 10),
      task:            short,
      taskType:        map.taskType,
      domain:          map.domain,
      primaryDomain:   map.domain,
      primaryRole:     map.role,
      difficulty:      2,
      assistanceLevel: assist,
      universalScore:  0,
      taskSpecificScore: 0,
      finalScore:      score,
      rawScore:        score,
      quickLog:        true,
      evidenceClass:   'prospective'
    });
    const entries = rLog();
    entries.push(entry);
    rSave(entries);
    if (typeof updateHeaderStats === 'function') updateHeaderStats();

    const toast = document.createElement('div');
    toast.className = 'qb-toast';
    toast.textContent = score >= 70 ? '✓ Logged — pass' : '✓ Logged — below 70';
    toast.style.background = score >= 70 ? 'var(--done)' : 'var(--audit)';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
    dismiss();
  });

  document.getElementById('qb-prompt-score').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('qb-prompt-save').click();
    if (e.key === 'Escape') dismiss();
  });
}

/* Patch markStatus to intercept Mastered clicks */
(function patchQBMastered() {
  const orig = window.qbSetSt;
  // We patch via the event — hook into the mastered btn after each card render
  const _origRenderQBCard = window.renderQBCard;

  // MutationObserver approach: watch for the mastered button to appear
  // and intercept its click before the default handler
  const observer = new MutationObserver(() => {
    const btn = document.getElementById('qb-mastered-btn');
    if (btn && !btn.dataset.logPatched) {
      btn.dataset.logPatched = '1';
      btn.addEventListener('click', () => {
        // Only prompt if we're ADDING mastered (not toggling off)
        const q = QBANK_L1[qbTrack]?.questions[qbIdx];
        const currentStatus = qbGetSt(q?.id);
        if (q && currentStatus !== 'mastered') {
          // Show prompt after a tiny delay so markStatus runs first
          setTimeout(() => qbShowMasteredPrompt(q.q, qbTrack), 50);
        }
      }, true); // capture phase — fires before the existing listener
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const qbEl = document.getElementById('tab-qbank');
      if (qbEl) observer.observe(qbEl, { childList: true, subtree: true });
    });
  } else {
    const qbEl = document.getElementById('tab-qbank');
    if (qbEl) observer.observe(qbEl, { childList: true, subtree: true });
  }
})();


/* ══════════════════════════════════════════════════════
   FEATURE: DIFFICULTY ATTRIBUTE CALCULATOR
   §6.1 eight-dimension matrix → D1–D5
══════════════════════════════════════════════════════ */
const DIFF_DIMS = [
  { id: 'scope',     label: 'Scope',               v: ['One function', 'Multiple files', 'Multiple layers / services'] },
  { id: 'observe',   label: 'Observability',        v: ['Immediate failure', 'Clearly wrong output', 'Plausible successful output'] },
  { id: 'repro',     label: 'Reproduction',         v: ['Direct', 'Special input', 'Sequence / state dependent'] },
  { id: 'testq',     label: 'Test quality',         v: ['Accurate failing test', 'Missing / incomplete test', 'Misleading green test'] },
  { id: 'rcdist',    label: 'Root-cause distance',  v: ['Same line / function', 'Different component', 'Far from symptom'] },
  { id: 'contract',  label: 'Contract complexity',  v: ['Local behavior', 'One interface', 'Multiple contracts / invariants'] },
  { id: 'fixcoord',  label: 'Fix coordination',     v: ['Local edit', 'Code plus tests', 'Multi-layer / state-safe change'] },
  { id: 'falselead', label: 'False-lead density',   v: ['Low', 'Moderate', 'Several plausible causes'] }
];
const DIFF_THRESHOLDS = [[0,2,1],[3,5,2],[6,8,3],[9,12,4],[13,16,5]];
function diffScore(vals) { return vals.reduce((s,v)=>s+(v||0),0); }
function diffLevel(total) { return (DIFF_THRESHOLDS.find(([lo,hi])=>total>=lo&&total<=hi)||[0,0,1])[2]; }

function buildDiffCalculator(container, onResult) {
  // onResult(d, total) called when user has all 8 values
  const vals = Array(8).fill(null);
  const resultDiv = document.createElement('div');
  resultDiv.className = 'diff-calc-result diff-calc-hidden';

  DIFF_DIMS.forEach((dim, i) => {
    const row = document.createElement('div');
    row.className = 'diff-calc-row';
    const lbl = document.createElement('div');
    lbl.className = 'diff-calc-label';
    lbl.textContent = dim.label;
    row.appendChild(lbl);
    const opts = document.createElement('div');
    opts.className = 'diff-calc-opts';
    dim.v.forEach((vtxt, score) => {
      const btn = document.createElement('button');
      btn.className = 'diff-calc-opt';
      btn.dataset.score = score;
      btn.innerHTML = `<span class="diff-calc-score">${score}</span><span class="diff-calc-vtxt">${vtxt}</span>`;
      btn.addEventListener('click', () => {
        opts.querySelectorAll('.diff-calc-opt').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        vals[i] = score;
        const filled = vals.filter(v => v !== null).length;
        const total  = diffScore(vals);
        const d      = diffLevel(total);
        resultDiv.innerHTML = `
          <span class="diff-calc-total">Score: ${filled < 8 ? total + ' / ' + (filled * 2) + ' so far' : total + '/16'}</span>
          <span class="diff-calc-d ${filled === 8 ? 'diff-calc-final' : ''}">→ D${d}</span>
          ${filled === 8 ? '<span class="diff-calc-done">All 8 dimensions scored</span>' : ''}
        `;
        resultDiv.classList.remove('diff-calc-hidden');
        if (filled === 8 && onResult) onResult(d, total);
      });
      opts.appendChild(btn);
    });
    row.appendChild(opts);
    container.appendChild(row);
  });

  const resetBtn = document.createElement('button');
  resetBtn.className = 'diff-calc-reset';
  resetBtn.textContent = 'Reset';
  resetBtn.addEventListener('click', () => {
    vals.fill(null);
    container.querySelectorAll('.diff-calc-opt').forEach(b => b.classList.remove('active'));
    resultDiv.classList.add('diff-calc-hidden');
  });
  container.appendChild(resultDiv);
  container.appendChild(resetBtn);
}


/* ══════════════════════════════════════════════════════
   FEATURE: NEXT-RECOMMENDED WIDGET
   Single highest-leverage action based on evidence gaps
   and days remaining in sprint.
══════════════════════════════════════════════════════ */
function rNextRecommended() {
  const entries    = rLog();
  const SPRINT_START = new Date(2026, 5, 17);
  const today      = new Date();
  const sprintDay  = Math.max(1, Math.min(29, Math.round((today - SPRINT_START) / 86400000) + 1));
  const daysLeft   = Math.max(1, 29 - sprintDay + 1);

  const TASK_LABELS = {
    coding: 'coding', debugging: 'debugging', knowledge: 'technical knowledge',
    sysdesign: 'system design', prodeng: 'production engineering',
    walkthrough: 'project walkthrough', behavioral: 'behavioral technical'
  };

  // Build a priority list across all requirements
  const candidates = [];
  ['L1','L2','L3'].forEach(lvl => {
    RD.promotionEvidence[lvl].forEach(req => {
      const q = entries.filter(e =>
        e.taskType === req.type && e.finalScore >= 70 &&
        (req.maxAssist === undefined || (e.assistanceLevel??0) <= req.maxAssist) &&
        (req.minDiff   === undefined || (e.difficulty??0)    >= req.minDiff)
      ).length;
      const remaining = Math.max(0, req.min - q);
      if (remaining === 0) return; // already met
      const paceNeeded = remaining / daysLeft;
      const totalForType = entries.filter(e => e.taskType === req.type).length;
      const failedForType = entries.filter(e => e.taskType === req.type && e.finalScore < 70).length;
      candidates.push({
        lvl, req, remaining, paceNeeded, totalForType, failedForType
      });
    });
  });

  if (!candidates.length) {
    return { done: true, text: 'All promotion evidence requirements met. 🎉', detail: null };
  }

  // Sort: highest paceNeeded (most urgent), break ties by lowest level first
  const lvlPrio = { L1: 0, L2: 1, L3: 2 };
  candidates.sort((a, b) =>
    b.paceNeeded - a.paceNeeded || lvlPrio[a.lvl] - lvlPrio[b.lvl]
  );

  const top = candidates[0];
  const req = top.req;
  const taskLabel = TASK_LABELS[req.type] || req.type;

  // Build a specific action sentence
  const constraints = [];
  if (req.maxAssist !== undefined) constraints.push(`A≤${req.maxAssist}`);
  if (req.minDiff   !== undefined) constraints.push(`D≥${req.minDiff}`);
  const constraintStr = constraints.length ? ` (${constraints.join(', ')})` : '';

  let action, reason;
  if (top.failedForType > 0 && top.totalForType > 0) {
    // Have attempts but they didn't pass
    action = `Score ≥70 on ${top.remaining} more ${taskLabel} attempt${top.remaining > 1 ? 's' : ''}${constraintStr}`;
    reason = `You have ${top.failedForType} ${taskLabel} attempt${top.failedForType > 1 ? 's' : ''} below 70.`;
  } else if (top.totalForType === 0) {
    // No attempts at all
    action = `Log ${top.remaining} ${taskLabel} attempt${top.remaining > 1 ? 's' : ''}${constraintStr} scoring ≥70`;
    reason = `No ${taskLabel} attempts logged yet.`;
  } else {
    action = `Log ${top.remaining} more passing ${taskLabel} attempt${top.remaining > 1 ? 's' : ''}${constraintStr}`;
    reason = `${top.totalForType - top.failedForType} qualifying so far, need ${req.min}.`;
  }

  const pace = top.paceNeeded < 1
    ? `${(1 / top.paceNeeded).toFixed(1)} days per attempt`
    : `${top.paceNeeded.toFixed(2)} attempts/day`;

  return {
    done: false,
    level: top.lvl,
    action,
    reason,
    pace,
    daysLeft,
    remaining: top.remaining,
    allCount:  candidates.length
  };
}

function buildNextRecommended(el) {
  const rec = rNextRecommended();
  const wrap = document.createElement('div');
  wrap.className = 'r-next-rec';

  if (rec.done) {
    wrap.innerHTML = `<div class="r-next-rec-done">🎉 All promotion evidence requirements met.</div>`;
    el.appendChild(wrap);
    return;
  }

  const lvlColors = { L1: 'var(--done)', L2: 'rgba(99,102,241,0.9)', L3: 'var(--rag)' };
  const lvlColor  = lvlColors[rec.level] || 'var(--text)';

  wrap.innerHTML = `
    <div class="r-next-rec-header">
      <span class="r-next-rec-badge" style="background:${lvlColor}22;color:${lvlColor};border-color:${lvlColor}">
        ${rec.level}
      </span>
      <span class="r-next-rec-label">Next recommended action</span>
      ${rec.allCount > 1 ? `<span class="r-next-rec-count">${rec.allCount} gaps total</span>` : ''}
    </div>
    <div class="r-next-rec-action">${rec.action}</div>
    <div class="r-next-rec-meta">${rec.reason} · ${rec.pace} · ${rec.daysLeft} days remaining</div>
  `;
  el.appendChild(wrap);
}
