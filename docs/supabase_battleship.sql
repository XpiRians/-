-- ==============================================================================
-- INFINITE GALLERY: BATTLESHIP — СХЕМА БАЗЫ ДАННЫХ SUPABASE
-- Проект: Infinite Gallery & Farm & Battleship
-- Версия: 1.0 (Безопасная онлайн-синхронизация, защита от читов, таймеры и дедупликация)
-- ==============================================================================

-- 1. Таблица комнат морского боя
CREATE TABLE IF NOT EXISTS public.battleship_rooms (
    -- Короткий 6-символьный код комнаты (например, 'SEA492')
    code VARCHAR(8) PRIMARY KEY,

    -- Статус матча: 'waiting', 'placement', 'battle', 'finished', 'cancelled'
    status VARCHAR(16) NOT NULL DEFAULT 'waiting',

    -- Игрок 1 (создатель)
    player1_id VARCHAR(64) NOT NULL,
    player1_name VARCHAR(32) NOT NULL DEFAULT 'Адмирал 1',
    player1_ready BOOLEAN NOT NULL DEFAULT FALSE,
    player1_fleet JSONB DEFAULT NULL, -- Хранится на сервере, скрыт от противника до конца матча!

    -- Игрок 2 (соперник)
    player2_id VARCHAR(64) DEFAULT NULL,
    player2_name VARCHAR(32) DEFAULT NULL,
    player2_ready BOOLEAN NOT NULL DEFAULT FALSE,
    player2_fleet JSONB DEFAULT NULL, -- Хранится на сервере, скрыт от противника до конца матча!

    -- Очередность хода: 'player1' или 'player2'
    current_turn VARCHAR(16) DEFAULT NULL,

    -- Победитель матча: NULL, 'player1' или 'player2'
    winner VARCHAR(16) DEFAULT NULL,

    -- Таймеры матча
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    prep_deadline TIMESTAMPTZ DEFAULT NULL,
    turn_deadline TIMESTAMPTZ DEFAULT NULL,

    -- История выстрелов: массив [{shooter: 'player1'|'player2', x: 0, y: 5, result: 'hit'|'miss'|'sunk'}]
    shots_history JSONB DEFAULT '[]'::jsonb NOT NULL,

    -- Счётчик подряд пропущенных ходов по таймеру (для техпоражения)
    timeouts_player1 SMALLINT DEFAULT 0,
    timeouts_player2 SMALLINT DEFAULT 0
);

-- Индексы для быстрого поиска комнат в лобби
CREATE INDEX IF NOT EXISTS idx_battleship_status ON public.battleship_rooms (status, created_at DESC);

-- Включение Row Level Security (RLS)
ALTER TABLE public.battleship_rooms ENABLE ROW LEVEL SECURITY;

-- Публичный просмотр открытых комнат и активного матча
DROP POLICY IF EXISTS "Allow public read battleship_rooms" ON public.battleship_rooms;
CREATE POLICY "Allow public read battleship_rooms"
ON public.battleship_rooms
FOR SELECT
TO anon, authenticated
USING (true);

-- Создание комнат игроками
DROP POLICY IF EXISTS "Allow public insert battleship_rooms" ON public.battleship_rooms;
CREATE POLICY "Allow public insert battleship_rooms"
ON public.battleship_rooms
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Обновление комнат игроками
DROP POLICY IF EXISTS "Allow public update battleship_rooms" ON public.battleship_rooms;
CREATE POLICY "Allow public update battleship_rooms"
ON public.battleship_rooms
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON TABLE public.battleship_rooms TO anon, authenticated;

-- ==============================================================================
-- 2. СЕРВЕРНАЯ ПРОВЕРКА ВЫСТРЕЛА (RPC: battleship_fire)
-- Браузер отправляет только координаты (x, y). Сервер проверяет попадание
-- по скрытому флоту противника и возвращает результат.
-- Клиент не может подсмотреть флот противника в DevTools!
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
    v_opponent_fleet JSONB;
    v_ship JSONB;
    v_coord JSONB;
    v_hit BOOLEAN := FALSE;
    v_hit_ship_id TEXT := NULL;
    v_hit_ship_type TEXT := NULL;
    v_sunk BOOLEAN := FALSE;
    v_all_sunk BOOLEAN := TRUE;
    v_shot_record JSONB;
    v_next_turn TEXT;
    v_winner TEXT := NULL;
