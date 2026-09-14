/* 苔痕集 · 交互脚本
   全部功能都是渐进增强：脚本不跑，页面照样能读。 */
(function () {
  'use strict';

  /* ---------- 首页：搜索 + 按月筛选 ---------- */

  function initFilter() {
    const input = document.getElementById('search-input');
    const chips = document.getElementById('month-chips');
    const list = document.querySelector('.post-list');
    const empty = document.getElementById('empty-state');
    const hint = document.getElementById('result-hint');
    const bar = document.getElementById('month-bar');
    const barLabel = document.getElementById('month-bar-label');
    const olderLink = document.getElementById('older-link');
    if (!input || !list) return;

    // 一个月 = 一个分组，分组里装着若干张卡片
    const groups = Array.from(list.querySelectorAll('.post-group')).map((el) => ({
      el,
      key: el.dataset.month || '',
      label: el.querySelector('.month-head time')?.textContent?.trim() || '',
      cards: Array.from(el.querySelectorAll('.post-card')),
    }));
    if (!groups.length) return;

    let activeMonth = '';

    function apply() {
      const q = input.value.trim().toLowerCase();
      let shown = 0;

      for (const group of groups) {
        const monthHit = !activeMonth || group.key === activeMonth;
        let visibleInGroup = 0;
        for (const card of group.cards) {
          const hit = monthHit && (!q || card.textContent.toLowerCase().includes(q));
          card.hidden = !hit;
          if (hit) visibleInGroup++;
        }
        // 整组都不匹配时，连月份标题一起收起
        group.el.hidden = visibleInGroup === 0;
        shown += visibleInGroup;
      }

      if (empty) empty.hidden = shown !== 0;

      const label = groups.find((g) => g.key === activeMonth)?.label || activeMonth;
      if (hint) {
        const filtering = Boolean(q || activeMonth);
        hint.hidden = !filtering;
        if (filtering) hint.textContent = `筛选出 ${shown} 篇${activeMonth ? ` · ${label}` : ''}`;
      }

      // 正在按月看时给出提示，并把「更早的文章」折叠掉
      if (bar && barLabel) {
        bar.hidden = !activeMonth;
        if (activeMonth) barLabel.textContent = label;
      }
      if (olderLink) olderLink.hidden = Boolean(activeMonth);
    }

    input.addEventListener('input', apply);

    if (chips) {
      chips.addEventListener('click', (event) => {
        const chip = event.target.closest('.chip');
        if (!chip) return;
        chips.querySelectorAll('.chip').forEach((el) => el.classList.toggle('is-active', el === chip));
        activeMonth = chip.dataset.month || '';
        apply();
      });
    }

    // 按 / 直接跳到搜索框
    document.addEventListener('keydown', (event) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = (event.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || event.target.isContentEditable) return;
      event.preventDefault();
      input.focus();
      input.select();
    });

    apply();
  }

  /* ---------- 阅读进度条 ---------- */

  function initProgress() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;
    let ticking = false;

    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
      bar.style.width = `${(ratio * 100).toFixed(2)}%`;
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ---------- 标题锚点 ---------- */

  function initAnchors() {
    const content = document.getElementById('post-content');
    if (!content) return;
    content.querySelectorAll('h2[id], h3[id]').forEach((heading) => {
      const link = document.createElement('a');
      link.className = 'anchor';
      link.href = `#${heading.id}`;
      link.setAttribute('aria-label', '本节链接');
      link.textContent = '#';
      heading.prepend(link);
    });
  }

  /* ---------- 代码块复制 ---------- */

  function initCopy() {
    document.querySelectorAll('.code-block').forEach((block) => {
      const code = block.querySelector('code');
      if (!code) return;
      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.type = 'button';
      btn.textContent = '复制';
      btn.addEventListener('click', async () => {
        const text = code.textContent;
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // 老浏览器或非安全上下文：退回到临时输入框
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }
        btn.textContent = '已复制';
        setTimeout(() => {
          btn.textContent = '复制';
        }, 1400);
      });
      block.appendChild(btn);
    });
  }

  /* ---------- 目录高亮 ---------- */

  function initToc() {
    const links = Array.from(document.querySelectorAll('.toc a[data-toc]'));
    if (!links.length || !('IntersectionObserver' in window)) return;
    const map = new Map(links.map((link) => [link.dataset.toc, link]));
    const headings = Array.from(map.keys())
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!headings.length) return;

    let current = null;
    const setCurrent = (id) => {
      if (id === current) return;
      current = id;
      links.forEach((link) => link.classList.toggle('is-current', link.dataset.toc === id));
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) setCurrent(visible[0].target.id);
      },
      { rootMargin: '-88px 0px -70% 0px', threshold: 0 },
    );

    headings.forEach((heading) => observer.observe(heading));
    setCurrent(headings[0].id);
  }

  function boot() {
    initFilter();
    initProgress();
    initAnchors();
    initCopy();
    initToc();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
