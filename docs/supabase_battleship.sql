-- ==============================================================================
-- INFINITE GALLERY: BATTLESHIP — СХЕМА БАЗЫ ДАННЫХ SUPABASE
-- Проект: Infinite Gallery & Farm & Battleship
-- Версия: 2.0 (Исправление ошибки 42883, серверный таймер, атомарная расстановка)
-- ==============================================================================

-- 1. Таблица комнат морского боя (не удаляет данные при повторном запуске)
CREATE TABLE IF NOT EXISTS public.battleship_rooms (
    code VARCHAR(8) PRIMARY KEY,
    status VARCHAR(16) NOT NULL DEFAULT 'waiting',
    player1_id VARCHAR(64) NOT NULL,
    player1_name VARCHAR(32) NOT NULL DEFAULT 'Адмирал 1',
    player1_ready BOOLEAN NOT NULL DEFAULT FALSE,
    player1_fleet JSONB DEFAULT NULL,
    player2_id VARCHAR(64) DEFAULT NULL,
    player2_name VARCHAR(32) DEFAULT NULL,
    player2_ready BOOLEAN NOT NULL DEFAULT FALSE,
    player2_fleet JSONB DEFAULT NULL,
    current_turn VARCHAR(16) DEFAULT NULL,
    winner VARCHAR(16) DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    prep_deadline TIMESTAMPTZ DEFAULT NULL,
    turn_deadline TIMESTAMPTZ DEFAULT NULL,
    shots_history JSONB DEFAULT '[]'::jsonb NOT NULL,
    timeouts_player1 SMALLINT DEFAULT 0,
    timeouts_player2 SMALLINT DEFAULT 0
);

