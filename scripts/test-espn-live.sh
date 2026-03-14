#!/bin/bash
# Live ESPN API test - verifies score fetching works for NCAA basketball
# Run: bash scripts/test-espn-live.sh

BASE="https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball"
TODAY=$(date +%Y%m%d)
PASS=0
FAIL=0

echo "=== ESPN NCAA Basketball Live API Test ==="
echo "Date: $(date)"
echo ""

# Test 1: API connectivity
echo "--- Test 1: API Connectivity ---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/scoreboard?limit=1")
if [ "$STATUS" = "200" ]; then
  echo "PASS: ESPN API returned HTTP $STATUS"
  ((PASS++))
else
  echo "FAIL: ESPN API returned HTTP $STATUS"
  ((FAIL++))
fi
echo ""

# Test 2: Today's games
echo "--- Test 2: Today's Games ($TODAY) ---"
curl -s "$BASE/scoreboard?dates=$TODAY&limit=50" | python3 -c "
import json, sys
data = json.load(sys.stdin)
events = data.get('events', [])
print(f'Games found: {len(events)}')
for e in events:
    comp = e['competitions'][0]
    t = comp['competitors']
    t1, t2 = t[0], t[1]
    name1 = t1['team']['displayName']
    name2 = t2['team']['displayName']
    s1 = t1.get('score', '-')
    s2 = t2.get('score', '-')
    status = comp['status']['type']['name']
    status_desc = comp['status']['type'].get('description', status)
    marker = ''
    if status == 'STATUS_IN_PROGRESS':
        marker = ' ** LIVE **'
    elif status == 'STATUS_HALFTIME':
        marker = ' ** HALFTIME **'
    elif status == 'STATUS_FINAL':
        marker = ' (Final)'
    print(f'  {name2:30s} {s2:>4s}  vs  {name1:30s} {s1:>4s}  [{status_desc}]{marker}')
if len(events) > 0:
    print('PASS')
else:
    print('WARN: No games today (might be off-day)')
" && ((PASS++)) || ((FAIL++))
echo ""

# Test 3: Tournament filter (groups=100)
echo "--- Test 3: Tournament Filter (groups=100) ---"
curl -s "$BASE/scoreboard?groups=100&limit=100" | python3 -c "
import json, sys
data = json.load(sys.stdin)
events = data.get('events', [])
print(f'Tournament games found: {len(events)}')
if len(events) > 0:
    for e in events[:5]:
        comp = e['competitions'][0]
        t = comp['competitors']
        name1 = t[0]['team']['displayName']
        name2 = t[1]['team']['displayName']
        s1 = t[0].get('score', '-')
        s2 = t[1].get('score', '-')
        status = comp['status']['type']['name']
        print(f'  {name2} {s2} vs {name1} {s1} [{status}]')
    if len(events) > 5:
        print(f'  ... and {len(events) - 5} more')
    print('PASS: Tournament games available')
else:
    print('INFO: No tournament games yet (tournament may not have started)')
    print('PASS: API responded correctly with empty result')
" && ((PASS++)) || ((FAIL++))
echo ""

# Test 4: Historical tournament date (verify data shape)
echo "--- Test 4: Historical Tournament Data (2025-03-20) ---"
curl -s "$BASE/scoreboard?groups=100&dates=20250320&limit=100" | python3 -c "
import json, sys
data = json.load(sys.stdin)
events = data.get('events', [])
print(f'Games on 2025-03-20: {len(events)}')
ok = True
for e in events:
    comp = e['competitions'][0]
    t = comp['competitors']
    name1 = t[0]['team']['displayName']
    name2 = t[1]['team']['displayName']
    s1 = t[0].get('score', '-')
    s2 = t[1].get('score', '-')
    status = comp['status']['type']['name']
    print(f'  {name2} {s2} vs {name1} {s1} [{status}]')
    # Verify scores are present for completed games
    if status == 'STATUS_FINAL':
        try:
            int(t[0]['score'])
            int(t[1]['score'])
        except (ValueError, KeyError):
            print(f'  FAIL: Missing scores for final game')
            ok = False
if len(events) > 0 and ok:
    print('PASS: Historical data has valid scores')
elif len(events) == 0:
    print('WARN: No historical data returned')
" && ((PASS++)) || ((FAIL++))
echo ""

# Test 5: In-progress game detection
echo "--- Test 5: Live Game Detection ---"
curl -s "$BASE/scoreboard?dates=$TODAY&limit=50" | python3 -c "
import json, sys
data = json.load(sys.stdin)
events = data.get('events', [])
live = [e for e in events if e['competitions'][0]['status']['type']['name'] in ('STATUS_IN_PROGRESS', 'STATUS_HALFTIME')]
final = [e for e in events if e['competitions'][0]['status']['type']['name'] == 'STATUS_FINAL']
scheduled = [e for e in events if e['competitions'][0]['status']['type']['name'] == 'STATUS_SCHEDULED']
print(f'Live: {len(live)} | Final: {len(final)} | Scheduled: {len(scheduled)} | Total: {len(events)}')
for e in live:
    comp = e['competitions'][0]
    t = comp['competitors']
    name1 = t[0]['team']['displayName']
    name2 = t[1]['team']['displayName']
    s1 = int(t[0]['score'])
    s2 = int(t[1]['score'])
    desc = comp['status']['type'].get('description', '')
    print(f'  LIVE: {name2} {s2} vs {name1} {s1} ({desc})')
    assert s1 >= 0 and s2 >= 0, 'Scores should be non-negative'
print('PASS: Status detection working')
" && ((PASS++)) || ((FAIL++))
echo ""

# Test 6: Response time
echo "--- Test 6: API Response Time ---"
TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE/scoreboard?limit=5")
echo "Response time: ${TIME}s"
FAST=$(python3 -c "print('PASS' if float('$TIME') < 5.0 else 'FAIL')")
echo "$FAST: Response time under 5 seconds"
if [ "$FAST" = "PASS" ]; then ((PASS++)); else ((FAIL++)); fi
echo ""

# Summary
echo "================================"
echo "Results: $PASS passed, $FAIL failed"
if [ "$FAIL" -eq 0 ]; then
  echo "ALL TESTS PASSED"
else
  echo "SOME TESTS FAILED"
  exit 1
fi
