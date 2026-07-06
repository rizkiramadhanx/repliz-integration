import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import AppDataSource from '../config/typeorm.config';

export interface Seeder {
  run(dataSource: DataSource): Promise<void>;
}

async function runSeeders() {
  const args = process.argv.slice(2);
  const nameArg = args.find((a) => a.startsWith('--name='));
  const targetName = nameArg ? nameArg.split('=')[1] : null;

  const seederDir = __dirname;

  let files: string[];

  if (targetName) {
    const targetPath = path.join(seederDir, targetName);
    if (!fs.existsSync(targetPath)) {
      console.error(`❌ Seeder file not found: ${targetName}`);
      process.exit(1);
    }
    files = [targetName];
  } else {
    files = fs
      .readdirSync(seederDir)
      .filter((f) => f.endsWith('.seed.ts') || f.endsWith('.seed.js'))
      .sort();
  }

  if (files.length === 0) {
    console.log('No seeder files found.');
    process.exit(0);
  }

  console.log('Connecting to database...');
  await AppDataSource.initialize();
  console.log('Database connected.\n');

  for (const file of files) {
    const filePath = path.join(seederDir, file);
    console.log(`▶ Running seeder: ${file}`);

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(filePath);
      const SeederClass: new () => Seeder =
        mod.default || mod[Object.keys(mod)[0]];

      if (!SeederClass) {
        console.warn(`  ⚠ No export found in ${file}, skipping.`);
        continue;
      }

      const seeder = new SeederClass();
      await seeder.run(AppDataSource);
      console.log(`  ✓ Done: ${file}\n`);
    } catch (err) {
      console.error(`  ✗ Failed: ${file}`);
      console.error(err);
      await AppDataSource.destroy();
      process.exit(1);
    }
  }

  console.log('All seeders completed.');
  await AppDataSource.destroy();
  process.exit(0);
}

runSeeders();