-- Индекс для быстрого поиска комнат
CREATE INDEX IF NOT EXISTS idx_battleship_status ON public.battleship_rooms (status, created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE public.battleship_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read battleship_rooms" ON public.battleship_rooms;
CREATE POLICY "Allow public read battleship_rooms"
ON public.battleship_rooms FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow public insert battleship_rooms" ON public.battleship_rooms;
CREATE POLICY "Allow public insert battleship_rooms"
ON public.battleship_rooms FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update battleship_rooms" ON public.battleship_rooms;
CREATE POLICY "Allow public update battleship_rooms"
ON public.battleship_rooms FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON TABLE public.battleship_rooms TO anon, authenticated;

-- ==============================================================================
-- 2. СЕРВЕРНАЯ ПРОВЕРКА ВЫСТРЕЛА (RPC: battleship_fire)
-- Исправлена ошибка 42883 (operator does not exist: text = unknown / record ->> unknown).
-- Исключены нетипизированные переменные RECORD, используется строгий set-based JSONB.
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
BEGIN
    -- 1. Находим комнату с блокировкой строки от параллельных запросов
    SELECT * INTO r FROM public.battleship_rooms WHERE code = p_room_code::varchar FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Комната не найдена');
    END IF;

    IF r.status <> 'battle'::varchar THEN
        RETURN jsonb_build_object('success', false, 'error', 'Матч не находится в фазе боя');
    END IF;

    -- 2. Проверяем очерёдность хода
    IF p_player_id::text = (r.player1_id)::text THEN
        v_is_p1 := TRUE;
        v_shooter_role := 'player1'::text;
        IF r.current_turn <> 'player1'::varchar THEN
            RETURN jsonb_build_object('success', false, 'error', 'Сейчас ход противника');
        END IF;
        v_opponent_fleet := r.player2_fleet;
    ELSIF p_player_id::text = (r.player2_id)::text THEN
        v_is_p1 := FALSE;
        v_shooter_role := 'player2'::text;
        IF r.current_turn <> 'player2'::varchar THEN
            RETURN jsonb_build_object('success', false, 'error', 'Сейчас ход противника');
        END IF;
        v_opponent_fleet := r.player1_fleet;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Вы не являетесь участником этого матча');
    END IF;

    -- 3. Проверка границ поля
    IF p_x < 0 OR p_x > 9 OR p_y < 0 OR p_y > 9 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Координаты выстрела вне границ поля');
    END IF;

    -- 4. Проверка на повторный выстрел в эту же клетку
    SELECT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(r.shots_history) AS s
        WHERE (s->>'shooter')::text = v_shooter_role
          AND (s->>'x')::int = p_x
          AND (s->>'y')::int = p_y
    ) INTO v_already_shot;

    IF v_already_shot THEN
        RETURN jsonb_build_object('success', false, 'error', 'В эту клетку уже производился выстрел');
    END IF;

    -- 5. Проверка попадания по кораблям соперника
    SELECT s->>'id', s->>'type'
    INTO v_hit_ship_id, v_hit_ship_type
    FROM jsonb_array_elements(v_opponent_fleet) AS s,
         jsonb_array_elements(s->'coords') AS c
    WHERE (c->>'x')::int = p_x AND (c->>'y')::int = p_y
    LIMIT 1;

    IF v_hit_ship_id IS NOT NULL THEN
        v_hit := TRUE;

        -- Проверка потопления корабля: поражены ли все его клетки
        SELECT NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(v_opponent_fleet) AS s,
                 jsonb_array_elements(s->'coords') AS c
            WHERE (s->>'id')::text = v_hit_ship_id
              AND NOT (
                  ((c->>'x')::int = p_x AND (c->>'y')::int = p_y)
                  OR EXISTS (
                      SELECT 1
                      FROM jsonb_array_elements(r.shots_history) AS prev
                      WHERE (prev->>'shooter')::text = v_shooter_role
                        AND (prev->>'x')::int = (c->>'x')::int
                        AND (prev->>'y')::int = (c->>'y')::int
                        AND (prev->>'result')::text IN ('hit'::text, 'sunk'::text)
                  )
              )
        ) INTO v_sunk;
    ELSE
        v_hit := FALSE;
        v_sunk := FALSE;
    END IF;

    -- 6. Формирование записи выстрела
    v_shot_record := jsonb_build_object(
        'shooter', v_shooter_role,
        'x', p_x,
        'y', p_y,
        'result', CASE WHEN v_sunk THEN 'sunk'::text WHEN v_hit THEN 'hit'::text ELSE 'miss'::text END,
        'ship_type', v_hit_ship_type
    );

    -- 7. Передача хода: при попадании/потоплении игрок стреляет снова, при промахе — переход
    IF v_hit THEN
        v_next_turn := r.current_turn::text;
    ELSE
        v_next_turn := CASE WHEN v_is_p1 THEN 'player2'::text ELSE 'player1'::text END;
    END IF;

    -- 8. Проверка победы (все ли корабли флота противника потоплены)
    SELECT NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_opponent_fleet) AS s,
             jsonb_array_elements(s->'coords') AS c
        WHERE NOT (
            ((c->>'x')::int = p_x AND (c->>'y')::int = p_y)
            OR EXISTS (
                SELECT 1
                FROM jsonb_array_elements(r.shots_history) AS prev
                WHERE (prev->>'shooter')::text = v_shooter_role
                  AND (prev->>'x')::int = (c->>'x')::int
                  AND (prev->>'y')::int = (c->>'y')::int
                  AND (prev->>'result')::text IN ('hit'::text, 'sunk'::text)
            )
        )
    ) INTO v_all_sunk;

    IF v_all_sunk THEN
        v_winner := v_shooter_role;
    END IF;

    v_next_deadline := timezone('utc'::text, now()) + interval '25 seconds';

    -- 9. Атомарное обновление состояния комнаты в базе данных
    UPDATE public.battleship_rooms
    SET shots_history = shots_history || v_shot_record,
        current_turn = v_next_turn::varchar,
        turn_deadline = v_next_deadline,
        winner = v_winner::varchar,
        status = CASE WHEN v_winner IS NOT NULL THEN 'finished'::varchar ELSE 'battle'::varchar END,
        timeouts_player1 = CASE WHEN v_is_p1 THEN 0 ELSE timeouts_player1 END,
        timeouts_player2 = CASE WHEN NOT v_is_p1 THEN 0 ELSE timeouts_player2 END
    WHERE code = p_room_code::varchar;

    RETURN jsonb_build_object(
        'success', true,
        'result', CASE WHEN v_sunk THEN 'sunk'::text WHEN v_hit THEN 'hit'::text ELSE 'miss'::text END,
        'x', p_x,
        'y', p_y,
        'ship_type', v_hit_ship_type,
        'all_sunk', v_all_sunk,
        'winner', v_winner,
        'next_turn', v_next_turn,
        'turn_deadline', v_next_deadline
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.battleship_fire(TEXT, TEXT, INT, INT) TO anon, authenticated;

-- ==============================================================================
-- 3. АТОМАРНАЯ ОТПРАВКА РАССТАНОВКИ ФЛОТА (RPC: battleship_submit_placement)
-- Исключает гонку запросов при одновременном нажатии «Готов к бою».
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.battleship_submit_placement(
    p_room_code TEXT,
    p_player_id TEXT,
    p_fleet JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    r RECORD;
    v_is_p1 BOOLEAN;
    v_p1_ready BOOLEAN;
    v_p2_ready BOOLEAN;
    v_p1_fleet JSONB;
    v_p2_fleet JSONB;
    v_both_ready BOOLEAN;
    v_first_turn TEXT;
    v_turn_deadline TIMESTAMPTZ;
BEGIN
    SELECT * INTO r FROM public.battleship_rooms WHERE code = p_room_code::varchar FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Комната не найдена');
    END IF;

    IF r.status <> 'placement'::varchar AND r.status <> 'waiting'::varchar THEN
        RETURN jsonb_build_object('success', true, 'status', r.status, 'already_started', true);
    END IF;

    IF p_player_id::text = (r.player1_id)::text THEN
        v_is_p1 := TRUE;
        v_p1_ready := TRUE;
        v_p1_fleet := p_fleet;
        v_p2_ready := r.player2_ready;
        v_p2_fleet := r.player2_fleet;
    ELSIF p_player_id::text = (r.player2_id)::text THEN
        v_is_p1 := FALSE;
        v_p1_ready := r.player1_ready;
        v_p1_fleet := r.player1_fleet;
        v_p2_ready := TRUE;
        v_p2_fleet := p_fleet;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Вы не являетесь участником этой комнаты');
    END IF;

    v_both_ready := v_p1_ready AND v_p2_ready;

    IF v_both_ready THEN
        v_first_turn := CASE WHEN random() < 0.5 THEN 'player1'::text ELSE 'player2'::text END;
        v_turn_deadline := timezone('utc'::text, now()) + interval '25 seconds';

        UPDATE public.battleship_rooms
        SET player1_fleet = v_p1_fleet,
            player1_ready = TRUE,
            player2_fleet = v_p2_fleet,
            player2_ready = TRUE,
            status = 'battle'::varchar,
            current_turn = v_first_turn::varchar,
            turn_deadline = v_turn_deadline
        WHERE code = p_room_code::varchar;

        RETURN jsonb_build_object(
            'success', true,
            'status', 'battle',
            'current_turn', v_first_turn,
            'turn_deadline', v_turn_deadline
        );
    ELSE
        IF v_is_p1 THEN
            UPDATE public.battleship_rooms
            SET player1_fleet = v_p1_fleet,
                player1_ready = TRUE
            WHERE code = p_room_code::varchar;
        ELSE
            UPDATE public.battleship_rooms
            SET player2_fleet = v_p2_fleet,
                player2_ready = TRUE
            WHERE code = p_room_code::varchar;
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'status', 'placement',
            'player1_ready', v_p1_ready,
            'player2_ready', v_p2_ready
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.battleship_submit_placement(TEXT, TEXT, JSONB) TO anon, authenticated;

-- ==============================================================================
-- 4. АТОМАРНАЯ ОБРАБОТКА ИСТЕЧЕНИЯ ТАЙМЕРА ХОДА (RPC: battleship_handle_timeout)
-- Гарантирует синхронный переход хода при бездействии одного из игроков.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.battleship_handle_timeout(
    p_room_code TEXT,
    p_player_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    r RECORD;
    v_next_turn TEXT;
    v_timed_out_player TEXT;
    v_new_timeouts INT;
    v_winner TEXT := NULL;
    v_turn_deadline TIMESTAMPTZ;
BEGIN
    SELECT * INTO r FROM public.battleship_rooms WHERE code = p_room_code::varchar FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Комната не найдена');
    END IF;

    IF r.status <> 'battle'::varchar THEN
        RETURN jsonb_build_object('success', false, 'error', 'Матч не находится в фазе боя');
    END IF;

    -- Проверка: действительно ли истек дедлайн (с допуском 0.5с)
    IF r.turn_deadline IS NOT NULL AND timezone('utc'::text, now()) < (r.turn_deadline - interval '500 milliseconds') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Время хода ещё не истекло');
    END IF;

    v_timed_out_player := r.current_turn::text;
    v_next_turn := CASE WHEN r.current_turn = 'player1'::varchar THEN 'player2'::text ELSE 'player1'::text END;
    v_turn_deadline := timezone('utc'::text, now()) + interval '25 seconds';

    IF v_timed_out_player = 'player1'::text THEN
        v_new_timeouts := COALESCE(r.timeouts_player1, 0) + 1;
        IF v_new_timeouts >= 3 THEN
            v_winner := 'player2'::text;
        END IF;

        UPDATE public.battleship_rooms
        SET timeouts_player1 = v_new_timeouts,
            current_turn = v_next_turn::varchar,
            turn_deadline = v_turn_deadline,
            winner = v_winner::varchar,
            status = CASE WHEN v_winner IS NOT NULL THEN 'finished'::varchar ELSE 'battle'::varchar END
        WHERE code = p_room_code::varchar;
    ELSE
        v_new_timeouts := COALESCE(r.timeouts_player2, 0) + 1;
        IF v_new_timeouts >= 3 THEN
            v_winner := 'player1'::text;
        END IF;

        UPDATE public.battleship_rooms
        SET timeouts_player2 = v_new_timeouts,
            current_turn = v_next_turn::varchar,
            turn_deadline = v_turn_deadline,
            winner = v_winner::varchar,
            status = CASE WHEN v_winner IS NOT NULL THEN 'finished'::varchar ELSE 'battle'::varchar END
        WHERE code = p_room_code::varchar;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'next_turn', v_next_turn,
        'turn_deadline', v_turn_deadline,
        'timed_out_player', v_timed_out_player,
        'timeouts_count', v_new_timeouts,
        'winner', v_winner
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.battleship_handle_timeout(TEXT, TEXT) TO anon, authenticated;
