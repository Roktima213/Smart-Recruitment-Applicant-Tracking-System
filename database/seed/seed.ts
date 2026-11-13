import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pool } from '../../backend/src/config/database';
import { adminAuth } from '../../backend/src/config/firebaseAdmin';
import { ensureStorageDirectory, getSafeStoragePath } from '../../backend/src/config/storage';

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

export const DEMO_STAFF_USERS = [
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
];

export const DEMO_USERS = [
  ...DEMO_STAFF_USERS,
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

export type SeedStage = 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'SELECTED' | 'OFFERED' | 'REJECTED';

export interface SeedCandidate {
  index: number;
  firebaseUid: string;
  email: string;
  fullName: string;
  headline: string;
  skills: string[];
  experienceYears: number;
  stage: SeedStage;
  resumeFileName: string;
  reason: string;
}

export const SEED_CANDIDATES: SeedCandidate[] = [
  // 1-5: APPLIED
  {
    index: 1,
    firebaseUid: 'seed-cand-001',
    email: 'charlie.chen@example.com',
    fullName: 'Charlie Chen',
    headline: 'Senior Full Stack Developer',
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
    experienceYears: 6.5,
    stage: 'APPLIED',
    resumeFileName: 'Charlie_Chen_Resume.pdf',
    reason: 'Initial job application submission',
  },
  {
    index: 2,
    firebaseUid: 'seed-cand-002',
    email: 'maya.patel@example.com',
    fullName: 'Maya Patel',
    headline: 'Frontend Architecture Lead',
    skills: ['React', 'Next.js', 'TailwindCSS', 'Redux', 'GraphQL'],
    experienceYears: 7.0,
    stage: 'APPLIED',
    resumeFileName: 'Maya_Patel_CV.pdf',
    reason: 'Initial job application submission',
  },
  {
    index: 3,
    firebaseUid: 'seed-cand-003',
    email: 'liam.smith@example.com',
    fullName: 'Liam Smith',
    headline: 'Backend Systems Engineer',
    skills: ['Node.js', 'Go', 'PostgreSQL', 'Kafka', 'Redis'],
    experienceYears: 5.0,
    stage: 'APPLIED',
    resumeFileName: 'Liam_Smith_Backend.pdf',
    reason: 'Initial job application submission',
  },
  {
    index: 4,
    firebaseUid: 'seed-cand-004',
    email: 'ananya.rao@example.com',
    fullName: 'Ananya Rao',
    headline: 'Full Stack Engineer',
    skills: ['React', 'TypeScript', 'Express', 'MongoDB'],
    experienceYears: 4.5,
    stage: 'APPLIED',
    resumeFileName: 'Ananya_Rao_Dev.pdf',
    reason: 'Initial job application submission',
  },
  {
    index: 5,
    firebaseUid: 'seed-cand-005',
    email: 'lucas.silva@example.com',
    fullName: 'Lucas Silva',
    headline: 'Cloud & Web Application Engineer',
    skills: ['TypeScript', 'React', 'AWS', 'Docker', 'PostgreSQL'],
    experienceYears: 5.5,
    stage: 'APPLIED',
    resumeFileName: 'Lucas_Silva_Resume.pdf',
    reason: 'Initial job application submission',
  },

  // 6-9: SCREENING
  {
    index: 6,
    firebaseUid: 'seed-cand-006',
    email: 'olivia.wang@example.com',
    fullName: 'Olivia Wang',
    headline: 'Senior React Developer',
    skills: ['React', 'TypeScript', 'Jest', 'Webpack', 'TailwindCSS'],
    experienceYears: 6.0,
    stage: 'SCREENING',
    resumeFileName: 'Olivia_Wang_Senior_React.pdf',
    reason: 'Passed resume filter; qualifications align with senior engineer profile',
  },
  {
    index: 7,
    firebaseUid: 'seed-cand-007',
    email: 'noah.dubois@example.com',
    fullName: 'Noah Dubois',
    headline: 'Distributed Systems Specialist',
    skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Microservices', 'Kubernetes'],
    experienceYears: 8.0,
    stage: 'SCREENING',
    resumeFileName: 'Noah_Dubois_Systems.pdf',
    reason: 'Strong microservices architecture background; advancing to screening call',
  },
  {
    index: 8,
    firebaseUid: 'seed-cand-008',
    email: 'fatima.almansoori@example.com',
    fullName: 'Fatima Al-Mansoori',
    headline: 'Staff Full Stack Developer',
    skills: ['TypeScript', 'React', 'Node.js', 'GraphQL', 'PostgreSQL'],
    experienceYears: 7.5,
    stage: 'SCREENING',
    resumeFileName: 'Fatima_AlMansoori_Resume.pdf',
    reason: 'High technical assessment score; phone screen scheduled',
  },
  {
    index: 9,
    firebaseUid: 'seed-cand-009',
    email: 'johann.becker@example.com',
    fullName: 'Johann Becker',
    headline: 'Full Stack Web Architect',
    skills: ['React', 'TypeScript', 'Node.js', 'Docker', 'Redis'],
    experienceYears: 6.5,
    stage: 'SCREENING',
    resumeFileName: 'Johann_Becker_CV.pdf',
    reason: 'Relevant SaaS platform experience; passed automated screen',
  },

  // 10-13: INTERVIEW
  {
    index: 10,
    firebaseUid: 'seed-cand-010',
    email: 'sarah.connor@example.com',
    fullName: 'Sarah Connor',
    headline: 'Principal Full Stack Architect',
    skills: ['TypeScript', 'React', 'Node.js', 'Distributed Systems', 'Security'],
    experienceYears: 9.0,
    stage: 'INTERVIEW',
    resumeFileName: 'Sarah_Connor_Architect.pdf',
    reason: 'Completed technical phone screen with distinction; scheduled panel interview loop',
  },
  {
    index: 11,
    firebaseUid: 'seed-cand-011',
    email: 'tariq.mahmood@example.com',
    fullName: 'Tariq Mahmood',
    headline: 'Senior Full Stack & Cloud Developer',
    skills: ['React', 'TypeScript', 'PostgreSQL', 'GCP', 'Terraform'],
    experienceYears: 7.0,
    stage: 'INTERVIEW',
    resumeFileName: 'Tariq_Mahmood_Resume.pdf',
    reason: 'Strong live coding interview; proceeding to systems design round',
  },
  {
    index: 12,
    firebaseUid: 'seed-cand-012',
    email: 'chloe.martin@example.com',
    fullName: 'Chloe Martin',
    headline: 'Frontend Lead & Core Contributor',
    skills: ['React', 'TypeScript', 'Design Systems', 'Performance', 'Next.js'],
    experienceYears: 8.5,
    stage: 'INTERVIEW',
    resumeFileName: 'Chloe_Martin_Lead.pdf',
    reason: 'Panel interviews in progress; highly recommended by frontend interviewers',
  },
  {
    index: 13,
    firebaseUid: 'seed-cand-013',
    email: 'viktor.novak@example.com',
    fullName: 'Viktor Novak',
    headline: 'Senior Full Stack Engineer',
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
    experienceYears: 6.0,
    stage: 'INTERVIEW',
    resumeFileName: 'Viktor_Novak_CV.pdf',
    reason: 'Completed 3 of 4 loop rounds; final architectural review scheduled',
  },

  // 14-16: SELECTED
  {
    index: 14,
    firebaseUid: 'seed-cand-014',
    email: 'priya.nair@example.com',
    fullName: 'Priya Nair',
    headline: 'Staff Full Stack Developer',
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Kubernetes'],
    experienceYears: 8.0,
    stage: 'SELECTED',
    resumeFileName: 'Priya_Nair_Staff_Dev.pdf',
    reason: 'Unanimous hire recommendation across all interview loop panels',
  },
  {
    index: 15,
    firebaseUid: 'seed-cand-015',
    email: 'diego.garcia@example.com',
    fullName: 'Diego Garcia',
    headline: 'Lead Software Architect',
    skills: ['React', 'TypeScript', 'Distributed Systems', 'PostgreSQL', 'AWS'],
    experienceYears: 10.0,
    stage: 'SELECTED',
    resumeFileName: 'Diego_Garcia_Architect.pdf',
    reason: 'Hiring committee approved; compensation package under review',
  },
  {
    index: 16,
    firebaseUid: 'seed-cand-016',
    email: 'aisha.bekele@example.com',
    fullName: 'Aisha Bekele',
    headline: 'Senior Full Stack Engineer',
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Redis'],
    experienceYears: 7.5,
    stage: 'SELECTED',
    resumeFileName: 'Aisha_Bekele_Resume.pdf',
    reason: 'Outstanding culture and system design performance; offer in preparation',
  },

  // 17-18: OFFERED
  {
    index: 17,
    firebaseUid: 'seed-cand-017',
    email: 'zack.taylor@example.com',
    fullName: 'Zack Taylor',
    headline: 'Senior Full Stack Engineer',
    skills: ['TypeScript', 'React', 'Node.js', 'Microservices', 'PostgreSQL'],
    experienceYears: 7.0,
    stage: 'OFFERED',
    resumeFileName: 'Zack_Taylor_Offer.pdf',
    reason: 'Formal employment offer extended ($165k base + equity package)',
  },
  {
    index: 18,
    firebaseUid: 'seed-cand-018',
    email: 'hannah.schmidt@example.com',
    fullName: 'Hannah Schmidt',
    headline: 'Staff Application Architect',
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Cloud Infrastructure'],
    experienceYears: 9.0,
    stage: 'OFFERED',
    resumeFileName: 'Hannah_Schmidt_Staff.pdf',
    reason: 'Offer letter signed and pending start date confirmation',
  },

  // 19-21: REJECTED
  {
    index: 19,
    firebaseUid: 'seed-cand-019',
    email: 'boris.petrov@example.com',
    fullName: 'Boris Petrov',
    headline: 'Junior Web Developer',
    skills: ['JavaScript', 'HTML', 'CSS'],
    experienceYears: 1.5,
    stage: 'REJECTED',
    resumeFileName: 'Boris_Petrov_Junior.pdf',
    reason: 'Does not meet minimum 5+ years experience bar for senior engineering requisition',
  },
  {
    index: 20,
    firebaseUid: 'seed-cand-020',
    email: 'clara.sousa@example.com',
    fullName: 'Clara Sousa',
    headline: 'Full Stack Developer',
    skills: ['PHP', 'MySQL', 'jQuery'],
    experienceYears: 4.0,
    stage: 'REJECTED',
    resumeFileName: 'Clara_Sousa_Resume.pdf',
    reason: 'Tech stack misalignment; requisition requires deep TypeScript & modern React mastery',
  },
  {
    index: 21,
    firebaseUid: 'seed-cand-021',
    email: 'ethan.hunt@example.com',
    fullName: 'Ethan Hunt',
    headline: 'Security Consultant & Developer',
    skills: ['Python', 'Bash', 'Security Auditing'],
    experienceYears: 6.0,
    stage: 'REJECTED',
    resumeFileName: 'Ethan_Hunt_Security.pdf',
    reason: 'Candidate withdrew application due to accepting competing counter-offer',
  },
];

/**
 * Creates a synthetic valid PDF file buffer for testing & download previews
 */
function createSyntheticPdfBuffer(candidateName: string, headline: string): Buffer {
  const content = `%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources <<>> /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n200\n%%EOF\n% Candidate: ${candidateName}\n% Title: ${headline}\n`;
  return Buffer.from(content, 'utf8');
}

/**
 * Executes synthetic seeding for PostgreSQL and Firebase Auth Emulator
 */
export async function runSeed(options: { closePool?: boolean } = { closePool: true }) {
  console.log('============================================================');
  console.log('Smart ATS - Synthetic Database & Auth Seeder (Floor 14)');
  console.log('============================================================');

  ensureStorageDirectory();

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

    // 2. Seed Staff Users into PostgreSQL & Firebase Auth
    for (const staff of DEMO_STAFF_USERS) {
      console.log(`[Seed] Provisioning Staff: ${staff.email} (${staff.role})...`);
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
        [staff.firebaseUid, staff.email, staff.fullName, staff.role, staff.companyId]
      );

      if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
        try {
          try {
            await adminAuth.getUser(staff.firebaseUid);
            await adminAuth.updateUser(staff.firebaseUid, {
              email: staff.email,
              password: staff.password,
              displayName: staff.fullName,
            });
          } catch {
            await adminAuth.createUser({
              uid: staff.firebaseUid,
              email: staff.email,
              password: staff.password,
              displayName: staff.fullName,
            });
          }

          await adminAuth.setCustomUserClaims(staff.firebaseUid, {
            role: staff.role,
            companyId: staff.companyId,
            syncedAt: Date.now(),
          });
          console.log(`  ✓ Firebase Auth account & claims synchronized for ${staff.email}`);
        } catch (fbError: any) {
          console.warn(`  ⚠️ Firebase sync skipped for ${staff.email} (${fbError.message})`);
        }
      }
    }

    // 3. Seed Demo Job
    console.log(`[Seed] Provisioning Job: "${DEMO_JOB.title}"...`);
    const adminUser = DEMO_STAFF_USERS[0];
    const { rows: staffRows } = await client.query('SELECT id FROM users WHERE firebase_uid = $1', [adminUser.firebaseUid]);
    const creatorId = staffRows[0]?.id;

    if (creatorId) {
      await client.query(
        `
        INSERT INTO jobs (
          id, company_id, created_by, title, department, location,
          employment_type, salary_min, salary_max, status, description, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          department = EXCLUDED.department,
          location = EXCLUDED.location,
          employment_type = EXCLUDED.employment_type,
          salary_min = EXCLUDED.salary_min,
          salary_max = EXCLUDED.salary_max,
          status = EXCLUDED.status,
          description = EXCLUDED.description,
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
          DEMO_JOB.salaryMin,
          DEMO_JOB.salaryMax,
          DEMO_JOB.status,
          DEMO_JOB.description,
        ]
      );
    }

    // 4. Seed 21 Candidates, Resumes, Applications, and Audit Histories
    console.log(`[Seed] Provisioning ${SEED_CANDIDATES.length} Candidates across all Pipeline stages...`);

    for (const cand of SEED_CANDIDATES) {
      // 4a. Insert User
      const userRes = await client.query(
        `
        INSERT INTO users (firebase_uid, email, full_name, role, company_id, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, 'CANDIDATE', NULL, TRUE, NOW(), NOW())
        ON CONFLICT (firebase_uid) DO UPDATE SET
          email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          updated_at = NOW()
        RETURNING id;
        `,
        [cand.firebaseUid, cand.email, cand.fullName]
      );
      const userId = userRes.rows[0].id;

      // 4b. Insert Candidate Profile
      const profileRes = await client.query(
        `
        INSERT INTO candidate_profiles (
          user_id, headline, summary, experience_years, skills, linkedin_url, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          headline = EXCLUDED.headline,
          summary = EXCLUDED.summary,
          experience_years = EXCLUDED.experience_years,
          skills = EXCLUDED.skills,
          updated_at = NOW()
        RETURNING id;
        `,
        [
          userId,
          cand.headline,
          `Experienced engineer specializing in ${cand.skills.slice(0, 3).join(', ')}.`,
          cand.experienceYears,
          cand.skills,
          `https://linkedin.com/in/${cand.firebaseUid}`,
        ]
      );
      const profileId = profileRes.rows[0].id;

      // 4c. Create Real Synthetic PDF Resume on Disk and Metadata in DB
      const pdfBuffer = createSyntheticPdfBuffer(cand.fullName, cand.headline);
      const storedFileName = `seed_resume_${cand.firebaseUid}_${Date.now()}.pdf`;
      const filePath = getSafeStoragePath(storedFileName);
      fs.writeFileSync(filePath, pdfBuffer);

      const sha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

      const resumeRes = await client.query(
        `
        INSERT INTO resume_metadata (
          candidate_id, file_name, stored_file_name, file_size, mime_type, sha256_hash, created_at
        )
        VALUES ($1, $2, $3, $4, 'application/pdf', $5, NOW())
        RETURNING id;
        `,
        [profileId, cand.resumeFileName, storedFileName, pdfBuffer.length, sha256]
      );
      const resumeId = resumeRes.rows[0].id;

      // 4d. Insert Application
      const appRes = await client.query(
        `
        INSERT INTO applications (
          job_id, candidate_id, resume_id, current_stage, cover_letter, answers, applied_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, '{}', NOW() - INTERVAL '${cand.index * 2} hours', NOW())
        ON CONFLICT (job_id, candidate_id) DO UPDATE SET
          current_stage = EXCLUDED.current_stage,
          resume_id = EXCLUDED.resume_id,
          updated_at = NOW()
        RETURNING id;
        `,
        [
          DEMO_JOB.id,
          profileId,
          resumeId,
          cand.stage,
          `I am applying for the ${DEMO_JOB.title} role. My core expertise is in ${cand.skills.join(', ')}.`,
        ]
      );
      const applicationId = appRes.rows[0].id;

      // 4e. Build Chronological Stage Audit History
      // Delete existing history for idempotency
      await client.query('DELETE FROM application_stage_history WHERE application_id = $1', [applicationId]);

      // Stage progression map
      const stageSequence: SeedStage[] = [];
      if (cand.stage === 'APPLIED') {
        stageSequence.push('APPLIED');
      } else if (cand.stage === 'SCREENING') {
        stageSequence.push('APPLIED', 'SCREENING');
      } else if (cand.stage === 'INTERVIEW') {
        stageSequence.push('APPLIED', 'SCREENING', 'INTERVIEW');
      } else if (cand.stage === 'SELECTED') {
        stageSequence.push('APPLIED', 'SCREENING', 'INTERVIEW', 'SELECTED');
      } else if (cand.stage === 'OFFERED') {
        stageSequence.push('APPLIED', 'SCREENING', 'INTERVIEW', 'SELECTED', 'OFFERED');
      } else if (cand.stage === 'REJECTED') {
        stageSequence.push('APPLIED', 'REJECTED');
      }

      let prevStage: SeedStage | null = null;
      for (let sIdx = 0; sIdx < stageSequence.length; sIdx++) {
        const stageItem = stageSequence[sIdx];
        const isFinal = sIdx === stageSequence.length - 1;
        const histReason = isFinal ? cand.reason : 'Advanced following qualification evaluation';
        const actor = sIdx === 0 ? userId : creatorId;

        await client.query(
          `
          INSERT INTO application_stage_history (
            application_id, from_stage, to_stage, changed_by, reason, changed_at
          )
          VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${(stageSequence.length - sIdx) * 3} hours');
          `,
          [applicationId, prevStage, stageItem, actor, histReason]
        );
        prevStage = stageItem;
      }
    }

    console.log('============================================================');
    console.log('✅ Seeding completed successfully!');
    console.log(`  - 1 Company (${DEMO_COMPANY.name})`);
    console.log(`  - 2 Staff Accounts (Admin, HR)`);
    console.log(`  - ${SEED_CANDIDATES.length} Candidates with active applications & PDF resumes`);
    console.log('  - Full chronological stage histories verified across all 6 stages');
    console.log('============================================================');
  } catch (error: any) {
    console.error('[Seed Error] Failed to seed database:', error?.stack || error?.message || error);
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
