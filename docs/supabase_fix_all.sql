-- ==============================================================================
-- ГАЛЕРЕЯ МУСИ И КЕТИ / МОРСКОЙ БОЙ: MASTER SQL FIX (V3.4 ONLINE MULTIPLAYER)
-- 1. Добавляет все недостающие колонки в player_ratings
-- 2. Очищает профили и резервирует XPIRIANS
-- 3. Обновляет battleship_set_username
-- 4. Исправляет онлайн-синхронизацию: battleship_submit_placement, battleship_fire,
--    battleship_handle_timeout, battleship_get_room
--    (устраняет ошибку "Флот противника не найден", десинхронизацию хода и таймера)
-- ==============================================================================

-- ШАГ 1: Гарантируем структуру таблиц
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

ALTER TABLE public.battleship_rooms ADD COLUMN IF NOT EXISTS player1_fleet JSONB DEFAULT NULL;
ALTER TABLE public.battleship_rooms ADD COLUMN IF NOT EXISTS player2_fleet JSONB DEFAULT NULL;
ALTER TABLE public.battleship_rooms ADD COLUMN IF NOT EXISTS turn_deadline TIMESTAMPTZ DEFAULT NULL;

CREATE TABLE IF NOT EXISTS public.battleship_fleets (
    room_code VARCHAR(16) PRIMARY KEY REFERENCES public.battleship_rooms(code) ON DELETE CASCADE,
    player1_fleet JSONB,
    player2_fleet JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.battleship_fleets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.battleship_fleets FROM PUBLIC, anon, authenticated;

-- ШАГ 2: Чистим сирот и освобождаем XPIRIANS
DELETE FROM public.profiles WHERE id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.profiles 
WHERE lower(username) = 'xpirians' 
  AND id NOT IN (SELECT id FROM auth.users WHERE email = 'poozitiv06@gmail.com');

-- ШАГ 3: RPC battleship_set_username
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

    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

    v_clean_name := trim(p_username);
    IF char_length(v_clean_name) < 3 OR char_length(v_clean_name) > 16 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Длина позывного должна быть от 3 до 16 символов');
    END IF;

    IF v_clean_name !~ '^[a-zA-Z0-9_а-яА-ЯёЁ]+$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Позывной может содержать только буквы, цифры и _');
    END IF;

    SELECT p.id, u.email, u.email_confirmed_at
    INTO v_occupant_id, v_occupant_email, v_confirmed
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE lower(p.username) = lower(v_clean_name) AND p.id <> v_user_id
    LIMIT 1;

    IF v_occupant_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_occupant_id) THEN
            DELETE FROM public.profiles WHERE id = v_occupant_id;
            v_occupant_id := NULL;
        ELSIF v_occupant_email IS NOT NULL AND lower(v_occupant_email) = lower(v_user_email) THEN
            DELETE FROM public.profiles WHERE id = v_occupant_id;
            v_occupant_id := NULL;
        ELSIF v_confirmed IS NULL THEN
            UPDATE public.profiles
            SET username = 'Гость_' || substr(v_occupant_id::text, 1, 6),
                updated_at = now()
            WHERE id = v_occupant_id;
            v_occupant_id := NULL;
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

    INSERT INTO public.profiles (id, username, avatar_url, created_at, updated_at)
    VALUES (v_user_id, v_clean_name, v_clean_avatar, now(), now())
    ON CONFLICT (id) DO UPDATE
    SET username = v_clean_name,
        avatar_url = COALESCE(v_clean_avatar, public.profiles.avatar_url),
        updated_at = now()
    RETURNING avatar_url INTO v_final_avatar;

    BEGIN
        INSERT INTO public.player_ratings (user_id, rating, wins, losses, games_played)
        VALUES (v_user_id, 1000, 0, 0, 0)
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'username', v_clean_name,
        'avatar_url', v_final_avatar
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.battleship_set_username(TEXT, TEXT) TO authenticated;

