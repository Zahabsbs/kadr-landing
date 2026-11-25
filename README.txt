Лендинг Kadr — как запустить

1. Положи Kadr-1.1.1.apk рядом с index.html (или впиши полную ссылку в config.js → apkUrl).
2. Отзывы:
   • Supabase → SQL Editor → выполни reviews.sql (один раз).
   • Supabase → Project Settings → API → скопируй anon public key в config.js → supabaseAnonKey.
   • Новые отзывы приходят в таблицу reviews со статусом pending. Чтобы показать на сайте — поставь status = approved.
     Мат, ссылки, телефоны, капс и спам фильтр сразу помечает rejected. С одного устройства — 1 отзыв в сутки.
3. Когда RuStore одобрит — вставь ссылку в config.js → rustoreUrl. Кнопка сама станет активной, плашка «на модерации» пропадёт.
4. Залей всю папку на хостинг как статический сайт.

Важно про хостинг:
• Telegram-канал и проверка VirusTotal — тоже в config.js (telegramUrl, virustotal.sha256 — меняй хэш с каждой новой версией APK).
• Supabase Storage и Edge Functions отдают HTML как обычный текст — страница не откроется как сайт.
  Плюс на бесплатном Supabase файл больше 50 МБ не загрузить, а APK весит ~71 МБ.
• Подходит любой статический хостинг: Яндекс Object Storage (сервера в РФ), GitHub Pages, Netlify.
  Supabase при этом остаётся для отзывов — сайт ходит к нему напрямую.

Файлы:
index.html, style.css, app.js — сам сайт
config.js — все ссылки и настройки
img/ — скриншоты приложения и логотип
fonts/ — шрифт Inter (OFL)
reviews.sql — таблица отзывов, серверный фильтр и права доступа
