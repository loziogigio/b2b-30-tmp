/**
 * Test script for multi-tenant resolution
 * Run: npx tsx scripts/test-tenant.ts
 */
import { MongoClient } from 'mongodb';

// Copy the hostname variations logic from service.ts
function buildHostnameVariations(hostname: string): string[] {
  const lower = hostname.toLowerCase();
  const variations: string[] = [];
  variations.push(lower);
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
    variations.push(`http://${lower}`);
    variations.push(`https://${lower}`);
  }
  const withoutPort = lower.split(':')[0];
  if (withoutPort !== lower) {
    variations.push(withoutPort);
    if (
      !withoutPort.startsWith('http://') &&
      !withoutPort.startsWith('https://')
    ) {
      variations.push(`http://${withoutPort}`);
      variations.push(`https://${withoutPort}`);
    }
  }
  return [...new Set(variations)];
}

async function test() {
  const mongoUrl =
    process.env.MONGO_URL ||
    'mongodb://root:root@149.81.163.109:27017/?authSource=admin';
  const client = new MongoClient(mongoUrl);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db('vinc-admin');
    const tenants = db.collection('tenants');

    // List all active tenants
    const allTenants = await tenants.find({ status: 'active' }).toArray();
    console.log('\n=== Active tenants ===');
    allTenants.forEach((t: any) => {
      console.log(`  - ${t.tenant_id} (${t.project_code})`);
    });

    // Test hostnames (customize these for your setup)
    const testHostnames = ['localhost:3001', 'localhost:3000'];

    for (const hostname of testHostnames) {
      console.log(`\n=== Testing hostname: ${hostname} ===`);
      const variations = buildHostnameVariations(hostname);
      console.log('Variations:', variations);

      const doc = await tenants.findOne({
        'domains.hostname': { $in: variations },
        'domains.is_active': { $ne: false },
        status: 'active',
      });

      if (doc) {
        const tenant = doc as any;
        console.log('✓ Found tenant:', tenant.tenant_id);
        console.log('  project_code:', tenant.project_code);
        console.log('  API config:', JSON.stringify(tenant.api, null, 4));
      } else {
        console.log('✗ No tenant found');
      }
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

test();
