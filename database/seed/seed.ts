import { pool } from '../../backend/src/config/database';
import { adminAuth } from '../../backend/src/config/firebaseAdmin';

export const DEMO_COMPANY = {
  id: 'a0000000-0000-0000-0000-000000000001',
  name: 'Acme Corporation',
  domain: 'acme.local',
  settings: {
    timezone: 'UTC',
    defaultCurrency: 'USD',
    autoScreening: true,
  },
};

export const DEMO_USERS = [
  {
    firebaseUid: 'seed-admin-001',
    email: 'admin@ats.local',
    password: 'AdminPassword123!',
    fullName: 'Alex Admin',
    role: 'ADMIN' as const,
    companyId: DEMO_COMPANY.id,
  },
  {
    firebaseUid: 'seed-hr-001',
    email: 'hr@ats.local',
    password: 'HrPassword123!',
    fullName: 'Helen Recruiter',
    role: 'HR' as const,
    companyId: DEMO_COMPANY.id,
  },
  {
    firebaseUid: 'seed-candidate-001',
    email: 'candidate@ats.local',
    password: 'CandidatePassword123!',
    fullName: 'Charlie Candidate',
    role: 'CANDIDATE' as const,
    companyId: null,
  },
];

export const DEMO_JOB = {
  id: 'b0000000-0000-0000-0000-000000000001',
  companyId: DEMO_COMPANY.id,
  title: 'Senior Full Stack Engineer (TypeScript & React)',
  department: 'Engineering',
  location: 'Remote, US / EU',
  employmentType: 'FULL_TIME',
  experienceLevel: 'SENIOR',
  salaryMin: 130000,
  salaryMax: 175000,
  salaryCurrency: 'USD',
  status: 'PUBLISHED',
  description: 'Lead design and development of scalable ATS workflows, APIs, and micro-frontends.',
  requirements: ['5+ years TypeScript & Node.js', 'Experience with PostgreSQL & Redis', 'React / Next.js expertise'],
};

/**
 * Executes synthetic seeding for PostgreSQL and Firebase Auth Emulator
 */
