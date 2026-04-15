# MentorLink

Öğrencileri ve iş yaşamındaki kişileri alanında uzman mentörlerle buluşturan bir mentörlük (danışmanlık) platformu. Saf HTML, CSS ve JavaScript ile geliştirilmiş statik bir MVP'dir — veriler `localStorage` üzerinde tutulur, kurulum gerektirmez.

## Özellikler

- **Danışan akışı**: Üyelik, abonelik paketi (Aylık / 3 Aylık / Yıllık), mentör arama/filtreleme, online (Zoom/Meet) veya yüz yüze randevu
- **Mentör olma akışı**: Başvuru formu → 5 bölümlük eğitim → 10 soruluk sertifikasyon sınavı (%70 geçme notu)
- **Admin paneli**: Mentör başvurularını onaylama/reddetme
- **4 kategori**: Kariyer & İş Yaşamı, Akademik / Öğrenci, Girişimcilik & İş Kurma, Kişisel Gelişim

## Çalıştırma

Hiçbir kurulum veya sunucu gerekmez. `index.html` dosyasına çift tıkla — tarayıcıda açılır.

## Demo Hesaplar

- **Admin**: `admin@demo` / `admin`
- **Mentör**: `mentor@demo` / `mentor` (Docplanner tarzı panel — takvim, kazanç, müsaitlik)
- **Danışan**: `client@demo` / `client` (hazır randevular ile)

Verileri sıfırlamak için tarayıcı konsolunda: `localStorage.clear()`

## Dosya Yapısı

- `*.html` — 11 sayfa (ana sayfa, mentörler, detay, kayıt/giriş, panel, vs.)
- `css/` — Tasarım sistemi (turuncu/mor gradient tema)
- `js/` — Modüler vanilla JS (`window.App` namespace)
- `data/seed.js` — Örnek mentörler, eğitim içeriği, sınav soruları
