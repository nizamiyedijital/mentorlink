window.App = window.App || {};

(function (App) {
  const KEYS = {
    USERS: 'mp_users',
    APPLICATIONS: 'mp_applications',
    APPOINTMENTS: 'mp_appointments',
    SUBSCRIPTIONS: 'mp_subscriptions',
    APPROVED_MENTORS: 'mp_approved_mentors',
    CURRENT_USER: 'mp_current_user',
    TRAINING_PROGRESS: 'mp_training_progress',
    QUIZ_RESULTS: 'mp_quiz_results',
    AVAILABILITY: 'mp_availability',
    PAYMENTS: 'mp_payments',
    REVIEWS: 'mp_reviews',
    SEEDED: 'mp_seeded_v3'
  };

  App.COMMISSION_RATE = 0.20;

  App.Storage = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch { return fallback; }
    },
    set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
    remove(key) { localStorage.removeItem(key); },
    keys: KEYS
  };

  App.uid = function (prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  };

  function defaultAvailability() {
    const workDay = [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }];
    return {
      weekly: { mon: workDay, tue: workDay, wed: workDay, thu: workDay, fri: workDay, sat: [], sun: [] },
      sessionDuration: 60,
      buffer: 15,
      sessionTypes: ['online', 'offline'],
      minNoticeHours: 4,
      cancellationHours: 24,
      blockedDates: []
    };
  }

  App.defaultAvailability = defaultAvailability;

  App.seedOnce = function () {
    if (App.Storage.get(KEYS.SEEDED)) return;
    const nowISO = new Date().toISOString();
    const users = [
      { id: 'admin_demo', name: 'Admin', email: 'admin@demo', password: 'admin', role: 'admin', createdAt: nowISO },
      { id: 'u_m1', name: 'Dr. Elif Yılmaz', email: 'mentor@demo', password: 'mentor', role: 'mentor', linkedMentorId: 'm1', createdAt: nowISO },
      { id: 'u_m2', name: 'Ahmet Kaya', email: 'ahmet@demo', password: 'mentor', role: 'mentor', linkedMentorId: 'm2', createdAt: nowISO },
      { id: 'u_m3', name: 'Prof. Dr. Ayşe Demir', email: 'ayse@demo', password: 'mentor', role: 'mentor', linkedMentorId: 'm3', createdAt: nowISO },
      { id: 'u_c1', name: 'Mert Özkan', email: 'client@demo', password: 'client', role: 'client', createdAt: nowISO },
      { id: 'u_c2', name: 'Zeynep Arslan', email: 'zeynep@demo', password: 'client', role: 'client', createdAt: nowISO },
      { id: 'u_c3', name: 'Can Yıldız', email: 'can@demo', password: 'client', role: 'client', createdAt: nowISO },
      { id: 'u_c4', name: 'Selin Koç', email: 'selin@demo', password: 'client', role: 'client', createdAt: nowISO }
    ];
    App.Storage.set(KEYS.USERS, users);
    App.Storage.set(KEYS.APPLICATIONS, []);
    App.Storage.set(KEYS.APPROVED_MENTORS, []);
    App.Storage.set(KEYS.TRAINING_PROGRESS, {});
    App.Storage.set(KEYS.QUIZ_RESULTS, {});

    const avail = {};
    (window.SEED_MENTORS || []).forEach(m => { avail[m.id] = defaultAvailability(); });
    App.Storage.set(KEYS.AVAILABILITY, avail);

    const now = new Date();
    const fmt = d => d.toISOString().split('T')[0];
    const fmtT = d => String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    const clone = d => new Date(d.getTime());
    const offset = (days, h=10, m=0) => { const d = clone(now); d.setDate(d.getDate()+days); d.setHours(h,m,0,0); return d; };

    const mentorMap = {};
    (window.SEED_MENTORS || []).forEach(m => { mentorMap[m.id] = m; });

    const appointments = [];
    const payments = [];
    const reviews = [];

    let aptIdx = 0, payIdx = 0, revIdx = 0;
    function addApt(cfg) {
      const apt = {
        id: `apt_${++aptIdx}`,
        clientId: cfg.clientId,
        clientName: users.find(u => u.id === cfg.clientId).name,
        mentorId: cfg.mentorId,
        mentorName: mentorMap[cfg.mentorId].name,
        date: fmt(cfg.when),
        time: fmtT(cfg.when),
        type: cfg.type || 'online',
        note: cfg.note || '',
        price: mentorMap[cfg.mentorId].pricePerSession,
        status: cfg.status,
        meetLink: cfg.status === 'paid' || cfg.status === 'completed'
          ? (cfg.type === 'offline' ? null : 'https://meet.google.com/demo-' + aptIdx) : null,
        createdAt: new Date(cfg.when.getTime() - 5*24*3600*1000).toISOString(),
        approvedAt: ['approved','paid','completed','no_show'].includes(cfg.status) ? new Date(cfg.when.getTime() - 4*24*3600*1000).toISOString() : undefined,
        paidAt: ['paid','completed','no_show'].includes(cfg.status) ? new Date(cfg.when.getTime() - 3*24*3600*1000).toISOString() : undefined,
        completedAt: ['completed','no_show'].includes(cfg.status) ? new Date(cfg.when.getTime() + 3600*1000).toISOString() : undefined
      };
      appointments.push(apt);
      if (['paid','completed','no_show'].includes(cfg.status)) {
        const amt = apt.price, com = Math.round(amt * App.COMMISSION_RATE);
        payments.push({
          id: `pay_${++payIdx}`, appointmentId: apt.id, amount: amt,
          commission: com, net: amt - com, status: 'paid', paidAt: apt.paidAt
        });
      }
      if (cfg.status === 'completed' && cfg.rating) {
        reviews.push({
          id: `rev_${++revIdx}`, appointmentId: apt.id, mentorId: cfg.mentorId,
          clientId: cfg.clientId, rating: cfg.rating, comment: cfg.review || '',
          createdAt: new Date(cfg.when.getTime() + 2*3600*1000).toISOString()
        });
      }
      return apt;
    }

    // --- Dr. Elif (m1) — mentör demo hesabı, aktif panel ---
    addApt({ mentorId:'m1', clientId:'u_c1', when: offset(-85, 10), status:'completed', type:'online', rating:5, review:'Harika bir seanstı, CV önerileri çok işe yaradı.' });
    addApt({ mentorId:'m1', clientId:'u_c2', when: offset(-78, 14), status:'completed', type:'online', rating:5, review:'Mülakat hazırlığımda çok yardımcı oldu.' });
    addApt({ mentorId:'m1', clientId:'u_c1', when: offset(-60, 11), status:'completed', type:'online', rating:4 });
    addApt({ mentorId:'m1', clientId:'u_c3', when: offset(-55, 15), status:'completed', type:'offline', rating:5, review:'Profesyonel ve samimi.' });
    addApt({ mentorId:'m1', clientId:'u_c2', when: offset(-42, 10), status:'completed', type:'online', rating:5 });
    addApt({ mentorId:'m1', clientId:'u_c4', when: offset(-35, 16), status:'completed', type:'online', rating:4, review:'Güzel bir sohbetti.' });
    addApt({ mentorId:'m1', clientId:'u_c1', when: offset(-28, 14), status:'completed', type:'online', rating:5 });
    addApt({ mentorId:'m1', clientId:'u_c3', when: offset(-21, 11), status:'completed', type:'online', rating:5, review:'Kariyer rotamı netleştirdim.' });
    addApt({ mentorId:'m1', clientId:'u_c2', when: offset(-14, 15), status:'completed', type:'offline', rating:5 });
    addApt({ mentorId:'m1', clientId:'u_c4', when: offset(-10, 10), status:'completed', type:'online', rating:4 });
    addApt({ mentorId:'m1', clientId:'u_c1', when: offset(-7, 17), status:'no_show', type:'online', note:'Danışan katılmadı' });
    addApt({ mentorId:'m1', clientId:'u_c3', when: offset(-4, 14), status:'completed', type:'online', rating:5 });
    // --- yaklaşan (paid) ---
    addApt({ mentorId:'m1', clientId:'u_c2', when: offset(1, 10), status:'paid', type:'online' });
    addApt({ mentorId:'m1', clientId:'u_c4', when: offset(2, 15), status:'paid', type:'offline' });
    addApt({ mentorId:'m1', clientId:'u_c1', when: offset(3, 11), status:'paid', type:'online' });
    // --- onaylandı, ödeme bekliyor ---
    addApt({ mentorId:'m1', clientId:'u_c3', when: offset(4, 14), status:'approved', type:'online' });
    addApt({ mentorId:'m1', clientId:'u_c4', when: offset(5, 10), status:'approved', type:'offline' });
    // --- yeni istekler (requested) ---
    addApt({ mentorId:'m1', clientId:'u_c2', when: offset(6, 16), status:'requested', type:'online', note:'İş değişikliği düşünüyorum, yönlendirme rica ederim.' });
    addApt({ mentorId:'m1', clientId:'u_c1', when: offset(7, 11), status:'requested', type:'offline', note:'Liderlik becerileri' });
    addApt({ mentorId:'m1', clientId:'u_c4', when: offset(8, 15), status:'requested', type:'online' });
    // --- iptal ---
    addApt({ mentorId:'m1', clientId:'u_c3', when: offset(-30, 10), status:'cancelled', type:'online' });

    // --- Ahmet (m2) — girişimcilik, biraz veri ---
    addApt({ mentorId:'m2', clientId:'u_c1', when: offset(-40, 14), status:'completed', type:'online', rating:5, review:'MVP stratejimizi netleştirdik.' });
    addApt({ mentorId:'m2', clientId:'u_c4', when: offset(-18, 11), status:'completed', type:'online', rating:5 });
    addApt({ mentorId:'m2', clientId:'u_c2', when: offset(-5, 15), status:'completed', type:'online', rating:4 });
    addApt({ mentorId:'m2', clientId:'u_c1', when: offset(2, 14), status:'paid', type:'online' });
    addApt({ mentorId:'m2', clientId:'u_c3', when: offset(5, 10), status:'requested', type:'online', note:'Yatırımcı sunumu' });

    // --- Ayşe (m3) — akademik ---
    addApt({ mentorId:'m3', clientId:'u_c2', when: offset(-25, 10), status:'completed', type:'online', rating:5, review:'Tez konusunda net yol haritası oluşturduk.' });
    addApt({ mentorId:'m3', clientId:'u_c4', when: offset(-8, 14), status:'completed', type:'online', rating:5 });
    addApt({ mentorId:'m3', clientId:'u_c3', when: offset(3, 11), status:'paid', type:'online' });
    addApt({ mentorId:'m3', clientId:'u_c2', when: offset(6, 15), status:'approved', type:'online' });

    App.Storage.set(KEYS.APPOINTMENTS, appointments);
    App.Storage.set(KEYS.PAYMENTS, payments);
    App.Storage.set(KEYS.REVIEWS, reviews);

    // subscriptions — aktif danışanlar
    const subs = ['u_c1','u_c2','u_c3','u_c4'].map((uid, i) => ({
      userId: uid,
      plan: ['monthly','quarterly','yearly','monthly'][i],
      startDate: new Date(now.getTime() - 10*24*3600*1000).toISOString(),
      endDate: new Date(now.getTime() + [20,80,350,20][i]*24*3600*1000).toISOString()
    }));
    App.Storage.set(KEYS.SUBSCRIPTIONS, subs);

    App.Storage.set(KEYS.SEEDED, true);
  };

  App.loadMentors = function () {
    const seed = window.SEED_MENTORS || [];
    const approved = App.Storage.get(KEYS.APPROVED_MENTORS, []);
    return [...seed, ...approved];
  };

  App.getMentorProfileForUser = function (user) {
    if (!user || user.role !== 'mentor') return null;
    const mentors = App.loadMentors();
    if (user.linkedMentorId) {
      return mentors.find(m => m.id === user.linkedMentorId) || null;
    }
    return mentors.find(m => m.userId === user.id) || null;
  };

  App.loadTrainings = function () { return window.SEED_TRAININGS || []; };
  App.loadQuiz = function () { return window.SEED_QUIZ || []; };
})(window.App);
