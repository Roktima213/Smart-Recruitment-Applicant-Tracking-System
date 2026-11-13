import crypto from 'crypto';

export type MeetingPlatform = 'GOOGLE_MEET' | 'ZOOM' | 'WEBEX' | 'CUSTOM' | 'IN_PERSON';

export interface MeetingDetails {
  platform: MeetingPlatform;
  joinUrl: string;
  meetingId?: string;
  passcode?: string;
  dialIn?: string;
  metadata?: Record<string, unknown>;
}

export interface TimeSlotWindow {
  scheduledStart: Date;
  scheduledEnd: Date;
  scheduledStartIso: string;
  scheduledEndIso: string;
  durationMinutes: number;
}

export interface GenerateMeetingOptions {
  customUrlOrLocation?: string;
  title?: string;
  customId?: string;
  passcode?: string;
  webexSite?: string;
}

export class MeetingService {
  /**
   * Normalizes any valid date representation (ISO string, epoch ms, or Date object)
   * into a standardized UTC Date object.
   *
   * @param input Raw date input with or without timezone offset.
   * @returns JavaScript Date instance representing the UTC timestamp.
   * @throws Error if the date input is invalid or unparseable.
   */
  public normalizeToUtc(input: string | number | Date): Date {
    if (input === null || input === undefined || input === '') {
      throw new Error('Date input cannot be empty or undefined');
    }

    const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);

    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date input provided: "${String(input)}"`);
    }

    return date;
  }

  /**
   * Normalizes date input to an ISO 8601 UTC string format (e.g. "2026-11-20T10:00:00.000Z").
   */
  public normalizeToUtcIso(input: string | number | Date): string {
    return this.normalizeToUtc(input).toISOString();
  }

  /**
   * Validates and normalizes an interview scheduling time slot window.
   * Ensures that scheduled_end is strictly greater than scheduled_start.
   *
   * @param startInput Scheduled start timestamp.
   * @param endInput Scheduled end timestamp.
   * @returns Standardized TimeSlotWindow object with UTC dates, ISO strings, and duration in minutes.
   */
  public validateAndNormalizeTimeWindow(
    startInput: string | number | Date,
    endInput: string | number | Date
  ): TimeSlotWindow {
    const scheduledStart = this.normalizeToUtc(startInput);
    const scheduledEnd = this.normalizeToUtc(endInput);

    if (scheduledEnd.getTime() <= scheduledStart.getTime()) {
      throw new Error(
        `Invalid interview time window: scheduled_end (${scheduledEnd.toISOString()}) must be strictly after scheduled_start (${scheduledStart.toISOString()})`
      );
    }

    const durationMs = scheduledEnd.getTime() - scheduledStart.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));

    return {
      scheduledStart,
      scheduledEnd,
      scheduledStartIso: scheduledStart.toISOString(),
      scheduledEndIso: scheduledEnd.toISOString(),
      durationMinutes,
    };
  }

  /**
   * Checks whether two scheduling intervals overlap in time.
   * Standard interval overlap condition: max(startA, startB) < min(endA, endB)
   */
  public isTimeOverlapping(
    slotA: { start: Date | string | number; end: Date | string | number },
    slotB: { start: Date | string | number; end: Date | string | number }
  ): boolean {
    const startA = this.normalizeToUtc(slotA.start).getTime();
    const endA = this.normalizeToUtc(slotA.end).getTime();
    const startB = this.normalizeToUtc(slotB.start).getTime();
    const endB = this.normalizeToUtc(slotB.end).getTime();

    return Math.max(startA, startB) < Math.min(endA, endB);
  }

  /**
   * Generates a realistic Google Meet URL in the standard 3-4-3 format (e.g. https://meet.google.com/abc-defg-hij).
   */
  public generateGoogleMeetUrl(customCode?: string): string {
    if (customCode && /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i.test(customCode.trim())) {
      return `https://meet.google.com/${customCode.trim().toLowerCase()}`;
    }

    const generateRandomSegment = (len: number): string => {
      const chars = 'abcdefghijklmnopqrstuvwxyz';
      const bytes = crypto.randomBytes(len);
      let res = '';
      for (let i = 0; i < len; i++) {
        res += chars[bytes[i] % chars.length];
      }
      return res;
    };

    const part1 = generateRandomSegment(3);
    const part2 = generateRandomSegment(4);
    const part3 = generateRandomSegment(3);

    return `https://meet.google.com/${part1}-${part2}-${part3}`;
  }

  /**
   * Generates Zoom meeting details including join URL, meeting ID, and passcode.
   */
  public generateZoomMeeting(options?: { customId?: string; passcode?: string }): MeetingDetails {
    // Zoom meeting IDs are typically 10 to 11 digits
    const meetingId =
      options?.customId ||
      String(Math.floor(10000000000 + Math.random() * 90000000000)).slice(0, 11);

    const passcode = options?.passcode || crypto.randomBytes(4).toString('hex').slice(0, 6);
    const joinUrl = `https://zoom.us/j/${meetingId}?pwd=${passcode}`;

    return {
      platform: 'ZOOM',
      joinUrl,
      meetingId,
      passcode,
      metadata: {
        dialIn: '+1 646 558 8656',
      },
    };
  }

  /**
   * Generates Cisco Webex meeting details.
   */
  public generateWebexMeeting(options?: { siteName?: string; meetingNumber?: string }): MeetingDetails {
    const site = options?.siteName || 'company';
    const meetingNumber =
      options?.meetingNumber ||
      String(Math.floor(100000000 + Math.random() * 900000000)).slice(0, 9);
    const joinUrl = `https://${site}.webex.com/meet/pr${meetingNumber}`;

    return {
      platform: 'WEBEX',
      joinUrl,
      meetingId: meetingNumber,
      metadata: {
        site,
      },
    };
  }

  /**
   * Universal virtual meeting link and room generator supporting
   * Google Meet, Zoom, Webex, and Custom/In-Person locations.
   */
  public generateMeetingLink(
    platform: MeetingPlatform = 'GOOGLE_MEET',
    options?: GenerateMeetingOptions
  ): MeetingDetails {
    switch (platform) {
      case 'GOOGLE_MEET': {
        const url = this.generateGoogleMeetUrl(options?.customId);
        const code = url.split('/').pop() || '';
        return {
          platform: 'GOOGLE_MEET',
          joinUrl: url,
          meetingId: code,
        };
      }

      case 'ZOOM': {
        return this.generateZoomMeeting({
          customId: options?.customId,
          passcode: options?.passcode,
        });
      }

      case 'WEBEX': {
        return this.generateWebexMeeting({
          siteName: options?.webexSite,
          meetingNumber: options?.customId,
        });
      }

      case 'IN_PERSON': {
        const location = options?.customUrlOrLocation?.trim() || 'Headquarters - Conference Room A';
        return {
          platform: 'IN_PERSON',
          joinUrl: location,
          metadata: { location },
        };
      }

      case 'CUSTOM':
      default: {
        const customUrl =
          options?.customUrlOrLocation?.trim() ||
          this.generateGoogleMeetUrl(options?.customId);
        return {
          platform: 'CUSTOM',
          joinUrl: customUrl,
        };
      }
    }
  }
}

