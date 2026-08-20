
import 'reflect-metadata';
import { config } from 'dotenv';
config(); process.env.TZ='UTC';
import dataSource from './src/config/typeorm.config';
import { AccountEntity } from './src/modules/accounts/entities/account.entity';
import { scrapeLatestFacebookPosts } from './src/modules/repliz-sync/worker/facebook-scraper.util';

function tagOf(u: string): string {
  try { const e = new URL(u).searchParams.get('efg'); if (e) return JSON.parse(Buffer.from(e,'base64').toString()).vencode_tag || ''; } catch {}
  return '';
}

async function main() {
  await dataSource.initialize();
  const acc = await dataSource.getRepository(AccountEntity).findOne({ where:{type:'facebook'}, order:{createdAt:'ASC'} });
  if (!acc) throw new Error('Tidak ada akun Facebook');

  console.log('target: 61591678073833  mode: reels  limit: 20\n');
  const t0 = Date.now();
  const posts = await scrapeLatestFacebookPosts(acc, '61591678073833', 20, new Set(), 'reels');
  const elapsed = ((Date.now()-t0)/1000).toFixed(1);
  console.log('=== ' + posts.length + ' konten dalam ' + elapsed + 's ===\n');

  let hd = 0, withAudio = 0, totalMB = 0;
  const ids = new Set<string>();
  for (const [i,p] of posts.entries()) {
    const tag = tagOf(p.mediaUrl);
    const h = Number((tag.match(/[._](\d{3,4})[._]/) || [])[1] || 0);
    let mb = 0, audio = false;
    try {
      const r = await fetch(p.mediaUrl);
      const buf = Buffer.from(await r.arrayBuffer());
      mb = buf.length/1024/1024; audio = buf.includes(Buffer.from('mp4a'));
    } catch {}
    if (h >= 720) hd++;
    if (audio) withAudio++;
    totalMB += mb;
    ids.add(p.postId);
    console.log(String(i+1).padStart(2) + '. ' + p.postId.padEnd(18) + h + 'p  ' + mb.toFixed(2) + ' MB  audio:' + (audio?'ADA':'TIDAK'));
  }
  console.log('\n--- ringkasan ---');
  console.log('  konten unik : ' + ids.size + '/' + posts.length);
  console.log('  720p ke atas: ' + hd + '/' + posts.length);
  console.log('  ada audio   : ' + withAudio + '/' + posts.length);
  console.log('  total       : ' + totalMB.toFixed(1) + ' MB');
  console.log('  waktu       : ' + elapsed + 's');
  await dataSource.destroy(); process.exit(0);
}
main().catch(e=>{console.error('GAGAL:', e&&e.message?e.message:e); process.exit(1)});
