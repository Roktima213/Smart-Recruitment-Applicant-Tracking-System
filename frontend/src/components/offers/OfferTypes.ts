export type OfferStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ISSUED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'WITHDRAWN'
  | 'EXPIRED';

export type OfferTemplateId =
  | 'STANDARD_FULLTIME'
  | 'EXECUTIVE_LEADERSHIP'
  | 'REMOTE_ENGINEERING'
  | 'INTERN_COOP';

export type PayFrequency = 'ANNUAL' | 'MONTHLY' | 'BIWEEKLY';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';

export type WorkplaceType = 'ON_SITE' | 'HYBRID' | 'REMOTE';

export interface OfferCandidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: string;
  department: string;
  location: string;
  currentStage: 'SELECTED' | 'OFFERED' | 'INTERVIEW' | 'SCREENING';
  applicationId?: string;
  avatarUrl?: string;
}

export interface OfferCompensation {
  currency: string; // 'USD' | 'EUR' | 'GBP' | 'INR' | 'CAD'
  baseSalary: number;
  payFrequency: PayFrequency;
  signOnBonus?: number;
  performanceBonusPercent?: number;
  equityShares?: number;
  equityType?: 'RSU' | 'ISO' | 'NSO';
  equityVesting?: string;
  benefitsSummary: string[];
}

export interface OfferDetails {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidateAddress?: string;
  candidatePhone?: string;
  jobTitle: string;
  department: string;
  employmentType: EmploymentType;
  workplaceType: WorkplaceType;
  officeLocation: string;
  reportsTo: string;
  reportsToTitle: string;
  templateId: OfferTemplateId;
  compensation: OfferCompensation;
  startDate: string; // YYYY-MM-DD
  expirationDate: string; // YYYY-MM-DD
  issueDate: string; // YYYY-MM-DD
  status: OfferStatus;
  customNotes?: string;
  executiveSignerName?: string;
  executiveSignerTitle?: string;
  issuedAt?: string;
  acceptedAt?: string;
  declinedAt?: string;
  declineReason?: string;
  onboardingTasksCount?: number;
  onboardingCompletedCount?: number;
}

export interface OfferTemplateDefinition {
  id: OfferTemplateId;
  name: string;
  badge: string;
  badgeColor: string;
  tagline: string;
  description: string;
  introClause: string;
  dutiesClause: string;
  termsClause: string;
  contingencyClause: string;
}

export const OFFER_TEMPLATES: Record<OfferTemplateId, OfferTemplateDefinition> = {
  STANDARD_FULLTIME: {
    id: 'STANDARD_FULLTIME',
    name: 'Standard Full-Time Employment',
    badge: 'Full-Time Corporate',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    tagline: 'Standard permanent corporate offer with competitive salary and comprehensive benefits.',
    description: 'Designed for standard salaried engineering, product, and business hires with annual performance targets and standard equity vesting.',
    introClause:
      'We are delighted to extend to you an offer of employment at Smart ATS Inc. We believe your exceptional skills and track record make you an ideal fit for our team as we scale our intelligent talent platform.',
    dutiesClause:
      'In this position, you will be expected to devote your full business time and best efforts to the performance of your duties, collaborating closely with your cross-functional team members.',
    termsClause:
      'Employment with Smart ATS Inc. is for no specified period and constitutes at-will employment. You are free to terminate your employment at any time, for any reason, with or without cause, and the Company reserves the same right.',
    contingencyClause:
      'This offer is contingent upon satisfactory completion of background verification, reference checks, and verification of your legal authorization to work in the designated territory.',
  },
  EXECUTIVE_LEADERSHIP: {
    id: 'EXECUTIVE_LEADERSHIP',
    name: 'Executive & Strategic Leadership',
    badge: 'Executive / Lead',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    tagline: 'Senior director and VP agreement featuring executive severance and strategic equity grants.',
    description: 'Tailored for senior leadership and director roles with executive bonus targets, strategic board reporting, and enhanced vesting milestones.',
    introClause:
      'On behalf of the Board of Directors and the Executive Committee, it is our distinct privilege to formally offer you this executive leadership role at Smart ATS Inc. Your visionary leadership will be instrumental in steering our organization.',
    dutiesClause:
      'You will oversee key departmental strategic initiatives, manage high-impact technical and business teams, and report on organizational milestones directly to senior executive leadership.',
    termsClause:
      'In addition to standard executive at-will employment covenants, this agreement encompasses executive confidentiality, proprietary intellectual property governance, and non-solicitation protections.',
    contingencyClause:
      'This executive appointment remains contingent upon approval by the Board Governance Committee and comprehensive executive background diligence.',
  },
  REMOTE_ENGINEERING: {
    id: 'REMOTE_ENGINEERING',
    name: 'Global Remote Engineering Agreement',
    badge: 'Remote & Distributed',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    tagline: 'Flexible distributed agreement including home office tech stipend and async work covenants.',
    description: 'Optimized for distributed software engineers with home office allowance, flexible core collaboration hours, and digital asset security policies.',
    introClause:
      'We are thrilled to offer you a remote engineering position with Smart ATS Inc. As a distributed organization, we pride ourselves on delivering world-class software through autonomy, excellence, and collaborative culture.',
    dutiesClause:
      'You will operate remotely from your designated home workspace, observing core collaboration hours while maintaining autonomous asynchronous productivity on core platform services.',
    termsClause:
      'The Company will provide a dedicated hardware setup and monthly home-office connectivity stipend in accordance with our Remote First Workplace Policy.',
    contingencyClause:
      'This offer is contingent upon satisfactory verification of remote security standards, background verification, and proof of legal work authorization in your primary jurisdiction.',
  },
  INTERN_COOP: {
    id: 'INTERN_COOP',
    name: 'Technical Internship & Co-op Program',
    badge: 'Internship & Co-op',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    tagline: 'Structured fixed-term internship with dedicated mentorship and accelerated performance review.',
    description: 'Suitable for university students and summer interns with hourly/monthly stipend, dedicated engineering mentorship, and conversion eligibility.',
    introClause:
      'Smart ATS Inc. is excited to offer you a position in our University Talent & Engineering Internship Program. We are committed to fostering early-career growth through hands-on system building.',
    dutiesClause:
      'You will be paired with a dedicated Senior Engineering Mentor and participate in real-world product sprints, architectural reviews, and intern showcase presentations.',
    termsClause:
      'This is a fixed-term educational employment program. Successful completion of project milestones qualifies candidates for accelerated full-time conversion consideration upon graduation.',
    contingencyClause:
      'This offer is contingent upon confirmation of good academic standing and active enrollment in an accredited degree program or recent completion thereof.',
  },
};

