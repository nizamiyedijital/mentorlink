(function (App) {
  const S = App.Storage;

  App.getCurrentUser = function () {
    const cu = S.get(S.keys.CURRENT_USER);
    if (!cu) return null;
    const users = S.get(S.keys.USERS, []);
    return users.find(u => u.id === cu.id) || null;
  };

  App.register = function ({ name, email, password, role }) {
    const users = S.get(S.keys.USERS, []);
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Bu e-posta adresiyle kayıtlı bir hesap var.');
    }
    const user = { id: App.uid('u'), name, email, password, role, createdAt: new Date().toISOString() };
    users.push(user);
    S.set(S.keys.USERS, users);
    S.set(S.keys.CURRENT_USER, { id: user.id, role: user.role });
    return user;
  };

  App.login = function (email, password) {
    const users = S.get(S.keys.USERS, []);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) throw new Error('E-posta veya şifre hatalı.');
    S.set(S.keys.CURRENT_USER, { id: user.id, role: user.role });
    return user;
  };

  App.logout = function () { S.remove(S.keys.CURRENT_USER); };

  App.requireAuth = function (redirect = 'login.html') {
    const user = App.getCurrentUser();
    if (!user) { window.location.href = redirect; return null; }
    return user;
  };

  App.requireRole = function (role, redirect = 'index.html') {
    const user = App.requireAuth();
    if (!user) return null;
    if (user.role !== role) { window.location.href = redirect; return null; }
    return user;
  };

  App.hasActiveSubscription = function (userId) {
    const subs = S.get(S.keys.SUBSCRIPTIONS, []);
    const sub = subs.find(s => s.userId === userId);
    return sub ? new Date(sub.endDate) > new Date() : false;
  };

  App.getSubscription = function (userId) {
    return S.get(S.keys.SUBSCRIPTIONS, []).find(s => s.userId === userId) || null;
  };

  App.setSubscription = function (userId, plan) {
    const subs = S.get(S.keys.SUBSCRIPTIONS, []);
    const now = new Date();
    const end = new Date(now);
    const months = plan === 'monthly' ? 1 : plan === 'quarterly' ? 3 : 12;
    end.setMonth(end.getMonth() + months);
    const sub = { userId, plan, startDate: now.toISOString(), endDate: end.toISOString() };
    const filtered = subs.filter(s => s.userId !== userId);
    filtered.push(sub);
    S.set(S.keys.SUBSCRIPTIONS, filtered);
    return sub;
  };
})(window.App);
