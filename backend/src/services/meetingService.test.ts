import {
  meetingService,
  MeetingService,
  normalizeToUtc,
  normalizeToUtcIso,
  validateAndNormalizeTimeWindow,
  isTimeOverlapping,
  generateMeetingLink,
  generateGoogleMeetUrl,
  generateZoomMeeting,
  generateWebexMeeting,
} from './meetingService';

describe('Meeting Service - UTC Normalizer & Meeting Link Generator (Floor 15)', () => {
  describe('1. UTC Timezone Normalization', () => {
    it('should correctly normalize timestamps with positive timezone offsets to UTC', () => {
      // 15:30:00 in IST (+05:30) is 10:00:00 UTC
      const istString = '2026-11-20T15:30:00+05:30';
      const utcDate = normalizeToUtc(istString);
      const utcIso = normalizeToUtcIso(istString);

      expect(utcDate.getUTCFullYear()).toBe(2026);
      expect(utcDate.getUTCMonth()).toBe(10); // November (0-indexed)
      expect(utcDate.getUTCDate()).toBe(20);
      expect(utcDate.getUTCHours()).toBe(10);
      expect(utcDate.getUTCMinutes()).toBe(0);
      expect(utcIso).toBe('2026-11-20T10:00:00.000Z');
    });

    it('should correctly normalize timestamps with negative timezone offsets to UTC', () => {
      // 05:00:00 in EST (-05:00) is 10:00:00 UTC
      const estString = '2026-11-20T05:00:00-05:00';
      const utcIso = normalizeToUtcIso(estString);

      expect(utcIso).toBe('2026-11-20T10:00:00.000Z');
    });

    it('should accept epoch milliseconds and Date objects', () => {
      const fixedEpoch = 1795168800000;
      const fromEpoch = normalizeToUtc(fixedEpoch);
      const fromDate = normalizeToUtc(new Date(fixedEpoch));

      expect(fromEpoch.getTime()).toBe(fixedEpoch);
      expect(fromDate.getTime()).toBe(fixedEpoch);
    });

    it('should throw an error for invalid date inputs', () => {
      expect(() => normalizeToUtc('invalid-date-string')).toThrow(/Invalid date input/);
      expect(() => normalizeToUtc('')).toThrow(/cannot be empty/);
      expect(() => normalizeToUtc(null as any)).toThrow(/cannot be empty/);
      expect(() => normalizeToUtc(undefined as any)).toThrow(/cannot be empty/);
    });
  });

  describe('2. Scheduling Window Validation (validateAndNormalizeTimeWindow)', () => {
    it('should validate and calculate duration in minutes for valid time windows', () => {
      const start = '2026-11-20T10:00:00Z';
      const end = '2026-11-20T10:45:00Z';

      const window = validateAndNormalizeTimeWindow(start, end);

      expect(window.scheduledStartIso).toBe('2026-11-20T10:00:00.000Z');
      expect(window.scheduledEndIso).toBe('2026-11-20T10:45:00.000Z');
      expect(window.durationMinutes).toBe(45);
    });

    it('should reject time windows where scheduled_end is equal to or before scheduled_start', () => {
      const start = '2026-11-20T11:00:00Z';
      const sameEnd = '2026-11-20T11:00:00Z';
      const earlierEnd = '2026-11-20T10:00:00Z';

      expect(() => validateAndNormalizeTimeWindow(start, sameEnd)).toThrow(
        /scheduled_end .* must be strictly after scheduled_start/
      );
      expect(() => validateAndNormalizeTimeWindow(start, earlierEnd)).toThrow(
        /scheduled_end .* must be strictly after scheduled_start/
      );
    });
  });

  describe('3. Interview Time-Slot Conflict Detection (isTimeOverlapping)', () => {
    it('should detect partial and fully enclosed overlapping intervals', () => {
      // Slot 1: 10:00 - 11:00
      const slot1 = { start: '2026-11-20T10:00:00Z', end: '2026-11-20T11:00:00Z' };

      // Overlapping cases:
      const slotStartsInside = { start: '2026-11-20T10:30:00Z', end: '2026-11-20T11:30:00Z' };
      const slotEndsInside = { start: '2026-11-20T09:30:00Z', end: '2026-11-20T10:30:00Z' };
      const slotEnclosed = { start: '2026-11-20T10:15:00Z', end: '2026-11-20T10:45:00Z' };
      const slotEnclosing = { start: '2026-11-20T09:00:00Z', end: '2026-11-20T12:00:00Z' };

      expect(isTimeOverlapping(slot1, slotStartsInside)).toBe(true);
      expect(isTimeOverlapping(slot1, slotEndsInside)).toBe(true);
      expect(isTimeOverlapping(slot1, slotEnclosed)).toBe(true);
      expect(isTimeOverlapping(slot1, slotEnclosing)).toBe(true);
    });

    it('should return false for back-to-back non-overlapping slots', () => {
      // Slot 1: 10:00 - 11:00, Slot 2: 11:00 - 12:00
      const slot1 = { start: '2026-11-20T10:00:00Z', end: '2026-11-20T11:00:00Z' };
      const slotAdjacent = { start: '2026-11-20T11:00:00Z', end: '2026-11-20T12:00:00Z' };

      expect(isTimeOverlapping(slot1, slotAdjacent)).toBe(false);
      expect(isTimeOverlapping(slotAdjacent, slot1)).toBe(false);
    });

    it('should return false for disjoint separated slots', () => {
      const slot1 = { start: '2026-11-20T10:00:00Z', end: '2026-11-20T11:00:00Z' };
      const slotLater = { start: '2026-11-20T14:00:00Z', end: '2026-11-20T15:00:00Z' };

      expect(isTimeOverlapping(slot1, slotLater)).toBe(false);
    });
  });

  describe('4. Virtual Meeting Link Generation', () => {
    it('should generate valid Google Meet URLs matching the 3-4-3 format', () => {
      const meetDetails = generateMeetingLink('GOOGLE_MEET');

      expect(meetDetails.platform).toBe('GOOGLE_MEET');
      expect(meetDetails.joinUrl).toMatch(/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/);
      expect(meetDetails.meetingId).toMatch(/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/);
    });

    it('should respect custom Google Meet codes if valid', () => {
      const customCode = 'abc-defg-hij';
      const url = generateGoogleMeetUrl(customCode);

      expect(url).toBe('https://meet.google.com/abc-defg-hij');
    });

    it('should generate valid Zoom meeting details with meetingId and passcode', () => {
      const zoom = generateZoomMeeting();

      expect(zoom.platform).toBe('ZOOM');
      expect(zoom.joinUrl).toMatch(/^https:\/\/zoom\.us\/j\/\d{10,11}\?pwd=[a-f0-9]{6}$/);
      expect(zoom.meetingId).toBeDefined();
      expect(zoom.passcode).toBeDefined();
    });

    it('should generate valid Cisco Webex meeting details', () => {
      const webex = generateWebexMeeting({ siteName: 'acme-corp' });

      expect(webex.platform).toBe('WEBEX');
      expect(webex.joinUrl).toMatch(/^https:\/\/acme-corp\.webex\.com\/meet\/pr\d{9}$/);
    });

    it('should handle IN_PERSON and CUSTOM meeting locations gracefully', () => {
      const inPerson = generateMeetingLink('IN_PERSON', {
        customUrlOrLocation: 'Building 4, Room 302',
      });
      expect(inPerson.platform).toBe('IN_PERSON');
      expect(inPerson.joinUrl).toBe('Building 4, Room 302');

      const custom = generateMeetingLink('CUSTOM', {
        customUrlOrLocation: 'https://teams.microsoft.com/l/meetup-join/12345',
      });
      expect(custom.platform).toBe('CUSTOM');
      expect(custom.joinUrl).toBe('https://teams.microsoft.com/l/meetup-join/12345');
    });
  });
});
