import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  console.log('Checking database...');
  await prisma.$connect();
  
  const count = await prisma.repair.count();
  console.log(`Total repairs in DB: ${count}`);
  
  if (count > 0) {
    const first = await prisma.repair.findFirst({ orderBy: { id: 'asc' } });
    console.log('First record:', JSON.stringify(first, null, 2));
    
    const last = await prisma.repair.findFirst({ orderBy: { id: 'desc' } });
    console.log('Last record:', JSON.stringify(last, null, 2));
  }
  
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