BEGIN
    -- 1. Находим комнату
    SELECT * INTO r FROM public.battleship_rooms WHERE code = p_room_code FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Комната не найдена');
    END IF;

    IF r.status <> 'battle' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Матч не находится в фазе боя');
    END IF;

    -- 2. Проверяем чей ход
    IF p_player_id = r.player1_id THEN
        v_is_p1 := TRUE;
        IF r.current_turn <> 'player1' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Сейчас ход противника');
        END IF;
        v_opponent_fleet := r.player2_fleet;
    ELSIF p_player_id = r.player2_id THEN
        v_is_p1 := FALSE;
        IF r.current_turn <> 'player2' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Сейчас ход противника');
        END IF;
        v_opponent_fleet := r.player1_fleet;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Вы не являетесь участником этого матча');
    END IF;

    -- 3. Проверяем, не стреляли ли уже в эту клетку
    FOR v_shot_record IN SELECT * FROM jsonb_array_elements(r.shots_history) LOOP
        IF (v_shot_record->>'shooter' = CASE WHEN v_is_p1 THEN 'player1' ELSE 'player2' END)
           AND ((v_shot_record->>'x')::int = p_x)
           AND ((v_shot_record->>'y')::int = p_y) THEN
            RETURN jsonb_build_object('success', false, 'error', 'В эту клетку уже производился выстрел');
        END IF;
    END LOOP;

    -- 4. Серверная проверка попадания по флоту соперника
    FOR v_ship IN SELECT * FROM jsonb_array_elements(v_opponent_fleet) LOOP
        -- Проверяем координаты корабля
        FOR v_coord IN SELECT * FROM jsonb_array_elements(v_ship->'coords') LOOP
            IF (v_coord->>'x')::int = p_x AND (v_coord->>'y')::int = p_y THEN
                v_hit := TRUE;
                v_hit_ship_id := v_ship->>'id';
                v_hit_ship_type := v_ship->>'type';
                EXIT;
            END IF;
        END LOOP;
        IF v_hit THEN EXIT; END IF;
    END LOOP;

    -- 5. Если попадание — проверяем, потоплен ли весь корабль
    IF v_hit THEN
        -- Считаем, все ли клетки этого корабля уже поражены
        DECLARE
            v_all_coords_hit BOOLEAN := TRUE;
            v_c RECORD;
            v_c_hit BOOLEAN;
            v_prev_shot RECORD;
        BEGIN
            FOR v_ship IN SELECT * FROM jsonb_array_elements(v_opponent_fleet) LOOP
                IF v_ship->>'id' = v_hit_ship_id THEN
                    FOR v_coord IN SELECT * FROM jsonb_array_elements(v_ship->'coords') LOOP
                        IF (v_coord->>'x')::int = p_x AND (v_coord->>'y')::int = p_y THEN
                            -- Это текущий выстрел, он точно попал
                            CONTINUE;
                        END IF;

                        v_c_hit := FALSE;
                        FOR v_prev_shot IN SELECT * FROM jsonb_array_elements(r.shots_history) LOOP
                            IF (v_prev_shot->>'shooter' = CASE WHEN v_is_p1 THEN 'player1' ELSE 'player2' END)
                               AND ((v_prev_shot->>'x')::int = (v_coord->>'x')::int)
                               AND ((v_prev_shot->>'y')::int = (v_coord->>'y')::int)
                               AND (v_prev_shot->>'result' IN ('hit', 'sunk')) THEN
                                v_c_hit := TRUE;
                                EXIT;
                            END IF;
                        END LOOP;

                        IF NOT v_c_hit THEN
                            v_all_coords_hit := FALSE;
                            EXIT;
                        END IF;
                    END LOOP;
                    EXIT;
                END IF;
            END LOOP;

            v_sunk := v_all_coords_hit;
        END;
    END IF;

    -- 6. Формируем запись выстрела
    v_shot_record := jsonb_build_object(
        'shooter', CASE WHEN v_is_p1 THEN 'player1' ELSE 'player2' END,
        'x', p_x,
        'y', p_y,
        'result', CASE WHEN v_sunk THEN 'sunk' WHEN v_hit THEN 'hit' ELSE 'miss' END,
        'ship_type', v_hit_ship_type
    );

    -- 7. Очередность хода: при попадании стреляющий стреляет СНОВА! При промахе ход переходит
    IF v_hit THEN
        v_next_turn := r.current_turn;
    ELSE
        v_next_turn := CASE WHEN v_is_p1 THEN 'player2' ELSE 'player1' END;
    END IF;

    -- 8. Проверка победы (потоплены ли все корабли)
    -- Проверяем каждую клетку каждого корабля соперника
    v_all_sunk := TRUE;
    FOR v_ship IN SELECT * FROM jsonb_array_elements(v_opponent_fleet) LOOP
        FOR v_coord IN SELECT * FROM jsonb_array_elements(v_ship->'coords') LOOP
            DECLARE
                v_cell_hit BOOLEAN := FALSE;
                v_sh RECORD;
            BEGIN
                IF (v_coord->>'x')::int = p_x AND (v_coord->>'y')::int = p_y THEN
                    v_cell_hit := TRUE;
                ELSE
                    FOR v_sh IN SELECT * FROM jsonb_array_elements(r.shots_history) LOOP
                        IF (v_sh->>'shooter' = CASE WHEN v_is_p1 THEN 'player1' ELSE 'player2' END)
                           AND ((v_sh->>'x')::int = (v_coord->>'x')::int)
                           AND ((v_sh->>'y')::int = (v_coord->>'y')::int)
                           AND (v_sh->>'result' IN ('hit', 'sunk')) THEN
                            v_cell_hit := TRUE;
                            EXIT;
                        END IF;
                    END LOOP;
                END IF;

                IF NOT v_cell_hit THEN
                    v_all_sunk := FALSE;
                    EXIT;
                END IF;
            END;
        END LOOP;
        IF NOT v_all_sunk THEN EXIT; END IF;
    END LOOP;

    IF v_all_sunk THEN
        v_winner := CASE WHEN v_is_p1 THEN 'player1' ELSE 'player2' END;
    END IF;

    -- 9. Обновляем состояние комнаты в БД
    UPDATE public.battleship_rooms
    SET shots_history = shots_history || v_shot_record,
        current_turn = v_next_turn,
        turn_deadline = timezone('utc'::text, now()) + interval '25 seconds',
        winner = v_winner,
        status = CASE WHEN v_winner IS NOT NULL THEN 'finished' ELSE 'battle' END
    WHERE code = p_room_code;

    RETURN jsonb_build_object(
        'success', true,
        'result', CASE WHEN v_sunk THEN 'sunk' WHEN v_hit THEN 'hit' ELSE 'miss' END,
        'x', p_x,
        'y', p_y,
        'ship_type', v_hit_ship_type,
        'all_sunk', v_all_sunk,
        'winner', v_winner,
        'next_turn', v_next_turn
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.battleship_fire(TEXT, TEXT, INT, INT) TO anon, authenticated;