export const INITIAL_OFFERS: OfferDetails[] = [
  {
    id: 'OFF-2026-101',
    candidateId: 'c5',
    candidateName: 'Carlos Mendez',
    candidateEmail: 'carlos.mendez@example.com',
    candidateAddress: '742 Evergreen Terrace, San Francisco, CA 94107',
    candidatePhone: '+1 (415) 555-0142',
    jobTitle: 'DevOps & Cloud Architect',
    department: 'Cloud Infrastructure & SRE',
    employmentType: 'FULL_TIME',
    workplaceType: 'HYBRID',
    officeLocation: 'Floor 15 Headquarters - San Francisco, CA',
    reportsTo: 'Ranadeep Saha',
    reportsToTitle: 'Engineering Director',
    templateId: 'STANDARD_FULLTIME',
    compensation: {
      currency: 'USD',
      baseSalary: 145000,
      payFrequency: 'ANNUAL',
      signOnBonus: 12000,
      performanceBonusPercent: 15,
      equityShares: 8000,
      equityType: 'RSU',
      equityVesting: '4 years with 1-year cliff (25% vesting at 12 months, quarterly thereafter)',
      benefitsSummary: [
        'Comprehensive Medical, Dental, and Vision coverage (100% employer paid)',
        '401(k) retirement plan with 5% dollar-for-dollar employer match',
        'Unlimited Flexible Time Off (FTO) & 12 paid corporate holidays',
        'Annual $3,000 professional learning, certification, and tech budget',
      ],
    },
    startDate: '2026-12-01',
    expirationDate: '2026-11-20',
    issueDate: '2026-11-06',
    status: 'ISSUED',
    customNotes: 'Carlos excelled in both the Terraform automation and Kubernetes disaster recovery audit rounds.',
    executiveSignerName: 'Sarah Jenkins',
    executiveSignerTitle: 'VP of People & Talent Operations',
    issuedAt: '2026-11-06T10:00:00Z',
    onboardingTasksCount: 6,
    onboardingCompletedCount: 1,
  },
  {
    id: 'OFF-2026-100',
    candidateId: 'c6',
    candidateName: 'Zack Taylor',
    candidateEmail: 'zack.taylor@example.com',
    candidateAddress: '1204 Pine Street, Seattle, WA 98101',
    candidatePhone: '+1 (206) 555-0189',
    jobTitle: 'Senior Full Stack Engineer',
    department: 'Core Applications',
    employmentType: 'FULL_TIME',
    workplaceType: 'REMOTE',
    officeLocation: 'Distributed / United States',
    reportsTo: 'Alex Morgan',
    reportsToTitle: 'Staff Engineering Lead',
    templateId: 'REMOTE_ENGINEERING',
    compensation: {
      currency: 'USD',
      baseSalary: 135000,
      payFrequency: 'ANNUAL',
      signOnBonus: 10000,
      performanceBonusPercent: 10,
      equityShares: 6000,
      equityType: 'RSU',
      equityVesting: '4 years with 1-year cliff (25% at 1 year, monthly thereafter)',
      benefitsSummary: [
        'Comprehensive Medical, Dental, and Vision coverage',
        '401(k) matching up to 5%',
        '$1,500 Home Office setup stipend & $100/mo remote internet allowance',
        'Flexible working hours with core overlap hours',
      ],
    },
    startDate: '2026-11-25',
    expirationDate: '2026-11-12',
    issueDate: '2026-11-01',
    status: 'ACCEPTED',
    customNotes: 'Zack demonstrated exemplary full-stack capability and domain model knowledge.',
    executiveSignerName: 'Sarah Jenkins',
    executiveSignerTitle: 'VP of People & Talent Operations',
    issuedAt: '2026-11-01T14:30:00Z',
    acceptedAt: '2026-11-04T09:15:00Z',
    onboardingTasksCount: 8,
    onboardingCompletedCount: 5,
  },
  {
    id: 'OFF-2026-102',
    candidateId: 'c2',
    candidateName: 'Samira Khan',
    candidateEmail: 'samira.khan@example.com',
    candidateAddress: '55 Austin Tech Hub Blvd, Austin, TX 78701',
    candidatePhone: '+1 (512) 555-0199',
    jobTitle: 'Principal Cloud & Security Architect',
    department: 'Cloud Infrastructure & SRE',
    employmentType: 'FULL_TIME',
    workplaceType: 'HYBRID',
    officeLocation: 'Floor 15 Headquarters - San Francisco, CA',
    reportsTo: 'Ranadeep Saha',
    reportsToTitle: 'Engineering Director',
    templateId: 'EXECUTIVE_LEADERSHIP',
    compensation: {
      currency: 'USD',
      baseSalary: 185000,
      payFrequency: 'ANNUAL',
      signOnBonus: 25000,
      performanceBonusPercent: 20,
      equityShares: 15000,
      equityType: 'RSU',
      equityVesting: '4 years with 1-year cliff (25% vesting after 12 months, quarterly thereafter)',
      benefitsSummary: [
        'Premium Executive Healthcare, Dental, and Vision coverage',
        'Executive 401(k) plan with 6% accelerated match',
        'Executive relocation stipend & temporary housing assistance',
        'Annual $5,000 executive leadership development stipend',
      ],
    },
    startDate: '2026-12-15',
    expirationDate: '2026-11-25',
    issueDate: '2026-11-14',
    status: 'DRAFT',
    customNotes: 'Prepared for immediate executive committee review following unanimous positive scorecards.',
    executiveSignerName: 'Sarah Jenkins',
    executiveSignerTitle: 'VP of People & Talent Operations',
    onboardingTasksCount: 8,
    onboardingCompletedCount: 0,
  },
];