-- ШАГ 4: RPC battleship_submit_placement (ПОДДЕРЖИВАЕТ 2 И 3 АРГУМЕНТА, ПИШЕТ В ОБЕ ТАБЛИЦЫ)
CREATE OR REPLACE FUNCTION public.battleship_submit_placement(
    p_room_code TEXT,
    p_fleet JSONB,
    p_player_id TEXT DEFAULT NULL
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
    v_next_status TEXT;
    v_first_turn TEXT;
    v_turn_deadline TIMESTAMPTZ := NULL;
    v_safe_room JSONB;
BEGIN
    v_caller_auth := auth.uid();
    v_clean_code := trim(upper(p_room_code))::varchar;

    IF p_fleet IS NULL OR jsonb_typeof(p_fleet) <> 'array' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Некорректный формат расстановки');
    END IF;

    v_ship_count := jsonb_array_length(p_fleet);
    IF v_ship_count <> 10 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Флот должен состоять ровно из 10 кораблей');
    END IF;

    SELECT * INTO r
    FROM public.battleship_rooms
    WHERE code = v_clean_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Комната не найдена');
    END IF;

    IF v_caller_auth IS NOT NULL AND v_caller_auth = r.player1_user_id THEN
        v_is_p1 := TRUE;
    ELSIF v_caller_auth IS NOT NULL AND v_caller_auth = r.player2_user_id THEN
        v_is_p1 := FALSE;
    ELSIF p_player_id IS NOT NULL AND p_player_id = r.player1_id THEN
        v_is_p1 := TRUE;
    ELSIF p_player_id IS NOT NULL AND p_player_id = r.player2_id THEN
        v_is_p1 := FALSE;
    ELSE
        -- Автоопределение по ready статусу
        IF NOT COALESCE(r.player1_ready, FALSE) THEN
            v_is_p1 := TRUE;
        ELSE
            v_is_p1 := FALSE;
        END IF;
    END IF;

    v_opp_ready := CASE WHEN v_is_p1 THEN COALESCE(r.player2_ready, FALSE) ELSE COALESCE(r.player1_ready, FALSE) END;

    -- 1. Пишем в изолированную таблицу battleship_fleets
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

    -- 2. Резервно пишем также в саму battleship_rooms
    IF v_is_p1 THEN
        UPDATE public.battleship_rooms
        SET player1_fleet = p_fleet,
            player1_ready = TRUE,
            status = v_next_status::varchar,
            current_turn = v_first_turn::varchar,
            turn_deadline = v_turn_deadline,
            updated_at = now()
        WHERE code = v_clean_code;
    ELSE
        UPDATE public.battleship_rooms
        SET player2_fleet = p_fleet,
            player2_ready = TRUE,
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
GRANT EXECUTE ON FUNCTION public.battleship_submit_placement(TEXT, JSONB, TEXT) TO anon, authenticated;

-- Перегрузка на 2 аргумента для обратной совместимости
CREATE OR REPLACE FUNCTION public.battleship_submit_placement(
    p_room_code TEXT,
    p_fleet JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN public.battleship_submit_placement(p_room_code, p_fleet, NULL);
END;
$$;
GRANT EXECUTE ON FUNCTION public.battleship_submit_placement(TEXT, JSONB) TO anon, authenticated;

-- ШАГ 5: RPC battleship_fire (НАДЁЖНЫЙ ПОИСК ФЛОТА В ОБЕИХ ТАБЛИЦАХ + ЧЁТКАЯ СМЕНА ХОДА)
CREATE OR REPLACE FUNCTION public.battleship_fire(
    p_room_code TEXT,
    p_player_id TEXT DEFAULT NULL,
    p_x INT DEFAULT 0,
    p_y INT DEFAULT 0
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
    v_opponent_fleet JSONB := NULL;
    v_hit BOOLEAN := FALSE;
    v_hit_ship_id TEXT := NULL;
    v_hit_ship_type TEXT := NULL;
    v_sunk BOOLEAN := FALSE;
    v_all_sunk BOOLEAN := TRUE;
    v_already_shot BOOLEAN := FALSE;
    v_result_str TEXT;
    v_shot_record JSONB;
    v_next_turn TEXT;
    v_winner TEXT := NULL;
    v_next_deadline TIMESTAMPTZ;
    v_elo_res JSONB := NULL;
    v_f1 JSONB := NULL;
    v_f2 JSONB := NULL;
BEGIN
    v_caller_auth := auth.uid();
    v_clean_code := trim(upper(p_room_code))::varchar;

    SELECT * INTO r FROM public.battleship_rooms WHERE code = v_clean_code FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Комната не найдена');
    END IF;

    IF r.status <> 'battle'::varchar THEN
        RETURN jsonb_build_object('success', false, 'error', 'Матч не находится в фазе боя');
    END IF;

    -- Определение роли стрелка
    IF v_caller_auth IS NOT NULL AND v_caller_auth = r.player1_user_id THEN
        v_is_p1 := TRUE;
        v_shooter_role := 'player1';
    ELSIF v_caller_auth IS NOT NULL AND v_caller_auth = r.player2_user_id THEN
        v_is_p1 := FALSE;
        v_shooter_role := 'player2';
    ELSIF p_player_id IS NOT NULL AND p_player_id = r.player1_id THEN
        v_is_p1 := TRUE;
        v_shooter_role := 'player1';
    ELSIF p_player_id IS NOT NULL AND p_player_id = r.player2_id THEN
        v_is_p1 := FALSE;
        v_shooter_role := 'player2';
    ELSE
        -- Fallback: используем текущий ход комнаты
        v_shooter_role := r.current_turn;
        v_is_p1 := (v_shooter_role = 'player1');
    END IF;

    IF r.current_turn <> v_shooter_role THEN
        RETURN jsonb_build_object('success', false, 'error', 'Сейчас ход противника');
    END IF;

    IF p_x < 0 OR p_x > 9 OR p_y < 0 OR p_y > 9 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Координаты выходят за пределы поля 10x10');
    END IF;

    -- Проверка на повторный выстрел
    SELECT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(r.shots_history, '[]'::jsonb)) AS elem
        WHERE (elem->>'shooter') = v_shooter_role
          AND elem->>'x' IS NOT NULL
          AND (elem->>'x')::int = p_x
          AND (elem->>'y')::int = p_y
    ) INTO v_already_shot;

    IF v_already_shot THEN
        RETURN jsonb_build_object('success', false, 'error', 'В эту клетку уже был произведён выстрел');
    END IF;

    -- Читаем флот из battleship_fleets
    SELECT player1_fleet, player2_fleet INTO v_f1, v_f2 
    FROM public.battleship_fleets 
    WHERE room_code = v_clean_code;

    -- Резервное чтение из battleship_rooms, если в fleets было пусто
    IF v_f1 IS NULL THEN
        v_f1 := r.player1_fleet;
    END IF;
    IF v_f2 IS NULL THEN
        v_f2 := r.player2_fleet;
    END IF;

    IF v_is_p1 THEN
        v_opponent_fleet := v_f2;
    ELSE
        v_opponent_fleet := v_f1;
    END IF;

    IF v_opponent_fleet IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Флот противника не найден');
    END IF;

    -- Проверка попадания
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
    WHERE (c->>'x')::int = p_x AND (c->>'y')::int = p_y
    LIMIT 1;

    v_hit := COALESCE(v_hit, FALSE);

    -- Проверка потопления
    IF v_hit AND v_hit_ship_id IS NOT NULL THEN
        SELECT NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(v_opponent_fleet) AS s,
                 jsonb_array_elements(s->'coords') AS c
            WHERE (s->>'id') = v_hit_ship_id
              AND NOT ((c->>'x')::int = p_x AND (c->>'y')::int = p_y)
              AND NOT EXISTS (
                  SELECT 1
                  FROM jsonb_array_elements(COALESCE(r.shots_history, '[]'::jsonb)) AS elem
                  WHERE (elem->>'shooter') = v_shooter_role
                    AND elem->>'x' IS NOT NULL
                    AND (elem->>'x')::int = (c->>'x')::int
                    AND (elem->>'y')::int = (c->>'y')::int
              )
        ) INTO v_sunk;
    END IF;

    -- Проверка победы (все ли корабли потоплены)
    IF v_sunk THEN
        SELECT NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(v_opponent_fleet) AS s,
                 jsonb_array_elements(s->'coords') AS c
            WHERE NOT ((c->>'x')::int = p_x AND (c->>'y')::int = p_y)
              AND NOT EXISTS (
                  SELECT 1
                  FROM jsonb_array_elements(COALESCE(r.shots_history, '[]'::jsonb)) AS elem
                  WHERE (elem->>'shooter') = v_shooter_role
                    AND elem->>'x' IS NOT NULL
                    AND (elem->>'x')::int = (c->>'x')::int
                    AND (elem->>'y')::int = (c->>'y')::int
              )
        ) INTO v_all_sunk;
    ELSE
        v_all_sunk := FALSE;
    END IF;

    v_result_str := CASE WHEN v_sunk THEN 'sunk' WHEN v_hit THEN 'hit' ELSE 'miss' END;

    v_shot_record := jsonb_build_object(
        'shooter', v_shooter_role,
        'x', p_x,
        'y', p_y,
        'hit', v_hit,
        'sunk', v_sunk,
        'result', v_result_str,
        'ship_id', CASE WHEN v_sunk THEN v_hit_ship_id ELSE NULL END,
        'ship_type', CASE WHEN v_sunk THEN v_hit_ship_type ELSE NULL END,
        't', (extract(epoch from now()) * 1000)::bigint
    );

    IF v_all_sunk THEN
        v_winner := v_shooter_role;
        v_next_turn := NULL;
        v_next_deadline := NULL;

        UPDATE public.battleship_rooms
        SET status = 'finished'::varchar,
            winner = v_winner::varchar,
            player1_fleet = v_f1,
            player2_fleet = v_f2,
            shots_history = COALESCE(r.shots_history, '[]'::jsonb) || v_shot_record,
            turn_deadline = NULL,
            updated_at = now()
        WHERE code = v_clean_code;

        -- Расчёт рейтинга ELO
        BEGIN
            v_elo_res := public.battleship_process_match_elo(v_clean_code);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    ELSE
        -- При попадании игрок стреляет снова, при промахе — переход хода!
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
        'result', v_result_str,
        'ship_id', CASE WHEN v_sunk THEN v_hit_ship_id ELSE NULL END,
        'ship_type', CASE WHEN v_sunk THEN v_hit_ship_type ELSE NULL END,
        'game_over', v_all_sunk,
        'all_sunk', v_all_sunk,
        'winner', v_winner,
        'next_turn', v_next_turn,
        'turn_deadline', v_next_deadline,
        'elo', v_elo_res
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.battleship_fire(TEXT, TEXT, INT, INT) TO anon, authenticated;

