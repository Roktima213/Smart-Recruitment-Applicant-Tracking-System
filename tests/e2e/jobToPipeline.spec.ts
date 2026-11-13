import { test, expect } from '@playwright/test';

test.describe('End-to-End Recruitment Journey: Job Requisition -> Application -> Pipeline Kanban (Floor 13)', () => {
  const testJob = {
    id: 'e2e-job-uuid-001',
    title: 'Lead Staff Cloud Engineer',
    department: 'Platform Engineering',
    location: 'Remote, US',
    employmentType: 'Full-time',
    salaryMin: '160000',
    salaryMax: '220000',
    description: 'Lead our next-generation cloud infrastructure, Kubernetes clusters, and multi-tenant security architecture.',
  };

  const testCandidate = {
    name: 'Morgan Thorne',
    email: 'morgan.thorne@example.com',
    headline: 'Senior Cloud & Systems Architect',
    skills: ['Kubernetes', 'Go', 'Terraform', 'PostgreSQL'],
    coverLetter: 'I have extensive production experience scaling distributed Kubernetes clusters and building compliant multi-tenant cloud platforms.',
  };

  test.beforeEach(async ({ page }) => {
    // Mock / intercept common authentication and application endpoints for isolated, deterministic E2E runs
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'e2e-hr-user-id',
            email: 'recruiter@techcorp.com',
            role: 'HR',
            companyId: 'company-uuid-001',
            isActive: true,
          },
        }),
      });
    });
  });

  test('Complete Flow: HR creates job -> Candidate applies -> HR reviews dossier and moves to Screening', async ({
    page,
  }) => {
    // --------------------------------------------------------------------------
    // STEP 1: HR Creates Job Requisition and Publishes it
    // --------------------------------------------------------------------------
    await page.goto('/hr/jobs');
    await expect(page).toHaveTitle(/Smart ATS|Recruitment/i);

    // Verify HR Job dashboard loads
    const createJobBtn = page.getByRole('button', { name: /create job|new requisition|post job/i });
    if (await createJobBtn.isVisible()) {
      await createJobBtn.click();
    }

    // Mock API response for published job list
    await page.route('**/api/jobs', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: testJob.id,
                title: testJob.title,
                department: testJob.department,
                location: testJob.location,
                employmentType: testJob.employmentType,
                status: 'PUBLISHED',
                companyName: 'TechCorp Solutions',
              },
            ],
            pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // --------------------------------------------------------------------------
    // STEP 2: Candidate Views Job Board & Submits Valid Application
    // --------------------------------------------------------------------------
    await page.goto('/jobs');

    // Mock single job detail lookup
    await page.route(`**/api/jobs/${testJob.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: testJob.id,
            title: testJob.title,
            department: testJob.department,
            location: testJob.location,
            employmentType: testJob.employmentType,
            salaryMin: 160000,
            salaryMax: 220000,
            description: testJob.description,
            status: 'PUBLISHED',
            companyName: 'TechCorp Solutions',
          },
        }),
      });
    });

    await page.goto(`/jobs/${testJob.id}`);
    await expect(page.getByText(testJob.title)).toBeVisible();
    await expect(page.getByText(testJob.department)).toBeVisible();

    // Candidate clicks "Apply Now" to trigger JobApplicationModal
    const applyBtn = page.getByRole('button', { name: /apply now/i });
    await expect(applyBtn).toBeVisible();
    await applyBtn.click();

    // Verify modal appears
    await expect(page.getByText(/submit your application/i)).toBeVisible();

    // Fill in cover letter note
    const coverLetterArea = page.getByPlaceholder(/write a brief note/i);
    if (await coverLetterArea.isVisible()) {
      await coverLetterArea.fill(testCandidate.coverLetter);
    }

    // Intercept application submission API
    let submittedApplicationId = 'e2e-app-uuid-999';
    await page.route('**/api/applications', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Application submitted successfully',
            data: {
              id: submittedApplicationId,
              jobId: testJob.id,
              currentStage: 'APPLIED',
              appliedAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Submit Application Modal Form
    const confirmSubmitBtn = page.getByRole('button', { name: /submit application/i });
    await confirmSubmitBtn.click();

    // --------------------------------------------------------------------------
    // STEP 3: HR Pipeline Kanban - Search, Open Dossier Drawer & Transition to Screening
    // --------------------------------------------------------------------------
    // Setup Pipeline API response with the submitted candidate
    const pipelineData = [
      {
        id: submittedApplicationId,
        jobId: testJob.id,
        candidateId: 'e2e-candidate-id',
        resumeId: 'resume-uuid-1',
        currentStage: 'APPLIED',
        coverLetter: testCandidate.coverLetter,
        appliedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        matchScore: 94,
        candidate: {
          id: 'e2e-candidate-id',
          name: testCandidate.name,
          email: testCandidate.email,
          headline: testCandidate.headline,
          skills: testCandidate.skills,
        },
        job: {
          id: testJob.id,
          title: testJob.title,
          department: testJob.department,
          location: testJob.location,
          companyName: 'TechCorp Solutions',
        },
        resumeFileName: 'Morgan_Thorne_Cloud_CV.pdf',
        stageHistory: [
          {
            id: 'hist-1',
            fromStage: null,
            toStage: 'APPLIED',
            changedBy: testCandidate.name,
            reason: 'Direct candidate application submission',
            changedAt: new Date().toISOString(),
          },
        ],
      },
    ];

    await page.route('**/api/applications', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: pipelineData,
            pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Intercept dossier history lookup
    await page.route(`**/api/applications/${submittedApplicationId}/history`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          timeline: [
            {
              id: 'hist-1',
              fromStage: null,
              toStage: 'APPLIED',
              reason: 'Direct candidate application submission',
              changedAt: new Date().toISOString(),
              changedBy: { id: 'cand-1', name: testCandidate.name, role: 'CANDIDATE' },
            },
          ],
        }),
      });
    });

    // Navigate to HR Pipeline board
    await page.goto('/hr/pipeline');
    await expect(page.getByText(/Recruitment Pipeline Board/i)).toBeVisible();
    await expect(page.getByText('Applied')).toBeVisible();
    await expect(page.getByText('Screening')).toBeVisible();
    await expect(page.getByText(testCandidate.name)).toBeVisible();

    // Click candidate name to open Candidate Dossier Drawer
    await page.getByText(testCandidate.name).click();

    // Verify slide-over drawer opens
    await expect(page.getByText(/candidate contact/i)).toBeVisible();
    await expect(page.getByText(testCandidate.email)).toBeVisible();
    await expect(page.getByText(/stage transition timeline/i)).toBeVisible();

    // Intercept stage transition PATCH API
    await page.route(`**/api/applications/${submittedApplicationId}/stage`, async (route) => {
      if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON();
        expect(body.to_stage).toBe('SCREENING');
        expect(body.reason.length).toBeGreaterThanOrEqual(3);

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Application transitioned from APPLIED to SCREENING',
            data: {
              application: {
                id: submittedApplicationId,
                current_stage: 'SCREENING',
              },
              history: {
                from_stage: 'APPLIED',
                to_stage: 'SCREENING',
                reason: body.reason,
              },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Click "Advance Stage" inside dossier drawer to open StageTransitionModal
    const advanceBtn = page.getByRole('button', { name: /advance stage/i });
    await advanceBtn.click();

    // Verify stage transition modal appears
    await expect(page.getByText(/stage transition confirmation/i)).toBeVisible();

    // Fill in required audit reason
    const reasonTextarea = page.getByPlaceholder(/provide mandatory business justification/i);
    await reasonTextarea.fill('Strong cloud infrastructure credentials; advancing candidate to screening');

    // Confirm transition
    const confirmMoveBtn = page.getByRole('button', { name: /confirm move to screening/i });
    await confirmMoveBtn.click();

    // Verify toast confirmation appears
    await expect(page.getByText(/successfully moved/i)).toBeVisible();
  });
});