export const ELIGIBLE_CANDIDATES: OfferCandidate[] = [
  {
    id: 'c2',
    name: 'Samira Khan',
    email: 'samira.khan@example.com',
    phone: '+1 (512) 555-0199',
    address: '55 Austin Tech Hub Blvd, Austin, TX 78701',
    role: 'Principal Cloud & Security Architect',
    department: 'Cloud Infrastructure & SRE',
    location: 'Austin, TX (Willing to relocate / Hybrid)',
    currentStage: 'SELECTED',
  },
  {
    id: 'c1',
    name: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    phone: '+1 (415) 555-0128',
    address: '88 Market St, San Francisco, CA 94105',
    role: 'Senior Full Stack Engineer',
    department: 'Core Applications',
    location: 'San Francisco, CA',
    currentStage: 'SELECTED',
  },
  {
    id: 'c4',
    name: 'Elena Rostova',
    email: 'elena.rostova@example.com',
    phone: '+1 (212) 555-0174',
    address: '350 5th Avenue, New York, NY 10118',
    role: 'Lead Product Designer',
    department: 'Product & Design',
    location: 'New York, NY (Remote)',
    currentStage: 'SELECTED',
  },
  {
    id: 'c5',
    name: 'Carlos Mendez',
    email: 'carlos.mendez@example.com',
    phone: '+1 (415) 555-0142',
    address: '742 Evergreen Terrace, San Francisco, CA 94107',
    role: 'DevOps & Cloud Architect',
    department: 'Cloud Infrastructure & SRE',
    location: 'San Francisco, CA',
    currentStage: 'OFFERED',
  },
  {
    id: 'c6',
    name: 'Zack Taylor',
    email: 'zack.taylor@example.com',
    phone: '+1 (206) 555-0189',
    address: '1204 Pine Street, Seattle, WA 98101',
    role: 'Senior Full Stack Engineer',
    department: 'Core Applications',
    location: 'Seattle, WA',
    currentStage: 'OFFERED',
  },
  {
    id: 'c7',
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    phone: '+1 (650) 555-0192',
    address: '420 University Ave, Palo Alto, CA 94301',
    role: 'Senior ML Infrastructure Engineer',
    department: 'Data & AI Systems',
    location: 'Palo Alto, CA',
    currentStage: 'SELECTED',
  },
];
