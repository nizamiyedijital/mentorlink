(function (App) {
  App.CATEGORIES = {
    kariyer: { label: 'Kariyer & İş Yaşamı', icon: '💼' },
    akademik: { label: 'Akademik / Öğrenci', icon: '🎓' },
    girisim: { label: 'Girişimcilik & İş Kurma', icon: '🚀' },
    kisisel: { label: 'Kişisel Gelişim', icon: '🌱' }
  };

  App.mentorCard = function (m) {
    const tags = m.expertise.slice(0, 3).map(e => `<span class="badge">${e}</span>`).join('');
    return `
      <article class="mentor-card">
        <div class="mentor-header">
          <img src="${m.avatar}" alt="${m.name}" class="mentor-avatar" loading="lazy">
          <div>
            <div class="mentor-name">${m.name}</div>
            <div class="mentor-title">${m.title}</div>
            <div class="mentor-rating">⭐ <strong>${m.rating}</strong> <span>(${m.reviewCount})</span></div>
          </div>
        </div>
        <p class="mentor-bio">${m.bio}</p>
        <div class="mentor-tags">${tags}</div>
        <div class="mentor-footer">
          <div class="mentor-price">₺${m.pricePerSession}<small>/seans</small></div>
          <a href="mentor-detail.html?id=${m.id}" class="btn btn-primary btn-sm">Profili Gör</a>
        </div>
      </article>`;
  };

  App.initMentorsPage = function () {
    const grid = document.querySelector('[data-mentors-grid]');
    if (!grid) return;
    const mentors = App.loadMentors();
    const search = document.querySelector('[data-search]');
    const sort = document.querySelector('[data-sort]');
    const chips = document.querySelectorAll('[data-category-chip]');

    let activeCategory = new URLSearchParams(location.search).get('category') || 'all';
    chips.forEach(c => c.classList.toggle('active', c.dataset.categoryChip === activeCategory));

    function render() {
      const q = (search?.value || '').toLowerCase().trim();
      let list = mentors.filter(m => {
        if (activeCategory !== 'all' && m.category !== activeCategory) return false;
        if (q && !(
          m.name.toLowerCase().includes(q) ||
          m.title.toLowerCase().includes(q) ||
          m.expertise.join(' ').toLowerCase().includes(q)
        )) return false;
        return true;
      });
      const sortVal = sort?.value || 'rating';
      list.sort((a, b) => {
        if (sortVal === 'rating') return b.rating - a.rating;
        if (sortVal === 'price_asc') return a.pricePerSession - b.pricePerSession;
        if (sortVal === 'price_desc') return b.pricePerSession - a.pricePerSession;
        if (sortVal === 'sessions') return b.sessionsCompleted - a.sessionsCompleted;
        return 0;
      });
      if (!list.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-state-icon">🔍</div><h3>Sonuç bulunamadı</h3>
          <p>Farklı bir filtre veya arama terimi deneyin.</p></div>`;
        return;
      }
      grid.innerHTML = list.map(App.mentorCard).join('');
    }

    chips.forEach(c => c.addEventListener('click', () => {
      activeCategory = c.dataset.categoryChip;
      chips.forEach(x => x.classList.toggle('active', x === c));
      render();
    }));
    search?.addEventListener('input', render);
    sort?.addEventListener('change', render);
    render();
  };

  App.initFeaturedMentors = function () {
    const host = document.querySelector('[data-featured-mentors]');
    if (!host) return;
    const mentors = App.loadMentors();
    const featured = [...mentors].sort((a, b) => b.rating - a.rating).slice(0, 4);
    host.innerHTML = featured.map(App.mentorCard).join('');
  };
})(window.App);
