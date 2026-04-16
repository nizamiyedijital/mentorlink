(function (App) {
  App.renderNavbar = function () {
    const host = document.querySelector('[data-navbar]');
    if (!host) return;
    const user = App.getCurrentUser();
    const path = window.location.pathname.split('/').pop() || 'index.html';
    const link = (href, label) => `<li><a href="${href}" class="${path === href ? 'active' : ''}">${label}</a></li>`;

    const authSection = user ? `
      ${user.role === 'admin' ? `<a href="admin.html" class="btn btn-ghost btn-sm">Admin</a>` : ''}
      ${user.role !== 'admin' ? `<a href="${user.role === 'mentor_candidate' ? 'become-mentor.html' : 'dashboard.html'}" class="btn btn-ghost btn-sm">${user.name}</a>` : ''}
      ${user.role !== 'admin' ? `<a href="settings.html" class="btn btn-ghost btn-sm" title="Ayarlar">⚙️</a>` : ''}
      <button class="btn btn-outline btn-sm" data-logout>Çıkış</button>
    ` : `
      <a href="login.html" class="btn btn-ghost btn-sm">Giriş</a>
      <a href="register.html" class="btn btn-primary btn-sm">Kayıt Ol</a>
    `;

    host.outerHTML = `
      <nav class="navbar">
        <div class="container navbar-inner">
          <a href="index.html" class="logo">
            <span class="logo-mark">M</span>
            <span>Mentor<span class="text-gradient">Link</span></span>
          </a>
          <ul class="nav-links">
            ${link('index.html', 'Ana Sayfa')}
            ${link('mentors.html', 'Mentörler')}
            ${link('become-mentor.html', 'Mentör Ol')}
            ${link('pricing.html', 'Üyelik')}
          </ul>
          <div class="nav-cta">${authSection}</div>
          <button class="nav-toggle" data-nav-toggle aria-label="Menü">☰</button>
        </div>
      </nav>`;

    document.querySelectorAll('[data-logout]').forEach(btn => {
      btn.addEventListener('click', () => { App.logout(); window.location.href = 'index.html'; });
    });
    const toggle = document.querySelector('[data-nav-toggle]');
    if (toggle) toggle.addEventListener('click', () => toggle.closest('.navbar').classList.toggle('open'));
  };

  App.renderFooter = function () {
    const host = document.querySelector('[data-footer]');
    if (!host) return;
    host.outerHTML = `
      <footer class="footer">
        <div class="container">
          <div class="footer-grid">
            <div>
              <div class="logo" style="color:#fff; margin-bottom: 1rem;">
                <span class="logo-mark">M</span><span>MentorLink</span>
              </div>
              <p style="color:#9CA3AF; font-size:0.9rem;">Öğrencileri ve profesyonelleri, alanında uzman mentörlerle buluşturan kariyer ve gelişim platformu.</p>
            </div>
            <div><h4>Keşfet</h4><a href="mentors.html">Mentörler</a><a href="pricing.html">Üyelik Paketleri</a><a href="become-mentor.html">Mentör Ol</a></div>
            <div><h4>Şirket</h4><a href="#">Hakkımızda</a><a href="#">Blog</a><a href="#">İletişim</a></div>
            <div><h4>Yasal</h4><a href="#">Kullanım Şartları</a><a href="#">Gizlilik Politikası</a><a href="#">KVKK</a></div>
          </div>
          <div class="footer-bottom">© ${new Date().getFullYear()} MentorLink. Tüm hakları saklıdır.</div>
        </div>
      </footer>`;
  };

  App.toast = function (message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s';
      setTimeout(() => el.remove(), 300);
    }, 3200);
  };

  App.openModal = function (contentHtml) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal" role="dialog">${contentHtml}</div>`;
    overlay.addEventListener('click', e => {
      if (e.target === overlay || e.target.matches('[data-modal-close]')) overlay.remove();
    });
    document.body.appendChild(overlay);
    return overlay;
  };
})(window.App);
