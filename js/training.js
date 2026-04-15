(function (App) {
  App.initTrainingPage = function () {
    const host = document.querySelector('[data-training]');
    if (!host) return;
    const user = App.requireAuth();
    if (!user) return;

    const trainings = App.loadTrainings();
    const allProgress = App.Storage.get(App.Storage.keys.TRAINING_PROGRESS, {});
    const userProgress = allProgress[user.id] || [];
    let activeIdx = 0;

    function render() {
      const active = trainings[activeIdx];
      const completed = userProgress.length;
      const pct = Math.round((completed / trainings.length) * 100);
      const allDone = completed >= trainings.length;

      host.innerHTML = `
        <div class="training-progress"><div class="training-progress-bar" style="width:${pct}%"></div></div>
        <p class="text-muted mb-lg">İlerleme: ${completed}/${trainings.length} bölüm (%${pct})</p>
        <div class="training-layout">
          <nav class="training-nav">
            ${trainings.map((t, i) => `
              <div class="training-nav-item ${i === activeIdx ? 'active' : ''} ${userProgress.includes(t.id) ? 'done' : ''}"
                   data-idx="${i}"><span>${i + 1}. ${t.title}</span></div>
            `).join('')}
          </nav>
          <article class="training-content">
            <span class="badge badge-primary mb-sm" style="display:inline-block;">Bölüm ${activeIdx + 1} • ${active.duration}</span>
            <h2 class="mb-md">${active.title}</h2>
            <div class="video-placeholder">▶</div>
            <p style="line-height:1.9; color:var(--c-text-light); font-size:1.05rem;">${active.content}</p>
            <div class="flex-between" style="margin-top:2rem; flex-wrap:wrap; gap:1rem;">
              <button class="btn btn-ghost" data-prev ${activeIdx === 0 ? 'disabled' : ''}>← Önceki</button>
              ${userProgress.includes(active.id)
                ? `<span class="badge badge-success">✓ Tamamlandı</span>`
                : `<button class="btn btn-primary" data-complete>Bölümü Tamamla</button>`}
              <button class="btn btn-ghost" data-next ${activeIdx === trainings.length - 1 ? 'disabled' : ''}>Sonraki →</button>
            </div>
            ${allDone ? `
              <div class="card" style="margin-top:2rem; background: var(--c-gradient); color:#fff; text-align:center;">
                <h3 style="color:#fff;">🎉 Tüm eğitimleri tamamladınız!</h3>
                <p style="opacity:0.95; margin:0.5rem 0 1rem;">Şimdi sınava girerek mentör sertifikanızı kazanabilirsiniz.</p>
                <a href="quiz.html" class="btn" style="background:#fff; color:var(--c-primary);">Sınava Başla</a>
              </div>` : ''}
          </article>
        </div>`;
      host.querySelectorAll('[data-idx]').forEach(el => {
        el.addEventListener('click', () => { activeIdx = Number(el.dataset.idx); render(); });
      });
      host.querySelector('[data-prev]')?.addEventListener('click', () => { if (activeIdx > 0) { activeIdx--; render(); } });
      host.querySelector('[data-next]')?.addEventListener('click', () => { if (activeIdx < trainings.length - 1) { activeIdx++; render(); } });
      host.querySelector('[data-complete]')?.addEventListener('click', () => {
        if (!userProgress.includes(active.id)) userProgress.push(active.id);
        allProgress[user.id] = userProgress;
        App.Storage.set(App.Storage.keys.TRAINING_PROGRESS, allProgress);
        if (activeIdx < trainings.length - 1) activeIdx++;
        render();
      });
    }
    render();
  };
})(window.App);
