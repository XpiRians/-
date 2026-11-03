-- ==============================================================================
-- INFINITE GALLERY — МИГРАЦИЯ СИСТЕМЫ КОРОТКИХ ССЫЛОК (SUPABASE POSTGRESQL)
-- Проект: Infinite Gallery & Farm
-- Версия: 3.0 (Идемпотентная, без удаления данных, с дедупликацией и защитой от спама)
-- ==============================================================================

-- 1. Создание таблицы коротких ссылок (БЕЗ DROP TABLE — сохраняет все существующие данные)
CREATE TABLE IF NOT EXISTS public.gallery_links (
    id VARCHAR(12) PRIMARY KEY,                           -- Короткий уникальный код (Base62 / NanoID, 6-12 символов)
    full_image_id TEXT NOT NULL,                          -- Полный математический ID изображения
    resolution SMALLINT NOT NULL,                         -- Разрешение (строго 32 или 64)
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL -- Дата создания (UTC)
);

-- 2. Безопасное добавление колонок, если таблица была создана ранее без них
DO $$
BEGIN
    -- Детерминированный SHA-256 хеш полного ID для мгновенного поиска и дедупликации
    -- (полный ID 5-22 КБ превышает лимит B-tree индекса PostgreSQL в 2704 байта)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'gallery_links' 
          AND column_name = 'image_hash'
    ) THEN
        ALTER TABLE public.gallery_links 
        ADD COLUMN image_hash CHAR(64) 
        GENERATED ALWAYS AS (encode(sha256(full_image_id::bytea), 'hex')) STORED;
    END IF;

    -- Хеш IP-адреса создателя ссылки (для защиты от спама и rate-limiting)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'gallery_links' 
          AND column_name = 'creator_ip_hash'
    ) THEN
        ALTER TABLE public.gallery_links 
        ADD COLUMN creator_ip_hash CHAR(32);
    END IF;
END $$;

-- 3. Безопасное добавление ограничений целостности (защита от мусорных данных)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_short_id_format') THEN
        ALTER TABLE public.gallery_links 
        ADD CONSTRAINT check_short_id_format 
        CHECK (length(id) BETWEEN 6 AND 12 AND id ~ '^[A-Za-z0-9_-]+$');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_resolution_valid') THEN
        ALTER TABLE public.gallery_links 
        ADD CONSTRAINT check_resolution_valid 
        CHECK (resolution IN (32, 64));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_full_image_id_valid') THEN
        ALTER TABLE public.gallery_links 
        ADD CONSTRAINT check_full_image_id_valid 
        CHECK (length(full_image_id) BETWEEN 20 AND 35000 AND full_image_id ~ '^[A-Za-z0-9+/=_-]+$');
    END IF;
END $$;

-- 4. Настоящая дедупликация через UNIQUE INDEX
-- Исключает создание одинаковых ссылок для одного изображения и разрешения
CREATE UNIQUE INDEX IF NOT EXISTS idx_gallery_links_unique_image 
ON public.gallery_links (image_hash, resolution);

-- Индекс для защиты от спама (быстрый подсчёт запросов по IP)
CREATE INDEX IF NOT EXISTS idx_gallery_links_ip_created 
ON public.gallery_links (creator_ip_hash, created_at);

-- 5. Включение защиты на уровне строк (Row Level Security / RLS)
ALTER TABLE public.gallery_links ENABLE ROW LEVEL SECURITY;

-- Политика публичного чтения: любой посетитель может открывать короткие ссылки
DROP POLICY IF EXISTS "Allow public read gallery_links" ON public.gallery_links;
CREATE POLICY "Allow public read gallery_links"
ON public.gallery_links
FOR SELECT
TO anon, authenticated
USING (true);

-- Политика публичной вставки
DROP POLICY IF EXISTS "Allow public insert gallery_links" ON public.gallery_links;
CREATE POLICY "Allow public insert gallery_links"
ON public.gallery_links
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Права ролей: только чтение и создание, запрет на изменение и удаление
GRANT SELECT, INSERT ON TABLE public.gallery_links TO anon, authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.gallery_links FROM anon, authenticated;

