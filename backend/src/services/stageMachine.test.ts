import {
  validateStageTransition,
  ALLOWED_STAGE_TRANSITIONS,
  ALL_APPLICATION_STAGES,
  ApplicationStage,
} from './stageMachine';

describe('Recruitment Pipeline State Machine (stageMachine.ts)', () => {
  const validReason = 'Candidate passed technical screening with distinction';

  describe('1. Valid Sequential Transitions', () => {
    it('allows APPLIED -> SCREENING', () => {
      const res = validateStageTransition('APPLIED', 'SCREENING', validReason);
      expect(res.valid).toBe(true);
      expect(res.fromStage).toBe('APPLIED');
      expect(res.toStage).toBe('SCREENING');
    });

    it('allows SCREENING -> INTERVIEW', () => {
      const res = validateStageTransition('SCREENING', 'INTERVIEW', validReason);
      expect(res.valid).toBe(true);
    });

    it('allows INTERVIEW -> SELECTED', () => {
      const res = validateStageTransition('INTERVIEW', 'SELECTED', validReason);
      expect(res.valid).toBe(true);
    });

    it('allows SELECTED -> OFFERED', () => {
      const res = validateStageTransition('SELECTED', 'OFFERED', validReason);
      expect(res.valid).toBe(true);
    });
  });

  describe('2. Rejection from any non-terminal stage', () => {
    const nonTerminalStages: ApplicationStage[] = [
      'APPLIED',
      'SCREENING',
      'INTERVIEW',
      'SELECTED',
      'OFFERED',
    ];

    nonTerminalStages.forEach((stage) => {
      it(`allows rejection from ${stage} -> REJECTED`, () => {
        const res = validateStageTransition(stage, 'REJECTED', 'Did not meet requirements');
        expect(res.valid).toBe(true);
      });
    });
  });

  describe('3. Illegal Transitions & Stage Skipping', () => {
    it('prohibits skipping from APPLIED -> OFFERED directly', () => {
      const res = validateStageTransition('APPLIED', 'OFFERED', validReason);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/illegal stage transition/i);
    });

    it('prohibits skipping from APPLIED -> INTERVIEW', () => {
      const res = validateStageTransition('APPLIED', 'INTERVIEW', validReason);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/illegal stage transition/i);
    });

    it('prohibits skipping from SCREENING -> OFFERED', () => {
      const res = validateStageTransition('SCREENING', 'OFFERED', validReason);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/illegal stage transition/i);
    });

    it('prohibits backward transition from OFFERED -> INTERVIEW', () => {
      const res = validateStageTransition('OFFERED', 'INTERVIEW', validReason);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/illegal stage transition/i);
    });

    it('prohibits backward transition from INTERVIEW -> SCREENING', () => {
      const res = validateStageTransition('INTERVIEW', 'SCREENING', validReason);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/illegal stage transition/i);
    });
  });

  describe('4. Terminal State Protection (REJECTED)', () => {
    ALL_APPLICATION_STAGES.forEach((targetStage) => {
      it(`prohibits moving out of REJECTED -> ${targetStage}`, () => {
        const res = validateStageTransition('REJECTED', targetStage, validReason);
        expect(res.valid).toBe(false);
        expect(res.error).toMatch(/terminal 'REJECTED' stage|redundant/i);
      });
    });
  });

  describe('5. Redundant Same-Stage Transitions', () => {
    it('prohibits transitioning to the same stage (APPLIED -> APPLIED)', () => {
      const res = validateStageTransition('APPLIED', 'APPLIED', validReason);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/already in stage/i);
    });
  });

  describe('6. Mandatory Audit Reason Validation', () => {
    it('rejects transition if reason is missing or empty', () => {
      const res1 = validateStageTransition('APPLIED', 'SCREENING', '');
      expect(res1.valid).toBe(false);
      expect(res1.error).toMatch(/transition reason/i);

      const res2 = validateStageTransition('APPLIED', 'SCREENING', '   ');
      expect(res2.valid).toBe(false);

      const res3 = validateStageTransition('APPLIED', 'SCREENING', null);
      expect(res3.valid).toBe(false);
    });

    it('rejects transition if reason is shorter than 3 characters', () => {
      const res = validateStageTransition('APPLIED', 'SCREENING', 'ok');
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/at least 3 characters/i);
    });
  });

  describe('7. Case-Insensitive Inputs', () => {
    it('safely handles lowercase inputs (applied -> screening)', () => {
      const res = validateStageTransition('applied', 'screening', validReason);
      expect(res.valid).toBe(true);
      expect(res.fromStage).toBe('APPLIED');
      expect(res.toStage).toBe('SCREENING');
    });

    it('rejects unknown or invalid stage string', () => {
      const res = validateStageTransition('UNKNOWN_STAGE', 'SCREENING', validReason);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/invalid current stage/i);
    });
  });
});
