-- ==============================================================================
-- INFINITE GALLERY — BATTLESHIP: AUTH, PROFILES & ELO RANKING SYSTEM
-- ВЕРСИЯ: 3.3 (Final Security, Fleet Privacy, Profile Lock & Realtime Integrity)
-- ==============================================================================
-- Ключевые архитектурные решения v3.3:
-- 1. ПОЛНАЯ ЗАЩИТА ТАЙНЫ ФЛОТА (ANTI-CHEAT / ZERO OPPONENT LEAK):
--    - Секретные расстановки кораблей хранятся в закрытой таблице public.battleship_fleets,
--      полностью изолированной от клиентов (REVOKE ALL FROM PUBLIC, anon, authenticated).
--    - В публичной таблице public.battleship_rooms поля player1_fleet и player2_fleet
--      остаются NULL на протяжении фаз ожидания, расстановки и активного боя.
--    - Флот раскрывается в public.battleship_rooms ТОЛЬКО после победы (status = 'finished').
--    - Для восстановления своего поля после обновления страницы (F5) используется безопасный
--      RPC battleship_get_room, отдающий игроку ТОЛЬКО его собственный флот.
-- 2. БЕЗУСЛОВНАЯ СОХРАННОСТЬ СУЩЕСТВУЮЩИХ КОМНАТ:
--    - Полностью исключены любые массовые отмены комнат (никаких UPDATE status = 'cancelled').
--    - Все существующие профили, комнаты, рейтинги и история сохраняются на 100%.
-- 3. ЖЁСТКАЯ ЗАЩИТА ПРОФИЛЕЙ И РЕГИСТРОНЕЗАВИСИМАЯ УНИКАЛЬНОСТЬ:
--    - Прямое изменение public.profiles через REST API полностью запрещено (REVOKE UPDATE).
--    - Смена позывного/аватара возможна ТОЛЬКО через серверный RPC battleship_set_username.
--    - Создан уникальный индекс по нижнему регистру idx_profiles_username_lower (lower(username)),
--      исключающий одновременное существование 'Captain' и 'captain'.
-- 4. ЗАЩИТА ОТ ИЗМЕНЕНИЯ ПОДТВЕРЖДЁННОГО ФЛОТА:
--    - В battleship_submit_placement добавлена строгая серверная блокировка:
--      повторный вызов после подтверждения расстановки (player1_ready / player2_ready)
--      немедленно отклоняется с ошибкой.
-- 5. ИЗОЛЯЦИЯ ОТ ОБХОДОВ АВТОРИЗАЦИИ:
--    - Все действия (выстрел, таймаут, сдача, расстановка) требуют строгой аутентификации auth.uid().
--    - Личность игрока никогда не берётся из клиентского p_player_id.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. ТАБЛИЦА ПРОФИЛЕЙ ИГРОКОВ (public.profiles)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(16),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_username_length CHECK (username IS NULL OR (char_length(username) >= 3 AND char_length(username) <= 16)),
    CONSTRAINT chk_avatar_url_format CHECK (avatar_url IS NULL OR (avatar_url LIKE 'https://%' AND char_length(avatar_url) <= 500))
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username VARCHAR(16);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Регистронезависимый уникальный индекс позывных (Captain == captain)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower 
    ON public.profiles (lower(username));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Чтение профилей доступно всем (для Зала славы, лобби и соперников)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.profiles FOR SELECT 
    USING (true);

-- Первоначальная вставка профиля при регистрации (только для своего UUID)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- ПРЯМОЙ UPDATE ЗАПРЕЩЁН: изменения профиля разрешены только через безопасный RPC battleship_set_username
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

GRANT SELECT ON TABLE public.profiles TO anon, authenticated;
GRANT INSERT ON TABLE public.profiles TO authenticated;
REVOKE UPDATE, DELETE ON TABLE public.profiles FROM anon, authenticated;

-- ==============================================================================
-- 2. ТАБЛИЦА РЕЙТИНГОВ И СТАТИСТИКИ (public.player_ratings)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.player_ratings (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INT NOT NULL DEFAULT 1000,
    wins INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    draws INT NOT NULL DEFAULT 0,
    games_played INT NOT NULL DEFAULT 0,
    casual_wins INT NOT NULL DEFAULT 0,
    casual_losses INT NOT NULL DEFAULT 0,
    casual_games_played INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_rating_min CHECK (rating >= 100)
);

ALTER TABLE public.player_ratings ADD COLUMN IF NOT EXISTS rating INT DEFAULT 1000;
ALTER TABLE public.player_ratings ADD COLUMN IF NOT EXISTS wins INT DEFAULT 0;
ALTER TABLE public.player_ratings ADD COLUMN IF NOT EXISTS losses INT DEFAULT 0;
ALTER TABLE public.player_ratings ADD COLUMN IF NOT EXISTS draws INT DEFAULT 0;
ALTER TABLE public.player_ratings ADD COLUMN IF NOT EXISTS games_played INT DEFAULT 0;
ALTER TABLE public.player_ratings ADD COLUMN IF NOT EXISTS casual_wins INT DEFAULT 0;
ALTER TABLE public.player_ratings ADD COLUMN IF NOT EXISTS casual_losses INT DEFAULT 0;
ALTER TABLE public.player_ratings ADD COLUMN IF NOT EXISTS casual_games_played INT DEFAULT 0;
ALTER TABLE public.player_ratings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_player_ratings_rating_desc 
    ON public.player_ratings (rating DESC);

ALTER TABLE public.player_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Player ratings are viewable by everyone" ON public.player_ratings;
CREATE POLICY "Player ratings are viewable by everyone" 
    ON public.player_ratings FOR SELECT 
    USING (true);

-- Прямое изменение рейтингов клиентами категорически запрещено
GRANT SELECT ON TABLE public.player_ratings TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.player_ratings FROM anon, authenticated;

