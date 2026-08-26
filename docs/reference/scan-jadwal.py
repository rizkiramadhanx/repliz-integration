import json, subprocess, sys, collections

AUTH = open('rauth.txt').read().strip()
def get(url):
    r = subprocess.run(['curl','-s','-H',f'Authorization: Basic {AUTH}',url,'--max-time','40'],
                       capture_output=True, text=True)
    return json.loads(r.stdout)

# akun instagram
acc = get('https://api.repliz.com/public/account?page=1&limit=200')
ig = {a['id']: a.get('name') or a.get('username') for a in acc.get('docs', []) if a.get('type') == 'instagram'}
print(f"Akun Instagram: {len(ig)}")
for k, v in ig.items(): print(f"  {v}  ({k})")

# semua jadwal pending
all_docs, page = [], 1
while True:
    d = get(f'https://api.repliz.com/public/schedule?page={page}&limit=100&status=pending')
    docs = d.get('docs', [])
    all_docs += docs
    if page >= d.get('totalPages', 1) or not docs: break
    page += 1
print(f"\nTotal jadwal PENDING: {len(all_docs)}")

igp = [x for x in all_docs if x.get('accountId') in ig]
print(f"Pending milik akun Instagram: {len(igp)}")

by = collections.defaultdict(list)
for x in igp: by[x['accountId']].append(x)
json.dump({'ig': ig, 'pending': igp}, open('igpending.json','w'))

for aid, rows in sorted(by.items(), key=lambda kv: -len(kv[1])):
    rows.sort(key=lambda r: r['scheduleAt'])
    print(f"\n=== {ig[aid]} — {len(rows)} jadwal ===")
    perday = collections.Counter(r['scheduleAt'][:10] for r in rows)
    for day in sorted(perday)[:6]:
        jam = sorted(r['scheduleAt'][11:16] for r in rows if r['scheduleAt'][:10] == day)
        print(f"  {day}: {perday[day]:>3} → {' '.join(jam[:14])}")
    if len(perday) > 6: print(f"  ... total {len(perday)} hari")