-- ==============================================================================
-- 6. ХРАНИМАЯ ФУНКЦИЯ ДЕДУПЛИКАЦИИ И ЗАЩИТЫ ОТ СПАМА (RPC)
-- Если ссылка уже существует -> возвращает существующий короткий ID.
-- Если ссылка новая -> проверяет лимит запросов, сохраняет и возвращает ID.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_or_create_short_link(
    p_id TEXT,
    p_full_image_id TEXT,
    p_resolution SMALLINT
)
RETURNS TABLE (
    short_id VARCHAR(12),
    is_existing BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_target_hash CHAR(64);
    v_existing_id VARCHAR(12);
    v_client_ip TEXT;
    v_ip_hash CHAR(32);
    v_recent_count INT;
BEGIN
    -- А. Проверка входных параметров
    IF p_resolution NOT IN (32, 64) THEN
        RAISE EXCEPTION 'Некорректное разрешение: %, допускается только 32 или 64', p_resolution;
    END IF;

    IF length(p_id) NOT BETWEEN 6 AND 12 OR p_id !~ '^[A-Za-z0-9_-]+$' THEN
        RAISE EXCEPTION 'Некорректный формат короткого ID: %', p_id;
    END IF;

    IF length(p_full_image_id) NOT BETWEEN 20 AND 35000 OR p_full_image_id !~ '^[A-Za-z0-9+/=_-]+$' THEN
        RAISE EXCEPTION 'Некорректный формат full_image_id';
    END IF;

    -- Б. Вычисление SHA-256 хеша изображения
    v_target_hash := encode(sha256(p_full_image_id::bytea), 'hex');

    -- В. ДЕДУПЛИКАЦИЯ: если ссылка уже создана, сразу возвращаем существующий короткий ID
    SELECT gl.id INTO v_existing_id
    FROM public.gallery_links gl
    WHERE gl.image_hash = v_target_hash
      AND gl.resolution = p_resolution
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RETURN QUERY SELECT v_existing_id, TRUE;
        RETURN;
    END IF;

    -- Г. ЗАЩИТА ОТ СПАМА И RATE-LIMITING (для создания НОВЫХ ссылок):
    -- Получаем IP клиента из заголовков Supabase API Gateway (Cloudflare / Reverse Proxy)
    BEGIN
        v_client_ip := coalesce(
            current_setting('request.headers', true)::json->>'cf-connecting-ip',
            current_setting('request.headers', true)::json->>'x-forwarded-for',
            'direct_client'
        );
    EXCEPTION WHEN OTHERS THEN
        v_client_ip := 'direct_client';
    END;

    v_ip_hash := md5(v_client_ip);

    -- Лимит: не более 25 новых коротких ссылок в минуту с одного IP адреса
    SELECT count(*) INTO v_recent_count
    FROM public.gallery_links
    WHERE creator_ip_hash = v_ip_hash
      AND created_at > now() - interval '1 minute';

    IF v_recent_count >= 25 THEN
        RAISE EXCEPTION 'Превышен лимит создания ссылок: не более 25 новых ссылок в минуту с одного устройства.';
    END IF;

    -- Д. Атомарная вставка новой записи с обработкой возможных гонок (race condition)
    INSERT INTO public.gallery_links (id, full_image_id, resolution, creator_ip_hash)
    VALUES (p_id, p_full_image_id, p_resolution, v_ip_hash)
    ON CONFLICT (image_hash, resolution) DO NOTHING
    RETURNING public.gallery_links.id INTO v_existing_id;

    IF v_existing_id IS NOT NULL THEN
        RETURN QUERY SELECT v_existing_id, FALSE;
    ELSE
        -- Если другой запрос создал запись параллельно — возвращаем её
        SELECT gl.id INTO v_existing_id
        FROM public.gallery_links gl
        WHERE gl.image_hash = v_target_hash
          AND gl.resolution = p_resolution
        LIMIT 1;
        RETURN QUERY SELECT v_existing_id, TRUE;
    END IF;
END;
$$;

-- Разрешаем анонимным и авторизованным пользователям вызывать эту функцию
GRANT EXECUTE ON FUNCTION public.get_or_create_short_link(TEXT, TEXT, SMALLINT) TO anon, authenticated;
