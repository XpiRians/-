-- ==============================================================================
-- ГАЛЕРЕЯ МУСИ И КЕТИ / МОРСКОЙ БОЙ: MASTER FIX & PROFILE RESCUE
-- Выполните этот скрипт в Supabase SQL Editor (Run).
-- Он автоматически:
-- 1. Очищает все старые/осиротевшие тестовые записи
-- 2. Освобождает позывной XPIRIANS
-- 3. Привязывает XPIRIANS к вашему текущему аккаунту
-- 4. Обновляет функции проверки и смены никнейма, чтобы они НИКОГДА больше не блокировали игроков
-- ==============================================================================

-- 1. Удаляем все осиротевшие профили (аккаунты которых были удалены из auth.users)
DELETE FROM public.profiles WHERE id NOT IN (SELECT id FROM auth.users);

-- 2. Принудительно освобождаем позывной XPIRIANS от любых старых записей
DELETE FROM public.profiles WHERE lower(username) = 'xpirians' AND id NOT IN (SELECT id FROM auth.users);

-- 3. Если в auth.users есть ваш аккаунт (poozitiv06@gmail.com), сразу делаем его подтверждённым и ставим XPIRIANS
DO $$
DECLARE
    v_my_id UUID;
BEGIN
    SELECT id INTO v_my_id FROM auth.users WHERE lower(email) = 'poozitiv06@gmail.com' LIMIT 1;
    IF v_my_id IS NOT NULL THEN
        -- Подтверждаем почту на уровне базы
        UPDATE auth.users 
        SET email_confirmed_at = COALESCE(email_confirmed_at, now())
        WHERE id = v_my_id;

        -- Создаём или обновляем профиль с позывным XPIRIANS
        INSERT INTO public.profiles (id, username, avatar_url, created_at, updated_at)
        VALUES (v_my_id, 'XPIRIANS', 'https://api.dicebear.com/7.x/bottts/svg?seed=XPIRIANS', now(), now())
        ON CONFLICT (id) DO UPDATE
        SET username = 'XPIRIANS',
            avatar_url = 'https://api.dicebear.com/7.x/bottts/svg?seed=XPIRIANS',
            updated_at = now();

        -- Создаём стартовый рейтинг 1000 ELO
        INSERT INTO public.player_ratings (user_id, rating, wins, losses, games_played, created_at, updated_at)
        VALUES (v_my_id, 1000, 0, 0, 0, now(), now())
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END;
$$;

-- 4. ОБНОВЛЕНИЕ RPC: battleship_check_username_available
-- Теперь функция автоматически очищает удалённые и неподтверждённые аккаунты,
-- поэтому позывной НИКОГДА не зависнет на 24 часа.
CREATE OR REPLACE FUNCTION public.battleship_check_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_clean TEXT;
    v_existing_id UUID;
    v_confirmed TIMESTAMPTZ;
BEGIN
    v_clean := trim(p_username);
    IF char_length(v_clean) < 3 OR char_length(v_clean) > 16 THEN
        RETURN FALSE;
    END IF;
    IF v_clean !~ '^[a-zA-Z0-9_а-яА-ЯёЁ]+$' THEN
        RETURN FALSE;
    END IF;

    -- Ищем профиль с таким позывным
    SELECT p.id, u.email_confirmed_at INTO v_existing_id, v_confirmed
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE lower(p.username) = lower(v_clean)
    LIMIT 1;

    IF v_existing_id IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Если позывной принадлежит текущему авторизованному пользователю
    IF auth.uid() IS NOT NULL AND auth.uid() = v_existing_id THEN
        RETURN TRUE;
    END IF;

    -- Если аккаунт удалён из auth.users — чистим сироту и разрешаем
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_existing_id) THEN
        DELETE FROM public.profiles WHERE id = v_existing_id;
        RETURN TRUE;
    END IF;

    -- Если аккаунт не подтвердил почту — позывной свободен!
    IF v_confirmed IS NULL THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.battleship_check_username_available(TEXT) TO anon, authenticated;

-- 5. ОБНОВЛЕНИЕ RPC: battleship_set_username
-- Интеллектуальное утверждение позывного: автоматически освобождает имя, если старый владелец
-- был удалён или не подтвердил почту.
CREATE OR REPLACE FUNCTION public.battleship_set_username(
    p_username TEXT,
    p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_clean_name TEXT;
    v_clean_avatar TEXT;
    v_occupant_id UUID;
    v_confirmed TIMESTAMPTZ;
    v_final_avatar TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Требуется авторизация');
    END IF;

    v_clean_name := trim(p_username);
    IF char_length(v_clean_name) < 3 OR char_length(v_clean_name) > 16 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Длина позывного должна быть от 3 до 16 символов');
    END IF;

    IF v_clean_name !~ '^[a-zA-Z0-9_а-яА-ЯёЁ]+$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Позывной может содержать только буквы, цифры и _');
    END IF;

    -- Проверяем занятость позывного другими пользователями
    SELECT p.id, u.email_confirmed_at
    INTO v_occupant_id, v_confirmed
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE lower(p.username) = lower(v_clean_name) AND p.id <> v_user_id
    LIMIT 1;

    IF v_occupant_id IS NOT NULL THEN
        -- Если старый пользователь был удалён из auth.users
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_occupant_id) THEN
            DELETE FROM public.profiles WHERE id = v_occupant_id;
            v_occupant_id := NULL;
        -- Если старый владелец не подтвердил почту — освобождаем имя для нового игрока
        ELSIF v_confirmed IS NULL THEN
            UPDATE public.profiles
            SET username = 'Гость_' || substr(v_occupant_id::text, 1, 6),
                updated_at = now()
            WHERE id = v_occupant_id;
            v_occupant_id := NULL;
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Этот позывной уже занят другим капитаном');
        END IF;
    END IF;

    v_clean_avatar := trim(p_avatar_url);
    IF v_clean_avatar IS NOT NULL AND v_clean_avatar <> '' THEN
        IF v_clean_avatar NOT LIKE 'https://%' OR char_length(v_clean_avatar) > 500 THEN
            v_clean_avatar := 'https://api.dicebear.com/7.x/bottts/svg?seed=' || v_clean_name;
        END IF;
    ELSE
        v_clean_avatar := 'https://api.dicebear.com/7.x/bottts/svg?seed=' || v_clean_name;
    END IF;

    -- Вставляем или обновляем профиль
    INSERT INTO public.profiles (id, username, avatar_url, created_at, updated_at)
    VALUES (v_user_id, v_clean_name, v_clean_avatar, now(), now())
    ON CONFLICT (id) DO UPDATE
    SET username = v_clean_name,
        avatar_url = COALESCE(v_clean_avatar, public.profiles.avatar_url),
        updated_at = now()
    RETURNING avatar_url INTO v_final_avatar;

    -- Гарантируем наличие рейтинга 1000 ELO
    INSERT INTO public.player_ratings (user_id, rating, wins, losses, games_played, created_at, updated_at)
    VALUES (v_user_id, 1000, 0, 0, 0, now(), now())
    ON CONFLICT (user_id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'username', v_clean_name,
        'avatar_url', v_final_avatar
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.battleship_set_username(TEXT, TEXT) TO authenticated;
