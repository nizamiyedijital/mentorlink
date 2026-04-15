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
    SEEDED: 'mp_seeded_v2'
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
    const adminUser = {
      id: 'admin_demo', name: 'Admin', email: 'admin@demo',
      password: 'admin', role: 'admin', createdAt: new Date().toISOString()
    };
    const mentorDemo = {
      id: 'u_mentor_demo', name: 'Dr. Elif Yılmaz', email: 'mentor@demo',
      password: 'mentor', role: 'mentor', linkedMentorId: 'm1',
      createdAt: new Date().toISOString()
    };
    const clientDemo = {
      id: 'u_client_demo', name: 'Demo Danışan', email: 'client@demo',
      password: 'client', role: 'client', createdAt: new Date().toISOString()
    };
    App.Storage.set(KEYS.USERS, [adminUser, mentorDemo, clientDemo]);
    App.Storage.set(KEYS.APPLICATIONS, []);
    App.Storage.set(KEYS.APPROVED_MENTORS, []);
    App.Storage.set(KEYS.TRAINING_PROGRESS, {});
    App.Storage.set(KEYS.QUIZ_RESULTS, {});

    const avail = {};
    (window.SEED_MENTORS || []).forEach(m => { avail[m.id] = defaultAvailability(); });
    App.Storage.set(KEYS.AVAILABILITY, avail);

    const now = new Date();
    const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const in2d = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    in2d.setHours(14, 0, 0, 0);
    const past1 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    past1.setHours(10, 0, 0, 0);
    const past2 = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
    past2.setHours(15, 0, 0, 0);

    const fmt = d => d.toISOString().split('T')[0];
    const fmtT = d => d.toTimeString().slice(0, 5);

    App.Storage.set(KEYS.APPOINTMENTS, [
      { id: 'apt_req_1', clientId: clientDemo.id, clientName: clientDemo.name,
        mentorId: 'm1', mentorName: 'Dr. Elif Yılmaz', date: fmt(in2d), time: fmtT(in2d),
        type: 'online', note: 'Kariyer geçişi hakkında', price: 750,
        status: 'requested', meetLink: null, createdAt: now.toISOString() },
      { id: 'apt_paid_1', clientId: clientDemo.id, clientName: clientDemo.name,
        mentorId: 'm1', mentorName: 'Dr. Elif Yılmaz', date: fmt(in2h), time: fmtT(in2h),
        type: 'online', note: '', price: 750, status: 'paid',
        meetLink: 'https://meet.google.com/demo-abc', createdAt: past1.toISOString() },
      { id: 'apt_done_1', clientId: clientDemo.id, clientName: clientDemo.name,
        mentorId: 'm1', mentorName: 'Dr. Elif Yılmaz', date: fmt(past1), time: fmtT(past1),
        type: 'online', note: '', price: 750, status: 'completed',
        meetLink: 'https://meet.google.com/demo-abc', createdAt: past1.toISOString() },
      { id: 'apt_done_2', clientId: clientDemo.id, clientName: clientDemo.name,
        mentorId: 'm1', mentorName: 'Dr. Elif Yılmaz', date: fmt(past2), time: fmtT(past2),
        type: 'offline', note: '', price: 750, status: 'completed',
        meetLink: null, createdAt: past2.toISOString() }
    ]);

    App.Storage.set(KEYS.PAYMENTS, [
      { id: 'pay_1', appointmentId: 'apt_paid_1', amount: 750,
        commission: 150, net: 600, status: 'paid', paidAt: past1.toISOString() },
      { id: 'pay_2', appointmentId: 'apt_done_1', amount: 750,
        commission: 150, net: 600, status: 'paid', paidAt: past1.toISOString() },
      { id: 'pay_3', appointmentId: 'apt_done_2', amount: 750,
        commission: 150, net: 600, status: 'paid', paidAt: past2.toISOString() }
    ]);

    App.Storage.set(KEYS.REVIEWS, []);
    App.Storage.set(KEYS.SUBSCRIPTIONS, [{
      userId: clientDemo.id, plan: 'monthly',
      startDate: now.toISOString(),
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }]);
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
