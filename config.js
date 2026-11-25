/* Настройки лендинга Kadr — меняются здесь, код трогать не нужно. */
window.KADR = {
  version: "1.1.1",
  apkUrl: "https://github.com/Zahabsbs/kadr-landing/releases/latest/download/Kadr.apk",  // ссылка на последний релиз — не меняется с версиями
  apkSize: "71 МБ",
  minAndroid: "Android 10+",
  rustoreUrl: "",                    // когда модерация пройдёт — вставь ссылку, кнопка оживёт сама
  privacyUrl: "privacy.html",
  contactEmail: "",
  telegramUrl: "https://t.me/SkyForgeOfficial",

  // Проверка APK на VirusTotal (обновляй с каждой версией)
  virustotal: {
    version: "1.1.1",
    sha256: "3d33131f88684458524074bebf6d283706ed799886f46a63429ea43f911373d5",
  },                  // почта поддержки (покажется в подвале)

  // Отзывы: Supabase REST. anon-ключ публичный (Project Settings → API → anon public).
  supabaseUrl: "https://ogtwokpuekjfjtdsfiim.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ndHdva3B1ZWtqZmp0ZHNmaWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUxMDMwNDksImV4cCI6MjExMDY3OTA0OX0.kILkHSD9Fs972bSr8Akbhj2gqKI3QmUNz9Qm2tAvio0",

  // Отзывы реальных тестировщиков, если хочешь показать их до первых отзывов с сайта:
  // { name: "Имя", rating: 5, text: "...", date: "2026-11-20" }
  seedReviews: [],
};