export async function runSeed(options: { closePool?: boolean } = { closePool: true }) {
  console.log('============================================================');
  console.log('Smart ATS - Synthetic Database & Auth Seeder');
  console.log('============================================================');

  let client;
  let lockAcquired = false;
  const SEED_LOCK_ID = 849203949;

  try {
    client = await pool.connect();
    console.log(`Acquiring PostgreSQL seeding lock (${SEED_LOCK_ID})...`);
    await client.query('SELECT pg_advisory_lock($1);', [SEED_LOCK_ID]);
    lockAcquired = true;

    // 1. Seed Demo Company
    console.log(`[Seed] Provisioning Company: "${DEMO_COMPANY.name}"...`);
    await client.query(
      `
      INSERT INTO companies (id, name, domain, settings, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        domain = EXCLUDED.domain,
        settings = EXCLUDED.settings,
        updated_at = NOW();
      `,
      [DEMO_COMPANY.id, DEMO_COMPANY.name, DEMO_COMPANY.domain, JSON.stringify(DEMO_COMPANY.settings)]
    );

    // 2. Seed Users into PostgreSQL & Firebase Auth
    for (const demoUser of DEMO_USERS) {
      console.log(`[Seed] Provisioning User: ${demoUser.email} (${demoUser.role})...`);

      // 2a. Insert or Update in PostgreSQL
      await client.query(
        `
        INSERT INTO users (firebase_uid, email, full_name, role, company_id, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())
        ON CONFLICT (firebase_uid) DO UPDATE SET
          email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role,
          company_id = EXCLUDED.company_id,
          is_active = TRUE,
          updated_at = NOW();
        `,
        [demoUser.firebaseUid, demoUser.email, demoUser.fullName, demoUser.role, demoUser.companyId]
      );

      // 2b. Sync into Firebase Auth (if reachable)
      try {
        let firebaseUser;
        try {
          firebaseUser = await adminAuth.getUser(demoUser.firebaseUid);
          await adminAuth.updateUser(demoUser.firebaseUid, {
            email: demoUser.email,
            password: demoUser.password,
            displayName: demoUser.fullName,
          });
        } catch (notFound) {
          firebaseUser = await adminAuth.createUser({
            uid: demoUser.firebaseUid,
            email: demoUser.email,
            password: demoUser.password,
            displayName: demoUser.fullName,
          });
        }

        // Set custom claims
        await adminAuth.setCustomUserClaims(demoUser.firebaseUid, {
          role: demoUser.role,
          companyId: demoUser.companyId,
          syncedAt: Date.now(),
        });
        console.log(`  ✓ Firebase Auth account & claims synchronized for ${demoUser.email}`);
      } catch (fbError: any) {
        console.warn(`  ⚠️ Firebase sync skipped for ${demoUser.email} (Auth emulator inactive: ${fbError.message})`);
      }
    }

    // 3. Seed Demo Job
    console.log(`[Seed] Provisioning Job: "${DEMO_JOB.title}"...`);
    const adminUser = DEMO_USERS[0];
    const { rows: userRows } = await client.query('SELECT id FROM users WHERE firebase_uid = $1', [adminUser.firebaseUid]);
    const creatorId = userRows[0]?.id;

    if (creatorId) {
      await client.query(
        `
        INSERT INTO jobs (
          id, company_id, creator_id, title, department, location,
          employment_type, experience_level, salary_min, salary_max,
          salary_currency, status, description, requirements, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          status = EXCLUDED.status,
          updated_at = NOW();
        `,
        [
          DEMO_JOB.id,
          DEMO_JOB.companyId,
          creatorId,
          DEMO_JOB.title,
          DEMO_JOB.department,
          DEMO_JOB.location,
          DEMO_JOB.employmentType,
          DEMO_JOB.experienceLevel,
          DEMO_JOB.salaryMin,
          DEMO_JOB.salaryMax,
          DEMO_JOB.salaryCurrency,
          DEMO_JOB.status,
          DEMO_JOB.description,
          JSON.stringify(DEMO_JOB.requirements),
        ]
      );
    }

    // 4. Seed Candidate Profile
    const candidateUser = DEMO_USERS[2];
    const { rows: candRows } = await client.query('SELECT id FROM users WHERE firebase_uid = $1', [candidateUser.firebaseUid]);
    const candUserId = candRows[0]?.id;

    if (candUserId) {
      await client.query(
        `
        INSERT INTO candidate_profiles (
          user_id, headline, bio, experience_years, skills, location, linkedin_url, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          headline = EXCLUDED.headline,
          experience_years = EXCLUDED.experience_years,
          updated_at = NOW();
        `,
        [
          candUserId,
          'Full-Stack TypeScript & React Developer',
          'Passionate about building robust web apps, microservices, and reactive UIs.',
          6,
          JSON.stringify(['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker']),
          'San Francisco, CA',
          'https://linkedin.com/in/charlie-candidate-demo',
        ]
      );
    }

    console.log('============================================================');
    console.log('✅ Seeding completed successfully!');
    console.log('Demo Accounts Available:');
    console.log('  - Admin:     admin@ats.local     / AdminPassword123!');
    console.log('  - HR:        hr@ats.local        / HrPassword123!');
    console.log('  - Candidate: candidate@ats.local / CandidatePassword123!');
    console.log('============================================================');
  } catch (error: any) {
    console.error('[Seed Error] Failed to seed database:', error.message);
    throw error;
  } finally {
    if (client && lockAcquired) {
      try {
        await client.query('SELECT pg_advisory_unlock($1);', [SEED_LOCK_ID]);
      } catch (err: any) {
        console.warn(`[Seed Warning] Failed to release lock ${SEED_LOCK_ID}: ${err.message}`);
      }
      client.release();
    }
    if (options.closePool) {
      await pool.end();
    }
  }
}

// Auto-run when executed directly via CLI
if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
