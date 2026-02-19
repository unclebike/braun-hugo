/**
 * Twilio SMS service for Cloudflare Workers.
 * Uses fetch-based REST API calls (no Node SDK needed).
 *
 * Twilio credentials are stored in the settings table (key: 'twilio_config')
 * as JSON: { accountSid, authToken, phoneNumber, enabled }
 *
 * All phone numbers stored/compared in E.164 format: +1XXXXXXXXXX
 */
export interface TwilioConfig {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
    enabled: boolean;
}
export interface SendSmsResult {
    success: boolean;
    twilioSid?: string;
    error?: string;
    errorCode?: string;
}
export interface TwilioWebhookBody {
    MessageSid: string;
    AccountSid: string;
    From: string;
    To: string;
    Body: string;
    NumSegments: string;
    NumMedia: string;
    MessageStatus?: string;
    ErrorCode?: string;
    ErrorMessage?: string;
    SmsStatus?: string;
}
export interface TemplateVars {
    first_name?: string;
    last_name?: string;
    service_name?: string;
    date?: string;
    time?: string;
    provider_name?: string;
    total?: string;
    [key: string]: string | undefined;
}
export declare function getTwilioConfig(db: D1Database): Promise<TwilioConfig | null>;
export declare function isTwilioEnabled(db: D1Database): Promise<boolean>;
/**
 * Normalize a phone number to E.164 format (+1XXXXXXXXXX) for North America.
 * Strips all non-digit characters, handles common formats:
 *   (613) 555-1234 → +16135551234
 *   613-555-1234   → +16135551234
 *   1-613-555-1234 → +16135551234
 *   +16135551234   → +16135551234
 *   6135551234     → +16135551234
 *
 * Returns null if the number can't be normalized to a valid NANP number.
 */
export declare function normalizePhoneE164(raw: string | null | undefined): string | null;
/**
 * Validate that a string is a valid E.164 phone number (North America).
 */
export declare function isValidE164(phone: string): boolean;
/**
 * Render a template string with {{variable}} substitution.
 * Unknown variables are replaced with empty string.
 */
export declare function renderTemplate(template: string, vars: TemplateVars): string;
/**
 * Count SMS segments. GSM-7 = 160 chars/segment, UCS-2 = 70 chars/segment.
 * Multipart: GSM-7 = 153 chars/segment, UCS-2 = 67 chars/segment.
 */
export declare function countSegments(text: string): number;
/**
 * Send an SMS via Twilio REST API.
 * Returns the Twilio MessageSid on success.
 */
export declare function sendSms(config: TwilioConfig, to: string, body: string, statusCallbackUrl?: string): Promise<SendSmsResult>;
export interface SmsLogEntry {
    id?: string;
    customerId?: string | null;
    jobId?: string | null;
    messageId?: string | null;
    direction: 'outbound' | 'inbound';
    phoneTo: string;
    phoneFrom: string;
    body: string;
    templateEvent?: string | null;
    twilioSid?: string | null;
    status: string;
    errorCode?: string | null;
    errorMessage?: string | null;
    segments?: number;
}
export interface EnsureSmsInboxMessageParams {
    db: D1Database;
    phoneE164: string;
    customerId?: string | null;
    jobId?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
}
export declare function ensureSmsInboxMessage(params: EnsureSmsInboxMessageParams): Promise<string>;
export declare function touchSmsInboxMessage(db: D1Database, messageId: string, previewText: string): Promise<void>;
export declare function logSms(db: D1Database, entry: SmsLogEntry): Promise<string>;
export declare function updateSmsStatus(db: D1Database, twilioSid: string, status: string, errorCode?: string, errorMessage?: string): Promise<void>;
/**
 * Validate that an incoming webhook request is actually from Twilio.
 * Uses HMAC-SHA1 signature verification with auth token as key.
 *
 * For Cloudflare Workers: uses Web Crypto API (no node:crypto).
 *
 * @param authToken - Twilio auth token (HMAC key)
 * @param signature - Value of X-Twilio-Signature header
 * @param url - The full URL Twilio is hitting (must match exactly what Twilio has configured)
 * @param params - The POST body parameters as key-value pairs
 */
export declare function validateTwilioSignature(authToken: string, signature: string, url: string, params: Record<string, string>): Promise<boolean>;
/**
 * Check if current time is within quiet hours (9pm - 9am Eastern).
 * Returns true if it's currently quiet hours and SMS should be deferred.
 */
export declare function isQuietHours(): boolean;
export interface CustomerSmsStatus {
    hasConsent: boolean;
    isOptedOut: boolean;
    phoneE164: string | null;
}
export declare function getCustomerSmsStatus(db: D1Database, customerId: string): Promise<CustomerSmsStatus>;
/**
 * Check if we're allowed to send an automated SMS to this customer.
 * Requires: consent given, not opted out, valid phone.
 */
export declare function canSendAutomatedSms(status: CustomerSmsStatus): boolean;
export interface SendJobSmsParams {
    db: D1Database;
    jobId: string;
    customerId: string;
    eventType: string;
    vars: TemplateVars;
    statusCallbackUrl?: string;
    messageId?: string | null;
    skipConsentCheck?: boolean;
    skipQuietHours?: boolean;
}
/**
 * High-level function to send a templated SMS for a job event.
 * Handles: config check, consent check, quiet hours, template lookup, send, and logging.
 * Returns the sms_log id on success, or null if skipped/failed.
 */
export declare function sendJobSms(params: SendJobSmsParams): Promise<string | null>;
export interface SendDirectSmsParams {
    db: D1Database;
    to: string;
    body: string;
    customerId?: string;
    jobId?: string;
    messageId?: string;
    statusCallbackUrl?: string;
}
/**
 * Send a direct SMS (admin reply). Bypasses template system and consent check.
 * Still requires Twilio to be configured and enabled.
 */
export declare function sendDirectSms(params: SendDirectSmsParams): Promise<{
    logId: string;
    success: boolean;
    error?: string;
}>;
//# sourceMappingURL=twilio.d.ts.map