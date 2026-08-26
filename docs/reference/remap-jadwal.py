import json, subprocess, sys, collections, datetime, time

AUTH = open('rauth.txt').read().strip()
BASE = 'https://api.repliz.com'
APPLY = '--apply' in sys.argv
INTERVAL_MIN = 60

def curl(args):
    r = subprocess.run(['curl','-s','-w','\n%{http_code}'] + args, capture_output=True, text=True)
    out = r.stdout.rsplit('\n', 1)
    return out[0], (out[1] if len(out) > 1 else '000')

def get(url):
    body, _ = curl(['-H', f'Authorization: Basic {AUTH}', url, '--max-time', '40'])
    return json.loads(body)

data = json.load(open('igpending.json'))
ig, pending = data['ig'], data['pending']

by = collections.defaultdict(list)
for x in pending:
    by[x['accountId']].append(x)

# Mulai dari jam bulat berikutnya (UTC), sama untuk semua akun.
now = datetime.datetime.now(datetime.timezone.utc)
start = (now + datetime.timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)
print(f"Sekarang (UTC) : {now:%Y-%m-%d %H:%M}")
print(f"Mulai baru     : {start:%Y-%m-%d %H:%M} UTC  ({start + datetime.timedelta(hours=7):%H:%M} WIB)")
print(f"Jeda           : {INTERVAL_MIN} menit\n")

plan = []
for aid, rows in sorted(by.items(), key=lambda kv: -len(kv[1])):
    rows.sort(key=lambda r: r['scheduleAt'])
    for i, r in enumerate(rows):
        new = start + datetime.timedelta(minutes=INTERVAL_MIN * i)
        newiso = new.strftime('%Y-%m-%dT%H:%M:%S.000Z')
        if newiso != r['scheduleAt']:
            plan.append((aid, r, newiso))
    last = start + datetime.timedelta(minutes=INTERVAL_MIN * (len(rows) - 1))
    print(f"{ig[aid]:<20} {len(rows):>4} jadwal → {start:%d %b %H:%M} s/d {last:%d %b %H:%M} UTC")

print(f"\nPerlu diubah: {len(plan)} dari {len(pending)}")
if not APPLY:
    print("\n--- CONTOH 8 PERUBAHAN (dry-run, belum dikirim) ---")
    for aid, r, newiso in plan[:8]:
        print(f"  {ig[aid][:16]:<16} {r['scheduleAt'][:16]} → {newiso[:16]}")
    print("\nJalankan dengan --apply untuk mengirim.")
    sys.exit(0)

ok = fail = 0
errors = []
for n, (aid, r, newiso) in enumerate(plan, 1):
    body = {
        'title': r.get('title') or '',
        'description': r.get('description') or '',
        'topic': r.get('topic') or '',
        'type': r.get('type'),
        'medias': r.get('medias') or [],
        'meta': r.get('meta') or {},
        'additionalInfo': r.get('additionalInfo') or {},
        'replies': r.get('replies') or [],
        'scheduleAt': newiso,
    }
    out, code = curl(['-X','PUT', f"{BASE}/public/schedule/{r['id']}",
                      '-H', f'Authorization: Basic {AUTH}',
                      '-H','Content-Type: application/json',
                      '-d', json.dumps(body), '--max-time','40'])
    if code.startswith('2'):
        ok += 1
    else:
        fail += 1
        if len(errors) < 5: errors.append(f"{r['id']} HTTP {code}: {out[:200]}")
    if n % 25 == 0 or n == len(plan):
        print(f"  {n}/{len(plan)} — ok {ok}, gagal {fail}", flush=True)
    time.sleep(0.12)

print(f"\nSelesai: {ok} berhasil, {fail} gagal")
for e in errors: print("  ", e)
