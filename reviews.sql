-- Kadr: отзывы с лендинга. Выполнить один раз в Supabase → SQL Editor.
-- Схема: сайт может только ДОБАВИТЬ отзыв (он попадает в pending или сразу в rejected фильтром)
-- и ЧИТАТЬ только одобренные. Одобрение — вручную: Table Editor → reviews → status = 'approved'.

create table if not exists public.reviews (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(btrim(name)) between 2 and 40),
  rating      smallint not null check (rating between 1 and 5),
  body        text not null check (char_length(btrim(body)) between 15 and 600),
  device      text not null check (char_length(device) between 16 and 64),
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  reason      text
);
create index if not exists reviews_status_idx on public.reviews (status, created_at desc);
create index if not exists reviews_device_idx on public.reviews (device, created_at desc);

-- Серверный фильтр: срабатывает даже если кто-то шлёт запросы мимо сайта.
create or replace function public.reviews_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  norm text;
begin
  -- клиент не может сам себя одобрить
  new.status := 'pending'; new.reason := null; new.created_at := now();
  new.name := btrim(regexp_replace(new.name, '\s+', ' ', 'g'));
  new.body := btrim(regexp_replace(new.body, '[ \t]+', ' ', 'g'));

  -- не больше 1 отзыва с устройства за сутки и 20 отзывов в час всего (от флуда)
  if exists (select 1 from reviews where device = new.device and created_at > now() - interval '24 hours') then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if (select count(*) from reviews where created_at > now() - interval '1 hour') >= 20 then
    raise exception 'busy' using errcode = 'P0001';
  end if;
  -- дубликаты текста
  if exists (select 1 from reviews where lower(body) = lower(new.body)) then
    raise exception 'duplicate' using errcode = 'P0001';
  end if;

  -- нормализация: латиница-двойники и цифры → кириллица, убираем разделители внутри слов
  norm := lower(new.name || ' ' || new.body);
  norm := translate(norm, 'aeopcxykmtbh0346@ё', 'аеорсхукмтвнозчбае');
  norm := regexp_replace(norm, '[^а-я .\-_*]', '', 'g');
  norm := regexp_replace(norm, '([а-я])[.\-_*]+(?=[а-я])', '\1', 'g');        -- «х.у.йня» → «хуйня»
  norm := regexp_replace(norm, '\m([а-я]) +(?=[а-я]\M)', '\1', 'g');            -- «х у й» → «хуй»
  norm := regexp_replace(norm, '\m([а-я]{1,3}) +(?=[а-я]\M)', '\1', 'g');
  norm := regexp_replace(norm, '[^а-я ]', ' ', 'g');
  norm := regexp_replace(norm, '(.)\1{2,}', '\1', 'g');

  -- ссылки, почта, телефоны, @ники — сразу отказ
  if new.body ~* '(https?://|www\.|\m[a-z0-9-]+\.(ru|com|net|org|io|me|su|рф|xyz|top|info|online|site|link|ly|cc|gg)\M|t\.me|@[a-z0-9_]{3,})'
     or new.body ~ '\+?\d[\d\s\-\(\)]{8,}\d'
     or new.name ~* '(https?://|www\.|@|\.(ru|com|рф))' then
    new.status := 'rejected'; new.reason := 'links';
  -- мат и оскорбления (корни)
  elsif norm ~ '\m(ху[йеяи]|пизд|пезд|[её]б|за[её]б|у[её]б|въ[её]б|вы[её]б|бля|сук[аи]\M|сучк|мудак|мудил|пид[оа]р|гандон|долбо[её]б|залуп|шлюх|манд[аы]\M|дроч|чмо\M|дебил|ублюд|пзд)' then
    new.status := 'rejected'; new.reason := 'profanity';
  -- спам: капслок, повторы
  elsif char_length(regexp_replace(new.body, '[^A-ZА-ЯЁ]', '', 'g'))::float
        / greatest(char_length(regexp_replace(new.body, '[^A-Za-zА-Яа-яЁё]', '', 'g')), 1) > 0.6
        and char_length(new.body) > 20 then
    new.status := 'rejected'; new.reason := 'caps';
  elsif new.body ~ '(.)\1{6,}' then
    new.status := 'rejected'; new.reason := 'repeat';
  end if;
  return new;
end $$;

drop trigger if exists reviews_guard on public.reviews;
create trigger reviews_guard before insert on public.reviews
  for each row execute function public.reviews_guard();

-- Доступ
alter table public.reviews enable row level security;
revoke all on public.reviews from anon, authenticated;
grant insert (name, rating, body, device) on public.reviews to anon;
grant select (id, created_at, name, rating, body) on public.reviews to anon;

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to anon with check (true);
drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews for select to anon using (status = 'approved');