export const meetingService = new MeetingService();

// Standalone functional exports
export const normalizeToUtc = (input: string | number | Date): Date =>
  meetingService.normalizeToUtc(input);

export const normalizeToUtcIso = (input: string | number | Date): string =>
  meetingService.normalizeToUtcIso(input);

export const validateAndNormalizeTimeWindow = (
  startInput: string | number | Date,
  endInput: string | number | Date
): TimeSlotWindow => meetingService.validateAndNormalizeTimeWindow(startInput, endInput);

export const isTimeOverlapping = (
  slotA: { start: Date | string | number; end: Date | string | number },
  slotB: { start: Date | string | number; end: Date | string | number }
): boolean => meetingService.isTimeOverlapping(slotA, slotB);

export const generateMeetingLink = (
  platform: MeetingPlatform = 'GOOGLE_MEET',
  options?: GenerateMeetingOptions
): MeetingDetails => meetingService.generateMeetingLink(platform, options);

export const generateGoogleMeetUrl = (customCode?: string): string =>
  meetingService.generateGoogleMeetUrl(customCode);

export const generateZoomMeeting = (options?: { customId?: string; passcode?: string }): MeetingDetails =>
  meetingService.generateZoomMeeting(options);

export const generateWebexMeeting = (options?: {
  siteName?: string;
  meetingNumber?: string;
}): MeetingDetails => meetingService.generateWebexMeeting(options);

export default meetingService;
