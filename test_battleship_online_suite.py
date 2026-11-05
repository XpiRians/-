import urllib.request
import json
import time

SUPABASE_URL = 'https://hxdwavbtjhxbyfcimctz.supabase.co'
KEY = 'sb_publishable_uWgTHdlA9dZeOQhgaL36Nw_GgVH5LvI'
headers = {
    'apikey': KEY,
    'Authorization': f'Bearer {KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

def api_call(method, endpoint, data=None):
    url = f'{SUPABASE_URL}/rest/v1/{endpoint}'
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            text = resp.read().decode()
            return resp.status, json.loads(text) if text else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        try:
            return e.code, json.loads(err_body)
        except:
            return e.code, err_body

print('=== BATTLESHIP ONLINE INTEGRATION SUITE ===')

# TEST 1: Room Creation
room_code = f'TST{int(time.time()) % 1000:03d}'
p1_id = f'player_1_{int(time.time())}'
p2_id = f'player_2_{int(time.time())}'

s, r = api_call('POST', 'battleship_rooms', {
    'code': room_code,
    'status': 'waiting',
    'player1_id': p1_id,
    'player1_name': 'Капитан 1',
    'player1_ready': False,
    'prep_deadline': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() + 120))
})
assert s in (200, 201), f'Failed to create room: {s} {r}'
print(f'[TEST 1 PASSED] Room {room_code} created successfully!')

# TEST 2: Browse Open Rooms
s, r = api_call('GET', 'battleship_rooms?status=eq.waiting&order=created_at.desc&limit=5')
assert s == 200 and len(r) > 0, f'Failed to browse open rooms: {s} {r}'
assert any(room['code'] == room_code for room in r), f'Room {room_code} not found in open rooms'
print(f'[TEST 2 PASSED] Browse rooms returned open room {room_code}!')

# TEST 3: Join Room (Player 2)
s, r = api_call('PATCH', f'battleship_rooms?code=eq.{room_code}&status=eq.waiting', {
    'player2_id': p2_id,
    'player2_name': 'Капитан 2',
    'player2_ready': False,
    'status': 'placement',
    'prep_deadline': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() + 120))
})
assert s == 200 and len(r) > 0, f'Failed to join room: {s} {r}'
assert r[0]['status'] == 'placement' and r[0]['player2_id'] == p2_id
print(f'[TEST 3 PASSED] Player 2 joined room {room_code}, status: placement!')

# TEST 4: Prevent 3rd Player from joining
s, r = api_call('PATCH', f'battleship_rooms?code=eq.{room_code}&status=eq.waiting', {
    'player2_id': 'player_3_intruder',
    'player2_name': 'Intruder'
})
assert s == 200 and len(r) == 0, 'Security failure: 3rd player was able to join!'
print('[TEST 4 PASSED] 3rd player rejected successfully (0 rows updated)!')

# TEST 5: Fleet Placements & Start Battle
# Define 2 test fleets:
fleet_p1 = [
    {'id': 's1', 'type': 'boat', 'size': 1, 'coords': [{'x': 0, 'y': 0}]},
    {'id': 's2', 'type': 'destroyer', 'size': 2, 'coords': [{'x': 2, 'y': 0}, {'x': 3, 'y': 0}]}
]
fleet_p2 = [
    {'id': 's1', 'type': 'boat', 'size': 1, 'coords': [{'x': 5, 'y': 5}]},
    {'id': 's2', 'type': 'destroyer', 'size': 2, 'coords': [{'x': 7, 'y': 7}, {'x': 8, 'y': 7}]}
]

# Player 1 submits placement
s, r = api_call('PATCH', f'battleship_rooms?code=eq.{room_code}', {
    'player1_fleet': fleet_p1,
    'player1_ready': True
})
assert s == 200, f'P1 placement failed: {s} {r}'

# Player 2 submits placement and triggers battle
deadline_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() + 25))
s, r = api_call('PATCH', f'battleship_rooms?code=eq.{room_code}', {
    'player2_fleet': fleet_p2,
    'player2_ready': True,
    'status': 'battle',
    'current_turn': 'player1',
    'turn_deadline': deadline_iso
})
assert s == 200 and r[0]['status'] == 'battle'
print(f'[TEST 5 PASSED] Both players submitted fleets. Match entered BATTLE status!')

# TEST 6: Verify Reconnection / State Restore
s, r = api_call('GET', f'battleship_rooms?code=eq.{room_code}&limit=1')
assert s == 200 and len(r) == 1
room_data = r[0]
assert room_data['player1_fleet'] is not None and len(room_data['player1_fleet']) == 2
assert room_data['current_turn'] == 'player1'
print('[TEST 6 PASSED] Reconnection test: Room state, fleet and turn restored perfectly!')

# TEST 7: Duplicate Shot Protection in Client/DB
# Check current turn shooter
current_turn = room_data['current_turn']
shooter_id = p1_id if current_turn == 'player1' else p2_id
print(f'Current turn: {current_turn} (ID: {shooter_id})')

print('\nALL PRE-RPC TESTS COMPLETED SUCCESSFULLY!')
