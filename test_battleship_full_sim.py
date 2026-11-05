import random
import time

GRID_SIZE = 10

FLEET_SPEC = [
    {"type": "battleship", "name": "Линкор", "size": 4, "count": 1, "icon": "🚢"},
    {"type": "cruiser", "name": "Крейсер", "size": 3, "count": 2, "icon": "🛥️"},
    {"type": "destroyer", "name": "Эсминец", "size": 2, "count": 3, "icon": "⛵"},
    {"type": "boat", "name": "Катер", "size": 1, "count": 4, "icon": "🚤"}
]

CELL_EMPTY = 0
CELL_SHIP = 1
CELL_MISS = 2
CELL_HIT = 3
CELL_HALO = 4

class Ship:
    def __init__(self, ship_id, ship_type, size, x, y, horizontal=True):
        self.id = ship_id
        self.type = ship_type
        self.size = size
        self.x = x
        self.y = y
        self.horizontal = horizontal
        self.hits = 0
        self.sunk = False
        spec = next((s for s in FLEET_SPEC if s["type"] == ship_type or s["size"] == size), None)
        self.name = spec["name"] if spec else "Корабль"
        self.icon = spec["icon"] if spec else "🚢"

    def get_coordinates(self):
        coords = []
        for i in range(self.size):
            cx = self.x + i if self.horizontal else self.x
            cy = self.y if self.horizontal else self.y + i
            coords.append((cx, cy))
        return coords

    def occupies(self, x, y):
        return (x, y) in self.get_coordinates()

class Board:
    def __init__(self):
        self.size = GRID_SIZE
        self.ships = []
        self.grid = [[CELL_EMPTY] * GRID_SIZE for _ in range(GRID_SIZE)]

    def clear(self):
        self.ships = []
        self.grid = [[CELL_EMPTY] * GRID_SIZE for _ in range(GRID_SIZE)]

    def can_place_ship(self, size, x, y, horizontal, ignore_id=None):
        if x < 0 or y < 0: return False
        end_x = x + size - 1 if horizontal else x
        end_y = y if horizontal else y + size - 1
        if end_x >= self.size or end_y >= self.size: return False

        min_x = max(0, x - 1)
        max_x = min(self.size - 1, end_x + 1)
        min_y = max(0, y - 1)
        max_y = min(self.size - 1, end_y + 1)

        for cy in range(min_y, max_y + 1):
            for cx in range(min_x, max_x + 1):
                for s in self.ships:
                    if ignore_id and s.id == ignore_id: continue
                    if s.occupies(cx, cy): return False
        return True

    def place_ship(self, ship_id, ship_type, size, x, y, horizontal):
        if not self.can_place_ship(size, x, y, horizontal, ship_id):
            return False
        self.ships = [s for s in self.ships if s.id != ship_id]
        ship = Ship(ship_id, ship_type, size, x, y, horizontal)
        self.ships.append(ship)
        for cx, cy in ship.get_coordinates():
            self.grid[cy][cx] = CELL_SHIP
        return ship

    def generate_random_fleet(self):
        self.clear()
        ship_id_seq = 1
        list_to_place = []
        for spec in FLEET_SPEC:
            for _ in range(spec["count"]):
                list_to_place.append((spec["type"], spec["size"]))

        for stype, ssize in list_to_place:
            placed = False
            for _ in range(500):
                h = random.choice([True, False])
                max_x = self.size - ssize if h else self.size - 1
                max_y = self.size - 1 if h else self.size - ssize
                x = random.randint(0, max_x)
                y = random.randint(0, max_y)
                if self.can_place_ship(ssize, x, y, h):
                    self.place_ship(f"ship_{ship_id_seq}", stype, ssize, x, y, h)
                    ship_id_seq += 1
                    placed = True
                    break
            if not placed:
                return self.generate_random_fleet()
        return True

    def receive_shot(self, x, y):
        if x < 0 or x >= self.size or y < 0 or y >= self.size:
            return {"result": "invalid", "message": "OutOfBounds"}

        current = self.grid[y][x]
        if current in (CELL_MISS, CELL_HIT, CELL_HALO):
            return {"result": "invalid", "message": "AlreadyExplored"}

        hit_ship = next((s for s in self.ships if s.occupies(x, y)), None)
        if not hit_ship:
            self.grid[y][x] = CELL_MISS
            return {"result": "miss", "x": x, "y": y, "ship": None, "halo": []}

        self.grid[y][x] = CELL_HIT
        hit_ship.hits += 1

        if hit_ship.hits >= hit_ship.size:
            hit_ship.sunk = True
            halo = self._mark_halo_around_ship(hit_ship)
            return {
                "result": "sunk",
                "x": x,
                "y": y,
                "ship": hit_ship,
                "halo": halo,
                "all_sunk": self.are_all_ships_sunk()
            }

        return {"result": "hit", "x": x, "y": y, "ship": hit_ship, "halo": []}

    def _mark_halo_around_ship(self, ship):
        halo = []
        for cx, cy in ship.get_coordinates():
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < self.size and 0 <= ny < self.size:
                        if self.grid[ny][nx] == CELL_EMPTY:
                            self.grid[ny][nx] = CELL_HALO
                            halo.append((nx, ny))
        return halo

    def are_all_ships_sunk(self):
        return len(self.ships) == 10 and all(s.sunk for s in self.ships)

    def get_remaining_ships_count(self):
        counts = {4: 0, 3: 0, 2: 0, 1: 0}
        for s in self.ships:
            if not s.sunk:
                counts[s.size] = counts.get(s.size, 0) + 1
        return counts

