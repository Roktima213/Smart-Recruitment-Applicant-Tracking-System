import {
  APPROVED_OFFER_TEMPLATES,
  getApprovedOfferTemplates,
  getApprovedOfferTemplate,
  extractTemplatePlaceholders,
  escapeHtml,
  renderOfferLetterHtml,
  validateOfferTemplateVariables,
  computeOfferChecksum,
  createOfferSnapshotPayload,
  validateOfferLifecycleTransition,
} from './offerTemplates';

describe('Controlled Offer Letter Templates & Snapshot Archiving (Floor 18)', () => {
  describe('1. Approved Template Catalog & Retrieval', () => {
    it('should return all active approved offer templates', () => {
      const templates = getApprovedOfferTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(4);
      expect(templates.every((t) => t.isActive)).toBe(true);
    });

    it('should find template by type case-insensitively', () => {
      const standard = getApprovedOfferTemplate('standard_full_time');
      expect(standard).toBeDefined();
      expect(standard?.name).toContain('Standard Full-Time');

      const tech = getApprovedOfferTemplate('TECHNICAL_ENGINEERING');
      expect(tech).toBeDefined();
      expect(tech?.templateType).toBe('TECHNICAL_ENGINEERING');
    });

    it('should find template by UUID identifier', () => {
      const template = getApprovedOfferTemplate('11111111-2222-3333-4444-555555550001');
      expect(template).toBeDefined();
      expect(template?.templateType).toBe('STANDARD_FULL_TIME');
    });

    it('should return undefined for unknown template identifiers', () => {
      expect(getApprovedOfferTemplate('non-existent-template-id')).toBeUndefined();
      expect(getApprovedOfferTemplate('')).toBeUndefined();
    });

    it('should ensure all approved templates include company branding and core compensation placeholders', () => {
      const templates = getApprovedOfferTemplates();
      const requiredBrandingTokens = ['company_name', 'company_logo', 'candidate_name', 'job_title', 'salary_amount'];

      for (const tpl of templates) {
        for (const token of requiredBrandingTokens) {
          expect(tpl.placeholders).toContain(token);
          expect(tpl.bodyHtml).toContain(`{{${token}}}`);
        }
      }
    });
  });

  describe('2. Placeholder Extraction & Variable Validation', () => {
    it('should accurately extract unique placeholder tokens from HTML string', () => {
      const html = '<h1>{{company_name}}</h1><p>{{candidate_name}} joins {{company_name}}</p>';
      const tokens = extractTemplatePlaceholders(html);
      expect(tokens).toEqual(['company_name', 'candidate_name']);
    });

    it('should return empty array when no placeholders are present', () => {
      expect(extractTemplatePlaceholders('<p>Plain HTML without tokens</p>')).toEqual([]);
      expect(extractTemplatePlaceholders('')).toEqual([]);
    });

    it('should detect missing mandatory template variables', () => {
      const template = getApprovedOfferTemplate('STANDARD_FULL_TIME')!;
      const validation = validateOfferTemplateVariables(template.bodyHtml, {
        company_name: 'Acme Corp',
        candidate_name: 'Jane Doe',
      });

      expect(validation.isValid).toBe(false);
      expect(validation.missingFields).toContain('salary_amount');
      expect(validation.missingFields).toContain('start_date');
      expect(validation.missingFields).toContain('job_title');
    });

    it('should return isValid: true when all variables are provided', () => {
      const template = getApprovedOfferTemplate('INTERNSHIP_CONTRACT')!;
      const variables: Record<string, string> = {
        company_name: 'InnoTech Labs',
        company_address: '100 Innovation Way',
        company_website: 'https://innotech.io',
        company_logo: 'https://innotech.io/logo.png',
        issued_date: '2026-11-20',
        candidate_name: 'Alex Rivera',
        candidate_email: 'alex@example.com',
        job_title: 'Software Engineering Intern',
        department: 'Cloud Platform',
        salary_amount: '35.00',
        currency: 'USD',
        start_date: '2027-01-15',
        reporting_manager: 'Marcus Vance',
        offer_expiry_date: '2026-12-05',
        signatory_name: 'Sarah Connor',
        signatory_title: 'VP of Engineering',
      };

      const validation = validateOfferTemplateVariables(template.bodyHtml, variables);
      expect(validation.isValid).toBe(true);
      expect(validation.missingFields).toHaveLength(0);
    });
  });

  describe('3. XSS Sanitization & HTML Rendering', () => {
    it('should escape dangerous HTML characters to prevent XSS injection in user fields', () => {
      const dangerousInput = '<script>alert("pwned")</script>&<img src="x" onerror="evil()"/>';
      const escaped = escapeHtml(dangerousInput);

      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;alert(&quot;pwned&quot;)&lt;/script&gt;');
      expect(escaped).toContain('&amp;&lt;img src=&quot;x&quot; onerror=&quot;evil()&quot;/&gt;');
    });

    it('should safely render offer letter with candidate data and sanitize hostile script tags', () => {
      const template = getApprovedOfferTemplate('STANDARD_FULL_TIME')!;
      const rendered = renderOfferLetterHtml(template.bodyHtml, {
        company_name: 'Secure Corp',
        candidate_name: '<b onmouseover="stealCookies()">Hacker Candidate</b>',
        job_title: 'Cloud Architect',
        salary_amount: '185000',
        currency: 'USD',
        start_date: '2027-01-10',
        offer_expiry_date: '2026-12-01',
      });

      expect(rendered).toContain('Secure Corp');
      expect(rendered).toContain('&lt;b onmouseover=&quot;stealCookies()&quot;&gt;Hacker Candidate&lt;/b&gt;');
      expect(rendered).not.toContain('<b onmouseover');
    });

    it('should inject fallback placeholder notice for unprovided fields', () => {
      const html = '<p>Role: {{job_title}} at {{company_name}}</p>';
      const rendered = renderOfferLetterHtml(html, { company_name: 'TechCo' });
      expect(rendered).toBe('<p>Role: [Pending job title] at TechCo</p>');
    });
  });

  describe('4. Cryptographic Checksum & Immutable Snapshot Archiving', () => {
    it('should generate a 64-character SHA-256 hexadecimal checksum', () => {
      const checksum = computeOfferChecksum({
        offerLetterHtml: '<div>Offer terms</div>',
        salaryAmount: 150000,
        currency: 'USD',
        startDate: '2027-02-01',
        applicationId: 'app-1234',
      });

      expect(checksum).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(checksum)).toBe(true);
    });

    it('should be deterministic and produce identical checksum for identical inputs', () => {
      const payload = {
        offerLetterHtml: '<div>Offer terms identical</div>',
        salaryAmount: 120000,
        currency: 'USD',
        startDate: '2027-03-01',
      };

      const hash1 = computeOfferChecksum(payload);
      const hash2 = computeOfferChecksum(payload);
      expect(hash1).toBe(hash2);
    });

    it('should detect any tampering: altering salary, date, or HTML changes the checksum', () => {
      const basePayload = {
        offerLetterHtml: '<div>Offer terms</div>',
        salaryAmount: 120000,
        currency: 'USD',
        startDate: '2027-03-01',
      };

      const baseHash = computeOfferChecksum(basePayload);

      // Tampered salary
      const tamperedSalaryHash = computeOfferChecksum({ ...basePayload, salaryAmount: 125000 });
      expect(tamperedSalaryHash).not.toBe(baseHash);

      // Tampered start date
      const tamperedDateHash = computeOfferChecksum({ ...basePayload, startDate: '2027-03-02' });
      expect(tamperedDateHash).not.toBe(baseHash);

      // Tampered HTML
      const tamperedHtmlHash = computeOfferChecksum({ ...basePayload, offerLetterHtml: '<div>Offer terms modified</div>' });
      expect(tamperedHtmlHash).not.toBe(baseHash);
    });

    it('should create a complete immutable snapshot payload with timestamp and checksum', () => {
      const snapshot = createOfferSnapshotPayload({
        offerId: 'offer-550e8400-e29b-41d4-a716-446655440000',
        offerLetterHtml: '<div>Approved Offer Document</div>',
        salaryAmount: 160000,
        currency: 'USD',
        startDate: '2027-01-15',
        expiresAt: '2026-12-15T23:59:59.000Z',
        issuedBy: 'user-admin-1',
        metadata: { department: 'Infrastructure' },
      });

      expect(snapshot.offerId).toBe('offer-550e8400-e29b-41d4-a716-446655440000');
      expect(snapshot.salaryAmount).toBe(160000);
      expect(snapshot.currency).toBe('USD');
      expect(snapshot.sha256Checksum).toHaveLength(64);
      expect(snapshot.issuedAt).toBeDefined();
      expect(snapshot.metadata?.department).toBe('Infrastructure');
    });
  });

  describe('5. Offer Lifecycle State Machine & Transition Rules', () => {
    it('should permit legal transitions from DRAFT to ISSUED', () => {
      expect(validateOfferLifecycleTransition('DRAFT', 'ISSUED').isValid).toBe(true);
      expect(validateOfferLifecycleTransition('DRAFT', 'DRAFT').isValid).toBe(true);
    });

    it('should permit legal transitions from ISSUED to terminal response states', () => {
      expect(validateOfferLifecycleTransition('ISSUED', 'ACCEPTED').isValid).toBe(true);
      expect(validateOfferLifecycleTransition('ISSUED', 'DECLINED').isValid).toBe(true);
      expect(validateOfferLifecycleTransition('ISSUED', 'EXPIRED').isValid).toBe(true);
    });

    it('should reject invalid stage skipping from DRAFT directly to terminal response states', () => {
      const draftToAccepted = validateOfferLifecycleTransition('DRAFT', 'ACCEPTED');
      expect(draftToAccepted.isValid).toBe(false);
      expect(draftToAccepted.error).toContain('Cannot transition from DRAFT to ACCEPTED');

      const draftToDeclined = validateOfferLifecycleTransition('DRAFT', 'DECLINED');
      expect(draftToDeclined.isValid).toBe(false);
    });

    it('should prohibit transitioning out of terminal states (ACCEPTED, DECLINED, EXPIRED)', () => {
      expect(validateOfferLifecycleTransition('ACCEPTED', 'ISSUED').isValid).toBe(false);
      expect(validateOfferLifecycleTransition('ACCEPTED', 'DRAFT').isValid).toBe(false);
      expect(validateOfferLifecycleTransition('DECLINED', 'ISSUED').isValid).toBe(false);
      expect(validateOfferLifecycleTransition('EXPIRED', 'ACCEPTED').isValid).toBe(false);
    });
  });
});