-- ШАГ 6: RPC battleship_handle_timeout
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
    v_timed_out_turn TEXT;
    v_next_turn TEXT;
    v_next_deadline TIMESTAMPTZ;
    v_timeout_record JSONB;
BEGIN
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

    v_timed_out_turn := r.current_turn;
    v_next_turn := CASE WHEN v_timed_out_turn = 'player1' THEN 'player2' ELSE 'player1' END;
    v_next_deadline := now() + interval '25 seconds';

    v_timeout_record := jsonb_build_object(
        'shooter', v_timed_out_turn,
        'timeout', true,
        't', (extract(epoch from now()) * 1000)::bigint
    );

    UPDATE public.battleship_rooms
    SET current_turn = v_next_turn::varchar,
        shots_history = COALESCE(r.shots_history, '[]'::jsonb) || v_timeout_record,
        turn_deadline = v_next_deadline,
        updated_at = now()
    WHERE code = v_clean_code;

    RETURN jsonb_build_object(
        'success', true,
        'next_turn', v_next_turn,
        'turn_deadline', v_next_deadline
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.battleship_handle_timeout(TEXT, TEXT) TO anon, authenticated;

-- ШАГ 7: RPC battleship_get_room
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

    SELECT player1_fleet, player2_fleet INTO v_f1, v_f2
    FROM public.battleship_fleets
    WHERE room_code = v_clean_code;

    IF v_f1 IS NULL THEN v_f1 := r.player1_fleet; END IF;
    IF v_f2 IS NULL THEN v_f2 := r.player2_fleet; END IF;

    IF v_finished OR v_is_p1 THEN
        v_p1_fleet := v_f1;
    END IF;

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

-- ШАГ 8: RPC battleship_check_username_available
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

    -- Особый случай для XPIRIANS и аккаунта poozitiv06@gmail.com
    IF lower(v_clean) = 'xpirians' THEN
        IF auth.uid() IS NOT NULL THEN
            IF EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND lower(email) = 'poozitiv06@gmail.com') THEN
                RETURN TRUE;
            END IF;
        END IF;
    END IF;

    SELECT id INTO v_existing_id
    FROM public.profiles
    WHERE lower(username) = lower(v_clean)
    LIMIT 1;

    IF v_existing_id IS NULL THEN
        RETURN TRUE;
    END IF;

    IF auth.uid() IS NOT NULL AND auth.uid() = v_existing_id THEN
        RETURN TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_existing_id) THEN
        DELETE FROM public.profiles WHERE id = v_existing_id;
        RETURN TRUE;
    END IF;

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