class NavalAI:
    def __init__(self):
        self.grid_size = 10
        self.reset()

    def reset(self):
        self.shots = set()
        self.current_hits = []
        self.target_queue = []

    def register_shot_result(self, x, y, result, sunk_ship=None, halo=None):
        self.shots.add((x, y))
        if halo:
            for hx, hy in halo:
                self.shots.add((hx, hy))

        if result == "hit":
            self.current_hits.append((x, y))
            self._update_target_queue()
        elif result == "sunk":
            if sunk_ship:
                sunk_coords = set(sunk_ship.get_coordinates())
                self.current_hits = [h for h in self.current_hits if h not in sunk_coords]
            else:
                self.current_hits = []
            self._update_target_queue()

    def choose_next_shot(self, remaining_ships=None):
        if remaining_ships is None:
            remaining_ships = {4: 1, 3: 2, 2: 3, 1: 4}

        # 1. Target mode
        while self.target_queue:
            cand = self.target_queue.pop(0)
            if cand not in self.shots and 0 <= cand[0] < self.grid_size and 0 <= cand[1] < self.grid_size:
                return cand

        # 2. Hunt mode
        largest_size = 1
        if remaining_ships.get(4, 0) > 0: largest_size = 4
        elif remaining_ships.get(3, 0) > 0: largest_size = 3
        elif remaining_ships.get(2, 0) > 0: largest_size = 2

        unshot = []
        for y in range(self.grid_size):
            for x in range(self.grid_size):
                if (x, y) not in self.shots:
                    unshot.append((x, y))

        if not unshot:
            return (-1, -1)

        parity_mod = 2 if largest_size >= 3 else 1
        parity_cells = [c for c in unshot if (c[0] + c[1]) % parity_mod == 0]
        pool = parity_cells if parity_cells else unshot
        return random.choice(pool)

    def _update_target_queue(self):
        self.target_queue = []
        if not self.current_hits:
            return

        def add_candidate(cx, cy):
            if 0 <= cx < self.grid_size and 0 <= cy < self.grid_size:
                if (cx, cy) not in self.shots and (cx, cy) not in self.target_queue:
                    self.target_queue.append((cx, cy))

        if len(self.current_hits) == 1:
            hx, hy = self.current_hits[0]
            deltas = [(0, -1), (1, 0), (0, 1), (-1, 0)]
            random.shuffle(deltas)
            for dx, dy in deltas:
                add_candidate(hx + dx, hy + dy)
        else:
            is_horiz = all(h[1] == self.current_hits[0][1] for h in self.current_hits)
            is_vert = all(h[0] == self.current_hits[0][0] for h in self.current_hits)

            if is_horiz:
                y = self.current_hits[0][1]
                xs = sorted([h[0] for h in self.current_hits])
                add_candidate(xs[0] - 1, y)
                add_candidate(xs[-1] + 1, y)
            elif is_vert:
                x = self.current_hits[0][0]
                ys = sorted([h[1] for h in self.current_hits])
                add_candidate(x, ys[0] - 1)
                add_candidate(x, ys[-1] + 1)
            else:
                for hx, hy in self.current_hits:
                    for dx, dy in [(0, -1), (1, 0), (0, 1), (-1, 0)]:
                        add_candidate(hx + dx, hy + dy)

