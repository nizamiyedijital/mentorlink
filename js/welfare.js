(function (App) {

  App.renderBadges = function (badges, size) {
    if (!badges || !badges.length) return '';
    const sz = size === 'lg' ? 'badge-lg' : 'badge-sm';
    return badges.map(b => `<span class="welfare-badge ${sz}" title="${b.name}">${b.icon}</span>`).join('');
  };

  App.renderWelfareBar = function (current, nextThreshold, label) {
    const pct = nextThreshold ? Math.min(100, Math.round(current / nextThreshold * 100)) : 100;
    return `
      <div class="welfare-progress">
        <div class="flex-between" style="font-size:0.85rem;">
          <span>${label || 'Refah İlerlemesi'}</span>
          <span>${current}${nextThreshold ? '/' + nextThreshold : ''}</span>
        </div>
        <div class="progress-bar" style="margin-top:0.35rem;">
          <div class="progress-fill welfare-fill" style="width:${pct}%;"></div>
        </div>
      </div>`;
  };

  App.renderMentorReviewSection = function (mentorId, containerEl) {
    const user = App.getCurrentUser();
    const gr = App.getMentorGeneralRating(mentorId);
    const mw = App.getMentorWelfare(mentorId);
    const cfg = App.getBadgeConfig();

    const generalRevs = gr.reviews.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    const users = App.Storage.get(App.Storage.keys.USERS, []);

    const dist = [5,4,3,2,1].map(n => ({ star:n, count: generalRevs.filter(r => r.rating === n).length }));
    const maxDist = Math.max(1, ...dist.map(d => d.count));

    const canReview = user && user.role === 'client' && !App.getGeneralReview(user.id, mentorId) &&
      App.Storage.get(App.Storage.keys.APPOINTMENTS, []).some(a => a.clientId === user.id && a.mentorId === mentorId && a.status === 'completed');

    containerEl.innerHTML = `
      <div class="review-section">
        <div class="grid grid-2" style="gap:1.5rem; margin-bottom:1.5rem;">
          <div class="card" style="text-align:center;">
            <h4 class="mb-sm" style="color:var(--c-muted); text-transform:uppercase; letter-spacing:1px; font-size:0.75rem;">Genel Değerlendirme</h4>
            <div style="font-size:3rem; font-weight:800; line-height:1;">${gr.avg || '—'}</div>
            <div style="font-size:1.3rem; margin:0.5rem 0;">${gr.avg ? '⭐'.repeat(Math.round(gr.avg)) : ''}</div>
            <p class="text-muted">${gr.count} değerlendirme</p>
            <div style="margin-top:0.75rem;">
              ${dist.map(d => `<div class="rating-bar-row">
                <span>${d.star}⭐</span>
                <div class="rating-bar"><div class="rating-bar-fill" style="width:${(d.count/maxDist)*100}%;"></div></div>
                <span>${d.count}</span>
              </div>`).join('')}
            </div>
          </div>
          <div class="card" style="text-align:center;">
            <h4 class="mb-sm" style="color:var(--c-muted); text-transform:uppercase; letter-spacing:1px; font-size:0.75rem;">Refah Puanı</h4>
            <div style="font-size:3rem; font-weight:800; line-height:1; color:var(--c-primary);">🌿 ${mw.total}</div>
            <p class="text-muted" style="margin-top:0.5rem;">${mw.count} seans değerlendirmesi</p>
            <div style="margin-top:0.75rem;">
              ${App.renderBadges(mw.badges, 'lg')}
            </div>
            ${mw.badges.length ? `<p class="text-muted" style="font-size:0.8rem; margin-top:0.5rem;">${mw.badges[mw.badges.length-1].name}</p>` : ''}
            ${(() => {
              const next = cfg.mentorBadges.find(b => b.threshold > mw.total);
              return next ? App.renderWelfareBar(mw.total, next.threshold, 'Sonraki rozet: ' + next.icon + ' ' + next.name) : '';
            })()}
          </div>
        </div>

        ${canReview ? `
        <div class="card mb-lg" style="border:2px solid var(--c-primary);">
          <h3 class="mb-md">Bu Mentörü Değerlendir</h3>
          <p class="text-muted mb-md">Genel deneyimini 1 kez paylaşabilirsin.</p>
          <form data-general-review-form>
            <div class="star-picker-lg" data-gr-stars>
              ${[1,2,3,4,5].map(n => `<span class="star-btn-lg ${n <= 5 ? 'active' : ''}" data-grstar="${n}">⭐</span>`).join('')}
            </div>
            <div class="form-group"><label>Yorumun</label>
              <textarea class="form-textarea" name="comment" rows="3" required minlength="10" placeholder="Bu mentörle deneyimini paylaş..."></textarea></div>
            <button type="submit" class="btn btn-primary">Değerlendirmeyi Gönder</button>
          </form>
        </div>` : ''}

        <h3 class="mb-md">Değerlendirmeler (${generalRevs.length})</h3>
        ${generalRevs.length === 0 ? '<p class="text-muted">Henüz değerlendirme yok.</p>' : `
        <div class="card" style="padding:0;">
          ${generalRevs.map(r => {
            const u = users.find(x => x.id === r.clientId);
            const cw = App.getClientWelfare(r.clientId);
            return `<div class="review-item">
              <div class="flex-between">
                <div class="flex" style="gap:0.5rem; align-items:center;">
                  <strong>${u?.name || 'Danışan'}</strong>
                  ${App.renderBadges(cw.badges.slice(-1), 'sm')}
                  <span>${'⭐'.repeat(r.rating)}</span>
                </div>
                <span class="text-muted" style="font-size:0.8rem;">${new Date(r.createdAt).toLocaleDateString('tr-TR')}</span>
              </div>
              ${r.comment ? `<p style="margin-top:0.5rem; color:var(--c-text-light);">${r.comment}</p>` : ''}
            </div>`;
          }).join('')}
        </div>`}
      </div>`;

    // bind general review form
    if (canReview) {
      let selRating = 5;
      const stars = containerEl.querySelectorAll('[data-grstar]');
      stars.forEach(s => s.addEventListener('click', () => {
        selRating = parseInt(s.dataset.grstar);
        stars.forEach(x => x.classList.toggle('active', parseInt(x.dataset.grstar) <= selRating));
      }));
      containerEl.querySelector('[data-general-review-form]').addEventListener('submit', e => {
        e.preventDefault();
        const comment = new FormData(e.target).get('comment');
        App.submitGeneralReview(user.id, mentorId, selRating, comment);
        App.toast('Değerlendirmen gönderildi!', 'success');
        App.renderMentorReviewSection(mentorId, containerEl);
      });
    }
  };

  // Session note modal for mentor
  App.openSessionNoteModal = function (apt, onDone) {
    const existing = App.getSessionNote(apt.id);
    const modal = App.openModal(`
      <div class="modal-header"><h3>Kazanım Özeti Yaz</h3><button class="modal-close" data-modal-close>×</button></div>
      <p class="text-muted mb-md">${apt.clientName} — ${apt.date} ${apt.time}</p>
      <form data-note-form>
        <div class="form-group">
          <label>Bu seanstaki kazanımları özetle (min. ${App.getBadgeConfig().minNoteLength} karakter)</label>
          <textarea class="form-textarea" name="summary" rows="5" required minlength="${App.getBadgeConfig().minNoteLength}"
            placeholder="Danışanla bu seansta neler ele alındı? Hangi kazanımlar elde edildi?">${existing?.summary || ''}</textarea>
          <span class="text-muted" style="font-size:0.8rem;" data-charcount></span>
        </div>
        <button type="submit" class="btn btn-primary btn-block">${existing ? 'Güncelle' : 'Kaydet'}</button>
      </form>`);

    const ta = modal.querySelector('textarea[name="summary"]');
    const cc = modal.querySelector('[data-charcount]');
    const update = () => { cc.textContent = ta.value.length + ' karakter'; };
    ta.addEventListener('input', update); update();

    modal.querySelector('[data-note-form]').addEventListener('submit', e => {
      e.preventDefault();
      App.writeSessionNote(apt.id, apt.mentorId, apt.clientId, ta.value);
      modal.remove();
      App.toast('Kazanım özeti kaydedildi.', 'success');
      onDone && onDone();
    });
  };

  // Welfare rating modal for client
  App.openWelfareRatingModal = function (apt, onDone) {
    const note = App.getSessionNote(apt.id);
    if (!note) { App.toast('Mentör henüz kazanım özeti yazmamış.', 'error'); return; }
    const cfg = App.getBadgeConfig();
    let selScore = 4;
    const modal = App.openModal(`
      <div class="modal-header"><h3>🌿 Refah Değerlendirmesi</h3><button class="modal-close" data-modal-close>×</button></div>
      <p class="text-muted mb-sm">${apt.mentorName} — ${apt.date} ${apt.time}</p>
      <div class="card" style="background:var(--c-bg); margin-bottom:1rem;">
        <h4 style="font-size:0.85rem; color:var(--c-muted); margin-bottom:0.5rem;">Mentörün Kazanım Özeti</h4>
        <p style="line-height:1.7;">${note.summary}</p>
      </div>
      <form data-welfare-form>
        <div class="form-group">
          <label>Bu seansın sana katkısını değerlendir (1-${cfg.welfareMax})</label>
          <div class="welfare-picker" data-wpicker>
            ${Array.from({length: cfg.welfareMax}, (_,i) => i+1).map(n => `
              <button type="button" class="welfare-btn ${n <= 4 ? 'active' : ''}" data-wscore="${n}">
                <span class="welfare-btn-num">${n}</span>
                <span class="welfare-btn-label">${['Düşük','Az','Orta','İyi','Mükemmel'][n-1] || n}</span>
              </button>`).join('')}
          </div>
        </div>
        <div class="form-group"><label>Ek yorum (opsiyonel)</label>
          <textarea class="form-textarea" name="comment" rows="2" placeholder="Bu seans hakkında..."></textarea></div>
        <button type="submit" class="btn btn-primary btn-block">🌿 Değerlendirmeyi Gönder</button>
      </form>`);

    modal.querySelectorAll('[data-wscore]').forEach(b => b.addEventListener('click', () => {
      selScore = parseInt(b.dataset.wscore);
      modal.querySelectorAll('[data-wscore]').forEach(x => x.classList.toggle('active', parseInt(x.dataset.wscore) <= selScore));
    }));

    modal.querySelector('[data-welfare-form]').addEventListener('submit', e => {
      e.preventDefault();
      const result = App.submitWelfareRating(apt.id, apt.clientId, apt.mentorId, selScore, new FormData(e.target).get('comment'));
      modal.remove();
      if (result.newBadge) {
        setTimeout(() => App.toast(`🎉 Yeni rozet kazandın: ${result.newBadge.icon} ${result.newBadge.name}!`, 'success'), 300);
      } else {
        App.toast('Refah değerlendirmesi kaydedildi.', 'success');
      }
      onDone && onDone();
    });
  };

})(window.App);
