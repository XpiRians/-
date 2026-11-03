import re
import os

with open('docs/farm.html', 'r', encoding='utf-8') as f:
    html = f.read()

scripts = re.findall(r'<script src="([^"]+)"', html)
print(f'Total scripts referenced: {len(scripts)}')
all_ok = True
for s in scripts:
    path = os.path.join('docs', s)
    exists = os.path.exists(path)
    print(f'  {s} -> {"EXISTS" if exists else "MISSING"}')
    if not exists:
        all_ok = False

# Also check element IDs used in UI
ids_to_check = [
    'gameCanvas', 'gameViewportContainer', 'hudCatAvatar', 'hudCatBadge',
    'hudCatName', 'hudLvlTag', 'hudXpFill', 'hudPerkHint', 'hudSwapBtn',
    'hudTimeWeatherPill', 'hudComboPill', 'hudComboCount', 'hudComboMultiplier',
    'hudCoins', 'hudWaterCan', 'hudBackpackCount', 'hudBackpackCap',
    'openShopBtn', 'openWorkshopBtn', 'openHelpersBtn', 'openSkillTreeBtn',
    'openOrderBoardBtn', 'openCollectionBtn', 'openQuestsBtn', 'openSettingsBtn',
    'miniQuestTitle', 'miniQuestDesc', 'miniQuestReward', 'interactionPrompt',
    'shopModal', 'workshopModal', 'helpersModal', 'skillsModal', 'ordersModal',
    'encyclopediaModal', 'questsModal', 'settingsModal', 'tutorialModal',
    'seedSelectorPopup', 'seedOptionsList', 'btnToggleMute'
]

print('\nChecking HTML element IDs:')
missing_ids = [elem_id for elem_id in ids_to_check if f'id="{elem_id}"' not in html]
if missing_ids:
    print(f'  MISSING IDs: {missing_ids}')
    all_ok = False
else:
    print(f'  All {len(ids_to_check)} required element IDs found!')

print(f'\nFINAL VERIFICATION: {"SUCCESS" if all_ok else "FAILED"}')