-- ==============================================================================
-- 3. ТАБЛИЦА ИСТОРИИ РАНГОВЫХ МАТЧЕЙ (public.ranked_matches)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ranked_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code VARCHAR(16) NOT NULL,
    player1_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    player2_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    winner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    p1_rating_before INT NOT NULL,
    p1_rating_after INT NOT NULL,
    p1_delta INT NOT NULL,
    p2_rating_before INT NOT NULL,
    p2_rating_after INT NOT NULL,
    p2_delta INT NOT NULL,
    shots_count INT NOT NULL DEFAULT 0,
    played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ranked_matches_p1 ON public.ranked_matches (player1_user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_ranked_matches_p2 ON public.ranked_matches (player2_user_id, played_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ranked_matches_room_code ON public.ranked_matches (room_code);

ALTER TABLE public.ranked_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ranked matches are viewable by everyone" ON public.ranked_matches;
CREATE POLICY "Ranked matches are viewable by everyone" 
    ON public.ranked_matches FOR SELECT 
    USING (true);

GRANT SELECT ON TABLE public.ranked_matches TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.ranked_matches FROM anon, authenticated;

-- ==============================================================================
-- 4. ТАБЛИЦА ИГРОВЫХ КОМНАТ (public.battleship_rooms)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.battleship_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(16) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'waiting',
    player1_id TEXT,
    player2_id TEXT,
    player1_name TEXT,
    player2_name TEXT,
    player1_fleet JSONB,
    player2_fleet JSONB,
    player1_ready BOOLEAN DEFAULT FALSE,
    player2_ready BOOLEAN DEFAULT FALSE,
    current_turn VARCHAR(10),
    winner VARCHAR(10),
    shots_history JSONB DEFAULT '[]'::jsonb,
    is_ranked BOOLEAN DEFAULT FALSE,
    player1_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    player2_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    prep_deadline TIMESTAMPTZ,
    turn_deadline TIMESTAMPTZ,
    elo_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Гарантируем наличие всех колонок в public.battleship_rooms (для существующих инсталляций):
ALTER TABLE public.battleship_rooms ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();
ALTER TABLE public.battleship_rooms ADD COLUMN IF NOT EXISTS player1_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.battleship_rooms ADD COLUMN IF NOT EXISTS player2_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.battleship_rooms ADD COLUMN IF NOT EXISTS is_ranked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.battleship_rooms ADD COLUMN IF NOT EXISTS elo_processed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.battleship_rooms ADD COLUMN IF NOT EXISTS prep_deadline TIMESTAMPTZ;
ALTER TABLE public.battleship_rooms ADD COLUMN IF NOT EXISTS turn_deadline TIMESTAMPTZ;
ALTER TABLE public.battleship_rooms ADD COLUMN IF NOT EXISTS shots_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.battleship_rooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.battleship_rooms ALTER COLUMN code TYPE VARCHAR(16);
ALTER TABLE public.battleship_rooms ALTER COLUMN status TYPE VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_battleship_rooms_code ON public.battleship_rooms (code);
CREATE INDEX IF NOT EXISTS idx_battleship_rooms_status ON public.battleship_rooms (status, is_ranked);

ALTER TABLE public.battleship_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read battleship_rooms" ON public.battleship_rooms;
CREATE POLICY "Public read battleship_rooms" 
    ON public.battleship_rooms FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert battleship_rooms" ON public.battleship_rooms;
DROP POLICY IF EXISTS "Allow authenticated update battleship_rooms" ON public.battleship_rooms;
DROP POLICY IF EXISTS "Allow authenticated delete battleship_rooms" ON public.battleship_rooms;
DROP POLICY IF EXISTS "Allow anon insert battleship_rooms" ON public.battleship_rooms;
DROP POLICY IF EXISTS "Allow anon update battleship_rooms" ON public.battleship_rooms;

GRANT SELECT ON TABLE public.battleship_rooms TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.battleship_rooms FROM anon, authenticated;

-- ==============================================================================
-- 5. СЕКРЕТНОЕ ХРАНИЛИЩЕ РАССТАНОВОК ФЛОТА (public.battleship_fleets)
-- ==============================================================================
-- Изолированная приватная таблица для защиты от подглядывания расстановки противника:
CREATE TABLE IF NOT EXISTS public.battleship_fleets (
    room_code VARCHAR(16) PRIMARY KEY REFERENCES public.battleship_rooms(code) ON DELETE CASCADE,
    player1_fleet JSONB,
    player2_fleet JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.battleship_fleets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.battleship_fleets FROM PUBLIC, anon, authenticated;

-- ==============================================================================
-- 6. ТРИГГЕР: АВТОМАТИЧЕСКОЕ СОЗДАНИЕ ПРОФИЛЯ ПРИ РЕГИСТРАЦИИ (handle_new_user)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    raw_user_name TEXT;
    clean_username VARCHAR(16);
    user_avatar TEXT;
    candidate_name VARCHAR(16);
    rnd_suffix INT;
BEGIN
    raw_user_name := COALESCE(
        NEW.raw_user_meta_data->>'username',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    candidate_name := substr(regexp_replace(trim(raw_user_name), '[^a-zA-Z0-9_а-яА-ЯёЁ]', '', 'g'), 1, 16);
    IF char_length(candidate_name) < 3 THEN
        candidate_name := 'Капитан_' || substr(NEW.id::text, 1, 4);
    END IF;

    clean_username := candidate_name;

    -- Регистронезависимая проверка коллизии позывных
    IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(clean_username)) THEN
        rnd_suffix := floor(random() * 899 + 100)::int;
        clean_username := substr(candidate_name, 1, 12) || '_' || rnd_suffix::text;
    END IF;

    user_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        'https://api.dicebear.com/7.x/bottts/svg?seed=' || clean_username
    );

    BEGIN
        INSERT INTO public.profiles (id, username, avatar_url, created_at, updated_at)
        VALUES (NEW.id, clean_username, user_avatar, now(), now())
        ON CONFLICT (id) DO UPDATE
        SET updated_at = now();
    EXCEPTION WHEN unique_violation THEN
        rnd_suffix := floor(random() * 8999 + 1000)::int;
        clean_username := substr(candidate_name, 1, 11) || '_' || rnd_suffix::text;
        INSERT INTO public.profiles (id, username, avatar_url, created_at, updated_at)
        VALUES (NEW.id, clean_username, user_avatar, now(), now())
        ON CONFLICT (id) DO NOTHING;
    END;

    INSERT INTO public.player_ratings (user_id, rating, wins, losses, games_played, created_at, updated_at)
    VALUES (NEW.id, 1000, 0, 0, 0, now(), now())
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 7. RPC: ПРОВЕРКА ДОСТУПНОСТИ ПОЗЫВНОГО (battleship_check_username_available)
-- ==============================================================================
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
    v_created TIMESTAMPTZ;
BEGIN
    v_clean := trim(p_username);
    IF char_length(v_clean) < 3 OR char_length(v_clean) > 16 THEN
        RETURN FALSE;
    END IF;
    IF v_clean !~ '^[a-zA-Z0-9_а-яА-ЯёЁ]+$' THEN
        RETURN FALSE;
    END IF;

    -- Регистронезависимый поиск существующего позывного
    SELECT id INTO v_existing_id
    FROM public.profiles
    WHERE lower(username) = lower(v_clean)
    LIMIT 1;

    IF v_existing_id IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Если позывной принадлежит текущему авторизованному пользователю
    IF auth.uid() IS NOT NULL AND auth.uid() = v_existing_id THEN
        RETURN TRUE;
    END IF;

    -- Если аккаунт не подтвердил почту и брошен более 24 часов назад — позывной свободен
    SELECT email_confirmed_at, created_at INTO v_confirmed, v_created
    FROM auth.users
    WHERE id = v_existing_id;

    IF v_confirmed IS NULL AND v_created < (now() - interval '24 hours') THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.battleship_check_username_available(TEXT) TO anon, authenticated;

-- ==============================================================================
-- 8. RPC: БЕЗОПАСНОЕ СОЗДАНИЕ ОНЛАЙН-КОМНАТЫ (battleship_create_room)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.battleship_create_room(
    p_is_ranked BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_profile RECORD;
    v_room_code VARCHAR(16);
    v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    v_i INT;
    v_room RECORD;
    v_prep_deadline TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Для создания онлайн-комнаты необходимо войти в аккаунт');
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Профиль игрока не найден');
    END IF;

    LOOP
        v_room_code := '';
        FOR v_i IN 1..6 LOOP
            v_room_code := v_room_code || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
        END LOOP;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.battleship_rooms WHERE code = v_room_code);
    END LOOP;

    v_prep_deadline := now() + interval '120 seconds';

    INSERT INTO public.battleship_rooms (
        code,
        status,
        player1_id,
        player1_name,
        player1_user_id,
        player1_ready,
        is_ranked,
        prep_deadline,
        shots_history
    ) VALUES (
        v_room_code,
        'waiting',
        v_user_id::text,
        COALESCE(v_profile.username, 'Капитан'),
        v_user_id,
        FALSE,
        COALESCE(p_is_ranked, FALSE),
        v_prep_deadline,
        '[]'::jsonb
    )
    RETURNING * INTO v_room;

    -- Инициализируем хранилище скрытого флота
    INSERT INTO public.battleship_fleets (room_code, player1_fleet, player2_fleet)
    VALUES (v_room_code, NULL, NULL)
    ON CONFLICT (room_code) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'room', row_to_json(v_room)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.battleship_create_room(BOOLEAN) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.battleship_create_room(BOOLEAN) FROM anon;

-- ==============================================================================
-- 9. RPC: БЕЗОПАСНОЕ ПОДКЛЮЧЕНИЕ К КОМНАТЕ (battleship_join_room)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.battleship_join_room(
    p_room_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_profile RECORD;
    v_clean_code VARCHAR(16);
    r RECORD;
    v_prep_deadline TIMESTAMPTZ;
    v_updated_room RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Для участия в онлайн-боях необходимо войти в аккаунт');
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Профиль игрока не найден');
    END IF;

    v_clean_code := trim(upper(p_room_code))::varchar;

    SELECT * INTO r
    FROM public.battleship_rooms
    WHERE code = v_clean_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Комната не найдена');
    END IF;

    -- Повторный вход текущего игрока в свою комнату
    IF (r.player1_user_id = v_user_id) OR (r.player2_user_id = v_user_id) THEN
        RETURN jsonb_build_object(
            'success', true,
            'room', row_to_json(r)
        );
    END IF;

    IF r.status <> 'waiting'::varchar THEN
        RETURN jsonb_build_object('success', false, 'error', 'Комната уже заполнена или игра началась');
    END IF;

    IF r.player1_user_id = v_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Нельзя вступить в онлайн-матч с самим собой');
    END IF;

    v_prep_deadline := now() + interval '120 seconds';

    UPDATE public.battleship_rooms
    SET player2_id = v_user_id::text,
        player2_name = COALESCE(v_profile.username, 'Капитан 2'),
        player2_user_id = v_user_id,
        player2_ready = FALSE,
        status = 'placement',
        prep_deadline = v_prep_deadline,
        updated_at = now()
    WHERE code = v_clean_code
    RETURNING * INTO v_updated_room;

    RETURN jsonb_build_object(
        'success', true,
        'room', row_to_json(v_updated_room)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.battleship_join_room(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.battleship_join_room(TEXT) FROM anon;

-- ==============================================================================
-- 10. RPC: БЕЗОПАСНАЯ РАССТАНОВКА ФЛОТА (battleship_submit_placement)
-- ==============================================================================
-- Сохраняет флот в изолированную таблицу public.battleship_fleets.
-- В public.battleship_rooms флот остаётся скрытым (NULL) на протяжении всего боя!
-- Строго блокирует повторное изменение расстановки после подтверждения.
CREATE OR REPLACE FUNCTION public.battleship_submit_placement(
    p_room_code TEXT,
    p_fleet JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_code VARCHAR(16);
    v_caller_auth UUID;
    r RECORD;
    v_is_p1 BOOLEAN;
    v_opp_ready BOOLEAN;
    v_ship_count INT;
    v_total_cells INT;
    v_next_status TEXT;
    v_first_turn TEXT;
    v_turn_deadline TIMESTAMPTZ := NULL;
    v_safe_room JSONB;
BEGIN
    v_caller_auth := auth.uid();
    IF v_caller_auth IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Требуется авторизация');
    END IF;

    v_clean_code := trim(upper(p_room_code))::varchar;

    -- Строгая серверная валидация флота
    IF p_fleet IS NULL OR jsonb_typeof(p_fleet) <> 'array' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Некорректный формат расстановки флота');
    END IF;

    v_ship_count := jsonb_array_length(p_fleet);
    IF v_ship_count <> 10 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Флот должен состоять ровно из 10 кораблей');
    END IF;

    SELECT count(*) INTO v_total_cells
    FROM jsonb_array_elements(p_fleet) AS s,
         jsonb_array_elements(s->'coords') AS c
    WHERE (c->'x')::int >= 0 AND (c->'x')::int <= 9
      AND (c->'y')::int >= 0 AND (c->'y')::int <= 9;

    IF v_total_cells <> 20 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Корабли должны занимать ровно 20 клеток в поле 10x10');
    END IF;

    SELECT * INTO r
    FROM public.battleship_rooms
    WHERE code = v_clean_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Комната не найдена');
    END IF;

    IF r.status <> 'placement'::varchar AND r.status <> 'waiting'::varchar THEN
        RETURN jsonb_build_object('success', false, 'error', 'Фаза расстановки уже завершена');
    END IF;

    IF v_caller_auth = r.player1_user_id THEN
        v_is_p1 := TRUE;
        v_opp_ready := COALESCE(r.player2_ready, FALSE);
    ELSIF v_caller_auth = r.player2_user_id THEN
        v_is_p1 := FALSE;
        v_opp_ready := COALESCE(r.player1_ready, FALSE);
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Вы не являетесь участником этой комнаты');
    END IF;

    -- СТРОГАЯ БЛОКИРОВКА: запрещаем повторное изменение расстановки после подтверждения
    IF v_is_p1 AND COALESCE(r.player1_ready, FALSE) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Расстановка флота игрока 1 уже подтверждена и заблокирована');
    END IF;

    IF NOT v_is_p1 AND COALESCE(r.player2_ready, FALSE) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Расстановка флота игрока 2 уже подтверждена и заблокирована');
    END IF;

    -- Сохраняем расстановку в изолированную секретную таблицу
    INSERT INTO public.battleship_fleets (room_code, player1_fleet, player2_fleet)
    VALUES (
        v_clean_code,
        CASE WHEN v_is_p1 THEN p_fleet ELSE NULL END,
        CASE WHEN NOT v_is_p1 THEN p_fleet ELSE NULL END
    )
    ON CONFLICT (room_code) DO UPDATE
    SET player1_fleet = CASE WHEN v_is_p1 THEN p_fleet ELSE public.battleship_fleets.player1_fleet END,
        player2_fleet = CASE WHEN NOT v_is_p1 THEN p_fleet ELSE public.battleship_fleets.player2_fleet END,
        updated_at = now();

    IF v_opp_ready THEN
        v_next_status := 'battle';
        v_first_turn := CASE WHEN random() < 0.5 THEN 'player1' ELSE 'player2' END;
        v_turn_deadline := now() + interval '25 seconds';
    ELSE
        v_next_status := r.status;
        v_first_turn := r.current_turn;
    END IF;

    -- В public.battleship_rooms флот остаётся NULL — скрытым от противника
    IF v_is_p1 THEN
        UPDATE public.battleship_rooms
        SET player1_ready = TRUE,
            status = v_next_status::varchar,
            current_turn = v_first_turn::varchar,
            turn_deadline = v_turn_deadline,
            updated_at = now()
        WHERE code = v_clean_code;
    ELSE
        UPDATE public.battleship_rooms
        SET player2_ready = TRUE,
            status = v_next_status::varchar,
            current_turn = v_first_turn::varchar,
            turn_deadline = v_turn_deadline,
            updated_at = now()
        WHERE code = v_clean_code;
    END IF;

    v_safe_room := public.battleship_get_room(v_clean_code);

    RETURN jsonb_build_object(
        'success', true,
        'room', v_safe_room
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.battleship_submit_placement(TEXT, JSONB) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.battleship_submit_placement(TEXT, JSONB) FROM anon;

-- ==============================================================================
-- 11. RPC: КАПИТУЛЯЦИЯ В БОЮ (battleship_forfeit)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.battleship_forfeit(
    p_room_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_code VARCHAR(16);
    v_caller_auth UUID;
    r RECORD;
    v_winner VARCHAR(10);
    v_elo_res JSONB := NULL;
    v_f1 JSONB := NULL;
    v_f2 JSONB := NULL;
BEGIN
    v_caller_auth := auth.uid();
    IF v_caller_auth IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Требуется авторизация');
    END IF;

    v_clean_code := trim(upper(p_room_code))::varchar;

    SELECT * INTO r
    FROM public.battleship_rooms
    WHERE code = v_clean_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Комната не найдена');
    END IF;

    IF r.status <> 'battle'::varchar THEN
        RETURN jsonb_build_object('success', false, 'error', 'Матч не находится в фазе боя');
    END IF;

    -- Серверное определение победителя: капитулирует вызывающий
    IF v_caller_auth = r.player1_user_id THEN
        v_winner := 'player2';
    ELSIF v_caller_auth = r.player2_user_id THEN
        v_winner := 'player1';
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Вы не являетесь участником этого матча');
    END IF;

    -- При завершении матча копируем скрытый флот в public.battleship_rooms для финального экрана
    SELECT player1_fleet, player2_fleet INTO v_f1, v_f2 
    FROM public.battleship_fleets 
    WHERE room_code = v_clean_code;

    IF v_f1 IS NULL THEN v_f1 := r.player1_fleet; END IF;
    IF v_f2 IS NULL THEN v_f2 := r.player2_fleet; END IF;

    UPDATE public.battleship_rooms
    SET status = 'finished'::varchar,
        winner = v_winner,
        player1_fleet = v_f1,
        player2_fleet = v_f2,
        turn_deadline = NULL,
        updated_at = now()
    WHERE code = v_clean_code;

    IF r.is_ranked THEN
        v_elo_res := public.battleship_process_match_elo(v_clean_code);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'winner', v_winner,
        'elo', v_elo_res
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.battleship_forfeit(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.battleship_forfeit(TEXT) FROM anon;

-- ==============================================================================
-- 12. RPC: ВЫХОД ИЗ КОМНАТЫ / ОТМЕНА ОЖИДАНИЯ (battleship_leave_room)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.battleship_leave_room(
    p_room_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_code VARCHAR(16);
    v_caller_auth UUID;
    r RECORD;
BEGIN
    v_caller_auth := auth.uid();
    IF v_caller_auth IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Требуется авторизация');
    END IF;

    v_clean_code := trim(upper(p_room_code))::varchar;

    SELECT * INTO r
    FROM public.battleship_rooms
    WHERE code = v_clean_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Комната не найдена');
    END IF;

    IF v_caller_auth <> r.player1_user_id AND (r.player2_user_id IS NULL OR v_caller_auth <> r.player2_user_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Вы не являетесь участником этой комнаты');
    END IF;

    IF r.status = 'battle'::varchar THEN
        RETURN public.battleship_forfeit(v_clean_code);
    ELSIF r.status = 'waiting'::varchar THEN
        UPDATE public.battleship_rooms
        SET status = 'cancelled'::varchar,
            updated_at = now()
        WHERE code = v_clean_code;
        RETURN jsonb_build_object('success', true, 'status', 'cancelled');
    ELSIF r.status = 'placement'::varchar THEN
        UPDATE public.battleship_rooms
        SET status = 'cancelled'::varchar,
            updated_at = now()
        WHERE code = v_clean_code;
        RETURN jsonb_build_object('success', true, 'status', 'cancelled');
    END IF;

    RETURN jsonb_build_object('success', true, 'status', r.status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.battleship_leave_room(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.battleship_leave_room(TEXT) FROM anon;

-- ==============================================================================
-- 13. RPC: ВЫСТРЕЛ ПО КЛЕТКЕ (battleship_fire) — ИЗОЛЯЦИЯ ОТ SPOOFING И ЧИТЕРСТВА
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.battleship_fire(
    p_room_code TEXT,
    p_player_id TEXT,
    p_x INT,
    p_y INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    r RECORD;
    v_clean_code VARCHAR(16);
    v_caller_auth UUID;
    v_is_p1 BOOLEAN;
    v_shooter_role TEXT;
    v_opponent_fleet JSONB;
    v_hit BOOLEAN := FALSE;
    v_hit_ship_id TEXT := NULL;
    v_hit_ship_type TEXT := NULL;
    v_sunk BOOLEAN := FALSE;
    v_all_sunk BOOLEAN := TRUE;
    v_already_shot BOOLEAN := FALSE;
    v_shot_record JSONB;
    v_next_turn TEXT;
    v_winner TEXT := NULL;
    v_next_deadline TIMESTAMPTZ;
    v_elo_res JSONB := NULL;
    v_f1 JSONB := NULL;
    v_f2 JSONB := NULL;
BEGIN
    v_caller_auth := auth.uid();
    IF v_caller_auth IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Для выстрела требуется активная сессия Supabase Auth');
    END IF;

    v_clean_code := trim(upper(p_room_code))::varchar;

    SELECT * INTO r FROM public.battleship_rooms WHERE code = v_clean_code FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Комната не найдена');
    END IF;

    IF r.status <> 'battle'::varchar THEN
        RETURN jsonb_build_object('success', false, 'error', 'Матч не находится в фазе боя');
    END IF;

    -- ИДЕНТИФИКАЦИЯ СТРОГО ПО auth.uid():
    IF v_caller_auth = r.player1_user_id THEN
        v_is_p1 := TRUE;
        v_shooter_role := 'player1';
    ELSIF v_caller_auth = r.player2_user_id THEN
        v_is_p1 := FALSE;
        v_shooter_role := 'player2';
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Вы не являетесь авторизованным участником этого боя');
    END IF;

    IF r.current_turn <> v_shooter_role THEN
        RETURN jsonb_build_object('success', false, 'error', 'Сейчас ход вашего противника');
    END IF;

    IF p_x < 0 OR p_x > 9 OR p_y < 0 OR p_y > 9 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Координаты выстрела выходят за границы поля 10x10');
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(r.shots_history, '[]'::jsonb)) AS elem
        WHERE (elem->>'shooter') = v_shooter_role
          AND (elem->>'x')::int = p_x
          AND (elem->>'y')::int = p_y
    ) INTO v_already_shot;

    IF v_already_shot THEN
        RETURN jsonb_build_object('success', false, 'error', 'В эту клетку уже был произведён выстрел');
    END IF;

    -- Читаем флот из секретного хранилища battleship_fleets (с обратной совместимостью)
    SELECT player1_fleet, player2_fleet INTO v_f1, v_f2 
    FROM public.battleship_fleets 
    WHERE room_code = v_clean_code;

    IF v_f1 IS NULL THEN v_f1 := r.player1_fleet; END IF;
    IF v_f2 IS NULL THEN v_f2 := r.player2_fleet; END IF;

    IF v_is_p1 THEN
        v_opponent_fleet := v_f2;
    ELSE
        v_opponent_fleet := v_f1;
    END IF;

    IF v_opponent_fleet IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Флот противника не найден');
    END IF;

    -- Проверка попадания по клетке
    SELECT
        TRUE,
        s->>'id',
        s->>'type'
    INTO
        v_hit,
        v_hit_ship_id,
        v_hit_ship_type
    FROM jsonb_array_elements(v_opponent_fleet) AS s,
         jsonb_array_elements(s->'coords') AS c
    WHERE (c->'x')::int = p_x AND (c->'y')::int = p_y
    LIMIT 1;

    v_hit := COALESCE(v_hit, FALSE);

    -- Проверка потопления корабля
    IF v_hit AND v_hit_ship_id IS NOT NULL THEN
        SELECT NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(v_opponent_fleet) AS s,
                 jsonb_array_elements(s->'coords') AS c
            WHERE (s->>'id') = v_hit_ship_id
              AND NOT ((c->'x')::int = p_x AND (c->'y')::int = p_y)
              AND NOT EXISTS (
                  SELECT 1
                  FROM jsonb_array_elements(COALESCE(r.shots_history, '[]'::jsonb)) AS elem
                  WHERE (elem->>'shooter') = v_shooter_role
                    AND (elem->>'x')::int = (c->'x')::int
                    AND (elem->>'y')::int = (c->'y')::int
              )
        ) INTO v_sunk;
    END IF;

    -- Проверка полного уничтожения флота противника
    IF v_sunk THEN
        SELECT NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(v_opponent_fleet) AS s,
                 jsonb_array_elements(s->'coords') AS c
            WHERE NOT ((c->'x')::int = p_x AND (c->'y')::int = p_y)
              AND NOT EXISTS (
                  SELECT 1
                  FROM jsonb_array_elements(COALESCE(r.shots_history, '[]'::jsonb)) AS elem
                  WHERE (elem->>'shooter') = v_shooter_role
                    AND (elem->>'x')::int = (c->'x')::int
                    AND (elem->>'y')::int = (c->'y')::int
              )
        ) INTO v_all_sunk;
    ELSE
        v_all_sunk := FALSE;
    END IF;

    v_shot_record := jsonb_build_object(
        'shooter', v_shooter_role,
        'x', p_x,
        'y', p_y,
        'hit', v_hit,
        'sunk', v_sunk,
        'ship_id', v_hit_ship_id,
        'ship_type', v_hit_ship_type
    );

    IF v_all_sunk THEN
        v_winner := v_shooter_role;
        v_next_turn := NULL;
        v_next_deadline := NULL;

        -- При победе раскрываем оба флота в public.battleship_rooms для экрана завершения
        UPDATE public.battleship_rooms
        SET status = 'finished'::varchar,
            winner = v_winner::varchar,
            player1_fleet = v_f1,
            player2_fleet = v_f2,
            shots_history = COALESCE(r.shots_history, '[]'::jsonb) || v_shot_record,
            turn_deadline = NULL,
            updated_at = now()
        WHERE code = v_clean_code;

        IF r.is_ranked THEN
            v_elo_res := public.battleship_process_match_elo(v_clean_code);
        END IF;
    ELSE
        -- При попадании игрок стреляет снова, при промахе ход переходит сопернику
        IF v_hit THEN
            v_next_turn := v_shooter_role;
        ELSE
            v_next_turn := CASE WHEN v_shooter_role = 'player1' THEN 'player2' ELSE 'player1' END;
        END IF;

        v_next_deadline := now() + interval '25 seconds';

        UPDATE public.battleship_rooms
        SET current_turn = v_next_turn::varchar,
            shots_history = COALESCE(r.shots_history, '[]'::jsonb) || v_shot_record,
            turn_deadline = v_next_deadline,
            updated_at = now()
        WHERE code = v_clean_code;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'hit', v_hit,
        'sunk', v_sunk,
        'ship_id', v_hit_ship_id,
        'ship_type', v_hit_ship_type,
        'game_over', v_all_sunk,
        'winner', v_winner,
        'next_turn', v_next_turn,
        'turn_deadline', v_next_deadline,
        'elo', v_elo_res
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.battleship_fire(TEXT, TEXT, INT, INT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.battleship_fire(TEXT, TEXT, INT, INT) FROM anon;

-- ==============================================================================
-- 14. RPC: СЕРВЕРНАЯ ОБРАБОТКА ТАЙМАУТА ХОДА (battleship_handle_timeout)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.battleship_handle_timeout(
    p_room_code TEXT,
    p_player_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    r RECORD;
    v_clean_code VARCHAR(16);
    v_caller_auth UUID;
    v_timed_out_turn TEXT;
    v_next_turn TEXT;
    v_consecutive_timeouts INT := 0;
    v_winner TEXT := NULL;
    v_next_deadline TIMESTAMPTZ;
    v_elo_res JSONB := NULL;
    v_f1 JSONB := NULL;
    v_f2 JSONB := NULL;
BEGIN
    v_caller_auth := auth.uid();
    IF v_caller_auth IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Требуется авторизация');
    END IF;

    v_clean_code := trim(upper(p_room_code))::varchar;

    SELECT * INTO r
    FROM public.battleship_rooms
    WHERE code = v_clean_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Комната не найдена');
    END IF;

    IF r.status <> 'battle'::varchar THEN
        RETURN jsonb_build_object('success', false, 'error', 'Матч не находится в фазе боя');
    END IF;

    IF v_caller_auth <> r.player1_user_id AND (r.player2_user_id IS NULL OR v_caller_auth <> r.player2_user_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Вы не являетесь участником этого матча');
    END IF;

    -- Серверная проверка времени с допуском 500мс
    IF r.turn_deadline IS NULL OR now() < (r.turn_deadline - interval '500 milliseconds') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Время хода ещё не истекло');
    END IF;

    v_timed_out_turn := r.current_turn;
    v_next_turn := CASE WHEN v_timed_out_turn = 'player1' THEN 'player2' ELSE 'player1' END;

    SELECT COALESCE(
        (SELECT count(*) FROM (
            SELECT (elem->>'shooter') AS sh
            FROM jsonb_array_elements(COALESCE(r.shots_history, '[]'::jsonb)) AS elem
            WHERE elem->>'timeout' = 'true'
            ORDER BY (elem->>'t')::bigint DESC
            LIMIT 2
        ) sub WHERE sh = v_timed_out_turn),
        0
    ) INTO v_consecutive_timeouts;

    -- Защита от AFK: при двух таймаутах подряд присуждается техническое поражение
    IF v_consecutive_timeouts >= 2 THEN
        v_winner := v_next_turn;

        SELECT player1_fleet, player2_fleet INTO v_f1, v_f2 
        FROM public.battleship_fleets 
        WHERE room_code = v_clean_code;

        IF v_f1 IS NULL THEN v_f1 := r.player1_fleet; END IF;
        IF v_f2 IS NULL THEN v_f2 := r.player2_fleet; END IF;

        UPDATE public.battleship_rooms
        SET status = 'finished'::varchar,
            winner = v_winner::varchar,
            player1_fleet = v_f1,
            player2_fleet = v_f2,
            turn_deadline = NULL,
            updated_at = now()
        WHERE code = v_clean_code;

        IF r.is_ranked THEN
            v_elo_res := public.battleship_process_match_elo(v_clean_code);
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'timed_out', true,
            'forfeit_due_to_afk', true,
            'winner', v_winner,
            'elo', v_elo_res
        );
    ELSE
        -- Передача хода с немедленным продлением таймера для предотвращения повторных срабатываний
        v_next_deadline := now() + interval '25 seconds';

        UPDATE public.battleship_rooms
        SET current_turn = v_next_turn::varchar,
            turn_deadline = v_next_deadline,
            updated_at = now()
        WHERE code = v_clean_code;

        RETURN jsonb_build_object(
            'success', true,
            'timed_out', true,
            'next_turn', v_next_turn,
            'turn_deadline', v_next_deadline
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.battleship_handle_timeout(TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.battleship_handle_timeout(TEXT, TEXT) FROM anon;

-- ==============================================================================
-- 15. RPC: БЕЗОПАСНАЯ ОБРАБОТКА ELO (battleship_process_match_elo) — STRICTLY PRIVATE
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.battleship_process_match_elo(p_room_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    r RECORD;
    v_clean_code VARCHAR(16);
    v_p1_id UUID;
    v_p2_id UUID;
    v_winner_role TEXT;
    v_winner_id UUID;
    v_p1_rating_before INT;
    v_p2_rating_before INT;
    v_p1_rating_after INT;
    v_p2_rating_after INT;
    v_p1_actual_delta INT;
    v_p2_actual_delta INT;
    v_k NUMERIC := 32.0;
    v_e1 NUMERIC;
    v_e2 NUMERIC;
    v_s1 NUMERIC;
    v_s2 NUMERIC;
    v_calc_delta1 INT;
    v_calc_delta2 INT;
    v_shots_count INT := 0;
BEGIN
    v_clean_code := trim(upper(p_room_code))::varchar;

    SELECT * INTO r
    FROM public.battleship_rooms
    WHERE code = v_clean_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Комната не найдена');
    END IF;

    -- Идемпотентность: повторная обработка завершённого матча исключена
    IF COALESCE(r.elo_processed, FALSE) THEN
        RETURN jsonb_build_object('success', true, 'already_processed', true);
    END IF;

    IF r.status <> 'finished'::varchar THEN
        RETURN jsonb_build_object('success', false, 'error', 'Матч ещё не завершён');
    END IF;

    IF NOT COALESCE(r.is_ranked, FALSE) THEN
        UPDATE public.battleship_rooms
        SET elo_processed = TRUE, updated_at = now()
        WHERE code = v_clean_code;

        IF r.player1_user_id IS NOT NULL THEN
            UPDATE public.player_ratings
            SET casual_games_played = casual_games_played + 1,
                casual_wins = casual_wins + CASE WHEN r.winner = 'player1' THEN 1 ELSE 0 END,
                casual_losses = casual_losses + CASE WHEN r.winner = 'player2' THEN 1 ELSE 0 END,
                updated_at = now()
            WHERE user_id = r.player1_user_id;
        END IF;

        IF r.player2_user_id IS NOT NULL THEN
            UPDATE public.player_ratings
            SET casual_games_played = casual_games_played + 1,
                casual_wins = casual_wins + CASE WHEN r.winner = 'player2' THEN 1 ELSE 0 END,
                casual_losses = casual_losses + CASE WHEN r.winner = 'player1' THEN 1 ELSE 0 END,
                updated_at = now()
            WHERE user_id = r.player2_user_id;
        END IF;

        RETURN jsonb_build_object('success', true, 'is_ranked', false);
    END IF;

    v_p1_id := r.player1_user_id;
    v_p2_id := r.player2_user_id;

    IF v_p1_id IS NULL OR v_p2_id IS NULL THEN
        UPDATE public.battleship_rooms SET elo_processed = TRUE WHERE code = v_clean_code;
        RETURN jsonb_build_object('success', false, 'error', 'Недостаточно участников для рейтингового матча');
    END IF;

    IF v_p1_id = v_p2_id THEN
        UPDATE public.battleship_rooms SET elo_processed = TRUE WHERE code = v_clean_code;
        RETURN jsonb_build_object('success', false, 'error', 'Рейтинг не начисляется за матч с самим собой');
    END IF;

    v_winner_role := r.winner;
    IF v_winner_role = 'player1' THEN
        v_s1 := 1.0; v_s2 := 0.0; v_winner_id := v_p1_id;
    ELSIF v_winner_role = 'player2' THEN
        v_s1 := 0.0; v_s2 := 1.0; v_winner_id := v_p2_id;
    ELSE
        v_s1 := 0.5; v_s2 := 0.5; v_winner_id := NULL;
    END IF;

    INSERT INTO public.player_ratings (user_id, rating) VALUES (v_p1_id, 1000) ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.player_ratings (user_id, rating) VALUES (v_p2_id, 1000) ON CONFLICT (user_id) DO NOTHING;

    -- Детерминированный порядок захвата блокировок по UUID (защита от дедлоков 40P01)
    IF v_p1_id < v_p2_id THEN
        SELECT rating INTO v_p1_rating_before FROM public.player_ratings WHERE user_id = v_p1_id FOR UPDATE;
        SELECT rating INTO v_p2_rating_before FROM public.player_ratings WHERE user_id = v_p2_id FOR UPDATE;
    ELSE
        SELECT rating INTO v_p2_rating_before FROM public.player_ratings WHERE user_id = v_p2_id FOR UPDATE;
        SELECT rating INTO v_p1_rating_before FROM public.player_ratings WHERE user_id = v_p1_id FOR UPDATE;
    END IF;

    v_e1 := 1.0 / (1.0 + power(10.0, (v_p2_rating_before::numeric - v_p1_rating_before::numeric) / 400.0));
    v_e2 := 1.0 - v_e1;

    v_calc_delta1 := round(v_k * (v_s1 - v_e1));
    v_calc_delta2 := round(v_k * (v_s2 - v_e2));

    -- Ограничение минимального рейтинга полом 100 ELO
    v_p1_rating_after := GREATEST(100, v_p1_rating_before + v_calc_delta1);
    v_p2_rating_after := GREATEST(100, v_p2_rating_before + v_calc_delta2);

    -- ФАКТИЧЕСКАЯ ДЕЛЬТА: строго равна разнице до и после (без расхождений при достижении пола 100)
    v_p1_actual_delta := v_p1_rating_after - v_p1_rating_before;
    v_p2_actual_delta := v_p2_rating_after - v_p2_rating_before;

    UPDATE public.player_ratings
    SET rating = v_p1_rating_after,
        games_played = games_played + 1,
        wins = wins + CASE WHEN v_winner_role = 'player1' THEN 1 ELSE 0 END,
        losses = losses + CASE WHEN v_winner_role = 'player2' THEN 1 ELSE 0 END,
        draws = draws + CASE WHEN v_winner_role NOT IN ('player1', 'player2') THEN 1 ELSE 0 END,
        updated_at = now()
    WHERE user_id = v_p1_id;

    UPDATE public.player_ratings
    SET rating = v_p2_rating_after,
        games_played = games_played + 1,
        wins = wins + CASE WHEN v_winner_role = 'player2' THEN 1 ELSE 0 END,
        losses = losses + CASE WHEN v_winner_role = 'player1' THEN 1 ELSE 0 END,
        draws = draws + CASE WHEN v_winner_role NOT IN ('player1', 'player2') THEN 1 ELSE 0 END,
        updated_at = now()
    WHERE user_id = v_p2_id;

    IF r.shots_history IS NOT NULL THEN
        v_shots_count := jsonb_array_length(r.shots_history);
    END IF;

    INSERT INTO public.ranked_matches (
        room_code, player1_user_id, player2_user_id, winner_user_id,
        p1_rating_before, p1_rating_after, p1_delta,
        p2_rating_before, p2_rating_after, p2_delta,
        shots_count, played_at
    ) VALUES (
        v_clean_code, v_p1_id, v_p2_id, v_winner_id,
        v_p1_rating_before, v_p1_rating_after, v_p1_actual_delta,
        v_p2_rating_before, v_p2_rating_after, v_p2_actual_delta,
        v_shots_count, now()
    )
    ON CONFLICT (room_code) DO NOTHING;

    UPDATE public.battleship_rooms
    SET elo_processed = TRUE, updated_at = now()
    WHERE code = v_clean_code;

    RETURN jsonb_build_object(
        'success', true,
        'p1_delta', v_p1_actual_delta,
        'p2_delta', v_p2_actual_delta,
        'p1_rating_after', v_p1_rating_after,
        'p2_rating_after', v_p2_rating_after
    );
END;
$$;

-- СТРОГО ПРИВАТНАЯ ФУНКЦИЯ: прямой вызов клиентами запрещён
REVOKE ALL ON FUNCTION public.battleship_process_match_elo(TEXT) FROM PUBLIC, anon, authenticated;

-- ==============================================================================
-- 16. RPC: БЕЗОПАСНЫЙ ЗАПРОС РЕЗУЛЬТАТОВ ELO (battleship_get_match_elo)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.battleship_get_match_elo(p_room_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_match RECORD;
BEGIN
    SELECT * INTO v_match
    FROM public.ranked_matches
    WHERE room_code = trim(upper(p_room_code))
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'processed', false);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'processed', true,
        'p1_delta', v_match.p1_delta,
        'p2_delta', v_match.p2_delta,
        'p1_rating_after', v_match.p1_rating_after,
        'p2_rating_after', v_match.p2_rating_after,
        'winner_user_id', v_match.winner_user_id,
        'played_at', v_match.played_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.battleship_get_match_elo(TEXT) TO anon, authenticated;

-- ==============================================================================
-- 17. RPC: ЧТЕНИЕ ПРОФИЛЯ И СТАТИСТИКИ (battleship_get_profile)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.battleship_get_profile(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_profile RECORD;
    v_rating RECORD;
    v_matches JSONB;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'user_id не указан');
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Профиль не найден');
    END IF;

    SELECT * INTO v_rating FROM public.player_ratings WHERE user_id = p_user_id;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', m.id,
            'room_code', m.room_code,
            'played_at', m.played_at,
            'is_winner', (m.winner_user_id = p_user_id),
            'shots_count', m.shots_count,
            'my_delta', CASE WHEN m.player1_user_id = p_user_id THEN m.p1_delta ELSE m.p2_delta END,
            'my_rating_after', CASE WHEN m.player1_user_id = p_user_id THEN m.p1_rating_after ELSE m.p2_rating_after END,
            'opponent_id', CASE WHEN m.player1_user_id = p_user_id THEN m.player2_user_id ELSE m.player1_user_id END,
            'opponent_name', COALESCE(opp.username, 'Капитан'),
            'opponent_avatar', opp.avatar_url
        ) ORDER BY m.played_at DESC
    ) INTO v_matches
    FROM (
        SELECT * FROM public.ranked_matches
        WHERE player1_user_id = p_user_id OR player2_user_id = p_user_id
        ORDER BY played_at DESC
        LIMIT 10
    ) m
    LEFT JOIN public.profiles opp ON opp.id = (CASE WHEN m.player1_user_id = p_user_id THEN m.player2_user_id ELSE m.player1_user_id END);

    RETURN jsonb_build_object(
        'success', true,
        'profile', jsonb_build_object(
            'id', v_profile.id,
            'username', v_profile.username,
            'avatar_url', v_profile.avatar_url,
            'created_at', v_profile.created_at
        ),
        'rating', jsonb_build_object(
            'rating', COALESCE(v_rating.rating, 1000),
            'wins', COALESCE(v_rating.wins, 0),
            'losses', COALESCE(v_rating.losses, 0),
            'draws', COALESCE(v_rating.draws, 0),
            'games_played', COALESCE(v_rating.games_played, 0),
            'casual_wins', COALESCE(v_rating.casual_wins, 0),
            'casual_losses', COALESCE(v_rating.casual_losses, 0),
            'casual_games_played', COALESCE(v_rating.casual_games_played, 0),
            'tier', public.battleship_get_rank_tier(COALESCE(v_rating.rating, 1000))
        ),
        'match_history', COALESCE(v_matches, '[]'::jsonb)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.battleship_get_profile(UUID) TO anon, authenticated;

-- ==============================================================================
-- 18. RPC: ТАБЛИЦА ЛИДЕРОВ (battleship_get_leaderboard)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.battleship_get_leaderboard(
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_limit INT;
    v_clean_offset INT;
    v_result JSONB;
    v_total INT;
BEGIN
    v_clean_limit := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
    v_clean_offset := GREATEST(COALESCE(p_offset, 0), 0);

    SELECT count(*) INTO v_total FROM public.player_ratings;

    SELECT jsonb_agg(
        jsonb_build_object(
            'rank', sub.pos,
            'user_id', sub.user_id,
            'username', COALESCE(sub.username, 'Капитан'),
            'avatar_url', sub.avatar_url,
            'rating', sub.rating,
            'wins', sub.wins,
            'losses', sub.losses,
            'games_played', sub.games_played,
            'win_rate', CASE WHEN sub.games_played > 0 THEN round((sub.wins::numeric / sub.games_played::numeric) * 100.0, 1) ELSE 0 END,
            'tier', public.battleship_get_rank_tier(sub.rating)
        )
    ) INTO v_result
    FROM (
        SELECT
            ROW_NUMBER() OVER (ORDER BY r.rating DESC, r.wins DESC, r.games_played ASC) AS pos,
            r.user_id,
            p.username,
            p.avatar_url,
            r.rating,
            r.wins,
            r.losses,
            r.games_played
        FROM public.player_ratings r
        JOIN public.profiles p ON p.id = r.user_id
        ORDER BY r.rating DESC, r.wins DESC, r.games_played ASC
        LIMIT v_clean_limit OFFSET v_clean_offset
    ) sub;

    RETURN jsonb_build_object(
        'success', true,
        'total', v_total,
        'leaderboard', COALESCE(v_result, '[]'::jsonb)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.battleship_get_leaderboard(INT, INT) TO anon, authenticated;

-- ==============================================================================
-- 19. RPC: РАНГОВЫЙ ТИТУЛ ПО ELO (battleship_get_rank_tier)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.battleship_get_rank_tier(p_rating INT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN p_rating >= 2000 THEN 'Гранд-Адмирал'
        WHEN p_rating >= 1800 THEN 'Адмирал'
        WHEN p_rating >= 1600 THEN 'Вице-Адмирал'
        WHEN p_rating >= 1400 THEN 'Капитан 1-го ранга'
        WHEN p_rating >= 1200 THEN 'Капитан 2-го ранга'
        WHEN p_rating >= 1000 THEN 'Лейтенант'
        ELSE 'Юнга'
    END;
$$;

GRANT EXECUTE ON FUNCTION public.battleship_get_rank_tier(INT) TO anon, authenticated;

-- ==============================================================================
-- 20. RPC: СМЕНА ПОЗЫВНОГО И АВАТАРА (battleship_set_username) — ЕДИНСТВЕННЫЙ КАНАЛ UPDATE
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.battleship_set_username(
    p_username TEXT,
    p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_clean_name TEXT;
    v_clean_avatar TEXT;
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

    -- Регистронезависимая проверка занятости позывного
    IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(v_clean_name) AND id <> v_user_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Этот позывной уже занят другим капитаном');
    END IF;

    v_clean_avatar := trim(p_avatar_url);
    IF v_clean_avatar IS NOT NULL AND v_clean_avatar <> '' THEN
        IF v_clean_avatar NOT LIKE 'https://%' OR char_length(v_clean_avatar) > 500 THEN
            RETURN jsonb_build_object('success', false, 'error', 'URL аватара должен начинаться с https:// и не превышать 500 символов');
        END IF;
    ELSE
        v_clean_avatar := NULL;
    END IF;

    UPDATE public.profiles
    SET username = v_clean_name,
        avatar_url = COALESCE(v_clean_avatar, avatar_url),
        updated_at = now()
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true, 'username', v_clean_name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.battleship_set_username(TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.battleship_set_username(TEXT, TEXT) FROM anon;

-- ==============================================================================
-- 21. RPC: БЕЗОПАСНОЕ ПОЛУЧЕНИЕ СОСТОЯНИЯ КОМНАТЫ (battleship_get_room)
-- ==============================================================================
-- Возвращает состояние комнаты, маскируя флот соперника до завершения матча.
-- Позволяет безопасно восстановить своё поле после перезагрузки страницы (F5).
CREATE OR REPLACE FUNCTION public.battleship_get_room(p_room_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    r RECORD;
    v_clean_code VARCHAR(16);
    v_caller_auth UUID;
    v_p1_fleet JSONB := NULL;
    v_p2_fleet JSONB := NULL;
    v_is_p1 BOOLEAN := FALSE;
    v_is_p2 BOOLEAN := FALSE;
    v_finished BOOLEAN := FALSE;
    v_f1 JSONB := NULL;
    v_f2 JSONB := NULL;
BEGIN
    v_clean_code := trim(upper(p_room_code))::varchar;

    SELECT * INTO r 
    FROM public.battleship_rooms 
    WHERE code = v_clean_code;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    v_caller_auth := auth.uid();
    v_is_p1 := (v_caller_auth IS NOT NULL AND v_caller_auth = r.player1_user_id);
    v_is_p2 := (v_caller_auth IS NOT NULL AND v_caller_auth = r.player2_user_id);
    v_finished := (r.status = 'finished'::varchar);

    -- Получаем секретные расстановки из battleship_fleets (с обратной совместимостью)
    SELECT player1_fleet, player2_fleet INTO v_f1, v_f2
    FROM public.battleship_fleets
    WHERE room_code = v_clean_code;

    IF v_f1 IS NULL THEN v_f1 := r.player1_fleet; END IF;
    IF v_f2 IS NULL THEN v_f2 := r.player2_fleet; END IF;

    -- Защита тайны флота:
    -- Игрок 1 видит свой флот всегда; флот игрока 1 виден сопернику ТОЛЬКО после победы
    IF v_finished OR v_is_p1 THEN
        v_p1_fleet := v_f1;
    END IF;

    -- Игрок 2 видит свой флот всегда; флот игрока 2 виден сопернику ТОЛЬКО после победы
    IF v_finished OR v_is_p2 THEN
        v_p2_fleet := v_f2;
    END IF;

    RETURN jsonb_build_object(
        'id', r.id,
        'code', r.code,
        'status', r.status,
        'is_ranked', r.is_ranked,
        'player1_id', r.player1_id,
        'player1_name', r.player1_name,
        'player1_user_id', r.player1_user_id,
        'player1_ready', r.player1_ready,
        'player1_fleet', v_p1_fleet,
        'player2_id', r.player2_id,
        'player2_name', r.player2_name,
        'player2_user_id', r.player2_user_id,
        'player2_ready', r.player2_ready,
        'player2_fleet', v_p2_fleet,
        'current_turn', r.current_turn,
        'winner', r.winner,
        'shots_history', r.shots_history,
        'prep_deadline', r.prep_deadline,
        'turn_deadline', r.turn_deadline,
        'elo_processed', r.elo_processed,
        'created_at', r.created_at,
        'updated_at', r.updated_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.battleship_get_room(TEXT) TO anon, authenticated;

-- ==============================================================================
-- 22. ПОДДЕРЖКА REALTIME
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'battleship_rooms'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.battleship_rooms;
    END IF;
END $$;