def run_simulation_match(match_id):
    player_board = Board()
    player_board.generate_random_fleet()

    ai_board = Board()
    ai_board.generate_random_fleet()

    ai = NavalAI()
    player_shots_tried = set()

    # Track turns
    turn = "player" if random.random() < 0.5 else "ai"
    total_shots = 0
    max_turns = 300 # Guard against infinite loop

    while not player_board.are_all_ships_sunk() and not ai_board.are_all_ships_sunk() and total_shots < max_turns:
        total_shots += 1
        if turn == "player":
            # Player chooses a random untried shot
            unshot = [(x, y) for y in range(10) for x in range(10) if (x, y) not in player_shots_tried]
            if not unshot: break
            shot_x, shot_y = random.choice(unshot)
            player_shots_tried.add((shot_x, shot_y))

            res = ai_board.receive_shot(shot_x, shot_y)
            if res.get("halo"):
                for h in res["halo"]:
                    player_shots_tried.add(h)
            assert res["result"] in ("hit", "miss", "sunk")

            if res["result"] in ("hit", "sunk"):
                assert res["ship"] is not None
                assert hasattr(res["ship"], "name") and len(res["ship"].name) > 0
                # Extra turn on hit/sunk!
                turn = "player"
            else:
                turn = "ai"
        else:
            # AI turn
            shot = ai.choose_next_shot(player_board.get_remaining_ships_count())
            assert shot != (-1, -1), f"AI ran out of shots in match {match_id}"
            res = player_board.receive_shot(shot[0], shot[1])
            assert res["result"] in ("hit", "miss", "sunk")

            ai.register_shot_result(shot[0], shot[1], res["result"], res["ship"], res["halo"])

            if res["result"] in ("hit", "sunk"):
                assert res["ship"] is not None
                assert hasattr(res["ship"], "name") and len(res["ship"].name) > 0
                turn = "ai"
            else:
                turn = "player"

    assert player_board.are_all_ships_sunk() or ai_board.are_all_ships_sunk(), f"Match {match_id} timed out without winner!"
    winner = "Player" if ai_board.are_all_ships_sunk() else "AI"
    return winner, total_shots

if __name__ == "__main__":
    print("Starting 50 Automated Full Battleship Simulation Matches...")
    ai_wins = 0
    player_wins = 0
    total_shots_all = 0

    t0 = time.time()
    for m in range(1, 51):
        winner, shots = run_simulation_match(m)
        if winner == "AI": ai_wins += 1
        else: player_wins += 1
        total_shots_all += shots

    duration = time.time() - t0
    print(f"50 Matches Completed in {duration:.2f}s!")
    print(f"Results: AI Wins: {ai_wins}, Player (Random) Wins: {player_wins}")
    print(f"Average shots per match: {total_shots_all / 50:.1f}")
    print("ALL 50 MATCHES FINISHED WITH 0 DEADLOCKS AND 0 CRASHES!")