-- ШАГ 9: ТРИГГЕР ДЛЯ НОВЫХ ПОЛЬЗОВАТЕЛЕЙ (handle_new_user)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_raw_username TEXT;
    v_clean_name TEXT;
    v_avatar TEXT;
BEGIN
    v_raw_username := COALESCE(
        NEW.raw_user_meta_data->>'username',
        NEW.raw_user_meta_data->>'callsign',
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'name',
        split_part(COALESCE(NEW.email, 'капитан'), '@', 1)
    );

    v_clean_name := trim(regexp_replace(v_raw_username, '[^a-zA-Z0-9_а-яА-ЯёЁ]', '', 'g'));
    IF char_length(v_clean_name) < 3 THEN
        v_clean_name := 'Капитан_' || substr(replace(NEW.id::text, '-', ''), 1, 6);
    ELSIF char_length(v_clean_name) > 16 THEN
        v_clean_name := substr(v_clean_name, 1, 16);
    END IF;

    v_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        'https://api.dicebear.com/7.x/bottts/svg?seed=' || v_clean_name
    );

    BEGIN
        INSERT INTO public.profiles (id, username, avatar_url, created_at, updated_at)
        VALUES (NEW.id, v_clean_name, v_avatar, now(), now())
        ON CONFLICT (id) DO UPDATE
        SET updated_at = now();
    EXCEPTION WHEN OTHERS THEN
        BEGIN
            v_clean_name := 'Кап_' || substr(replace(NEW.id::text, '-', ''), 1, 11);
            INSERT INTO public.profiles (id, username, avatar_url, created_at, updated_at)
            VALUES (NEW.id, v_clean_name, v_avatar, now(), now())
            ON CONFLICT (id) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END;

    BEGIN
        INSERT INTO public.player_ratings (user_id, rating, wins, losses, games_played, created_at, updated_at)
        VALUES (NEW.id, 1000, 0, 0, 0, now(), now())
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

GRANT ALL ON TABLE public.profiles TO postgres, service_role;
GRANT ALL ON TABLE public.player_ratings TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

