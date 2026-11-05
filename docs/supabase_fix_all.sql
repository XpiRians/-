-- ==============================================================================
-- ГАЛЕРЕЯ МУСИ И КЕТИ / МОРСКОЙ БОЙ: MASTER SQL FIX
-- 1. Добавляет все недостающие колонки (created_at, updated_at) в player_ratings
-- 2. Удаляет осиротевшие профили и освобождает позывной XPIRIANS для poozitiv06@gmail.com
-- 3. Обновляет RPC battleship_set_username (работает с любой структурой БД)
-- ==============================================================================

-- ШАГ 1: Гарантируем наличие колонок в public.player_ratings
ALTER TABLE public.player_ratings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.player_ratings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.player_ratings ADD COLUMN IF NOT EXISTS rating INT DEFAULT 1000;
ALTER TABLE public.player_ratings ADD COLUMN IF NOT EXISTS wins INT DEFAULT 0;
ALTER TABLE public.player_ratings ADD COLUMN IF NOT EXISTS losses INT DEFAULT 0;
ALTER TABLE public.player_ratings ADD COLUMN IF NOT EXISTS draws INT DEFAULT 0;
ALTER TABLE public.player_ratings ADD COLUMN IF NOT EXISTS games_played INT DEFAULT 0;
ALTER TABLE public.player_ratings ADD COLUMN IF NOT EXISTS casual_wins INT DEFAULT 0;
ALTER TABLE public.player_ratings ADD COLUMN IF NOT EXISTS casual_losses INT DEFAULT 0;
ALTER TABLE public.player_ratings ADD COLUMN IF NOT EXISTS casual_games_played INT DEFAULT 0;

-- ШАГ 2: Удаляем осиротевшие профили (пользователи, удалённые из Authentication -> Users)
DELETE FROM public.profiles WHERE id NOT IN (SELECT id FROM auth.users);

-- ШАГ 3: Полностью освобождаем позывной XPIRIANS для аккаунта poozitiv06@gmail.com
DELETE FROM public.profiles 
WHERE lower(username) = 'xpirians' 
  AND id NOT IN (SELECT id FROM auth.users WHERE email = 'poozitiv06@gmail.com');

-- ШАГ 4: Обновляем RPC функцию battleship_set_username
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
    v_user_email TEXT;
    v_clean_name TEXT;
    v_clean_avatar TEXT;
    v_occupant_id UUID;
    v_occupant_email TEXT;
    v_confirmed TIMESTAMPTZ;
    v_final_avatar TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Требуется авторизация');
    END IF;

    -- Получаем email вызывающего пользователя
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

    v_clean_name := trim(p_username);
    IF char_length(v_clean_name) < 3 OR char_length(v_clean_name) > 16 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Длина позывного должна быть от 3 до 16 символов');
    END IF;

    IF v_clean_name !~ '^[a-zA-Z0-9_а-яА-ЯёЁ]+$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Позывной может содержать только буквы, цифры и _');
    END IF;

    -- Ищем, кто сейчас занимает этот позывной (кроме самого вызывающего пользователя)
    SELECT p.id, u.email, u.email_confirmed_at
    INTO v_occupant_id, v_occupant_email, v_confirmed
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE lower(p.username) = lower(v_clean_name) AND p.id <> v_user_id
    LIMIT 1;

    IF v_occupant_id IS NOT NULL THEN
        -- 1. Если старый пользователь был удалён из auth.users — удаляем сироту и освобождаем имя!
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_occupant_id) THEN
            DELETE FROM public.profiles WHERE id = v_occupant_id;
            v_occupant_id := NULL;
        -- 2. Если позывной принадлежит тому же email (перерегистрация) — удаляем старый профиль!
        ELSIF v_occupant_email IS NOT NULL AND lower(v_occupant_email) = lower(v_user_email) THEN
            DELETE FROM public.profiles WHERE id = v_occupant_id;
            v_occupant_id := NULL;
        -- 3. Если старый владелец не подтвердил почту — освобождаем имя для подтверждённого игрока
        ELSIF v_confirmed IS NULL THEN
            UPDATE public.profiles
            SET username = 'Гость_' || substr(v_occupant_id::text, 1, 6),
                updated_at = now()
            WHERE id = v_occupant_id;
            v_occupant_id := NULL;
        -- 4. Спец-правило: позывной XPIRIANS зарезервирован за poozitiv06@gmail.com
        ELSIF lower(v_clean_name) = 'xpirians' AND lower(v_user_email) = 'poozitiv06@gmail.com' THEN
            DELETE FROM public.profiles WHERE id = v_occupant_id;
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

    -- Вставляем или обновляем профиль капитана
    INSERT INTO public.profiles (id, username, avatar_url, created_at, updated_at)
    VALUES (v_user_id, v_clean_name, v_clean_avatar, now(), now())
    ON CONFLICT (id) DO UPDATE
    SET username = v_clean_name,
        avatar_url = COALESCE(v_clean_avatar, public.profiles.avatar_url),
        updated_at = now()
    RETURNING avatar_url INTO v_final_avatar;

    -- Инициализируем стартовый рейтинг 1000 ELO (без строгой привязки к created_at)
    BEGIN
        INSERT INTO public.player_ratings (user_id, rating, wins, losses, games_played)
        VALUES (v_user_id, 1000, 0, 0, 0)
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Игнорируем любые ошибки рейтинга при смене никнейма
    END;

    RETURN jsonb_build_object(
        'success', true,
        'username', v_clean_name,
        'avatar_url', v_final_avatar
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.battleship_set_username(TEXT, TEXT) TO authenticated;

-- ШАГ 5: Обновляем RPC проверку доступности ника
CREATE OR REPLACE FUNCTION public.battleship_check_username_available(p_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_clean_name TEXT;
    v_occupant_id UUID;
    v_confirmed TIMESTAMPTZ;
BEGIN
    v_clean_name := trim(p_username);
    IF char_length(v_clean_name) < 3 OR char_length(v_clean_name) > 16 THEN
        RETURN jsonb_build_object('available', false, 'reason', 'Длина от 3 до 16 символов');
    END IF;

    IF v_clean_name !~ '^[a-zA-Z0-9_а-яА-ЯёЁ]+$' THEN
        RETURN jsonb_build_object('available', false, 'reason', 'Только буквы, цифры и _');
    END IF;

    SELECT p.id, u.email_confirmed_at
    INTO v_occupant_id, v_confirmed
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE lower(p.username) = lower(v_clean_name)
      AND p.id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    LIMIT 1;

    IF v_occupant_id IS NULL THEN
        RETURN jsonb_build_object('available', true);
    END IF;

    -- Если сирота — считаем доступным (будет перезаписан)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_occupant_id) THEN
        RETURN jsonb_build_object('available', true);
    END IF;

    -- Если не подтверждён — доступен
    IF v_confirmed IS NULL THEN
        RETURN jsonb_build_object('available', true);
    END IF;

    RETURN jsonb_build_object('available', false, 'reason', 'Позывной уже занят другим капитаном');
END;
$$;

GRANT EXECUTE ON FUNCTION public.battleship_check_username_available(TEXT) TO anon, authenticated;
