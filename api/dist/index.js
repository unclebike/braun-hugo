var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __template = (cooked, raw2) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw2 || cooked.slice()) }));

// src/services/twilio.ts
var twilio_exports = {};
__export(twilio_exports, {
  canSendAutomatedSms: () => canSendAutomatedSms,
  countSegments: () => countSegments,
  ensureSmsInboxMessage: () => ensureSmsInboxMessage,
  getCustomerSmsStatus: () => getCustomerSmsStatus,
  getTwilioConfig: () => getTwilioConfig,
  isQuietHours: () => isQuietHours,
  isTwilioEnabled: () => isTwilioEnabled,
  isValidE164: () => isValidE164,
  logSms: () => logSms,
  normalizePhoneE164: () => normalizePhoneE164,
  renderTemplate: () => renderTemplate,
  sendDirectSms: () => sendDirectSms,
  sendJobSms: () => sendJobSms,
  sendSms: () => sendSms,
  touchSmsInboxMessage: () => touchSmsInboxMessage,
  updateSmsStatus: () => updateSmsStatus,
  validateTwilioSignature: () => validateTwilioSignature
});
async function getTwilioConfig(db) {
  try {
    const row = await db.prepare("SELECT value FROM settings WHERE key = 'twilio_config'").first();
    if (!row) return null;
    const config = JSON.parse(row.value);
    if (!config.accountSid || !config.authToken || !config.phoneNumber) return null;
    return config;
  } catch {
    return null;
  }
}
async function isTwilioEnabled(db) {
  const config = await getTwilioConfig(db);
  return !!config?.enabled;
}
function normalizePhoneE164(raw2) {
  if (!raw2) return null;
  const stripped = raw2.replace(/[^\d+]/g, "");
  const digits = stripped.replace(/\+/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (stripped.startsWith("+1") && digits.length === 11) {
    return `+${digits}`;
  }
  return null;
}
function isValidE164(phone) {
  return /^\+1\d{10}$/.test(phone);
}
function renderTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return vars[key] ?? "";
  });
}
function countSegments(text) {
  const isGsm7 = /^[\x20-\x7e\r\n]*$/.test(text);
  const charLimit = isGsm7 ? 160 : 70;
  const multipartLimit = isGsm7 ? 153 : 67;
  if (text.length <= charLimit) return 1;
  return Math.ceil(text.length / multipartLimit);
}
async function sendSms(config, to, body, statusCallbackUrl) {
  if (!config.enabled) {
    return { success: false, error: "Twilio is not enabled" };
  }
  if (!isValidE164(to)) {
    return { success: false, error: `Invalid phone number: ${to}` };
  }
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
  const params = new URLSearchParams({
    To: to,
    From: config.phoneNumber,
    Body: body
  });
  if (statusCallbackUrl) {
    params.set("StatusCallback", statusCallbackUrl);
  }
  const token = btoa(`${config.accountSid}:${config.authToken}`);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${token}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params
    });
    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: result.message || `HTTP ${response.status}`,
        errorCode: String(result.code || "")
      };
    }
    return {
      success: true,
      twilioSid: result.sid
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error sending SMS"
    };
  }
}
async function ensureSmsInboxMessage(params) {
  const { db, phoneE164, customerId, jobId, firstName, lastName, email } = params;
  const existingByJob = jobId ? await db.prepare(
    `SELECT id FROM messages
       WHERE source = 'sms'
         AND json_extract(metadata, '$.job_id') = ?
       ORDER BY updated_at DESC
       LIMIT 1`
  ).bind(jobId).first() : null;
  if (existingByJob?.id) return existingByJob.id;
  const existingByPhone = await db.prepare(
    `SELECT id, json_extract(metadata, '$.job_id') as existing_job_id
     FROM messages
     WHERE source = 'sms' AND phone = ?
     ORDER BY updated_at DESC
     LIMIT 1`
  ).bind(phoneE164).first();
  if (existingByPhone?.id) {
    const existingJobId = existingByPhone.existing_job_id || null;
    const canReuseByPhone = jobId && existingJobId === jobId || !jobId && !existingJobId;
    if (!canReuseByPhone) {
      const id2 = crypto.randomUUID();
      await db.prepare(
        `INSERT INTO messages
         (id, source, status, first_name, last_name, email, phone, reason, subject, body, metadata, is_read, created_at, updated_at)
         VALUES (?, 'sms', 'new', ?, ?, ?, ?, 'sms', ?, ?, ?, 0, datetime('now'), datetime('now'))`
      ).bind(
        id2,
        firstName || null,
        lastName || null,
        email || null,
        phoneE164,
        `SMS thread - ${phoneE164}`,
        "",
        JSON.stringify({ type: "sms_thread", phone_e164: phoneE164, customer_id: customerId || null, job_id: jobId || null })
      ).run();
      return id2;
    }
    await db.prepare(
      `UPDATE messages
       SET metadata = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      JSON.stringify({ type: "sms_thread", phone_e164: phoneE164, customer_id: customerId || null, job_id: jobId || null }),
      existingByPhone.id
    ).run();
    return existingByPhone.id;
  }
  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO messages
     (id, source, status, first_name, last_name, email, phone, reason, subject, body, metadata, is_read, created_at, updated_at)
     VALUES (?, 'sms', 'new', ?, ?, ?, ?, 'sms', ?, ?, ?, 0, datetime('now'), datetime('now'))`
  ).bind(
    id,
    firstName || null,
    lastName || null,
    email || null,
    phoneE164,
    `SMS thread - ${phoneE164}`,
    "",
    JSON.stringify({ type: "sms_thread", phone_e164: phoneE164, customer_id: customerId || null, job_id: jobId || null })
  ).run();
  return id;
}
async function touchSmsInboxMessage(db, messageId, previewText) {
  await db.prepare(
    `UPDATE messages
     SET status = 'new',
         is_read = 0,
         read_at = NULL,
         body = ?,
         updated_at = datetime('now')
     WHERE id = ?`
  ).bind(previewText, messageId).run();
}
async function logSms(db, entry) {
  const id = entry.id || crypto.randomUUID();
  await db.prepare(
    `INSERT INTO sms_log
     (id, customer_id, job_id, message_id, direction, phone_to, phone_from, body, template_event, twilio_sid, status, error_code, error_message, segments, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).bind(
    id,
    entry.customerId || null,
    entry.jobId || null,
    entry.messageId || null,
    entry.direction,
    entry.phoneTo,
    entry.phoneFrom,
    entry.body,
    entry.templateEvent || null,
    entry.twilioSid || null,
    entry.status,
    entry.errorCode || null,
    entry.errorMessage || null,
    entry.segments || 1
  ).run();
  return id;
}
async function updateSmsStatus(db, twilioSid, status, errorCode, errorMessage) {
  await db.prepare(
    `UPDATE sms_log SET status = ?, error_code = ?, error_message = ?, updated_at = datetime('now') WHERE twilio_sid = ?`
  ).bind(status, errorCode || null, errorMessage || null, twilioSid).run();
}
async function validateTwilioSignature(authToken, signature, url, params) {
  let data = url;
  const sortedKeys = Object.keys(params).sort();
  for (const key2 of sortedKeys) {
    data += key2 + params[key2];
  }
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
  return computedSignature === signature;
}
function isQuietHours() {
  const now = /* @__PURE__ */ new Date();
  const eastern = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" }));
  const hour = eastern.getHours();
  return hour < 9 || hour >= 21;
}
async function getCustomerSmsStatus(db, customerId) {
  const row = await db.prepare(
    "SELECT sms_consent, sms_opted_out, phone_e164 FROM customers WHERE id = ?"
  ).bind(customerId).first();
  if (!row) {
    return { hasConsent: false, isOptedOut: false, phoneE164: null };
  }
  return {
    hasConsent: row.sms_consent === 1,
    isOptedOut: row.sms_opted_out === 1,
    phoneE164: row.phone_e164
  };
}
function canSendAutomatedSms(status) {
  return status.hasConsent && !status.isOptedOut && !!status.phoneE164;
}
async function sendJobSms(params) {
  const { db, jobId, customerId, eventType, vars, statusCallbackUrl, messageId, skipConsentCheck, skipQuietHours } = params;
  const config = await getTwilioConfig(db);
  if (!config?.enabled) {
    console.log(`[sms] Twilio not configured/enabled, skipping ${eventType}`);
    return null;
  }
  if (!skipConsentCheck) {
    const smsStatus = await getCustomerSmsStatus(db, customerId);
    if (!canSendAutomatedSms(smsStatus)) {
      console.log(`[sms] Customer ${customerId} not eligible for SMS (consent=${smsStatus.hasConsent}, optedOut=${smsStatus.isOptedOut}, phone=${smsStatus.phoneE164})`);
      return null;
    }
  }
  if (!skipQuietHours && isQuietHours()) {
    console.log(`[sms] Quiet hours active, skipping ${eventType} for job ${jobId}`);
    return null;
  }
  const template = await db.prepare(
    "SELECT body_template, is_active FROM sms_templates WHERE event_type = ?"
  ).bind(eventType).first();
  if (!template || !template.is_active) {
    console.log(`[sms] Template ${eventType} not found or disabled`);
    return null;
  }
  const customer = await db.prepare(
    "SELECT phone_e164, phone FROM customers WHERE id = ?"
  ).bind(customerId).first();
  const phoneTo = customer?.phone_e164 || normalizePhoneE164(customer?.phone);
  if (!phoneTo) {
    console.log(`[sms] No valid phone for customer ${customerId}`);
    return null;
  }
  const body = renderTemplate(template.body_template, vars);
  const segments = countSegments(body);
  const result = await sendSms(config, phoneTo, body, statusCallbackUrl);
  const logId = await logSms(db, {
    customerId,
    jobId,
    messageId: messageId || null,
    direction: "outbound",
    phoneTo,
    phoneFrom: config.phoneNumber,
    body,
    templateEvent: eventType,
    twilioSid: result.twilioSid || null,
    status: result.success ? "sent" : "failed",
    errorCode: result.errorCode || null,
    errorMessage: result.error || null,
    segments
  });
  if (!result.success) {
    console.error(`[sms] Failed to send ${eventType} for job ${jobId}: ${result.error}`);
  }
  return logId;
}
async function sendDirectSms(params) {
  const { db, to, body, customerId, jobId, messageId, statusCallbackUrl } = params;
  const config = await getTwilioConfig(db);
  if (!config?.enabled) {
    return { logId: "", success: false, error: "Twilio is not configured or enabled" };
  }
  const result = await sendSms(config, to, body, statusCallbackUrl);
  const segments = countSegments(body);
  const logId = await logSms(db, {
    customerId: customerId || null,
    jobId: jobId || null,
    messageId: messageId || null,
    direction: "outbound",
    phoneTo: to,
    phoneFrom: config.phoneNumber,
    body,
    twilioSid: result.twilioSid || null,
    status: result.success ? "sent" : "failed",
    errorCode: result.errorCode || null,
    errorMessage: result.error || null,
    segments
  });
  return { logId, success: result.success, error: result.error };
}
var init_twilio = __esm({
  "src/services/twilio.ts"() {
    "use strict";
    __name(getTwilioConfig, "getTwilioConfig");
    __name(isTwilioEnabled, "isTwilioEnabled");
    __name(normalizePhoneE164, "normalizePhoneE164");
    __name(isValidE164, "isValidE164");
    __name(renderTemplate, "renderTemplate");
    __name(countSegments, "countSegments");
    __name(sendSms, "sendSms");
    __name(ensureSmsInboxMessage, "ensureSmsInboxMessage");
    __name(touchSmsInboxMessage, "touchSmsInboxMessage");
    __name(logSms, "logSms");
    __name(updateSmsStatus, "updateSmsStatus");
    __name(validateTwilioSignature, "validateTwilioSignature");
    __name(isQuietHours, "isQuietHours");
    __name(getCustomerSmsStatus, "getCustomerSmsStatus");
    __name(canSendAutomatedSms, "canSendAutomatedSms");
    __name(sendJobSms, "sendJobSms");
    __name(sendDirectSms, "sendDirectSms");
  }
});

// node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/http-exception.js
var HTTPException = class extends Error {
  static {
    __name(this, "HTTPException");
  }
  res;
  status;
  /**
   * Creates an instance of `HTTPException`.
   * @param status - HTTP status code for the exception. Defaults to 500.
   * @param options - Additional options for the exception.
   */
  constructor(status = 500, options) {
    super(options?.message, { cause: options?.cause });
    this.res = options?.res;
    this.status = status;
  }
  /**
   * Returns the response object associated with the exception.
   * If a response object is not provided, a new response is created with the error message and status code.
   * @returns The response object.
   */
  getResponse() {
    if (this.res) {
      const newResponse = new Response(this.res.body, {
        status: this.status,
        headers: this.res.headers
      });
      return newResponse;
    }
    return new Response(this.message, {
      status: this.status
    });
  }
};

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/body.js
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form3 = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form3[key] = value;
    } else {
      handleParsingAllValues(form3, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form3).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form3, key, value);
        delete form3[key];
      }
    });
  }
  return form3;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form3, key, value) => {
  if (form3[key] !== void 0) {
    if (Array.isArray(form3[key])) {
      ;
      form3[key].push(value);
    } else {
      form3[key] = [form3[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form3[key] = value;
    } else {
      form3[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form3, key, value) => {
  let nestedForm = form3;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var escapeRe = /[&<>'"]/;
var stringBufferToString = /* @__PURE__ */ __name(async (buffer, callbacks) => {
  let str = "";
  callbacks ||= [];
  const resolvedBuffer = await Promise.all(buffer);
  for (let i = resolvedBuffer.length - 1; ; i--) {
    str += resolvedBuffer[i];
    i--;
    if (i < 0) {
      break;
    }
    let r = resolvedBuffer[i];
    if (typeof r === "object") {
      callbacks.push(...r.callbacks || []);
    }
    const isEscaped = r.isEscaped;
    r = await (typeof r === "object" ? r.toString() : r);
    if (typeof r === "object") {
      callbacks.push(...r.callbacks || []);
    }
    if (r.isEscaped ?? isEscaped) {
      str += r;
    } else {
      const buf = [str];
      escapeToBuffer(r, buf);
      str = buf[0];
    }
  }
  return raw(str, callbacks);
}, "stringBufferToString");
var escapeToBuffer = /* @__PURE__ */ __name((str, buffer) => {
  const match2 = str.search(escapeRe);
  if (match2 === -1) {
    buffer[0] += str;
    return;
  }
  let escape;
  let index;
  let lastIndex = 0;
  for (index = match2; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 34:
        escape = "&quot;";
        break;
      case 39:
        escape = "&#39;";
        break;
      case 38:
        escape = "&amp;";
        break;
      case 60:
        escape = "&lt;";
        break;
      case 62:
        escape = "&gt;";
        break;
      default:
        continue;
    }
    buffer[0] += str.substring(lastIndex, index) + escape;
    lastIndex = index + 1;
  }
  buffer[0] += str.substring(lastIndex, index);
}, "escapeToBuffer");
var resolveCallbackSync = /* @__PURE__ */ __name((str) => {
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return str;
  }
  const buffer = [str];
  const context = {};
  callbacks.forEach((c) => c({ phase: HtmlEscapedCallbackPhase.Stringify, buffer, context }));
  return buffer[0];
}, "resolveCallbackSync");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= new Response(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = new Response(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = new Response(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return new Response(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html2, arg, headers) => {
    const res = /* @__PURE__ */ __name((html22) => this.#newResponse(html22, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html2 === "object" ? resolveCallback(html2, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html2);
  }, "html");
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => new Response();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class _Hono {
  static {
    __name(this, "_Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app20) {
    const subApp = this.basePath(path);
    app20.routes.map((r) => {
      let handler;
      if (app20.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app20.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = /* @__PURE__ */ __name((input3, requestInit, Env, executionCtx) => {
    if (input3 instanceof Request) {
      return this.fetch(requestInit ? new Request(input3, requestInit) : input3, Env, executionCtx);
    }
    input3 = input3.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input3) ? input3 : `http://localhost${mergePath("/", input3)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class _Node {
  static {
    __name(this, "_Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node2 = class _Node2 {
  static {
    __name(this, "_Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #getHandlerSets(node, method, nodeParams, params) {
    const handlerSets = [];
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
    return handlerSets;
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              handlerSets.push(
                ...this.#getHandlerSets(nextNode.#children["*"], method, node.#params)
              );
            }
            handlerSets.push(...this.#getHandlerSets(nextNode, method, node.#params));
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              handlerSets.push(...this.#getHandlerSets(astNode, method, node.#params));
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          const restPathString = parts.slice(i).join("/");
          if (matcher instanceof RegExp) {
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              handlerSets.push(...this.#getHandlerSets(child, method, node.#params, params));
              if (Object.keys(child.#children).length) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              handlerSets.push(...this.#getHandlerSets(child, method, params, node.#params));
              if (child.#children["*"]) {
                handlerSets.push(
                  ...this.#getHandlerSets(child.#children["*"], method, params, node.#params)
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      curNodes = tempNodes.concat(curNodesQueue.shift() ?? []);
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name((options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2");
}, "cors");

// node_modules/hono/dist/helper/factory/index.js
var createMiddleware = /* @__PURE__ */ __name((middleware) => middleware, "createMiddleware");

// src/middleware/auth.ts
var PUBLIC_PATHS = [
  "/health",
  // Public static assets served via the ASSETS binding.
  // Keep both forms to be resilient to any path matching quirks.
  "/fonts",
  "/fonts/",
  "/images",
  "/images/",
  "/v1/scheduling/service_area_check",
  "/v1/scheduling/timeslots",
  "/v1/services",
  "/v1/coupons/validate",
  "/v1/bookings/create",
  "/v1/messages/submit",
  "/webhooks/twilio",
  "/webhooks/twilio/",
  "/widget",
  "/widget/"
];
function isPublicPath(path) {
  return PUBLIC_PATHS.some((publicPath) => {
    if (path === publicPath) return true;
    const prefix = publicPath.endsWith("/") ? publicPath.slice(0, -1) : publicPath;
    return path.startsWith(`${prefix}/`);
  });
}
__name(isPublicPath, "isPublicPath");
async function verifyApiKey(db, key) {
  if (!key || key.length < 10) return false;
  const prefix = key.substring(0, 8);
  const result = await db.prepare(
    "SELECT key_hash FROM api_keys WHERE key_prefix = ? AND is_active = 1"
  ).bind(prefix).first();
  if (!result) return false;
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  const isValid2 = hashHex === result.key_hash;
  if (isValid2) {
    await db.prepare(
      'UPDATE api_keys SET last_used_at = datetime("now") WHERE key_prefix = ?'
    ).bind(prefix).run();
  }
  return isValid2;
}
__name(verifyApiKey, "verifyApiKey");
function base64UrlDecode(str) {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
__name(base64UrlDecode, "base64UrlDecode");
var cachedJwks = null;
var JWKS_CACHE_TTL_MS = 60 * 60 * 1e3;
async function getJwks(teamDomain) {
  if (cachedJwks && Date.now() - cachedJwks.fetchedAt < JWKS_CACHE_TTL_MS) {
    return cachedJwks.keys;
  }
  const certsUrl = `https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`;
  const response = await fetch(certsUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.status}`);
  }
  const jwks = await response.json();
  cachedJwks = { keys: jwks.keys, fetchedAt: Date.now() };
  return jwks.keys;
}
__name(getJwks, "getJwks");
async function importJwk(jwk) {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}
__name(importJwk, "importJwk");
function decodeJwtPayload(part) {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlDecode(part)));
  } catch {
    try {
      return JSON.parse(atob(part));
    } catch {
      return null;
    }
  }
}
__name(decodeJwtPayload, "decodeJwtPayload");
async function verifyCfAccessJwt(token, teamDomain, aud) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const headerJson = decodeJwtPayload(parts[0]);
    const payload = decodeJwtPayload(parts[1]);
    if (!payload) return null;
    if (payload.exp && payload.exp * 1e3 < Date.now()) {
      return null;
    }
    if (aud && payload.aud) {
      const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      if (!audiences.includes(aud)) {
        return null;
      }
    }
    if (teamDomain && headerJson?.kid) {
      try {
        const keys = await getJwks(teamDomain);
        const matchingKey = keys.find((k) => k.kid === headerJson.kid);
        if (matchingKey) {
          const cryptoKey = await importJwk(matchingKey);
          const signatureBytes = base64UrlDecode(parts[2]);
          const dataBytes = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
          const valid = await crypto.subtle.verify(
            "RSASSA-PKCS1-v1_5",
            cryptoKey,
            signatureBytes,
            dataBytes
          );
          if (!valid) return null;
        }
      } catch {
      }
    }
    if (!payload.email || !payload.sub) return null;
    return {
      email: payload.email,
      userId: payload.sub
    };
  } catch {
    return null;
  }
}
__name(verifyCfAccessJwt, "verifyCfAccessJwt");
var authMiddleware = createMiddleware(async (c, next) => {
  const path = c.req.path;
  if (isPublicPath(path)) {
    c.set("auth", { type: "api_key" });
    return next();
  }
  const teamDomain = c.env?.CF_ACCESS_TEAM_DOMAIN || "";
  const accessAud = c.env?.CF_ACCESS_AUD || "";
  const cfAccessToken = c.req.header("CF-Access-JWT-Assertion");
  if (cfAccessToken) {
    const cfUser = await verifyCfAccessJwt(cfAccessToken, teamDomain, accessAud || void 0);
    if (cfUser) {
      c.set("auth", {
        type: "cf_access",
        email: cfUser.email,
        userId: cfUser.userId
      });
      return next();
    }
  }
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const cfUser = await verifyCfAccessJwt(token, teamDomain, accessAud || void 0);
    if (cfUser) {
      c.set("auth", {
        type: "cf_access",
        email: cfUser.email,
        userId: cfUser.userId
      });
      return next();
    }
    const db = c.env.DB;
    const isValidKey = await verifyApiKey(db, token);
    if (isValidKey) {
      c.set("auth", { type: "api_key" });
      return next();
    }
  }
  return c.json({ error: "Unauthorized", message: "Valid authentication required" }, 401);
});

// src/geo/service-area.ts
var EARTH_RADIUS_KM = 6371;
var toRadians = /* @__PURE__ */ __name((value) => value * Math.PI / 180, "toRadians");
var parseJson = /* @__PURE__ */ __name((value) => {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
  }
  return {};
}, "parseJson");
var normalizePostalCode = /* @__PURE__ */ __name((postalCode) => {
  if (!postalCode) return "";
  return postalCode.replace(/\s+/g, "").toUpperCase();
}, "normalizePostalCode");
var firstThree = /* @__PURE__ */ __name((postalCode) => normalizePostalCode(postalCode).slice(0, 3), "firstThree");
var haversineKm = /* @__PURE__ */ __name((lat1, lng1, lat2, lng2) => {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}, "haversineKm");
var toGeofencePoint = /* @__PURE__ */ __name((value) => {
  if (Array.isArray(value) && value.length >= 2) {
    const a = Number(value[0]);
    const b = Number(value[1]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      const absA = Math.abs(a);
      const absB = Math.abs(b);
      if (absA > 90 && absA <= 180 && absB <= 90) {
        return { lat: b, lng: a };
      }
      if (absB > 90 && absB <= 180 && absA <= 90) {
        return { lat: a, lng: b };
      }
      if (a < 0 && b > 0 || a > 0 && b < 0) {
        const lat = a > 0 ? a : b;
        const lng = a < 0 ? a : b;
        if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return { lat, lng };
        }
      }
      return { lat: a, lng: b };
    }
  }
  if (value && typeof value === "object") {
    const candidate = value;
    const lat = Number(candidate.lat);
    const lng = Number(candidate.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }
  return null;
}, "toGeofencePoint");
var pointInPolygon = /* @__PURE__ */ __name((point, polygon) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];
    const intersects = pi.lat > point.lat !== pj.lat > point.lat && point.lng < (pj.lng - pi.lng) * (point.lat - pi.lat) / (pj.lat - pi.lat || Number.EPSILON) + pi.lng;
    if (intersects) inside = !inside;
  }
  return inside;
}, "pointInPolygon");
function checkServiceArea(areaType, areaData, location, _bufferKm = 0) {
  const parsed = parseJson(areaData);
  if (areaType === "zip") {
    const zipPrefixesRaw = parsed.zip_codes ?? parsed.zipCodes;
    const zipPrefixes = Array.isArray(zipPrefixesRaw) ? zipPrefixesRaw.map((z) => firstThree(String(z))).filter(Boolean) : [];
    const locationPrefix = firstThree(location.postalCode);
    if (!locationPrefix || zipPrefixes.length === 0) {
      return { within: false };
    }
    return { within: zipPrefixes.some((prefix) => locationPrefix.startsWith(prefix)) };
  }
  if (areaType === "radius") {
    const radiusData = parsed;
    const centerLat = Number(radiusData.center?.lat);
    const centerLng = Number(radiusData.center?.lng);
    const radiusMiles = Number(radiusData.radius_miles);
    if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng) || !Number.isFinite(radiusMiles)) {
      return { within: false };
    }
    if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) {
      return { within: false };
    }
    const distanceKm = haversineKm(centerLat, centerLng, location.lat, location.lng);
    const radiusKm = radiusMiles * 1.609344;
    return {
      within: distanceKm <= radiusKm,
      distance: distanceKm
    };
  }
  if (areaType === "geofence") {
    const rawPolygon = parsed.polygon;
    const polygon = Array.isArray(rawPolygon) ? rawPolygon.map((p) => toGeofencePoint(p)).filter((p) => p !== null) : [];
    if (polygon.length < 3 || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)) {
      return { within: false };
    }
    return {
      within: pointInPolygon({ lat: location.lat, lng: location.lng }, polygon)
    };
  }
  return { within: false };
}
__name(checkServiceArea, "checkServiceArea");

// src/routes/admin.ts
init_twilio();

// src/utils/line-items.ts
var clampCents = /* @__PURE__ */ __name((value) => Math.round(Number.isFinite(value) ? value : 0), "clampCents");
var parsePriceLines = /* @__PURE__ */ __name((raw2) => {
  if (!raw2) return [];
  try {
    const parsed = JSON.parse(raw2);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => Boolean(entry && typeof entry === "object" && !Array.isArray(entry))).map((entry) => {
      const quantity = typeof entry.quantity === "number" ? entry.quantity : Number.parseFloat(String(entry.quantity || 1)) || 1;
      const unit = typeof entry.unit_price_cents === "number" ? entry.unit_price_cents : Number.parseInt(String(entry.unit_price_cents || 0), 10) || 0;
      const total = typeof entry.total_cents === "number" ? entry.total_cents : Math.round(quantity * unit);
      const kind = entry.kind === "service" || entry.kind === "modifier" || entry.kind === "rule" || entry.kind === "custom" ? entry.kind : "custom";
      return {
        id: typeof entry.id === "string" && entry.id.trim() ? entry.id : crypto.randomUUID(),
        parent_id: typeof entry.parent_id === "string" && entry.parent_id.trim() ? entry.parent_id : null,
        kind,
        description: typeof entry.description === "string" && entry.description.trim() ? entry.description.trim() : "Line item",
        quantity,
        unit_price_cents: clampCents(unit),
        total_cents: clampCents(total),
        is_custom: entry.is_custom ? 1 : 0
      };
    });
  } catch {
    return [];
  }
}, "parsePriceLines");
var subtotalFromLines = /* @__PURE__ */ __name((lines) => lines.reduce((sum, line) => sum + line.total_cents, 0), "subtotalFromLines");
var normalizeLine = /* @__PURE__ */ __name((description, quantity, unitPriceCents, kind, parentId, isCustom) => ({
  id: crypto.randomUUID(),
  parent_id: parentId,
  kind,
  description: description.trim() || "Line item",
  quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
  unit_price_cents: clampCents(unitPriceCents),
  total_cents: clampCents((Number.isFinite(quantity) && quantity > 0 ? quantity : 1) * unitPriceCents),
  is_custom: isCustom ? 1 : 0
}), "normalizeLine");
var buildServiceBaseLine = /* @__PURE__ */ __name((serviceName, unitPriceCents) => normalizeLine(serviceName || "Service", 1, unitPriceCents, "service", null, 0), "buildServiceBaseLine");
var parseEditableText = /* @__PURE__ */ __name((raw2) => {
  const lines = (raw2 || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const parsed = [];
  for (const line of lines) {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length < 3) continue;
    const description = parts[0] || "Line item";
    const quantity = Math.max(0, Number.parseFloat(parts[1]) || 0);
    const unitCents = Math.max(0, Math.round((Number.parseFloat(parts[2].replace(/[$,]/g, "")) || 0) * 100));
    if (!description || quantity <= 0) continue;
    parsed.push(normalizeLine(description, quantity, unitCents, "custom", null, 1));
  }
  return parsed;
}, "parseEditableText");

// node_modules/hono/dist/helper/html/index.js
var html = /* @__PURE__ */ __name((strings, ...values) => {
  const buffer = [""];
  for (let i = 0, len = strings.length - 1; i < len; i++) {
    buffer[0] += strings[i];
    const children = Array.isArray(values[i]) ? values[i].flat(Infinity) : [values[i]];
    for (let i2 = 0, len2 = children.length; i2 < len2; i2++) {
      const child = children[i2];
      if (typeof child === "string") {
        escapeToBuffer(child, buffer);
      } else if (typeof child === "number") {
        ;
        buffer[0] += child;
      } else if (typeof child === "boolean" || child === null || child === void 0) {
        continue;
      } else if (typeof child === "object" && child.isEscaped) {
        if (child.callbacks) {
          buffer.unshift("", child);
        } else {
          const tmp = child.toString();
          if (tmp instanceof Promise) {
            buffer.unshift("", tmp);
          } else {
            buffer[0] += tmp;
          }
        }
      } else if (child instanceof Promise) {
        buffer.unshift("", child);
      } else {
        escapeToBuffer(child.toString(), buffer);
      }
    }
  }
  buffer[0] += strings.at(-1);
  return buffer.length === 1 ? "callbacks" in buffer ? raw(resolveCallbackSync(raw(buffer[0], buffer.callbacks))) : raw(buffer[0]) : stringBufferToString(buffer, buffer.callbacks);
}, "html");

// node_modules/hono/dist/jsx/constants.js
var DOM_RENDERER = /* @__PURE__ */ Symbol("RENDERER");
var DOM_ERROR_HANDLER = /* @__PURE__ */ Symbol("ERROR_HANDLER");
var DOM_STASH = /* @__PURE__ */ Symbol("STASH");
var DOM_INTERNAL_TAG = /* @__PURE__ */ Symbol("INTERNAL");
var DOM_MEMO = /* @__PURE__ */ Symbol("MEMO");
var PERMALINK = /* @__PURE__ */ Symbol("PERMALINK");

// node_modules/hono/dist/jsx/dom/utils.js
var setInternalTagFlag = /* @__PURE__ */ __name((fn) => {
  ;
  fn[DOM_INTERNAL_TAG] = true;
  return fn;
}, "setInternalTagFlag");

// node_modules/hono/dist/jsx/dom/context.js
var createContextProviderFunction = /* @__PURE__ */ __name((values) => ({ value, children }) => {
  if (!children) {
    return void 0;
  }
  const props = {
    children: [
      {
        tag: setInternalTagFlag(() => {
          values.push(value);
        }),
        props: {}
      }
    ]
  };
  if (Array.isArray(children)) {
    props.children.push(...children.flat());
  } else {
    props.children.push(children);
  }
  props.children.push({
    tag: setInternalTagFlag(() => {
      values.pop();
    }),
    props: {}
  });
  const res = { tag: "", props, type: "" };
  res[DOM_ERROR_HANDLER] = (err) => {
    values.pop();
    throw err;
  };
  return res;
}, "createContextProviderFunction");
var createContext = /* @__PURE__ */ __name((defaultValue) => {
  const values = [defaultValue];
  const context = createContextProviderFunction(values);
  context.values = values;
  context.Provider = context;
  globalContexts.push(context);
  return context;
}, "createContext");

// node_modules/hono/dist/jsx/context.js
var globalContexts = [];
var createContext2 = /* @__PURE__ */ __name((defaultValue) => {
  const values = [defaultValue];
  const context = /* @__PURE__ */ __name(((props) => {
    values.push(props.value);
    let string;
    try {
      string = props.children ? (Array.isArray(props.children) ? new JSXFragmentNode("", {}, props.children) : props.children).toString() : "";
    } catch (e) {
      values.pop();
      throw e;
    }
    if (string instanceof Promise) {
      return string.finally(() => values.pop()).then((resString) => raw(resString, resString.callbacks));
    } else {
      values.pop();
      return raw(string);
    }
  }), "context");
  context.values = values;
  context.Provider = context;
  context[DOM_RENDERER] = createContextProviderFunction(values);
  globalContexts.push(context);
  return context;
}, "createContext");
var useContext = /* @__PURE__ */ __name((context) => {
  return context.values.at(-1);
}, "useContext");

// node_modules/hono/dist/jsx/intrinsic-element/common.js
var deDupeKeyMap = {
  title: [],
  script: ["src"],
  style: ["data-href"],
  link: ["href"],
  meta: ["name", "httpEquiv", "charset", "itemProp"]
};
var domRenderers = {};
var dataPrecedenceAttr = "data-precedence";

// node_modules/hono/dist/jsx/intrinsic-element/components.js
var components_exports = {};
__export(components_exports, {
  button: () => button,
  form: () => form,
  input: () => input,
  link: () => link,
  meta: () => meta,
  script: () => script,
  style: () => style,
  title: () => title
});

// node_modules/hono/dist/jsx/children.js
var toArray = /* @__PURE__ */ __name((children) => Array.isArray(children) ? children : [children], "toArray");

// node_modules/hono/dist/jsx/intrinsic-element/components.js
var metaTagMap = /* @__PURE__ */ new WeakMap();
var insertIntoHead = /* @__PURE__ */ __name((tagName, tag, props, precedence) => ({ buffer, context }) => {
  if (!buffer) {
    return;
  }
  const map = metaTagMap.get(context) || {};
  metaTagMap.set(context, map);
  const tags = map[tagName] ||= [];
  let duped = false;
  const deDupeKeys = deDupeKeyMap[tagName];
  if (deDupeKeys.length > 0) {
    LOOP: for (const [, tagProps] of tags) {
      for (const key of deDupeKeys) {
        if ((tagProps?.[key] ?? null) === props?.[key]) {
          duped = true;
          break LOOP;
        }
      }
    }
  }
  if (duped) {
    buffer[0] = buffer[0].replaceAll(tag, "");
  } else if (deDupeKeys.length > 0) {
    tags.push([tag, props, precedence]);
  } else {
    tags.unshift([tag, props, precedence]);
  }
  if (buffer[0].indexOf("</head>") !== -1) {
    let insertTags;
    if (precedence === void 0) {
      insertTags = tags.map(([tag2]) => tag2);
    } else {
      const precedences = [];
      insertTags = tags.map(([tag2, , precedence2]) => {
        let order = precedences.indexOf(precedence2);
        if (order === -1) {
          precedences.push(precedence2);
          order = precedences.length - 1;
        }
        return [tag2, order];
      }).sort((a, b) => a[1] - b[1]).map(([tag2]) => tag2);
    }
    insertTags.forEach((tag2) => {
      buffer[0] = buffer[0].replaceAll(tag2, "");
    });
    buffer[0] = buffer[0].replace(/(?=<\/head>)/, insertTags.join(""));
  }
}, "insertIntoHead");
var returnWithoutSpecialBehavior = /* @__PURE__ */ __name((tag, children, props) => raw(new JSXNode(tag, props, toArray(children ?? [])).toString()), "returnWithoutSpecialBehavior");
var documentMetadataTag = /* @__PURE__ */ __name((tag, children, props, sort) => {
  if ("itemProp" in props) {
    return returnWithoutSpecialBehavior(tag, children, props);
  }
  let { precedence, blocking, ...restProps } = props;
  precedence = sort ? precedence ?? "" : void 0;
  if (sort) {
    restProps[dataPrecedenceAttr] = precedence;
  }
  const string = new JSXNode(tag, restProps, toArray(children || [])).toString();
  if (string instanceof Promise) {
    return string.then(
      (resString) => raw(string, [
        ...resString.callbacks || [],
        insertIntoHead(tag, resString, restProps, precedence)
      ])
    );
  } else {
    return raw(string, [insertIntoHead(tag, string, restProps, precedence)]);
  }
}, "documentMetadataTag");
var title = /* @__PURE__ */ __name(({ children, ...props }) => {
  const nameSpaceContext3 = getNameSpaceContext();
  if (nameSpaceContext3) {
    const context = useContext(nameSpaceContext3);
    if (context === "svg" || context === "head") {
      return new JSXNode(
        "title",
        props,
        toArray(children ?? [])
      );
    }
  }
  return documentMetadataTag("title", children, props, false);
}, "title");
var script = /* @__PURE__ */ __name(({
  children,
  ...props
}) => {
  const nameSpaceContext3 = getNameSpaceContext();
  if (["src", "async"].some((k) => !props[k]) || nameSpaceContext3 && useContext(nameSpaceContext3) === "head") {
    return returnWithoutSpecialBehavior("script", children, props);
  }
  return documentMetadataTag("script", children, props, false);
}, "script");
var style = /* @__PURE__ */ __name(({
  children,
  ...props
}) => {
  if (!["href", "precedence"].every((k) => k in props)) {
    return returnWithoutSpecialBehavior("style", children, props);
  }
  props["data-href"] = props.href;
  delete props.href;
  return documentMetadataTag("style", children, props, true);
}, "style");
var link = /* @__PURE__ */ __name(({ children, ...props }) => {
  if (["onLoad", "onError"].some((k) => k in props) || props.rel === "stylesheet" && (!("precedence" in props) || "disabled" in props)) {
    return returnWithoutSpecialBehavior("link", children, props);
  }
  return documentMetadataTag("link", children, props, "precedence" in props);
}, "link");
var meta = /* @__PURE__ */ __name(({ children, ...props }) => {
  const nameSpaceContext3 = getNameSpaceContext();
  if (nameSpaceContext3 && useContext(nameSpaceContext3) === "head") {
    return returnWithoutSpecialBehavior("meta", children, props);
  }
  return documentMetadataTag("meta", children, props, false);
}, "meta");
var newJSXNode = /* @__PURE__ */ __name((tag, { children, ...props }) => (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new JSXNode(tag, props, toArray(children ?? []))
), "newJSXNode");
var form = /* @__PURE__ */ __name((props) => {
  if (typeof props.action === "function") {
    props.action = PERMALINK in props.action ? props.action[PERMALINK] : void 0;
  }
  return newJSXNode("form", props);
}, "form");
var formActionableElement = /* @__PURE__ */ __name((tag, props) => {
  if (typeof props.formAction === "function") {
    props.formAction = PERMALINK in props.formAction ? props.formAction[PERMALINK] : void 0;
  }
  return newJSXNode(tag, props);
}, "formActionableElement");
var input = /* @__PURE__ */ __name((props) => formActionableElement("input", props), "input");
var button = /* @__PURE__ */ __name((props) => formActionableElement("button", props), "button");

// node_modules/hono/dist/jsx/utils.js
var normalizeElementKeyMap = /* @__PURE__ */ new Map([
  ["className", "class"],
  ["htmlFor", "for"],
  ["crossOrigin", "crossorigin"],
  ["httpEquiv", "http-equiv"],
  ["itemProp", "itemprop"],
  ["fetchPriority", "fetchpriority"],
  ["noModule", "nomodule"],
  ["formAction", "formaction"]
]);
var normalizeIntrinsicElementKey = /* @__PURE__ */ __name((key) => normalizeElementKeyMap.get(key) || key, "normalizeIntrinsicElementKey");
var styleObjectForEach = /* @__PURE__ */ __name((style3, fn) => {
  for (const [k, v] of Object.entries(style3)) {
    const key = k[0] === "-" || !/[A-Z]/.test(k) ? k : k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
    fn(
      key,
      v == null ? null : typeof v === "number" ? !key.match(
        /^(?:a|border-im|column(?:-c|s)|flex(?:$|-[^b])|grid-(?:ar|[^a])|font-w|li|or|sca|st|ta|wido|z)|ty$/
      ) ? `${v}px` : `${v}` : v
    );
  }
}, "styleObjectForEach");

// node_modules/hono/dist/jsx/base.js
var nameSpaceContext = void 0;
var getNameSpaceContext = /* @__PURE__ */ __name(() => nameSpaceContext, "getNameSpaceContext");
var toSVGAttributeName = /* @__PURE__ */ __name((key) => /[A-Z]/.test(key) && // Presentation attributes are findable in style object. "clip-path", "font-size", "stroke-width", etc.
// Or other un-deprecated kebab-case attributes. "overline-position", "paint-order", "strikethrough-position", etc.
key.match(
  /^(?:al|basel|clip(?:Path|Rule)$|co|do|fill|fl|fo|gl|let|lig|i|marker[EMS]|o|pai|pointe|sh|st[or]|text[^L]|tr|u|ve|w)/
) ? key.replace(/([A-Z])/g, "-$1").toLowerCase() : key, "toSVGAttributeName");
var emptyTags = [
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
];
var booleanAttributes = [
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "defer",
  "disabled",
  "download",
  "formnovalidate",
  "hidden",
  "inert",
  "ismap",
  "itemscope",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "selected"
];
var childrenToStringToBuffer = /* @__PURE__ */ __name((children, buffer) => {
  for (let i = 0, len = children.length; i < len; i++) {
    const child = children[i];
    if (typeof child === "string") {
      escapeToBuffer(child, buffer);
    } else if (typeof child === "boolean" || child === null || child === void 0) {
      continue;
    } else if (child instanceof JSXNode) {
      child.toStringToBuffer(buffer);
    } else if (typeof child === "number" || child.isEscaped) {
      ;
      buffer[0] += child;
    } else if (child instanceof Promise) {
      buffer.unshift("", child);
    } else {
      childrenToStringToBuffer(child, buffer);
    }
  }
}, "childrenToStringToBuffer");
var JSXNode = class {
  static {
    __name(this, "JSXNode");
  }
  tag;
  props;
  key;
  children;
  isEscaped = true;
  localContexts;
  constructor(tag, props, children) {
    this.tag = tag;
    this.props = props;
    this.children = children;
  }
  get type() {
    return this.tag;
  }
  // Added for compatibility with libraries that rely on React's internal structure
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get ref() {
    return this.props.ref || null;
  }
  toString() {
    const buffer = [""];
    this.localContexts?.forEach(([context, value]) => {
      context.values.push(value);
    });
    try {
      this.toStringToBuffer(buffer);
    } finally {
      this.localContexts?.forEach(([context]) => {
        context.values.pop();
      });
    }
    return buffer.length === 1 ? "callbacks" in buffer ? resolveCallbackSync(raw(buffer[0], buffer.callbacks)).toString() : buffer[0] : stringBufferToString(buffer, buffer.callbacks);
  }
  toStringToBuffer(buffer) {
    const tag = this.tag;
    const props = this.props;
    let { children } = this;
    buffer[0] += `<${tag}`;
    const normalizeKey = nameSpaceContext && useContext(nameSpaceContext) === "svg" ? (key) => toSVGAttributeName(normalizeIntrinsicElementKey(key)) : (key) => normalizeIntrinsicElementKey(key);
    for (let [key, v] of Object.entries(props)) {
      key = normalizeKey(key);
      if (key === "children") {
      } else if (key === "style" && typeof v === "object") {
        let styleStr = "";
        styleObjectForEach(v, (property, value) => {
          if (value != null) {
            styleStr += `${styleStr ? ";" : ""}${property}:${value}`;
          }
        });
        buffer[0] += ' style="';
        escapeToBuffer(styleStr, buffer);
        buffer[0] += '"';
      } else if (typeof v === "string") {
        buffer[0] += ` ${key}="`;
        escapeToBuffer(v, buffer);
        buffer[0] += '"';
      } else if (v === null || v === void 0) {
      } else if (typeof v === "number" || v.isEscaped) {
        buffer[0] += ` ${key}="${v}"`;
      } else if (typeof v === "boolean" && booleanAttributes.includes(key)) {
        if (v) {
          buffer[0] += ` ${key}=""`;
        }
      } else if (key === "dangerouslySetInnerHTML") {
        if (children.length > 0) {
          throw new Error("Can only set one of `children` or `props.dangerouslySetInnerHTML`.");
        }
        children = [raw(v.__html)];
      } else if (v instanceof Promise) {
        buffer[0] += ` ${key}="`;
        buffer.unshift('"', v);
      } else if (typeof v === "function") {
        if (!key.startsWith("on") && key !== "ref") {
          throw new Error(`Invalid prop '${key}' of type 'function' supplied to '${tag}'.`);
        }
      } else {
        buffer[0] += ` ${key}="`;
        escapeToBuffer(v.toString(), buffer);
        buffer[0] += '"';
      }
    }
    if (emptyTags.includes(tag) && children.length === 0) {
      buffer[0] += "/>";
      return;
    }
    buffer[0] += ">";
    childrenToStringToBuffer(children, buffer);
    buffer[0] += `</${tag}>`;
  }
};
var JSXFunctionNode = class extends JSXNode {
  static {
    __name(this, "JSXFunctionNode");
  }
  toStringToBuffer(buffer) {
    const { children } = this;
    const props = { ...this.props };
    if (children.length) {
      props.children = children.length === 1 ? children[0] : children;
    }
    const res = this.tag.call(null, props);
    if (typeof res === "boolean" || res == null) {
      return;
    } else if (res instanceof Promise) {
      if (globalContexts.length === 0) {
        buffer.unshift("", res);
      } else {
        const currentContexts = globalContexts.map((c) => [c, c.values.at(-1)]);
        buffer.unshift(
          "",
          res.then((childRes) => {
            if (childRes instanceof JSXNode) {
              childRes.localContexts = currentContexts;
            }
            return childRes;
          })
        );
      }
    } else if (res instanceof JSXNode) {
      res.toStringToBuffer(buffer);
    } else if (typeof res === "number" || res.isEscaped) {
      buffer[0] += res;
      if (res.callbacks) {
        buffer.callbacks ||= [];
        buffer.callbacks.push(...res.callbacks);
      }
    } else {
      escapeToBuffer(res, buffer);
    }
  }
};
var JSXFragmentNode = class extends JSXNode {
  static {
    __name(this, "JSXFragmentNode");
  }
  toStringToBuffer(buffer) {
    childrenToStringToBuffer(this.children, buffer);
  }
};
var jsx = /* @__PURE__ */ __name((tag, props, ...children) => {
  props ??= {};
  if (children.length) {
    props.children = children.length === 1 ? children[0] : children;
  }
  const key = props.key;
  delete props["key"];
  const node = jsxFn(tag, props, children);
  node.key = key;
  return node;
}, "jsx");
var initDomRenderer = false;
var jsxFn = /* @__PURE__ */ __name((tag, props, children) => {
  if (!initDomRenderer) {
    for (const k in domRenderers) {
      ;
      components_exports[k][DOM_RENDERER] = domRenderers[k];
    }
    initDomRenderer = true;
  }
  if (typeof tag === "function") {
    return new JSXFunctionNode(tag, props, children);
  } else if (components_exports[tag]) {
    return new JSXFunctionNode(
      components_exports[tag],
      props,
      children
    );
  } else if (tag === "svg" || tag === "head") {
    nameSpaceContext ||= createContext2("");
    return new JSXNode(tag, props, [
      new JSXFunctionNode(
        nameSpaceContext,
        {
          value: tag
        },
        children
      )
    ]);
  } else {
    return new JSXNode(tag, props, children);
  }
}, "jsxFn");
var Fragment = /* @__PURE__ */ __name(({
  children
}) => {
  return new JSXFragmentNode(
    "",
    {
      children
    },
    Array.isArray(children) ? children : children ? [children] : []
  );
}, "Fragment");

// node_modules/hono/dist/jsx/jsx-dev-runtime.js
function jsxDEV(tag, props, key) {
  let node;
  if (!props || !("children" in props)) {
    node = jsxFn(tag, props, []);
  } else {
    const children = props.children;
    node = Array.isArray(children) ? jsxFn(tag, props, children) : jsxFn(tag, props, [children]);
  }
  node.key = key;
  return node;
}
__name(jsxDEV, "jsxDEV");

// src/views/layout.tsx
var _a, _b, _c, _d;
var Layout = /* @__PURE__ */ __name(({ title: title3, children }) => {
  return /* @__PURE__ */ jsxDEV("html", { lang: "en", children: [
    /* @__PURE__ */ jsxDEV("head", { children: [
      /* @__PURE__ */ jsxDEV("meta", { charset: "UTF-8" }),
      /* @__PURE__ */ jsxDEV("meta", { name: "viewport", content: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" }),
      /* @__PURE__ */ jsxDEV("title", { children: [
        title3,
        " - GOATkit Admin"
      ] }),
      /* @__PURE__ */ jsxDEV("link", { rel: "manifest", href: "/admin/manifest.webmanifest" }),
      /* @__PURE__ */ jsxDEV("meta", { name: "theme-color", content: "#eff1f5", id: "theme-color-meta" }),
      /* @__PURE__ */ jsxDEV("meta", { name: "apple-mobile-web-app-capable", content: "yes" }),
      /* @__PURE__ */ jsxDEV("meta", { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" }),
      html(_a || (_a = __template([`<script>
(function(){
  function autoThemeFromLocalTime() {
    // Heuristic: use Mocha in the evening/night unless user explicitly chose.
    // Assumption: "after 5pm" means 17:00-06:59 local time.
    try {
      var h = new Date().getHours();
      return (h >= 17 || h < 7) ? 'dark' : 'light';
    } catch (e) {
      return 'light';
    }
  }

  function syncThemeColorMeta(){
    try {
      var meta = document.getElementById('theme-color-meta');
      if (!meta) return;
      var css = getComputedStyle(document.documentElement);
      var c = String(css.getPropertyValue('--theme-color') || '').trim();
      if (c) {
        meta.setAttribute('content', c);
        return;
      }
      // Fallback for first paint before CSS vars are available.
      var t = document.documentElement.getAttribute('data-theme') || 'light';
      meta.setAttribute('content', t === 'dark' ? '#1e1e2e' : '#eff1f5');
    } catch (e) {}
  }

  // Default to Latte unless user explicitly chose otherwise.
  var s = localStorage.getItem('theme');
  var t = (s === 'dark' || s === 'light') ? s : autoThemeFromLocalTime();
  document.documentElement.setAttribute('data-theme', t);

  // Set a sensible theme-color immediately for browser chrome.
  try {
    var meta = document.getElementById('theme-color-meta');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#1e1e2e' : '#eff1f5');
  } catch (e) {}

  // Styles load immediately after this script; wait a tick so CSS vars are available.
  requestAnimationFrame(syncThemeColorMeta);
  window.__syncThemeColorMeta = syncThemeColorMeta;

  // If user never chose a theme, automatically switch based on local time.
  // Keeps manual override stable once set.
  setInterval(function() {
    try {
      var manual = localStorage.getItem('theme');
      if (manual === 'dark' || manual === 'light') return;
      var next = autoThemeFromLocalTime();
      var cur = document.documentElement.getAttribute('data-theme') || 'light';
      if (next !== cur) {
        document.documentElement.setAttribute('data-theme', next);
        syncThemeColorMeta();
        if (typeof window.updateThemeLabels === 'function') window.updateThemeLabels(next);
      }
    } catch (e) {}
  }, 60 * 1000);
})();
<\/script>
<style data-fodt>
@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-200LilMondo.otf') format('opentype');
  font-weight: 200;
  font-display: block;
}

@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-500Dudette.otf') format('opentype');
  font-weight: 500;
  font-display: block;
}

@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-800Kahuna.otf') format('opentype');
  font-weight: 800;
  font-display: block;
}

* {
  font-family: 'TideSans', system-ui, -apple-system, sans-serif !important;
  font-feature-settings: 'kern' 1;
}

:root {
  --brand: #dc8a78;
  --on-brand: #1e1e2e;
  --bg: #eff1f5;
  --bg-card: #ffffff;
  --bg-sidebar: #e6e9ef;
  --text: #4c4f69;
  --text-secondary: #5c5f78;
  --text-sidebar: #6c6f85;
  --text-sidebar-hover: #4c4f69;
  --text-sidebar-active: #1e66f5;
  --border: #ccd0da;
  --input-bg: #ffffff;
  --surface-0: #ccd0da;
  --surface-1: #bcc0cc;
  --surface-2: #acb0be;
  --destructive: #e64553;
  --destructive-hover: #d20f39;
  --destructive-soft: #fdecee;
  --destructive-border: #ea999f;
  --sidebar-divider: rgba(76, 79, 105, 0.14);
  --sidebar-hover-bg: rgba(76, 79, 105, 0.08);
  --sidebar-active-bg: rgba(30, 102, 245, 0.12);

  --theme-color: #eff1f5;

  /* Badge accents (Catppuccin Latte) */
  --badge-neutral-bg: rgba(188, 192, 204, 0.40);
  --badge-neutral-border: rgba(156, 160, 176, 0.60);
  --badge-neutral-text: var(--text);
  --badge-primary: #1e66f5;
  --badge-primary-bg: rgba(30, 102, 245, 0.16);
  --badge-primary-border: rgba(30, 102, 245, 0.30);
  --badge-secondary: #40a02b;
  --badge-secondary-bg: rgba(64, 160, 43, 0.16);
  --badge-secondary-border: rgba(64, 160, 43, 0.30);
  --badge-destructive: #d20f39;
  --badge-destructive-bg: rgba(210, 15, 57, 0.14);
  --badge-destructive-border: rgba(210, 15, 57, 0.28);

  --safe-top: env(safe-area-inset-top, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
}

[data-theme="dark"] {
  --bg: #1e1e2e;
  --bg-card: #313244;
  --bg-sidebar: #11111b;
  --text: #cdd6f4;
  --text-secondary: #a6adc8;
  --text-sidebar: #6c7086;
  --text-sidebar-hover: #bac2de;
  --text-sidebar-active: #cdd6f4;
  --border: #45475a;
  --input-bg: #45475a;
  --surface-0: #313244;
  --surface-1: #45475a;
  --surface-2: #585b70;
  --destructive: #eba0ac;
  --destructive-hover: #f38ba8;
  --destructive-soft: rgba(235, 160, 172, 0.14);
  --destructive-border: #6c7086;
  --sidebar-divider: rgba(255, 255, 255, 0.08);
  --sidebar-hover-bg: rgba(255, 255, 255, 0.06);
  --sidebar-active-bg: rgba(255, 255, 255, 0.1);

  --theme-color: #1e1e2e;

  /* Badge accents (Catppuccin Mocha) */
  --badge-neutral-bg: rgba(88, 91, 112, 0.42);
  --badge-neutral-border: rgba(147, 153, 178, 0.40);
  --badge-neutral-text: var(--text);
  --badge-primary: #89b4fa;
  --badge-primary-bg: rgba(137, 180, 250, 0.20);
  --badge-primary-border: rgba(137, 180, 250, 0.34);
  --badge-secondary: #a6e3a1;
  --badge-secondary-bg: rgba(166, 227, 161, 0.18);
  --badge-secondary-border: rgba(166, 227, 161, 0.32);
  --badge-destructive: #f38ba8;
  --badge-destructive-bg: rgba(243, 139, 168, 0.18);
  --badge-destructive-border: rgba(243, 139, 168, 0.32);
}

body { opacity: 0; }
body.ready { opacity: 1; transition: opacity .15s; }

html, body {
  background: var(--bg);
}

/* iOS: allow headers to extend under translucent status bar, but keep content readable. */
.sticky.top-0.z-50 {
  padding-top: var(--safe-top);
}

/* Apply Catppuccin variables to Franken/UIkit components in light mode too.
   (Dark mode already has explicit overrides; these base rules bring Latte in line.) */
.uk-card { background: var(--bg-card) !important; border-color: var(--border) !important; color: var(--text) !important; }
.bg-white { background: var(--bg-card) !important; }
.border-b, .border-border { border-color: var(--border) !important; }
.text-muted-foreground { color: var(--text-secondary) !important; }
.uk-input, .uk-select, .uk-textarea { background: var(--input-bg) !important; color: var(--text) !important; border-color: var(--border) !important; }
.uk-table th { color: var(--text-secondary) !important; border-color: var(--border) !important; }
.uk-table td { color: var(--text) !important; }
.uk-table-divider > :not(:first-child) > tr, .uk-table-divider > tr:not(:first-child) { border-color: var(--border) !important; }
.uk-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid var(--badge-neutral-border) !important;
  background: var(--badge-neutral-bg) !important;
  color: var(--badge-neutral-text) !important;
  font-weight: 600 !important;
  letter-spacing: 0.02em;
}
.uk-label-primary {
  border-color: var(--badge-primary-border) !important;
  background: var(--badge-primary-bg) !important;
  color: var(--badge-primary) !important;
}
.uk-label-secondary {
  border-color: var(--badge-secondary-border) !important;
  background: var(--badge-secondary-bg) !important;
  color: var(--badge-secondary) !important;
}
.uk-label-destructive {
  border-color: var(--badge-destructive-border) !important;
  background: var(--badge-destructive-bg) !important;
  color: var(--badge-destructive) !important;
}
.uk-btn-default { background: var(--input-bg) !important; color: var(--text) !important; border-color: var(--border) !important; }
.uk-btn-primary { background: var(--brand) !important; border-color: var(--brand) !important; color: var(--on-brand) !important; }
.uk-checkbox, .uk-toggle-switch { background: var(--input-bg) !important; border-color: var(--border) !important; }
.uk-checkbox:checked { background-color: var(--brand) !important; border-color: var(--brand) !important; }
.uk-toggle-switch:checked { background-color: var(--brand) !important; border-color: var(--brand) !important; }
.uk-offcanvas-bar { background: var(--bg-sidebar) !important; }
.uk-form-label { color: var(--text-secondary) !important; }
h2, h3 { color: var(--text) !important; }
p { color: var(--text) !important; }
.uk-nav-header { color: var(--text-secondary) !important; }
.uk-close { color: var(--text) !important; }

[data-theme="dark"] .uk-card { background: var(--bg-card) !important; border-color: var(--border) !important; color: var(--text) !important; }
[data-theme="dark"] .bg-white { background: var(--bg-card) !important; }
[data-theme="dark"] .border-b, [data-theme="dark"] .border-border { border-color: var(--border) !important; }
[data-theme="dark"] .text-muted-foreground { color: var(--text-secondary) !important; }
[data-theme="dark"] .uk-input, [data-theme="dark"] .uk-select, [data-theme="dark"] .uk-textarea { background: var(--input-bg) !important; color: var(--text) !important; border-color: var(--border) !important; }
[data-theme="dark"] .uk-table th { color: var(--text-secondary) !important; border-color: var(--border) !important; }
[data-theme="dark"] .uk-table td { color: var(--text) !important; }
[data-theme="dark"] .uk-table-divider > :not(:first-child) > tr, [data-theme="dark"] .uk-table-divider > tr:not(:first-child) { border-color: var(--border) !important; }
[data-theme="dark"] .uk-btn-default { background: var(--input-bg) !important; color: var(--text) !important; border-color: var(--border) !important; }
[data-theme="dark"] .uk-btn-primary { background: var(--brand) !important; border-color: var(--brand) !important; color: #1e1e2e !important; }
[data-theme="dark"] .uk-checkbox, [data-theme="dark"] .uk-toggle-switch { background: var(--input-bg) !important; border-color: var(--border) !important; }
[data-theme="dark"] .uk-checkbox:checked { background-color: var(--brand) !important; border-color: var(--brand) !important; }
[data-theme="dark"] .uk-toggle-switch:checked { background-color: var(--brand) !important; border-color: var(--brand) !important; }
[data-theme="dark"] .uk-offcanvas-bar { background: var(--bg-sidebar) !important; }
[data-theme="dark"] .uk-form-label { color: var(--text-secondary) !important; }
[data-theme="dark"] h2, [data-theme="dark"] h3 { color: var(--text) !important; }
[data-theme="dark"] p { color: var(--text) !important; }
[data-theme="dark"] a.uk-link { color: var(--brand) !important; }
[data-theme="dark"] .uk-nav-header { color: var(--text-secondary) !important; }
[data-theme="dark"] .uk-close { color: var(--text) !important; }
</style>`]))),
      /* @__PURE__ */ jsxDEV("script", { src: "https://unpkg.com/htmx.org@1.9.10" }),
      /* @__PURE__ */ jsxDEV("script", { src: "/admin.js", defer: true }),
      /* @__PURE__ */ jsxDEV("link", { rel: "stylesheet", href: "https://unpkg.com/franken-ui@2.1.2/dist/css/core.min.css" }),
      /* @__PURE__ */ jsxDEV("script", { src: "https://unpkg.com/franken-ui@2.1.2/dist/js/core.iife.js" }),
      /* @__PURE__ */ jsxDEV("script", { src: "https://cdn.tailwindcss.com/3.4.17" }),
      html(_b || (_b = __template([`<script>tailwind.config = { corePlugins: { preflight: false } };
(function() {
  var fk = document.querySelector('link[href*="franken"]');
  if (!fk) return;
  function fixOrder() {
    document.head.querySelectorAll('style:not([data-fodt])').forEach(function(s) {
      if (fk.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_PRECEDING) {
        document.head.appendChild(s);
      }
    });
  }
  var obs = new MutationObserver(fixOrder);
  obs.observe(document.head, { childList: true });
  document.addEventListener('DOMContentLoaded', function() { fixOrder(); obs.disconnect(); });
})();
<\/script>`]))),
      /* @__PURE__ */ jsxDEV("link", { rel: "stylesheet", href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" }),
      /* @__PURE__ */ jsxDEV("script", { src: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" }),
      /* @__PURE__ */ jsxDEV("link", { rel: "stylesheet", href: "https://unpkg.com/@geoman-io/leaflet-geoman-free@2.17.0/dist/leaflet-geoman.css" }),
      /* @__PURE__ */ jsxDEV("script", { src: "https://unpkg.com/@geoman-io/leaflet-geoman-free@2.17.0/dist/leaflet-geoman.js" }),
      /* @__PURE__ */ jsxDEV("style", { children: `.leaflet-container img { max-width: none !important; max-height: none !important; }` }),
      html(_c || (_c = __template([`<script>
function _onRadiusMilesInput() { updateRadius(); }
function _onRadiusLatChange() { updateRadius(); }
function _onRadiusLngChange() { updateRadius(); }

function initMaps() {
  if (typeof L === 'undefined') return;

  var rm = document.getElementById('radius-map');
  if (rm && !rm._mapInit) {
    rm._mapInit = true;
    var lat = parseFloat(rm.dataset.lat) || 44.1628;
    var lng = parseFloat(rm.dataset.lng) || -77.3832;
    var miles = parseFloat(rm.dataset.miles) || 10;
    var map = L.map(rm).setView([lat, lng], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '\xA9 OpenStreetMap' }).addTo(map);
    var circle = L.circle([lat, lng], { radius: miles * 1609.34, color: '#0f3460', fillColor: '#0f3460', fillOpacity: 0.12 }).addTo(map);
    if (lat !== 44.1628) map.fitBounds(circle.getBounds().pad(0.1));
    map.on('click', function(e) {
      var latEl = document.getElementById('center-lat');
      var lngEl = document.getElementById('center-lng');
      if (latEl) latEl.value = e.latlng.lat.toFixed(6);
      if (lngEl) lngEl.value = e.latlng.lng.toFixed(6);
      updateRadius();
    });
    window._radiusMap = map;
    window._radiusCircle = circle;
    var milesEl = document.getElementById('radius-miles');
    if (milesEl) milesEl.addEventListener('input', _onRadiusMilesInput);
    var latEl = document.getElementById('center-lat');
    var lngEl = document.getElementById('center-lng');
    if (latEl) latEl.addEventListener('change', _onRadiusLatChange);
    if (lngEl) lngEl.addEventListener('change', _onRadiusLngChange);
    setTimeout(function() { map.invalidateSize(); }, 200);
  }

    var gm = document.getElementById('geofence-map');
    if (gm && !gm._mapInit) {
      gm._mapInit = true;
      var pts = [];
      try { pts = JSON.parse(gm.dataset.points || '[]'); } catch(e) {}

     function normalizePair(a, b) {
       var x = Number(a);
       var y = Number(b);
       if (!isFinite(x) || !isFinite(y)) return [44.1628, -77.3832];
       var ax = Math.abs(x);
       var ay = Math.abs(y);
       if (ax > 90 && ax <= 180 && ay <= 90) return [y, x];
       if (ay > 90 && ay <= 180 && ax <= 90) return [x, y];
       if ((x < 0 && y > 0) || (x > 0 && y < 0)) {
         var lat = x > 0 ? x : y;
         var lng = x < 0 ? x : y;
         if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return [lat, lng];
       }
       return [x, y];
     }

     function toLL(p) {
       if (Array.isArray(p) && p.length >= 2) return normalizePair(p[0], p[1]);
       if (p && typeof p === 'object') return normalizePair(p.lat, p.lng);
       return [44.1628, -77.3832];
     }

      var center = pts.length > 0 ? toLL(pts[0]) : [44.1628, -77.3832];
      var map = L.map(gm).setView(center, 12);
     L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '\xA9 OpenStreetMap' }).addTo(map);
     var poly = null;

    function syncToHidden() {
      var coords = [];
      if (poly) {
        poly.getLatLngs()[0].forEach(function(ll) { coords.push([ll.lat, ll.lng]); });
      }
      var h = document.getElementById('polygon-json-hidden');
      if (h) {
        h.value = coords.length ? JSON.stringify(coords) : '';
        h.dispatchEvent(new Event('change', { bubbles: true }));
      }
      var c = document.getElementById('gf-count');
      if (c) c.textContent = coords.length + ' pts';
    }

     function enableEdit() {
       if (poly && poly.pm && typeof poly.pm.enable === 'function') {
         poly.pm.enable({ allowSelfIntersection: false });
       }
     }

     function loadExisting() {
       if (pts.length >= 3) {
         poly = L.polygon(pts.map(toLL), { color: '#0f3460', fillColor: '#0f3460', fillOpacity: 0.12 }).addTo(map);
         map.fitBounds(poly.getBounds().pad(0.1));
         enableEdit();
         if (poly.pm) {
           poly.on('pm:edit', syncToHidden);
           poly.on('pm:vertexremoved', syncToHidden);
         }
         syncToHidden();
       }
     }
     loadExisting();

     var drawBtn = document.getElementById('gf-draw-btn');

     if (!map.pm) {
       if (drawBtn) {
         drawBtn.textContent = 'Drawing unavailable';
         drawBtn.disabled = true;
       }
     } else {
       map.pm.addControls({ position: 'topleft', drawMarker: false, drawCircleMarker: false, drawPolyline: false, drawRectangle: false, drawPolygon: false, drawCircle: false, drawText: false, editMode: false, dragMode: false, cutPolygon: false, removalMode: false, rotateMode: false });
       map.pm.setGlobalOptions({ pathOptions: { color: '#0f3460', fillColor: '#0f3460', fillOpacity: 0.12 } });

       if (drawBtn) drawBtn.addEventListener('click', function() {
         if (poly) { map.removeLayer(poly); poly = null; syncToHidden(); }
         map.pm.enableDraw('Polygon', { snappable: false });
         drawBtn.textContent = 'Drawing...';
         drawBtn.disabled = true;
       });

       map.on('pm:create', function(e) {
         poly = e.layer;
         enableEdit();
         poly.on('pm:edit', syncToHidden);
         poly.on('pm:vertexremoved', syncToHidden);
         syncToHidden();
         if (drawBtn) { drawBtn.textContent = 'Redraw'; drawBtn.disabled = false; }
       });

       map.on('pm:drawend', function() {
         if (drawBtn) { drawBtn.textContent = poly ? 'Redraw' : 'Draw Polygon'; drawBtn.disabled = false; }
       });
     }

    var clearBtn = document.getElementById('clear-geofence-btn');
    if (clearBtn) clearBtn.addEventListener('click', function() {
      if (poly) { map.removeLayer(poly); poly = null; }
      syncToHidden();
      if (drawBtn) { drawBtn.textContent = 'Draw Polygon'; drawBtn.disabled = false; }
    });

    window._geofenceMap = map;
    setTimeout(function() { map.invalidateSize(); }, 200);
  }
}

function updateRadius() {
  var map = window._radiusMap;
  var circle = window._radiusCircle;
  if (!map || !circle) return;
  var la = parseFloat(document.getElementById('center-lat').value) || 44.1628;
  var ln = parseFloat(document.getElementById('center-lng').value) || -77.3832;
  var mi = parseFloat(document.getElementById('radius-miles').value) || 10;
  map.removeLayer(circle);
  var newCircle = L.circle([la, ln], { radius: mi * 1609.34, color: '#0f3460', fillColor: '#0f3460', fillOpacity: 0.12 }).addTo(map);
  window._radiusCircle = newCircle;
  map.setView([la, ln]);
  var rf = document.getElementById('radius-form');
  if (rf) rf.dispatchEvent(new Event('change', { bubbles: true }));
}

document.addEventListener('htmx:beforeCleanupElement', function(e) {
  var el = e.detail.elt;
  if (el.id === 'radius-map' && window._radiusMap) {
    var milesEl = document.getElementById('radius-miles');
    var latEl = document.getElementById('center-lat');
    var lngEl = document.getElementById('center-lng');
    if (milesEl) milesEl.removeEventListener('input', _onRadiusMilesInput);
    if (latEl) latEl.removeEventListener('change', _onRadiusLatChange);
    if (lngEl) lngEl.removeEventListener('change', _onRadiusLngChange);
    window._radiusMap.off();
    window._radiusMap.remove();
    window._radiusMap = null;
    window._radiusCircle = null;
    el._mapInit = false;
  }
  if (el.id === 'geofence-map' && window._geofenceMap) {
    window._geofenceMap.off();
    window._geofenceMap.remove();
    window._geofenceMap = null;
    el._mapInit = false;
  }
});

document.addEventListener('click', function(e) {
  var item = e.target.closest('.address-result');
  if (!item) return;
  var d = item.dataset;
  var prefix = d.prefix || 'addr';
  if (prefix === 'radius') {
    var cLat = document.getElementById('center-lat');
    var cLng = document.getElementById('center-lng');
    if (cLat) cLat.value = d.lat;
    if (cLng) cLng.value = d.lng;
    var rr = document.getElementById('radius-address-results');
    if (rr) rr.innerHTML = '';
    updateRadius();
  } else {
    var ids = {
      'addr-line1': d.line1,
      'addr-city': d.city,
      'addr-state': d.state,
      'addr-postal': d.postal,
      'addr-lat': d.lat,
      'addr-lng': d.lng,
      'address_line_1': d.line1,
      'address_city': d.city,
      'address_state': d.state,
      'address_postal': d.postal,
      'address_lat': d.lat,
      'address_lng': d.lng,
    };
    for (var id in ids) { var el = document.getElementById(id); if (el) el.value = ids[id]; }
    var ar = document.getElementById('address-results');
    if (ar) ar.innerHTML = '';
  }
});

document.addEventListener('htmx:configRequest', function(e) {
  var el = e.detail.elt;
  if (el.id === 'area-type') {
    var tid = window.location.pathname.split('/territories/')[1];
    if (tid) tid = tid.split('/')[0];
    e.detail.path = '/admin/territories/' + tid + '/area-panel/' + el.value;
  }
});

document.addEventListener('htmx:afterSettle', function() {
  setTimeout(initMaps, 100);
});
document.addEventListener('DOMContentLoaded', function() { setTimeout(initMaps, 100); });

function scrollSmsThreadToBottom(force) {
  var scroller = document.getElementById('sms-history-scroll');
  if (!scroller) return;

  var canScroll = scroller.scrollHeight > (scroller.clientHeight + 12);

  var didInitial = scroller.dataset && scroller.dataset.smsInitialScrollDone === '1';
  if (!didInitial) force = true;

  if (!force) {
    var distanceFromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    if (distanceFromBottom > 96) return;
  }

  scroller.scrollTop = scroller.scrollHeight;
  if (canScroll && scroller.dataset) scroller.dataset.smsInitialScrollDone = '1';
}

function scrollSmsThreadToBottomSoon(force) {
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      scrollSmsThreadToBottom(force);
    });
  });

  // iOS Safari/PWA can report an intermediate scrollHeight during initial
  // layout/font hydration. Retry a couple times without being aggressive.
  setTimeout(function() { scrollSmsThreadToBottom(force); }, 60);
  setTimeout(function() { scrollSmsThreadToBottom(force); }, 220);
}

function focusSmsComposer() {
  var textarea = document.querySelector('#sms-thread-panel textarea[name="sms_body"]');
  if (!textarea || typeof textarea.focus !== 'function') return;
  try {
    textarea.focus({ preventScroll: true });
  } catch {
    textarea.focus();
  }
  if (typeof textarea.setSelectionRange === 'function') {
    var end = textarea.value ? textarea.value.length : 0;
    textarea.setSelectionRange(end, end);
  }
}

function focusSmsComposerWithRetries() {
  focusSmsComposer();
  setTimeout(focusSmsComposer, 60);
  setTimeout(focusSmsComposer, 180);
}

function recalcInvoiceTotal() {
  var lineItems = document.getElementById('line_items_text');
  var tax = document.getElementById('tax_amount');
  var discount = document.getElementById('discount_amount');
  var total = document.getElementById('total_amount');
  if (!lineItems || !total) return;

  var subtotal = 0;
  var lines = String(lineItems.value || '').split(/\r?
/);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    var parts = line.split('|').map(function (part) { return part.trim(); });
    if (parts.length < 3) continue;
    var qty = parseFloat(parts[1] || '0');
    var unit = parseFloat((parts[2] || '0').replace(/[$,]/g, ''));
    if (!isFinite(qty) || qty <= 0 || !isFinite(unit) || unit < 0) continue;
    subtotal += qty * unit;
  }

  var taxValue = tax ? parseFloat(String(tax.value || '0').replace(/[$,]/g, '')) : 0;
  var discountValue = discount ? parseFloat(String(discount.value || '0').replace(/[$,]/g, '')) : 0;
  if (!isFinite(taxValue)) taxValue = 0;
  if (!isFinite(discountValue)) discountValue = 0;

  var next = Math.max(0, subtotal + taxValue - discountValue);
  total.value = next.toFixed(2);
}

document.addEventListener('input', function (e) {
  var target = e.target;
  if (!target || !target.id) return;
  if (target.id === 'line_items_text' || target.id === 'tax_amount' || target.id === 'discount_amount') {
    recalcInvoiceTotal();
  }
});

document.addEventListener('htmx:afterSettle', function () {
  recalcInvoiceTotal();
});

function flashSmsSendButton() {
  var btn = document.querySelector('#sms-thread-panel [data-sms-send-success="true"]');
  if (!btn) return;
  var originalStyle = btn.getAttribute('style') || '';
  var originalText = btn.textContent || 'Send';
  btn.textContent = 'Sent';
  btn.setAttribute('style', 'min-width:110px;background:#16a34a;border-color:#15803d;color:#fff;');
  setTimeout(function() {
    if (!document.body.contains(btn)) return;
    btn.textContent = originalText;
    btn.setAttribute('style', originalStyle || 'min-width:110px;');
  }, 1200);
}

window.openSmsTaskModal = function(config) {
  var existing = document.getElementById('sms-task-modal-overlay');
  if (existing) existing.remove();
  var openedAt = Date.now();

  var overlay = document.createElement('div');
  overlay.id = 'sms-task-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:1100;display:flex;align-items:flex-end;justify-content:center;padding:16px;';

  var panel = document.createElement('div');
  panel.id = 'sms-task-modal-panel';
  panel.style.cssText = 'width:100%;max-width:520px;background:var(--bg-card,#fff);border:1px solid var(--border,#ccd0da);border-radius:14px;padding:14px;box-shadow:0 18px 48px rgba(0,0,0,0.22);overflow:auto;';

  var title = document.createElement('div');
  title.textContent = 'Add Task';
  title.style.cssText = 'font-weight:600;font-size:16px;color:var(--text,#1f2937);margin-bottom:10px;';

  var labelTask = document.createElement('label');
  labelTask.textContent = 'Task title';
  labelTask.style.cssText = 'display:block;font-size:12px;font-weight:600;letter-spacing:.02em;color:var(--text-secondary,#6b7280);margin-bottom:6px;';

  var taskInput = document.createElement('input');
  taskInput.type = 'text';
  taskInput.maxLength = 72;
  taskInput.value = (config && config.suggestedTitle ? config.suggestedTitle : '') || '';
  taskInput.placeholder = 'One-line task title';
  taskInput.className = 'uk-input';
  taskInput.style.cssText = 'width:100%;margin-bottom:10px;';

  var labelJob = document.createElement('label');
  labelJob.textContent = 'Task target';
  labelJob.style.cssText = 'display:block;font-size:12px;font-weight:600;letter-spacing:.02em;color:var(--text-secondary,#6b7280);margin-bottom:6px;';

  var jobSelect = document.createElement('select');
  jobSelect.className = 'uk-select';
  jobSelect.style.cssText = 'width:100%;margin-bottom:12px;';

  var options = (config && Array.isArray(config.jobOptions)) ? config.jobOptions : [];
  var selectedId = config && config.selectedJobId ? config.selectedJobId : '';
  for (var i = 0; i < options.length; i++) {
    var opt = document.createElement('option');
    opt.value = options[i].id;
    opt.textContent = options[i].label || options[i].id;
    if (options[i].id === selectedId) opt.selected = true;
    jobSelect.appendChild(opt);
  }

  var actions = document.createElement('div');
  actions.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';

  var cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'uk-btn uk-btn-default uk-btn-sm';
  cancelBtn.textContent = 'Cancel';

  var saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'uk-btn uk-btn-primary uk-btn-sm';
  saveBtn.textContent = 'Add task';

  function applyViewportBounds() {
    var vv = window.visualViewport;
    var viewportHeight = vv ? vv.height : window.innerHeight;
    var viewportTop = vv ? vv.offsetTop : 0;
    var keyboardBottomInset = vv ? Math.max(0, window.innerHeight - (vv.height + vv.offsetTop)) : 0;

    overlay.style.top = viewportTop + 'px';
    overlay.style.bottom = keyboardBottomInset + 'px';
    panel.style.maxHeight = Math.max(220, Math.floor(viewportHeight - 24)) + 'px';
  }

  function onViewportChange() {
    applyViewportBounds();
  }

  function closeModal() {
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', onViewportChange);
      window.visualViewport.removeEventListener('scroll', onViewportChange);
    }
    window.removeEventListener('orientationchange', onViewportChange);
    overlay.remove();
  }

  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', function(e) {
    if (Date.now() - openedAt < 450) return;
    if (e.target === overlay) closeModal();
  });

  saveBtn.addEventListener('click', function() {
    var t = (taskInput.value || '').replace(/s+/g, ' ').trim();
    if (!t) {
      taskInput.focus();
      return;
    }
    var j = jobSelect.value || '';
    if (!j) return;
    if (config && typeof config.onSubmit === 'function') {
      config.onSubmit({ taskTitle: t, jobId: j });
    }
    closeModal();
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);
  panel.appendChild(title);
  panel.appendChild(labelTask);
  panel.appendChild(taskInput);
  panel.appendChild(labelJob);
  panel.appendChild(jobSelect);
  panel.appendChild(actions);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  applyViewportBounds();
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onViewportChange);
    window.visualViewport.addEventListener('scroll', onViewportChange);
  }
  window.addEventListener('orientationchange', onViewportChange);
  try {
    taskInput.focus({ preventScroll: true });
  } catch {
    taskInput.focus();
  }
  taskInput.select();
};

window.handleSmsTaskBubble = function(btn, triggerEvent) {
  if (!btn || !btn.dataset) return false;

  if (triggerEvent && typeof triggerEvent.type === 'string') {
    var now = Date.now();
    var lastTouch = parseInt(btn.dataset.smsLastTouchAt || '0', 10);
    if (triggerEvent.type === 'touchend') {
      btn.dataset.smsLastTouchAt = String(now);
    } else if (triggerEvent.type === 'click' && lastTouch > 0 && now - lastTouch < 700) {
      return false;
    }
  }

  var optionsRaw = btn.dataset.jobOptions || '[]';
  var jobOptions = [];
  try {
    jobOptions = JSON.parse(optionsRaw);
  } catch {
    jobOptions = [];
  }

  if (!Array.isArray(jobOptions) || jobOptions.length === 0) {
    return false;
  }

  if (typeof htmx === 'undefined' || !btn.dataset.smsTaskUrl) {
    return false;
  }

  window.openSmsTaskModal({
    jobOptions: jobOptions,
    selectedJobId: btn.dataset.selectedJobId || '',
    suggestedTitle: (btn.dataset.taskSuggestedTitle || '').trim(),
    onSubmit: function(values) {
      htmx.ajax('POST', btn.dataset.smsTaskUrl, {
        target: '#sms-thread-panel',
        swap: 'outerHTML',
        values: {
          sms_log_id: btn.dataset.smsLogId || '',
          job_id: values.jobId,
          task_title: values.taskTitle,
        },
      });
    },
  });

  return false;
};

window.prepareSmsTaskFromBubble = window.handleSmsTaskBubble;

function handleSmsTaskBubbleEvent(e) {
  var btn = e.target.closest('[data-sms-task-url]');
  if (!btn) return;
  e.preventDefault();
  if (typeof e.stopPropagation === 'function') e.stopPropagation();
  if (window.handleSmsTaskBubble) {
    window.handleSmsTaskBubble(btn, e);
  }
}

document.addEventListener('touchend', handleSmsTaskBubbleEvent, { passive: false });
document.addEventListener('click', handleSmsTaskBubbleEvent);

document.addEventListener('htmx:afterSwap', function(e) {
  var target = e.detail && e.detail.target ? e.detail.target : null;
  if (!target) return;
  var requestConfig = e.detail && e.detail.requestConfig ? e.detail.requestConfig : null;
  var requestPath = requestConfig && typeof requestConfig.path === 'string' ? requestConfig.path : '';
  var requestElt = requestConfig && requestConfig.elt ? requestConfig.elt : null;
  if (target.id === 'sms-history') {
    scrollSmsThreadToBottomSoon(false);
    return;
  }
  if (target.id === 'sms-thread-panel') {
    scrollSmsThreadToBottomSoon(true);
    var sentFromReplyForm = requestPath.indexOf('/sms-reply') !== -1;
    if (!sentFromReplyForm && requestElt && typeof requestElt.matches === 'function') {
      sentFromReplyForm = requestElt.matches('form[hx-post*="/sms-reply"]');
    }
    if (target.querySelector('[data-sms-send-success="true"]')) {
      requestAnimationFrame(flashSmsSendButton);
    }
    if (target.querySelector('[data-sms-send-result]') || sentFromReplyForm) {
      requestAnimationFrame(focusSmsComposerWithRetries);
    }
    return;
  }
  if (target.id === 'page-content') {
    scrollSmsThreadToBottomSoon(true);
  }
});

document.addEventListener('DOMContentLoaded', function() {
  scrollSmsThreadToBottomSoon(true);
});

document.addEventListener('htmx:beforeRequest', function(e) {
  var oc = document.getElementById('offcanvas-nav');
  if (oc && typeof UIkit !== 'undefined') {
    var inst = UIkit.offcanvas(oc);
    if (inst && inst.isToggled && inst.isToggled()) inst.hide();
  }
});

document.addEventListener('htmx:afterRequest', function(e) {
  var el = e.detail.elt;
  var ind = null;
  if (el.classList.contains('autosave')) {
    ind = el.querySelector('.save-indicator');
  } else if (el.tagName === 'INPUT' && el.type === 'checkbox') {
    var section = el.closest('section');
    if (section) ind = section.querySelector('.save-indicator');
  }
  if (!ind) return;
  if (e.detail.successful) {
    ind.textContent = 'Saved';
    ind.className = 'save-indicator save-ok';
    ind.style.opacity = '1';
    setTimeout(function() { ind.style.opacity = '0'; }, 2000);
    if (el.tagName === 'INPUT' && el.type === 'checkbox') {
      var section = el.closest('section');
      if (section) {
        var count = section.querySelectorAll('input[type=checkbox]:checked').length;
        var badge = section.querySelector('[id$="-count"]');
        if (badge) badge.textContent = count + ' assigned';
      }
    }
  } else {
    ind.textContent = 'Error saving';
    ind.className = 'save-indicator save-err';
    ind.style.opacity = '1';
    if (el.tagName === 'INPUT' && el.type === 'checkbox') el.checked = !el.checked;
  }
});
document.addEventListener('htmx:beforeRequest', function(e) {
  var el = e.detail.elt;
  var ind = null;
  if (el.classList.contains('autosave')) {
    ind = el.querySelector('.save-indicator');
  } else if (el.tagName === 'INPUT' && el.type === 'checkbox') {
    var section = el.closest('section');
    if (section) ind = section.querySelector('.save-indicator');
  }
  if (ind) { ind.textContent = 'Saving\u2026'; ind.className = 'save-indicator save-pending'; ind.style.opacity = '1'; }
});

document.addEventListener('htmx:confirm', function(e) {
  var btn = e.detail.elt;
  if (btn.getAttribute('data-confirm') !== 'arm') return;
  if (btn.classList.contains('delete-armed')) return;
  e.preventDefault();
  var orig = btn.textContent;
  btn.textContent = 'Confirm';
  btn.classList.add('delete-armed');
  btn._disarmTimer = setTimeout(function() {
    btn.textContent = orig;
    btn.classList.remove('delete-armed');
  }, 4000);
});

document.addEventListener('click', function(e) {
  var btn = e.target.closest('.delete-armed');
  if (!btn) return;
  if (btn._disarmTimer) clearTimeout(btn._disarmTimer);
});
        <\/script>`], [`<script>
function _onRadiusMilesInput() { updateRadius(); }
function _onRadiusLatChange() { updateRadius(); }
function _onRadiusLngChange() { updateRadius(); }

function initMaps() {
  if (typeof L === 'undefined') return;

  var rm = document.getElementById('radius-map');
  if (rm && !rm._mapInit) {
    rm._mapInit = true;
    var lat = parseFloat(rm.dataset.lat) || 44.1628;
    var lng = parseFloat(rm.dataset.lng) || -77.3832;
    var miles = parseFloat(rm.dataset.miles) || 10;
    var map = L.map(rm).setView([lat, lng], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '\xA9 OpenStreetMap' }).addTo(map);
    var circle = L.circle([lat, lng], { radius: miles * 1609.34, color: '#0f3460', fillColor: '#0f3460', fillOpacity: 0.12 }).addTo(map);
    if (lat !== 44.1628) map.fitBounds(circle.getBounds().pad(0.1));
    map.on('click', function(e) {
      var latEl = document.getElementById('center-lat');
      var lngEl = document.getElementById('center-lng');
      if (latEl) latEl.value = e.latlng.lat.toFixed(6);
      if (lngEl) lngEl.value = e.latlng.lng.toFixed(6);
      updateRadius();
    });
    window._radiusMap = map;
    window._radiusCircle = circle;
    var milesEl = document.getElementById('radius-miles');
    if (milesEl) milesEl.addEventListener('input', _onRadiusMilesInput);
    var latEl = document.getElementById('center-lat');
    var lngEl = document.getElementById('center-lng');
    if (latEl) latEl.addEventListener('change', _onRadiusLatChange);
    if (lngEl) lngEl.addEventListener('change', _onRadiusLngChange);
    setTimeout(function() { map.invalidateSize(); }, 200);
  }

    var gm = document.getElementById('geofence-map');
    if (gm && !gm._mapInit) {
      gm._mapInit = true;
      var pts = [];
      try { pts = JSON.parse(gm.dataset.points || '[]'); } catch(e) {}

     function normalizePair(a, b) {
       var x = Number(a);
       var y = Number(b);
       if (!isFinite(x) || !isFinite(y)) return [44.1628, -77.3832];
       var ax = Math.abs(x);
       var ay = Math.abs(y);
       if (ax > 90 && ax <= 180 && ay <= 90) return [y, x];
       if (ay > 90 && ay <= 180 && ax <= 90) return [x, y];
       if ((x < 0 && y > 0) || (x > 0 && y < 0)) {
         var lat = x > 0 ? x : y;
         var lng = x < 0 ? x : y;
         if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return [lat, lng];
       }
       return [x, y];
     }

     function toLL(p) {
       if (Array.isArray(p) && p.length >= 2) return normalizePair(p[0], p[1]);
       if (p && typeof p === 'object') return normalizePair(p.lat, p.lng);
       return [44.1628, -77.3832];
     }

      var center = pts.length > 0 ? toLL(pts[0]) : [44.1628, -77.3832];
      var map = L.map(gm).setView(center, 12);
     L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '\xA9 OpenStreetMap' }).addTo(map);
     var poly = null;

    function syncToHidden() {
      var coords = [];
      if (poly) {
        poly.getLatLngs()[0].forEach(function(ll) { coords.push([ll.lat, ll.lng]); });
      }
      var h = document.getElementById('polygon-json-hidden');
      if (h) {
        h.value = coords.length ? JSON.stringify(coords) : '';
        h.dispatchEvent(new Event('change', { bubbles: true }));
      }
      var c = document.getElementById('gf-count');
      if (c) c.textContent = coords.length + ' pts';
    }

     function enableEdit() {
       if (poly && poly.pm && typeof poly.pm.enable === 'function') {
         poly.pm.enable({ allowSelfIntersection: false });
       }
     }

     function loadExisting() {
       if (pts.length >= 3) {
         poly = L.polygon(pts.map(toLL), { color: '#0f3460', fillColor: '#0f3460', fillOpacity: 0.12 }).addTo(map);
         map.fitBounds(poly.getBounds().pad(0.1));
         enableEdit();
         if (poly.pm) {
           poly.on('pm:edit', syncToHidden);
           poly.on('pm:vertexremoved', syncToHidden);
         }
         syncToHidden();
       }
     }
     loadExisting();

     var drawBtn = document.getElementById('gf-draw-btn');

     if (!map.pm) {
       if (drawBtn) {
         drawBtn.textContent = 'Drawing unavailable';
         drawBtn.disabled = true;
       }
     } else {
       map.pm.addControls({ position: 'topleft', drawMarker: false, drawCircleMarker: false, drawPolyline: false, drawRectangle: false, drawPolygon: false, drawCircle: false, drawText: false, editMode: false, dragMode: false, cutPolygon: false, removalMode: false, rotateMode: false });
       map.pm.setGlobalOptions({ pathOptions: { color: '#0f3460', fillColor: '#0f3460', fillOpacity: 0.12 } });

       if (drawBtn) drawBtn.addEventListener('click', function() {
         if (poly) { map.removeLayer(poly); poly = null; syncToHidden(); }
         map.pm.enableDraw('Polygon', { snappable: false });
         drawBtn.textContent = 'Drawing...';
         drawBtn.disabled = true;
       });

       map.on('pm:create', function(e) {
         poly = e.layer;
         enableEdit();
         poly.on('pm:edit', syncToHidden);
         poly.on('pm:vertexremoved', syncToHidden);
         syncToHidden();
         if (drawBtn) { drawBtn.textContent = 'Redraw'; drawBtn.disabled = false; }
       });

       map.on('pm:drawend', function() {
         if (drawBtn) { drawBtn.textContent = poly ? 'Redraw' : 'Draw Polygon'; drawBtn.disabled = false; }
       });
     }

    var clearBtn = document.getElementById('clear-geofence-btn');
    if (clearBtn) clearBtn.addEventListener('click', function() {
      if (poly) { map.removeLayer(poly); poly = null; }
      syncToHidden();
      if (drawBtn) { drawBtn.textContent = 'Draw Polygon'; drawBtn.disabled = false; }
    });

    window._geofenceMap = map;
    setTimeout(function() { map.invalidateSize(); }, 200);
  }
}

function updateRadius() {
  var map = window._radiusMap;
  var circle = window._radiusCircle;
  if (!map || !circle) return;
  var la = parseFloat(document.getElementById('center-lat').value) || 44.1628;
  var ln = parseFloat(document.getElementById('center-lng').value) || -77.3832;
  var mi = parseFloat(document.getElementById('radius-miles').value) || 10;
  map.removeLayer(circle);
  var newCircle = L.circle([la, ln], { radius: mi * 1609.34, color: '#0f3460', fillColor: '#0f3460', fillOpacity: 0.12 }).addTo(map);
  window._radiusCircle = newCircle;
  map.setView([la, ln]);
  var rf = document.getElementById('radius-form');
  if (rf) rf.dispatchEvent(new Event('change', { bubbles: true }));
}

document.addEventListener('htmx:beforeCleanupElement', function(e) {
  var el = e.detail.elt;
  if (el.id === 'radius-map' && window._radiusMap) {
    var milesEl = document.getElementById('radius-miles');
    var latEl = document.getElementById('center-lat');
    var lngEl = document.getElementById('center-lng');
    if (milesEl) milesEl.removeEventListener('input', _onRadiusMilesInput);
    if (latEl) latEl.removeEventListener('change', _onRadiusLatChange);
    if (lngEl) lngEl.removeEventListener('change', _onRadiusLngChange);
    window._radiusMap.off();
    window._radiusMap.remove();
    window._radiusMap = null;
    window._radiusCircle = null;
    el._mapInit = false;
  }
  if (el.id === 'geofence-map' && window._geofenceMap) {
    window._geofenceMap.off();
    window._geofenceMap.remove();
    window._geofenceMap = null;
    el._mapInit = false;
  }
});

document.addEventListener('click', function(e) {
  var item = e.target.closest('.address-result');
  if (!item) return;
  var d = item.dataset;
  var prefix = d.prefix || 'addr';
  if (prefix === 'radius') {
    var cLat = document.getElementById('center-lat');
    var cLng = document.getElementById('center-lng');
    if (cLat) cLat.value = d.lat;
    if (cLng) cLng.value = d.lng;
    var rr = document.getElementById('radius-address-results');
    if (rr) rr.innerHTML = '';
    updateRadius();
  } else {
    var ids = {
      'addr-line1': d.line1,
      'addr-city': d.city,
      'addr-state': d.state,
      'addr-postal': d.postal,
      'addr-lat': d.lat,
      'addr-lng': d.lng,
      'address_line_1': d.line1,
      'address_city': d.city,
      'address_state': d.state,
      'address_postal': d.postal,
      'address_lat': d.lat,
      'address_lng': d.lng,
    };
    for (var id in ids) { var el = document.getElementById(id); if (el) el.value = ids[id]; }
    var ar = document.getElementById('address-results');
    if (ar) ar.innerHTML = '';
  }
});

document.addEventListener('htmx:configRequest', function(e) {
  var el = e.detail.elt;
  if (el.id === 'area-type') {
    var tid = window.location.pathname.split('/territories/')[1];
    if (tid) tid = tid.split('/')[0];
    e.detail.path = '/admin/territories/' + tid + '/area-panel/' + el.value;
  }
});

document.addEventListener('htmx:afterSettle', function() {
  setTimeout(initMaps, 100);
});
document.addEventListener('DOMContentLoaded', function() { setTimeout(initMaps, 100); });

function scrollSmsThreadToBottom(force) {
  var scroller = document.getElementById('sms-history-scroll');
  if (!scroller) return;

  var canScroll = scroller.scrollHeight > (scroller.clientHeight + 12);

  var didInitial = scroller.dataset && scroller.dataset.smsInitialScrollDone === '1';
  if (!didInitial) force = true;

  if (!force) {
    var distanceFromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    if (distanceFromBottom > 96) return;
  }

  scroller.scrollTop = scroller.scrollHeight;
  if (canScroll && scroller.dataset) scroller.dataset.smsInitialScrollDone = '1';
}

function scrollSmsThreadToBottomSoon(force) {
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      scrollSmsThreadToBottom(force);
    });
  });

  // iOS Safari/PWA can report an intermediate scrollHeight during initial
  // layout/font hydration. Retry a couple times without being aggressive.
  setTimeout(function() { scrollSmsThreadToBottom(force); }, 60);
  setTimeout(function() { scrollSmsThreadToBottom(force); }, 220);
}

function focusSmsComposer() {
  var textarea = document.querySelector('#sms-thread-panel textarea[name="sms_body"]');
  if (!textarea || typeof textarea.focus !== 'function') return;
  try {
    textarea.focus({ preventScroll: true });
  } catch {
    textarea.focus();
  }
  if (typeof textarea.setSelectionRange === 'function') {
    var end = textarea.value ? textarea.value.length : 0;
    textarea.setSelectionRange(end, end);
  }
}

function focusSmsComposerWithRetries() {
  focusSmsComposer();
  setTimeout(focusSmsComposer, 60);
  setTimeout(focusSmsComposer, 180);
}

function recalcInvoiceTotal() {
  var lineItems = document.getElementById('line_items_text');
  var tax = document.getElementById('tax_amount');
  var discount = document.getElementById('discount_amount');
  var total = document.getElementById('total_amount');
  if (!lineItems || !total) return;

  var subtotal = 0;
  var lines = String(lineItems.value || '').split(/\\r?\\n/);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    var parts = line.split('|').map(function (part) { return part.trim(); });
    if (parts.length < 3) continue;
    var qty = parseFloat(parts[1] || '0');
    var unit = parseFloat((parts[2] || '0').replace(/[$,]/g, ''));
    if (!isFinite(qty) || qty <= 0 || !isFinite(unit) || unit < 0) continue;
    subtotal += qty * unit;
  }

  var taxValue = tax ? parseFloat(String(tax.value || '0').replace(/[$,]/g, '')) : 0;
  var discountValue = discount ? parseFloat(String(discount.value || '0').replace(/[$,]/g, '')) : 0;
  if (!isFinite(taxValue)) taxValue = 0;
  if (!isFinite(discountValue)) discountValue = 0;

  var next = Math.max(0, subtotal + taxValue - discountValue);
  total.value = next.toFixed(2);
}

document.addEventListener('input', function (e) {
  var target = e.target;
  if (!target || !target.id) return;
  if (target.id === 'line_items_text' || target.id === 'tax_amount' || target.id === 'discount_amount') {
    recalcInvoiceTotal();
  }
});

document.addEventListener('htmx:afterSettle', function () {
  recalcInvoiceTotal();
});

function flashSmsSendButton() {
  var btn = document.querySelector('#sms-thread-panel [data-sms-send-success="true"]');
  if (!btn) return;
  var originalStyle = btn.getAttribute('style') || '';
  var originalText = btn.textContent || 'Send';
  btn.textContent = 'Sent';
  btn.setAttribute('style', 'min-width:110px;background:#16a34a;border-color:#15803d;color:#fff;');
  setTimeout(function() {
    if (!document.body.contains(btn)) return;
    btn.textContent = originalText;
    btn.setAttribute('style', originalStyle || 'min-width:110px;');
  }, 1200);
}

window.openSmsTaskModal = function(config) {
  var existing = document.getElementById('sms-task-modal-overlay');
  if (existing) existing.remove();
  var openedAt = Date.now();

  var overlay = document.createElement('div');
  overlay.id = 'sms-task-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:1100;display:flex;align-items:flex-end;justify-content:center;padding:16px;';

  var panel = document.createElement('div');
  panel.id = 'sms-task-modal-panel';
  panel.style.cssText = 'width:100%;max-width:520px;background:var(--bg-card,#fff);border:1px solid var(--border,#ccd0da);border-radius:14px;padding:14px;box-shadow:0 18px 48px rgba(0,0,0,0.22);overflow:auto;';

  var title = document.createElement('div');
  title.textContent = 'Add Task';
  title.style.cssText = 'font-weight:600;font-size:16px;color:var(--text,#1f2937);margin-bottom:10px;';

  var labelTask = document.createElement('label');
  labelTask.textContent = 'Task title';
  labelTask.style.cssText = 'display:block;font-size:12px;font-weight:600;letter-spacing:.02em;color:var(--text-secondary,#6b7280);margin-bottom:6px;';

  var taskInput = document.createElement('input');
  taskInput.type = 'text';
  taskInput.maxLength = 72;
  taskInput.value = (config && config.suggestedTitle ? config.suggestedTitle : '') || '';
  taskInput.placeholder = 'One-line task title';
  taskInput.className = 'uk-input';
  taskInput.style.cssText = 'width:100%;margin-bottom:10px;';

  var labelJob = document.createElement('label');
  labelJob.textContent = 'Task target';
  labelJob.style.cssText = 'display:block;font-size:12px;font-weight:600;letter-spacing:.02em;color:var(--text-secondary,#6b7280);margin-bottom:6px;';

  var jobSelect = document.createElement('select');
  jobSelect.className = 'uk-select';
  jobSelect.style.cssText = 'width:100%;margin-bottom:12px;';

  var options = (config && Array.isArray(config.jobOptions)) ? config.jobOptions : [];
  var selectedId = config && config.selectedJobId ? config.selectedJobId : '';
  for (var i = 0; i < options.length; i++) {
    var opt = document.createElement('option');
    opt.value = options[i].id;
    opt.textContent = options[i].label || options[i].id;
    if (options[i].id === selectedId) opt.selected = true;
    jobSelect.appendChild(opt);
  }

  var actions = document.createElement('div');
  actions.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';

  var cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'uk-btn uk-btn-default uk-btn-sm';
  cancelBtn.textContent = 'Cancel';

  var saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'uk-btn uk-btn-primary uk-btn-sm';
  saveBtn.textContent = 'Add task';

  function applyViewportBounds() {
    var vv = window.visualViewport;
    var viewportHeight = vv ? vv.height : window.innerHeight;
    var viewportTop = vv ? vv.offsetTop : 0;
    var keyboardBottomInset = vv ? Math.max(0, window.innerHeight - (vv.height + vv.offsetTop)) : 0;

    overlay.style.top = viewportTop + 'px';
    overlay.style.bottom = keyboardBottomInset + 'px';
    panel.style.maxHeight = Math.max(220, Math.floor(viewportHeight - 24)) + 'px';
  }

  function onViewportChange() {
    applyViewportBounds();
  }

  function closeModal() {
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', onViewportChange);
      window.visualViewport.removeEventListener('scroll', onViewportChange);
    }
    window.removeEventListener('orientationchange', onViewportChange);
    overlay.remove();
  }

  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', function(e) {
    if (Date.now() - openedAt < 450) return;
    if (e.target === overlay) closeModal();
  });

  saveBtn.addEventListener('click', function() {
    var t = (taskInput.value || '').replace(/\\s+/g, ' ').trim();
    if (!t) {
      taskInput.focus();
      return;
    }
    var j = jobSelect.value || '';
    if (!j) return;
    if (config && typeof config.onSubmit === 'function') {
      config.onSubmit({ taskTitle: t, jobId: j });
    }
    closeModal();
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);
  panel.appendChild(title);
  panel.appendChild(labelTask);
  panel.appendChild(taskInput);
  panel.appendChild(labelJob);
  panel.appendChild(jobSelect);
  panel.appendChild(actions);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  applyViewportBounds();
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onViewportChange);
    window.visualViewport.addEventListener('scroll', onViewportChange);
  }
  window.addEventListener('orientationchange', onViewportChange);
  try {
    taskInput.focus({ preventScroll: true });
  } catch {
    taskInput.focus();
  }
  taskInput.select();
};

window.handleSmsTaskBubble = function(btn, triggerEvent) {
  if (!btn || !btn.dataset) return false;

  if (triggerEvent && typeof triggerEvent.type === 'string') {
    var now = Date.now();
    var lastTouch = parseInt(btn.dataset.smsLastTouchAt || '0', 10);
    if (triggerEvent.type === 'touchend') {
      btn.dataset.smsLastTouchAt = String(now);
    } else if (triggerEvent.type === 'click' && lastTouch > 0 && now - lastTouch < 700) {
      return false;
    }
  }

  var optionsRaw = btn.dataset.jobOptions || '[]';
  var jobOptions = [];
  try {
    jobOptions = JSON.parse(optionsRaw);
  } catch {
    jobOptions = [];
  }

  if (!Array.isArray(jobOptions) || jobOptions.length === 0) {
    return false;
  }

  if (typeof htmx === 'undefined' || !btn.dataset.smsTaskUrl) {
    return false;
  }

  window.openSmsTaskModal({
    jobOptions: jobOptions,
    selectedJobId: btn.dataset.selectedJobId || '',
    suggestedTitle: (btn.dataset.taskSuggestedTitle || '').trim(),
    onSubmit: function(values) {
      htmx.ajax('POST', btn.dataset.smsTaskUrl, {
        target: '#sms-thread-panel',
        swap: 'outerHTML',
        values: {
          sms_log_id: btn.dataset.smsLogId || '',
          job_id: values.jobId,
          task_title: values.taskTitle,
        },
      });
    },
  });

  return false;
};

window.prepareSmsTaskFromBubble = window.handleSmsTaskBubble;

function handleSmsTaskBubbleEvent(e) {
  var btn = e.target.closest('[data-sms-task-url]');
  if (!btn) return;
  e.preventDefault();
  if (typeof e.stopPropagation === 'function') e.stopPropagation();
  if (window.handleSmsTaskBubble) {
    window.handleSmsTaskBubble(btn, e);
  }
}

document.addEventListener('touchend', handleSmsTaskBubbleEvent, { passive: false });
document.addEventListener('click', handleSmsTaskBubbleEvent);

document.addEventListener('htmx:afterSwap', function(e) {
  var target = e.detail && e.detail.target ? e.detail.target : null;
  if (!target) return;
  var requestConfig = e.detail && e.detail.requestConfig ? e.detail.requestConfig : null;
  var requestPath = requestConfig && typeof requestConfig.path === 'string' ? requestConfig.path : '';
  var requestElt = requestConfig && requestConfig.elt ? requestConfig.elt : null;
  if (target.id === 'sms-history') {
    scrollSmsThreadToBottomSoon(false);
    return;
  }
  if (target.id === 'sms-thread-panel') {
    scrollSmsThreadToBottomSoon(true);
    var sentFromReplyForm = requestPath.indexOf('/sms-reply') !== -1;
    if (!sentFromReplyForm && requestElt && typeof requestElt.matches === 'function') {
      sentFromReplyForm = requestElt.matches('form[hx-post*="/sms-reply"]');
    }
    if (target.querySelector('[data-sms-send-success="true"]')) {
      requestAnimationFrame(flashSmsSendButton);
    }
    if (target.querySelector('[data-sms-send-result]') || sentFromReplyForm) {
      requestAnimationFrame(focusSmsComposerWithRetries);
    }
    return;
  }
  if (target.id === 'page-content') {
    scrollSmsThreadToBottomSoon(true);
  }
});

document.addEventListener('DOMContentLoaded', function() {
  scrollSmsThreadToBottomSoon(true);
});

document.addEventListener('htmx:beforeRequest', function(e) {
  var oc = document.getElementById('offcanvas-nav');
  if (oc && typeof UIkit !== 'undefined') {
    var inst = UIkit.offcanvas(oc);
    if (inst && inst.isToggled && inst.isToggled()) inst.hide();
  }
});

document.addEventListener('htmx:afterRequest', function(e) {
  var el = e.detail.elt;
  var ind = null;
  if (el.classList.contains('autosave')) {
    ind = el.querySelector('.save-indicator');
  } else if (el.tagName === 'INPUT' && el.type === 'checkbox') {
    var section = el.closest('section');
    if (section) ind = section.querySelector('.save-indicator');
  }
  if (!ind) return;
  if (e.detail.successful) {
    ind.textContent = 'Saved';
    ind.className = 'save-indicator save-ok';
    ind.style.opacity = '1';
    setTimeout(function() { ind.style.opacity = '0'; }, 2000);
    if (el.tagName === 'INPUT' && el.type === 'checkbox') {
      var section = el.closest('section');
      if (section) {
        var count = section.querySelectorAll('input[type=checkbox]:checked').length;
        var badge = section.querySelector('[id$="-count"]');
        if (badge) badge.textContent = count + ' assigned';
      }
    }
  } else {
    ind.textContent = 'Error saving';
    ind.className = 'save-indicator save-err';
    ind.style.opacity = '1';
    if (el.tagName === 'INPUT' && el.type === 'checkbox') el.checked = !el.checked;
  }
});
document.addEventListener('htmx:beforeRequest', function(e) {
  var el = e.detail.elt;
  var ind = null;
  if (el.classList.contains('autosave')) {
    ind = el.querySelector('.save-indicator');
  } else if (el.tagName === 'INPUT' && el.type === 'checkbox') {
    var section = el.closest('section');
    if (section) ind = section.querySelector('.save-indicator');
  }
  if (ind) { ind.textContent = 'Saving\u2026'; ind.className = 'save-indicator save-pending'; ind.style.opacity = '1'; }
});

document.addEventListener('htmx:confirm', function(e) {
  var btn = e.detail.elt;
  if (btn.getAttribute('data-confirm') !== 'arm') return;
  if (btn.classList.contains('delete-armed')) return;
  e.preventDefault();
  var orig = btn.textContent;
  btn.textContent = 'Confirm';
  btn.classList.add('delete-armed');
  btn._disarmTimer = setTimeout(function() {
    btn.textContent = orig;
    btn.classList.remove('delete-armed');
  }, 4000);
});

document.addEventListener('click', function(e) {
  var btn = e.target.closest('.delete-armed');
  if (!btn) return;
  if (btn._disarmTimer) clearTimeout(btn._disarmTimer);
});
        <\/script>`]))),
      /* @__PURE__ */ jsxDEV("style", { children: `
          *, *::before, *::after { box-sizing: border-box; }
          html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
          body { background: var(--bg); color: var(--text); overscroll-behavior: none; -webkit-font-smoothing: antialiased; }

          @layer base {
            input, select, textarea, button { font-size: 16px; }
            input[type="time"], input[type="date"] { -webkit-appearance: none; appearance: none; }
          }
          select:not(.uk-select) { -webkit-appearance: none; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23999' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px; }
          a, button, input, select, textarea, label, [role="switch"], [hx-post], [hx-get], [hx-delete] { touch-action: manipulation; }
          .main-content { -webkit-overflow-scrolling: touch; }
          body { padding-env: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }

          .admin-layout { min-height: 100vh; min-height: 100dvh; }

          .desktop-sidebar { display: none; }

          .main-content { flex: 1; padding: 0; min-height: 100vh; min-height: 100dvh; }

          .page-header {
            background: var(--bg-card);
            padding: 16px 32px 16px 52px;
            border-bottom: 1px solid var(--border);
            display: grid;
            grid-template-columns: 1fr auto;
            align-items: center;
            gap: 8px 16px;
            position: -webkit-sticky;
            position: sticky;
            top: 0;
            z-index: 50;
          }
          .page-header h2 { font-size: 20px; color: var(--text); font-weight: 600; letter-spacing: -0.3px; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .page-header-info { grid-column: 1; min-width: 0; }
          .page-header-actions { grid-column: 2; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
          .page-header-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 2px; font-size: 13px; color: var(--text-secondary); }
          .page-header-meta > span:not(:first-child)::before { content: '\xB7'; margin-right: 6px; opacity: 0.5; }
          .page-header-meta > span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
          .page-header--rich { grid-template-rows: auto auto; }
          .page-header--rich .page-header-info { grid-row: 1 / -1; }
          .page-header--rich .page-header-actions { grid-row: 1 / -1; align-self: center; }

          .status-icon { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .status-icon svg { display: block; }
          .status-icon--neutral { color: var(--text-secondary); }
          .status-icon--primary { color: var(--badge-primary); }
          .status-icon--secondary { color: var(--badge-secondary); }
          .status-icon--destructive { color: var(--badge-destructive); }

          .danger-card { border-color: var(--destructive-border, var(--border)) !important; }
          .danger-card h3 { color: var(--text-secondary) !important; font-size: 13px !important; }

          .wizard-progress { display: flex; align-items: center; gap: 4px; }
          .wizard-progress-step { width: 28px; height: 4px; border-radius: 2px; background: var(--border); }
          .wizard-progress-step.is-done { background: var(--badge-primary); }
          .wizard-progress-step.is-active { background: var(--brand); }

          .page-body { padding: 28px 32px; }

          @media (min-width: 1024px) {
            .admin-layout { display: flex; }
            .desktop-sidebar { display: flex; flex-direction: column; width: 260px; min-width: 260px; background: var(--bg-sidebar); min-height: 100vh; min-height: 100dvh; position: sticky; top: 0; height: 100vh; height: 100dvh; overflow-y: auto; padding: 24px 0; }
            .mobile-menu-btn { display: none !important; }
            .page-header { padding: 20px 32px; }
          }

          table { width: 100%; border-collapse: collapse; }

          .search-box { position: relative; }
          .search-box input { padding-left: 36px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23999' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.242.656a5 5 0 1 1 0-10 5 5 0 0 1 0 10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: 12px center; }
          .search-results { position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-card); border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 8px; max-height: 240px; overflow-y: auto; z-index: 100; box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
          /* Customer create/edit forms don't wrap the input in .search-box, so absolute positioning can land off-screen.
             For those inline address result containers, render results as a normal block list. */
          #address-results .search-results { position: static; border-top: 1px solid var(--border); border-radius: 8px; box-shadow: 0 8px 18px rgba(0,0,0,0.12); }
          .search-item { padding: 10px 16px; cursor: pointer; border-bottom: 1px solid var(--border); font-size: 14px; color: var(--text); }
          .search-item:hover { background: rgba(127,127,127,0.08); }
          .search-item .name { font-weight: 500; }
          .search-item .meta { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }

          .avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--brand); color: #1e1e2e; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 15px; flex-shrink: 0; }
          .avatar-sm { width: 32px; height: 32px; font-size: 13px; }

          .save-indicator { font-size: 12px; font-weight: 500; transition: opacity 0.3s; opacity: 0; margin-left: 8px; }
          .save-ok { color: #16a34a; }
          .save-err { color: #dc2626; }
          .save-pending { color: var(--text-secondary); }
          .autosave .save-indicator, #territory-services .save-indicator, #territory-providers .save-indicator { display: inline-block; }

          .delete-btn { color: var(--destructive); background: var(--bg-card); border: 1px solid var(--destructive-border); padding: 6px 14px; border-radius: 7px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s; }
          .delete-btn:hover { background: var(--destructive-soft); border-color: var(--destructive-hover); color: var(--destructive-hover); }
          .delete-btn.delete-armed { background: var(--destructive); color: #fff; border-color: var(--destructive); font-weight: 600; }
          .delete-btn.delete-armed:hover { background: var(--destructive-hover); border-color: var(--destructive-hover); }

          .mobile-menu-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            background: none;
            border: none;
            color: var(--text);
            cursor: pointer;
            position: fixed;
            top: 0;
            left: 0;
            height: calc(48px + var(--safe-top));
            width: calc(48px + var(--safe-left));
            padding-top: var(--safe-top);
            padding-left: var(--safe-left);
            z-index: 100;
          }
          .mobile-menu-btn svg {
            transform: translateY(0px);
          }

          .sidebar-nav { padding: 0 4px; }
          .sidebar-nav .uk-nav-header { color: var(--text-sidebar); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; padding: 16px 12px 6px; margin: 0; }
          .sidebar-nav .uk-nav-header:first-child { padding-top: 4px; }
          .sidebar-nav .uk-nav-divider { border-color: var(--sidebar-divider); margin: 8px 12px; }
          .sidebar-nav > li > a { color: var(--text-sidebar); padding: 8px 12px; border-radius: 6px; font-size: 14px; font-weight: 450; transition: all 0.15s; display: block; text-decoration: none; }
          .sidebar-nav > li > a:hover { color: var(--text-sidebar-hover); background: var(--sidebar-hover-bg); }
          .sidebar-nav > li.uk-active > a { color: var(--text-sidebar-active); background: var(--sidebar-active-bg); font-weight: 500; }

          .admin-theme-toggle {
            width: 100%;
            border: 0;
            background: transparent;
            color: var(--text-sidebar);
            padding: 8px 12px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            cursor: pointer;
            text-align: left;
          }
          .admin-theme-toggle:hover { color: var(--text-sidebar-hover); background: var(--sidebar-hover-bg); }
          .admin-theme-toggle .theme-toggle-icon {
            position: relative;
            width: 24px;
            height: 24px;
            flex-shrink: 0;
          }
          .admin-theme-toggle .moon-or-sun {
            position: relative;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 1px solid currentColor;
            background: currentColor;
            transform: scale(1);
            transition: all 0.45s ease;
            overflow: hidden;
            opacity: 0.85;
          }
          .admin-theme-toggle .moon-or-sun::before {
            content: "";
            position: absolute;
            right: -9px;
            top: -9px;
            height: 24px;
            width: 24px;
            border: 2px solid currentColor;
            border-radius: 50%;
            transform: translate(0, 0);
            opacity: 1;
            transition: transform 0.45s ease;
          }
          .admin-theme-toggle .moon-or-sun::after {
            content: "";
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin: -4px 0 0 -4px;
            position: absolute;
            top: 50%;
            left: 50%;
            box-shadow: 0 -23px 0 currentColor,
              0 23px 0 currentColor,
              23px 0 0 currentColor,
              -23px 0 0 currentColor,
              15px 15px 0 currentColor,
              -15px 15px 0 currentColor,
              15px -15px 0 currentColor,
              -15px -15px 0 currentColor;
            transform: scale(0);
            transition: all 0.35s ease;
          }
          .admin-theme-toggle .moon-mask {
            position: absolute;
            right: -9px;
            top: -8px;
            height: 24px;
            width: 24px;
            border-radius: 50%;
            border: 0;
            background: var(--bg-sidebar);
            transform: translate(0, 0);
            opacity: 1;
            transition: background 0.25s ease, transform 0.45s ease;
          }
          [data-theme="dark"] .admin-theme-toggle .moon-or-sun {
            transform: scale(0.55);
            overflow: visible;
          }
          [data-theme="dark"] .admin-theme-toggle .moon-or-sun::before {
            transform: translate(14px, -14px);
            opacity: 0;
          }
          [data-theme="dark"] .admin-theme-toggle .moon-or-sun::after {
            transform: scale(1);
          }
          [data-theme="dark"] .admin-theme-toggle .moon-mask {
            transform: translate(14px, -14px);
            opacity: 0;
          }
          .theme-label { line-height: 1; }
          
          .sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 0 20px; margin-bottom: 24px; }
          .sidebar-logo img { width: 36px; height: 36px; }
          .sidebar-logo span { font-size: 18px; color: var(--text-sidebar-active); letter-spacing: -0.3px; font-weight: 600; }

          /* iOS PWA: give offcanvas enough top room under translucent status bar. */
          #offcanvas-nav .uk-offcanvas-bar {
            padding-top: calc(16px + var(--safe-top));
          }

          @media (max-width: 768px) {
            .page-header { padding: 12px 16px 12px 52px; }
            .page-header h2 { font-size: 17px; }
            .page-header--rich { grid-template-columns: 1fr; }
            .page-header--rich .page-header-actions { grid-column: 1; grid-row: auto; justify-self: start; }
            .page-header-meta > span { max-width: 140px; }
            .page-body { padding: 16px; }
          }

          #sms-thread-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.55);
            z-index: 1200;
            display: none;
            align-items: stretch;
            justify-content: stretch;
            padding: 0;
          }
          #sms-thread-modal-overlay[data-open="true"] { display: flex; }
          #sms-thread-modal-panel {
            width: 100%;
            height: 100%;
            background: var(--bg);
            color: var(--text);
            display: flex;
            flex-direction: column;
          }
          #sms-thread-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: calc(12px + var(--safe-top)) calc(12px + var(--safe-right)) 12px calc(12px + var(--safe-left));
            border-bottom: 1px solid var(--border);
            background: var(--bg-card);
          }
          #sms-thread-modal-header h3 { margin: 0; font-size: 15px; font-weight: 650; letter-spacing: -0.2px; line-height: 1.2; }
          #sms-thread-modal-actions { display: inline-flex; align-items: center; gap: 8px; }
          #sms-thread-modal-open-inbox { text-decoration: none; }
          #sms-thread-modal-content {
            flex: 1;
            min-height: 0;
            overflow: hidden;
            padding: 0;
            display: flex;
            flex-direction: column;
          }
          #sms-thread-modal-status {
            display: block;
            padding: 12px calc(12px + var(--safe-right)) 0 calc(12px + var(--safe-left));
          }
          #sms-thread-modal-loading {
            display: none;
            padding: 12px;
            border: 1px solid var(--border);
            border-radius: 14px;
            background: rgba(0,0,0,0.02);
            margin-bottom: 12px;
          }
          #sms-thread-modal-loading.htmx-request { display: block; }
          #sms-thread-modal-loading .skel { display: flex; flex-direction: column; gap: 10px; }
          #sms-thread-modal-loading .skel-row { display: flex; align-items: center; gap: 10px; }
          #sms-thread-modal-loading .skel-dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            background: rgba(0,0,0,0.08);
            flex: 0 0 auto;
          }
          #sms-thread-modal-loading .skel-line {
            height: 12px;
            border-radius: 999px;
            background: linear-gradient(90deg, rgba(0,0,0,0.06), rgba(0,0,0,0.10), rgba(0,0,0,0.06));
            background-size: 240% 100%;
            animation: smsSkel 1.15s ease-in-out infinite;
          }
          #sms-thread-modal-loading .skel-line.w-30 { width: 30%; }
          #sms-thread-modal-loading .skel-line.w-45 { width: 45%; }
          #sms-thread-modal-loading .skel-line.w-70 { width: 70%; }
          #sms-thread-modal-loading .skel-line.w-85 { width: 85%; }
          @keyframes smsSkel {
            0% { background-position: 100% 0; }
            100% { background-position: 0 0; }
          }
          @media (prefers-reduced-motion: reduce) {
            #sms-thread-modal-loading .skel-line { animation: none; background: rgba(0,0,0,0.08); }
          }
          #sms-thread-modal-error {
            display: none;
            padding: 12px;
            border: 1px solid rgba(239,68,68,0.35);
            border-radius: 12px;
            background: rgba(239,68,68,0.08);
            color: #b91c1c;
            font-size: 13px;
            margin-bottom: 12px;
          }
          #sms-thread-modal-error[data-open="true"] { display: block; }
          #sms-thread-modal-body {
            flex: 1;
            min-height: 0;
            padding: 0;
          }
          #sms-thread-modal-body #sms-thread-panel {
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: transparent !important;
            border: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          #sms-thread-modal-body #sms-thread-panel.uk-card,
          #sms-thread-modal-body #sms-thread-panel.uk-card-body {
            box-shadow: none !important;
            border: 0 !important;
            background: transparent !important;
          }
          #sms-thread-modal-body #sms-thread-panel [data-sms-thread-modal-open] { display: none !important; }
          #sms-thread-modal-body #sms-thread-panel [data-sms-thread-header] { display: none; }
          #sms-thread-modal-body #sms-thread-panel [data-sms-thread-body] {
            flex: 1;
            min-height: 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          #sms-thread-modal-body #sms-thread-panel [data-sms-thread-body] {
            padding: 0 calc(12px + var(--safe-right)) 0 calc(12px + var(--safe-left));
          }
          #sms-thread-modal-body #sms-history-scroll {
            max-height: none !important;
            flex: 1;
            min-height: 0;
            overflow-y: auto !important;
            padding: 10px 0 12px 0 !important;
          }
          #sms-thread-modal-body #sms-thread-panel form {
            margin-left: calc(-1 * (12px + var(--safe-left)));
            margin-right: calc(-1 * (12px + var(--safe-right)));
            padding: 12px calc(12px + var(--safe-right)) calc(16px + var(--safe-bottom)) calc(12px + var(--safe-left));
            border-top: 1px solid var(--border);
            background: var(--bg);
          }
          #sms-thread-modal-body #sms-thread-panel form textarea {
            margin-bottom: 2px;
          }
          #sms-thread-modal-body #sms-thread-panel form [data-sms-counter] {
            padding-bottom: 6px;
          }

          @media (min-width: 768px) {
            #sms-thread-modal-header h3 { font-size: 16px; }
            #sms-thread-modal-overlay {
              padding: 24px;
              align-items: center;
              justify-content: center;
            }
            #sms-thread-modal-panel {
              max-width: 760px;
              height: min(90vh, 860px);
              border-radius: 16px;
              border: 1px solid var(--border);
              box-shadow: 0 18px 48px rgba(0,0,0,0.22);
              overflow: hidden;
            }
          }
        ` })
    ] }),
    /* @__PURE__ */ jsxDEV("body", { children: [
      /* @__PURE__ */ jsxDEV("div", { id: "offcanvas-nav", "data-uk-offcanvas": "mode: slide; overlay: true", children: /* @__PURE__ */ jsxDEV("div", { class: "uk-offcanvas-bar", style: "background: var(--bg-sidebar); width: 260px;", children: [
        /* @__PURE__ */ jsxDEV("button", { class: "uk-offcanvas-close", type: "button", "data-uk-close": true, style: "color: var(--text-sidebar-active);" }),
        /* @__PURE__ */ jsxDEV("div", { class: "sidebar-logo", style: "padding: 0 16px;", children: [
          /* @__PURE__ */ jsxDEV("img", { src: "/images/uncle-logo.svg", alt: "" }),
          /* @__PURE__ */ jsxDEV("span", { children: "Uncle Bike" })
        ] }),
        /* @__PURE__ */ jsxDEV("ul", { class: "uk-nav uk-nav-default sidebar-nav", "data-uk-nav": true, children: [
          /* @__PURE__ */ jsxDEV("li", { class: "uk-nav-header", children: "Overview" }),
          /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin", "hx-get": "/admin", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Dashboard" }) }),
          /* @__PURE__ */ jsxDEV("li", { class: "uk-nav-divider" }),
          /* @__PURE__ */ jsxDEV("li", { class: "uk-nav-header", children: "Operations" }),
          /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/inbox", "hx-get": "/admin/inbox", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Inbox" }) }),
          /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/jobs", "hx-get": "/admin/jobs", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Jobs" }) }),
          /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/customers", "hx-get": "/admin/customers", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Customers" }) }),
          /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/recurring", "hx-get": "/admin/recurring", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Recurring" }) }),
          /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/invoices", "hx-get": "/admin/invoices", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Invoices" }) }),
          /* @__PURE__ */ jsxDEV("li", { class: "uk-nav-divider" }),
          /* @__PURE__ */ jsxDEV("li", { class: "uk-nav-header", children: "Setup" }),
          /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/territories", "hx-get": "/admin/territories", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Territories" }) }),
          /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/services", "hx-get": "/admin/services", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Services" }) }),
          /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/team", "hx-get": "/admin/team", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Team" }) }),
          /* @__PURE__ */ jsxDEV("li", { class: "uk-nav-divider" }),
          /* @__PURE__ */ jsxDEV("li", { class: "uk-nav-header", children: "Config" }),
          /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/branding", "hx-get": "/admin/branding", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Branding" }) }),
          /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/coupons", "hx-get": "/admin/coupons", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Coupons" }) }),
          /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/webhooks", "hx-get": "/admin/webhooks", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Webhooks" }) }),
          /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/sms-settings", "hx-get": "/admin/sms-settings", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "SMS" }) }),
          /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/push-settings", "hx-get": "/admin/push-settings", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Push" }) }),
          /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/settings", "hx-get": "/admin/settings", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Settings" }) }),
          /* @__PURE__ */ jsxDEV("li", { class: "uk-nav-divider" }),
          /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("button", { type: "button", class: "admin-theme-toggle", onclick: "toggleTheme()", "aria-label": "Toggle theme", children: [
            /* @__PURE__ */ jsxDEV("div", { class: "theme-toggle-icon", children: /* @__PURE__ */ jsxDEV("div", { class: "moon-or-sun", children: /* @__PURE__ */ jsxDEV("div", { class: "moon-mask" }) }) }),
            /* @__PURE__ */ jsxDEV("span", { class: "theme-label" })
          ] }) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxDEV("div", { class: "admin-layout", children: [
        /* @__PURE__ */ jsxDEV("aside", { class: "desktop-sidebar", children: [
          /* @__PURE__ */ jsxDEV("div", { class: "sidebar-logo", children: [
            /* @__PURE__ */ jsxDEV("img", { src: "/images/uncle-logo.svg", alt: "" }),
            /* @__PURE__ */ jsxDEV("span", { children: "Uncle Bike" })
          ] }),
          /* @__PURE__ */ jsxDEV("ul", { class: "uk-nav uk-nav-default sidebar-nav", "data-uk-nav": true, children: [
            /* @__PURE__ */ jsxDEV("li", { class: "uk-nav-header", children: "Overview" }),
            /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin", "hx-get": "/admin", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Dashboard" }) }),
            /* @__PURE__ */ jsxDEV("li", { class: "uk-nav-divider" }),
            /* @__PURE__ */ jsxDEV("li", { class: "uk-nav-header", children: "Operations" }),
            /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/inbox", "hx-get": "/admin/inbox", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Inbox" }) }),
            /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/jobs", "hx-get": "/admin/jobs", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Jobs" }) }),
            /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/customers", "hx-get": "/admin/customers", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Customers" }) }),
            /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/recurring", "hx-get": "/admin/recurring", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Recurring" }) }),
            /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/invoices", "hx-get": "/admin/invoices", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Invoices" }) }),
            /* @__PURE__ */ jsxDEV("li", { class: "uk-nav-divider" }),
            /* @__PURE__ */ jsxDEV("li", { class: "uk-nav-header", children: "Setup" }),
            /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/territories", "hx-get": "/admin/territories", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Territories" }) }),
            /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/services", "hx-get": "/admin/services", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Services" }) }),
            /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/team", "hx-get": "/admin/team", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Team" }) }),
            /* @__PURE__ */ jsxDEV("li", { class: "uk-nav-divider" }),
            /* @__PURE__ */ jsxDEV("li", { class: "uk-nav-header", children: "Config" }),
            /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/branding", "hx-get": "/admin/branding", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Branding" }) }),
            /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/coupons", "hx-get": "/admin/coupons", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Coupons" }) }),
            /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/webhooks", "hx-get": "/admin/webhooks", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Webhooks" }) }),
            /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/sms-settings", "hx-get": "/admin/sms-settings", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "SMS" }) }),
            /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/push-settings", "hx-get": "/admin/push-settings", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Push" }) }),
            /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/settings", "hx-get": "/admin/settings", "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "outerHTML", "hx-push-url": "true", children: "Settings" }) }),
            /* @__PURE__ */ jsxDEV("li", { class: "uk-nav-divider" }),
            /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("button", { type: "button", class: "admin-theme-toggle", onclick: "toggleTheme()", "aria-label": "Toggle theme", children: [
              /* @__PURE__ */ jsxDEV("div", { class: "theme-toggle-icon", children: /* @__PURE__ */ jsxDEV("div", { class: "moon-or-sun", children: /* @__PURE__ */ jsxDEV("div", { class: "moon-mask" }) }) }),
              /* @__PURE__ */ jsxDEV("span", { class: "theme-label" })
            ] }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxDEV("main", { class: "main-content", id: "main-content", children: [
          /* @__PURE__ */ jsxDEV("button", { type: "button", class: "mobile-menu-btn", "data-uk-toggle": "target: #offcanvas-nav", "aria-label": "Open menu", children: /* @__PURE__ */ jsxDEV("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", children: [
            /* @__PURE__ */ jsxDEV("title", { children: "Menu" }),
            /* @__PURE__ */ jsxDEV("line", { x1: "3", y1: "6", x2: "21", y2: "6" }),
            /* @__PURE__ */ jsxDEV("line", { x1: "3", y1: "12", x2: "21", y2: "12" }),
            /* @__PURE__ */ jsxDEV("line", { x1: "3", y1: "18", x2: "21", y2: "18" })
          ] }) }),
          /* @__PURE__ */ jsxDEV("div", { id: "page-content", children })
        ] })
      ] }),
      /* @__PURE__ */ jsxDEV("div", { id: "sms-thread-modal-overlay", hidden: true, children: /* @__PURE__ */ jsxDEV("div", { id: "sms-thread-modal-panel", role: "dialog", "aria-modal": "true", "aria-label": "SMS conversation", children: [
        /* @__PURE__ */ jsxDEV("div", { id: "sms-thread-modal-header", children: [
          /* @__PURE__ */ jsxDEV("h3", { children: "Conversation" }),
          /* @__PURE__ */ jsxDEV("div", { id: "sms-thread-modal-actions", children: [
            /* @__PURE__ */ jsxDEV("a", { id: "sms-thread-modal-open-inbox", class: "uk-btn uk-btn-default uk-btn-sm", href: "/admin/inbox", style: "display:none;", children: "Inbox" }),
            /* @__PURE__ */ jsxDEV("button", { type: "button", class: "uk-btn uk-btn-default uk-btn-sm", "data-sms-thread-modal-close": true, "aria-label": "Close conversation", children: "Close" })
          ] })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { id: "sms-thread-modal-content", children: [
          /* @__PURE__ */ jsxDEV("div", { id: "sms-thread-modal-status", children: [
            /* @__PURE__ */ jsxDEV("div", { id: "sms-thread-modal-loading", "aria-live": "polite", "aria-busy": "true", children: /* @__PURE__ */ jsxDEV("div", { class: "skel", children: [
              /* @__PURE__ */ jsxDEV("div", { class: "skel-row", children: [
                /* @__PURE__ */ jsxDEV("div", { class: "skel-dot" }),
                /* @__PURE__ */ jsxDEV("div", { class: "skel-line w-70" })
              ] }),
              /* @__PURE__ */ jsxDEV("div", { class: "skel-row", children: [
                /* @__PURE__ */ jsxDEV("div", { class: "skel-dot" }),
                /* @__PURE__ */ jsxDEV("div", { class: "skel-line w-85" })
              ] }),
              /* @__PURE__ */ jsxDEV("div", { class: "skel-row", children: [
                /* @__PURE__ */ jsxDEV("div", { class: "skel-dot" }),
                /* @__PURE__ */ jsxDEV("div", { class: "skel-line w-45" })
              ] })
            ] }) }),
            /* @__PURE__ */ jsxDEV("div", { id: "sms-thread-modal-error", role: "alert" })
          ] }),
          /* @__PURE__ */ jsxDEV("div", { id: "sms-thread-modal-body" })
        ] })
      ] }) }),
      html(_d || (_d = __template(["<script>\nfunction toggleTheme() {\n  var cur = document.documentElement.getAttribute('data-theme');\n  var next = cur === 'dark' ? 'light' : 'dark';\n  document.documentElement.setAttribute('data-theme', next);\n  localStorage.setItem('theme', next);\n  updateThemeLabels(next);\n  if (typeof window.__syncThemeColorMeta === 'function') {\n    window.__syncThemeColorMeta();\n  }\n}\nfunction updateThemeLabels(t) {\n  document.querySelectorAll('.theme-label').forEach(function(el) { el.textContent = t === 'dark' ? 'Light Mode' : 'Dark Mode'; });\n}\nupdateThemeLabels(document.documentElement.getAttribute('data-theme') || 'light');\nwindow.updateThemeLabels = updateThemeLabels;\nrequestAnimationFrame(function(){requestAnimationFrame(function(){document.body.classList.add('ready')})});\n<\/script>"])))
    ] })
  ] });
}, "Layout");

// src/views/components.tsx
var BADGE_STATUSES = /* @__PURE__ */ new Set([
  "created",
  "assigned",
  "enroute",
  "in_progress",
  "complete",
  "cancelled",
  "pending",
  "sent",
  "paid",
  "void",
  "active",
  "inactive",
  "manager",
  "provider",
  "zip",
  "radius",
  "geofence",
  "weekly",
  "biweekly",
  "monthly",
  "new",
  "read",
  "replied",
  "archived",
  "contact",
  "newsletter",
  "registration"
]);
var isBadgeStatus = /* @__PURE__ */ __name((value) => typeof value === "string" && BADGE_STATUSES.has(value.toLowerCase()), "isBadgeStatus");
var isEmptyValue = /* @__PURE__ */ __name((value) => value === null || value === void 0 || value === "" || value === "-", "isEmptyValue");
var mobilePriorityScore = /* @__PURE__ */ __name((label) => {
  const l = label.toLowerCase();
  if (/(amount|price|total|value)/.test(l)) return 100;
  if (/(status|active|state)/.test(l)) return 95;
  if (/(date|time|booked|created|due)/.test(l)) return 90;
  if (/(service|frequency|duration|territory|area|type|role)/.test(l)) return 80;
  if (/(phone|email|from|subject|event)/.test(l)) return 70;
  return 40;
}, "mobilePriorityScore");
var stringifyValue = /* @__PURE__ */ __name((value) => {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return "";
}, "stringifyValue");
var inferFormHints = /* @__PURE__ */ __name((field) => {
  const hints = {};
  const n = field.name.toLowerCase();
  const t = (field.type || "text").toLowerCase();
  if (n === "first_name") hints.autocomplete = "given-name";
  if (n === "last_name") hints.autocomplete = "family-name";
  if (t === "email" || n.includes("email")) {
    hints.autocomplete = hints.autocomplete || "email";
    hints.inputmode = "email";
    hints.autocapitalize = "off";
    hints.spellcheck = "false";
  }
  if (t === "tel" || n.includes("phone") || n.includes("mobile")) {
    hints.autocomplete = hints.autocomplete || "tel";
    hints.inputmode = "tel";
    hints.autocapitalize = "off";
    hints.spellcheck = "false";
  }
  if (n.includes("postal")) {
    hints.autocomplete = "postal-code";
    hints.autocapitalize = "characters";
  }
  if (n === "address_line_1") hints.autocomplete = "address-line1";
  if (n === "address_line_2") hints.autocomplete = "address-line2";
  if (n === "address_city") hints.autocomplete = "address-level2";
  if (n === "address_state") hints.autocomplete = "address-level1";
  if (n.includes("country")) hints.autocomplete = "country-name";
  if (t === "number") {
    const isDecimal = field.step !== void 0 && Number(field.step) !== 1;
    hints.inputmode = isDecimal ? "decimal" : "numeric";
  }
  if (n.includes("search") || n === "q") {
    hints.autocomplete = "off";
    hints.inputmode = "search";
  }
  return hints;
}, "inferFormHints");
var TableView = /* @__PURE__ */ __name(({ title: title3, columns, rows, createUrl, extraActions, detailUrlPrefix, deleteUrlPrefix, rawIds }) => /* @__PURE__ */ jsxDEV(Layout, { title: title3, children: [
  /* @__PURE__ */ jsxDEV("div", { class: "page-header", children: [
    /* @__PURE__ */ jsxDEV("h2", { children: title3 }),
    /* @__PURE__ */ jsxDEV("div", { class: "page-header-actions", children: [
      (extraActions || []).map((action) => /* @__PURE__ */ jsxDEV("a", { href: action.url, class: "uk-btn uk-btn-default uk-btn-sm", "hx-get": action.url, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: action.label }, action.url)),
      createUrl && /* @__PURE__ */ jsxDEV("a", { href: createUrl, class: "uk-btn uk-btn-default uk-btn-sm", "hx-get": createUrl, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: "+ Create New" })
    ] })
  ] }),
  /* @__PURE__ */ jsxDEV("div", { class: "p-8", children: /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: /* @__PURE__ */ jsxDEV("section", { children: rows.length === 0 ? /* @__PURE__ */ jsxDEV("div", { class: "text-center py-12 text-muted-foreground", children: [
    /* @__PURE__ */ jsxDEV("p", { class: "mb-4 text-sm", children: [
      "No ",
      title3.toLowerCase(),
      " found."
    ] }),
    createUrl && /* @__PURE__ */ jsxDEV("a", { href: createUrl, class: "uk-btn uk-btn-default", "hx-get": createUrl, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: "Create your first" })
  ] }) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("div", { class: "grid gap-3 md:hidden", children: rows.map((row, i) => {
      const displayId = typeof row.id === "string" ? row.id : "";
      const actualId = rawIds ? rawIds[i] : displayId;
      const values = Object.values(row);
      const detailUrl = detailUrlPrefix ? `${detailUrlPrefix}/${actualId}` : null;
      const entries = values.map((value, index) => ({
        index,
        label: columns[index] || "Field",
        value
      }));
      const primary = entries[0];
      const statusEntry = entries.find((entry, index) => index > 0 && isBadgeStatus(entry.value));
      const compactMeta = entries.filter((entry) => entry.index !== 0 && entry !== statusEntry && !isEmptyValue(entry.value)).sort((a, b) => mobilePriorityScore(b.label) - mobilePriorityScore(a.label)).slice(0, 2);
      return /* @__PURE__ */ jsxDEV(
        "article",
        {
          class: "border border-border rounded-lg p-3",
          style: "background:var(--bg-card);",
          children: [
            /* @__PURE__ */ jsxDEV("div", { class: "flex items-start justify-between gap-3", children: [
              /* @__PURE__ */ jsxDEV("div", { class: "min-w-0 flex-1", children: detailUrl ? /* @__PURE__ */ jsxDEV(
                "a",
                {
                  href: detailUrl,
                  "hx-get": detailUrl,
                  "hx-target": "#page-content",
                  "hx-select": "#page-content",
                  "hx-push-url": "true",
                  class: "uk-link font-semibold leading-snug block truncate",
                  style: "color:var(--text);",
                  "data-uk-tooltip": typeof primary?.value === "string" && primary.value.length === 8 ? `title: ${actualId}` : void 0,
                  children: primary?.value
                }
              ) : /* @__PURE__ */ jsxDEV("p", { class: "font-semibold leading-snug truncate", children: primary?.value }) }),
              statusEntry && /* @__PURE__ */ jsxDEV("span", { class: "shrink-0", style: "margin-top:1px;", children: /* @__PURE__ */ jsxDEV(StatusBadge, { status: String(statusEntry.value).toLowerCase() }) })
            ] }),
            compactMeta.length > 0 && /* @__PURE__ */ jsxDEV("div", { class: "grid grid-cols-2 gap-2 mt-2", children: compactMeta.map((entry) => /* @__PURE__ */ jsxDEV("div", { class: "min-w-0", children: [
              /* @__PURE__ */ jsxDEV("p", { class: "text-[10px] uppercase tracking-wide text-muted-foreground truncate", children: entry.label }),
              /* @__PURE__ */ jsxDEV("p", { class: "text-xs font-medium truncate", children: stringifyValue(entry.value) || "-" })
            ] }, entry.index)) }),
            !statusEntry && isBadgeStatus(primary?.value) && /* @__PURE__ */ jsxDEV("div", { class: "mt-2", children: /* @__PURE__ */ jsxDEV(StatusBadge, { status: String(primary.value).toLowerCase() }) }),
            compactMeta.length === 0 && entries[1] && !isEmptyValue(entries[1].value) && /* @__PURE__ */ jsxDEV("p", { class: "text-xs text-muted-foreground mt-2 truncate", children: [
              entries[1].label,
              ": ",
              stringifyValue(entries[1].value)
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "flex items-center justify-between gap-2 mt-3", children: [
              detailUrl && /* @__PURE__ */ jsxDEV(
                "a",
                {
                  href: detailUrl,
                  class: "uk-btn uk-btn-default uk-btn-sm",
                  "hx-get": detailUrl,
                  "hx-target": "#page-content",
                  "hx-select": "#page-content",
                  "hx-push-url": "true",
                  children: "View"
                }
              ),
              deleteUrlPrefix && /* @__PURE__ */ jsxDEV(
                "button",
                {
                  type: "button",
                  class: "delete-btn",
                  "data-confirm": "arm",
                  "hx-post": `${deleteUrlPrefix}/${actualId}/delete`,
                  "hx-target": "closest article",
                  "hx-swap": "delete swap:300ms",
                  children: "Delete"
                }
              )
            ] })
          ]
        },
        i
      );
    }) }),
    /* @__PURE__ */ jsxDEV("div", { class: "uk-overflow-auto hidden md:block", children: /* @__PURE__ */ jsxDEV("table", { class: "uk-table uk-table-divider uk-table-hover uk-table-sm w-full text-sm", children: [
      /* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { class: "border-b border-border", children: [
        columns.map((col) => /* @__PURE__ */ jsxDEV("th", { class: "text-left py-3 px-4 font-medium text-muted-foreground", children: col }, col)),
        /* @__PURE__ */ jsxDEV("th", { class: "text-left py-3 px-4 font-medium text-muted-foreground", style: "width: 100px;", children: "Actions" })
      ] }) }),
      /* @__PURE__ */ jsxDEV("tbody", { children: rows.map((row, i) => {
        const displayId = typeof row.id === "string" ? row.id : "";
        const actualId = rawIds ? rawIds[i] : displayId;
        const values = Object.values(row);
        const detailUrl = detailUrlPrefix ? `${detailUrlPrefix}/${actualId}` : null;
        return /* @__PURE__ */ jsxDEV("tr", { class: "border-b border-border hover:bg-muted/50 transition-colors", style: detailUrl ? "cursor: pointer;" : "", children: [
          values.map((val, j) => /* @__PURE__ */ jsxDEV("td", { class: "py-3 px-4", children: j === 0 && detailUrl ? /* @__PURE__ */ jsxDEV(
            "a",
            {
              href: detailUrl,
              "hx-get": detailUrl,
              "hx-target": "#page-content",
              "hx-select": "#page-content",
              "hx-push-url": "true",
              class: "uk-link font-medium text-primary hover:underline",
              "data-uk-tooltip": typeof val === "string" && val.length === 8 ? `title: ${actualId}` : void 0,
              children: val
            }
          ) : isBadgeStatus(val) ? /* @__PURE__ */ jsxDEV(StatusBadge, { status: val.toLowerCase() }) : val }, j)),
          /* @__PURE__ */ jsxDEV("td", { class: "py-3 px-4", children: /* @__PURE__ */ jsxDEV("div", { class: "flex items-center gap-2", children: [
            detailUrl && /* @__PURE__ */ jsxDEV("a", { href: detailUrl, class: "uk-btn uk-btn-default uk-btn-sm", "hx-get": detailUrl, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: "View" }),
            deleteUrlPrefix && /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "button",
                class: "delete-btn",
                "data-confirm": "arm",
                "hx-post": `${deleteUrlPrefix}/${actualId}/delete`,
                "hx-target": "closest tr",
                "hx-swap": "delete swap:300ms",
                children: "Delete"
              }
            )
          ] }) })
        ] }, i);
      }) })
    ] }) })
  ] }) }) }) })
] }), "TableView");
var renderField = /* @__PURE__ */ __name((field) => {
  if (field.readonly) {
    return /* @__PURE__ */ jsxDEV("p", { class: "text-sm py-2 px-3 bg-muted/50 rounded-md", children: String(field.value || "-") });
  }
  const baseProps = {
    id: field.name,
    name: field.name,
    required: field.required,
    placeholder: field.placeholder,
    ...inferFormHints(field),
    ...field.attrs || {}
  };
  switch (field.type) {
    case "textarea":
      return /* @__PURE__ */ jsxDEV("textarea", { ...baseProps, rows: 4, class: "uk-textarea", children: field.value || "" });
    case "select":
      return /* @__PURE__ */ jsxDEV("select", { ...baseProps, class: "uk-select", children: [
        /* @__PURE__ */ jsxDEV("option", { value: "", children: "Select..." }),
        (field.options || []).map((opt) => /* @__PURE__ */ jsxDEV("option", { value: opt.value, selected: field.value === opt.value, children: opt.label }, opt.value))
      ] });
    case "checkbox":
      return /* @__PURE__ */ jsxDEV("div", { class: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "checkbox",
            id: field.name,
            name: field.name,
            checked: Boolean(field.value),
            class: "uk-checkbox"
          }
        ),
        /* @__PURE__ */ jsxDEV("label", { for: field.name, class: "text-sm", children: field.label })
      ] });
    case "number":
      return /* @__PURE__ */ jsxDEV(
        "input",
        {
          type: "number",
          ...baseProps,
          value: field.value ?? "",
          min: field.min,
          max: field.max,
          step: field.step || 1,
          class: "uk-input"
        }
      );
    case "hidden":
      return /* @__PURE__ */ jsxDEV("input", { type: "hidden", ...baseProps, value: field.value ?? "" });
    default:
      return /* @__PURE__ */ jsxDEV(
        "input",
        {
          type: field.type || "text",
          ...baseProps,
          value: field.value ?? "",
          class: "uk-input"
        }
      );
  }
}, "renderField");
var FormView = /* @__PURE__ */ __name(({ title: title3, fields, submitUrl, cancelUrl, isEdit, deleteUrl, error }) => /* @__PURE__ */ jsxDEV(Layout, { title: title3, children: [
  /* @__PURE__ */ jsxDEV("div", { class: "page-header", children: /* @__PURE__ */ jsxDEV("h2", { children: title3 }) }),
  /* @__PURE__ */ jsxDEV("div", { class: "p-8", children: /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", style: "max-width: 720px;", children: /* @__PURE__ */ jsxDEV("section", { children: /* @__PURE__ */ jsxDEV("form", { class: "form", "hx-post": submitUrl, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": cancelUrl, children: [
    error && /* @__PURE__ */ jsxDEV("div", { class: "mb-4 rounded-md border px-3 py-2 text-sm", style: "border-color: #fecaca; background: #fff1f2; color: #b91c1c;", children: error }),
    /* @__PURE__ */ jsxDEV("div", { class: "grid gap-4 sm:grid-cols-2", children: fields.map((field) => {
      if (field.type === "hidden") {
        return /* @__PURE__ */ jsxDEV("div", { children: renderField(field) }, field.name);
      }
      if (field.type === "checkbox") {
        const isChecked = Boolean(field.value);
        return /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label flex items-center gap-2 cursor-pointer sm:col-span-2", children: [
          /* @__PURE__ */ jsxDEV("input", { type: "checkbox", name: field.name, checked: isChecked, role: "switch", "aria-checked": isChecked ? "true" : "false", class: "uk-toggle-switch uk-toggle-switch-primary" }),
          field.label
        ] }, field.name);
      }
      const wide = field.type === "textarea" || field.type === "select";
      return /* @__PURE__ */ jsxDEV("div", { class: `grid gap-2${wide ? " sm:col-span-2" : ""}`, children: [
        /* @__PURE__ */ jsxDEV("label", { for: field.name, class: "uk-form-label", children: [
          field.label,
          field.required && " *"
        ] }),
        renderField(field),
        field.name === "address_line_1" && /* @__PURE__ */ jsxDEV("div", { id: "address-results", class: "mt-2", style: "position: relative;" })
      ] }, field.name);
    }) }),
    /* @__PURE__ */ jsxDEV("div", { class: "flex items-center gap-3 mt-6 sm:col-span-2", children: [
      /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-primary", children: isEdit ? "Update" : "Create" }),
      /* @__PURE__ */ jsxDEV("a", { href: cancelUrl, class: "uk-btn uk-btn-default", "hx-get": cancelUrl, "hx-target": "#page-content", "hx-push-url": "true", children: "Cancel" }),
      deleteUrl && /* @__PURE__ */ jsxDEV("button", { type: "button", class: "delete-btn", "data-confirm": "arm", "hx-post": deleteUrl, style: "margin-left: auto;", children: "Delete" })
    ] })
  ] }) }) }) })
] }), "FormView");
var STATUS_ICON_MAP = {
  created: { cls: "status-icon--neutral", label: "Created" },
  assigned: { cls: "status-icon--neutral", label: "Assigned" },
  enroute: { cls: "status-icon--secondary", label: "En route" },
  in_progress: { cls: "status-icon--secondary", label: "In progress" },
  complete: { cls: "status-icon--primary", label: "Complete" },
  cancelled: { cls: "status-icon--destructive", label: "Cancelled" },
  pending: { cls: "status-icon--secondary", label: "Pending" },
  sent: { cls: "status-icon--neutral", label: "Sent" },
  paid: { cls: "status-icon--primary", label: "Paid" },
  void: { cls: "status-icon--destructive", label: "Void" },
  new: { cls: "status-icon--destructive", label: "New" },
  read: { cls: "status-icon--secondary", label: "Read" },
  replied: { cls: "status-icon--primary", label: "Replied" },
  archived: { cls: "status-icon--neutral", label: "Archived" },
  active: { cls: "status-icon--primary", label: "Active" },
  inactive: { cls: "status-icon--secondary", label: "Inactive" }
};
var svgProps = { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" };
var StatusIconSvg = /* @__PURE__ */ __name(({ status }) => {
  switch (status) {
    case "created":
      return /* @__PURE__ */ jsxDEV("svg", { ...svgProps, children: /* @__PURE__ */ jsxDEV("circle", { cx: "12", cy: "12", r: "9" }) });
    case "assigned":
      return /* @__PURE__ */ jsxDEV("svg", { ...svgProps, children: [
        /* @__PURE__ */ jsxDEV("circle", { cx: "9", cy: "7", r: "4" }),
        /* @__PURE__ */ jsxDEV("path", { d: "M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" }),
        /* @__PURE__ */ jsxDEV("path", { d: "m16 11 2 2 4-4" })
      ] });
    case "enroute":
      return /* @__PURE__ */ jsxDEV("svg", { ...svgProps, children: /* @__PURE__ */ jsxDEV("path", { d: "M5 12h14m-7-7 7 7-7 7" }) });
    case "in_progress":
      return /* @__PURE__ */ jsxDEV("svg", { ...svgProps, children: /* @__PURE__ */ jsxDEV("polygon", { points: "6 3 20 12 6 21 6 3" }) });
    case "complete":
    case "paid":
      return /* @__PURE__ */ jsxDEV("svg", { ...svgProps, children: [
        /* @__PURE__ */ jsxDEV("path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }),
        /* @__PURE__ */ jsxDEV("path", { d: "m22 4-10 10.01-3-3" })
      ] });
    case "cancelled":
      return /* @__PURE__ */ jsxDEV("svg", { ...svgProps, children: [
        /* @__PURE__ */ jsxDEV("circle", { cx: "12", cy: "12", r: "10" }),
        /* @__PURE__ */ jsxDEV("path", { d: "m15 9-6 6m0-6 6 6" })
      ] });
    case "pending":
      return /* @__PURE__ */ jsxDEV("svg", { ...svgProps, children: [
        /* @__PURE__ */ jsxDEV("circle", { cx: "12", cy: "12", r: "10" }),
        /* @__PURE__ */ jsxDEV("path", { d: "M12 6v6l4 2" })
      ] });
    case "sent":
      return /* @__PURE__ */ jsxDEV("svg", { ...svgProps, children: [
        /* @__PURE__ */ jsxDEV("path", { d: "m22 2-7 20-4-9-9-4z" }),
        /* @__PURE__ */ jsxDEV("path", { d: "M22 2 11 13" })
      ] });
    case "void":
      return /* @__PURE__ */ jsxDEV("svg", { ...svgProps, children: [
        /* @__PURE__ */ jsxDEV("circle", { cx: "12", cy: "12", r: "10" }),
        /* @__PURE__ */ jsxDEV("path", { d: "m4.93 4.93 14.14 14.14" })
      ] });
    case "new":
      return /* @__PURE__ */ jsxDEV("svg", { ...svgProps, fill: "currentColor", stroke: "none", children: /* @__PURE__ */ jsxDEV("circle", { cx: "12", cy: "12", r: "5" }) });
    case "read":
      return /* @__PURE__ */ jsxDEV("svg", { ...svgProps, children: /* @__PURE__ */ jsxDEV("path", { d: "M20 6 9 17l-5-5" }) });
    case "replied":
      return /* @__PURE__ */ jsxDEV("svg", { ...svgProps, children: [
        /* @__PURE__ */ jsxDEV("path", { d: "m9 17-5-5 5-5" }),
        /* @__PURE__ */ jsxDEV("path", { d: "M20 18v-2a4 4 0 0 0-4-4H4" })
      ] });
    case "archived":
      return /* @__PURE__ */ jsxDEV("svg", { ...svgProps, children: [
        /* @__PURE__ */ jsxDEV("rect", { x: "2", y: "3", width: "20", height: "5", rx: "1" }),
        /* @__PURE__ */ jsxDEV("path", { d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" }),
        /* @__PURE__ */ jsxDEV("path", { d: "M10 12h4" })
      ] });
    case "active":
      return /* @__PURE__ */ jsxDEV("svg", { ...svgProps, children: /* @__PURE__ */ jsxDEV("path", { d: "M20 6 9 17l-5-5" }) });
    case "inactive":
      return /* @__PURE__ */ jsxDEV("svg", { ...svgProps, children: /* @__PURE__ */ jsxDEV("path", { d: "M18 6 6 18M6 6l12 12" }) });
    default:
      return /* @__PURE__ */ jsxDEV("svg", { ...svgProps, children: /* @__PURE__ */ jsxDEV("circle", { cx: "12", cy: "12", r: "9" }) });
  }
}, "StatusIconSvg");
var StatusIcon = /* @__PURE__ */ __name(({ status }) => {
  const s = status.toLowerCase();
  const info = STATUS_ICON_MAP[s] || { cls: "status-icon--neutral", label: s.replace("_", " ") };
  return /* @__PURE__ */ jsxDEV("span", { class: `status-icon ${info.cls}`, title: info.label, "aria-label": info.label, children: /* @__PURE__ */ jsxDEV(StatusIconSvg, { status: s }) });
}, "StatusIcon");
var BADGE_CLASS_MAP = {
  created: "uk-label",
  assigned: "uk-label",
  enroute: "uk-label uk-label-secondary",
  in_progress: "uk-label uk-label-secondary",
  complete: "uk-label uk-label-primary",
  cancelled: "uk-label uk-label-destructive",
  pending: "uk-label uk-label-secondary",
  sent: "uk-label",
  paid: "uk-label uk-label-primary",
  void: "uk-label uk-label-destructive",
  active: "uk-label uk-label-primary",
  inactive: "uk-label uk-label-secondary",
  manager: "uk-label",
  provider: "uk-label uk-label-secondary",
  zip: "uk-label",
  radius: "uk-label uk-label-secondary",
  geofence: "uk-label uk-label-secondary",
  weekly: "uk-label",
  biweekly: "uk-label uk-label-secondary",
  monthly: "uk-label uk-label-primary",
  new: "uk-label uk-label-destructive",
  read: "uk-label uk-label-secondary",
  replied: "uk-label uk-label-primary",
  archived: "uk-label",
  contact: "uk-label uk-label-primary",
  newsletter: "uk-label uk-label-secondary",
  registration: "uk-label"
};
var StatusBadge = /* @__PURE__ */ __name(({ status }) => {
  const s = status.toLowerCase();
  const hasIcon = s in STATUS_ICON_MAP;
  const label = s.replace("_", " ");
  return /* @__PURE__ */ jsxDEV("span", { class: BADGE_CLASS_MAP[s] || "uk-label", children: [
    hasIcon && /* @__PURE__ */ jsxDEV(StatusIconSvg, { status: s }),
    label
  ] });
}, "StatusBadge");

// src/views/branding.tsx
var BrandingPage = /* @__PURE__ */ __name(({ primaryColor }) => {
  const initialColor = /^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : "#2563eb";
  return /* @__PURE__ */ jsxDEV(Layout, { title: "Branding", children: [
    /* @__PURE__ */ jsxDEV("div", { class: "page-header", children: /* @__PURE__ */ jsxDEV("h2", { children: "Branding" }) }),
    /* @__PURE__ */ jsxDEV("div", { class: "p-8", children: /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: /* @__PURE__ */ jsxDEV("section", { id: "branding-settings", children: /* @__PURE__ */ jsxDEV(
      "form",
      {
        class: "autosave",
        "hx-post": "/admin/branding",
        "hx-swap": "none",
        "hx-trigger": "input delay:500ms, change",
        "hx-sync": "this:queue last",
        children: [
          /* @__PURE__ */ jsxDEV("div", { class: "flex items-center justify-between mb-4", children: [
            /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold", children: "Widget Appearance" }),
            /* @__PURE__ */ jsxDEV("span", { class: "save-indicator" })
          ] }),
          /* @__PURE__ */ jsxDEV("div", { class: "grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-end", children: [
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "widget-primary-color", children: "Widget Primary Colour" }),
              /* @__PURE__ */ jsxDEV(
                "input",
                {
                  id: "widget-primary-color",
                  name: "primaryColor",
                  type: "color",
                  class: "uk-input",
                  value: initialColor
                }
              )
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "widget-primary-color-text", children: "Hex Value" }),
              /* @__PURE__ */ jsxDEV(
                "input",
                {
                  id: "widget-primary-color-text",
                  type: "text",
                  class: "uk-input",
                  value: initialColor,
                  inputmode: "text",
                  maxlength: 7,
                  pattern: "^#[0-9a-fA-F]{6}$"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxDEV("div", { class: "mt-6 grid gap-3", children: [
            /* @__PURE__ */ jsxDEV("span", { class: "uk-form-label mb-0", children: "Live Preview" }),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                id: "widget-primary-color-preview",
                type: "button",
                class: "uk-btn uk-btn-primary",
                style: `background:${initialColor};border-color:${initialColor};`,
                children: "Book Now"
              }
            ),
            /* @__PURE__ */ jsxDEV("p", { class: "text-sm text-muted-foreground mb-0", children: "This is how your booking widget buttons will look." })
          ] })
        ]
      }
    ) }) }) }),
    /* @__PURE__ */ jsxDEV("script", { children: `
        (function() {
          var colorInput = document.getElementById('widget-primary-color');
          var textInput = document.getElementById('widget-primary-color-text');
          var preview = document.getElementById('widget-primary-color-preview');
          if (!colorInput || !textInput || !preview) return;

          function applyColor(value) {
            preview.style.backgroundColor = value;
            preview.style.borderColor = value;
          }

          function normalizeHex(value) {
            if (!value) return '';
            var normalized = String(value).trim();
            if (normalized[0] !== '#') normalized = '#' + normalized;
            return normalized.slice(0, 7);
          }

          colorInput.addEventListener('input', function() {
            var value = colorInput.value;
            textInput.value = value;
            applyColor(value);
          });

          textInput.addEventListener('input', function() {
            var value = normalizeHex(textInput.value);
            textInput.value = value;
            if (/^#[0-9a-fA-F]{6}$/.test(value)) {
              colorInput.value = value;
              applyColor(value);
            }
          });

          textInput.addEventListener('change', function() {
            if (!/^#[0-9a-fA-F]{6}$/.test(textInput.value)) {
              textInput.value = colorInput.value;
            }
            applyColor(colorInput.value);
          });

          applyColor(colorInput.value);
        })();
      ` })
  ] });
}, "BrandingPage");

// src/utils/datetime.ts
var TORONTO_TIME_ZONE = "America/Toronto";
var DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
function parseDateInput(input3) {
  const value = input3 instanceof Date ? input3 : DATE_ONLY_RE.test(input3) ? /* @__PURE__ */ new Date(`${input3}T12:00:00Z`) : new Date(input3);
  return Number.isNaN(value.getTime()) ? null : value;
}
__name(parseDateInput, "parseDateInput");
function formatTorontoDate(input3, options, locale = "en-CA") {
  const parsed = parseDateInput(input3);
  if (!parsed) return null;
  return parsed.toLocaleDateString(locale, { timeZone: TORONTO_TIME_ZONE, ...options });
}
__name(formatTorontoDate, "formatTorontoDate");
function formatTorontoTime(input3, options, locale = "en-CA") {
  const parsed = parseDateInput(input3);
  if (!parsed) return null;
  return parsed.toLocaleTimeString(locale, { timeZone: TORONTO_TIME_ZONE, ...options });
}
__name(formatTorontoTime, "formatTorontoTime");

// src/views/message-detail.tsx
var sourceBadge = /* @__PURE__ */ __name((source) => {
  const cls = {
    contact: "uk-label uk-label-primary",
    newsletter: "uk-label uk-label-secondary",
    registration: "uk-label",
    sms: "uk-label uk-label-secondary"
  };
  return /* @__PURE__ */ jsxDEV("span", { class: cls[source] || "uk-label", children: source });
}, "sourceBadge");
var statusBadge = /* @__PURE__ */ __name((status) => {
  const cls = {
    new: "uk-label uk-label-destructive",
    read: "uk-label uk-label-secondary",
    replied: "uk-label uk-label-primary",
    archived: "uk-label"
  };
  if (status === "read") {
    return /* @__PURE__ */ jsxDEV(StatusIcon, { status: "read" });
  }
  return /* @__PURE__ */ jsxDEV("span", { class: cls[status] || "uk-label", children: status });
}, "statusBadge");
var smsStatusBadge = /* @__PURE__ */ __name((status) => {
  if (status === "sent") {
    return /* @__PURE__ */ jsxDEV("span", { title: "sent", style: "display:inline-flex;align-items:center;opacity:0.88;color:inherit;", children: /* @__PURE__ */ jsxDEV("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", children: /* @__PURE__ */ jsxDEV("path", { d: "M20 6L9 17L4 12" }) }) });
  }
  if (status === "delivered") {
    return /* @__PURE__ */ jsxDEV("span", { title: "delivered", style: "display:inline-flex;align-items:center;opacity:0.94;color:inherit;", children: /* @__PURE__ */ jsxDEV("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", children: [
      /* @__PURE__ */ jsxDEV("path", { d: "M18 7L9 16L6 13" }),
      /* @__PURE__ */ jsxDEV("path", { d: "M22 7L13 16L12 15" })
    ] }) });
  }
  const map = {
    failed: { cls: "uk-label uk-label-destructive", label: "failed" },
    undelivered: { cls: "uk-label uk-label-destructive", label: "undelivered" },
    queued: { cls: "uk-label", label: "queued" },
    received: { cls: "uk-label uk-label-secondary", label: "received" }
  };
  const info = map[status] || { cls: "uk-label", label: status };
  return /* @__PURE__ */ jsxDEV("span", { class: info.cls, style: "font-size:10px;padding:1px 6px;", children: info.label });
}, "smsStatusBadge");
var formatDate = /* @__PURE__ */ __name((d) => {
  if (!d) return "-";
  return formatTorontoDate(`${d}Z`, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) || "-";
}, "formatDate");
var formatTime = /* @__PURE__ */ __name((d) => {
  return formatTorontoTime(`${d}Z`, { hour: "2-digit", minute: "2-digit" }) || d;
}, "formatTime");
var smsBodyText = /* @__PURE__ */ __name((sms) => typeof sms.body === "string" ? sms.body.trim() : "", "smsBodyText");
var SmsHistoryList = /* @__PURE__ */ __name(({
  smsHistory,
  messageId,
  canCreateTask,
  jobOptions,
  selectedJobId,
  completedTaskSmsIds
}) => {
  const completedSet = new Set(completedTaskSmsIds);
  return /* @__PURE__ */ jsxDEV("div", { style: "display:flex;flex-direction:column;gap:8px;", children: smsHistory.length > 0 && smsHistory.filter((sms) => smsBodyText(sms).length > 0).map((sms) => {
    const taskCompleted = completedSet.has(sms.id);
    return /* @__PURE__ */ jsxDEV("div", { style: `display:flex;${sms.direction === "outbound" ? "justify-content:flex-end;" : "justify-content:flex-start;"}`, children: /* @__PURE__ */ jsxDEV("div", { style: `max-width:80%;padding:8px 12px;border-radius:12px;display:flex;flex-direction:column;gap:6px;${sms.direction === "outbound" ? "background:var(--brand,#dc8a78);color:var(--on-brand, #1e1e2e);border:1px solid rgba(0,0,0,0.06);border-bottom-right-radius:4px;" : "background:var(--surface-elevated,#eff1f5);color:var(--text-primary,#333);border:1px solid var(--border,#ccd0da);border-bottom-left-radius:4px;"}`, children: [
      /* @__PURE__ */ jsxDEV("div", { class: "text-sm", style: "white-space:pre-wrap;word-break:break-word;", children: smsBodyText(sms) }),
      /* @__PURE__ */ jsxDEV("div", { style: "display:flex;align-items:center;justify-content:space-between;gap:8px;", children: [
        /* @__PURE__ */ jsxDEV("span", { style: `font-size:11px;opacity:0.7;${sms.direction === "outbound" ? "color:#fff;" : ""}`, children: formatTime(sms.created_at) }),
        /* @__PURE__ */ jsxDEV("div", { style: "display:flex;align-items:center;gap:6px;", children: [
          sms.direction === "outbound" && smsStatusBadge(sms.status),
          sms.direction === "inbound" && canCreateTask && !taskCompleted && /* @__PURE__ */ jsxDEV(
            "button",
            {
              type: "button",
              class: "uk-btn uk-btn-default uk-btn-small",
              "data-sms-task-url": `/admin/inbox/${messageId}/sms-task`,
              "data-sms-log-id": sms.id,
              "data-selected-job-id": selectedJobId || "",
              "data-job-options": JSON.stringify(jobOptions),
              "data-task-suggested-title": smsBodyText(sms).replace(/\s+/g, " ").slice(0, 72),
              "aria-label": "Add task to job",
              title: "Add task to job",
              style: "padding:0;min-height:24px;min-width:24px;width:24px;height:24px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;",
              children: /* @__PURE__ */ jsxDEV("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", children: [
                /* @__PURE__ */ jsxDEV("path", { d: "M12 5V19" }),
                /* @__PURE__ */ jsxDEV("path", { d: "M5 12H19" })
              ] })
            }
          ),
          sms.direction === "inbound" && canCreateTask && taskCompleted && /* @__PURE__ */ jsxDEV(
            "span",
            {
              class: "uk-label uk-label-secondary",
              title: "Task complete",
              style: "padding:0;min-width:24px;height:24px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:rgba(34,197,94,0.14);color:#15803d;border:1px solid rgba(21,128,61,0.35);",
              children: /* @__PURE__ */ jsxDEV("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", children: /* @__PURE__ */ jsxDEV("path", { d: "M20 6L9 17L4 12" }) })
            }
          )
        ] })
      ] })
    ] }) }, sms.id);
  }) });
}, "SmsHistoryList");
var SmsThreadPanel = /* @__PURE__ */ __name(({ messageId, smsHistory, twilioEnabled, phoneE164, customerName, jobOptions, selectedJobId, completedTaskSmsIds, sendResult, taskResult }) => {
  if (!twilioEnabled || !phoneE164) return null;
  const visibleSms = smsHistory.filter((sms) => smsBodyText(sms).length > 0);
  const lastSms = visibleSms.length > 0 ? visibleSms[visibleSms.length - 1] : null;
  const canCreateTask = jobOptions.length > 0;
  return /* @__PURE__ */ jsxDEV("div", { id: "sms-thread-panel", class: "uk-card uk-card-body", children: [
    /* @__PURE__ */ jsxDEV("div", { class: "flex items-start justify-between gap-3 pb-3 mb-3", style: "border-bottom:1px solid var(--border);", "data-sms-thread-header": "1", children: [
      /* @__PURE__ */ jsxDEV("div", { class: "min-w-0", children: [
        /* @__PURE__ */ jsxDEV("p", { class: "text-[11px] uppercase tracking-wide text-muted-foreground", children: "Thread" }),
        customerName && /* @__PURE__ */ jsxDEV("span", { "data-sms-thread-customer-name": "1", style: "display:none;", children: customerName }),
        /* @__PURE__ */ jsxDEV("h3", { class: "text-sm font-semibold truncate", style: "margin-top:2px;", "data-sms-thread-phone": "1", children: phoneE164 }),
        /* @__PURE__ */ jsxDEV("p", { class: "text-xs text-muted-foreground", style: "margin-top:2px;", children: [
          visibleSms.length,
          " message",
          visibleSms.length === 1 ? "" : "s",
          lastSms ? ` \u2022 Last ${formatTime(lastSms.created_at)}` : ""
        ] })
      ] }),
      /* @__PURE__ */ jsxDEV("div", { class: "flex items-center gap-2 shrink-0", children: [
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            class: "uk-btn uk-btn-default uk-btn-sm",
            "data-sms-thread-modal-open": "move",
            "data-sms-thread-modal-title": customerName || "",
            "aria-label": "Open conversation full screen",
            style: "padding:0 10px;",
            children: "Full screen"
          }
        ),
        /* @__PURE__ */ jsxDEV("span", { class: "uk-label uk-label-secondary", children: "Live" })
      ] })
    ] }),
    sendResult && !sendResult.success && /* @__PURE__ */ jsxDEV("div", { class: "text-sm mb-3 px-3 py-2 rounded bg-red-50 text-red-700", "data-sms-send-result": "error", style: "background:rgba(239,68,68,0.1);color:#dc2626;", children: `Failed: ${sendResult.error}` }),
    taskResult && /* @__PURE__ */ jsxDEV(
      "div",
      {
        class: `text-sm mb-3 px-3 py-2 rounded ${taskResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`,
        style: taskResult.success ? "background:rgba(34,197,94,0.1);color:#15803d;" : "background:rgba(239,68,68,0.1);color:#dc2626;",
        children: taskResult.success ? taskResult.message || "Task added to job" : `Task not added: ${taskResult.error}`
      }
    ),
    !canCreateTask && /* @__PURE__ */ jsxDEV("p", { class: "text-xs text-muted-foreground mb-3", style: "margin-top:0;", children: "No jobs found for this customer yet." }),
    /* @__PURE__ */ jsxDEV("div", { "data-sms-thread-body": "1", children: [
      (visibleSms.length > 0 || sendResult) && /* @__PURE__ */ jsxDEV(
        "div",
        {
          id: "sms-history-scroll",
          style: "max-height:400px;overflow-y:auto;padding:8px 0;",
          children: /* @__PURE__ */ jsxDEV(
            "div",
            {
              id: "sms-history",
              "hx-get": `/admin/inbox/${messageId}/sms-thread`,
              "hx-trigger": "load, every 5s",
              "hx-vals": `js:{_ts: Date.now()}`,
              "hx-swap": "innerHTML",
              children: /* @__PURE__ */ jsxDEV(
                SmsHistoryList,
                {
                  smsHistory,
                  messageId,
                  canCreateTask,
                  jobOptions,
                  selectedJobId,
                  completedTaskSmsIds
                }
              )
            }
          )
        }
      ),
      /* @__PURE__ */ jsxDEV(
        "form",
        {
          "hx-post": `/admin/inbox/${messageId}/sms-reply`,
          "hx-target": "#sms-thread-panel",
          "hx-swap": "outerHTML",
          style: "margin-top:12px;display:flex;flex-direction:column;gap:8px;",
          children: [
            /* @__PURE__ */ jsxDEV(
              "textarea",
              {
                name: "sms_body",
                class: "uk-textarea",
                rows: 3,
                placeholder: "Write a reply...",
                style: "resize:vertical;min-height:84px;font-size:16px;",
                maxlength: 1600,
                oninput: "var c=this.value.length;var s=c<=160?1:Math.ceil(c/153);var n=this.form&&this.form.querySelector('[data-sms-counter]');if(n){n.textContent=c+' chars \xB7 '+s+' segment'+(s>1?'s':'');}"
              }
            ),
            /* @__PURE__ */ jsxDEV("div", { class: "flex items-center justify-between gap-3", style: "flex-wrap:wrap;", children: [
              /* @__PURE__ */ jsxDEV("span", { class: "text-xs text-muted-foreground", "data-sms-counter": true, children: "0 chars \xB7 1 segment" }),
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  type: "submit",
                  class: "uk-btn uk-btn-primary uk-btn-sm",
                  "data-sms-send-success": sendResult?.success ? "true" : "false",
                  style: sendResult?.success ? "min-width:110px;background:#16a34a;border-color:#15803d;color:#fff;" : "min-width:110px;",
                  children: "Send"
                }
              )
            ] })
          ]
        }
      )
    ] })
  ] });
}, "SmsThreadPanel");
var MessageDetailPage = /* @__PURE__ */ __name(({ message, smsHistory, twilioEnabled, phoneE164, jobOptions, selectedJobId, completedTaskSmsIds, sendResult, taskResult }) => {
  let meta3 = null;
  if (message.metadata) {
    try {
      meta3 = JSON.parse(message.metadata);
    } catch {
      meta3 = null;
    }
  }
  const senderName = [message.first_name, message.last_name].filter(Boolean).join(" ") || message.email || "Unknown";
  const showMessageBody = Boolean(message.body && message.body.trim().length > 0);
  const hasSmsContent = smsHistory.some((sms) => sms.body && sms.body.trim().length > 0);
  const showSmsPanel = twilioEnabled && !!phoneE164 && (hasSmsContent || !!sendResult || !!taskResult);
  const hasMetaDetails = Boolean(
    meta3 && Object.values(meta3).some((val) => typeof val === "string" && val.trim().length > 0)
  );
  return /* @__PURE__ */ jsxDEV(Layout, { title: `Message \u2014 ${senderName}`, children: [
    /* @__PURE__ */ jsxDEV("div", { class: "page-header", children: [
      /* @__PURE__ */ jsxDEV("div", { class: "page-header-info", children: /* @__PURE__ */ jsxDEV("h2", { style: "white-space:normal;word-break:break-word;", children: senderName }) }),
      /* @__PURE__ */ jsxDEV("div", { class: "page-header-actions", children: [
        message.status !== "archived" && /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            class: "uk-btn uk-btn-default uk-btn-sm",
            "hx-post": `/admin/inbox/${message.id}/archive`,
            "hx-target": "#page-content",
            "hx-select": "#page-content",
            "aria-label": "Archive message",
            title: "Archive message",
            style: "padding:0 10px;",
            children: /* @__PURE__ */ jsxDEV("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", children: [
              /* @__PURE__ */ jsxDEV("rect", { x: "3", y: "4", width: "18", height: "4", rx: "1" }),
              /* @__PURE__ */ jsxDEV("path", { d: "M5 8V20H19V8" }),
              /* @__PURE__ */ jsxDEV("path", { d: "M10 12H14" })
            ] })
          }
        ),
        /* @__PURE__ */ jsxDEV(
          "a",
          {
            href: "/admin/inbox",
            class: "uk-btn uk-btn-default uk-btn-sm",
            "hx-get": "/admin/inbox",
            "hx-target": "#page-content",
            "hx-select": "#page-content",
            "hx-push-url": "true",
            "aria-label": "Back to inbox",
            title: "Back to inbox",
            style: "padding:0 10px;position:relative;",
            children: [
              /* @__PURE__ */ jsxDEV("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", children: /* @__PURE__ */ jsxDEV("path", { d: "M15 18L9 12L15 6" }) }),
              /* @__PURE__ */ jsxDEV("span", { style: "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;", children: "Back to inbox" })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { class: "p-4 md:p-8", style: "padding-bottom:96px;", children: /* @__PURE__ */ jsxDEV("div", { class: "grid gap-4 md:gap-6", style: "max-width: 800px;", children: [
      /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: [
        /* @__PURE__ */ jsxDEV("div", { class: "flex items-start justify-between gap-3 mb-2", children: [
          /* @__PURE__ */ jsxDEV("div", { class: "min-w-0", children: [
            /* @__PURE__ */ jsxDEV("p", { class: "text-[11px] uppercase tracking-wide text-muted-foreground", children: "Sender" }),
            /* @__PURE__ */ jsxDEV("h3", { class: "text-sm font-semibold leading-tight break-words", style: "margin-top:2px;", children: senderName })
          ] }),
          /* @__PURE__ */ jsxDEV("div", { class: "flex flex-wrap justify-end items-center gap-1.5 shrink-0", style: "max-width:52%;", children: [
            sourceBadge(message.source),
            statusBadge(message.status)
          ] })
        ] }),
        /* @__PURE__ */ jsxDEV("p", { class: "text-xs text-muted-foreground", style: "margin-bottom:10px;", children: [
          "Received ",
          formatDate(message.created_at)
        ] }),
        /* @__PURE__ */ jsxDEV("div", { class: "grid gap-1.5 text-sm", children: [
          message.first_name && /* @__PURE__ */ jsxDEV("div", { class: "flex items-start justify-between gap-3 rounded-md px-2.5 py-1.5", style: "background:var(--surface-elevated);", children: [
            /* @__PURE__ */ jsxDEV("span", { class: "text-[11px] uppercase tracking-wide text-muted-foreground", children: "Name" }),
            /* @__PURE__ */ jsxDEV("p", { class: "font-medium leading-tight break-words text-right", children: [
              message.first_name,
              " ",
              message.last_name
            ] })
          ] }),
          message.email && /* @__PURE__ */ jsxDEV("div", { class: "flex items-start justify-between gap-3 rounded-md px-2.5 py-1.5", style: "background:var(--surface-elevated);", children: [
            /* @__PURE__ */ jsxDEV("span", { class: "text-[11px] uppercase tracking-wide text-muted-foreground", children: "Email" }),
            /* @__PURE__ */ jsxDEV("p", { class: "font-medium leading-tight text-right", style: "max-width:70%;", children: /* @__PURE__ */ jsxDEV("a", { href: `mailto:${message.email}`, class: "uk-link break-all", children: message.email }) })
          ] }),
          message.phone && /* @__PURE__ */ jsxDEV("div", { class: "flex items-start justify-between gap-3 rounded-md px-2.5 py-1.5", style: "background:var(--surface-elevated);", children: [
            /* @__PURE__ */ jsxDEV("span", { class: "text-[11px] uppercase tracking-wide text-muted-foreground", children: "Phone" }),
            /* @__PURE__ */ jsxDEV("p", { class: "font-medium leading-tight text-right", children: /* @__PURE__ */ jsxDEV("a", { href: `tel:${message.phone}`, class: "uk-link", children: message.phone }) })
          ] }),
          message.postal_code && /* @__PURE__ */ jsxDEV("div", { class: "flex items-start justify-between gap-3 rounded-md px-2.5 py-1.5", style: "background:var(--surface-elevated);", children: [
            /* @__PURE__ */ jsxDEV("span", { class: "text-[11px] uppercase tracking-wide text-muted-foreground", children: "Postal" }),
            /* @__PURE__ */ jsxDEV("p", { class: "font-medium leading-tight text-right", children: message.postal_code })
          ] }),
          message.reason && /* @__PURE__ */ jsxDEV("div", { class: "flex items-start justify-between gap-3 rounded-md px-2.5 py-1.5", style: "background:var(--surface-elevated);", children: [
            /* @__PURE__ */ jsxDEV("span", { class: "text-[11px] uppercase tracking-wide text-muted-foreground", children: "Reason" }),
            /* @__PURE__ */ jsxDEV("p", { class: "font-medium leading-tight text-right", style: "text-transform: capitalize;", children: message.reason })
          ] })
        ] })
      ] }),
      showMessageBody && /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: [
        /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "Message" }),
        /* @__PURE__ */ jsxDEV("div", { class: "text-sm leading-relaxed whitespace-pre-wrap", style: "color: #333;", children: message.body })
      ] }),
      hasMetaDetails && meta3 && /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: [
        /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "Additional Details" }),
        /* @__PURE__ */ jsxDEV("div", { class: "grid gap-3 sm:grid-cols-2 text-sm", children: [
          meta3.street_address && /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("span", { class: "text-muted-foreground", children: "Street Address" }),
            /* @__PURE__ */ jsxDEV("p", { class: "font-medium", children: meta3.street_address })
          ] }),
          meta3.apt_suite && /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("span", { class: "text-muted-foreground", children: "Apt/Suite" }),
            /* @__PURE__ */ jsxDEV("p", { class: "font-medium", children: meta3.apt_suite })
          ] }),
          meta3.city && /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("span", { class: "text-muted-foreground", children: "City" }),
            /* @__PURE__ */ jsxDEV("p", { class: "font-medium", children: meta3.city })
          ] }),
          meta3.province && /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("span", { class: "text-muted-foreground", children: "Province" }),
            /* @__PURE__ */ jsxDEV("p", { class: "font-medium", children: meta3.province })
          ] }),
          meta3.country && /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("span", { class: "text-muted-foreground", children: "Country" }),
            /* @__PURE__ */ jsxDEV("p", { class: "font-medium", children: meta3.country })
          ] }),
          meta3.company && /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("span", { class: "text-muted-foreground", children: "Company" }),
            /* @__PURE__ */ jsxDEV("p", { class: "font-medium", children: meta3.company })
          ] }),
          meta3.other && /* @__PURE__ */ jsxDEV("div", { class: "sm:col-span-2", children: [
            /* @__PURE__ */ jsxDEV("span", { class: "text-muted-foreground", children: "Other" }),
            /* @__PURE__ */ jsxDEV("p", { class: "font-medium", children: meta3.other })
          ] })
        ] })
      ] }),
      showSmsPanel && /* @__PURE__ */ jsxDEV(
        SmsThreadPanel,
        {
          messageId: message.id,
          smsHistory,
          twilioEnabled,
          phoneE164,
          customerName: senderName,
          jobOptions,
          selectedJobId,
          completedTaskSmsIds,
          sendResult,
          taskResult
        }
      )
    ] }) })
  ] });
}, "MessageDetailPage");

// src/views/dashboard.tsx
var money = /* @__PURE__ */ __name((cents) => `$${(cents / 100).toFixed(2)}`, "money");
var shortDate = /* @__PURE__ */ __name((input3) => {
  return formatTorontoDate(input3, { month: "short", day: "numeric" }) || input3;
}, "shortDate");
var shortTime = /* @__PURE__ */ __name((input3) => {
  const [hourText = "", minuteText = ""] = input3.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return input3;
  const period = hour >= 12 ? "PM" : "AM";
  const clockHour = hour % 12 || 12;
  return `${clockHour}:${String(minute).padStart(2, "0")} ${period}`;
}, "shortTime");
var Dashboard = /* @__PURE__ */ __name(({ stats, upcomingJobs, recentBookings, recentMessages }) => {
  const statCards = [
    { label: "Jobs Today", value: stats.todayJobs },
    { label: "Jobs This Week", value: stats.weekJobs },
    { label: "Total Customers", value: stats.totalCustomers },
    { label: "Active Territories", value: stats.activeTerritories },
    { label: "Active Providers", value: stats.activeProviders },
    { label: "Pending Invoices", value: stats.pendingInvoices }
  ];
  return /* @__PURE__ */ jsxDEV(Layout, { title: "Dashboard", children: [
    /* @__PURE__ */ jsxDEV("div", { class: "page-header", children: [
      /* @__PURE__ */ jsxDEV("h2", { children: "Dashboard" }),
      /* @__PURE__ */ jsxDEV("div", { class: "page-header-actions", children: /* @__PURE__ */ jsxDEV(
        "a",
        {
          href: "/admin/jobs/new",
          class: "uk-btn uk-btn-primary uk-btn-sm",
          "hx-get": "/admin/jobs/new",
          "hx-target": "#page-content",
          "hx-select": "#page-content",
          "hx-push-url": "true",
          children: "+ New Job"
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { class: "p-4 md:p-8", children: /* @__PURE__ */ jsxDEV("div", { class: "grid gap-4 md:gap-6", children: [
      /* @__PURE__ */ jsxDEV("div", { class: "grid grid-cols-2 gap-2.5 md:gap-4 xl:grid-cols-3", children: statCards.map((card) => /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: [
        /* @__PURE__ */ jsxDEV("p", { class: "text-2xl md:text-3xl font-semibold leading-none", children: card.value }),
        /* @__PURE__ */ jsxDEV("p", { class: "text-xs md:text-sm text-muted-foreground mt-1.5 md:mt-2", children: card.label })
      ] }, card.label)) }),
      /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: [
        /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "Upcoming Jobs" }),
        upcomingJobs.length === 0 ? /* @__PURE__ */ jsxDEV("p", { class: "text-sm text-muted-foreground", children: "No upcoming jobs in the next 7 days." }) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
          /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2.5 md:hidden", children: upcomingJobs.map((job) => /* @__PURE__ */ jsxDEV("article", { class: "rounded-md border border-border p-3", children: [
            /* @__PURE__ */ jsxDEV("div", { class: "flex items-start justify-between gap-3", children: [
              /* @__PURE__ */ jsxDEV(
                "a",
                {
                  href: `/admin/jobs/${job.id}`,
                  class: "uk-link font-medium leading-tight min-w-0 flex-1 break-words",
                  "hx-get": `/admin/jobs/${job.id}`,
                  "hx-target": "#page-content",
                  "hx-select": "#page-content",
                  "hx-push-url": "true",
                  children: job.customer_name
                }
              ),
              /* @__PURE__ */ jsxDEV("span", { class: "shrink-0", children: /* @__PURE__ */ jsxDEV(StatusBadge, { status: job.status }) })
            ] }),
            /* @__PURE__ */ jsxDEV("p", { class: "text-xs text-muted-foreground mt-1.5", children: [
              shortDate(job.scheduled_date),
              " at ",
              shortTime(job.scheduled_start_time)
            ] })
          ] }, job.id)) }),
          /* @__PURE__ */ jsxDEV("div", { class: "uk-overflow-auto hidden md:block", children: /* @__PURE__ */ jsxDEV("table", { class: "uk-table uk-table-divider uk-table-hover uk-table-sm w-full text-sm", children: [
            /* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { children: [
              /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Customer" }),
              /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Service" }),
              /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Date" }),
              /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Time" }),
              /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Status" })
            ] }) }),
            /* @__PURE__ */ jsxDEV("tbody", { children: upcomingJobs.map((job) => /* @__PURE__ */ jsxDEV("tr", { children: [
              /* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV(
                "a",
                {
                  href: `/admin/jobs/${job.id}`,
                  class: "uk-link font-medium",
                  "hx-get": `/admin/jobs/${job.id}`,
                  "hx-target": "#page-content",
                  "hx-select": "#page-content",
                  "hx-push-url": "true",
                  children: job.customer_name
                }
              ) }),
              /* @__PURE__ */ jsxDEV("td", { children: job.service_name || "Custom Service" }),
              /* @__PURE__ */ jsxDEV("td", { children: shortDate(job.scheduled_date) }),
              /* @__PURE__ */ jsxDEV("td", { children: job.scheduled_start_time }),
              /* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV(StatusBadge, { status: job.status }) })
            ] }, job.id)) })
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: [
        /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "Recent Bookings" }),
        recentBookings.length === 0 ? /* @__PURE__ */ jsxDEV("p", { class: "text-sm text-muted-foreground", children: "No recent bookings." }) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
          /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2.5 md:hidden", children: recentBookings.map((job) => /* @__PURE__ */ jsxDEV("article", { class: "rounded-md border border-border p-3", children: [
            /* @__PURE__ */ jsxDEV("div", { class: "flex items-start justify-between gap-3", children: [
              /* @__PURE__ */ jsxDEV(
                "a",
                {
                  href: `/admin/jobs/${job.id}`,
                  class: "uk-link font-medium leading-tight min-w-0 flex-1 break-words",
                  "hx-get": `/admin/jobs/${job.id}`,
                  "hx-target": "#page-content",
                  "hx-select": "#page-content",
                  "hx-push-url": "true",
                  children: job.customer_name
                }
              ),
              /* @__PURE__ */ jsxDEV("span", { class: "shrink-0", children: /* @__PURE__ */ jsxDEV(StatusBadge, { status: job.status }) })
            ] }),
            /* @__PURE__ */ jsxDEV("p", { class: "text-xs text-muted-foreground mt-1 truncate", children: job.service_name || "Custom Service" }),
            /* @__PURE__ */ jsxDEV("div", { class: "flex items-center justify-between mt-1.5 text-xs text-muted-foreground", children: [
              /* @__PURE__ */ jsxDEV("span", { children: [
                "Booked ",
                shortDate(job.created_at)
              ] }),
              /* @__PURE__ */ jsxDEV("span", { class: "font-medium text-foreground shrink-0 ml-2", children: money(job.total_price_cents) })
            ] })
          ] }, job.id)) }),
          /* @__PURE__ */ jsxDEV("div", { class: "uk-overflow-auto hidden md:block", children: /* @__PURE__ */ jsxDEV("table", { class: "uk-table uk-table-divider uk-table-hover uk-table-sm w-full text-sm", children: [
            /* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { children: [
              /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Customer" }),
              /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Service" }),
              /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Territory" }),
              /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Status" }),
              /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Booked" }),
              /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Total" })
            ] }) }),
            /* @__PURE__ */ jsxDEV("tbody", { children: recentBookings.map((job) => /* @__PURE__ */ jsxDEV("tr", { children: [
              /* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV(
                "a",
                {
                  href: `/admin/jobs/${job.id}`,
                  class: "uk-link font-medium",
                  "hx-get": `/admin/jobs/${job.id}`,
                  "hx-target": "#page-content",
                  "hx-select": "#page-content",
                  "hx-push-url": "true",
                  children: job.customer_name
                }
              ) }),
              /* @__PURE__ */ jsxDEV("td", { children: job.service_name || "Custom Service" }),
              /* @__PURE__ */ jsxDEV("td", { children: job.territory_name || "-" }),
              /* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV(StatusBadge, { status: job.status }) }),
              /* @__PURE__ */ jsxDEV("td", { children: shortDate(job.created_at) }),
              /* @__PURE__ */ jsxDEV("td", { children: money(job.total_price_cents) })
            ] }, job.id)) })
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: [
        /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "Recent Messages" }),
        recentMessages.length === 0 ? /* @__PURE__ */ jsxDEV("p", { class: "text-sm text-muted-foreground", children: "No recent messages." }) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
          /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2.5 md:hidden", children: recentMessages.map((msg) => /* @__PURE__ */ jsxDEV("article", { class: "rounded-md border border-border p-3", children: [
            /* @__PURE__ */ jsxDEV("div", { class: "flex items-start justify-between gap-3", children: [
              /* @__PURE__ */ jsxDEV(
                "a",
                {
                  href: `/admin/inbox/${msg.id}`,
                  class: `uk-link leading-tight min-w-0 flex-1 break-words ${msg.is_read === 0 ? "font-semibold" : "font-medium"}`,
                  "hx-get": `/admin/inbox/${msg.id}`,
                  "hx-target": "#page-content",
                  "hx-select": "#page-content",
                  "hx-push-url": "true",
                  children: msg.first_name && msg.last_name ? `${msg.first_name} ${msg.last_name}` : msg.email || "Unknown"
                }
              ),
              /* @__PURE__ */ jsxDEV("span", { class: `shrink-0 ${msg.is_read === 0 ? "uk-label" : "uk-label uk-label-primary"}`, children: msg.is_read === 0 ? "Unread" : "Read" })
            ] }),
            /* @__PURE__ */ jsxDEV("p", { class: "text-sm mt-1 truncate min-w-0", children: msg.subject }),
            /* @__PURE__ */ jsxDEV("p", { class: "text-xs text-muted-foreground mt-1.5", children: shortDate(msg.created_at) })
          ] }, msg.id)) }),
          /* @__PURE__ */ jsxDEV("div", { class: "uk-overflow-auto hidden md:block", children: /* @__PURE__ */ jsxDEV("table", { class: "uk-table uk-table-divider uk-table-hover uk-table-sm w-full text-sm", children: [
            /* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { children: [
              /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "From" }),
              /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Subject" }),
              /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Date" }),
              /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Status" })
            ] }) }),
            /* @__PURE__ */ jsxDEV("tbody", { children: recentMessages.map((msg) => /* @__PURE__ */ jsxDEV("tr", { class: msg.is_read === 0 ? "font-semibold" : "", children: [
              /* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV(
                "a",
                {
                  href: `/admin/inbox/${msg.id}`,
                  class: "uk-link font-medium",
                  "hx-get": `/admin/inbox/${msg.id}`,
                  "hx-target": "#page-content",
                  "hx-select": "#page-content",
                  "hx-push-url": "true",
                  children: msg.first_name && msg.last_name ? `${msg.first_name} ${msg.last_name}` : msg.email || "Unknown"
                }
              ) }),
              /* @__PURE__ */ jsxDEV("td", { class: "truncate max-w-xs", children: msg.subject }),
              /* @__PURE__ */ jsxDEV("td", { children: shortDate(msg.created_at) }),
              /* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV("span", { class: msg.is_read === 0 ? "uk-label" : "uk-label uk-label-primary", children: msg.is_read === 0 ? "Unread" : "Read" }) })
            ] }, msg.id)) })
          ] }) })
        ] })
      ] })
    ] }) })
  ] });
}, "Dashboard");

// src/views/job-detail.tsx
var STATUS_OPTIONS = ["created", "assigned", "enroute", "in_progress", "complete", "cancelled"];
var TaskSourceContext = /* @__PURE__ */ __name(({ source }) => {
  if (!source || source.type !== "sms" || !source.excerpt) return null;
  return /* @__PURE__ */ jsxDEV("details", { class: "mt-1.5", children: [
    /* @__PURE__ */ jsxDEV("summary", { class: "text-xs text-muted-foreground cursor-pointer", style: "display:inline-flex;align-items:center;gap:6px;", children: [
      /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: "\u{1F4AC}" }),
      "Message context"
    ] }),
    /* @__PURE__ */ jsxDEV("div", { class: "mt-1 rounded-md border border-border p-2", style: "background:var(--surface-elevated);", children: [
      /* @__PURE__ */ jsxDEV("p", { class: "text-xs", style: "margin:0;white-space:pre-wrap;word-break:break-word;", children: source.excerpt }),
      source.message_id && /* @__PURE__ */ jsxDEV(
        "a",
        {
          href: `/admin/inbox/${source.message_id}`,
          class: "uk-link text-xs",
          "hx-get": `/admin/inbox/${source.message_id}`,
          "hx-target": "#page-content",
          "hx-select": "#page-content",
          "hx-push-url": "true",
          style: "display:inline-block;margin-top:6px;",
          children: "Open thread"
        }
      )
    ] })
  ] });
}, "TaskSourceContext");
var NotesList = /* @__PURE__ */ __name(({
  jobId,
  notes,
  listId = "notes-list"
}) => /* @__PURE__ */ jsxDEV("div", { id: listId, "data-notes-list": "1", children: notes.length === 0 ? /* @__PURE__ */ jsxDEV("p", { class: "text-sm text-muted-foreground", children: "No tasks yet." }) : notes.map((note, idx) => /* @__PURE__ */ jsxDEV("div", { class: `flex items-start gap-3 p-3 border border-border rounded-md ${note.completed ? "opacity-60" : ""}`, children: [
  /* @__PURE__ */ jsxDEV(
    "input",
    {
      type: "checkbox",
      class: "uk-checkbox mt-1",
      checked: note.completed ? true : void 0,
      "hx-post": `/admin/jobs/${jobId}/notes/toggle`,
      "hx-vals": JSON.stringify({ noteIndex: idx }),
      "hx-target": "closest [data-notes-list]",
      "hx-select": "#notes-list > *",
      "hx-swap": "innerHTML"
    }
  ),
  /* @__PURE__ */ jsxDEV("div", { class: "flex-1 min-w-0", children: [
    /* @__PURE__ */ jsxDEV("p", { class: `text-sm ${note.completed ? "line-through text-muted-foreground" : ""}`, children: note.text }),
    /* @__PURE__ */ jsxDEV("p", { class: "text-xs text-muted-foreground mt-1", children: new Date(note.timestamp).toLocaleString() }),
    /* @__PURE__ */ jsxDEV(TaskSourceContext, { source: note.source })
  ] }),
  /* @__PURE__ */ jsxDEV(
    "button",
    {
      type: "button",
      class: "delete-btn uk-btn uk-btn-small",
      "hx-post": `/admin/jobs/${jobId}/notes/delete`,
      "hx-vals": JSON.stringify({ noteIndex: idx }),
      "hx-target": "closest [data-notes-list]",
      "hx-select": "#notes-list > *",
      "hx-swap": "innerHTML",
      "data-confirm": "arm",
      children: "\u2715"
    }
  )
] }, idx)) }), "NotesList");
var SmsThreadCard = /* @__PURE__ */ __name(({ jobId, smsThreadMessage, customerName }) => {
  const hasUnread = !!smsThreadMessage && smsThreadMessage.is_read === 0;
  const updatedLabel = smsThreadMessage ? (/* @__PURE__ */ new Date(`${smsThreadMessage.updated_at}Z`)).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : null;
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      id: "job-sms-thread-card",
      class: "uk-card uk-card-body",
      "hx-get": `/admin/jobs/${jobId}/sms-thread-card`,
      "hx-trigger": "every 8s",
      "hx-swap": "outerHTML",
      children: [
        /* @__PURE__ */ jsxDEV("div", { class: "flex items-center justify-between mb-3", children: [
          /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold", children: "SMS Thread" }),
          hasUnread ? /* @__PURE__ */ jsxDEV("span", { class: "uk-label uk-label-destructive", style: "display:inline-flex;align-items:center;gap:6px;", children: [
            /* @__PURE__ */ jsxDEV("span", { style: "width:6px;height:6px;border-radius:999px;background:currentColor;display:inline-block;" }),
            "New message"
          ] }) : /* @__PURE__ */ jsxDEV("span", { class: "text-xs text-muted-foreground", children: "Up to date" })
        ] }),
        smsThreadMessage ? /* @__PURE__ */ jsxDEV("div", { class: "grid gap-3", children: [
          /* @__PURE__ */ jsxDEV("p", { class: "text-sm text-muted-foreground", style: "margin:0;", children: smsThreadMessage.body ? `Latest: ${smsThreadMessage.body}` : "SMS conversation is linked to this job." }),
          /* @__PURE__ */ jsxDEV("div", { class: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxDEV("span", { class: "text-xs text-muted-foreground", children: updatedLabel ? `Updated ${updatedLabel}` : "" }),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "button",
                class: "uk-btn uk-btn-default uk-btn-sm",
                "data-sms-thread-modal-open": "true",
                "data-sms-thread-modal-title": customerName || "",
                "hx-get": `/admin/inbox/${smsThreadMessage.id}/sms-thread-panel`,
                "hx-target": "#sms-thread-modal-body",
                "hx-swap": "innerHTML",
                "hx-indicator": "#sms-thread-modal-loading",
                "aria-label": "View SMS conversation",
                children: "View SMS"
              }
            )
          ] })
        ] }) : /* @__PURE__ */ jsxDEV("p", { class: "text-sm text-muted-foreground", children: "No SMS conversation linked yet." })
      ]
    }
  );
}, "SmsThreadCard");
var money2 = /* @__PURE__ */ __name((cents) => `$${(cents / 100).toFixed(2)}`, "money");
var JobDetailPage = /* @__PURE__ */ __name(({ job, customer, service, territory, team, assignedProviderId, notes, smsThreadMessage, lineItems }) => {
  const subtotal = lineItems.reduce((sum, line) => sum + line.total_cents, 0);
  const customerName = customer ? `${customer.first_name} ${customer.last_name}`.trim() : "Unassigned customer";
  const serviceName = service?.name || job.custom_service_name || "Custom Service";
  const providerName = assignedProviderId ? (() => {
    const p = team.find((t) => t.id === assignedProviderId);
    return p ? `${p.first_name} ${p.last_name}`.trim() : "Assigned";
  })() : "Unassigned";
  const dateLabel = (() => {
    try {
      const d = /* @__PURE__ */ new Date(`${job.scheduled_date}T00:00:00`);
      return d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
    } catch {
      return job.scheduled_date;
    }
  })();
  const timeLabel = job.scheduled_start_time ? job.scheduled_start_time : "";
  const scheduleLabel = `${dateLabel}${timeLabel ? ` at ${timeLabel}` : ""}`;
  const canOpenSms = Boolean(smsThreadMessage);
  const smsTitle = customer ? `${customer.first_name} ${customer.last_name}`.trim() : "";
  return /* @__PURE__ */ jsxDEV(Layout, { title: `Job ${job.id}`, children: [
    /* @__PURE__ */ jsxDEV("div", { class: "page-header page-header--rich", children: [
      /* @__PURE__ */ jsxDEV("div", { class: "page-header-info", children: [
        /* @__PURE__ */ jsxDEV("div", { class: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxDEV("h2", { children: customerName }),
          /* @__PURE__ */ jsxDEV(StatusIcon, { status: job.status })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { class: "page-header-meta", children: [
          /* @__PURE__ */ jsxDEV("span", { children: serviceName }),
          /* @__PURE__ */ jsxDEV("span", { children: scheduleLabel }),
          /* @__PURE__ */ jsxDEV("span", { children: providerName })
        ] })
      ] }),
      /* @__PURE__ */ jsxDEV("div", { class: "page-header-actions", children: [
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            class: "uk-btn uk-btn-primary uk-btn-sm",
            "data-sms-thread-modal-open": canOpenSms ? "true" : void 0,
            "data-sms-thread-modal-title": canOpenSms ? smsTitle : void 0,
            "hx-get": canOpenSms ? `/admin/inbox/${smsThreadMessage?.id}/sms-thread-panel` : void 0,
            "hx-target": canOpenSms ? "#sms-thread-modal-body" : void 0,
            "hx-swap": canOpenSms ? "innerHTML" : void 0,
            "hx-indicator": canOpenSms ? "#sms-thread-modal-loading" : void 0,
            "aria-disabled": canOpenSms ? "false" : "true",
            disabled: canOpenSms ? void 0 : true,
            children: "Message"
          }
        ),
        /* @__PURE__ */ jsxDEV(
          "form",
          {
            "hx-post": `/admin/jobs/${job.id}/status`,
            "hx-target": "#page-content",
            "hx-select": "#page-content",
            class: "flex items-center gap-2",
            children: [
              /* @__PURE__ */ jsxDEV(
                "select",
                {
                  name: "status",
                  class: "uk-select uk-form-small",
                  "aria-label": "Job status",
                  style: "max-width: 160px;",
                  children: STATUS_OPTIONS.map((status) => /* @__PURE__ */ jsxDEV("option", { value: status, selected: job.status === status, children: status.replace("_", " ") }, status))
                }
              ),
              /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-default uk-btn-sm", children: "Update" })
            ]
          }
        ),
        /* @__PURE__ */ jsxDEV("a", { href: "/admin/jobs", class: "uk-btn uk-btn-default uk-btn-sm", "hx-get": "/admin/jobs", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: "Back" })
      ] })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { class: "p-4 sm:p-8", style: "padding-bottom: calc(24px + var(--safe-bottom));", children: /* @__PURE__ */ jsxDEV("div", { class: "mx-auto", style: "max-width: 1120px;", children: /* @__PURE__ */ jsxDEV("div", { class: "grid gap-4 lg:grid-cols-[1fr,320px] lg:gap-6", children: [
      /* @__PURE__ */ jsxDEV("div", { class: "grid gap-4 sm:gap-6", children: [
        /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", style: "background:var(--surface-0);", children: /* @__PURE__ */ jsxDEV("div", { class: "flex items-start justify-between gap-3", children: [
          /* @__PURE__ */ jsxDEV("div", { class: "min-w-0", children: [
            /* @__PURE__ */ jsxDEV("p", { class: "text-[10px] uppercase tracking-wide text-muted-foreground", children: "Job" }),
            /* @__PURE__ */ jsxDEV("p", { class: "text-base font-semibold", style: "margin:0;", children: job.id.slice(0, 8) }),
            /* @__PURE__ */ jsxDEV("p", { class: "text-xs text-muted-foreground", style: "margin:4px 0 0;", children: [
              "Created ",
              (/* @__PURE__ */ new Date(`${job.created_at}Z`)).toLocaleString()
            ] })
          ] }),
          /* @__PURE__ */ jsxDEV("div", { class: "text-right", children: [
            /* @__PURE__ */ jsxDEV("p", { class: "text-[10px] uppercase tracking-wide text-muted-foreground", children: "Total" }),
            /* @__PURE__ */ jsxDEV("p", { class: "text-2xl font-extrabold", style: "margin:0;", children: money2(job.total_price_cents) }),
            /* @__PURE__ */ jsxDEV("p", { class: "text-xs text-muted-foreground", style: "margin:4px 0 0;", children: [
              lineItems.length,
              " item",
              lineItems.length === 1 ? "" : "s"
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", id: "job-edit-details", style: "scroll-margin-top: 96px;", children: /* @__PURE__ */ jsxDEV("section", { children: /* @__PURE__ */ jsxDEV(
          "form",
          {
            class: "autosave",
            "hx-post": `/admin/jobs/${job.id}`,
            "hx-target": "#page-content",
            "hx-select": "#page-content",
            "hx-swap": "none",
            "hx-trigger": "input delay:500ms, change",
            "hx-sync": "this:queue last",
            children: [
              /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "_section", value: "details" }),
              /* @__PURE__ */ jsxDEV("div", { class: "flex items-center justify-between mb-4", children: [
                /* @__PURE__ */ jsxDEV("div", { class: "min-w-0", children: [
                  /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold", style: "margin:0;", children: "Job details" }),
                  /* @__PURE__ */ jsxDEV("p", { class: "text-xs text-muted-foreground", style: "margin:2px 0 0;", children: "Edits auto-save." })
                ] }),
                /* @__PURE__ */ jsxDEV("span", { class: "save-indicator" })
              ] }),
              /* @__PURE__ */ jsxDEV("div", { class: "grid gap-4 sm:grid-cols-2", children: [
                /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
                  /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "scheduled-date", children: "Date" }),
                  /* @__PURE__ */ jsxDEV("input", { id: "scheduled-date", name: "scheduled_date", type: "date", class: "uk-input", value: job.scheduled_date })
                ] }),
                /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
                  /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "scheduled-time", children: "Start Time" }),
                  /* @__PURE__ */ jsxDEV("input", { id: "scheduled-time", name: "scheduled_start_time", type: "time", class: "uk-input", value: job.scheduled_start_time })
                ] }),
                /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
                  /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "duration", children: "Duration (minutes)" }),
                  /* @__PURE__ */ jsxDEV("input", { id: "duration", name: "duration_minutes", type: "number", min: 1, class: "uk-input", value: job.duration_minutes })
                ] }),
                /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
                  /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "provider-id", children: "Assigned Provider" }),
                  /* @__PURE__ */ jsxDEV("select", { id: "provider-id", name: "provider_id", class: "uk-select", children: [
                    /* @__PURE__ */ jsxDEV("option", { value: "", children: "Unassigned" }),
                    team.map((provider) => /* @__PURE__ */ jsxDEV("option", { value: provider.id, selected: assignedProviderId === provider.id, children: [
                      provider.first_name,
                      " ",
                      provider.last_name
                    ] }, provider.id))
                  ] })
                ] }),
                /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
                  /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "base-price", children: "Base Price ($)" }),
                  /* @__PURE__ */ jsxDEV("input", { id: "base-price", name: "base_price", type: "number", min: 0, step: 0.01, class: "uk-input", value: (job.base_price_cents / 100).toFixed(2) })
                ] }),
                /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
                  /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "total-price", children: "Total Price ($)" }),
                  /* @__PURE__ */ jsxDEV("input", { id: "total-price", name: "total_price", type: "number", min: 0, step: 0.01, class: "uk-input", value: (job.total_price_cents / 100).toFixed(2) })
                ] })
              ] })
            ]
          }
        ) }) }),
        /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", id: "job-status", style: "scroll-margin-top: 96px;", children: /* @__PURE__ */ jsxDEV("section", { children: [
          /* @__PURE__ */ jsxDEV("div", { class: "flex items-center justify-between mb-4", children: [
            /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold", style: "margin:0;", children: "Status" }),
            /* @__PURE__ */ jsxDEV(StatusBadge, { status: job.status })
          ] }),
          /* @__PURE__ */ jsxDEV("form", { "hx-post": `/admin/jobs/${job.id}/status`, "hx-target": "#page-content", "hx-select": "#page-content", class: "grid gap-3 sm:flex sm:items-end", children: [
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 flex-1", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "job-status-select", children: "Job Status" }),
              /* @__PURE__ */ jsxDEV("select", { id: "job-status-select", name: "status", class: "uk-select", children: STATUS_OPTIONS.map((status) => /* @__PURE__ */ jsxDEV("option", { value: status, selected: job.status === status, children: status.replace("_", " ") }, status)) })
            ] }),
            /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-default", children: "Update" })
          ] }),
          /* @__PURE__ */ jsxDEV("div", { class: "mt-4 rounded-md border border-border p-3", style: "background:var(--surface-elevated);", children: [
            /* @__PURE__ */ jsxDEV("p", { class: "text-xs uppercase tracking-wide text-muted-foreground", children: "Pricing subtotal" }),
            /* @__PURE__ */ jsxDEV("p", { class: "text-lg font-semibold", children: money2(subtotal) }),
            /* @__PURE__ */ jsxDEV("p", { class: "text-xs text-muted-foreground", children: [
              lineItems.length,
              " line item",
              lineItems.length === 1 ? "" : "s",
              " in job breakdown"
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body hidden sm:block lg:hidden", children: [
          /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "Customer" }),
          customer ? /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 text-sm", children: [
            /* @__PURE__ */ jsxDEV("p", { class: "font-medium", children: [
              customer.first_name,
              " ",
              customer.last_name
            ] }),
            /* @__PURE__ */ jsxDEV("p", { class: "text-muted-foreground", children: customer.email || "-" }),
            /* @__PURE__ */ jsxDEV("p", { class: "text-muted-foreground", children: customer.phone || "-" }),
            /* @__PURE__ */ jsxDEV("div", { children: /* @__PURE__ */ jsxDEV("a", { href: `/admin/customers/${customer.id}/edit`, class: "uk-link", "hx-get": `/admin/customers/${customer.id}/edit`, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: "Open customer" }) })
          ] }) : /* @__PURE__ */ jsxDEV("p", { class: "text-sm text-muted-foreground", children: "No customer linked." })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { id: "job-sms", children: /* @__PURE__ */ jsxDEV(
          SmsThreadCard,
          {
            jobId: job.id,
            smsThreadMessage,
            customerName: customer ? `${customer.first_name} ${customer.last_name}`.trim() : null
          }
        ) }),
        /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body hidden sm:block lg:hidden", children: [
          /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "Service & Territory" }),
          /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 text-sm", children: [
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("span", { class: "text-muted-foreground", children: "Service:" }),
              " ",
              /* @__PURE__ */ jsxDEV("span", { class: "font-medium", children: service?.name || job.custom_service_name || "Custom Service" })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("span", { class: "text-muted-foreground", children: "Territory:" }),
              " ",
              /* @__PURE__ */ jsxDEV("span", { class: "font-medium", children: territory?.name || "-" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxDEV("details", { class: "uk-card uk-card-body sm:hidden", children: [
          /* @__PURE__ */ jsxDEV("summary", { class: "text-base font-semibold cursor-pointer", children: "Customer" }),
          /* @__PURE__ */ jsxDEV("div", { class: "pt-4", children: customer ? /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 text-sm", children: [
            /* @__PURE__ */ jsxDEV("p", { class: "font-medium", children: [
              customer.first_name,
              " ",
              customer.last_name
            ] }),
            /* @__PURE__ */ jsxDEV("p", { class: "text-muted-foreground", children: customer.email || "-" }),
            /* @__PURE__ */ jsxDEV("p", { class: "text-muted-foreground", children: customer.phone || "-" }),
            /* @__PURE__ */ jsxDEV("div", { children: /* @__PURE__ */ jsxDEV("a", { href: `/admin/customers/${customer.id}/edit`, class: "uk-link", "hx-get": `/admin/customers/${customer.id}/edit`, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: "Open customer" }) })
          ] }) : /* @__PURE__ */ jsxDEV("p", { class: "text-sm text-muted-foreground", children: "No customer linked." }) })
        ] }),
        /* @__PURE__ */ jsxDEV("details", { class: "uk-card uk-card-body sm:hidden", children: [
          /* @__PURE__ */ jsxDEV("summary", { class: "text-base font-semibold cursor-pointer", children: "Service & Territory" }),
          /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 text-sm pt-4", children: [
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("span", { class: "text-muted-foreground", children: "Service:" }),
              " ",
              /* @__PURE__ */ jsxDEV("span", { class: "font-medium", children: service?.name || job.custom_service_name || "Custom Service" })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("span", { class: "text-muted-foreground", children: "Territory:" }),
              " ",
              /* @__PURE__ */ jsxDEV("span", { class: "font-medium", children: territory?.name || "-" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: /* @__PURE__ */ jsxDEV("section", { children: [
          /* @__PURE__ */ jsxDEV("div", { class: "flex items-center justify-between mb-4", children: [
            /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold", style: "margin:0;", children: "Price breakdown" }),
            /* @__PURE__ */ jsxDEV("span", { class: "text-sm font-semibold", children: money2(subtotal) })
          ] }),
          /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 mb-4", children: lineItems.length === 0 ? /* @__PURE__ */ jsxDEV("p", { class: "text-sm text-muted-foreground", children: "No line items yet." }) : lineItems.map((line) => /* @__PURE__ */ jsxDEV("div", { class: "flex items-start gap-3 p-3 border border-border rounded-md", children: [
            /* @__PURE__ */ jsxDEV("div", { class: "flex-1 min-w-0", style: line.parent_id ? "padding-left: 16px;" : "", children: [
              /* @__PURE__ */ jsxDEV("div", { class: "flex items-center gap-2 flex-wrap", children: [
                /* @__PURE__ */ jsxDEV("p", { class: "text-sm font-medium", children: line.description }),
                /* @__PURE__ */ jsxDEV("span", { class: "text-xs text-muted-foreground", children: line.kind })
              ] }),
              /* @__PURE__ */ jsxDEV("p", { class: "text-xs text-muted-foreground", children: [
                line.quantity,
                " x ",
                money2(line.unit_price_cents)
              ] })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "text-right", children: [
              /* @__PURE__ */ jsxDEV("p", { class: "text-sm font-semibold", children: money2(line.total_cents) }),
              line.is_custom === 1 ? /* @__PURE__ */ jsxDEV(
                "button",
                {
                  type: "button",
                  class: "delete-btn uk-btn uk-btn-small",
                  "hx-post": `/admin/jobs/${job.id}/line-items/delete`,
                  "hx-vals": JSON.stringify({ lineId: line.id }),
                  "hx-target": "#page-content",
                  "hx-select": "#page-content",
                  "data-confirm": "arm",
                  children: "Remove"
                }
              ) : null
            ] })
          ] }, line.id)) }),
          /* @__PURE__ */ jsxDEV("form", { "hx-post": `/admin/jobs/${job.id}/line-items/add`, "hx-target": "#page-content", "hx-select": "#page-content", "hx-swap": "innerHTML", class: "grid gap-2 sm:grid-cols-4", children: [
            /* @__PURE__ */ jsxDEV("input", { type: "text", name: "description", class: "uk-input sm:col-span-2", placeholder: "Custom line description", required: true }),
            /* @__PURE__ */ jsxDEV("input", { type: "number", name: "quantity", class: "uk-input", min: 1, step: 1, value: "1", required: true }),
            /* @__PURE__ */ jsxDEV("input", { type: "number", name: "unit_price", class: "uk-input", min: 0, step: 0.01, placeholder: "Unit price", required: true }),
            /* @__PURE__ */ jsxDEV("div", { class: "sm:col-span-4 flex justify-end", children: /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-default", children: "Add Custom Line" }) })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body hidden sm:block", children: /* @__PURE__ */ jsxDEV("section", { children: [
          /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "Task Notes" }),
          /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 mb-4", children: /* @__PURE__ */ jsxDEV(NotesList, { jobId: job.id, notes, listId: "notes-list-desktop" }) }),
          /* @__PURE__ */ jsxDEV(
            "form",
            {
              "hx-post": `/admin/jobs/${job.id}/notes/add`,
              "hx-target": "#notes-list-desktop",
              "hx-select": "#notes-list > *",
              "hx-swap": "innerHTML",
              "hx-on": "htmx:afterRequest: const xhr=event.detail.xhr; if(!xhr||xhr.status<200||xhr.status>=300) return; const input=this.querySelector('input[name=text]'); if(input) input.value=''; const btn=this.querySelector('button[type=submit]'); if(!btn) return; btn.dataset.defaultText=btn.dataset.defaultText||btn.textContent||'Add'; btn.textContent='Task Added'; btn.style.backgroundColor='var(--badge-secondary)'; btn.style.borderColor='var(--badge-secondary)'; btn.style.color='var(--on-brand)'; setTimeout(()=>{ btn.textContent=btn.dataset.defaultText||'Add'; btn.style.backgroundColor=''; btn.style.borderColor=''; btn.style.color=''; }, 1200);",
              class: "flex gap-2",
              children: [
                /* @__PURE__ */ jsxDEV(
                  "input",
                  {
                    type: "text",
                    name: "text",
                    class: "uk-input flex-1",
                    placeholder: "Add a task...",
                    required: true
                  }
                ),
                /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-default", children: "Add" })
              ]
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxDEV(
          "details",
          {
            class: "uk-card uk-card-body sm:hidden",
            "hx-on": "htmx:afterSwap: if(event.detail && event.detail.target && event.detail.target.id === 'notes-list-mobile') this.open = true",
            children: [
              /* @__PURE__ */ jsxDEV("summary", { class: "text-base font-semibold cursor-pointer", children: "Task Notes" }),
              /* @__PURE__ */ jsxDEV("section", { class: "pt-4", children: [
                /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 mb-4", children: /* @__PURE__ */ jsxDEV(NotesList, { jobId: job.id, notes, listId: "notes-list-mobile" }) }),
                /* @__PURE__ */ jsxDEV(
                  "form",
                  {
                    "hx-post": `/admin/jobs/${job.id}/notes/add`,
                    "hx-target": "#notes-list-mobile",
                    "hx-select": "#notes-list > *",
                    "hx-swap": "innerHTML",
                    "hx-on": "htmx:afterRequest: const xhr=event.detail.xhr; if(!xhr||xhr.status<200||xhr.status>=300) return; const input=this.querySelector('input[name=text]'); if(input) input.value=''; const btn=this.querySelector('button[type=submit]'); if(!btn) return; btn.dataset.defaultText=btn.dataset.defaultText||btn.textContent||'Add'; btn.textContent='Task Added'; btn.style.backgroundColor='var(--badge-secondary)'; btn.style.borderColor='var(--badge-secondary)'; btn.style.color='var(--on-brand)'; setTimeout(()=>{ btn.textContent=btn.dataset.defaultText||'Add'; btn.style.backgroundColor=''; btn.style.borderColor=''; btn.style.color=''; }, 1200);",
                    class: "grid gap-2 sm:flex",
                    children: [
                      /* @__PURE__ */ jsxDEV(
                        "input",
                        {
                          type: "text",
                          name: "text",
                          class: "uk-input flex-1",
                          placeholder: "Add a task...",
                          required: true
                        }
                      ),
                      /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-default", children: "Add" })
                    ]
                  }
                )
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxDEV("details", { class: "uk-card uk-card-body hidden sm:block danger-card", children: [
          /* @__PURE__ */ jsxDEV("summary", { class: "text-base font-semibold cursor-pointer", children: "Danger zone" }),
          /* @__PURE__ */ jsxDEV("section", { class: "pt-4", children: /* @__PURE__ */ jsxDEV(
            "button",
            {
              type: "button",
              class: "delete-btn",
              "hx-post": `/admin/jobs/${job.id}/delete`,
              "data-confirm": "arm",
              "hx-target": "#page-content",
              children: "Delete Job"
            }
          ) })
        ] }),
        /* @__PURE__ */ jsxDEV("details", { class: "uk-card uk-card-body sm:hidden", children: [
          /* @__PURE__ */ jsxDEV("summary", { class: "text-base font-semibold cursor-pointer", children: "Delete Job" }),
          /* @__PURE__ */ jsxDEV("section", { class: "pt-4", children: /* @__PURE__ */ jsxDEV(
            "button",
            {
              type: "button",
              class: "delete-btn",
              "hx-post": `/admin/jobs/${job.id}/delete`,
              "data-confirm": "arm",
              "hx-target": "#page-content",
              children: "Delete Job"
            }
          ) })
        ] })
      ] }),
      /* @__PURE__ */ jsxDEV("aside", { class: "hidden lg:block", children: /* @__PURE__ */ jsxDEV("div", { class: "grid gap-4 lg:sticky", style: "top: 92px;", children: [
        /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: [
          /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-3", children: "Customer" }),
          customer ? /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 text-sm", children: [
            /* @__PURE__ */ jsxDEV("p", { class: "font-medium", children: [
              customer.first_name,
              " ",
              customer.last_name
            ] }),
            /* @__PURE__ */ jsxDEV("p", { class: "text-muted-foreground", children: customer.email || "-" }),
            /* @__PURE__ */ jsxDEV("p", { class: "text-muted-foreground", children: customer.phone || "-" }),
            /* @__PURE__ */ jsxDEV("div", { children: /* @__PURE__ */ jsxDEV("a", { href: `/admin/customers/${customer.id}/edit`, class: "uk-link", "hx-get": `/admin/customers/${customer.id}/edit`, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: "Open customer" }) })
          ] }) : /* @__PURE__ */ jsxDEV("p", { class: "text-sm text-muted-foreground", children: "No customer linked." })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: [
          /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-3", children: "Service" }),
          /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 text-sm", children: [
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("p", { class: "text-xs text-muted-foreground", style: "margin:0;", children: "Service" }),
              /* @__PURE__ */ jsxDEV("p", { class: "font-medium", style: "margin:0;", children: service?.name || job.custom_service_name || "Custom Service" })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("p", { class: "text-xs text-muted-foreground", style: "margin:0;", children: "Territory" }),
              /* @__PURE__ */ jsxDEV("p", { class: "font-medium", style: "margin:0;", children: territory?.name || "-" })
            ] })
          ] })
        ] })
      ] }) })
    ] }) }) })
  ] });
}, "JobDetailPage");

// src/views/job-wizard.tsx
var hasStep = /* @__PURE__ */ __name((props) => {
  return "step" in props;
}, "hasStep");
var formatDateChip = /* @__PURE__ */ __name((date) => {
  return formatTorontoDate(date, { weekday: "short", month: "short", day: "numeric" }) || date;
}, "formatDateChip");
var queryFromQuickProps = /* @__PURE__ */ __name((props) => {
  const query = new URLSearchParams();
  if (props.customer?.id) query.set("customer_id", props.customer.id);
  if (props.addressLine1) query.set("address_line1", props.addressLine1);
  if (props.addressCity) query.set("address_city", props.addressCity);
  if (props.addressState) query.set("address_state", props.addressState);
  if (props.addressPostal) query.set("address_postal", props.addressPostal);
  if (props.addressLat) query.set("address_lat", props.addressLat);
  if (props.addressLng) query.set("address_lng", props.addressLng);
  if (props.selectedTerritoryId) query.set("territory_id", props.selectedTerritoryId);
  if (props.selectedServiceId) query.set("service_id", props.selectedServiceId);
  if (props.selectedDate) query.set("date", props.selectedDate);
  if (props.selectedTime) query.set("time", props.selectedTime);
  if (props.selectedProviderId) query.set("provider_id", props.selectedProviderId);
  return query;
}, "queryFromQuickProps");
var statePairs = /* @__PURE__ */ __name((state) => {
  const keys = [
    "customer_id",
    "customer_name",
    "customer_email",
    "address_line1",
    "address_city",
    "address_state",
    "address_postal",
    "address_lat",
    "address_lng",
    "territory_id",
    "territory_name",
    "service_id",
    "service_name",
    "service_price",
    "service_duration",
    "date",
    "time",
    "provider_id"
  ];
  return keys.map((key) => ({ key, value: state[key] || "" }));
}, "statePairs");
var HiddenWizardStateInputs = /* @__PURE__ */ __name(({ state }) => {
  return /* @__PURE__ */ jsxDEV("div", { children: statePairs(state).map((pair) => /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: pair.key, value: pair.value }, pair.key)) });
}, "HiddenWizardStateInputs");
var quickCreateBody = /* @__PURE__ */ __name((props) => {
  const query = queryFromQuickProps(props);
  const selectedService = props.services.find((s) => s.id === props.selectedServiceId);
  return /* @__PURE__ */ jsxDEV("div", { class: "grid gap-6", style: "max-width: 980px;", children: [
    /* @__PURE__ */ jsxDEV("div", { id: "wizard-error-panel", children: props.error && /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", style: "border: 1px solid #fecaca; background: #fff1f2;", children: /* @__PURE__ */ jsxDEV("p", { class: "text-sm", style: "color: #b91c1c;", children: props.error }) }) }),
    /* @__PURE__ */ jsxDEV("div", { id: "wizard-customer-panel", class: "uk-card uk-card-body", children: [
      /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "1. Customer" }),
      /* @__PURE__ */ jsxDEV("div", { class: "grid gap-3 sm:grid-cols-2 items-end", children: [
        /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 sm:col-span-2", children: [
          /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "customer-search", children: "Find Customer" }),
          /* @__PURE__ */ jsxDEV("input", { id: "customer-search", name: "q", class: "uk-input", placeholder: "Search name or email", "hx-get": "/admin/api/customers/search", "hx-trigger": "input changed delay:300ms", "hx-target": "#customer-results", autocomplete: "off", inputmode: "search", autocapitalize: "off", spellcheck: "false" }),
          /* @__PURE__ */ jsxDEV("div", { id: "customer-results" })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { class: "sm:col-span-2 text-sm", children: props.customer ? /* @__PURE__ */ jsxDEV("span", { class: "uk-label", children: [
          props.customer.first_name,
          " ",
          props.customer.last_name,
          " (",
          props.customer.email || "no email",
          ")"
        ] }) : /* @__PURE__ */ jsxDEV("span", { class: "text-muted-foreground", children: "No customer selected." }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { id: "wizard-address-panel", class: "uk-card uk-card-body", children: [
      /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "2. Address" }),
      /* @__PURE__ */ jsxDEV(
        "form",
        {
          "hx-get": "/admin/jobs/new",
          "hx-target": "#page-content",
          "hx-select": "#page-content",
          "hx-push-url": "true",
          class: "grid gap-3",
          children: [
            props.customer?.id && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "customer_id", value: props.customer.id }),
            props.selectedTerritoryId && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "territory_id", value: props.selectedTerritoryId }),
            props.selectedServiceId && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "service_id", value: props.selectedServiceId }),
            props.selectedDate && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "date", value: props.selectedDate }),
            props.selectedTime && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "time", value: props.selectedTime }),
            props.selectedProviderId && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "provider_id", value: props.selectedProviderId }),
            /* @__PURE__ */ jsxDEV("div", { class: "flex flex-wrap items-center justify-between gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "addr-line1", children: "Address" }),
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  type: "button",
                  class: "uk-btn uk-btn-default uk-btn-sm",
                  "data-address-gps-btn": true,
                  "data-address-input": "#addr-line1",
                  "data-address-results": "#address-results",
                  "data-address-lat": "#addr-lat",
                  "data-address-lng": "#addr-lng",
                  children: "Use Current Location"
                }
              )
            ] }),
            /* @__PURE__ */ jsxDEV("input", { id: "addr-line1", name: "address_line1", class: "uk-input", value: props.addressLine1 || "", placeholder: "Start typing address", "hx-get": "/admin/api/address/search", "hx-trigger": "input changed delay:300ms", "hx-target": "#address-results", "hx-select": ".search-results", "hx-push-url": "false", autocomplete: "address-line1" }),
            /* @__PURE__ */ jsxDEV("input", { id: "addr-city", type: "hidden", name: "address_city", value: props.addressCity || "" }),
            /* @__PURE__ */ jsxDEV("input", { id: "addr-state", type: "hidden", name: "address_state", value: props.addressState || "" }),
            /* @__PURE__ */ jsxDEV("input", { id: "addr-postal", type: "hidden", name: "address_postal", value: props.addressPostal || "" }),
            /* @__PURE__ */ jsxDEV("input", { id: "addr-lat", type: "hidden", name: "address_lat", value: props.addressLat || "" }),
            /* @__PURE__ */ jsxDEV("input", { id: "addr-lng", type: "hidden", name: "address_lng", value: props.addressLng || "" }),
            /* @__PURE__ */ jsxDEV("div", { id: "address-results" }),
            /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-default", style: "width: fit-content;", children: "Use Address" })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxDEV("div", { id: "wizard-territory-panel", class: "uk-card uk-card-body", children: [
      /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "3. Territory" }),
      /* @__PURE__ */ jsxDEV("form", { "hx-get": "/admin/jobs/new", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", class: "grid gap-3", children: [
        props.customer?.id && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "customer_id", value: props.customer.id }),
        props.addressLine1 && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_line1", value: props.addressLine1 }),
        props.addressCity && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_city", value: props.addressCity }),
        props.addressState && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_state", value: props.addressState }),
        props.addressPostal && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_postal", value: props.addressPostal }),
        props.addressLat && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_lat", value: props.addressLat }),
        props.addressLng && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_lng", value: props.addressLng }),
        props.selectedServiceId && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "service_id", value: props.selectedServiceId }),
        props.selectedDate && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "date", value: props.selectedDate }),
        props.selectedTime && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "time", value: props.selectedTime }),
        props.selectedProviderId && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "provider_id", value: props.selectedProviderId }),
        /* @__PURE__ */ jsxDEV("select", { name: "territory_id", class: "uk-select", required: true, children: [
          /* @__PURE__ */ jsxDEV("option", { value: "", children: "Select territory..." }),
          props.territories.map((t) => /* @__PURE__ */ jsxDEV("option", { value: t.id, selected: props.selectedTerritoryId === t.id, children: t.name }, t.id))
        ] }),
        /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-default", style: "width: fit-content;", children: "Select Territory" })
      ] })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { id: "wizard-service-panel", class: "uk-card uk-card-body", children: [
      /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "4. Service" }),
      /* @__PURE__ */ jsxDEV("form", { "hx-get": "/admin/jobs/new", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", class: "grid gap-3", children: [
        props.customer?.id && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "customer_id", value: props.customer.id }),
        props.addressLine1 && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_line1", value: props.addressLine1 }),
        props.addressCity && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_city", value: props.addressCity }),
        props.addressState && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_state", value: props.addressState }),
        props.addressPostal && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_postal", value: props.addressPostal }),
        props.addressLat && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_lat", value: props.addressLat }),
        props.addressLng && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_lng", value: props.addressLng }),
        props.selectedTerritoryId && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "territory_id", value: props.selectedTerritoryId }),
        props.selectedDate && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "date", value: props.selectedDate }),
        props.selectedTime && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "time", value: props.selectedTime }),
        props.selectedProviderId && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "provider_id", value: props.selectedProviderId }),
        /* @__PURE__ */ jsxDEV("select", { name: "service_id", class: "uk-select", required: true, children: [
          /* @__PURE__ */ jsxDEV("option", { value: "", children: "Select service..." }),
          props.services.map((s) => /* @__PURE__ */ jsxDEV("option", { value: s.id, selected: props.selectedServiceId === s.id, children: s.name }, s.id))
        ] }),
        selectedService && /* @__PURE__ */ jsxDEV("p", { class: "text-sm text-muted-foreground", children: [
          selectedService.base_duration_minutes,
          " min \u2022 $",
          (selectedService.base_price_cents / 100).toFixed(2)
        ] }),
        /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-default", style: "width: fit-content;", children: "Select Service" })
      ] })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { id: "wizard-date-panel", class: "uk-card uk-card-body", children: [
      /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "5. Date" }),
      /* @__PURE__ */ jsxDEV("div", { class: "flex flex-wrap gap-2", children: props.dates.map((date) => {
        const q = new URLSearchParams(query);
        q.set("date", date);
        q.delete("time");
        q.delete("provider_id");
        const active = props.selectedDate === date;
        return /* @__PURE__ */ jsxDEV(
          "a",
          {
            href: `/admin/jobs/new?${q.toString()}`,
            class: active ? "uk-btn uk-btn-primary uk-btn-sm" : "uk-btn uk-btn-default uk-btn-sm",
            "hx-get": `/admin/jobs/new?${q.toString()}`,
            "hx-target": "#page-content",
            "hx-select": "#page-content",
            "hx-push-url": "true",
            children: formatDateChip(date)
          },
          date
        );
      }) })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { id: "wizard-time-panel", class: "uk-card uk-card-body", children: [
      /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "6. Time" }),
      props.timeslots.length === 0 ? /* @__PURE__ */ jsxDEV("p", { class: "text-sm text-muted-foreground", children: "Select a service and date first." }) : /* @__PURE__ */ jsxDEV("div", { class: "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2", children: props.timeslots.map((time) => {
        const q = new URLSearchParams(query);
        q.set("time", time);
        q.delete("provider_id");
        const active = props.selectedTime === time;
        return /* @__PURE__ */ jsxDEV(
          "a",
          {
            href: `/admin/jobs/new?${q.toString()}`,
            class: active ? "uk-btn uk-btn-primary uk-btn-sm" : "uk-btn uk-btn-default uk-btn-sm",
            "hx-get": `/admin/jobs/new?${q.toString()}`,
            "hx-target": "#page-content",
            "hx-select": "#page-content",
            "hx-push-url": "true",
            children: time
          },
          time
        );
      }) })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { id: "wizard-provider-panel", class: "uk-card uk-card-body", children: [
      /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "7. Provider" }),
      /* @__PURE__ */ jsxDEV("form", { "hx-get": "/admin/jobs/new", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", class: "grid gap-3", children: [
        props.customer?.id && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "customer_id", value: props.customer.id }),
        props.addressLine1 && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_line1", value: props.addressLine1 }),
        props.addressCity && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_city", value: props.addressCity }),
        props.addressState && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_state", value: props.addressState }),
        props.addressPostal && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_postal", value: props.addressPostal }),
        props.addressLat && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_lat", value: props.addressLat }),
        props.addressLng && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_lng", value: props.addressLng }),
        props.selectedTerritoryId && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "territory_id", value: props.selectedTerritoryId }),
        props.selectedServiceId && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "service_id", value: props.selectedServiceId }),
        props.selectedDate && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "date", value: props.selectedDate }),
        props.selectedTime && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "time", value: props.selectedTime }),
        /* @__PURE__ */ jsxDEV("select", { name: "provider_id", class: "uk-select", children: [
          /* @__PURE__ */ jsxDEV("option", { value: "", children: "Auto-assign later" }),
          props.providers.map((p) => /* @__PURE__ */ jsxDEV("option", { value: p.id, selected: props.selectedProviderId === p.id, children: [
            p.first_name,
            " ",
            p.last_name,
            " ",
            p.is_available ? "" : "(unavailable)"
          ] }, p.id))
        ] }),
        /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-default", style: "width: fit-content;", children: "Select Provider" })
      ] })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { id: "wizard-submit-panel", class: "uk-card uk-card-body", children: [
      /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "8. Create Job" }),
      /* @__PURE__ */ jsxDEV("form", { "hx-post": "/admin/jobs/quick-create", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", class: "grid gap-3", children: [
        /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "customer_id", value: props.customer?.id || "" }),
        /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_line1", value: props.addressLine1 || "" }),
        /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_city", value: props.addressCity || "" }),
        /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_state", value: props.addressState || "" }),
        /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_postal", value: props.addressPostal || "" }),
        /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_lat", value: props.addressLat || "" }),
        /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "address_lng", value: props.addressLng || "" }),
        /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "territory_id", value: props.selectedTerritoryId || "" }),
        /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "service_id", value: props.selectedServiceId || "" }),
        /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "date", value: props.selectedDate || "" }),
        /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "time", value: props.selectedTime || "" }),
        /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "provider_id", value: props.selectedProviderId || "" }),
        /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-primary", children: "Create Job" })
      ] })
    ] }),
    /* @__PURE__ */ jsxDEV("script", { children: `
        (function () {
          if (window.__jobWizardCustomerBind) return;
          window.__jobWizardCustomerBind = true;
          document.addEventListener('click', function (e) {
            var item = e.target.closest('.customer-result');
            if (!item) return;
            var data = item.dataset;
            var params = new URLSearchParams(window.location.search);
            if (data.id) params.set('customer_id', data.id);
            if (params.get('error')) params.delete('error');
            var url = '/admin/jobs/new?' + params.toString();
            if (window.htmx) {
              window.htmx.ajax('GET', url, { target: '#page-content', swap: 'innerHTML' });
              window.history.pushState({}, '', url);
            } else {
              window.location.href = url;
            }
          });
        })();
      ` })
  ] });
}, "quickCreateBody");
var wizardFlowBody = /* @__PURE__ */ __name((props) => {
  return /* @__PURE__ */ jsxDEV("div", { class: "grid gap-6", style: "max-width: 800px;", children: [
    props.error && /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", style: "border: 1px solid #fecaca; background: #fff1f2;", children: /* @__PURE__ */ jsxDEV("p", { class: "text-sm", style: "color: #b91c1c;", children: props.error }) }),
    props.step === 1 && /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: [
      /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "Step 1: Customer & Address" }),
      /* @__PURE__ */ jsxDEV("form", { "hx-post": "/admin/jobs/wizard/step1-address", "hx-target": "#page-content", "hx-select": "#page-content", class: "grid gap-4", children: [
        /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "customer_id", value: props.state.customer_id || props.customer?.id || "" }),
        /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "customer_name", value: props.state.customer_name || `${props.customer?.first_name || ""} ${props.customer?.last_name || ""}`.trim() }),
        /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "customer_email", value: props.state.customer_email || props.customer?.email || "" }),
        /* @__PURE__ */ jsxDEV("div", { class: "text-sm", children: [
          /* @__PURE__ */ jsxDEV("span", { class: "text-muted-foreground", children: "Customer:" }),
          " ",
          /* @__PURE__ */ jsxDEV("span", { class: "font-medium", children: props.state.customer_name || `${props.customer?.first_name || ""} ${props.customer?.last_name || ""}`.trim() || "Unknown" })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
          /* @__PURE__ */ jsxDEV("div", { class: "flex flex-wrap items-center justify-between gap-2", children: [
            /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "wizard-address", children: "Address line 1" }),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "button",
                class: "uk-btn uk-btn-default uk-btn-sm",
                "data-address-gps-btn": true,
                "data-address-input": "#wizard-address",
                "data-address-results": "#address-results",
                "data-address-lat": "#addr-lat",
                "data-address-lng": "#addr-lng",
                children: "Use Current Location"
              }
            )
          ] }),
          /* @__PURE__ */ jsxDEV("input", { id: "wizard-address", name: "address_line1", class: "uk-input", value: props.state.address_line1 || "", "hx-get": "/admin/api/address/search", "hx-trigger": "input changed delay:300ms", "hx-target": "#address-results", "hx-select": ".search-results", "hx-push-url": "false", autocomplete: "address-line1" }),
          /* @__PURE__ */ jsxDEV("div", { id: "address-results" })
        ] }),
        /* @__PURE__ */ jsxDEV("input", { id: "addr-city", type: "hidden", name: "address_city", value: props.state.address_city || "" }),
        /* @__PURE__ */ jsxDEV("input", { id: "addr-state", type: "hidden", name: "address_state", value: props.state.address_state || "" }),
        /* @__PURE__ */ jsxDEV("input", { id: "addr-postal", type: "hidden", name: "address_postal", value: props.state.address_postal || "" }),
        /* @__PURE__ */ jsxDEV("input", { id: "addr-lat", type: "hidden", name: "address_lat", value: props.state.address_lat || "" }),
        /* @__PURE__ */ jsxDEV("input", { id: "addr-lng", type: "hidden", name: "address_lng", value: props.state.address_lng || "" }),
        /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-primary", children: "Continue" })
      ] })
    ] }),
    props.step === 2 && /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: [
      /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "Step 2: Service" }),
      /* @__PURE__ */ jsxDEV("form", { "hx-post": "/admin/jobs/wizard/step3", "hx-target": "#page-content", "hx-select": "#page-content", class: "grid gap-4", children: [
        /* @__PURE__ */ jsxDEV(HiddenWizardStateInputs, { state: props.state }),
        /* @__PURE__ */ jsxDEV("input", { id: "wizard-service-name", type: "hidden", name: "service_name", value: props.state.service_name || "" }),
        /* @__PURE__ */ jsxDEV("input", { id: "wizard-service-price", type: "hidden", name: "service_price", value: props.state.service_price || "" }),
        /* @__PURE__ */ jsxDEV("input", { id: "wizard-service-duration", type: "hidden", name: "service_duration", value: props.state.service_duration || "" }),
        /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
          /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "wizard-service-id", children: "Select Service" }),
          /* @__PURE__ */ jsxDEV("select", { id: "wizard-service-id", name: "service_id", class: "uk-select", required: true, children: [
            /* @__PURE__ */ jsxDEV("option", { value: "", children: "Select..." }),
            (props.services || []).map((service) => /* @__PURE__ */ jsxDEV("option", { value: service.id, selected: props.state.service_id === service.id, "data-name": service.name, "data-price": String(service.base_price_cents), "data-duration": String(service.base_duration_minutes), children: [
              service.name,
              " ($",
              (service.base_price_cents / 100).toFixed(2),
              ", ",
              service.base_duration_minutes,
              "m)"
            ] }, service.id))
          ] })
        ] }),
        /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-primary", children: "Continue" }),
        /* @__PURE__ */ jsxDEV("script", { children: `
              (function () {
                var select = document.getElementById('wizard-service-id');
                var nameEl = document.getElementById('wizard-service-name');
                var priceEl = document.getElementById('wizard-service-price');
                var durationEl = document.getElementById('wizard-service-duration');
                if (!select || !nameEl || !priceEl || !durationEl) return;
                function sync() {
                  var opt = select.options[select.selectedIndex];
                  nameEl.value = opt ? (opt.getAttribute('data-name') || '') : '';
                  priceEl.value = opt ? (opt.getAttribute('data-price') || '') : '';
                  durationEl.value = opt ? (opt.getAttribute('data-duration') || '') : '';
                }
                select.addEventListener('change', sync);
                sync();
              })();
            ` })
      ] })
    ] }),
    props.step === 3 && /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: [
      /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "Step 3: Date & Time" }),
      /* @__PURE__ */ jsxDEV("form", { "hx-post": "/admin/jobs/wizard/step4", "hx-target": "#page-content", "hx-select": "#page-content", class: "grid gap-4", children: [
        /* @__PURE__ */ jsxDEV(HiddenWizardStateInputs, { state: props.state }),
        /* @__PURE__ */ jsxDEV("div", { class: "grid gap-3 sm:grid-cols-2", children: [
          /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
            /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "wizard-date", children: "Date" }),
            /* @__PURE__ */ jsxDEV("input", { id: "wizard-date", type: "date", name: "date", class: "uk-input", value: props.state.date || "", required: true })
          ] }),
          /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
            /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "wizard-time", children: "Time" }),
            /* @__PURE__ */ jsxDEV("select", { id: "wizard-time", name: "time", class: "uk-select", required: true, children: [
              /* @__PURE__ */ jsxDEV("option", { value: "", children: "Select..." }),
              (props.timeslots || []).map((slot) => /* @__PURE__ */ jsxDEV("option", { value: slot.start_time, selected: props.state.time === slot.start_time, children: [
                slot.date,
                " ",
                slot.start_time,
                " ",
                slot.available ? "" : "(unavailable)"
              ] }, `${slot.date}-${slot.start_time}`))
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-primary", children: "Continue" })
      ] })
    ] }),
    props.step === 4 && /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: [
      /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "Step 4: Provider" }),
      /* @__PURE__ */ jsxDEV("form", { "hx-post": "/admin/jobs/create", "hx-target": "#page-content", "hx-select": "#page-content", class: "grid gap-4", children: [
        /* @__PURE__ */ jsxDEV(HiddenWizardStateInputs, { state: props.state }),
        /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
          /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "wizard-provider", children: "Provider" }),
          /* @__PURE__ */ jsxDEV("select", { id: "wizard-provider", name: "provider_id", class: "uk-select", children: [
            /* @__PURE__ */ jsxDEV("option", { value: "", children: "Auto-assign later" }),
            (props.providers || []).map((provider) => /* @__PURE__ */ jsxDEV("option", { value: provider.id, selected: props.state.provider_id === provider.id, children: [
              provider.first_name,
              " ",
              provider.last_name,
              " ",
              provider.is_available ? "" : "(unavailable)"
            ] }, provider.id))
          ] })
        ] }),
        /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-primary", children: "Create Job" })
      ] })
    ] })
  ] });
}, "wizardFlowBody");
var JobWizardPage = /* @__PURE__ */ __name((props) => {
  const title3 = hasStep(props) ? `New Job - Step ${props.step}` : "Create Job";
  return /* @__PURE__ */ jsxDEV(Layout, { title: title3, children: [
    /* @__PURE__ */ jsxDEV("div", { class: "page-header", children: [
      /* @__PURE__ */ jsxDEV("div", { class: "page-header-info", children: [
        /* @__PURE__ */ jsxDEV("h2", { children: title3 }),
        hasStep(props) && /* @__PURE__ */ jsxDEV("div", { class: "wizard-progress", style: "margin-top:4px;", children: [1, 2, 3, 4].map((s) => /* @__PURE__ */ jsxDEV("div", { class: `wizard-progress-step${s < props.step ? " is-done" : ""}${s === props.step ? " is-active" : ""}` }, s)) })
      ] }),
      /* @__PURE__ */ jsxDEV("div", { class: "page-header-actions", children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/jobs", class: "uk-btn uk-btn-default uk-btn-sm", "hx-get": "/admin/jobs", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: "Back" }) })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { class: "p-8", children: hasStep(props) ? wizardFlowBody(props) : quickCreateBody(props) })
  ] });
}, "JobWizardPage");
var JobWizardSwapBundle = /* @__PURE__ */ __name(({ props, targetId }) => {
  if (hasStep(props)) {
    return wizardFlowBody(props);
  }
  const body = quickCreateBody(props);
  if (targetId === "wizard-customer-panel") return /* @__PURE__ */ jsxDEV("div", { id: "wizard-customer-panel", children: body });
  if (targetId === "wizard-address-panel") return /* @__PURE__ */ jsxDEV("div", { id: "wizard-address-panel", children: body });
  if (targetId === "wizard-territory-panel") return /* @__PURE__ */ jsxDEV("div", { id: "wizard-territory-panel", children: body });
  if (targetId === "wizard-service-panel") return /* @__PURE__ */ jsxDEV("div", { id: "wizard-service-panel", children: body });
  if (targetId === "wizard-date-panel") return /* @__PURE__ */ jsxDEV("div", { id: "wizard-date-panel", children: body });
  if (targetId === "wizard-time-panel") return /* @__PURE__ */ jsxDEV("div", { id: "wizard-time-panel", children: body });
  if (targetId === "wizard-provider-panel") return /* @__PURE__ */ jsxDEV("div", { id: "wizard-provider-panel", children: body });
  if (targetId === "wizard-submit-panel") return /* @__PURE__ */ jsxDEV("div", { id: "wizard-submit-panel", children: body });
  if (targetId === "wizard-error-panel") return /* @__PURE__ */ jsxDEV("div", { id: "wizard-error-panel", children: body });
  return body;
}, "JobWizardSwapBundle");
var CustomerSearchResults = /* @__PURE__ */ __name(({ customers }) => {
  if (!customers.length) {
    return /* @__PURE__ */ jsxDEV("div", { class: "search-results", children: /* @__PURE__ */ jsxDEV("div", { class: "search-item text-muted-foreground", children: "No customers found." }) });
  }
  return /* @__PURE__ */ jsxDEV("div", { class: "search-results", children: customers.map((customer) => /* @__PURE__ */ jsxDEV(
    "div",
    {
      class: "search-item customer-result",
      "data-id": customer.id,
      "data-name": `${customer.first_name} ${customer.last_name}`,
      "data-email": customer.email || "",
      children: [
        /* @__PURE__ */ jsxDEV("div", { class: "name", children: [
          customer.first_name,
          " ",
          customer.last_name
        ] }),
        /* @__PURE__ */ jsxDEV("div", { class: "meta", children: customer.email || "No email" })
      ]
    },
    customer.id
  )) });
}, "CustomerSearchResults");
var AddressSearchResults = /* @__PURE__ */ __name(({
  results,
  targetPrefix
}) => {
  if (!results.length) {
    return /* @__PURE__ */ jsxDEV("div", { class: "search-results", children: /* @__PURE__ */ jsxDEV("div", { class: "search-item text-muted-foreground", children: "No addresses found." }) });
  }
  return /* @__PURE__ */ jsxDEV("div", { class: "search-results", children: results.map((result, i) => /* @__PURE__ */ jsxDEV(
    "div",
    {
      class: "search-item address-result",
      "data-prefix": targetPrefix || "addr",
      "data-line1": result.line1,
      "data-city": result.city,
      "data-state": result.state,
      "data-postal": result.postal,
      "data-lat": result.lat,
      "data-lng": result.lng,
      children: [
        /* @__PURE__ */ jsxDEV("div", { class: "name", children: result.display || result.line1 }),
        /* @__PURE__ */ jsxDEV("div", { class: "meta", children: [
          result.city,
          result.state ? `, ${result.state}` : "",
          " ",
          result.postal
        ] })
      ]
    },
    `${result.display}-${i}`
  )) });
}, "AddressSearchResults");
var parseWizardState = /* @__PURE__ */ __name((body) => {
  const get = /* @__PURE__ */ __name((key) => {
    const value = body[key];
    return typeof value === "string" ? value : void 0;
  }, "get");
  return {
    customer_id: get("customer_id"),
    customer_name: get("customer_name"),
    customer_email: get("customer_email"),
    address_line1: get("address_line1"),
    address_city: get("address_city"),
    address_state: get("address_state"),
    address_postal: get("address_postal"),
    address_lat: get("address_lat"),
    address_lng: get("address_lng"),
    territory_id: get("territory_id"),
    territory_name: get("territory_name"),
    service_id: get("service_id"),
    service_name: get("service_name"),
    service_price: get("service_price"),
    service_duration: get("service_duration"),
    date: get("date"),
    time: get("time"),
    provider_id: get("provider_id")
  };
}, "parseWizardState");

// src/views/provider-detail.tsx
var DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var ProviderDetailPage = /* @__PURE__ */ __name(({ member, weeklyHours, dateOverrides, skills, allSkills, territories }) => {
  const hourMap = /* @__PURE__ */ new Map();
  for (const row of weeklyHours) hourMap.set(row.day_of_week, { start_time: row.start_time, end_time: row.end_time });
  const assignedTerritories = territories.filter((t) => t.assigned);
  return /* @__PURE__ */ jsxDEV(Layout, { title: `${member.first_name} ${member.last_name}`, children: [
    /* @__PURE__ */ jsxDEV("div", { class: "page-header", children: [
      /* @__PURE__ */ jsxDEV("div", { class: "page-header-info", children: /* @__PURE__ */ jsxDEV("div", { class: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxDEV("h2", { children: [
          member.first_name,
          " ",
          member.last_name
        ] }),
        /* @__PURE__ */ jsxDEV(StatusIcon, { status: member.is_active ? "active" : "inactive" })
      ] }) }),
      /* @__PURE__ */ jsxDEV("div", { class: "page-header-actions", children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/team", class: "uk-btn uk-btn-default uk-btn-sm", "hx-get": "/admin/team", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: "Back" }) })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { class: "p-8", children: /* @__PURE__ */ jsxDEV("div", { class: "grid gap-6", style: "max-width: 800px;", children: [
      /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: /* @__PURE__ */ jsxDEV("section", { children: /* @__PURE__ */ jsxDEV(
        "form",
        {
          class: "autosave",
          "hx-post": `/admin/team/${member.id}`,
          "hx-target": "#page-content",
          "hx-select": "#page-content",
          "hx-swap": "none",
          "hx-trigger": "input delay:500ms, change",
          "hx-sync": "this:queue last",
          children: [
            /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "_section", value: "profile" }),
            /* @__PURE__ */ jsxDEV("div", { class: "flex items-center justify-between mb-4", children: [
              /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold", children: "Profile" }),
              /* @__PURE__ */ jsxDEV("span", { class: "save-indicator" })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-4 sm:grid-cols-2", children: [
              /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
                /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "first_name", children: "First Name" }),
                /* @__PURE__ */ jsxDEV("input", { id: "first_name", name: "first_name", class: "uk-input", value: member.first_name })
              ] }),
              /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
                /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "last_name", children: "Last Name" }),
                /* @__PURE__ */ jsxDEV("input", { id: "last_name", name: "last_name", class: "uk-input", value: member.last_name })
              ] }),
              /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 sm:col-span-2", children: [
                /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "email", children: "Email" }),
                /* @__PURE__ */ jsxDEV("input", { id: "email", name: "email", type: "email", class: "uk-input", value: member.email })
              ] }),
              /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 sm:col-span-2", children: [
                /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "phone", children: "Phone" }),
                /* @__PURE__ */ jsxDEV("input", { id: "phone", name: "phone", type: "tel", class: "uk-input", value: member.phone || "" })
              ] }),
              /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 sm:col-span-2", children: [
                /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "role", children: "Role" }),
                /* @__PURE__ */ jsxDEV("select", { id: "role", name: "role", class: "uk-select", children: [
                  /* @__PURE__ */ jsxDEV("option", { value: "manager", selected: member.role === "manager", children: "Manager" }),
                  /* @__PURE__ */ jsxDEV("option", { value: "provider", selected: member.role === "provider", children: "Provider" })
                ] })
              ] }),
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label flex items-center gap-2 cursor-pointer sm:col-span-2", children: [
                /* @__PURE__ */ jsxDEV("input", { type: "checkbox", name: "can_be_auto_assigned", checked: Boolean(member.can_be_auto_assigned), class: "uk-toggle-switch uk-toggle-switch-primary" }),
                "Can be auto-assigned"
              ] }),
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label flex items-center gap-2 cursor-pointer sm:col-span-2", children: [
                /* @__PURE__ */ jsxDEV("input", { type: "checkbox", name: "is_active", checked: Boolean(member.is_active), class: "uk-toggle-switch uk-toggle-switch-primary" }),
                "Active"
              ] })
            ] })
          ]
        }
      ) }) }),
      /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: /* @__PURE__ */ jsxDEV("section", { children: [
        /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "Weekly Hours" }),
        /* @__PURE__ */ jsxDEV("form", { "hx-post": `/admin/team/${member.id}/hours`, "hx-target": "#page-content", "hx-select": "#page-content", children: [
          /* @__PURE__ */ jsxDEV("div", { class: "grid gap-3", children: DAY_LABELS.map((label, day) => {
            const row = hourMap.get(day);
            const enabled = Boolean(row);
            return /* @__PURE__ */ jsxDEV("div", { class: "grid grid-cols-[60px_1fr_1fr_auto] items-center gap-3", children: [
              /* @__PURE__ */ jsxDEV("span", { class: "text-sm text-muted-foreground", children: label }),
              /* @__PURE__ */ jsxDEV("input", { type: "time", name: `day_${day}_start`, class: "uk-input", value: row?.start_time || "09:00" }),
              /* @__PURE__ */ jsxDEV("input", { type: "time", name: `day_${day}_end`, class: "uk-input", value: row?.end_time || "17:00" }),
              /* @__PURE__ */ jsxDEV("label", { class: "flex items-center gap-2 text-sm", children: [
                /* @__PURE__ */ jsxDEV("input", { type: "checkbox", name: `day_${day}_enabled`, class: "uk-checkbox", checked: enabled }),
                "Enabled"
              ] })
            ] }, label);
          }) }),
          /* @__PURE__ */ jsxDEV("div", { class: "mt-4", children: /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-primary", children: "Save Hours" }) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: /* @__PURE__ */ jsxDEV("section", { children: [
        /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "Date Overrides" }),
        /* @__PURE__ */ jsxDEV("div", { class: "uk-overflow-auto mb-4", children: /* @__PURE__ */ jsxDEV("table", { class: "uk-table uk-table-divider uk-table-hover uk-table-sm text-sm", children: [
          /* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { children: [
            /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Date" }),
            /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Available" }),
            /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Hours" }),
            /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Action" })
          ] }) }),
          /* @__PURE__ */ jsxDEV("tbody", { children: [
            dateOverrides.map((o) => /* @__PURE__ */ jsxDEV("tr", { children: [
              /* @__PURE__ */ jsxDEV("td", { children: o.date }),
              /* @__PURE__ */ jsxDEV("td", { children: o.is_available ? "Yes" : "No" }),
              /* @__PURE__ */ jsxDEV("td", { children: o.start_time && o.end_time ? `${o.start_time} - ${o.end_time}` : "-" }),
              /* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV(
                "button",
                {
                  type: "button",
                  class: "delete-btn",
                  "hx-delete": `/admin/team/${member.id}/overrides/${o.id}`,
                  "data-confirm": "arm",
                  "hx-target": "#page-content",
                  "hx-select": "#page-content",
                  children: "Delete"
                }
              ) })
            ] }, o.id)),
            dateOverrides.length === 0 && /* @__PURE__ */ jsxDEV("tr", { children: /* @__PURE__ */ jsxDEV("td", { colspan: 4, class: "text-muted-foreground", children: "No overrides." }) })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxDEV("form", { "hx-post": `/admin/team/${member.id}/overrides`, "hx-target": "#page-content", "hx-select": "#page-content", children: [
          /* @__PURE__ */ jsxDEV("div", { class: "grid gap-3 sm:grid-cols-2", children: [
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "override-date", children: "Date" }),
              /* @__PURE__ */ jsxDEV("input", { id: "override-date", name: "date", type: "date", class: "uk-input", required: true })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "override-available", children: "Availability" }),
              /* @__PURE__ */ jsxDEV("select", { id: "override-available", name: "is_available", class: "uk-select", children: [
                /* @__PURE__ */ jsxDEV("option", { value: "1", children: "Available" }),
                /* @__PURE__ */ jsxDEV("option", { value: "0", children: "Unavailable" })
              ] })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "override-start", children: "Start" }),
              /* @__PURE__ */ jsxDEV("input", { id: "override-start", name: "start_time", type: "time", class: "uk-input" })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "override-end", children: "End" }),
              /* @__PURE__ */ jsxDEV("input", { id: "override-end", name: "end_time", type: "time", class: "uk-input" })
            ] })
          ] }),
          /* @__PURE__ */ jsxDEV("div", { class: "mt-4", children: /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-default", children: "Add Override" }) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: /* @__PURE__ */ jsxDEV("section", { children: [
        /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "Skills" }),
        /* @__PURE__ */ jsxDEV("div", { class: "flex flex-wrap items-center gap-2 mb-4", children: [
          skills.map((skill) => /* @__PURE__ */ jsxDEV("form", { "hx-post": `/admin/team/${member.id}/skills`, "hx-target": "#page-content", "hx-select": "#page-content", class: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "remove_skill_id", value: skill.id }),
            /* @__PURE__ */ jsxDEV("span", { class: "uk-label", children: skill.name }),
            /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-default uk-btn-sm", children: "x" })
          ] }, skill.id)),
          skills.length === 0 && /* @__PURE__ */ jsxDEV("span", { class: "text-sm text-muted-foreground", children: "No skills assigned." })
        ] }),
        /* @__PURE__ */ jsxDEV("form", { "hx-post": `/admin/team/${member.id}/skills`, "hx-target": "#page-content", "hx-select": "#page-content", class: "flex items-end gap-3", children: [
          skills.map((skill) => /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "skill_ids", value: skill.id }, skill.id)),
          /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 flex-1", children: [
            /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "add-skill", children: "Add Skill" }),
            /* @__PURE__ */ jsxDEV("select", { id: "add-skill", name: "skill_ids", class: "uk-select", children: [
              /* @__PURE__ */ jsxDEV("option", { value: "", children: "Select skill..." }),
              allSkills.map((skill) => /* @__PURE__ */ jsxDEV("option", { value: skill.id, children: skill.name }, skill.id))
            ] })
          ] }),
          /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-default", children: "Add" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: /* @__PURE__ */ jsxDEV("section", { id: "provider-territories", children: [
        /* @__PURE__ */ jsxDEV("div", { class: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold", children: "Territories" }),
          /* @__PURE__ */ jsxDEV("span", { class: "text-sm text-muted-foreground", id: "provider-territories-count", children: [
            assignedTerritories.length,
            " assigned"
          ] }),
          /* @__PURE__ */ jsxDEV("span", { class: "save-indicator" })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: territories.map((t) => /* @__PURE__ */ jsxDEV("form", { children: [
          assignedTerritories.filter((a) => !t.assigned || a.id !== t.id).map((a) => /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "territory_ids", value: a.id }, a.id)),
          /* @__PURE__ */ jsxDEV("label", { class: "flex items-center justify-between gap-3", children: [
            /* @__PURE__ */ jsxDEV("span", { class: "text-sm", children: t.name }),
            /* @__PURE__ */ jsxDEV(
              "input",
              {
                type: "checkbox",
                class: "uk-checkbox",
                name: "territory_ids",
                value: t.id,
                checked: t.assigned,
                "hx-post": `/admin/team/${member.id}/territories`,
                "hx-target": "#page-content",
                "hx-select": "#page-content",
                "hx-vals": `js:this.checked ? {} : { remove_territory_id: '${t.id}' }`
              }
            )
          ] })
        ] }, t.id)) })
      ] }) }),
      /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body danger-card", children: /* @__PURE__ */ jsxDEV("section", { children: [
        /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-3", children: "Delete" }),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            class: "delete-btn",
            "hx-post": `/admin/team/${member.id}/delete`,
            "data-confirm": "arm",
            "hx-target": "#page-content",
            children: "Delete Team Member"
          }
        )
      ] }) })
    ] }) })
  ] });
}, "ProviderDetailPage");

// src/views/service-detail.tsx
var formatRuleDetails = /* @__PURE__ */ __name((rule) => {
  if (rule.rule_type === "time_of_day") return `${rule.start_time || "-"} to ${rule.end_time || "-"}`;
  if (rule.rule_type === "day_of_week") return rule.days_of_week || "-";
  if (rule.rule_type === "lead_time") return `${rule.min_hours_ahead ?? 0}h - ${rule.max_hours_ahead ?? "any"}h ahead`;
  if (rule.rule_type === "territory") return rule.territory_name || "-";
  return "-";
}, "formatRuleDetails");
var ServiceDetailPage = /* @__PURE__ */ __name(({ service, categories, modifiers, priceRules, requiredSkills, allSkills, territories }) => {
  return /* @__PURE__ */ jsxDEV(Layout, { title: service.name || "Service", children: [
    /* @__PURE__ */ jsxDEV("div", { class: "page-header", children: [
      /* @__PURE__ */ jsxDEV("div", { class: "page-header-info", children: /* @__PURE__ */ jsxDEV("div", { class: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxDEV("h2", { children: service.name || "Service" }),
        /* @__PURE__ */ jsxDEV(StatusIcon, { status: service.is_active ? "active" : "inactive" })
      ] }) }),
      /* @__PURE__ */ jsxDEV("div", { class: "page-header-actions", children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/services", class: "uk-btn uk-btn-default uk-btn-sm", "hx-get": "/admin/services", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: "Back" }) })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { class: "p-8", children: /* @__PURE__ */ jsxDEV("div", { class: "grid gap-6", style: "max-width: 800px;", children: [
      /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: /* @__PURE__ */ jsxDEV("section", { children: /* @__PURE__ */ jsxDEV(
        "form",
        {
          class: "autosave",
          "hx-post": `/admin/services/${service.id}`,
          "hx-target": "#page-content",
          "hx-select": "#page-content",
          "hx-swap": "none",
          "hx-trigger": "input delay:500ms, change",
          "hx-sync": "this:queue last",
          children: [
            /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "_section", value: "basic" }),
            /* @__PURE__ */ jsxDEV("div", { class: "flex items-center justify-between mb-4", children: [
              /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold", children: "Basic Info" }),
              /* @__PURE__ */ jsxDEV("span", { class: "save-indicator" })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-4 sm:grid-cols-2", children: [
              /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 sm:col-span-2", children: [
                /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "service-name", children: "Name" }),
                /* @__PURE__ */ jsxDEV("input", { id: "service-name", name: "name", class: "uk-input", value: service.name })
              ] }),
              /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 sm:col-span-2", children: [
                /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "service-description", children: "Description" }),
                /* @__PURE__ */ jsxDEV("textarea", { id: "service-description", name: "description", class: "uk-textarea", rows: 3, children: service.description || "" })
              ] }),
              /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 sm:col-span-2", children: [
                /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "service-category", children: "Category" }),
                /* @__PURE__ */ jsxDEV("select", { id: "service-category", name: "category_id", class: "uk-select", children: [
                  /* @__PURE__ */ jsxDEV("option", { value: "", children: "Select..." }),
                  categories.map((cat) => /* @__PURE__ */ jsxDEV("option", { value: cat.id, selected: service.category_id === cat.id, children: cat.name }, cat.id))
                ] })
              ] }),
              /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
                /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "service-price", children: "Base Price ($)" }),
                /* @__PURE__ */ jsxDEV("input", { id: "service-price", name: "base_price", type: "number", min: 0, step: 0.01, class: "uk-input", value: (service.base_price_cents / 100).toFixed(2) })
              ] }),
              /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
                /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "service-duration", children: "Duration (minutes)" }),
                /* @__PURE__ */ jsxDEV("input", { id: "service-duration", name: "base_duration_minutes", type: "number", min: 1, class: "uk-input", value: service.base_duration_minutes })
              ] }),
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label flex items-center gap-2 cursor-pointer sm:col-span-2", children: [
                /* @__PURE__ */ jsxDEV("input", { type: "checkbox", name: "auto_assign_enabled", checked: Boolean(service.auto_assign_enabled), class: "uk-toggle-switch uk-toggle-switch-primary" }),
                "Auto-assign enabled"
              ] }),
              /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 sm:col-span-2", children: [
                /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "assign-method", children: "Auto-assign method" }),
                /* @__PURE__ */ jsxDEV("select", { id: "assign-method", name: "auto_assign_method", class: "uk-select", children: [
                  /* @__PURE__ */ jsxDEV("option", { value: "balanced", selected: service.auto_assign_method === "balanced", children: "Balanced" }),
                  /* @__PURE__ */ jsxDEV("option", { value: "prioritized", selected: service.auto_assign_method === "prioritized", children: "Prioritized" }),
                  /* @__PURE__ */ jsxDEV("option", { value: "drive_time", selected: service.auto_assign_method === "drive_time", children: "Drive time" })
                ] })
              ] }),
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label flex items-center gap-2 cursor-pointer sm:col-span-2", children: [
                /* @__PURE__ */ jsxDEV("input", { type: "checkbox", name: "is_active", checked: Boolean(service.is_active), class: "uk-toggle-switch uk-toggle-switch-primary" }),
                "Active"
              ] })
            ] })
          ]
        }
      ) }) }),
      /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: /* @__PURE__ */ jsxDEV("section", { children: [
        /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "Modifiers" }),
        /* @__PURE__ */ jsxDEV("div", { class: "uk-overflow-auto mb-4", children: /* @__PURE__ */ jsxDEV("table", { class: "uk-table uk-table-divider uk-table-hover uk-table-sm text-sm", children: [
          /* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { children: [
            /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Name" }),
            /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Price" }),
            /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Duration" }),
            /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Required" }),
            /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Action" })
          ] }) }),
          /* @__PURE__ */ jsxDEV("tbody", { children: [
            modifiers.map((mod) => /* @__PURE__ */ jsxDEV("tr", { children: [
              /* @__PURE__ */ jsxDEV("td", { children: mod.name }),
              /* @__PURE__ */ jsxDEV("td", { children: [
                "$",
                (mod.price_adjustment_cents / 100).toFixed(2)
              ] }),
              /* @__PURE__ */ jsxDEV("td", { children: [
                mod.duration_adjustment_minutes,
                " min"
              ] }),
              /* @__PURE__ */ jsxDEV("td", { children: mod.is_required ? "Yes" : "No" }),
              /* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV(
                "button",
                {
                  type: "button",
                  class: "delete-btn",
                  "hx-post": `/admin/services/${service.id}/modifiers/${mod.id}/delete`,
                  "data-confirm": "arm",
                  "hx-target": "#page-content",
                  "hx-select": "#page-content",
                  children: "Delete"
                }
              ) })
            ] }, mod.id)),
            modifiers.length === 0 && /* @__PURE__ */ jsxDEV("tr", { children: /* @__PURE__ */ jsxDEV("td", { colspan: 5, class: "text-muted-foreground", children: "No modifiers yet." }) })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxDEV("form", { "hx-post": `/admin/services/${service.id}/modifiers`, "hx-target": "#page-content", "hx-select": "#page-content", children: [
          /* @__PURE__ */ jsxDEV("div", { class: "grid gap-3 sm:grid-cols-2", children: [
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "mod-name", children: "Name" }),
              /* @__PURE__ */ jsxDEV("input", { id: "mod-name", name: "name", class: "uk-input", required: true })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "mod-required", children: "Required" }),
              /* @__PURE__ */ jsxDEV("label", { class: "flex items-center gap-2 text-sm", children: [
                /* @__PURE__ */ jsxDEV("input", { id: "mod-required", name: "is_required", type: "checkbox", class: "uk-checkbox" }),
                "Required"
              ] })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 sm:col-span-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "mod-description", children: "Description" }),
              /* @__PURE__ */ jsxDEV("input", { id: "mod-description", name: "description", class: "uk-input" })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "mod-price", children: "Price Adjustment ($)" }),
              /* @__PURE__ */ jsxDEV("input", { id: "mod-price", name: "price_adjustment", type: "number", step: 0.01, class: "uk-input", value: "0" })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "mod-duration", children: "Duration adjustment (minutes)" }),
              /* @__PURE__ */ jsxDEV("input", { id: "mod-duration", name: "duration_adjustment_minutes", type: "number", class: "uk-input", value: "0" })
            ] })
          ] }),
          /* @__PURE__ */ jsxDEV("div", { class: "mt-4", children: /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-default", children: "Add Modifier" }) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: /* @__PURE__ */ jsxDEV("section", { children: [
        /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "Price Rules" }),
        /* @__PURE__ */ jsxDEV("div", { class: "uk-overflow-auto mb-4", children: /* @__PURE__ */ jsxDEV("table", { class: "uk-table uk-table-divider uk-table-hover uk-table-sm text-sm", children: [
          /* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { children: [
            /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Type" }),
            /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Adjustment" }),
            /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Details" }),
            /* @__PURE__ */ jsxDEV("th", { class: "text-left", children: "Action" })
          ] }) }),
          /* @__PURE__ */ jsxDEV("tbody", { children: [
            priceRules.map((rule) => /* @__PURE__ */ jsxDEV("tr", { children: [
              /* @__PURE__ */ jsxDEV("td", { children: rule.rule_type }),
              /* @__PURE__ */ jsxDEV("td", { children: [
                rule.direction,
                " ",
                rule.adjustment_type === "percentage" ? `${rule.adjustment_value}%` : `$${(rule.adjustment_value / 100).toFixed(2)}`
              ] }),
              /* @__PURE__ */ jsxDEV("td", { children: formatRuleDetails(rule) }),
              /* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV(
                "button",
                {
                  type: "button",
                  class: "delete-btn",
                  "hx-post": `/admin/services/${service.id}/rules/${rule.id}/delete`,
                  "data-confirm": "arm",
                  "hx-target": "#page-content",
                  "hx-select": "#page-content",
                  children: "Delete"
                }
              ) })
            ] }, rule.id)),
            priceRules.length === 0 && /* @__PURE__ */ jsxDEV("tr", { children: /* @__PURE__ */ jsxDEV("td", { colspan: 4, class: "text-muted-foreground", children: "No price rules yet." }) })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxDEV("form", { "hx-post": `/admin/services/${service.id}/rules`, "hx-target": "#page-content", "hx-select": "#page-content", children: [
          /* @__PURE__ */ jsxDEV("div", { class: "grid gap-3 sm:grid-cols-2", children: [
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "rule-type", children: "Rule Type" }),
              /* @__PURE__ */ jsxDEV("select", { id: "rule-type", name: "rule_type", class: "uk-select", children: [
                /* @__PURE__ */ jsxDEV("option", { value: "time_of_day", children: "Time of Day" }),
                /* @__PURE__ */ jsxDEV("option", { value: "day_of_week", children: "Day of Week" }),
                /* @__PURE__ */ jsxDEV("option", { value: "lead_time", children: "Lead Time" }),
                /* @__PURE__ */ jsxDEV("option", { value: "territory", children: "Territory" })
              ] })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "adjustment-type", children: "Adjustment Type" }),
              /* @__PURE__ */ jsxDEV("select", { id: "adjustment-type", name: "adjustment_type", class: "uk-select", children: [
                /* @__PURE__ */ jsxDEV("option", { value: "flat", children: "Flat" }),
                /* @__PURE__ */ jsxDEV("option", { value: "percentage", children: "Percentage" })
              ] })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "adjustment-value", children: "Adjustment Value ($ or %)" }),
              /* @__PURE__ */ jsxDEV("input", { id: "adjustment-value", name: "adjustment_value", type: "number", step: 0.01, class: "uk-input", value: "0" })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "direction", children: "Direction" }),
              /* @__PURE__ */ jsxDEV("select", { id: "direction", name: "direction", class: "uk-select", children: [
                /* @__PURE__ */ jsxDEV("option", { value: "surcharge", children: "Surcharge" }),
                /* @__PURE__ */ jsxDEV("option", { value: "discount", children: "Discount" })
              ] })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "days-of-week", children: "Days of Week (csv)" }),
              /* @__PURE__ */ jsxDEV("input", { id: "days-of-week", name: "days_of_week", class: "uk-input", placeholder: "1,2,3" })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "rule-territory", children: "Territory" }),
              /* @__PURE__ */ jsxDEV("select", { id: "rule-territory", name: "territory_id", class: "uk-select", children: [
                /* @__PURE__ */ jsxDEV("option", { value: "", children: "Any territory" }),
                territories.map((t) => /* @__PURE__ */ jsxDEV("option", { value: t.id, children: t.name }, t.id))
              ] })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "start-time", children: "Start Time" }),
              /* @__PURE__ */ jsxDEV("input", { id: "start-time", name: "start_time", type: "time", class: "uk-input" })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "end-time", children: "End Time" }),
              /* @__PURE__ */ jsxDEV("input", { id: "end-time", name: "end_time", type: "time", class: "uk-input" })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "min-hours", children: "Min Hours Ahead" }),
              /* @__PURE__ */ jsxDEV("input", { id: "min-hours", name: "min_hours_ahead", type: "number", min: 0, class: "uk-input" })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "max-hours", children: "Max Hours Ahead" }),
              /* @__PURE__ */ jsxDEV("input", { id: "max-hours", name: "max_hours_ahead", type: "number", min: 0, class: "uk-input" })
            ] })
          ] }),
          /* @__PURE__ */ jsxDEV("div", { class: "mt-4", children: /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-default", children: "Add Price Rule" }) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: /* @__PURE__ */ jsxDEV("section", { children: [
        /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "Required Skills" }),
        /* @__PURE__ */ jsxDEV("div", { class: "flex flex-wrap gap-2 mb-4", children: [
          requiredSkills.map((skill) => {
            const keep = requiredSkills.filter((s) => s.id !== skill.id);
            return /* @__PURE__ */ jsxDEV("form", { "hx-post": `/admin/services/${service.id}/skills`, "hx-target": "#page-content", "hx-select": "#page-content", class: "flex items-center gap-1", children: [
              keep.map((s) => /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "skill_ids", value: s.id }, s.id)),
              /* @__PURE__ */ jsxDEV("span", { class: "uk-label", children: skill.name }),
              /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-default uk-btn-sm", children: "x" })
            ] }, skill.id);
          }),
          requiredSkills.length === 0 && /* @__PURE__ */ jsxDEV("span", { class: "text-sm text-muted-foreground", children: "No required skills." })
        ] }),
        /* @__PURE__ */ jsxDEV("form", { "hx-post": `/admin/services/${service.id}/skills`, "hx-target": "#page-content", "hx-select": "#page-content", class: "flex items-end gap-3", children: [
          requiredSkills.map((skill) => /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "skill_ids", value: skill.id }, skill.id)),
          /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 flex-1", children: [
            /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "skill-id", children: "Add Skill" }),
            /* @__PURE__ */ jsxDEV("select", { id: "skill-id", name: "skill_ids", class: "uk-select", children: [
              /* @__PURE__ */ jsxDEV("option", { value: "", children: "Select skill..." }),
              allSkills.map((skill) => /* @__PURE__ */ jsxDEV("option", { value: skill.id, children: skill.name }, skill.id))
            ] })
          ] }),
          /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-default", children: "Add" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body danger-card", children: /* @__PURE__ */ jsxDEV("section", { children: [
        /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-3", children: "Delete" }),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            class: "delete-btn",
            "hx-post": `/admin/services/${service.id}/delete`,
            "data-confirm": "arm",
            "hx-target": "#page-content",
            children: "Delete Service"
          }
        )
      ] }) })
    ] }) })
  ] });
}, "ServiceDetailPage");

// src/views/territory-detail.tsx
var HOURS = [
  { key: "sun", label: "Sun" },
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" }
];
var TIMEZONES = ["America/Toronto", "America/New_York", "America/Vancouver", "America/Chicago", "America/Edmonton", "UTC"];
var parseAreaData = /* @__PURE__ */ __name((raw2) => {
  try {
    return JSON.parse(raw2 || "{}");
  } catch {
    return {};
  }
}, "parseAreaData");
var parseOperatingHours = /* @__PURE__ */ __name((raw2) => {
  try {
    const parsed = JSON.parse(raw2 || "{}");
    return parsed;
  } catch {
    return {};
  }
}, "parseOperatingHours");
var ZipPanel = /* @__PURE__ */ __name(({ tid, zipCodes }) => {
  return /* @__PURE__ */ jsxDEV("div", { children: /* @__PURE__ */ jsxDEV("form", { class: "autosave", "hx-post": `/admin/territories/${tid}/area`, "hx-swap": "none", "hx-trigger": "input delay:800ms, change delay:800ms", children: [
    /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "service_area_type", value: "zip" }),
    /* @__PURE__ */ jsxDEV("div", { class: "flex items-center justify-between mb-2", children: [
      /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "zip-codes", children: "ZIP/Postal Codes" }),
      /* @__PURE__ */ jsxDEV("span", { class: "save-indicator" })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
      /* @__PURE__ */ jsxDEV("textarea", { id: "zip-codes", name: "zip_codes", class: "uk-textarea", rows: 4, placeholder: "K8N1A1, K8N1A2", children: zipCodes.join(", ") }),
      /* @__PURE__ */ jsxDEV("p", { class: "text-sm text-muted-foreground", children: "Comma-separated list." })
    ] })
  ] }) });
}, "ZipPanel");
var RadiusPanel = /* @__PURE__ */ __name(({ tid, areaData }) => {
  const center = areaData.center || {};
  const lat = Number(center.lat || 44.1628);
  const lng = Number(center.lng || -77.3832);
  const miles = Number(areaData.radius_miles || 10);
  return /* @__PURE__ */ jsxDEV("div", { children: /* @__PURE__ */ jsxDEV("form", { id: "radius-form", class: "autosave", "hx-post": `/admin/territories/${tid}/area`, "hx-swap": "none", "hx-trigger": "change delay:500ms", "hx-sync": "this:queue last", children: [
    /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "service_area_type", value: "radius" }),
    /* @__PURE__ */ jsxDEV("span", { class: "save-indicator" }),
    /* @__PURE__ */ jsxDEV("div", { class: "grid gap-3 sm:grid-cols-2 mb-4", children: [
      /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 sm:col-span-2", children: [
        /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "center-address-search", children: "Address Search" }),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            id: "center-address-search",
            name: "center_address_q",
            class: "uk-input",
            placeholder: "Search address",
            "hx-get": "/admin/api/address/search",
            "hx-trigger": "input changed delay:300ms",
            "hx-target": "#radius-address-results"
          }
        ),
        /* @__PURE__ */ jsxDEV("div", { id: "radius-address-results" })
      ] }),
      /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
        /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "center-lat", children: "Center Latitude" }),
        /* @__PURE__ */ jsxDEV("input", { id: "center-lat", name: "center_lat", class: "uk-input", value: lat.toString() })
      ] }),
      /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
        /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "center-lng", children: "Center Longitude" }),
        /* @__PURE__ */ jsxDEV("input", { id: "center-lng", name: "center_lng", class: "uk-input", value: lng.toString() })
      ] }),
      /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 sm:col-span-2", children: [
        /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "radius-miles", children: "Radius (miles)" }),
        /* @__PURE__ */ jsxDEV("input", { id: "radius-miles", name: "radius_miles", type: "number", min: 1, step: 0.1, class: "uk-input", value: miles.toString() })
      ] })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { id: "radius-map", style: "height: 300px; border: 1px solid var(--border); border-radius: 8px;", "data-lat": lat.toString(), "data-lng": lng.toString(), "data-miles": miles.toString() })
  ] }) });
}, "RadiusPanel");
var GeofencePanel = /* @__PURE__ */ __name(({ tid, areaData }) => {
  const polygon = Array.isArray(areaData.polygon) ? areaData.polygon : [];
  return /* @__PURE__ */ jsxDEV("div", { children: /* @__PURE__ */ jsxDEV("form", { id: "geofence-form", class: "autosave", "hx-post": `/admin/territories/${tid}/area`, "hx-swap": "none", "hx-trigger": "change delay:500ms", "hx-sync": "this:queue last", children: [
    /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "service_area_type", value: "geofence" }),
    /* @__PURE__ */ jsxDEV("div", { class: "flex items-center gap-2 mb-3", children: [
      /* @__PURE__ */ jsxDEV("button", { id: "gf-draw-btn", type: "button", class: "uk-btn uk-btn-default uk-btn-sm", children: "Draw Polygon" }),
      /* @__PURE__ */ jsxDEV("button", { id: "clear-geofence-btn", type: "button", class: "uk-btn uk-btn-default uk-btn-sm", children: "Clear" }),
      /* @__PURE__ */ jsxDEV("span", { id: "gf-count", class: "text-sm text-muted-foreground", children: [
        polygon.length,
        " pts"
      ] }),
      /* @__PURE__ */ jsxDEV("span", { class: "save-indicator" })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { id: "geofence-map", style: "height: 320px; border: 1px solid var(--border); border-radius: 8px;", "data-points": JSON.stringify(polygon) }),
    /* @__PURE__ */ jsxDEV("input", { id: "polygon-json-hidden", type: "hidden", name: "polygon_json", value: polygon.length ? JSON.stringify(polygon) : "" })
  ] }) });
}, "GeofencePanel");
var TerritoryDetailPage = /* @__PURE__ */ __name(({ territory, services, providers, isNew }) => {
  const areaData = parseAreaData(territory.service_area_data);
  const zipCodes = (areaData.zip_codes || areaData.zipCodes || []).filter(Boolean);
  const operatingHours = parseOperatingHours(territory.operating_hours);
  const selectedType = territory.service_area_type || "zip";
  const submitUrl = isNew ? "/admin/territories" : `/admin/territories/${territory.id}`;
  const assignedServices = services.filter((s) => s.assigned).length;
  const assignedProviders = providers.filter((p) => p.assigned).length;
  return /* @__PURE__ */ jsxDEV(Layout, { title: isNew ? "Create Territory" : territory.name || "Territory", children: [
    /* @__PURE__ */ jsxDEV("div", { class: "page-header", children: [
      /* @__PURE__ */ jsxDEV("h2", { children: isNew ? "Create Territory" : territory.name || "Territory" }),
      /* @__PURE__ */ jsxDEV("div", { class: "page-header-actions", children: /* @__PURE__ */ jsxDEV("a", { href: "/admin/territories", class: "uk-btn uk-btn-default uk-btn-sm", "hx-get": "/admin/territories", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: "Back" }) })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { class: "p-8", children: /* @__PURE__ */ jsxDEV("div", { class: "grid gap-6", style: "max-width: 800px;", children: [
      /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: /* @__PURE__ */ jsxDEV("section", { children: [
        /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "Basic Info" }),
        /* @__PURE__ */ jsxDEV("form", { "hx-post": submitUrl, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: [
          !isNew && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "_section", value: "basic" }),
          /* @__PURE__ */ jsxDEV("div", { class: "grid gap-4 sm:grid-cols-2", children: [
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 sm:col-span-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "territory-name", children: "Name" }),
              /* @__PURE__ */ jsxDEV("input", { id: "territory-name", name: "name", class: "uk-input", value: territory.name, required: true })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "territory-timezone", children: "Timezone" }),
              /* @__PURE__ */ jsxDEV("select", { id: "territory-timezone", name: "timezone", class: "uk-select", children: TIMEZONES.map((tz) => /* @__PURE__ */ jsxDEV("option", { value: tz, selected: territory.timezone === tz, children: tz }, tz)) })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "territory-policy", children: "Scheduling Policy" }),
              /* @__PURE__ */ jsxDEV("select", { id: "territory-policy", name: "scheduling_policy", class: "uk-select", children: [
                /* @__PURE__ */ jsxDEV("option", { value: "provider_based", selected: territory.scheduling_policy === "provider_based", children: "Provider based" }),
                /* @__PURE__ */ jsxDEV("option", { value: "manual", selected: territory.scheduling_policy === "manual", children: "Manual" })
              ] })
            ] }),
            /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label flex items-center gap-2 cursor-pointer sm:col-span-2", children: [
              /* @__PURE__ */ jsxDEV("input", { type: "checkbox", name: "is_active", checked: Boolean(territory.is_active), class: "uk-toggle-switch uk-toggle-switch-primary" }),
              "Active"
            ] }),
            isNew && /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "service_area_type", value: selectedType })
          ] }),
          /* @__PURE__ */ jsxDEV("div", { class: "mt-4", children: /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-primary", children: isNew ? "Create" : "Save" }) })
        ] })
      ] }) }),
      !isNew && /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: /* @__PURE__ */ jsxDEV("section", { children: [
        /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "Service Area" }),
        /* @__PURE__ */ jsxDEV("div", { class: "grid gap-3 sm:grid-cols-2 items-end mb-4", children: /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
          /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "area-type", children: "Service Area Type" }),
          /* @__PURE__ */ jsxDEV(
            "select",
            {
              id: "area-type",
              class: "uk-select",
              name: "panel_type",
              "hx-get": `/admin/territories/${territory.id}/area-panel/${selectedType}`,
              "hx-target": "#area-panel",
              "hx-swap": "innerHTML",
              "hx-trigger": "change",
              children: [
                /* @__PURE__ */ jsxDEV("option", { value: "zip", selected: selectedType === "zip", children: "ZIP / Postal Codes" }),
                /* @__PURE__ */ jsxDEV("option", { value: "radius", selected: selectedType === "radius", children: "Radius" }),
                /* @__PURE__ */ jsxDEV("option", { value: "geofence", selected: selectedType === "geofence", children: "Geofence" })
              ]
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxDEV("div", { id: "area-panel", children: [
          selectedType === "radius" && RadiusPanel({ tid: territory.id, areaData }),
          selectedType === "geofence" && GeofencePanel({ tid: territory.id, areaData }),
          selectedType === "zip" && ZipPanel({ tid: territory.id, zipCodes })
        ] })
      ] }) }),
      !isNew && /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: /* @__PURE__ */ jsxDEV("section", { children: [
        /* @__PURE__ */ jsxDEV("div", { class: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold", children: "Operating Hours" }),
          /* @__PURE__ */ jsxDEV("span", { class: "save-indicator" })
        ] }),
        /* @__PURE__ */ jsxDEV("form", { class: "autosave", "hx-post": `/admin/territories/${territory.id}/hours`, "hx-swap": "none", "hx-trigger": "change delay:500ms", "hx-sync": "this:queue last", children: /* @__PURE__ */ jsxDEV("div", { class: "grid gap-3", children: HOURS.map((d) => {
          const row = operatingHours[d.key] || null;
          return /* @__PURE__ */ jsxDEV("div", { class: "grid grid-cols-[60px_1fr_1fr_auto] gap-3 items-center", children: [
            /* @__PURE__ */ jsxDEV("span", { class: "text-sm text-muted-foreground", children: d.label }),
            /* @__PURE__ */ jsxDEV("input", { type: "time", name: `${d.key}_start`, class: "uk-input", value: row?.start || "09:00" }),
            /* @__PURE__ */ jsxDEV("input", { type: "time", name: `${d.key}_end`, class: "uk-input", value: row?.end || "17:00" }),
            /* @__PURE__ */ jsxDEV("label", { class: "flex items-center gap-2 text-sm", children: [
              /* @__PURE__ */ jsxDEV("input", { type: "checkbox", name: `${d.key}_enabled`, class: "uk-checkbox", checked: Boolean(row) }),
              "Enabled"
            ] })
          ] }, d.key);
        }) }) })
      ] }) }),
      !isNew && /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: /* @__PURE__ */ jsxDEV("section", { id: "territory-services", children: [
        /* @__PURE__ */ jsxDEV("div", { class: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold", children: "Services" }),
          /* @__PURE__ */ jsxDEV("span", { id: "territory-services-count", class: "text-sm text-muted-foreground", children: [
            assignedServices,
            " assigned"
          ] }),
          /* @__PURE__ */ jsxDEV("span", { class: "save-indicator" })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: services.map((s) => /* @__PURE__ */ jsxDEV("label", { class: "flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsxDEV("span", { class: "text-sm", children: s.name }),
          /* @__PURE__ */ jsxDEV(
            "input",
            {
              type: "checkbox",
              class: "uk-checkbox",
              checked: s.assigned,
              "hx-post": `/admin/territories/${territory.id}/services/${s.id}/toggle`,
              "hx-trigger": "change",
              "hx-swap": "none"
            }
          )
        ] }, s.id)) })
      ] }) }),
      !isNew && /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: /* @__PURE__ */ jsxDEV("section", { id: "territory-providers", children: [
        /* @__PURE__ */ jsxDEV("div", { class: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold", children: "Providers" }),
          /* @__PURE__ */ jsxDEV("span", { id: "territory-providers-count", class: "text-sm text-muted-foreground", children: [
            assignedProviders,
            " assigned"
          ] }),
          /* @__PURE__ */ jsxDEV("span", { class: "save-indicator" })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: providers.map((p) => /* @__PURE__ */ jsxDEV("label", { class: "flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsxDEV("span", { class: "text-sm", children: [
            p.first_name,
            " ",
            p.last_name
          ] }),
          /* @__PURE__ */ jsxDEV(
            "input",
            {
              type: "checkbox",
              class: "uk-checkbox",
              checked: p.assigned,
              "hx-post": `/admin/territories/${territory.id}/providers/${p.id}/toggle`,
              "hx-trigger": "change",
              "hx-swap": "none"
            }
          )
        ] }, p.id)) })
      ] }) }),
      !isNew && /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body danger-card", children: /* @__PURE__ */ jsxDEV("section", { children: [
        /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-3", children: "Delete" }),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            class: "delete-btn",
            "hx-post": `/admin/territories/${territory.id}/delete`,
            "data-confirm": "arm",
            "hx-target": "#page-content",
            children: "Delete Territory"
          }
        )
      ] }) })
    ] }) })
  ] });
}, "TerritoryDetailPage");

// src/views/sms-settings.tsx
var segmentCount = /* @__PURE__ */ __name((len) => len <= 160 ? 1 : Math.ceil(len / 153), "segmentCount");
var SmsSettingsPage = /* @__PURE__ */ __name(({ config, templates, stats }) => /* @__PURE__ */ jsxDEV(Layout, { title: "SMS Settings", children: [
  /* @__PURE__ */ jsxDEV("div", { class: "page-header", children: /* @__PURE__ */ jsxDEV("h2", { children: "SMS Settings" }) }),
  /* @__PURE__ */ jsxDEV("div", { class: "p-4 md:p-8", children: /* @__PURE__ */ jsxDEV("div", { class: "grid gap-4 md:gap-6", style: "max-width: 800px;", children: [
    /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: [
      /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-3", children: "Twilio Configuration" }),
      /* @__PURE__ */ jsxDEV("form", { "hx-post": "/admin/sms-settings", "hx-target": "#page-content", "hx-select": "#page-content", class: "grid gap-3", children: [
        /* @__PURE__ */ jsxDEV("div", { class: "grid gap-1", children: [
          /* @__PURE__ */ jsxDEV("label", { class: "text-sm font-medium", for: "twilio-sid", children: "Account SID" }),
          /* @__PURE__ */ jsxDEV("input", { type: "text", name: "account_sid", id: "twilio-sid", class: "uk-input", value: config?.accountSid || "", placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", autocomplete: "off", autocapitalize: "off", spellcheck: "false" })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { class: "grid gap-1", children: [
          /* @__PURE__ */ jsxDEV("label", { class: "text-sm font-medium", for: "twilio-token", children: "Auth Token" }),
          /* @__PURE__ */ jsxDEV("input", { type: "password", name: "auth_token", id: "twilio-token", class: "uk-input", value: config?.authToken || "", placeholder: "Your Twilio auth token", autocomplete: "off", autocapitalize: "off", spellcheck: "false" })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { class: "grid gap-1", children: [
          /* @__PURE__ */ jsxDEV("label", { class: "text-sm font-medium", for: "twilio-phone", children: "Phone Number (E.164)" }),
          /* @__PURE__ */ jsxDEV("input", { type: "tel", name: "phone_number", id: "twilio-phone", class: "uk-input", value: config?.phoneNumber || "", placeholder: "+18005551234", autocomplete: "tel", inputmode: "tel" })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { class: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxDEV("input", { type: "checkbox", name: "enabled", id: "twilio-enabled", value: "1", checked: !!config?.enabled, class: "uk-checkbox" }),
          /* @__PURE__ */ jsxDEV("label", { for: "twilio-enabled", class: "text-sm", children: "Enable SMS sending" })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { children: /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-primary uk-btn-sm", children: "Save Twilio Config" }) })
      ] })
    ] }),
    stats && /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: [
      /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-4", children: "SMS Usage" }),
      /* @__PURE__ */ jsxDEV("div", { class: "grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm", children: [
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("span", { class: "text-muted-foreground block", children: "Total" }),
          /* @__PURE__ */ jsxDEV("span", { class: "font-semibold text-lg", children: stats.total || 0 })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("span", { class: "text-muted-foreground block", children: "Sent" }),
          /* @__PURE__ */ jsxDEV("span", { class: "font-semibold text-lg", children: stats.sent || 0 })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("span", { class: "text-muted-foreground block", children: "Received" }),
          /* @__PURE__ */ jsxDEV("span", { class: "font-semibold text-lg", children: stats.received || 0 })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("span", { class: "text-muted-foreground block", children: "Failed" }),
          /* @__PURE__ */ jsxDEV("span", { class: "font-semibold text-lg", style: "color:var(--destructive,#dc2626);", children: stats.failed || 0 })
        ] })
      ] }),
      stats.total_segments > 0 && /* @__PURE__ */ jsxDEV("p", { class: "text-xs text-muted-foreground mt-2", children: [
        "Total segments: ",
        stats.total_segments,
        " (each segment \u2248 $0.0079 USD)"
      ] })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: [
      /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-2", children: "Message Templates" }),
      /* @__PURE__ */ jsxDEV("p", { class: "text-sm text-muted-foreground mb-3", children: [
        "Available variables: ",
        "{{first_name}} {{last_name}} {{service_name}} {{date}} {{time}} {{provider_name}} {{total}}"
      ] }),
      /* @__PURE__ */ jsxDEV("div", { class: "grid gap-3", children: templates.map((tpl) => /* @__PURE__ */ jsxDEV(
        "form",
        {
          "hx-post": `/admin/sms-templates/${tpl.id}`,
          "hx-swap": "none",
          class: "grid gap-2",
          style: "border-bottom:1px solid var(--border);padding-bottom:12px;",
          children: [
            /* @__PURE__ */ jsxDEV("div", { class: "flex items-start justify-between gap-2", children: [
              /* @__PURE__ */ jsxDEV("label", { class: "text-sm font-medium leading-tight", for: `tpl-body-${tpl.id}`, children: tpl.label }),
              /* @__PURE__ */ jsxDEV("div", { class: "flex items-center gap-1.5 shrink-0", children: [
                /* @__PURE__ */ jsxDEV(
                  "input",
                  {
                    type: "checkbox",
                    name: "is_active",
                    value: "1",
                    checked: !!tpl.is_active,
                    class: "uk-checkbox"
                  }
                ),
                /* @__PURE__ */ jsxDEV("span", { class: "text-[11px] text-muted-foreground", children: tpl.event_type })
              ] })
            ] }),
            /* @__PURE__ */ jsxDEV(
              "textarea",
              {
                name: "body_template",
                id: `tpl-body-${tpl.id}`,
                class: "uk-textarea text-sm",
                rows: 3,
                autocapitalize: "off",
                spellcheck: "false",
                style: "font-family:monospace;resize:vertical;",
                oninput: `var c=this.value.length;var s=c<=160?1:Math.ceil(c/153);this.closest('form').querySelector('.tpl-chars').textContent=c+' chars \xB7 '+s+' segment'+(s>1?'s':'');`,
                children: tpl.body_template
              }
            ),
            /* @__PURE__ */ jsxDEV("div", { class: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxDEV("span", { class: "tpl-chars text-[11px] text-muted-foreground", children: [
                tpl.body_template.length,
                " chars \xB7 ",
                segmentCount(tpl.body_template.length),
                " segment",
                segmentCount(tpl.body_template.length) > 1 ? "s" : ""
              ] }),
              /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-default uk-btn-sm", children: "Save" })
            ] })
          ]
        }
      )) })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: [
      /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-2", children: "Webhook URLs" }),
      /* @__PURE__ */ jsxDEV("p", { class: "text-sm text-muted-foreground mb-2", children: "Configure these in your Twilio phone number settings:" }),
      /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 text-sm", children: [
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("span", { class: "text-muted-foreground block", children: "Inbound SMS Webhook:" }),
          /* @__PURE__ */ jsxDEV("code", { class: "block mt-1 break-all", style: "font-size:12px;", children: "https://api.unclebike.xyz/webhooks/twilio/inbound" })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("span", { class: "text-muted-foreground block", children: "Status Callback:" }),
          /* @__PURE__ */ jsxDEV("code", { class: "block mt-1 break-all", style: "font-size:12px;", children: "https://api.unclebike.xyz/webhooks/twilio/status" })
        ] })
      ] })
    ] })
  ] }) })
] }), "SmsSettingsPage");

// node_modules/hono/dist/jsx/dom/intrinsic-element/components.js
var components_exports2 = {};
__export(components_exports2, {
  button: () => button2,
  clearCache: () => clearCache,
  composeRef: () => composeRef,
  form: () => form2,
  input: () => input2,
  link: () => link2,
  meta: () => meta2,
  script: () => script2,
  style: () => style2,
  title: () => title2
});

// node_modules/hono/dist/jsx/dom/render.js
var HONO_PORTAL_ELEMENT = "_hp";
var eventAliasMap = {
  Change: "Input",
  DoubleClick: "DblClick"
};
var nameSpaceMap = {
  svg: "2000/svg",
  math: "1998/Math/MathML"
};
var buildDataStack = [];
var refCleanupMap = /* @__PURE__ */ new WeakMap();
var nameSpaceContext2 = void 0;
var getNameSpaceContext2 = /* @__PURE__ */ __name(() => nameSpaceContext2, "getNameSpaceContext");
var isNodeString = /* @__PURE__ */ __name((node) => "t" in node, "isNodeString");
var eventCache = {
  // pre-define events that are used very frequently
  onClick: ["click", false]
};
var getEventSpec = /* @__PURE__ */ __name((key) => {
  if (!key.startsWith("on")) {
    return void 0;
  }
  if (eventCache[key]) {
    return eventCache[key];
  }
  const match2 = key.match(/^on([A-Z][a-zA-Z]+?(?:PointerCapture)?)(Capture)?$/);
  if (match2) {
    const [, eventName, capture] = match2;
    return eventCache[key] = [(eventAliasMap[eventName] || eventName).toLowerCase(), !!capture];
  }
  return void 0;
}, "getEventSpec");
var toAttributeName = /* @__PURE__ */ __name((element, key) => nameSpaceContext2 && element instanceof SVGElement && /[A-Z]/.test(key) && (key in element.style || // Presentation attributes are findable in style object. "clip-path", "font-size", "stroke-width", etc.
key.match(/^(?:o|pai|str|u|ve)/)) ? key.replace(/([A-Z])/g, "-$1").toLowerCase() : key, "toAttributeName");
var applyProps = /* @__PURE__ */ __name((container, attributes, oldAttributes) => {
  attributes ||= {};
  for (let key in attributes) {
    const value = attributes[key];
    if (key !== "children" && (!oldAttributes || oldAttributes[key] !== value)) {
      key = normalizeIntrinsicElementKey(key);
      const eventSpec = getEventSpec(key);
      if (eventSpec) {
        if (oldAttributes?.[key] !== value) {
          if (oldAttributes) {
            container.removeEventListener(eventSpec[0], oldAttributes[key], eventSpec[1]);
          }
          if (value != null) {
            if (typeof value !== "function") {
              throw new Error(`Event handler for "${key}" is not a function`);
            }
            container.addEventListener(eventSpec[0], value, eventSpec[1]);
          }
        }
      } else if (key === "dangerouslySetInnerHTML" && value) {
        container.innerHTML = value.__html;
      } else if (key === "ref") {
        let cleanup;
        if (typeof value === "function") {
          cleanup = value(container) || (() => value(null));
        } else if (value && "current" in value) {
          value.current = container;
          cleanup = /* @__PURE__ */ __name(() => value.current = null, "cleanup");
        }
        refCleanupMap.set(container, cleanup);
      } else if (key === "style") {
        const style3 = container.style;
        if (typeof value === "string") {
          style3.cssText = value;
        } else {
          style3.cssText = "";
          if (value != null) {
            styleObjectForEach(value, style3.setProperty.bind(style3));
          }
        }
      } else {
        if (key === "value") {
          const nodeName = container.nodeName;
          if (nodeName === "INPUT" || nodeName === "TEXTAREA" || nodeName === "SELECT") {
            ;
            container.value = value === null || value === void 0 || value === false ? null : value;
            if (nodeName === "TEXTAREA") {
              container.textContent = value;
              continue;
            } else if (nodeName === "SELECT") {
              if (container.selectedIndex === -1) {
                ;
                container.selectedIndex = 0;
              }
              continue;
            }
          }
        } else if (key === "checked" && container.nodeName === "INPUT" || key === "selected" && container.nodeName === "OPTION") {
          ;
          container[key] = value;
        }
        const k = toAttributeName(container, key);
        if (value === null || value === void 0 || value === false) {
          container.removeAttribute(k);
        } else if (value === true) {
          container.setAttribute(k, "");
        } else if (typeof value === "string" || typeof value === "number") {
          container.setAttribute(k, value);
        } else {
          container.setAttribute(k, value.toString());
        }
      }
    }
  }
  if (oldAttributes) {
    for (let key in oldAttributes) {
      const value = oldAttributes[key];
      if (key !== "children" && !(key in attributes)) {
        key = normalizeIntrinsicElementKey(key);
        const eventSpec = getEventSpec(key);
        if (eventSpec) {
          container.removeEventListener(eventSpec[0], value, eventSpec[1]);
        } else if (key === "ref") {
          refCleanupMap.get(container)?.();
        } else {
          container.removeAttribute(toAttributeName(container, key));
        }
      }
    }
  }
}, "applyProps");
var invokeTag = /* @__PURE__ */ __name((context, node) => {
  node[DOM_STASH][0] = 0;
  buildDataStack.push([context, node]);
  const func = node.tag[DOM_RENDERER] || node.tag;
  const props = func.defaultProps ? {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...func.defaultProps,
    ...node.props
  } : node.props;
  try {
    return [func.call(null, props)];
  } finally {
    buildDataStack.pop();
  }
}, "invokeTag");
var getNextChildren = /* @__PURE__ */ __name((node, container, nextChildren, childrenToRemove, callbacks) => {
  if (node.vR?.length) {
    childrenToRemove.push(...node.vR);
    delete node.vR;
  }
  if (typeof node.tag === "function") {
    node[DOM_STASH][1][STASH_EFFECT]?.forEach((data) => callbacks.push(data));
  }
  node.vC.forEach((child) => {
    if (isNodeString(child)) {
      nextChildren.push(child);
    } else {
      if (typeof child.tag === "function" || child.tag === "") {
        child.c = container;
        const currentNextChildrenIndex = nextChildren.length;
        getNextChildren(child, container, nextChildren, childrenToRemove, callbacks);
        if (child.s) {
          for (let i = currentNextChildrenIndex; i < nextChildren.length; i++) {
            nextChildren[i].s = true;
          }
          child.s = false;
        }
      } else {
        nextChildren.push(child);
        if (child.vR?.length) {
          childrenToRemove.push(...child.vR);
          delete child.vR;
        }
      }
    }
  });
}, "getNextChildren");
var findInsertBefore = /* @__PURE__ */ __name((node) => {
  while (node && (node.tag === HONO_PORTAL_ELEMENT || !node.e)) {
    node = node.tag === HONO_PORTAL_ELEMENT || !node.vC?.[0] ? node.nN : node.vC[0];
  }
  return node?.e;
}, "findInsertBefore");
var removeNode = /* @__PURE__ */ __name((node) => {
  if (!isNodeString(node)) {
    node[DOM_STASH]?.[1][STASH_EFFECT]?.forEach((data) => data[2]?.());
    refCleanupMap.get(node.e)?.();
    if (node.p === 2) {
      node.vC?.forEach((n) => n.p = 2);
    }
    node.vC?.forEach(removeNode);
  }
  if (!node.p) {
    node.e?.remove();
    delete node.e;
  }
  if (typeof node.tag === "function") {
    updateMap.delete(node);
    fallbackUpdateFnArrayMap.delete(node);
    delete node[DOM_STASH][3];
    node.a = true;
  }
}, "removeNode");
var apply = /* @__PURE__ */ __name((node, container, isNew) => {
  node.c = container;
  applyNodeObject(node, container, isNew);
}, "apply");
var findChildNodeIndex = /* @__PURE__ */ __name((childNodes, child) => {
  if (!child) {
    return;
  }
  for (let i = 0, len = childNodes.length; i < len; i++) {
    if (childNodes[i] === child) {
      return i;
    }
  }
  return;
}, "findChildNodeIndex");
var cancelBuild = /* @__PURE__ */ Symbol();
var applyNodeObject = /* @__PURE__ */ __name((node, container, isNew) => {
  const next = [];
  const remove = [];
  const callbacks = [];
  getNextChildren(node, container, next, remove, callbacks);
  remove.forEach(removeNode);
  const childNodes = isNew ? void 0 : container.childNodes;
  let offset;
  let insertBeforeNode = null;
  if (isNew) {
    offset = -1;
  } else if (!childNodes.length) {
    offset = 0;
  } else {
    const offsetByNextNode = findChildNodeIndex(childNodes, findInsertBefore(node.nN));
    if (offsetByNextNode !== void 0) {
      insertBeforeNode = childNodes[offsetByNextNode];
      offset = offsetByNextNode;
    } else {
      offset = findChildNodeIndex(childNodes, next.find((n) => n.tag !== HONO_PORTAL_ELEMENT && n.e)?.e) ?? -1;
    }
    if (offset === -1) {
      isNew = true;
    }
  }
  for (let i = 0, len = next.length; i < len; i++, offset++) {
    const child = next[i];
    let el;
    if (child.s && child.e) {
      el = child.e;
      child.s = false;
    } else {
      const isNewLocal = isNew || !child.e;
      if (isNodeString(child)) {
        if (child.e && child.d) {
          child.e.textContent = child.t;
        }
        child.d = false;
        el = child.e ||= document.createTextNode(child.t);
      } else {
        el = child.e ||= child.n ? document.createElementNS(child.n, child.tag) : document.createElement(child.tag);
        applyProps(el, child.props, child.pP);
        applyNodeObject(child, el, isNewLocal);
      }
    }
    if (child.tag === HONO_PORTAL_ELEMENT) {
      offset--;
    } else if (isNew) {
      if (!el.parentNode) {
        container.appendChild(el);
      }
    } else if (childNodes[offset] !== el && childNodes[offset - 1] !== el) {
      if (childNodes[offset + 1] === el) {
        container.appendChild(childNodes[offset]);
      } else {
        container.insertBefore(el, insertBeforeNode || childNodes[offset] || null);
      }
    }
  }
  if (node.pP) {
    node.pP = void 0;
  }
  if (callbacks.length) {
    const useLayoutEffectCbs = [];
    const useEffectCbs = [];
    callbacks.forEach(([, useLayoutEffectCb, , useEffectCb, useInsertionEffectCb]) => {
      if (useLayoutEffectCb) {
        useLayoutEffectCbs.push(useLayoutEffectCb);
      }
      if (useEffectCb) {
        useEffectCbs.push(useEffectCb);
      }
      useInsertionEffectCb?.();
    });
    useLayoutEffectCbs.forEach((cb) => cb());
    if (useEffectCbs.length) {
      requestAnimationFrame(() => {
        useEffectCbs.forEach((cb) => cb());
      });
    }
  }
}, "applyNodeObject");
var isSameContext = /* @__PURE__ */ __name((oldContexts, newContexts) => !!(oldContexts && oldContexts.length === newContexts.length && oldContexts.every((ctx, i) => ctx[1] === newContexts[i][1])), "isSameContext");
var fallbackUpdateFnArrayMap = /* @__PURE__ */ new WeakMap();
var build = /* @__PURE__ */ __name((context, node, children) => {
  const buildWithPreviousChildren = !children && node.pC;
  if (children) {
    node.pC ||= node.vC;
  }
  let foundErrorHandler;
  try {
    children ||= typeof node.tag == "function" ? invokeTag(context, node) : toArray(node.props.children);
    if (children[0]?.tag === "" && children[0][DOM_ERROR_HANDLER]) {
      foundErrorHandler = children[0][DOM_ERROR_HANDLER];
      context[5].push([context, foundErrorHandler, node]);
    }
    const oldVChildren = buildWithPreviousChildren ? [...node.pC] : node.vC ? [...node.vC] : void 0;
    const vChildren = [];
    let prevNode;
    for (let i = 0; i < children.length; i++) {
      if (Array.isArray(children[i])) {
        children.splice(i, 1, ...children[i].flat());
      }
      let child = buildNode(children[i]);
      if (child) {
        if (typeof child.tag === "function" && // eslint-disable-next-line @typescript-eslint/no-explicit-any
        !child.tag[DOM_INTERNAL_TAG]) {
          if (globalContexts.length > 0) {
            child[DOM_STASH][2] = globalContexts.map((c) => [c, c.values.at(-1)]);
          }
          if (context[5]?.length) {
            child[DOM_STASH][3] = context[5].at(-1);
          }
        }
        let oldChild;
        if (oldVChildren && oldVChildren.length) {
          const i2 = oldVChildren.findIndex(
            isNodeString(child) ? (c) => isNodeString(c) : child.key !== void 0 ? (c) => c.key === child.key && c.tag === child.tag : (c) => c.tag === child.tag
          );
          if (i2 !== -1) {
            oldChild = oldVChildren[i2];
            oldVChildren.splice(i2, 1);
          }
        }
        if (oldChild) {
          if (isNodeString(child)) {
            if (oldChild.t !== child.t) {
              ;
              oldChild.t = child.t;
              oldChild.d = true;
            }
            child = oldChild;
          } else {
            const pP = oldChild.pP = oldChild.props;
            oldChild.props = child.props;
            oldChild.f ||= child.f || node.f;
            if (typeof child.tag === "function") {
              const oldContexts = oldChild[DOM_STASH][2];
              oldChild[DOM_STASH][2] = child[DOM_STASH][2] || [];
              oldChild[DOM_STASH][3] = child[DOM_STASH][3];
              if (!oldChild.f && ((oldChild.o || oldChild) === child.o || // The code generated by the react compiler is memoized under this condition.
              oldChild.tag[DOM_MEMO]?.(pP, oldChild.props)) && // The `memo` function is memoized under this condition.
              isSameContext(oldContexts, oldChild[DOM_STASH][2])) {
                oldChild.s = true;
              }
            }
            child = oldChild;
          }
        } else if (!isNodeString(child) && nameSpaceContext2) {
          const ns = useContext(nameSpaceContext2);
          if (ns) {
            child.n = ns;
          }
        }
        if (!isNodeString(child) && !child.s) {
          build(context, child);
          delete child.f;
        }
        vChildren.push(child);
        if (prevNode && !prevNode.s && !child.s) {
          for (let p = prevNode; p && !isNodeString(p); p = p.vC?.at(-1)) {
            p.nN = child;
          }
        }
        prevNode = child;
      }
    }
    node.vR = buildWithPreviousChildren ? [...node.vC, ...oldVChildren || []] : oldVChildren || [];
    node.vC = vChildren;
    if (buildWithPreviousChildren) {
      delete node.pC;
    }
  } catch (e) {
    node.f = true;
    if (e === cancelBuild) {
      if (foundErrorHandler) {
        return;
      } else {
        throw e;
      }
    }
    const [errorHandlerContext, errorHandler2, errorHandlerNode] = node[DOM_STASH]?.[3] || [];
    if (errorHandler2) {
      const fallbackUpdateFn = /* @__PURE__ */ __name(() => update([0, false, context[2]], errorHandlerNode), "fallbackUpdateFn");
      const fallbackUpdateFnArray = fallbackUpdateFnArrayMap.get(errorHandlerNode) || [];
      fallbackUpdateFnArray.push(fallbackUpdateFn);
      fallbackUpdateFnArrayMap.set(errorHandlerNode, fallbackUpdateFnArray);
      const fallback = errorHandler2(e, () => {
        const fnArray = fallbackUpdateFnArrayMap.get(errorHandlerNode);
        if (fnArray) {
          const i = fnArray.indexOf(fallbackUpdateFn);
          if (i !== -1) {
            fnArray.splice(i, 1);
            return fallbackUpdateFn();
          }
        }
      });
      if (fallback) {
        if (context[0] === 1) {
          context[1] = true;
        } else {
          build(context, errorHandlerNode, [fallback]);
          if ((errorHandler2.length === 1 || context !== errorHandlerContext) && errorHandlerNode.c) {
            apply(errorHandlerNode, errorHandlerNode.c, false);
            return;
          }
        }
        throw cancelBuild;
      }
    }
    throw e;
  } finally {
    if (foundErrorHandler) {
      context[5].pop();
    }
  }
}, "build");
var buildNode = /* @__PURE__ */ __name((node) => {
  if (node === void 0 || node === null || typeof node === "boolean") {
    return void 0;
  } else if (typeof node === "string" || typeof node === "number") {
    return { t: node.toString(), d: true };
  } else {
    if ("vR" in node) {
      node = {
        tag: node.tag,
        props: node.props,
        key: node.key,
        f: node.f,
        type: node.tag,
        ref: node.props.ref,
        o: node.o || node
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      };
    }
    if (typeof node.tag === "function") {
      ;
      node[DOM_STASH] = [0, []];
    } else {
      const ns = nameSpaceMap[node.tag];
      if (ns) {
        nameSpaceContext2 ||= createContext("");
        node.props.children = [
          {
            tag: nameSpaceContext2,
            props: {
              value: node.n = `http://www.w3.org/${ns}`,
              children: node.props.children
            }
          }
        ];
      }
    }
    return node;
  }
}, "buildNode");
var updateSync = /* @__PURE__ */ __name((context, node) => {
  node[DOM_STASH][2]?.forEach(([c, v]) => {
    c.values.push(v);
  });
  try {
    build(context, node, void 0);
  } catch {
    return;
  }
  if (node.a) {
    delete node.a;
    return;
  }
  node[DOM_STASH][2]?.forEach(([c]) => {
    c.values.pop();
  });
  if (context[0] !== 1 || !context[1]) {
    apply(node, node.c, false);
  }
}, "updateSync");
var updateMap = /* @__PURE__ */ new WeakMap();
var currentUpdateSets = [];
var update = /* @__PURE__ */ __name(async (context, node) => {
  context[5] ||= [];
  const existing = updateMap.get(node);
  if (existing) {
    existing[0](void 0);
  }
  let resolve;
  const promise = new Promise((r) => resolve = r);
  updateMap.set(node, [
    resolve,
    () => {
      if (context[2]) {
        context[2](context, node, (context2) => {
          updateSync(context2, node);
        }).then(() => resolve(node));
      } else {
        updateSync(context, node);
        resolve(node);
      }
    }
  ]);
  if (currentUpdateSets.length) {
    ;
    currentUpdateSets.at(-1).add(node);
  } else {
    await Promise.resolve();
    const latest = updateMap.get(node);
    if (latest) {
      updateMap.delete(node);
      latest[1]();
    }
  }
  return promise;
}, "update");
var createPortal = /* @__PURE__ */ __name((children, container, key) => ({
  tag: HONO_PORTAL_ELEMENT,
  props: {
    children
  },
  key,
  e: container,
  p: 1
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}), "createPortal");

// node_modules/hono/dist/jsx/hooks/index.js
var STASH_SATE = 0;
var STASH_EFFECT = 1;
var STASH_CALLBACK = 2;
var STASH_MEMO = 3;
var resolvedPromiseValueMap = /* @__PURE__ */ new WeakMap();
var isDepsChanged = /* @__PURE__ */ __name((prevDeps, deps) => !prevDeps || !deps || prevDeps.length !== deps.length || deps.some((dep, i) => dep !== prevDeps[i]), "isDepsChanged");
var updateHook = void 0;
var pendingStack = [];
var useState = /* @__PURE__ */ __name((initialState) => {
  const resolveInitialState = /* @__PURE__ */ __name(() => typeof initialState === "function" ? initialState() : initialState, "resolveInitialState");
  const buildData = buildDataStack.at(-1);
  if (!buildData) {
    return [resolveInitialState(), () => {
    }];
  }
  const [, node] = buildData;
  const stateArray = node[DOM_STASH][1][STASH_SATE] ||= [];
  const hookIndex = node[DOM_STASH][0]++;
  return stateArray[hookIndex] ||= [
    resolveInitialState(),
    (newState) => {
      const localUpdateHook = updateHook;
      const stateData = stateArray[hookIndex];
      if (typeof newState === "function") {
        newState = newState(stateData[0]);
      }
      if (!Object.is(newState, stateData[0])) {
        stateData[0] = newState;
        if (pendingStack.length) {
          const [pendingType, pendingPromise] = pendingStack.at(-1);
          Promise.all([
            pendingType === 3 ? node : update([pendingType, false, localUpdateHook], node),
            pendingPromise
          ]).then(([node2]) => {
            if (!node2 || !(pendingType === 2 || pendingType === 3)) {
              return;
            }
            const lastVC = node2.vC;
            const addUpdateTask = /* @__PURE__ */ __name(() => {
              setTimeout(() => {
                if (lastVC !== node2.vC) {
                  return;
                }
                update([pendingType === 3 ? 1 : 0, false, localUpdateHook], node2);
              });
            }, "addUpdateTask");
            requestAnimationFrame(addUpdateTask);
          });
        } else {
          update([0, false, localUpdateHook], node);
        }
      }
    }
  ];
}, "useState");
var useCallback = /* @__PURE__ */ __name((callback, deps) => {
  const buildData = buildDataStack.at(-1);
  if (!buildData) {
    return callback;
  }
  const [, node] = buildData;
  const callbackArray = node[DOM_STASH][1][STASH_CALLBACK] ||= [];
  const hookIndex = node[DOM_STASH][0]++;
  const prevDeps = callbackArray[hookIndex];
  if (isDepsChanged(prevDeps?.[1], deps)) {
    callbackArray[hookIndex] = [callback, deps];
  } else {
    callback = callbackArray[hookIndex][0];
  }
  return callback;
}, "useCallback");
var use = /* @__PURE__ */ __name((promise) => {
  const cachedRes = resolvedPromiseValueMap.get(promise);
  if (cachedRes) {
    if (cachedRes.length === 2) {
      throw cachedRes[1];
    }
    return cachedRes[0];
  }
  promise.then(
    (res) => resolvedPromiseValueMap.set(promise, [res]),
    (e) => resolvedPromiseValueMap.set(promise, [void 0, e])
  );
  throw promise;
}, "use");
var useMemo = /* @__PURE__ */ __name((factory, deps) => {
  const buildData = buildDataStack.at(-1);
  if (!buildData) {
    return factory();
  }
  const [, node] = buildData;
  const memoArray = node[DOM_STASH][1][STASH_MEMO] ||= [];
  const hookIndex = node[DOM_STASH][0]++;
  const prevDeps = memoArray[hookIndex];
  if (isDepsChanged(prevDeps?.[1], deps)) {
    memoArray[hookIndex] = [factory(), deps];
  }
  return memoArray[hookIndex][0];
}, "useMemo");

// node_modules/hono/dist/jsx/dom/hooks/index.js
var FormContext = createContext({
  pending: false,
  data: null,
  method: null,
  action: null
});
var actions = /* @__PURE__ */ new Set();
var registerAction = /* @__PURE__ */ __name((action) => {
  actions.add(action);
  action.finally(() => actions.delete(action));
}, "registerAction");

// node_modules/hono/dist/jsx/dom/intrinsic-element/components.js
var clearCache = /* @__PURE__ */ __name(() => {
  blockingPromiseMap = /* @__PURE__ */ Object.create(null);
  createdElements = /* @__PURE__ */ Object.create(null);
}, "clearCache");
var composeRef = /* @__PURE__ */ __name((ref, cb) => {
  return useMemo(
    () => (e) => {
      let refCleanup;
      if (ref) {
        if (typeof ref === "function") {
          refCleanup = ref(e) || (() => {
            ref(null);
          });
        } else if (ref && "current" in ref) {
          ref.current = e;
          refCleanup = /* @__PURE__ */ __name(() => {
            ref.current = null;
          }, "refCleanup");
        }
      }
      const cbCleanup = cb(e);
      return () => {
        cbCleanup?.();
        refCleanup?.();
      };
    },
    [ref]
  );
}, "composeRef");
var blockingPromiseMap = /* @__PURE__ */ Object.create(null);
var createdElements = /* @__PURE__ */ Object.create(null);
var documentMetadataTag2 = /* @__PURE__ */ __name((tag, props, preserveNodeType, supportSort, supportBlocking) => {
  if (props?.itemProp) {
    return {
      tag,
      props,
      type: tag,
      ref: props.ref
    };
  }
  const head = document.head;
  let { onLoad, onError, precedence, blocking, ...restProps } = props;
  let element = null;
  let created = false;
  const deDupeKeys = deDupeKeyMap[tag];
  let existingElements = void 0;
  if (deDupeKeys.length > 0) {
    const tags = head.querySelectorAll(tag);
    LOOP: for (const e of tags) {
      for (const key of deDupeKeyMap[tag]) {
        if (e.getAttribute(key) === props[key]) {
          element = e;
          break LOOP;
        }
      }
    }
    if (!element) {
      const cacheKey = deDupeKeys.reduce(
        (acc, key) => props[key] === void 0 ? acc : `${acc}-${key}-${props[key]}`,
        tag
      );
      created = !createdElements[cacheKey];
      element = createdElements[cacheKey] ||= (() => {
        const e = document.createElement(tag);
        for (const key of deDupeKeys) {
          if (props[key] !== void 0) {
            e.setAttribute(key, props[key]);
          }
          if (props.rel) {
            e.setAttribute("rel", props.rel);
          }
        }
        return e;
      })();
    }
  } else {
    existingElements = head.querySelectorAll(tag);
  }
  precedence = supportSort ? precedence ?? "" : void 0;
  if (supportSort) {
    restProps[dataPrecedenceAttr] = precedence;
  }
  const insert = useCallback(
    (e) => {
      if (deDupeKeys.length > 0) {
        let found = false;
        for (const existingElement of head.querySelectorAll(tag)) {
          if (found && existingElement.getAttribute(dataPrecedenceAttr) !== precedence) {
            head.insertBefore(e, existingElement);
            return;
          }
          if (existingElement.getAttribute(dataPrecedenceAttr) === precedence) {
            found = true;
          }
        }
        head.appendChild(e);
      } else if (existingElements) {
        let found = false;
        for (const existingElement of existingElements) {
          if (existingElement === e) {
            found = true;
            break;
          }
        }
        if (!found) {
          head.insertBefore(
            e,
            head.contains(existingElements[0]) ? existingElements[0] : head.querySelector(tag)
          );
        }
        existingElements = void 0;
      }
    },
    [precedence]
  );
  const ref = composeRef(props.ref, (e) => {
    const key = deDupeKeys[0];
    if (preserveNodeType === 2) {
      e.innerHTML = "";
    }
    if (created || existingElements) {
      insert(e);
    }
    if (!onError && !onLoad) {
      return;
    }
    let promise = blockingPromiseMap[e.getAttribute(key)] ||= new Promise(
      (resolve, reject) => {
        e.addEventListener("load", resolve);
        e.addEventListener("error", reject);
      }
    );
    if (onLoad) {
      promise = promise.then(onLoad);
    }
    if (onError) {
      promise = promise.catch(onError);
    }
    promise.catch(() => {
    });
  });
  if (supportBlocking && blocking === "render") {
    const key = deDupeKeyMap[tag][0];
    if (props[key]) {
      const value = props[key];
      const promise = blockingPromiseMap[value] ||= new Promise((resolve, reject) => {
        insert(element);
        element.addEventListener("load", resolve);
        element.addEventListener("error", reject);
      });
      use(promise);
    }
  }
  const jsxNode = {
    tag,
    type: tag,
    props: {
      ...restProps,
      ref
    },
    ref
  };
  jsxNode.p = preserveNodeType;
  if (element) {
    jsxNode.e = element;
  }
  return createPortal(
    jsxNode,
    head
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  );
}, "documentMetadataTag");
var title2 = /* @__PURE__ */ __name((props) => {
  const nameSpaceContext3 = getNameSpaceContext2();
  const ns = nameSpaceContext3 && useContext(nameSpaceContext3);
  if (ns?.endsWith("svg")) {
    return {
      tag: "title",
      props,
      type: "title",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref: props.ref
    };
  }
  return documentMetadataTag2("title", props, void 0, false, false);
}, "title");
var script2 = /* @__PURE__ */ __name((props) => {
  if (!props || ["src", "async"].some((k) => !props[k])) {
    return {
      tag: "script",
      props,
      type: "script",
      ref: props.ref
    };
  }
  return documentMetadataTag2("script", props, 1, false, true);
}, "script");
var style2 = /* @__PURE__ */ __name((props) => {
  if (!props || !["href", "precedence"].every((k) => k in props)) {
    return {
      tag: "style",
      props,
      type: "style",
      ref: props.ref
    };
  }
  props["data-href"] = props.href;
  delete props.href;
  return documentMetadataTag2("style", props, 2, true, true);
}, "style");
var link2 = /* @__PURE__ */ __name((props) => {
  if (!props || ["onLoad", "onError"].some((k) => k in props) || props.rel === "stylesheet" && (!("precedence" in props) || "disabled" in props)) {
    return {
      tag: "link",
      props,
      type: "link",
      ref: props.ref
    };
  }
  return documentMetadataTag2("link", props, 1, "precedence" in props, true);
}, "link");
var meta2 = /* @__PURE__ */ __name((props) => {
  return documentMetadataTag2("meta", props, void 0, false, false);
}, "meta");
var customEventFormAction = /* @__PURE__ */ Symbol();
var form2 = /* @__PURE__ */ __name((props) => {
  const { action, ...restProps } = props;
  if (typeof action !== "function") {
    ;
    restProps.action = action;
  }
  const [state, setState] = useState([null, false]);
  const onSubmit = useCallback(
    async (ev) => {
      const currentAction = ev.isTrusted ? action : ev.detail[customEventFormAction];
      if (typeof currentAction !== "function") {
        return;
      }
      ev.preventDefault();
      const formData = new FormData(ev.target);
      setState([formData, true]);
      const actionRes = currentAction(formData);
      if (actionRes instanceof Promise) {
        registerAction(actionRes);
        await actionRes;
      }
      setState([null, true]);
    },
    []
  );
  const ref = composeRef(props.ref, (el) => {
    el.addEventListener("submit", onSubmit);
    return () => {
      el.removeEventListener("submit", onSubmit);
    };
  });
  const [data, isDirty2] = state;
  state[1] = false;
  return {
    tag: FormContext,
    props: {
      value: {
        pending: data !== null,
        data,
        method: data ? "post" : null,
        action: data ? action : null
      },
      children: {
        tag: "form",
        props: {
          ...restProps,
          ref
        },
        type: "form",
        ref
      }
    },
    f: isDirty2
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  };
}, "form");
var formActionableElement2 = /* @__PURE__ */ __name((tag, {
  formAction,
  ...props
}) => {
  if (typeof formAction === "function") {
    const onClick = useCallback((ev) => {
      ev.preventDefault();
      ev.currentTarget.form.dispatchEvent(
        new CustomEvent("submit", { detail: { [customEventFormAction]: formAction } })
      );
    }, []);
    props.ref = composeRef(props.ref, (el) => {
      el.addEventListener("click", onClick);
      return () => {
        el.removeEventListener("click", onClick);
      };
    });
  }
  return {
    tag,
    props,
    type: tag,
    ref: props.ref
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  };
}, "formActionableElement");
var input2 = /* @__PURE__ */ __name((props) => formActionableElement2("input", props), "input");
var button2 = /* @__PURE__ */ __name((props) => formActionableElement2("button", props), "button");
Object.assign(domRenderers, {
  title: title2,
  script: script2,
  style: style2,
  link: link2,
  meta: meta2,
  form: form2,
  input: input2,
  button: button2
});

// node_modules/hono/dist/jsx/dom/jsx-dev-runtime.js
var jsxDEV2 = /* @__PURE__ */ __name((tag, props, key) => {
  if (typeof tag === "string" && components_exports2[tag]) {
    tag = components_exports2[tag];
  }
  return {
    tag,
    type: tag,
    props,
    key,
    ref: props.ref
  };
}, "jsxDEV");
var Fragment2 = /* @__PURE__ */ __name((props) => jsxDEV2("", props, void 0), "Fragment");

// node_modules/hono/dist/jsx/dom/components.js
var ErrorBoundary = /* @__PURE__ */ __name((({ children, fallback, fallbackRender, onError }) => {
  const res = Fragment2({ children });
  res[DOM_ERROR_HANDLER] = (err) => {
    if (err instanceof Promise) {
      throw err;
    }
    onError?.(err);
    return fallbackRender?.(err) || fallback;
  };
  return res;
}), "ErrorBoundary");
var Suspense = /* @__PURE__ */ __name((({
  children,
  fallback
}) => {
  const res = Fragment2({ children });
  res[DOM_ERROR_HANDLER] = (err, retry) => {
    if (!(err instanceof Promise)) {
      throw err;
    }
    err.finally(retry);
    return fallback;
  };
  return res;
}), "Suspense");

// node_modules/hono/dist/jsx/streaming.js
var StreamingContext = createContext2(null);
var suspenseCounter = 0;
var Suspense2 = /* @__PURE__ */ __name(async ({
  children,
  fallback
}) => {
  if (!Array.isArray(children)) {
    children = [children];
  }
  const nonce = useContext(StreamingContext)?.scriptNonce;
  let resArray = [];
  const stackNode = { [DOM_STASH]: [0, []] };
  const popNodeStack = /* @__PURE__ */ __name((value) => {
    buildDataStack.pop();
    return value;
  }, "popNodeStack");
  try {
    stackNode[DOM_STASH][0] = 0;
    buildDataStack.push([[], stackNode]);
    resArray = children.map(
      (c) => c == null || typeof c === "boolean" ? "" : c.toString()
    );
  } catch (e) {
    if (e instanceof Promise) {
      resArray = [
        e.then(() => {
          stackNode[DOM_STASH][0] = 0;
          buildDataStack.push([[], stackNode]);
          return childrenToString(children).then(popNodeStack);
        })
      ];
    } else {
      throw e;
    }
  } finally {
    popNodeStack();
  }
  if (resArray.some((res) => res instanceof Promise)) {
    const index = suspenseCounter++;
    const fallbackStr = await fallback.toString();
    return raw(`<template id="H:${index}"></template>${fallbackStr}<!--/$-->`, [
      ...fallbackStr.callbacks || [],
      ({ phase, buffer, context }) => {
        if (phase === HtmlEscapedCallbackPhase.BeforeStream) {
          return;
        }
        return Promise.all(resArray).then(async (htmlArray) => {
          htmlArray = htmlArray.flat();
          const content = htmlArray.join("");
          if (buffer) {
            buffer[0] = buffer[0].replace(
              new RegExp(`<template id="H:${index}"></template>.*?<!--/\\$-->`),
              content
            );
          }
          let html2 = buffer ? "" : `<template data-hono-target="H:${index}">${content}</template><script${nonce ? ` nonce="${nonce}"` : ""}>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${index}')
if(!d)return
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
<\/script>`;
          const callbacks = htmlArray.map((html22) => html22.callbacks || []).flat();
          if (!callbacks.length) {
            return html2;
          }
          if (phase === HtmlEscapedCallbackPhase.Stream) {
            html2 = await resolveCallback(html2, HtmlEscapedCallbackPhase.BeforeStream, true, context);
          }
          return raw(html2, callbacks);
        });
      }
    ]);
  } else {
    return raw(resArray.join(""));
  }
}, "Suspense");
Suspense2[DOM_RENDERER] = Suspense;
var textEncoder = new TextEncoder();

// node_modules/hono/dist/jsx/components.js
var errorBoundaryCounter = 0;
var childrenToString = /* @__PURE__ */ __name(async (children) => {
  try {
    return children.flat().map((c) => c == null || typeof c === "boolean" ? "" : c.toString());
  } catch (e) {
    if (e instanceof Promise) {
      await e;
      return childrenToString(children);
    } else {
      throw e;
    }
  }
}, "childrenToString");
var resolveChildEarly = /* @__PURE__ */ __name((c) => {
  if (c == null || typeof c === "boolean") {
    return "";
  } else if (typeof c === "string") {
    return c;
  } else {
    const str = c.toString();
    if (!(str instanceof Promise)) {
      return raw(str);
    } else {
      return str;
    }
  }
}, "resolveChildEarly");
var ErrorBoundary2 = /* @__PURE__ */ __name(async ({ children, fallback, fallbackRender, onError }) => {
  if (!children) {
    return raw("");
  }
  if (!Array.isArray(children)) {
    children = [children];
  }
  const nonce = useContext(StreamingContext)?.scriptNonce;
  let fallbackStr;
  const resolveFallbackStr = /* @__PURE__ */ __name(async () => {
    const awaitedFallback = await fallback;
    if (typeof awaitedFallback === "string") {
      fallbackStr = awaitedFallback;
    } else {
      fallbackStr = await awaitedFallback?.toString();
      if (typeof fallbackStr === "string") {
        fallbackStr = raw(fallbackStr);
      }
    }
  }, "resolveFallbackStr");
  const fallbackRes = /* @__PURE__ */ __name((error) => {
    onError?.(error);
    return fallbackStr || fallbackRender && jsx(Fragment, {}, fallbackRender(error)) || "";
  }, "fallbackRes");
  let resArray = [];
  try {
    resArray = children.map(resolveChildEarly);
  } catch (e) {
    await resolveFallbackStr();
    if (e instanceof Promise) {
      resArray = [
        e.then(() => childrenToString(children)).catch((e2) => fallbackRes(e2))
      ];
    } else {
      resArray = [fallbackRes(e)];
    }
  }
  if (resArray.some((res) => res instanceof Promise)) {
    await resolveFallbackStr();
    const index = errorBoundaryCounter++;
    const replaceRe = RegExp(`(<template id="E:${index}"></template>.*?)(.*?)(<!--E:${index}-->)`);
    const caught = false;
    const catchCallback = /* @__PURE__ */ __name(async ({ error: error2, buffer }) => {
      if (caught) {
        return "";
      }
      const fallbackResString = await Fragment({
        children: fallbackRes(error2)
      }).toString();
      if (buffer) {
        buffer[0] = buffer[0].replace(replaceRe, fallbackResString);
      }
      return buffer ? "" : `<template data-hono-target="E:${index}">${fallbackResString}</template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('E:${index}')
if(!d)return
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='E:${index}')
d.replaceWith(c.content)
})(document)
<\/script>`;
    }, "catchCallback");
    let error;
    const promiseAll = Promise.all(resArray).catch((e) => error = e);
    return raw(`<template id="E:${index}"></template><!--E:${index}-->`, [
      ({ phase, buffer, context }) => {
        if (phase === HtmlEscapedCallbackPhase.BeforeStream) {
          return;
        }
        return promiseAll.then(async (htmlArray) => {
          if (error) {
            throw error;
          }
          htmlArray = htmlArray.flat();
          const content = htmlArray.join("");
          let html2 = buffer ? "" : `<template data-hono-target="E:${index}">${content}</template><script${nonce ? ` nonce="${nonce}"` : ""}>
((d,c) => {
c=d.currentScript.previousSibling
d=d.getElementById('E:${index}')
if(!d)return
d.parentElement.insertBefore(c.content,d.nextSibling)
})(document)
<\/script>`;
          if (htmlArray.every((html22) => !html22.callbacks?.length)) {
            if (buffer) {
              buffer[0] = buffer[0].replace(replaceRe, content);
            }
            return html2;
          }
          if (buffer) {
            buffer[0] = buffer[0].replace(
              replaceRe,
              (_all, pre, _, post) => `${pre}${content}${post}`
            );
          }
          const callbacks = htmlArray.map((html22) => html22.callbacks || []).flat();
          if (phase === HtmlEscapedCallbackPhase.Stream) {
            html2 = await resolveCallback(
              html2,
              HtmlEscapedCallbackPhase.BeforeStream,
              true,
              context
            );
          }
          let resolvedCount = 0;
          const promises = callbacks.map(
            (c) => (...args) => c(...args)?.then((content2) => {
              resolvedCount++;
              if (buffer) {
                if (resolvedCount === callbacks.length) {
                  buffer[0] = buffer[0].replace(replaceRe, (_all, _pre, content3) => content3);
                }
                buffer[0] += content2;
                return raw("", content2.callbacks);
              }
              return raw(
                content2 + (resolvedCount !== callbacks.length ? "" : `<script>
((d,c,n) => {
d=d.getElementById('E:${index}')
if(!d)return
n=d.nextSibling
while(n.nodeType!=8||n.nodeValue!='E:${index}'){n=n.nextSibling}
n.remove()
d.remove()
})(document)
<\/script>`),
                content2.callbacks
              );
            }).catch((error2) => catchCallback({ error: error2, buffer }))
          );
          return raw(html2, promises);
        }).catch((error2) => catchCallback({ error: error2, buffer }));
      }
    ]);
  } else {
    return Fragment({ children: resArray });
  }
}, "ErrorBoundary");
ErrorBoundary2[DOM_RENDERER] = ErrorBoundary;

// src/views/push-settings.tsx
var PUSH_MANIFEST = {
  name: "GOATkit Admin",
  short_name: "GOATkit",
  start_url: "/admin",
  scope: "/admin/",
  display: "standalone",
  background_color: "#eff1f5",
  // Manifest does not support separate dark theme_color; we set the light base.
  // HTML <meta name="theme-color"> is updated dynamically for Latte/Mocha.
  theme_color: "#eff1f5",
  icons: [
    {
      src: "/images/uncle-logo.svg",
      sizes: "192x192",
      type: "image/svg+xml",
      purpose: "any"
    },
    {
      src: "/images/uncle-logo.svg",
      sizes: "512x512",
      type: "image/svg+xml",
      purpose: "any"
    }
  ]
};
var PUSH_SERVICE_WORKER_SCRIPT = `
self.addEventListener('install', function(event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

async function fetchPendingPushItems() {
  const subscription = await self.registration.pushManager.getSubscription();
  if (!subscription || !subscription.endpoint) return [];

  const response = await fetch('/admin/push/pending?endpoint=' + encodeURIComponent(subscription.endpoint), {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) return [];
  const payload = await response.json();
  if (!payload || !Array.isArray(payload.notifications)) return [];
  return payload.notifications;
}

self.addEventListener('push', function(event) {
  event.waitUntil((async function() {
    try {
      var items = await fetchPendingPushItems();
      if (!items.length) {
        await self.registration.showNotification('GOATkit update', {
          body: 'Open the app for the latest activity.',
          data: { url: '/admin' },
          tag: 'goatkit-fallback'
        });
        return;
      }

      for (var i = 0; i < items.length; i++) {
        var item = items[i] || {};
        await self.registration.showNotification(item.title || 'GOATkit update', {
          body: item.body || 'Open the app for details.',
          data: { url: item.url || '/admin' },
          tag: item.id ? ('goatkit-' + item.id) : undefined,
          renotify: false,
        });
      }
    } catch (_error) {
      await self.registration.showNotification('GOATkit update', {
        body: 'Open the app for the latest activity.',
        data: { url: '/admin' },
        tag: 'goatkit-fallback-error'
      });
    }
  })());
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var target = '/admin';
  if (event.notification && event.notification.data && typeof event.notification.data.url === 'string') {
    target = event.notification.data.url;
  }

  event.waitUntil((async function() {
    var clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (var i = 0; i < clientsList.length; i++) {
      var client = clientsList[i];
      try {
        var parsed = new URL(client.url);
        if (parsed.origin === self.location.origin) {
          if ('focus' in client) {
            await client.focus();
          }
          if ('navigate' in client) {
            await client.navigate(target);
          }
          return;
        }
      } catch (_error) {
      }
    }

    if (self.clients.openWindow) {
      await self.clients.openWindow(target);
    }
  })());
});
`;
var _a2;
var PushSettingsPage = /* @__PURE__ */ __name(() => /* @__PURE__ */ jsxDEV(Layout, { title: "Push Notifications", children: [
  /* @__PURE__ */ jsxDEV("div", { class: "page-header", children: /* @__PURE__ */ jsxDEV("h2", { children: "Push Notifications" }) }),
  /* @__PURE__ */ jsxDEV("div", { class: "p-4 md:p-8", children: /* @__PURE__ */ jsxDEV("div", { class: "grid gap-4 md:gap-6", style: "max-width:800px;", children: /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: [
    /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold mb-2", children: "Staff Device Alerts" }),
    /* @__PURE__ */ jsxDEV("p", { class: "text-sm text-muted-foreground mb-3", children: "Enable browser push on this device so staff get alerted for new jobs and new messages." }),
    /* @__PURE__ */ jsxDEV("div", { id: "push-status", class: "text-sm mb-4 px-3 py-2 rounded", style: "background:var(--surface-elevated,#eff1f5);color:var(--text-primary,#333);border:1px solid var(--border,#ccd0da);", children: "Checking push support..." }),
    /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 mb-4", children: [
      /* @__PURE__ */ jsxDEV("label", { class: "flex items-center gap-2 text-sm", for: "push-notify-jobs", children: [
        /* @__PURE__ */ jsxDEV("input", { id: "push-notify-jobs", type: "checkbox", class: "uk-checkbox", checked: true }),
        /* @__PURE__ */ jsxDEV("span", { children: "Notify on new jobs" })
      ] }),
      /* @__PURE__ */ jsxDEV("label", { class: "flex items-center gap-2 text-sm", for: "push-notify-messages", children: [
        /* @__PURE__ */ jsxDEV("input", { id: "push-notify-messages", type: "checkbox", class: "uk-checkbox", checked: true }),
        /* @__PURE__ */ jsxDEV("span", { children: "Notify on new messages" })
      ] })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { class: "flex items-center gap-2", style: "flex-wrap:wrap;", children: [
      /* @__PURE__ */ jsxDEV("button", { id: "push-enable-btn", type: "button", class: "uk-btn uk-btn-primary uk-btn-sm", children: "Enable on this device" }),
      /* @__PURE__ */ jsxDEV("button", { id: "push-disable-btn", type: "button", class: "uk-btn uk-btn-default uk-btn-sm", children: "Disable on this device" }),
      /* @__PURE__ */ jsxDEV("button", { id: "push-test-btn", type: "button", class: "uk-btn uk-btn-default uk-btn-sm", children: "Send test notification" })
    ] }),
    /* @__PURE__ */ jsxDEV("p", { class: "text-xs text-muted-foreground mt-3", children: "Tip: install the admin as a PWA for the most reliable delivery, especially on iOS." })
  ] }) }) }),
  html(_a2 || (_a2 = __template(["<script>\n(function() {\n  var statusEl = document.getElementById('push-status');\n  var enableBtn = document.getElementById('push-enable-btn');\n  var disableBtn = document.getElementById('push-disable-btn');\n  var testBtn = document.getElementById('push-test-btn');\n  var jobsCheckbox = document.getElementById('push-notify-jobs');\n  var messagesCheckbox = document.getElementById('push-notify-messages');\n\n  var vapidPublicKey = '';\n\n  function setStatus(message, tone) {\n    if (!statusEl) return;\n    statusEl.textContent = message;\n\n    if (tone === 'ok') {\n      statusEl.style.background = 'rgba(34,197,94,0.1)';\n      statusEl.style.color = '#15803d';\n      statusEl.style.borderColor = 'rgba(21,128,61,0.35)';\n      return;\n    }\n\n    if (tone === 'error') {\n      statusEl.style.background = 'rgba(239,68,68,0.1)';\n      statusEl.style.color = '#dc2626';\n      statusEl.style.borderColor = 'rgba(220,38,38,0.35)';\n      return;\n    }\n\n    if (tone === 'warn') {\n      statusEl.style.background = 'rgba(245,158,11,0.12)';\n      statusEl.style.color = '#b45309';\n      statusEl.style.borderColor = 'rgba(180,83,9,0.35)';\n      return;\n    }\n\n    statusEl.style.background = 'var(--surface-elevated,#eff1f5)';\n    statusEl.style.color = 'var(--text-primary,#333)';\n    statusEl.style.borderColor = 'var(--border,#ccd0da)';\n  }\n\n  function setButtonsEnabled(enabled, isSubscribed) {\n    if (enableBtn) enableBtn.disabled = !enabled;\n    if (disableBtn) disableBtn.disabled = !enabled || !isSubscribed;\n    if (testBtn) testBtn.disabled = !enabled || !isSubscribed;\n  }\n\n  function normalizeErrorMessage(prefix, err) {\n    var message = '';\n    if (err && typeof err.message === 'string') message = err.message;\n    else message = String(err || 'unknown error');\n    message = message.replace(/s+/g, ' ').trim();\n    if (prefix) return prefix + ': ' + message;\n    return message;\n  }\n\n  async function safeFetchJson(url, options) {\n    var response = await fetch(url, options || {});\n    var text = '';\n    try {\n      text = await response.clone().text();\n    } catch (_error) {\n      text = '';\n    }\n\n    var json = null;\n    try {\n      json = text ? JSON.parse(text) : null;\n    } catch (_error) {\n      json = null;\n    }\n\n    return {\n      ok: response.ok,\n      status: response.status,\n      text: text,\n      json: json,\n    };\n  }\n\n  function selectedPreferences() {\n    return {\n      notifyNewJobs: jobsCheckbox ? !!jobsCheckbox.checked : true,\n      notifyNewMessages: messagesCheckbox ? !!messagesCheckbox.checked : true,\n    };\n  }\n\n  function base64UrlToUint8Array(base64Url) {\n    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');\n    var padding = '='.repeat((4 - (base64.length % 4)) % 4);\n    var binary = atob(base64 + padding);\n    var bytes = new Uint8Array(binary.length);\n    for (var i = 0; i < binary.length; i++) {\n      bytes[i] = binary.charCodeAt(i);\n    }\n    return bytes;\n  }\n\n  async function ensureRegistration() {\n    var reg = await navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' });\n    try {\n      await navigator.serviceWorker.ready;\n    } catch (_error) {\n    }\n    return reg;\n  }\n\n  async function getCurrentSubscription() {\n    var registration = await ensureRegistration();\n    return registration.pushManager.getSubscription();\n  }\n\n  async function loadServerStatus(endpoint) {\n    var query = endpoint ? ('?endpoint=' + encodeURIComponent(endpoint)) : '';\n    var result = await safeFetchJson('/admin/push/status' + query, {\n      method: 'GET',\n      headers: { Accept: 'application/json' },\n    });\n\n    if (!result.ok) return null;\n    return result.json;\n  }\n\n  async function pushSubscribe(subscription) {\n    var result = await safeFetchJson('/admin/push/subscribe', {\n      method: 'POST',\n      headers: {\n        'Content-Type': 'application/json',\n        Accept: 'application/json',\n      },\n      body: JSON.stringify({\n        subscription: subscription.toJSON(),\n        preferences: selectedPreferences(),\n      }),\n    });\n\n    if (!result.ok) {\n      var msg = (result.json && result.json.error) ? result.json.error : (result.text || 'Failed to save subscription');\n      throw new Error('Subscribe failed (' + String(result.status) + '): ' + String(msg));\n    }\n  }\n\n  async function pushUnsubscribe(endpoint) {\n    await safeFetchJson('/admin/push/unsubscribe', {\n      method: 'POST',\n      headers: {\n        'Content-Type': 'application/json',\n        Accept: 'application/json',\n      },\n      body: JSON.stringify({ endpoint: endpoint || '' }),\n    });\n  }\n\n  async function sendTestNotification(endpoint) {\n    var result = await safeFetchJson('/admin/push/test', {\n      method: 'POST',\n      headers: {\n        'Content-Type': 'application/json',\n        Accept: 'application/json',\n      },\n      body: JSON.stringify({ endpoint: endpoint || '' }),\n    });\n\n    if (!result.ok) {\n      var message = (result.json && result.json.error) ? result.json.error : (result.text || 'Test push failed');\n      throw new Error('Test failed (' + String(result.status) + '): ' + String(message));\n    }\n\n    return result.json;\n  }\n\n  async function syncPreferencesIfSubscribed() {\n    try {\n      var subscription = await getCurrentSubscription();\n      if (!subscription) return;\n      await pushSubscribe(subscription);\n    } catch (_error) {\n    }\n  }\n\n  async function refreshState() {\n    try {\n      setStatus('Checking push support...', '');\n\n      var response = await safeFetchJson('/admin/push/vapid-public-key', {\n        method: 'GET',\n        headers: { Accept: 'application/json' },\n      });\n\n      if (!response.ok) {\n        var msg = (response.json && response.json.error) ? response.json.error : (response.text || 'Could not load VAPID key');\n        throw new Error('VAPID key (' + String(response.status) + '): ' + String(msg));\n      }\n\n      var keyPayload = response.json;\n      vapidPublicKey = keyPayload && typeof keyPayload.publicKey === 'string' ? keyPayload.publicKey : '';\n      if (!vapidPublicKey) throw new Error('VAPID key missing');\n\n      var subscription = await getCurrentSubscription();\n      if (!subscription) {\n        setStatus('Push is disabled on this device.', 'warn');\n        setButtonsEnabled(true, false);\n        return;\n      }\n\n      var serverStatus = await loadServerStatus(subscription.endpoint);\n      if (serverStatus && typeof serverStatus.notifyNewJobs === 'boolean' && jobsCheckbox) {\n        jobsCheckbox.checked = serverStatus.notifyNewJobs;\n      }\n      if (serverStatus && typeof serverStatus.notifyNewMessages === 'boolean' && messagesCheckbox) {\n        messagesCheckbox.checked = serverStatus.notifyNewMessages;\n      }\n\n      setStatus('Push is enabled on this device.', 'ok');\n      setButtonsEnabled(true, true);\n    } catch (error) {\n      setStatus(normalizeErrorMessage('Push setup failed', error), 'error');\n      setButtonsEnabled(false, false);\n    }\n  }\n\n  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {\n    setStatus('This browser does not support web push notifications.', 'error');\n    setButtonsEnabled(false, false);\n    return;\n  }\n\n  if (enableBtn) {\n    enableBtn.addEventListener('click', async function() {\n      setButtonsEnabled(false, false);\n      try {\n        var permission = await Notification.requestPermission();\n        if (permission !== 'granted') {\n          setStatus('Notification permission was not granted.', 'error');\n          await refreshState();\n          return;\n        }\n\n        var registration = await ensureRegistration();\n        var subscription = await registration.pushManager.getSubscription();\n\n        if (!subscription) {\n          subscription = await registration.pushManager.subscribe({\n            userVisibleOnly: true,\n            applicationServerKey: base64UrlToUint8Array(vapidPublicKey),\n          });\n        }\n\n        await pushSubscribe(subscription);\n\n        try {\n          setStatus('Sending test notification...', 'warn');\n          await sendTestNotification(subscription.endpoint);\n        } catch (_error) {\n        }\n\n        setStatus('Push enabled on this device.', 'ok');\n        setButtonsEnabled(true, true);\n      } catch (error) {\n        setStatus(normalizeErrorMessage('Unable to enable push', error), 'error');\n        setButtonsEnabled(true, false);\n      }\n    });\n  }\n\n  if (testBtn) {\n    testBtn.addEventListener('click', async function() {\n      setButtonsEnabled(false, true);\n      try {\n        var subscription = await getCurrentSubscription();\n        if (!subscription) {\n          setStatus('Push is disabled on this device.', 'warn');\n          setButtonsEnabled(true, false);\n          return;\n        }\n\n        setStatus('Sending test notification...', 'warn');\n        var result = await sendTestNotification(subscription.endpoint);\n        if (result && typeof result.status === 'number') {\n          setStatus('Test sent (push service status ' + String(result.status) + ').', 'ok');\n        } else {\n          setStatus('Test sent.', 'ok');\n        }\n        setButtonsEnabled(true, true);\n      } catch (error) {\n        setStatus(normalizeErrorMessage('Unable to send test', error), 'error');\n        setButtonsEnabled(true, true);\n      }\n    });\n  }\n\n  if (disableBtn) {\n    disableBtn.addEventListener('click', async function() {\n      setButtonsEnabled(false, false);\n      try {\n        var subscription = await getCurrentSubscription();\n        if (subscription) {\n          await pushUnsubscribe(subscription.endpoint);\n          await subscription.unsubscribe();\n        }\n\n        setStatus('Push disabled on this device.', 'warn');\n        setButtonsEnabled(true, false);\n      } catch (error) {\n        setStatus('Unable to disable push: ' + (error && error.message ? error.message : 'unknown error'), 'error');\n        await refreshState();\n      }\n    });\n  }\n\n  if (jobsCheckbox) jobsCheckbox.addEventListener('change', syncPreferencesIfSubscribed);\n  if (messagesCheckbox) messagesCheckbox.addEventListener('change', syncPreferencesIfSubscribed);\n\n  refreshState();\n})();\n    <\/script>"], ["<script>\n(function() {\n  var statusEl = document.getElementById('push-status');\n  var enableBtn = document.getElementById('push-enable-btn');\n  var disableBtn = document.getElementById('push-disable-btn');\n  var testBtn = document.getElementById('push-test-btn');\n  var jobsCheckbox = document.getElementById('push-notify-jobs');\n  var messagesCheckbox = document.getElementById('push-notify-messages');\n\n  var vapidPublicKey = '';\n\n  function setStatus(message, tone) {\n    if (!statusEl) return;\n    statusEl.textContent = message;\n\n    if (tone === 'ok') {\n      statusEl.style.background = 'rgba(34,197,94,0.1)';\n      statusEl.style.color = '#15803d';\n      statusEl.style.borderColor = 'rgba(21,128,61,0.35)';\n      return;\n    }\n\n    if (tone === 'error') {\n      statusEl.style.background = 'rgba(239,68,68,0.1)';\n      statusEl.style.color = '#dc2626';\n      statusEl.style.borderColor = 'rgba(220,38,38,0.35)';\n      return;\n    }\n\n    if (tone === 'warn') {\n      statusEl.style.background = 'rgba(245,158,11,0.12)';\n      statusEl.style.color = '#b45309';\n      statusEl.style.borderColor = 'rgba(180,83,9,0.35)';\n      return;\n    }\n\n    statusEl.style.background = 'var(--surface-elevated,#eff1f5)';\n    statusEl.style.color = 'var(--text-primary,#333)';\n    statusEl.style.borderColor = 'var(--border,#ccd0da)';\n  }\n\n  function setButtonsEnabled(enabled, isSubscribed) {\n    if (enableBtn) enableBtn.disabled = !enabled;\n    if (disableBtn) disableBtn.disabled = !enabled || !isSubscribed;\n    if (testBtn) testBtn.disabled = !enabled || !isSubscribed;\n  }\n\n  function normalizeErrorMessage(prefix, err) {\n    var message = '';\n    if (err && typeof err.message === 'string') message = err.message;\n    else message = String(err || 'unknown error');\n    message = message.replace(/\\s+/g, ' ').trim();\n    if (prefix) return prefix + ': ' + message;\n    return message;\n  }\n\n  async function safeFetchJson(url, options) {\n    var response = await fetch(url, options || {});\n    var text = '';\n    try {\n      text = await response.clone().text();\n    } catch (_error) {\n      text = '';\n    }\n\n    var json = null;\n    try {\n      json = text ? JSON.parse(text) : null;\n    } catch (_error) {\n      json = null;\n    }\n\n    return {\n      ok: response.ok,\n      status: response.status,\n      text: text,\n      json: json,\n    };\n  }\n\n  function selectedPreferences() {\n    return {\n      notifyNewJobs: jobsCheckbox ? !!jobsCheckbox.checked : true,\n      notifyNewMessages: messagesCheckbox ? !!messagesCheckbox.checked : true,\n    };\n  }\n\n  function base64UrlToUint8Array(base64Url) {\n    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');\n    var padding = '='.repeat((4 - (base64.length % 4)) % 4);\n    var binary = atob(base64 + padding);\n    var bytes = new Uint8Array(binary.length);\n    for (var i = 0; i < binary.length; i++) {\n      bytes[i] = binary.charCodeAt(i);\n    }\n    return bytes;\n  }\n\n  async function ensureRegistration() {\n    var reg = await navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' });\n    try {\n      await navigator.serviceWorker.ready;\n    } catch (_error) {\n    }\n    return reg;\n  }\n\n  async function getCurrentSubscription() {\n    var registration = await ensureRegistration();\n    return registration.pushManager.getSubscription();\n  }\n\n  async function loadServerStatus(endpoint) {\n    var query = endpoint ? ('?endpoint=' + encodeURIComponent(endpoint)) : '';\n    var result = await safeFetchJson('/admin/push/status' + query, {\n      method: 'GET',\n      headers: { Accept: 'application/json' },\n    });\n\n    if (!result.ok) return null;\n    return result.json;\n  }\n\n  async function pushSubscribe(subscription) {\n    var result = await safeFetchJson('/admin/push/subscribe', {\n      method: 'POST',\n      headers: {\n        'Content-Type': 'application/json',\n        Accept: 'application/json',\n      },\n      body: JSON.stringify({\n        subscription: subscription.toJSON(),\n        preferences: selectedPreferences(),\n      }),\n    });\n\n    if (!result.ok) {\n      var msg = (result.json && result.json.error) ? result.json.error : (result.text || 'Failed to save subscription');\n      throw new Error('Subscribe failed (' + String(result.status) + '): ' + String(msg));\n    }\n  }\n\n  async function pushUnsubscribe(endpoint) {\n    await safeFetchJson('/admin/push/unsubscribe', {\n      method: 'POST',\n      headers: {\n        'Content-Type': 'application/json',\n        Accept: 'application/json',\n      },\n      body: JSON.stringify({ endpoint: endpoint || '' }),\n    });\n  }\n\n  async function sendTestNotification(endpoint) {\n    var result = await safeFetchJson('/admin/push/test', {\n      method: 'POST',\n      headers: {\n        'Content-Type': 'application/json',\n        Accept: 'application/json',\n      },\n      body: JSON.stringify({ endpoint: endpoint || '' }),\n    });\n\n    if (!result.ok) {\n      var message = (result.json && result.json.error) ? result.json.error : (result.text || 'Test push failed');\n      throw new Error('Test failed (' + String(result.status) + '): ' + String(message));\n    }\n\n    return result.json;\n  }\n\n  async function syncPreferencesIfSubscribed() {\n    try {\n      var subscription = await getCurrentSubscription();\n      if (!subscription) return;\n      await pushSubscribe(subscription);\n    } catch (_error) {\n    }\n  }\n\n  async function refreshState() {\n    try {\n      setStatus('Checking push support...', '');\n\n      var response = await safeFetchJson('/admin/push/vapid-public-key', {\n        method: 'GET',\n        headers: { Accept: 'application/json' },\n      });\n\n      if (!response.ok) {\n        var msg = (response.json && response.json.error) ? response.json.error : (response.text || 'Could not load VAPID key');\n        throw new Error('VAPID key (' + String(response.status) + '): ' + String(msg));\n      }\n\n      var keyPayload = response.json;\n      vapidPublicKey = keyPayload && typeof keyPayload.publicKey === 'string' ? keyPayload.publicKey : '';\n      if (!vapidPublicKey) throw new Error('VAPID key missing');\n\n      var subscription = await getCurrentSubscription();\n      if (!subscription) {\n        setStatus('Push is disabled on this device.', 'warn');\n        setButtonsEnabled(true, false);\n        return;\n      }\n\n      var serverStatus = await loadServerStatus(subscription.endpoint);\n      if (serverStatus && typeof serverStatus.notifyNewJobs === 'boolean' && jobsCheckbox) {\n        jobsCheckbox.checked = serverStatus.notifyNewJobs;\n      }\n      if (serverStatus && typeof serverStatus.notifyNewMessages === 'boolean' && messagesCheckbox) {\n        messagesCheckbox.checked = serverStatus.notifyNewMessages;\n      }\n\n      setStatus('Push is enabled on this device.', 'ok');\n      setButtonsEnabled(true, true);\n    } catch (error) {\n      setStatus(normalizeErrorMessage('Push setup failed', error), 'error');\n      setButtonsEnabled(false, false);\n    }\n  }\n\n  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {\n    setStatus('This browser does not support web push notifications.', 'error');\n    setButtonsEnabled(false, false);\n    return;\n  }\n\n  if (enableBtn) {\n    enableBtn.addEventListener('click', async function() {\n      setButtonsEnabled(false, false);\n      try {\n        var permission = await Notification.requestPermission();\n        if (permission !== 'granted') {\n          setStatus('Notification permission was not granted.', 'error');\n          await refreshState();\n          return;\n        }\n\n        var registration = await ensureRegistration();\n        var subscription = await registration.pushManager.getSubscription();\n\n        if (!subscription) {\n          subscription = await registration.pushManager.subscribe({\n            userVisibleOnly: true,\n            applicationServerKey: base64UrlToUint8Array(vapidPublicKey),\n          });\n        }\n\n        await pushSubscribe(subscription);\n\n        try {\n          setStatus('Sending test notification...', 'warn');\n          await sendTestNotification(subscription.endpoint);\n        } catch (_error) {\n        }\n\n        setStatus('Push enabled on this device.', 'ok');\n        setButtonsEnabled(true, true);\n      } catch (error) {\n        setStatus(normalizeErrorMessage('Unable to enable push', error), 'error');\n        setButtonsEnabled(true, false);\n      }\n    });\n  }\n\n  if (testBtn) {\n    testBtn.addEventListener('click', async function() {\n      setButtonsEnabled(false, true);\n      try {\n        var subscription = await getCurrentSubscription();\n        if (!subscription) {\n          setStatus('Push is disabled on this device.', 'warn');\n          setButtonsEnabled(true, false);\n          return;\n        }\n\n        setStatus('Sending test notification...', 'warn');\n        var result = await sendTestNotification(subscription.endpoint);\n        if (result && typeof result.status === 'number') {\n          setStatus('Test sent (push service status ' + String(result.status) + ').', 'ok');\n        } else {\n          setStatus('Test sent.', 'ok');\n        }\n        setButtonsEnabled(true, true);\n      } catch (error) {\n        setStatus(normalizeErrorMessage('Unable to send test', error), 'error');\n        setButtonsEnabled(true, true);\n      }\n    });\n  }\n\n  if (disableBtn) {\n    disableBtn.addEventListener('click', async function() {\n      setButtonsEnabled(false, false);\n      try {\n        var subscription = await getCurrentSubscription();\n        if (subscription) {\n          await pushUnsubscribe(subscription.endpoint);\n          await subscription.unsubscribe();\n        }\n\n        setStatus('Push disabled on this device.', 'warn');\n        setButtonsEnabled(true, false);\n      } catch (error) {\n        setStatus('Unable to disable push: ' + (error && error.message ? error.message : 'unknown error'), 'error');\n        await refreshState();\n      }\n    });\n  }\n\n  if (jobsCheckbox) jobsCheckbox.addEventListener('change', syncPreferencesIfSubscribed);\n  if (messagesCheckbox) messagesCheckbox.addEventListener('change', syncPreferencesIfSubscribed);\n\n  refreshState();\n})();\n    <\/script>"])))
] }), "PushSettingsPage");

// src/views/invoice-detail.tsx
var money3 = /* @__PURE__ */ __name((cents) => `$${(cents / 100).toFixed(2)}`, "money");
var InvoiceDetailPage = /* @__PURE__ */ __name(({
  invoice,
  customers,
  jobs,
  lineItems
}) => {
  const subtotal = lineItems.reduce((sum, line) => sum + line.total_cents, 0);
  const total = Math.max(0, subtotal + Number(invoice.tax_cents || 0) - Number(invoice.discount_cents || 0));
  const customerName = (() => {
    const c = customers.find((cu) => cu.id === invoice.customer_id);
    return c ? `${c.first_name} ${c.last_name}`.trim() : "Customer";
  })();
  const jobLabel = (() => {
    if (!invoice.job_id) return null;
    const j = jobs.find((jb) => jb.id === invoice.job_id);
    return j ? `${j.customer_name} - ${j.scheduled_date}` : "Linked job";
  })();
  return /* @__PURE__ */ jsxDEV(Layout, { title: `Invoice ${invoice.invoice_number}`, children: [
    /* @__PURE__ */ jsxDEV("div", { class: "page-header page-header--rich", children: [
      /* @__PURE__ */ jsxDEV("div", { class: "page-header-info", children: [
        /* @__PURE__ */ jsxDEV("div", { class: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxDEV("h2", { children: [
            "Invoice ",
            invoice.invoice_number
          ] }),
          /* @__PURE__ */ jsxDEV(StatusIcon, { status: invoice.status })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { class: "page-header-meta", children: [
          /* @__PURE__ */ jsxDEV("span", { children: customerName }),
          jobLabel && /* @__PURE__ */ jsxDEV("span", { children: jobLabel }),
          invoice.due_date && /* @__PURE__ */ jsxDEV("span", { children: [
            "Due ",
            invoice.due_date
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxDEV("div", { class: "page-header-actions", children: [
        /* @__PURE__ */ jsxDEV("button", { type: "submit", form: "invoice-form", class: "uk-btn uk-btn-primary uk-btn-sm", children: "Save" }),
        /* @__PURE__ */ jsxDEV("a", { href: "/admin/invoices", class: "uk-btn uk-btn-default uk-btn-sm", "hx-get": "/admin/invoices", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: "Back" })
      ] })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { class: "p-4 sm:p-8", style: "padding-bottom: calc(40px + var(--safe-bottom));", children: /* @__PURE__ */ jsxDEV("div", { children: /* @__PURE__ */ jsxDEV("div", { class: "mx-auto", style: "max-width: 1120px;", children: /* @__PURE__ */ jsxDEV("div", { class: "grid gap-4 lg:grid-cols-[1fr,360px] lg:gap-6", children: [
      /* @__PURE__ */ jsxDEV("div", { class: "grid gap-4", children: [
        /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", style: "background:var(--surface-0);", children: [
          /* @__PURE__ */ jsxDEV("div", { class: "flex items-start justify-between gap-3", children: [
            /* @__PURE__ */ jsxDEV("div", { class: "min-w-0", children: [
              /* @__PURE__ */ jsxDEV("p", { class: "text-[10px] uppercase tracking-wide text-muted-foreground", children: "Amount due" }),
              /* @__PURE__ */ jsxDEV("p", { class: "text-3xl font-extrabold", style: "margin:0;", children: money3(total) }),
              /* @__PURE__ */ jsxDEV("p", { class: "text-xs text-muted-foreground", style: "margin:6px 0 0;", children: [
                "Subtotal ",
                money3(subtotal),
                " \u2022 Tax ",
                money3(Number(invoice.tax_cents || 0)),
                " \u2022 Discount ",
                money3(Number(invoice.discount_cents || 0))
              ] })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "text-right", children: [
              /* @__PURE__ */ jsxDEV("p", { class: "text-[10px] uppercase tracking-wide text-muted-foreground", children: "Status" }),
              /* @__PURE__ */ jsxDEV(StatusIcon, { status: invoice.status }),
              invoice.due_date ? /* @__PURE__ */ jsxDEV("p", { class: "text-xs text-muted-foreground", style: "margin:8px 0 0;", children: [
                "Due ",
                invoice.due_date
              ] }) : null
            ] })
          ] }),
          /* @__PURE__ */ jsxDEV("input", { type: "hidden", id: "total_amount", name: "total_amount", form: "invoice-form", value: (total / 100).toFixed(2) })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { class: "uk-card uk-card-body", children: [
          /* @__PURE__ */ jsxDEV("div", { class: "flex items-center justify-between mb-4", children: [
            /* @__PURE__ */ jsxDEV("h3", { class: "text-base font-semibold", style: "margin:0;", children: "Line items" }),
            /* @__PURE__ */ jsxDEV("span", { class: "text-sm font-semibold", children: money3(subtotal) })
          ] }),
          /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2 mb-4", children: lineItems.length === 0 ? /* @__PURE__ */ jsxDEV("p", { class: "text-sm text-muted-foreground", children: "No line items." }) : lineItems.map((line) => /* @__PURE__ */ jsxDEV("div", { class: "flex items-start gap-3 p-3 border border-border rounded-md", children: [
            /* @__PURE__ */ jsxDEV("div", { class: "flex-1 min-w-0", style: line.parent_id ? "padding-left:16px;" : "", children: [
              /* @__PURE__ */ jsxDEV("p", { class: "text-sm font-medium", style: "margin:0;", children: line.description }),
              /* @__PURE__ */ jsxDEV("p", { class: "text-xs text-muted-foreground", style: "margin:4px 0 0;", children: [
                line.kind,
                " \u2022 ",
                line.quantity,
                " x ",
                money3(line.unit_price_cents)
              ] })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "text-right", children: [
              /* @__PURE__ */ jsxDEV("p", { class: "text-sm font-semibold", style: "margin:0;", children: money3(line.total_cents) }),
              line.is_custom ? /* @__PURE__ */ jsxDEV("button", { type: "button", class: "delete-btn uk-btn uk-btn-small", "hx-post": `/admin/invoices/${invoice.id}/line-items/delete`, "hx-vals": JSON.stringify({ lineId: line.id }), "hx-target": "#page-content", "hx-select": "#page-content", "data-confirm": "arm", children: "Remove" }) : null
            ] })
          ] }, line.id)) }),
          /* @__PURE__ */ jsxDEV("form", { "hx-post": `/admin/invoices/${invoice.id}/line-items/add`, "hx-target": "#page-content", "hx-select": "#page-content", class: "grid gap-2 sm:grid-cols-4", children: [
            /* @__PURE__ */ jsxDEV("input", { type: "text", name: "description", class: "uk-input sm:col-span-2", placeholder: "Custom line description", required: true }),
            /* @__PURE__ */ jsxDEV("input", { type: "number", name: "quantity", class: "uk-input", min: 1, step: 1, value: "1", required: true }),
            /* @__PURE__ */ jsxDEV("input", { type: "number", name: "unit_price", class: "uk-input", min: 0, step: 0.01, placeholder: "Unit price", required: true }),
            /* @__PURE__ */ jsxDEV("div", { class: "sm:col-span-4 flex justify-end", children: /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "uk-btn uk-btn-default", children: "Add Custom Line" }) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxDEV("aside", { class: "grid gap-4 lg:sticky", style: "top: 92px;", children: [
        /* @__PURE__ */ jsxDEV("details", { class: "uk-card uk-card-body", open: true, children: [
          /* @__PURE__ */ jsxDEV("summary", { class: "text-base font-semibold cursor-pointer", children: "Invoice details" }),
          /* @__PURE__ */ jsxDEV(
            "form",
            {
              id: "invoice-form",
              "hx-post": `/admin/invoices/${invoice.id}`,
              "hx-target": "#page-content",
              "hx-select": "#page-content",
              "hx-push-url": "/admin/invoices",
              class: "pt-4 grid gap-4",
              children: [
                /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
                  /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "invoice_number", children: "Invoice Number" }),
                  /* @__PURE__ */ jsxDEV("input", { id: "invoice_number", name: "invoice_number", class: "uk-input", value: invoice.invoice_number, required: true })
                ] }),
                /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
                  /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "currency", children: "Currency" }),
                  /* @__PURE__ */ jsxDEV("select", { id: "currency", name: "currency", class: "uk-select", required: true, children: [
                    /* @__PURE__ */ jsxDEV("option", { value: "CAD", selected: invoice.currency === "CAD", children: "CAD" }),
                    /* @__PURE__ */ jsxDEV("option", { value: "USD", selected: invoice.currency === "USD", children: "USD" })
                  ] })
                ] }),
                /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
                  /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "customer_id", children: "Customer" }),
                  /* @__PURE__ */ jsxDEV("select", { id: "customer_id", name: "customer_id", class: "uk-select", required: true, children: customers.map((customer) => /* @__PURE__ */ jsxDEV("option", { value: customer.id, selected: customer.id === invoice.customer_id, children: [
                    customer.first_name,
                    " ",
                    customer.last_name
                  ] }, customer.id)) })
                ] }),
                /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
                  /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "job_id", children: "Job" }),
                  /* @__PURE__ */ jsxDEV("select", { id: "job_id", name: "job_id", class: "uk-select", children: [
                    /* @__PURE__ */ jsxDEV("option", { value: "", children: "None" }),
                    jobs.map((job) => /* @__PURE__ */ jsxDEV("option", { value: job.id, selected: invoice.job_id === job.id, children: [
                      job.customer_name,
                      " - ",
                      job.scheduled_date
                    ] }, job.id))
                  ] })
                ] }),
                /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
                  /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "due_date", children: "Due Date" }),
                  /* @__PURE__ */ jsxDEV("input", { id: "due_date", name: "due_date", type: "date", class: "uk-input", value: invoice.due_date || "" })
                ] }),
                /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
                  /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "status", children: "Status" }),
                  /* @__PURE__ */ jsxDEV("select", { id: "status", name: "status", class: "uk-select", required: true, children: [
                    /* @__PURE__ */ jsxDEV("option", { value: "pending", selected: invoice.status === "pending", children: "Pending" }),
                    /* @__PURE__ */ jsxDEV("option", { value: "sent", selected: invoice.status === "sent", children: "Sent" }),
                    /* @__PURE__ */ jsxDEV("option", { value: "paid", selected: invoice.status === "paid", children: "Paid" }),
                    /* @__PURE__ */ jsxDEV("option", { value: "void", selected: invoice.status === "void", children: "Void" })
                  ] })
                ] }),
                /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
                  /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "tax_amount", children: "Tax ($)" }),
                  /* @__PURE__ */ jsxDEV("input", { id: "tax_amount", name: "tax_amount", type: "number", class: "uk-input", step: 0.01, min: 0, value: (invoice.tax_cents / 100).toFixed(2) })
                ] }),
                /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
                  /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "discount_amount", children: "Discount ($)" }),
                  /* @__PURE__ */ jsxDEV("input", { id: "discount_amount", name: "discount_amount", type: "number", class: "uk-input", step: 0.01, min: 0, value: (invoice.discount_cents / 100).toFixed(2) })
                ] }),
                /* @__PURE__ */ jsxDEV("div", { class: "grid gap-2", children: [
                  /* @__PURE__ */ jsxDEV("label", { class: "uk-form-label", for: "notes", children: "Notes" }),
                  /* @__PURE__ */ jsxDEV("textarea", { id: "notes", name: "notes", rows: 4, class: "uk-textarea", children: invoice.notes || "" })
                ] })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxDEV("details", { class: "uk-card uk-card-body danger-card", children: [
          /* @__PURE__ */ jsxDEV("summary", { class: "text-base font-semibold cursor-pointer", children: "Danger zone" }),
          /* @__PURE__ */ jsxDEV("div", { class: "pt-4", children: /* @__PURE__ */ jsxDEV("button", { type: "button", class: "delete-btn", "hx-post": `/admin/invoices/${invoice.id}/delete`, "hx-target": "#page-content", "data-confirm": "arm", children: "Delete invoice" }) })
        ] })
      ] })
    ] }) }) }) })
  ] });
}, "InvoiceDetailPage");

// src/services/notifications.ts
function base64UrlEncode(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(base64UrlEncode, "base64UrlEncode");
function base64UrlDecode2(input3) {
  const base64 = input3.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
__name(base64UrlDecode2, "base64UrlDecode");
function concatBytes(...chunks) {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
__name(concatBytes, "concatBytes");
function derToJose(signatureDer, size = 32) {
  if (signatureDer.length < 8 || signatureDer[0] !== 48) {
    throw new Error("Invalid DER signature");
  }
  let offset = 2;
  if (signatureDer[1] & 128) {
    const lenBytes = signatureDer[1] & 127;
    offset = 2 + lenBytes;
  }
  if (signatureDer[offset] !== 2) throw new Error("Invalid DER signature");
  const rLen = signatureDer[offset + 1];
  const r = signatureDer.slice(offset + 2, offset + 2 + rLen);
  offset = offset + 2 + rLen;
  if (signatureDer[offset] !== 2) throw new Error("Invalid DER signature");
  const sLen = signatureDer[offset + 1];
  const s = signatureDer.slice(offset + 2, offset + 2 + sLen);
  const rOut = new Uint8Array(size);
  const sOut = new Uint8Array(size);
  const rTrim = r.length > size ? r.slice(r.length - size) : r;
  const sTrim = s.length > size ? s.slice(s.length - size) : s;
  rOut.set(rTrim, size - rTrim.length);
  sOut.set(sTrim, size - sTrim.length);
  return concatBytes(rOut, sOut);
}
__name(derToJose, "derToJose");
async function getSetting(db, key) {
  const row = await db.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first();
  return row?.value ?? null;
}
__name(getSetting, "getSetting");
async function setSetting(db, key, value) {
  await db.prepare(
    `INSERT INTO settings (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  ).bind(key, value).run();
}
__name(setSetting, "setSetting");
async function ensureVapidConfig(db) {
  const existing = await getSetting(db, "web_push_vapid");
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const rec = parsed;
        if (typeof rec.publicKey === "string" && rec.privateKeyJwk && typeof rec.subject === "string") {
          return {
            publicKey: rec.publicKey,
            privateKeyJwk: rec.privateKeyJwk,
            subject: rec.subject
          };
        }
      }
    } catch {
    }
  }
  const subject = "mailto:ops@unclebike.xyz";
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  if (!publicJwk.x || !publicJwk.y) throw new Error("Failed to export VAPID public key");
  const publicBytes = concatBytes(
    new Uint8Array([4]),
    base64UrlDecode2(publicJwk.x),
    base64UrlDecode2(publicJwk.y)
  );
  const publicKey = base64UrlEncode(publicBytes);
  const config = {
    publicKey,
    privateKeyJwk: privateJwk,
    subject
  };
  await setSetting(db, "web_push_vapid", JSON.stringify(config));
  return config;
}
__name(ensureVapidConfig, "ensureVapidConfig");
async function createVapidJwt(audOrigin, subject, privateKeyJwk) {
  const header = { alg: "ES256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1e3) + 12 * 60 * 60;
  const payload = { aud: audOrigin, exp, sub: subject };
  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const sigDer = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput)
  ));
  let sigJose;
  if (sigDer.length === 64) {
    sigJose = sigDer;
  } else if (sigDer.length > 0 && sigDer[0] === 48) {
    sigJose = derToJose(sigDer);
  } else {
    throw new Error("Unsupported ECDSA signature format");
  }
  const sigB64 = base64UrlEncode(sigJose);
  return `${signingInput}.${sigB64}`;
}
__name(createVapidJwt, "createVapidJwt");
async function ensurePushTables(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_email TEXT NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      notify_new_jobs INTEGER NOT NULL DEFAULT 1,
      notify_new_messages INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ).run();
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS push_notification_queue (
      id TEXT PRIMARY KEY,
      subscription_id TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK (event_type IN ('new_job', 'new_message')),
      title TEXT NOT NULL,
      body TEXT,
      target_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      delivered_at TEXT,
      FOREIGN KEY (subscription_id) REFERENCES push_subscriptions(id) ON DELETE CASCADE
    )`
  ).run();
  await db.prepare(
    "CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_email ON push_subscriptions(user_email)"
  ).run();
  await db.prepare(
    "CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint)"
  ).run();
  await db.prepare(
    "CREATE INDEX IF NOT EXISTS idx_push_queue_subscription_id ON push_notification_queue(subscription_id)"
  ).run();
}
__name(ensurePushTables, "ensurePushTables");
async function pingPushEndpoint(db, endpoint) {
  const cfg = await ensureVapidConfig(db);
  const origin = new URL(endpoint).origin;
  const jwt = await createVapidJwt(origin, cfg.subject, cfg.privateKeyJwk);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      TTL: "60",
      Authorization: `vapid t=${jwt}, k=${cfg.publicKey}`,
      "Crypto-Key": `p256ecdsa=${cfg.publicKey}`,
      "Content-Length": "0"
    }
  });
  return { ok: response.ok, status: response.status };
}
__name(pingPushEndpoint, "pingPushEndpoint");
async function getPushVapidPublicKey(db) {
  const cfg = await ensureVapidConfig(db);
  return cfg.publicKey;
}
__name(getPushVapidPublicKey, "getPushVapidPublicKey");
async function upsertPushSubscription(db, staffEmail, subscription, _preferences) {
  const endpoint = subscription.endpoint.trim();
  const auth = subscription.keys.auth.trim();
  const p256dh = subscription.keys.p256dh.trim();
  if (!endpoint || !auth || !p256dh) throw new Error("endpoint and keys are required");
  await ensurePushTables(db);
  const userEmail = staffEmail.trim().toLowerCase();
  const notifyNewJobs = _preferences.notifyNewJobs ? 1 : 0;
  const notifyNewMessages = _preferences.notifyNewMessages ? 1 : 0;
  await db.prepare(
    `INSERT INTO push_subscriptions (
       id, user_email, endpoint, p256dh, auth,
       notify_new_jobs, notify_new_messages,
       is_active, last_seen_at, created_at, updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'), datetime('now'))
     ON CONFLICT(endpoint) DO UPDATE SET
       user_email = excluded.user_email,
       p256dh = excluded.p256dh,
       auth = excluded.auth,
       notify_new_jobs = excluded.notify_new_jobs,
       notify_new_messages = excluded.notify_new_messages,
       is_active = 1,
       last_seen_at = datetime('now'),
       updated_at = datetime('now')`
  ).bind(
    crypto.randomUUID(),
    userEmail,
    endpoint,
    p256dh,
    auth,
    notifyNewJobs,
    notifyNewMessages
  ).run();
}
__name(upsertPushSubscription, "upsertPushSubscription");
async function deactivatePushSubscription(db, staffEmail, endpoint) {
  const trimmed = endpoint.trim();
  if (!trimmed) return;
  await ensurePushTables(db);
  const userEmail = staffEmail.trim().toLowerCase();
  await db.prepare(
    `UPDATE push_subscriptions
     SET is_active = 0, updated_at = datetime('now')
     WHERE user_email = ? AND endpoint = ?`
  ).bind(userEmail, trimmed).run();
}
__name(deactivatePushSubscription, "deactivatePushSubscription");
async function getPushSubscriptionStatus(db, staffEmail, endpoint) {
  await ensurePushTables(db);
  const userEmail = staffEmail.trim().toLowerCase();
  const endpointTrimmed = (endpoint || "").trim();
  const row = endpointTrimmed ? await db.prepare(
    `SELECT notify_new_jobs, notify_new_messages
         FROM push_subscriptions
         WHERE user_email = ? AND endpoint = ? AND is_active = 1`
  ).bind(userEmail, endpointTrimmed).first() : await db.prepare(
    `SELECT notify_new_jobs, notify_new_messages
         FROM push_subscriptions
         WHERE user_email = ? AND is_active = 1
         ORDER BY datetime(updated_at) DESC
         LIMIT 1`
  ).bind(userEmail).first();
  if (!row) {
    return { subscribed: false, notifyNewJobs: true, notifyNewMessages: true };
  }
  return {
    subscribed: true,
    notifyNewJobs: row.notify_new_jobs === 1,
    notifyNewMessages: row.notify_new_messages === 1
  };
}
__name(getPushSubscriptionStatus, "getPushSubscriptionStatus");
async function pullPendingPushNotifications(db, staffEmail, endpoint, limit = 6) {
  const trimmed = endpoint.trim();
  if (!trimmed) return [];
  await ensurePushTables(db);
  const userEmail = staffEmail.trim().toLowerCase();
  const limitClamped = Math.max(1, Math.min(20, limit));
  const sub = await db.prepare(
    `SELECT id
     FROM push_subscriptions
     WHERE user_email = ? AND endpoint = ? AND is_active = 1`
  ).bind(userEmail, trimmed).first();
  if (!sub?.id) return [];
  const pending = await db.prepare(
    `SELECT id, title, body, target_url, created_at
     FROM push_notification_queue
     WHERE subscription_id = ?
       AND delivered_at IS NULL
     ORDER BY datetime(created_at) ASC
     LIMIT ?`
  ).bind(sub.id, limitClamped).all();
  const rows = pending.results || [];
  if (rows.length) {
    const ids = rows.map((r) => r.id);
    await db.prepare(
      `UPDATE push_notification_queue
       SET delivered_at = datetime('now')
       WHERE id IN (${ids.map(() => "?").join(",")})`
    ).bind(...ids).run();
  }
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body || "",
    url: row.target_url,
    createdAt: row.created_at
  }));
}
__name(pullPendingPushNotifications, "pullPendingPushNotifications");
async function enqueueTestPushNotificationAndPing(db, staffEmail, endpoint) {
  const trimmed = endpoint.trim();
  if (!trimmed) throw new Error("endpoint is required");
  await ensurePushTables(db);
  const userEmail = staffEmail.trim().toLowerCase();
  const sub = await db.prepare(
    `SELECT id
     FROM push_subscriptions
     WHERE user_email = ? AND endpoint = ? AND is_active = 1`
  ).bind(userEmail, trimmed).first();
  if (!sub?.id) {
    return { ok: false, status: 404, queued: false };
  }
  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO push_notification_queue (id, subscription_id, event_type, title, body, target_url)
     VALUES (?, ?, 'new_message', ?, ?, ?)`
  ).bind(
    id,
    sub.id,
    "GOATkit test notification",
    "If you can see this, push delivery is working.",
    "/admin"
  ).run();
  const delivered = await pingPushEndpoint(db, trimmed);
  return { ...delivered, queued: true };
}
__name(enqueueTestPushNotificationAndPing, "enqueueTestPushNotificationAndPing");
async function enqueueAndDispatchPushEvent(db, event) {
  await ensurePushTables(db);
  const type = event.type === "test" ? "new_message" : event.type;
  const title3 = event.title.trim() || "GOATkit update";
  const body = (event.body || "").trim() || "Open the app for details.";
  const targetUrl = event.targetUrl.trim() || "/admin";
  const subs = await db.prepare(
    `SELECT id, endpoint
     FROM push_subscriptions
     WHERE is_active = 1
       AND (
         (? = 'new_job' AND notify_new_jobs = 1)
         OR (? = 'new_message' AND notify_new_messages = 1)
       )
     ORDER BY datetime(updated_at) DESC
     LIMIT 200`
  ).bind(type, type).all();
  const rows = (subs.results || []).map((r) => ({ id: (r.id || "").trim(), endpoint: (r.endpoint || "").trim() })).filter((r) => r.id && r.endpoint);
  if (!rows.length) return;
  const inserts = [];
  for (const row of rows) {
    inserts.push(db.prepare(
      `INSERT INTO push_notification_queue (id, subscription_id, event_type, title, body, target_url)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      row.id,
      type,
      title3,
      body,
      targetUrl
    ));
  }
  await db.batch(inserts);
  await Promise.all(rows.map((row) => pingPushEndpoint(db, row.endpoint).catch(() => null)));
}
__name(enqueueAndDispatchPushEvent, "enqueueAndDispatchPushEvent");

// src/routes/admin.ts
var parseJsonObject = /* @__PURE__ */ __name((raw2) => {
  if (!raw2) return null;
  try {
    const parsed = JSON.parse(raw2);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}, "parseJsonObject");
var toTaskTitle = /* @__PURE__ */ __name((text) => {
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  if (compact.length <= 72) return compact;
  return `${compact.slice(0, 69).trimEnd()}...`;
}, "toTaskTitle");
var getCompletedSmsTaskIds = /* @__PURE__ */ __name(async (db, jobId) => {
  if (!jobId) return [];
  const job = await db.prepare("SELECT notes_json FROM jobs WHERE id = ?").bind(jobId).first();
  if (!job?.notes_json) return [];
  const completed = /* @__PURE__ */ new Set();
  try {
    const notes = JSON.parse(job.notes_json);
    if (!Array.isArray(notes)) return [];
    for (const note of notes) {
      if (!note || typeof note !== "object" || Array.isArray(note)) continue;
      const noteRecord = note;
      if (!noteRecord.completed) continue;
      const source = noteRecord.source;
      if (!source || typeof source !== "object" || Array.isArray(source)) continue;
      const sourceRecord = source;
      if (sourceRecord.type !== "sms") continue;
      if (typeof sourceRecord.sms_log_id === "string" && sourceRecord.sms_log_id.trim()) {
        completed.add(sourceRecord.sms_log_id);
      }
    }
  } catch {
    return [];
  }
  return Array.from(completed);
}, "getCompletedSmsTaskIds");
var app = new Hono2();
var generateId = /* @__PURE__ */ __name(() => crypto.randomUUID(), "generateId");
var getAuthenticatedStaffEmail = /* @__PURE__ */ __name((c) => {
  const auth = c.get("auth");
  if (!auth || auth.type !== "cf_access" || !auth.email) return null;
  return auth.email;
}, "getAuthenticatedStaffEmail");
var normalizeEmail = /* @__PURE__ */ __name((value) => {
  const trimmed = (value || "").trim();
  return trimmed ? trimmed.toLowerCase() : null;
}, "normalizeEmail");
var parseMoneyToCents = /* @__PURE__ */ __name((value) => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value !== "string") return 0;
  const cleaned = value.trim().replace(/[$,]/g, "");
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed * 100));
}, "parseMoneyToCents");
var formatCents = /* @__PURE__ */ __name((value) => `$${(value / 100).toFixed(2)}`, "formatCents");
var nextInvoiceNumber = /* @__PURE__ */ __name(async (db) => {
  const row = await db.prepare("SELECT invoice_number FROM invoices WHERE invoice_number LIKE 'INV-%' ORDER BY invoice_number DESC LIMIT 1").first();
  const suffix = row?.invoice_number ? Number.parseInt(row.invoice_number.replace("INV-", ""), 10) : 0;
  const next = Number.isFinite(suffix) ? suffix + 1 : 1;
  return `INV-${String(next).padStart(6, "0")}`;
}, "nextInvoiceNumber");
var parseInvoiceLineItems = parseEditableText;
var recomputeJobTotals = /* @__PURE__ */ __name(async (db, jobId) => {
  const job = await db.prepare("SELECT line_items_json FROM jobs WHERE id = ?").bind(jobId).first();
  if (!job) return;
  const lines = parsePriceLines(job.line_items_json);
  const total = subtotalFromLines(lines);
  const base = lines.find((line) => line.kind === "service")?.total_cents || total;
  await db.prepare("UPDATE jobs SET base_price_cents = ?, total_price_cents = ?, updated_at = datetime('now') WHERE id = ?").bind(base, total, jobId).run();
}, "recomputeJobTotals");
var syncInvoiceFromJob = /* @__PURE__ */ __name(async (db, jobId) => {
  const [job, invoice] = await Promise.all([
    db.prepare("SELECT line_items_json FROM jobs WHERE id = ?").bind(jobId).first(),
    db.prepare("SELECT id, tax_cents, discount_cents FROM invoices WHERE job_id = ? AND status IN ('pending', 'sent') ORDER BY created_at DESC LIMIT 1").bind(jobId).first()
  ]);
  if (!job || !invoice) return;
  const lines = parsePriceLines(job.line_items_json);
  const subtotal = subtotalFromLines(lines);
  const total = Math.max(0, subtotal + Number(invoice.tax_cents || 0) - Number(invoice.discount_cents || 0));
  await db.prepare(
    `UPDATE invoices
     SET line_items_json = ?, subtotal_cents = ?, amount_cents = ?, total_cents = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(JSON.stringify(lines), subtotal, total, total, invoice.id).run();
}, "syncInvoiceFromJob");
var writeInvoiceLines = /* @__PURE__ */ __name(async (db, invoiceId, lines) => {
  const invoice = await db.prepare("SELECT tax_cents, discount_cents FROM invoices WHERE id = ?").bind(invoiceId).first();
  if (!invoice) return;
  const subtotal = subtotalFromLines(lines);
  const total = Math.max(0, subtotal + Number(invoice.tax_cents || 0) - Number(invoice.discount_cents || 0));
  await db.prepare(
    `UPDATE invoices
     SET line_items_json = ?, subtotal_cents = ?, amount_cents = ?, total_cents = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(JSON.stringify(lines), subtotal, total, total, invoiceId).run();
}, "writeInvoiceLines");
var parseImportedCustomers = /* @__PURE__ */ __name((raw2) => {
  const text = raw2.trim();
  if (!text) return [];
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const looksLikeCsvHeader = /first.?name|last.?name|email|phone|name/i.test(lines[0]);
  if (looksLikeCsvHeader) {
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const findIndex = /* @__PURE__ */ __name((keys) => {
      for (const key of keys) {
        const idx = headers.indexOf(key);
        if (idx >= 0) return idx;
      }
      return -1;
    }, "findIndex");
    const firstNameIndex = findIndex(["first_name", "firstname", "first name"]);
    const lastNameIndex = findIndex(["last_name", "lastname", "last name"]);
    const nameIndex = findIndex(["name", "full_name", "full name"]);
    const emailIndex = findIndex(["email", "email_address", "email address"]);
    const phoneIndex = findIndex(["phone", "phone_number", "phone number", "mobile"]);
    return lines.slice(1).map((line) => {
      const cols = line.split(",").map((cell) => cell.trim());
      const fullName = nameIndex >= 0 ? cols[nameIndex] || "" : "";
      const explicitFirst = firstNameIndex >= 0 ? cols[firstNameIndex] || "" : "";
      const explicitLast = lastNameIndex >= 0 ? cols[lastNameIndex] || "" : "";
      const nameParts = fullName.split(/\s+/).filter(Boolean);
      const first_name = explicitFirst || nameParts[0] || "";
      const last_name = explicitLast || nameParts.slice(1).join(" ") || "";
      return {
        first_name,
        last_name,
        email: emailIndex >= 0 ? normalizeEmail(cols[emailIndex] || null) : null,
        phone: phoneIndex >= 0 ? cols[phoneIndex] || null : null
      };
    }).filter((entry) => entry.first_name && entry.last_name);
  }
  return lines.map((line) => {
    const emailMatch = line.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const phoneMatch = line.match(/(\+?\d[\d\s().-]{7,}\d)/);
    const cleaned = line.replace(emailMatch?.[0] || "", "").replace(phoneMatch?.[0] || "", "").replace(/[<>]/g, " ").trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    return {
      first_name: parts[0] || "",
      last_name: parts.slice(1).join(" ") || "",
      email: normalizeEmail(emailMatch?.[0] || null),
      phone: phoneMatch?.[0]?.trim() || null
    };
  }).filter((entry) => entry.first_name && entry.last_name);
}, "parseImportedCustomers");
app.get("/", async (c) => {
  const db = c.env.DB;
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const weekFromNow = /* @__PURE__ */ new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const [
    todayJobs,
    weekJobs,
    totalCustomers,
    activeTerritories,
    activeProviders,
    pendingInvoices,
    upcomingJobs,
    recentBookings,
    recentMessages
  ] = await Promise.all([
    db.prepare(`
      SELECT COUNT(*) as count FROM jobs 
      WHERE scheduled_date = ? AND status != 'cancelled'
    `).bind(today).first(),
    db.prepare(`
      SELECT COUNT(*) as count FROM jobs 
      WHERE scheduled_date BETWEEN ? AND ? AND status != 'cancelled'
    `).bind(today, weekFromNow.toISOString().split("T")[0]).first(),
    db.prepare("SELECT COUNT(*) as count FROM customers").first(),
    db.prepare("SELECT COUNT(*) as count FROM territories WHERE is_active = 1").first(),
    db.prepare(`
      SELECT COUNT(*) as count FROM team_members 
      WHERE is_active = 1 AND role = 'provider'
    `).first(),
    db.prepare(`
      SELECT COUNT(*) as count FROM invoices 
      WHERE status IN ('pending', 'sent')
    `).first(),
    db.prepare(`
      SELECT j.id, c.first_name || ' ' || c.last_name as customer_name,
             s.name as service_name, j.scheduled_date, j.scheduled_start_time, j.status
      FROM jobs j
      JOIN customers c ON j.customer_id = c.id
      LEFT JOIN services s ON j.service_id = s.id
      WHERE j.scheduled_date BETWEEN ? AND ?
      AND j.status NOT IN ('cancelled', 'complete')
      ORDER BY j.scheduled_date, j.scheduled_start_time
      LIMIT 10
    `).bind(today, weekFromNow.toISOString().split("T")[0]).all(),
    db.prepare(`
      SELECT j.id, c.first_name || ' ' || c.last_name as customer_name,
             s.name as service_name, t.name as territory_name, j.status, j.created_at, j.total_price_cents
      FROM jobs j
      JOIN customers c ON j.customer_id = c.id
      LEFT JOIN services s ON j.service_id = s.id
      LEFT JOIN territories t ON j.territory_id = t.id
      ORDER BY j.created_at DESC
      LIMIT 10
    `).all(),
    db.prepare(`
      SELECT id, first_name, last_name, email, subject, is_read, created_at
      FROM messages
      ORDER BY created_at DESC
      LIMIT 10
    `).all()
  ]);
  const stats = {
    todayJobs: todayJobs?.count || 0,
    weekJobs: weekJobs?.count || 0,
    totalCustomers: totalCustomers?.count || 0,
    activeTerritories: activeTerritories?.count || 0,
    activeProviders: activeProviders?.count || 0,
    pendingInvoices: pendingInvoices?.count || 0
  };
  const dashboardHtml = Dashboard({
    stats,
    upcomingJobs: upcomingJobs.results || [],
    recentBookings: recentBookings.results || [],
    recentMessages: recentMessages.results || []
  });
  return c.html(dashboardHtml);
});
app.get("/territories", async (c) => {
  const db = c.env.DB;
  const territories = await db.prepare(`
    SELECT id, name, service_area_type, scheduling_policy, is_active
    FROM territories WHERE is_active = 1 ORDER BY name
  `).all();
  const rows = (territories.results || []).map((t) => ({
    name: t.name,
    areaType: t.service_area_type,
    scheduling: t.scheduling_policy,
    active: t.is_active ? "active" : "inactive"
  }));
  return c.html(TableView({
    title: "Territories",
    columns: ["Name", "Area Type", "Scheduling", "Active"],
    rows,
    rawIds: (territories.results || []).map((t) => t.id),
    createUrl: "/admin/territories/new",
    detailUrlPrefix: "/admin/territories",
    deleteUrlPrefix: "/admin/territories"
  }));
});
app.get("/territories/new", (c) => {
  return c.html(TerritoryDetailPage({
    territory: {
      id: "",
      name: "",
      timezone: "America/Toronto",
      service_area_type: "zip",
      service_area_data: "{}",
      operating_hours: "{}",
      scheduling_policy: "provider_based",
      is_active: 1
    },
    services: [],
    providers: [],
    isNew: true
  }));
});
app.post("/territories", async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const id = generateId();
  await db.prepare(`
    INSERT INTO territories (id, name, timezone, service_area_type, service_area_data, scheduling_policy, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.name,
    body.timezone || "America/Toronto",
    body.service_area_type,
    body.service_area_data || "{}",
    body.scheduling_policy,
    body.is_active === "on" ? 1 : 0
  ).run();
  return c.redirect(`/admin/territories/${id}`);
});
app.get("/territories/:id/edit", async (c) => {
  return c.redirect(`/admin/territories/${c.req.param("id")}`);
});
app.post("/territories/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const section = body._section;
  if (section === "basic") {
    await db.prepare(`
      UPDATE territories
      SET name = ?, timezone = ?, scheduling_policy = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      body.name,
      body.timezone || "America/New_York",
      body.scheduling_policy,
      body.is_active === "on" ? 1 : 0,
      id
    ).run();
    return c.redirect(`/admin/territories/${id}`);
  }
  await db.prepare(`
    UPDATE territories 
    SET name = ?, timezone = ?, service_area_type = ?, service_area_data = ?, scheduling_policy = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.name,
    body.timezone || "America/New_York",
    body.service_area_type,
    body.service_area_data || "{}",
    body.scheduling_policy,
    body.is_active === "on" ? 1 : 0,
    id
  ).run();
  return c.redirect(`/admin/territories/${id}`);
});
app.post("/territories/:id/delete", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  await db.prepare("DELETE FROM territory_services WHERE territory_id = ?").bind(id).run();
  await db.prepare("DELETE FROM team_member_territories WHERE territory_id = ?").bind(id).run();
  await db.prepare("UPDATE territories SET is_active = 0, updated_at = datetime('now') WHERE id = ?").bind(id).run();
  const isHtmx = Boolean(c.req.header("HX-Request"));
  if (isHtmx) {
    const from = c.req.header("HX-Current-URL") || "";
    if (from.includes(`/territories/${id}`)) {
      c.header("HX-Redirect", "/admin/territories");
    }
    return c.body("", 200);
  }
  return c.redirect("/admin/territories");
});
app.get("/territories/:id/area-panel/:type", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const panelType = c.req.param("type");
  const territory = await db.prepare("SELECT service_area_type, service_area_data FROM territories WHERE id = ?").bind(id).first();
  const areaData = JSON.parse(territory?.service_area_data || "{}");
  const zipCodes = areaData.zip_codes || areaData.zipCodes || [];
  if (panelType === "zip") return c.html(ZipPanel({ tid: id, zipCodes }));
  if (panelType === "radius") return c.html(RadiusPanel({ tid: id, areaData }));
  if (panelType === "geofence") return c.html(GeofencePanel({ tid: id, areaData }));
  return c.text("Unknown panel type", 400);
});
app.get("/territories/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  if (id === "new") return c.redirect("/admin/territories/new");
  const territory = await db.prepare("SELECT * FROM territories WHERE id = ?").bind(id).first();
  if (!territory) return c.redirect("/admin/territories");
  const [allServices, territoryServices, allProviders, territoryProviders] = await Promise.all([
    db.prepare("SELECT id, name FROM services WHERE is_active = 1 ORDER BY name").all(),
    db.prepare("SELECT service_id FROM territory_services WHERE territory_id = ?").bind(id).all(),
    db.prepare("SELECT id, first_name, last_name FROM team_members WHERE role = 'provider' ORDER BY last_name").all(),
    db.prepare("SELECT team_member_id FROM team_member_territories WHERE territory_id = ?").bind(id).all()
  ]);
  const assignedServiceIds = new Set((territoryServices.results || []).map((r) => r.service_id));
  const assignedProviderIds = new Set((territoryProviders.results || []).map((r) => r.team_member_id));
  const territoryModel = territory;
  return c.html(TerritoryDetailPage({
    territory: territoryModel,
    services: (allServices.results || []).map((s) => ({ id: s.id, name: s.name, assigned: assignedServiceIds.has(s.id) })),
    providers: (allProviders.results || []).map((p) => ({ id: p.id, first_name: p.first_name, last_name: p.last_name, assigned: assignedProviderIds.has(p.id) }))
  }));
});
app.post("/territories/:id/area", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const areaType = body.service_area_type;
  let areaData = "{}";
  if (areaType === "zip") {
    const zips = body.zip_codes.split(",").map((z) => z.trim()).filter(Boolean);
    areaData = JSON.stringify({ zip_codes: zips });
  } else if (areaType === "radius") {
    areaData = JSON.stringify({ center: { lat: parseFloat(body.center_lat), lng: parseFloat(body.center_lng) }, radius_miles: parseFloat(body.radius_miles) });
  } else if (areaType === "geofence") {
    const rawJson = body.polygon_json || "[]";
    try {
      const parsed = JSON.parse(rawJson);
      const polygon = Array.isArray(parsed) ? parsed : parsed.polygon || [];
      areaData = JSON.stringify({ polygon });
    } catch {
      areaData = JSON.stringify({ polygon: [] });
    }
  }
  await db.prepare("UPDATE territories SET service_area_type = ?, service_area_data = ?, updated_at = datetime('now') WHERE id = ?").bind(areaType, areaData, id).run();
  return c.body("", 200);
});
app.post("/territories/:id/hours", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const hours = {};
  for (const key of dayKeys) {
    if (body[`${key}_enabled`] === "on") {
      hours[key] = { start: body[`${key}_start`], end: body[`${key}_end`] };
    } else {
      hours[key] = null;
    }
  }
  await db.prepare("UPDATE territories SET operating_hours = ?, updated_at = datetime('now') WHERE id = ?").bind(JSON.stringify(hours), id).run();
  return c.body("", 200);
});
app.post("/territories/:id/services", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const serviceIds = Array.isArray(body.service_ids) ? body.service_ids : body.service_ids ? [body.service_ids] : [];
  await db.prepare("DELETE FROM territory_services WHERE territory_id = ?").bind(id).run();
  for (const sid of serviceIds) {
    await db.prepare("INSERT INTO territory_services (territory_id, service_id) VALUES (?, ?)").bind(id, sid).run();
  }
  return c.redirect(`/admin/territories/${id}`);
});
app.post("/territories/:id/services/:serviceId/toggle", async (c) => {
  const db = c.env.DB;
  const territoryId = c.req.param("id");
  const serviceId = c.req.param("serviceId");
  const existing = await db.prepare("SELECT 1 FROM territory_services WHERE territory_id = ? AND service_id = ?").bind(territoryId, serviceId).first();
  if (existing) {
    await db.prepare("DELETE FROM territory_services WHERE territory_id = ? AND service_id = ?").bind(territoryId, serviceId).run();
  } else {
    await db.prepare("INSERT INTO territory_services (territory_id, service_id) VALUES (?, ?)").bind(territoryId, serviceId).run();
  }
  return c.body("", 200);
});
app.post("/territories/:id/providers", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const providerIds = Array.isArray(body.provider_ids) ? body.provider_ids : body.provider_ids ? [body.provider_ids] : [];
  await db.prepare("DELETE FROM team_member_territories WHERE territory_id = ?").bind(id).run();
  for (const pid of providerIds) {
    await db.prepare("INSERT INTO team_member_territories (team_member_id, territory_id) VALUES (?, ?)").bind(pid, id).run();
  }
  return c.redirect(`/admin/territories/${id}`);
});
app.post("/territories/:id/providers/:providerId/toggle", async (c) => {
  const db = c.env.DB;
  const territoryId = c.req.param("id");
  const providerId = c.req.param("providerId");
  const existing = await db.prepare("SELECT 1 FROM team_member_territories WHERE territory_id = ? AND team_member_id = ?").bind(territoryId, providerId).first();
  if (existing) {
    await db.prepare("DELETE FROM team_member_territories WHERE territory_id = ? AND team_member_id = ?").bind(territoryId, providerId).run();
  } else {
    await db.prepare("INSERT INTO team_member_territories (team_member_id, territory_id) VALUES (?, ?)").bind(providerId, territoryId).run();
  }
  return c.body("", 200);
});
app.get("/services", async (c) => {
  const db = c.env.DB;
  const services = await db.prepare(`
    SELECT s.id, s.name, s.base_price_cents, s.base_duration_minutes, s.is_active, c.name as category_name
    FROM services s
    LEFT JOIN service_categories c ON s.category_id = c.id
    WHERE s.is_active = 1
    ORDER BY s.name
  `).all();
  const rows = (services.results || []).map((s) => ({
    name: s.name,
    price: `$${(s.base_price_cents / 100).toFixed(2)}`,
    duration: `${s.base_duration_minutes} min`,
    active: s.is_active ? "active" : "inactive"
  }));
  return c.html(TableView({
    title: "Services",
    columns: ["Name", "Price", "Duration", "Active"],
    rows,
    rawIds: (services.results || []).map((s) => s.id),
    createUrl: "/admin/services/new",
    detailUrlPrefix: "/admin/services",
    deleteUrlPrefix: "/admin/services"
  }));
});
app.get("/services/new", async (c) => {
  const db = c.env.DB;
  const categories = await db.prepare("SELECT id, name FROM service_categories ORDER BY sort_order, name").all();
  const fields = [
    { name: "name", label: "Name", required: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "category_id", label: "Category", type: "select", options: (categories.results || []).map((c2) => ({ value: c2.id, label: c2.name })) },
    { name: "base_price", label: "Base Price ($)", type: "number", required: true, min: 0, step: 0.01 },
    { name: "base_duration_minutes", label: "Duration (minutes)", type: "number", required: true, min: 1 },
    { name: "auto_assign_enabled", label: "Auto-assign Enabled", type: "checkbox" },
    { name: "auto_assign_method", label: "Auto-assign Method", type: "select", value: "balanced", options: [
      { value: "balanced", label: "Balanced" },
      { value: "prioritized", label: "Prioritized" },
      { value: "drive_time", label: "Drive Time" }
    ] },
    { name: "is_active", label: "Active", type: "checkbox", value: true }
  ];
  return c.html(FormView({
    title: "Create Service",
    fields,
    submitUrl: "/admin/services",
    cancelUrl: "/admin/services"
  }));
});
app.post("/services", async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const id = generateId();
  await db.prepare(`
    INSERT INTO services (id, name, description, category_id, base_price_cents, base_duration_minutes, auto_assign_enabled, auto_assign_method, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.name,
    body.description || null,
    body.category_id || null,
    Math.round(parseFloat(body.base_price || "0") * 100),
    parseInt(body.base_duration_minutes, 10) || 60,
    body.auto_assign_enabled === "on" ? 1 : 0,
    body.auto_assign_method || "balanced",
    body.is_active === "on" ? 1 : 0
  ).run();
  return c.redirect("/admin/services");
});
app.get("/services/:id/edit", async (c) => {
  return c.redirect(`/admin/services/${c.req.param("id")}`);
});
app.post("/services/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const section = body._section;
  if (section === "basic") {
    await db.prepare(`
      UPDATE services
      SET name = ?, description = ?, category_id = ?, base_price_cents = ?, base_duration_minutes = ?,
          auto_assign_enabled = ?, auto_assign_method = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      body.name,
      body.description || null,
      body.category_id || null,
      Math.round(parseFloat(body.base_price || "0") * 100),
      parseInt(body.base_duration_minutes, 10) || 60,
      body.auto_assign_enabled === "on" ? 1 : 0,
      body.auto_assign_method || "balanced",
      body.is_active === "on" ? 1 : 0,
      id
    ).run();
    return c.redirect(`/admin/services/${id}`);
  }
  await db.prepare(`
    UPDATE services 
    SET name = ?, description = ?, category_id = ?, base_price_cents = ?, base_duration_minutes = ?, 
        auto_assign_enabled = ?, auto_assign_method = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.name,
    body.description || null,
    body.category_id || null,
    Math.round(parseFloat(body.base_price || "0") * 100),
    parseInt(body.base_duration_minutes, 10) || 60,
    body.auto_assign_enabled === "on" ? 1 : 0,
    body.auto_assign_method || "balanced",
    body.is_active === "on" ? 1 : 0,
    id
  ).run();
  return c.redirect(`/admin/services/${id}`);
});
app.post("/services/:id/delete", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  await db.prepare("DELETE FROM territory_services WHERE service_id = ?").bind(id).run();
  await db.prepare("UPDATE services SET is_active = 0, updated_at = datetime('now') WHERE id = ?").bind(id).run();
  const isHtmx = Boolean(c.req.header("HX-Request"));
  if (isHtmx) {
    const from = c.req.header("HX-Current-URL") || "";
    if (from.includes(`/services/${id}`)) {
      c.header("HX-Redirect", "/admin/services");
    }
    return c.body("", 200);
  }
  return c.redirect("/admin/services");
});
var renderServiceDetail = /* @__PURE__ */ __name(async (c, serviceId) => {
  const db = c.env.DB;
  const service = await db.prepare("SELECT * FROM services WHERE id = ?").bind(serviceId).first();
  if (!service) return c.redirect("/admin/services");
  const [categories, modifiers, priceRules, reqSkills, allSkills, territories] = await Promise.all([
    db.prepare("SELECT id, name FROM service_categories ORDER BY sort_order, name").all(),
    db.prepare("SELECT * FROM service_modifiers WHERE service_id = ? ORDER BY sort_order").bind(serviceId).all(),
    db.prepare("SELECT par.*, t.name as territory_name FROM price_adjustment_rules par LEFT JOIN territories t ON par.territory_id = t.id WHERE par.service_id = ?").bind(serviceId).all(),
    db.prepare("SELECT s.id, s.name FROM service_required_skills srs JOIN skills s ON srs.skill_id = s.id WHERE srs.service_id = ?").bind(serviceId).all(),
    db.prepare("SELECT id, name FROM skills ORDER BY name").all(),
    db.prepare("SELECT id, name FROM territories ORDER BY name").all()
  ]);
  const serviceModel = service;
  const categoryList = (categories.results || []).map((r) => ({
    id: r.id,
    name: r.name
  }));
  const modifierList = (modifiers.results || []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description || void 0,
    price_adjustment_cents: Number(r.price_adjustment_cents || 0),
    duration_adjustment_minutes: Number(r.duration_adjustment_minutes || 0),
    is_required: Number(r.is_required || 0),
    sort_order: Number(r.sort_order || 0)
  }));
  const ruleList = (priceRules.results || []).map((r) => ({
    id: r.id,
    rule_type: r.rule_type,
    adjustment_type: r.adjustment_type,
    adjustment_value: Number(r.adjustment_value || 0),
    direction: r.direction,
    days_of_week: r.days_of_week || void 0,
    start_time: r.start_time || void 0,
    end_time: r.end_time || void 0,
    min_hours_ahead: r.min_hours_ahead !== null && r.min_hours_ahead !== void 0 ? Number(r.min_hours_ahead) : void 0,
    max_hours_ahead: r.max_hours_ahead !== null && r.max_hours_ahead !== void 0 ? Number(r.max_hours_ahead) : void 0,
    territory_id: r.territory_id || void 0,
    territory_name: r.territory_name || void 0
  }));
  const requiredSkillList = (reqSkills.results || []).map((r) => ({
    id: r.id,
    name: r.name
  }));
  const allSkillList = (allSkills.results || []).map((r) => ({
    id: r.id,
    name: r.name
  }));
  const territoryList = (territories.results || []).map((r) => ({
    id: r.id,
    name: r.name
  }));
  return c.html(ServiceDetailPage({
    service: serviceModel,
    categories: categoryList,
    modifiers: modifierList,
    priceRules: ruleList,
    requiredSkills: requiredSkillList,
    allSkills: allSkillList,
    territories: territoryList
  }));
}, "renderServiceDetail");
app.get("/services/:id", async (c) => {
  const id = c.req.param("id");
  if (id === "new") return c.redirect("/admin/services/new");
  return renderServiceDetail(c, id);
});
app.post("/services/:id/modifiers/:modId/delete", async (c) => {
  const db = c.env.DB;
  await db.prepare("DELETE FROM service_modifiers WHERE id = ? AND service_id = ?").bind(c.req.param("modId"), c.req.param("id")).run();
  return renderServiceDetail(c, c.req.param("id"));
});
app.post("/services/:id/rules/:ruleId/delete", async (c) => {
  const db = c.env.DB;
  await db.prepare("DELETE FROM price_adjustment_rules WHERE id = ? AND service_id = ?").bind(c.req.param("ruleId"), c.req.param("id")).run();
  return renderServiceDetail(c, c.req.param("id"));
});
app.post("/services/:id/modifiers", async (c) => {
  const db = c.env.DB;
  const serviceId = c.req.param("id");
  const body = await c.req.parseBody();
  const maxOrder = await db.prepare("SELECT MAX(sort_order) as max_order FROM service_modifiers WHERE service_id = ?").bind(serviceId).first();
  await db.prepare("INSERT INTO service_modifiers (id, service_id, name, description, price_adjustment_cents, duration_adjustment_minutes, is_required, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(
    generateId(),
    serviceId,
    body.name,
    body.description || null,
    Math.round(parseFloat(body.price_adjustment || "0") * 100),
    parseInt(body.duration_adjustment_minutes, 10) || 0,
    body.is_required === "on" ? 1 : 0,
    (maxOrder?.max_order || 0) + 1
  ).run();
  return c.redirect(`/admin/services/${serviceId}`);
});
app.post("/services/:id/rules", async (c) => {
  const db = c.env.DB;
  const serviceId = c.req.param("id");
  const body = await c.req.parseBody();
  await db.prepare("INSERT INTO price_adjustment_rules (id, service_id, rule_type, adjustment_type, adjustment_value, direction, days_of_week, start_time, end_time, min_hours_ahead, max_hours_ahead, territory_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(
    generateId(),
    serviceId,
    body.rule_type,
    body.adjustment_type,
    body.adjustment_type === "flat" ? Math.round(parseFloat(body.adjustment_value || "0") * 100) : parseFloat(body.adjustment_value || "0"),
    body.direction,
    body.days_of_week || null,
    body.start_time || null,
    body.end_time || null,
    body.min_hours_ahead ? parseInt(body.min_hours_ahead, 10) : null,
    body.max_hours_ahead ? parseInt(body.max_hours_ahead, 10) : null,
    body.territory_id || null
  ).run();
  return c.redirect(`/admin/services/${serviceId}`);
});
app.post("/services/:id/skills", async (c) => {
  const db = c.env.DB;
  const serviceId = c.req.param("id");
  const body = await c.req.parseBody();
  const skillIds = Array.isArray(body.skill_ids) ? body.skill_ids : body.skill_ids ? [body.skill_ids] : [];
  await db.prepare("DELETE FROM service_required_skills WHERE service_id = ?").bind(serviceId).run();
  for (const sid of skillIds) {
    await db.prepare("INSERT INTO service_required_skills (service_id, skill_id) VALUES (?, ?)").bind(serviceId, sid).run();
  }
  return c.redirect(`/admin/services/${serviceId}`);
});
app.get("/customers", async (c) => {
  const db = c.env.DB;
  const customers = await db.prepare(`
    SELECT c.id, c.first_name, c.last_name, c.email, c.phone,
           ca.line_1, ca.city, ca.state, ca.postal_code,
           t.name as territory_name
    FROM customers c
    LEFT JOIN customer_addresses ca ON ca.customer_id = c.id AND ca.is_default = 1
    LEFT JOIN jobs j ON j.customer_id = c.id
    LEFT JOIN territories t ON j.territory_id = t.id
    GROUP BY c.id
    ORDER BY c.created_at DESC LIMIT 50
  `).all();
  return c.html(TableView({
    title: "Customers",
    columns: ["Name", "Email", "Phone", "Address", "Territory"],
    rows: (customers.results || []).map((cust) => ({
      name: `${cust.first_name} ${cust.last_name}`,
      email: cust.email || "-",
      phone: cust.phone || "-",
      address: cust.line_1 ? `${cust.line_1}${cust.city ? `, ${cust.city}` : ""}${cust.state ? `, ${cust.state}` : ""} ${cust.postal_code || ""}`.trim() : "-",
      territory: cust.territory_name || "-"
    })),
    rawIds: (customers.results || []).map((cust) => cust.id),
    createUrl: "/admin/customers/new",
    extraActions: [{ label: "Import", url: "/admin/customers/import" }],
    detailUrlPrefix: "/admin/customers",
    deleteUrlPrefix: "/admin/customers"
  }));
});
app.get("/customers/new", (c) => {
  const error = c.req.query("error") || void 0;
  const fields = [
    { name: "first_name", label: "First Name", required: true },
    { name: "last_name", label: "Last Name", required: true },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Phone", type: "tel" },
    {
      name: "address_line_1",
      label: "Address",
      placeholder: "Start typing address",
      attrs: {
        "hx-get": "/admin/api/address/search",
        "hx-trigger": "input changed delay:300ms",
        "hx-target": "#address-results",
        autocomplete: "off"
      }
    },
    { name: "address_line_2", label: "Address Line 2" },
    { name: "address_city", label: "City" },
    { name: "address_state", label: "Province / State" },
    { name: "address_postal", label: "Postal Code" },
    { name: "address_lat", label: "Latitude", type: "hidden" },
    { name: "address_lng", label: "Longitude", type: "hidden" }
  ];
  return c.html(FormView({
    title: "Create Customer",
    fields,
    error,
    submitUrl: "/admin/customers",
    cancelUrl: "/admin/customers"
  }));
});
app.post("/customers", async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const id = generateId();
  const email = normalizeEmail(typeof body.email === "string" ? body.email : null);
  const phoneRaw = typeof body.phone === "string" ? body.phone.trim() : "";
  const phoneE164 = normalizePhoneE164(phoneRaw || null);
  const duplicate = await db.prepare(
    `SELECT id, first_name, last_name FROM customers
     WHERE (? IS NOT NULL AND LOWER(email) = ?)
        OR (? IS NOT NULL AND phone_e164 = ?)
     LIMIT 1`
  ).bind(email, email, phoneE164, phoneE164).first();
  if (duplicate) {
    const q = new URLSearchParams({ error: `A customer already exists: ${duplicate.first_name} ${duplicate.last_name}.` });
    return c.redirect(`/admin/customers/new?${q.toString()}`);
  }
  await db.prepare(`
    INSERT INTO customers (id, first_name, last_name, email, phone, phone_e164)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.first_name,
    body.last_name,
    email,
    phoneRaw || null,
    phoneE164
  ).run();
  const line1 = typeof body.address_line_1 === "string" ? body.address_line_1.trim() : "";
  const city = typeof body.address_city === "string" ? body.address_city.trim() : "";
  const state = typeof body.address_state === "string" ? body.address_state.trim() : "";
  const postal = typeof body.address_postal === "string" ? body.address_postal.trim() : "";
  if (line1 && city && state && postal) {
    await db.prepare(`
      INSERT INTO customer_addresses (id, customer_id, line_1, line_2, city, state, postal_code, lat, lng, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      generateId(),
      id,
      line1,
      typeof body.address_line_2 === "string" && body.address_line_2.trim() ? body.address_line_2.trim() : null,
      city,
      state,
      postal,
      typeof body.address_lat === "string" && body.address_lat.trim() ? Number.parseFloat(body.address_lat) : null,
      typeof body.address_lng === "string" && body.address_lng.trim() ? Number.parseFloat(body.address_lng) : null
    ).run();
  }
  return c.redirect("/admin/customers");
});
app.get("/customers/import", (c) => {
  const error = c.req.query("error") || void 0;
  const fields = [
    {
      name: "source_text",
      label: "Paste Contacts (CSV or one contact per line)",
      type: "textarea",
      required: true,
      placeholder: "first_name,last_name,email,phone\nJane,Doe,jane@example.com,613-555-0101\n\nOR\n\nJane Doe jane@example.com 613-555-0101"
    }
  ];
  return c.html(FormView({
    title: "Import Customers",
    fields,
    error,
    submitUrl: "/admin/customers/import",
    cancelUrl: "/admin/customers"
  }));
});
app.post("/customers/import", async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const source = typeof body.source_text === "string" ? body.source_text : "";
  const parsed = parseImportedCustomers(source);
  if (parsed.length === 0) {
    const q = new URLSearchParams({ error: "No valid contacts found. Use CSV headers or one contact per line." });
    return c.redirect(`/admin/customers/import?${q.toString()}`);
  }
  for (const entry of parsed) {
    const phoneE164 = normalizePhoneE164(entry.phone || null);
    const existing = await db.prepare(
      `SELECT id FROM customers
       WHERE (? IS NOT NULL AND LOWER(email) = ?)
          OR (? IS NOT NULL AND phone_e164 = ?)
       LIMIT 1`
    ).bind(entry.email, entry.email, phoneE164, phoneE164).first();
    if (existing) continue;
    await db.prepare(
      `INSERT INTO customers (id, first_name, last_name, email, phone, phone_e164)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      generateId(),
      entry.first_name,
      entry.last_name,
      entry.email,
      entry.phone,
      phoneE164
    ).run();
  }
  return c.redirect("/admin/customers");
});
app.get("/customers/:id", async (c) => {
  const id = c.req.param("id");
  if (id === "new") return c.redirect("/admin/customers/new");
  return c.redirect(`/admin/customers/${id}/edit`);
});
app.get("/customers/:id/edit", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const error = c.req.query("error") || void 0;
  const [customer, address, territory] = await Promise.all([
    db.prepare("SELECT * FROM customers WHERE id = ?").bind(id).first(),
    db.prepare("SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC LIMIT 1").bind(id).first(),
    db.prepare("SELECT t.name FROM jobs j JOIN territories t ON j.territory_id = t.id WHERE j.customer_id = ? ORDER BY j.created_at DESC LIMIT 1").bind(id).first()
  ]);
  if (!customer) {
    return c.redirect("/admin/customers");
  }
  const fields = [
    { name: "first_name", label: "First Name", required: true, value: customer.first_name },
    { name: "last_name", label: "Last Name", required: true, value: customer.last_name },
    { name: "email", label: "Email", type: "email", value: customer.email },
    { name: "phone", label: "Phone", type: "tel", value: customer.phone },
    {
      name: "address_line_1",
      label: "Address",
      value: address?.line_1 || "",
      placeholder: "Start typing address",
      attrs: {
        "hx-get": "/admin/api/address/search",
        "hx-trigger": "input changed delay:300ms",
        "hx-target": "#address-results",
        autocomplete: "off"
      }
    },
    { name: "address_line_2", label: "Address Line 2", value: address?.line_2 || "" },
    { name: "address_city", label: "City", value: address?.city || "" },
    { name: "address_state", label: "Province / State", value: address?.state || "" },
    { name: "address_postal", label: "Postal Code", value: address?.postal_code || "" },
    { name: "address_lat", label: "Latitude", type: "hidden", value: String(address?.lat || "") },
    { name: "address_lng", label: "Longitude", type: "hidden", value: String(address?.lng || "") },
    ...territory ? [{ name: "_territory", label: "Territory", value: territory.name, readonly: true }] : []
  ];
  return c.html(FormView({
    title: "Edit Customer",
    fields,
    error,
    submitUrl: `/admin/customers/${id}`,
    cancelUrl: "/admin/customers",
    isEdit: true,
    deleteUrl: `/admin/customers/${id}/delete`
  }));
});
app.post("/customers/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const email = normalizeEmail(typeof body.email === "string" ? body.email : null);
  const phoneRaw = typeof body.phone === "string" ? body.phone.trim() : "";
  const phoneE164 = normalizePhoneE164(phoneRaw || null);
  const duplicate = await db.prepare(
    `SELECT id, first_name, last_name FROM customers
     WHERE id != ?
       AND ((? IS NOT NULL AND LOWER(email) = ?) OR (? IS NOT NULL AND phone_e164 = ?))
     LIMIT 1`
  ).bind(id, email, email, phoneE164, phoneE164).first();
  if (duplicate) {
    const q = new URLSearchParams({ error: `A customer already exists: ${duplicate.first_name} ${duplicate.last_name}.` });
    return c.redirect(`/admin/customers/${id}/edit?${q.toString()}`);
  }
  await db.prepare(`
    UPDATE customers 
    SET first_name = ?, last_name = ?, email = ?, phone = ?, phone_e164 = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.first_name,
    body.last_name,
    email,
    phoneRaw || null,
    phoneE164,
    id
  ).run();
  const line1 = typeof body.address_line_1 === "string" ? body.address_line_1.trim() : "";
  const city = typeof body.address_city === "string" ? body.address_city.trim() : "";
  const state = typeof body.address_state === "string" ? body.address_state.trim() : "";
  const postal = typeof body.address_postal === "string" ? body.address_postal.trim() : "";
  await db.prepare("DELETE FROM customer_addresses WHERE customer_id = ? AND is_default = 1").bind(id).run();
  if (line1 && city && state && postal) {
    await db.prepare(`
      INSERT INTO customer_addresses (id, customer_id, line_1, line_2, city, state, postal_code, lat, lng, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      generateId(),
      id,
      line1,
      typeof body.address_line_2 === "string" && body.address_line_2.trim() ? body.address_line_2.trim() : null,
      city,
      state,
      postal,
      typeof body.address_lat === "string" && body.address_lat.trim() ? Number.parseFloat(body.address_lat) : null,
      typeof body.address_lng === "string" && body.address_lng.trim() ? Number.parseFloat(body.address_lng) : null
    ).run();
  }
  return c.redirect("/admin/customers");
});
app.post("/customers/:id/delete", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  await db.prepare("DELETE FROM customers WHERE id = ?").bind(id).run();
  const isHtmx = Boolean(c.req.header("HX-Request"));
  if (isHtmx) {
    const from = c.req.header("HX-Current-URL") || "";
    if (from.includes(`/customers/${id}`)) {
      c.header("HX-Redirect", "/admin/customers");
    }
    return c.body("", 200);
  }
  return c.redirect("/admin/customers");
});
app.get("/team", async (c) => {
  const db = c.env.DB;
  const team = await db.prepare(`
    SELECT id, first_name, last_name, email, role, is_active
    FROM team_members WHERE is_active = 1 ORDER BY last_name, first_name
  `).all();
  const rows = (team.results || []).map((t) => ({
    name: `${t.first_name} ${t.last_name}`,
    role: t.role,
    email: t.email,
    active: t.is_active ? "active" : "inactive"
  }));
  return c.html(TableView({
    title: "Team",
    columns: ["Name", "Role", "Email", "Active"],
    rows,
    rawIds: (team.results || []).map((t) => t.id),
    createUrl: "/admin/team/new",
    detailUrlPrefix: "/admin/team",
    deleteUrlPrefix: "/admin/team"
  }));
});
app.get("/team/new", (c) => {
  const fields = [
    { name: "first_name", label: "First Name", required: true },
    { name: "last_name", label: "Last Name", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "phone", label: "Phone", type: "tel" },
    { name: "role", label: "Role", type: "select", required: true, value: "provider", options: [
      { value: "manager", label: "Manager" },
      { value: "provider", label: "Provider" }
    ] },
    { name: "can_be_auto_assigned", label: "Can be Auto-assigned", type: "checkbox", value: true },
    { name: "is_active", label: "Active", type: "checkbox", value: true }
  ];
  return c.html(FormView({
    title: "Create Team Member",
    fields,
    submitUrl: "/admin/team",
    cancelUrl: "/admin/team"
  }));
});
app.post("/team", async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const id = generateId();
  await db.prepare(`
    INSERT INTO team_members (id, first_name, last_name, email, phone, role, can_be_auto_assigned, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.first_name,
    body.last_name,
    body.email,
    body.phone || null,
    body.role || "provider",
    body.can_be_auto_assigned === "on" ? 1 : 0,
    body.is_active === "on" ? 1 : 0
  ).run();
  return c.redirect("/admin/team");
});
app.get("/team/:id/edit", async (c) => {
  return c.redirect(`/admin/team/${c.req.param("id")}`);
});
app.post("/team/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const section = body._section;
  if (section && section !== "profile") {
  }
  await db.prepare(`
    UPDATE team_members 
    SET first_name = ?, last_name = ?, email = ?, phone = ?, role = ?, 
        can_be_auto_assigned = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.first_name,
    body.last_name,
    body.email,
    body.phone || null,
    body.role || "provider",
    body.can_be_auto_assigned === "on" ? 1 : 0,
    body.is_active === "on" ? 1 : 0,
    id
  ).run();
  return c.redirect(`/admin/team/${id}`);
});
app.post("/team/:id/delete", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  await db.prepare("UPDATE team_members SET is_active = 0 WHERE id = ?").bind(id).run();
  const isHtmx = Boolean(c.req.header("HX-Request"));
  if (isHtmx) {
    const from = c.req.header("HX-Current-URL") || "";
    if (from.includes(`/team/${id}`)) {
      c.header("HX-Redirect", "/admin/team");
    }
    return c.body("", 200);
  }
  return c.redirect("/admin/team");
});
app.get("/team/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  if (id === "new") return c.redirect("/admin/team/new");
  const member = await db.prepare("SELECT * FROM team_members WHERE id = ?").bind(id).first();
  if (!member) return c.redirect("/admin/team");
  const [weeklyHours, dateOverrides, memberSkills, allSkills, allTerritories, memberTerritories] = await Promise.all([
    db.prepare("SELECT day_of_week, start_time, end_time FROM provider_weekly_hours WHERE team_member_id = ? ORDER BY day_of_week").bind(id).all(),
    db.prepare("SELECT * FROM provider_date_overrides WHERE team_member_id = ? ORDER BY date").bind(id).all(),
    db.prepare("SELECT s.id, s.name FROM team_member_skills tms JOIN skills s ON tms.skill_id = s.id WHERE tms.team_member_id = ?").bind(id).all(),
    db.prepare("SELECT id, name FROM skills ORDER BY name").all(),
    db.prepare("SELECT id, name FROM territories ORDER BY name").all(),
    db.prepare("SELECT territory_id FROM team_member_territories WHERE team_member_id = ?").bind(id).all()
  ]);
  const assignedTerritoryIds = new Set((memberTerritories.results || []).map((r) => r.territory_id));
  const memberModel = member;
  return c.html(ProviderDetailPage({
    member: memberModel,
    weeklyHours: (weeklyHours.results || []).map((h) => ({
      day_of_week: Number(h.day_of_week),
      start_time: h.start_time,
      end_time: h.end_time
    })),
    dateOverrides: (dateOverrides.results || []).map((o) => ({
      id: o.id,
      date: o.date,
      is_available: Number(o.is_available),
      start_time: o.start_time || void 0,
      end_time: o.end_time || void 0
    })),
    skills: (memberSkills.results || []).map((s) => ({ id: s.id, name: s.name })),
    allSkills: (allSkills.results || []).map((s) => ({ id: s.id, name: s.name })),
    territories: (allTerritories.results || []).map((t) => ({ id: t.id, name: t.name, assigned: assignedTerritoryIds.has(t.id) }))
  }));
});
app.post("/team/:id/hours", async (c) => {
  const db = c.env.DB;
  const memberId = c.req.param("id");
  const body = await c.req.parseBody();
  await db.prepare("DELETE FROM provider_weekly_hours WHERE team_member_id = ?").bind(memberId).run();
  for (let day = 0; day <= 6; day++) {
    if (body[`day_${day}_enabled`] === "on") {
      await db.prepare("INSERT INTO provider_weekly_hours (id, team_member_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)").bind(
        generateId(),
        memberId,
        day,
        body[`day_${day}_start`],
        body[`day_${day}_end`]
      ).run();
    }
  }
  return c.redirect(`/admin/team/${memberId}`);
});
app.post("/team/:id/overrides", async (c) => {
  const db = c.env.DB;
  const memberId = c.req.param("id");
  const body = await c.req.parseBody();
  await db.prepare("INSERT INTO provider_date_overrides (id, team_member_id, date, is_available, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)").bind(
    generateId(),
    memberId,
    body.date,
    parseInt(body.is_available, 10),
    body.start_time || null,
    body.end_time || null
  ).run();
  return c.redirect(`/admin/team/${memberId}`);
});
app.delete("/team/:id/overrides/:oId", async (c) => {
  const db = c.env.DB;
  const memberId = c.req.param("id");
  const overrideId = c.req.param("oId");
  await db.prepare("DELETE FROM provider_date_overrides WHERE id = ? AND team_member_id = ?").bind(overrideId, memberId).run();
  return c.redirect(`/admin/team/${memberId}`);
});
app.post("/team/:id/skills", async (c) => {
  const db = c.env.DB;
  const memberId = c.req.param("id");
  const body = await c.req.parseBody();
  const removeSkillId = body.remove_skill_id;
  if (removeSkillId) {
    await db.prepare("DELETE FROM team_member_skills WHERE team_member_id = ? AND skill_id = ?").bind(memberId, removeSkillId).run();
    return c.redirect(`/admin/team/${memberId}`);
  }
  const skillIds = Array.isArray(body.skill_ids) ? body.skill_ids : body.skill_ids ? [body.skill_ids] : [];
  await db.prepare("DELETE FROM team_member_skills WHERE team_member_id = ?").bind(memberId).run();
  for (const sid of skillIds) {
    await db.prepare("INSERT INTO team_member_skills (team_member_id, skill_id) VALUES (?, ?)").bind(memberId, sid).run();
  }
  return c.redirect(`/admin/team/${memberId}`);
});
app.post("/team/:id/territories", async (c) => {
  const db = c.env.DB;
  const memberId = c.req.param("id");
  const body = await c.req.parseBody();
  const removeTerritoryId = body.remove_territory_id;
  if (removeTerritoryId) {
    await db.prepare("DELETE FROM team_member_territories WHERE team_member_id = ? AND territory_id = ?").bind(memberId, removeTerritoryId).run();
    return c.redirect(`/admin/team/${memberId}`);
  }
  const territoryIds = Array.isArray(body.territory_ids) ? body.territory_ids : body.territory_ids ? [body.territory_ids] : [];
  await db.prepare("DELETE FROM team_member_territories WHERE team_member_id = ?").bind(memberId).run();
  for (const tid of territoryIds) {
    await db.prepare("INSERT INTO team_member_territories (team_member_id, territory_id) VALUES (?, ?)").bind(memberId, tid).run();
  }
  return c.redirect(`/admin/team/${memberId}`);
});
app.get("/jobs", async (c) => {
  const db = c.env.DB;
  const jobs = await db.prepare(`
    SELECT j.id, c.first_name || ' ' || c.last_name as customer_name,
           s.name as service_name, j.scheduled_date, j.status
    FROM jobs j
    JOIN customers c ON j.customer_id = c.id
    LEFT JOIN services s ON j.service_id = s.id
    ORDER BY j.scheduled_date DESC
    LIMIT 50
  `).all();
  const rows = (jobs.results || []).map((j) => ({
    customer: j.customer_name,
    service: j.service_name || "Custom",
    date: j.scheduled_date,
    status: j.status
  }));
  return c.html(TableView({
    title: "Jobs",
    columns: ["Customer", "Service", "Date", "Status"],
    rows,
    rawIds: (jobs.results || []).map((j) => j.id),
    createUrl: "/admin/jobs/new",
    detailUrlPrefix: "/admin/jobs",
    deleteUrlPrefix: "/admin/jobs"
  }));
});
app.get("/jobs/new", async (c) => {
  const db = c.env.DB;
  const customerId = c.req.query("customer_id") || void 0;
  const territoryIdQ = c.req.query("territory_id") || void 0;
  const serviceIdQ = c.req.query("service_id") || void 0;
  const dateQ = c.req.query("date") || void 0;
  const timeQ = c.req.query("time") || void 0;
  const providerIdQ = c.req.query("provider_id") || void 0;
  const addressLine1 = c.req.query("address_line1") || void 0;
  const error = c.req.query("error") || void 0;
  let customer;
  if (customerId) {
    const row = await db.prepare("SELECT id, first_name, last_name, email, phone FROM customers WHERE id = ?").bind(customerId).first();
    if (row) customer = row;
  }
  const territoriesRes = await db.prepare("SELECT id, name FROM territories WHERE is_active = 1 ORDER BY name").all();
  const territories = (territoriesRes.results || []).map((t) => ({ id: t.id, name: t.name }));
  let selectedTerritoryId = territoryIdQ;
  const onlyTerritory = territories.length === 1 ? territories[0] : void 0;
  if (!selectedTerritoryId && onlyTerritory) selectedTerritoryId = onlyTerritory.id;
  let services = [];
  if (selectedTerritoryId) {
    const servicesRes = await db.prepare(
      "SELECT s.id, s.name, s.description, s.base_price_cents, s.base_duration_minutes FROM services s JOIN territory_services ts ON s.id = ts.service_id WHERE ts.territory_id = ? AND s.is_active = 1 ORDER BY s.name"
    ).bind(selectedTerritoryId).all();
    services = servicesRes.results || [];
  }
  let selectedServiceId = serviceIdQ;
  if (selectedServiceId && services.length > 0 && !services.some((s) => s.id === selectedServiceId)) {
    selectedServiceId = void 0;
  }
  const onlyService = services.length === 1 ? services[0] : void 0;
  if (!selectedServiceId && onlyService) selectedServiceId = onlyService.id;
  const today = /* @__PURE__ */ new Date();
  const dates = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today.getTime() + i * 864e5);
    const dateStr = d.toISOString().split("T")[0];
    if (dateStr) dates.push(dateStr);
  }
  let selectedDate = dateQ;
  if (selectedDate && !dates.includes(selectedDate)) {
    selectedDate = void 0;
  }
  const timeslots = [];
  if (selectedServiceId && selectedDate) {
    for (let h = 8; h <= 17; h++) {
      timeslots.push(`${String(h).padStart(2, "0")}:00`);
    }
  }
  let selectedTime = timeQ;
  if (selectedTime && (!timeslots.includes(selectedTime) || !selectedDate)) {
    selectedTime = void 0;
  }
  let providers = [];
  if (selectedServiceId && selectedDate && selectedTime) {
    const providerQuery = "SELECT id, first_name, last_name, role, is_active FROM team_members WHERE role = 'provider' AND is_active = 1";
    const providersRes = await db.prepare(`${providerQuery} ORDER BY last_name, first_name`).all();
    providers = (providersRes.results || []).map((p) => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      role: p.role,
      is_available: Boolean(p.is_active)
    }));
  }
  let selectedProviderId = providerIdQ;
  if (selectedProviderId && providers.length > 0 && !providers.some((p) => p.id === selectedProviderId)) {
    selectedProviderId = void 0;
  }
  const onlyProvider = providers.length === 1 ? providers[0] : void 0;
  if (!selectedProviderId && onlyProvider) selectedProviderId = onlyProvider.id;
  const props = {
    customer,
    territories,
    services,
    dates,
    timeslots,
    providers,
    addressLine1,
    selectedTerritoryId,
    selectedServiceId,
    selectedDate,
    selectedTime,
    selectedProviderId,
    error
  };
  if (c.req.header("HX-Request") === "true") {
    const targetId = c.req.header("HX-Target") || "";
    if (targetId && targetId !== "page-content") {
      return c.html(JobWizardSwapBundle({ props, targetId }));
    }
  }
  return c.html(JobWizardPage(props));
});
app.post("/jobs/quick-create", async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const customerId = typeof body.customer_id === "string" ? body.customer_id : "";
  const territoryId = typeof body.territory_id === "string" ? body.territory_id : "";
  const serviceId = typeof body.service_id === "string" ? body.service_id : "";
  const date = typeof body.date === "string" ? body.date : "";
  const time = typeof body.time === "string" ? body.time : "";
  const providerId = typeof body.provider_id === "string" ? body.provider_id : "";
  const addressLine1 = typeof body.address_line1 === "string" ? body.address_line1.trim() : "";
  if (!customerId || !territoryId || !serviceId || !date || !time) {
    const q = new URLSearchParams();
    if (customerId) q.set("customer_id", customerId);
    if (territoryId) q.set("territory_id", territoryId);
    if (serviceId) q.set("service_id", serviceId);
    if (date) q.set("date", date);
    if (time) q.set("time", time);
    if (providerId) q.set("provider_id", providerId);
    if (addressLine1) q.set("address_line1", addressLine1);
    q.set("error", "Pick a customer, territory, service, date, and time.");
    return c.redirect(`/admin/jobs/new?${q.toString()}`);
  }
  const service = await db.prepare("SELECT base_price_cents, base_duration_minutes FROM services WHERE id = ?").bind(serviceId).first();
  const jobId = generateId();
  const priceCents = service?.base_price_cents || 0;
  const duration = service?.base_duration_minutes || 60;
  let customerAddressId = null;
  if (addressLine1) {
    customerAddressId = generateId();
    await db.prepare(
      "INSERT INTO customer_addresses (id, customer_id, line_1, city, state, postal_code, is_default) VALUES (?, ?, ?, ?, ?, ?, 1)"
    ).bind(customerAddressId, customerId, addressLine1, "", "", "").run();
  }
  await db.prepare(`
      INSERT INTO jobs (id, customer_id, service_id, territory_id, customer_address_id, scheduled_date, scheduled_start_time,
                        duration_minutes, base_price_cents, total_price_cents, line_items_json, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
    jobId,
    customerId,
    serviceId,
    territoryId,
    customerAddressId,
    date,
    time,
    duration,
    priceCents,
    priceCents,
    JSON.stringify([buildServiceBaseLine("Service", priceCents)]),
    providerId ? "assigned" : "created"
  ).run();
  if (providerId) {
    await db.prepare("INSERT INTO job_providers (job_id, team_member_id) VALUES (?, ?)").bind(jobId, providerId).run();
  }
  return c.redirect(`/admin/jobs/${jobId}`);
});
app.get("/api/customers/search", async (c) => {
  const db = c.env.DB;
  const q = c.req.query("q") || "";
  if (q.length < 2) return c.html("");
  const customers = await db.prepare(
    "SELECT id, first_name, last_name, email FROM customers WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? ORDER BY last_name, first_name LIMIT 10"
  ).bind(`%${q}%`, `%${q}%`, `%${q}%`).all();
  return c.html(CustomerSearchResults({ customers: customers.results || [] }));
});
app.get("/api/address/search", async (c) => {
  const q = c.req.query("q") || c.req.query("center_address_q") || c.req.query("address_line1") || c.req.query("address_line_1") || "";
  const targetPrefix = c.req.query("center_address_q") ? "radius" : void 0;
  if (q.length < 4) return c.html("");
  try {
    const token = c.env?.MAPBOX_ACCESS_TOKEN || "";
    if (!token) {
      return c.html('<div class="search-results"><div class="search-item text-muted-foreground">Mapbox is not configured.</div></div>');
    }
    const res = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(q)}&country=ca&limit=5&access_token=${token}`);
    const data = await res.json();
    const results = (data.features || []).map((f) => {
      const p = f.properties;
      const ctx = p.context || {};
      return {
        display: p.full_address || p.name || "",
        line1: p.name || "",
        city: ctx.place?.name || "",
        state: ctx.region?.region_code || "",
        postal: ctx.postcode?.name || "",
        lat: String(f.geometry.coordinates[1]),
        lng: String(f.geometry.coordinates[0])
      };
    });
    return c.html(AddressSearchResults({ results, targetPrefix }));
  } catch {
    return c.html(AddressSearchResults({ results: [], targetPrefix }));
  }
});
app.post("/api/customers/create-for-job", async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const email = normalizeEmail(typeof body.email === "string" ? body.email : null);
  const phoneRaw = typeof body.phone === "string" ? body.phone.trim() : "";
  const phoneE164 = normalizePhoneE164(phoneRaw || null);
  const existing = await db.prepare(
    `SELECT id, first_name, last_name, email, phone FROM customers
     WHERE (? IS NOT NULL AND LOWER(email) = ?)
        OR (? IS NOT NULL AND phone_e164 = ?)
     LIMIT 1`
  ).bind(email, email, phoneE164, phoneE164).first();
  const id = existing?.id || generateId();
  if (!existing) {
    await db.prepare("INSERT INTO customers (id, first_name, last_name, email, phone, phone_e164) VALUES (?, ?, ?, ?, ?, ?)").bind(
      id,
      body.first_name,
      body.last_name,
      email,
      phoneRaw || null,
      phoneE164
    ).run();
  }
  return c.html(JobWizardPage({
    step: 1,
    state: {},
    customer: existing ? { id: existing.id, first_name: existing.first_name, last_name: existing.last_name, email: existing.email || "", phone: existing.phone || "" } : { id, first_name: body.first_name, last_name: body.last_name, email: email || "", phone: phoneRaw }
  }));
});
app.post("/jobs/wizard/step1-address", async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const state = {
    customer_id: body.customer_id,
    customer_name: body.customer_name,
    customer_email: body.customer_email,
    address_line1: body.address_line1,
    address_city: body.address_city,
    address_state: body.address_state,
    address_postal: body.address_postal,
    address_lat: body.address_lat,
    address_lng: body.address_lng
  };
  try {
    const territories = await db.prepare("SELECT id, name, service_area_type, service_area_data FROM territories WHERE is_active = 1").all();
    let matchedTerritory = null;
    for (const t of territories.results || []) {
      try {
        const result = checkServiceArea(
          t.service_area_type,
          t.service_area_data,
          {
            postalCode: state.address_postal,
            lat: state.address_lat ? parseFloat(state.address_lat) : void 0,
            lng: state.address_lng ? parseFloat(state.address_lng) : void 0
          }
        );
        if (result.within) {
          matchedTerritory = { id: t.id, name: t.name };
          break;
        }
      } catch {
      }
    }
    if (!matchedTerritory) {
      const customer = await db.prepare("SELECT id, first_name, last_name, email, phone FROM customers WHERE id = ?").bind(state.customer_id).first();
      return c.html(JobWizardPage({
        step: 1,
        state,
        customer,
        error: `No service territory covers ${state.address_postal || "this address"}. Check your territory settings.`
      }));
    }
    state.territory_id = matchedTerritory.id;
    state.territory_name = matchedTerritory.name;
    const addressId = generateId();
    await db.prepare(
      "INSERT OR IGNORE INTO customer_addresses (id, customer_id, line_1, city, state, postal_code, lat, lng, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)"
    ).bind(
      addressId,
      state.customer_id,
      state.address_line1,
      state.address_city,
      state.address_state,
      state.address_postal,
      state.address_lat ? parseFloat(state.address_lat) : null,
      state.address_lng ? parseFloat(state.address_lng) : null
    ).run();
    const services = await db.prepare(
      "SELECT s.id, s.name, s.description, s.base_price_cents, s.base_duration_minutes FROM services s JOIN territory_services ts ON s.id = ts.service_id WHERE ts.territory_id = ? AND s.is_active = 1 ORDER BY s.name"
    ).bind(matchedTerritory.id).all();
    let serviceList = services.results || [];
    if (serviceList.length === 0) {
      serviceList = (await db.prepare("SELECT id, name, description, base_price_cents, base_duration_minutes FROM services WHERE is_active = 1 ORDER BY name").all()).results || [];
    }
    return c.html(JobWizardPage({ step: 2, state, services: serviceList }));
  } catch (error) {
    console.error("Error in step1-address:", error);
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    const customer = await db.prepare("SELECT id, first_name, last_name, email, phone FROM customers WHERE id = ?").bind(state.customer_id).first();
    return c.html(JobWizardPage({
      step: 1,
      state,
      customer,
      error: `Error processing address: ${errorMsg}`
    }));
  }
});
app.post("/jobs/wizard/step3", async (c) => {
  const body = await c.req.parseBody();
  const state = parseWizardState(body);
  const today = /* @__PURE__ */ new Date();
  const timeslots = [];
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today.getTime() + i * 864e5);
    const dateStr = d.toISOString().split("T")[0];
    for (let h = 8; h <= 17; h++) {
      timeslots.push({ date: dateStr, start_time: `${String(h).padStart(2, "0")}:00`, available: true });
    }
  }
  return c.html(JobWizardPage({ step: 3, state, timeslots }));
});
app.post("/jobs/wizard/step4", async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const state = parseWizardState(body);
  const providerQuery = "SELECT id, first_name, last_name, role, is_active FROM team_members WHERE role = 'provider'";
  const providers = await db.prepare(`${providerQuery} ORDER BY last_name, first_name`).all();
  return c.html(JobWizardPage({
    step: 4,
    state,
    providers: (providers.results || []).map((p) => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      role: p.role,
      is_available: Boolean(p.is_active)
    }))
  }));
});
app.post("/jobs/create", async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const state = parseWizardState(body);
  const jobId = generateId();
  const priceCents = state.service_price ? parseInt(String(state.service_price), 10) : 0;
  const duration = state.service_duration ? parseInt(String(state.service_duration), 10) : 60;
  await db.prepare(`
    INSERT INTO jobs (id, customer_id, service_id, territory_id, scheduled_date, scheduled_start_time, duration_minutes, base_price_cents, total_price_cents, line_items_json, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    jobId,
    state.customer_id,
    state.service_id || null,
    state.territory_id,
    state.date,
    state.time,
    duration,
    priceCents,
    priceCents,
    JSON.stringify([buildServiceBaseLine("Service", priceCents)]),
    state.provider_id ? "assigned" : "created"
  ).run();
  if (state.provider_id) {
    await db.prepare("INSERT INTO job_providers (job_id, team_member_id) VALUES (?, ?)").bind(jobId, state.provider_id).run();
  }
  return c.redirect(`/admin/jobs/${jobId}`);
});
app.get("/jobs/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  if (id === "new" || id === "wizard") return c.redirect("/admin/jobs/new");
  const job = await db.prepare("SELECT * FROM jobs WHERE id = ?").bind(id).first();
  if (!job) return c.redirect("/admin/jobs");
  const notesJson = job.notes_json || "[]";
  const parsedLineItems = parsePriceLines(job.line_items_json || "[]");
  const [customer, service, territory, jobProviders, teamProviders] = await Promise.all([
    job.customer_id ? db.prepare("SELECT id, first_name, last_name, email, phone, phone_e164 FROM customers WHERE id = ?").bind(job.customer_id).first() : null,
    job.service_id ? db.prepare("SELECT id, name, description FROM services WHERE id = ?").bind(job.service_id).first() : null,
    job.territory_id ? db.prepare("SELECT id, name FROM territories WHERE id = ?").bind(job.territory_id).first() : null,
    db.prepare("SELECT tm.id, tm.first_name, tm.last_name FROM job_providers jp JOIN team_members tm ON jp.team_member_id = tm.id WHERE jp.job_id = ?").bind(id).all(),
    db.prepare("SELECT id, first_name, last_name FROM team_members WHERE role = 'provider' ORDER BY last_name, first_name").all()
  ]);
  const customerPhone = customer?.phone_e164 || normalizePhoneE164(customer?.phone || null);
  const smsThreadMessage = await db.prepare(
    `SELECT id, is_read, updated_at, body,
            CASE WHEN json_extract(metadata, '$.job_id') = ? THEN 0 ELSE 1 END as sort_priority
     FROM messages
     WHERE source = 'sms'
       AND (
         json_extract(metadata, '$.job_id') = ?
         OR phone = ?
       )
     ORDER BY sort_priority ASC, updated_at DESC
     LIMIT 1`
  ).bind(id, id, customerPhone || "").first();
  const assignedProviderId = (jobProviders.results || [])[0]?.id;
  const jobModel = job;
  const notes = JSON.parse(notesJson);
  const lineItems = parsedLineItems.length > 0 ? parsedLineItems : [buildServiceBaseLine(service?.name || job.custom_service_name || "Service", Number(job.total_price_cents || 0))];
  return c.html(JobDetailPage({
    job: jobModel,
    customer: customer ? customer : void 0,
    service: service ? service : void 0,
    territory: territory ? territory : void 0,
    team: (teamProviders.results || []).map((p) => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name
    })),
    assignedProviderId: assignedProviderId || null,
    notes,
    lineItems,
    smsThreadMessage: smsThreadMessage ? {
      id: smsThreadMessage.id,
      is_read: smsThreadMessage.is_read,
      updated_at: smsThreadMessage.updated_at,
      body: smsThreadMessage.body
    } : null
  }));
});
app.post("/jobs/:id/line-items/add", async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param("id");
  const body = await c.req.parseBody();
  const job = await db.prepare("SELECT line_items_json FROM jobs WHERE id = ?").bind(jobId).first();
  if (!job) return c.redirect("/admin/jobs");
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const quantity = Math.max(1, Number.parseFloat(String(body.quantity || "1")) || 1);
  const unitPriceCents = parseMoneyToCents(body.unit_price);
  if (!description) return c.redirect(`/admin/jobs/${jobId}`);
  const lines = parsePriceLines(job.line_items_json);
  lines.push(normalizeLine(description, quantity, unitPriceCents, "custom", null, 1));
  await db.prepare("UPDATE jobs SET line_items_json = ?, updated_at = datetime('now') WHERE id = ?").bind(JSON.stringify(lines), jobId).run();
  await recomputeJobTotals(db, jobId);
  await syncInvoiceFromJob(db, jobId);
  return c.redirect(`/admin/jobs/${jobId}`);
});
app.post("/jobs/:id/line-items/delete", async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param("id");
  const body = await c.req.parseBody();
  const lineId = typeof body.lineId === "string" ? body.lineId : "";
  if (!lineId) return c.redirect(`/admin/jobs/${jobId}`);
  const job = await db.prepare("SELECT line_items_json FROM jobs WHERE id = ?").bind(jobId).first();
  if (!job) return c.redirect("/admin/jobs");
  const lines = parsePriceLines(job.line_items_json).filter((line) => !(line.id === lineId && line.is_custom === 1));
  await db.prepare("UPDATE jobs SET line_items_json = ?, updated_at = datetime('now') WHERE id = ?").bind(JSON.stringify(lines), jobId).run();
  await recomputeJobTotals(db, jobId);
  await syncInvoiceFromJob(db, jobId);
  return c.redirect(`/admin/jobs/${jobId}`);
});
app.get("/jobs/:id/sms-thread-card", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const job = await db.prepare("SELECT customer_id FROM jobs WHERE id = ?").bind(id).first();
  const customer = job?.customer_id ? await db.prepare("SELECT phone, phone_e164 FROM customers WHERE id = ?").bind(job.customer_id).first() : null;
  const customerPhone = customer?.phone_e164 || normalizePhoneE164(customer?.phone || null);
  const smsThreadMessage = await db.prepare(
    `SELECT id, is_read, updated_at, body,
            CASE WHEN json_extract(metadata, '$.job_id') = ? THEN 0 ELSE 1 END as sort_priority
     FROM messages
     WHERE source = 'sms'
       AND (
         json_extract(metadata, '$.job_id') = ?
         OR phone = ?
       )
     ORDER BY sort_priority ASC, updated_at DESC
     LIMIT 1`
  ).bind(id, id, customerPhone || "").first();
  c.header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  c.header("Pragma", "no-cache");
  c.header("Expires", "0");
  return c.html(SmsThreadCard({
    jobId: id,
    smsThreadMessage: smsThreadMessage ? {
      id: smsThreadMessage.id,
      is_read: smsThreadMessage.is_read,
      updated_at: smsThreadMessage.updated_at,
      body: smsThreadMessage.body
    } : null
  }));
});
app.post("/jobs/:id/notes/add", async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param("id");
  const body = await c.req.parseBody();
  const job = await db.prepare("SELECT notes_json FROM jobs WHERE id = ?").bind(jobId).first();
  const notes = job?.notes_json ? JSON.parse(job.notes_json) : [];
  notes.push({
    text: body.text,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    completed: 0
  });
  await db.prepare('UPDATE jobs SET notes_json = ?, updated_at = datetime("now") WHERE id = ?').bind(JSON.stringify(notes), jobId).run();
  return c.redirect(`/admin/jobs/${jobId}`);
});
app.post("/jobs/:id/notes/toggle", async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param("id");
  const body = await c.req.parseBody();
  const noteIndex = parseInt(body.noteIndex, 10);
  const job = await db.prepare("SELECT notes_json FROM jobs WHERE id = ?").bind(jobId).first();
  const notes = job?.notes_json ? JSON.parse(job.notes_json) : [];
  if (notes[noteIndex]) {
    notes[noteIndex].completed = notes[noteIndex].completed ? 0 : 1;
  }
  await db.prepare('UPDATE jobs SET notes_json = ?, updated_at = datetime("now") WHERE id = ?').bind(JSON.stringify(notes), jobId).run();
  return c.redirect(`/admin/jobs/${jobId}`);
});
app.post("/jobs/:id/notes/delete", async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param("id");
  const body = await c.req.parseBody();
  const noteIndex = parseInt(body.noteIndex, 10);
  const job = await db.prepare("SELECT notes_json FROM jobs WHERE id = ?").bind(jobId).first();
  const notes = job?.notes_json ? JSON.parse(job.notes_json) : [];
  notes.splice(noteIndex, 1);
  await db.prepare('UPDATE jobs SET notes_json = ?, updated_at = datetime("now") WHERE id = ?').bind(JSON.stringify(notes), jobId).run();
  return c.redirect(`/admin/jobs/${jobId}`);
});
app.post("/jobs/:id/status", async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param("id");
  const body = await c.req.parseBody();
  const status = body.status;
  const validStatuses = ["created", "assigned", "enroute", "in_progress", "complete", "cancelled"];
  if (!validStatuses.includes(status)) return c.redirect(`/admin/jobs/${jobId}`);
  const updates = ["status = ?", "updated_at = datetime('now')"];
  const binds = [status];
  if (status === "complete") updates.push("completed_at = datetime('now')");
  if (status === "cancelled") updates.push("cancelled_at = datetime('now')");
  binds.push(jobId);
  await db.prepare(`UPDATE jobs SET ${updates.join(", ")} WHERE id = ?`).bind(...binds).run();
  const jobData = await db.prepare(
    `SELECT j.customer_id, j.total_price_cents, j.scheduled_date, j.scheduled_start_time, j.line_items_json,
            c.first_name, c.last_name, c.email, c.phone_e164,
            COALESCE(s.name, j.custom_service_name, 'Service') as service_name
     FROM jobs j
     JOIN customers c ON c.id = j.customer_id
     LEFT JOIN services s ON s.id = j.service_id
     WHERE j.id = ?`
  ).bind(jobId).first();
  if (jobData) {
    if (status === "complete") {
      const existingInvoice = await db.prepare(
        "SELECT id FROM invoices WHERE job_id = ?"
      ).bind(jobId).first();
      if (!existingInvoice) {
        const invoiceId = generateId();
        const invoiceNumber = await nextInvoiceNumber(db);
        const dueDate = /* @__PURE__ */ new Date();
        dueDate.setDate(dueDate.getDate() + 14);
        const jobLines = parsePriceLines(jobData.line_items_json);
        const effectiveLines = jobLines.length > 0 ? jobLines : [buildServiceBaseLine(jobData.service_name, jobData.total_price_cents)];
        const subtotal = subtotalFromLines(effectiveLines);
        await db.prepare(`
          INSERT INTO invoices (id, invoice_number, job_id, customer_id, currency, amount_cents, subtotal_cents, tax_cents, discount_cents, total_cents, line_items_json, due_date, status)
          VALUES (?, ?, ?, ?, 'CAD', ?, ?, 0, 0, ?, ?, ?, 'pending')
        `).bind(
          invoiceId,
          invoiceNumber,
          jobId,
          jobData.customer_id,
          subtotal,
          subtotal,
          subtotal,
          JSON.stringify(effectiveLines),
          dueDate.toISOString().split("T")[0]
        ).run();
      }
    }
    let providerName = "";
    if (["assigned", "enroute"].includes(status)) {
      const provider = await db.prepare(
        `SELECT tm.first_name, tm.last_name FROM job_providers jp
         JOIN team_members tm ON tm.id = jp.team_member_id
         WHERE jp.job_id = ? LIMIT 1`
      ).bind(jobId).first();
      if (provider) providerName = `${provider.first_name} ${provider.last_name}`.trim();
    }
    const statusEventMap = {
      assigned: "status.assigned",
      enroute: "status.enroute",
      in_progress: "status.in_progress",
      complete: "status.complete",
      cancelled: "status.cancelled"
    };
    const eventType = statusEventMap[status];
    if (eventType) {
      const baseUrl = new URL(c.req.url).origin;
      const inboxMessageId = jobData.phone_e164 ? await ensureSmsInboxMessage({
        db,
        phoneE164: jobData.phone_e164,
        customerId: jobData.customer_id,
        jobId,
        firstName: jobData.first_name,
        lastName: jobData.last_name,
        email: jobData.email
      }) : null;
      const templateVars = {
        first_name: jobData.first_name,
        last_name: jobData.last_name,
        service_name: jobData.service_name,
        date: jobData.scheduled_date,
        time: jobData.scheduled_start_time,
        provider_name: providerName || "your technician",
        total: (jobData.total_price_cents / 100).toFixed(2)
      };
      c.executionCtx.waitUntil(
        sendJobSms({
          db,
          jobId,
          customerId: jobData.customer_id,
          eventType,
          vars: templateVars,
          messageId: inboxMessageId,
          statusCallbackUrl: `${baseUrl}/webhooks/twilio/status`,
          skipQuietHours: true
        })
      );
    }
  }
  return c.redirect(`/admin/jobs/${jobId}`);
});
app.post("/jobs", async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const id = generateId();
  const totalPriceCents = parseInt(body.total_price_cents, 10) || 0;
  await db.prepare(`
    INSERT INTO jobs (id, customer_id, service_id, territory_id, scheduled_date, scheduled_start_time, 
                      duration_minutes, base_price_cents, total_price_cents, line_items_json, custom_service_name, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.customer_id,
    body.service_id || null,
    body.territory_id,
    body.scheduled_date,
    body.scheduled_start_time,
    parseInt(body.duration_minutes, 10) || 60,
    totalPriceCents,
    totalPriceCents,
    JSON.stringify([buildServiceBaseLine(String(body.custom_service_name || "Service"), totalPriceCents)]),
    body.custom_service_name || null,
    body.status || "created"
  ).run();
  return c.redirect("/admin/jobs");
});
app.get("/jobs/:id/edit", async (c) => {
  return c.redirect(`/admin/jobs/${c.req.param("id")}`);
});
app.post("/jobs/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const section = body._section;
  if (section === "details") {
    const duration = parseInt(body.duration_minutes, 10) || 60;
    const basePriceCents = Math.round(parseFloat(body.base_price || "0") * 100);
    const totalPriceCents2 = Math.round(parseFloat(body.total_price || "0") * 100);
    const providerId = body.provider_id || "";
    const existing2 = await db.prepare("SELECT custom_service_name, line_items_json FROM jobs WHERE id = ?").bind(id).first();
    const customLines2 = parsePriceLines(existing2?.line_items_json || "[]").filter((line) => line.is_custom === 1);
    const generated = buildServiceBaseLine(existing2?.custom_service_name || "Service", totalPriceCents2);
    await db.prepare(`
      UPDATE jobs
      SET scheduled_date = ?, scheduled_start_time = ?, duration_minutes = ?,
          base_price_cents = ?, total_price_cents = ?, line_items_json = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      body.scheduled_date,
      body.scheduled_start_time,
      duration,
      basePriceCents,
      totalPriceCents2,
      JSON.stringify([generated, ...customLines2]),
      id
    ).run();
    await db.prepare("DELETE FROM job_providers WHERE job_id = ?").bind(id).run();
    if (providerId) {
      await db.prepare("INSERT INTO job_providers (job_id, team_member_id) VALUES (?, ?)").bind(id, providerId).run();
    }
    return c.redirect(`/admin/jobs/${id}`);
  }
  const totalPriceCents = parseInt(body.total_price_cents, 10) || 0;
  const existing = await db.prepare("SELECT line_items_json FROM jobs WHERE id = ?").bind(id).first();
  const customLines = parsePriceLines(existing?.line_items_json || "[]").filter((line) => line.is_custom === 1);
  const baseLine = buildServiceBaseLine(String(body.custom_service_name || "Service"), totalPriceCents);
  await db.prepare(`
    UPDATE jobs 
    SET customer_id = ?, service_id = ?, territory_id = ?, scheduled_date = ?, scheduled_start_time = ?,
        duration_minutes = ?, total_price_cents = ?, line_items_json = ?, custom_service_name = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.customer_id,
    body.service_id || null,
    body.territory_id,
    body.scheduled_date,
    body.scheduled_start_time,
    parseInt(body.duration_minutes, 10) || 60,
    totalPriceCents,
    JSON.stringify([baseLine, ...customLines]),
    body.custom_service_name || null,
    body.status || "created",
    id
  ).run();
  return c.redirect(`/admin/jobs/${id}`);
});
app.post("/jobs/:id/delete", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  await db.prepare("DELETE FROM job_notes WHERE job_id = ?").bind(id).run();
  await db.prepare("DELETE FROM job_providers WHERE job_id = ?").bind(id).run();
  await db.prepare("DELETE FROM invoices WHERE job_id = ?").bind(id).run();
  await db.prepare("DELETE FROM jobs WHERE id = ?").bind(id).run();
  const isHtmx = c.req.header("HX-Request");
  if (isHtmx) {
    const from = c.req.header("HX-Current-URL") || "";
    if (from.includes(`/jobs/${id}`)) {
      c.header("HX-Redirect", "/admin/jobs");
    }
    return c.body("", 200);
  }
  return c.redirect("/admin/jobs");
});
app.get("/invoices", async (c) => {
  const db = c.env.DB;
  const invoices = await db.prepare(`
    SELECT i.id, i.invoice_number, i.customer_id,
           TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')) as customer_name,
           i.total_cents, i.currency, i.status, i.due_date, i.created_at
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    ORDER BY i.created_at DESC
    LIMIT 50
  `).all();
  return c.html(TableView({
    title: "Invoices",
    columns: ["Invoice #", "Customer", "Total", "Status", "Due", "Created"],
    rows: (invoices.results || []).map((i) => ({
      invoice: i.invoice_number || i.id,
      customer: typeof i.customer_name === "string" && i.customer_name.trim() ? i.customer_name : `Customer ${i.customer_id}`,
      total: `${i.currency || "CAD"} ${formatCents(Number(i.total_cents || 0))}`,
      status: i.status,
      due: i.due_date || "-",
      created: formatTorontoDate(`${i.created_at}Z`, {}) || i.created_at
    })),
    rawIds: (invoices.results || []).map((i) => i.id),
    createUrl: "/admin/invoices/new",
    detailUrlPrefix: "/admin/invoices",
    deleteUrlPrefix: "/admin/invoices"
  }));
});
app.get("/invoices/new", async (c) => {
  const db = c.env.DB;
  const [customers, jobs] = await Promise.all([
    db.prepare("SELECT id, first_name, last_name FROM customers ORDER BY last_name, first_name").all(),
    db.prepare(`SELECT j.id, c.first_name || ' ' || c.last_name as customer_name, j.scheduled_date 
                FROM jobs j JOIN customers c ON j.customer_id = c.id 
                WHERE j.status != 'cancelled' ORDER BY j.scheduled_date DESC LIMIT 100`).all()
  ]);
  const invoiceNumber = await nextInvoiceNumber(db);
  const fields = [
    { name: "invoice_number", label: "Invoice Number", required: true, value: invoiceNumber },
    { name: "customer_id", label: "Customer", type: "select", required: true, options: (customers.results || []).map((c2) => ({ value: c2.id, label: `${c2.first_name} ${c2.last_name}` })) },
    { name: "job_id", label: "Job (optional)", type: "select", options: (jobs.results || []).map((j) => ({ value: j.id, label: `${j.customer_name} - ${j.scheduled_date}` })) },
    { name: "currency", label: "Currency", type: "select", required: true, value: "CAD", options: [
      { value: "CAD", label: "CAD" },
      { value: "USD", label: "USD" }
    ] },
    { name: "line_items_text", label: "Line Items (one per line: description | qty | unit price)", type: "textarea", placeholder: "Tune-up | 1 | 125.00\nTire install | 2 | 35.00" },
    { name: "tax_amount", label: "Tax ($)", type: "number", min: 0, step: 0.01, value: 0 },
    { name: "discount_amount", label: "Discount ($)", type: "number", min: 0, step: 0.01, value: 0 },
    { name: "total_amount", label: "Total ($)", type: "number", required: true, min: 0, step: 0.01 },
    { name: "due_date", label: "Due Date", type: "date" },
    { name: "notes", label: "Notes", type: "textarea", placeholder: "Payment terms, memo, or internal notes" },
    { name: "status", label: "Status", type: "select", required: true, value: "pending", options: [
      { value: "pending", label: "Pending" },
      { value: "sent", label: "Sent" },
      { value: "paid", label: "Paid" },
      { value: "void", label: "Void" }
    ] }
  ];
  return c.html(FormView({
    title: "Create Invoice",
    fields,
    submitUrl: "/admin/invoices",
    cancelUrl: "/admin/invoices"
  }));
});
app.post("/invoices", async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const id = generateId();
  let lineItems = parseInvoiceLineItems(typeof body.line_items_text === "string" ? body.line_items_text : null);
  if (lineItems.length === 0 && body.job_id) {
    const job = await db.prepare("SELECT line_items_json FROM jobs WHERE id = ?").bind(body.job_id).first();
    lineItems = parsePriceLines(job?.line_items_json || "[]");
  }
  const subtotalCents = lineItems.reduce((sum, item) => sum + item.total_cents, 0);
  const taxCents = parseMoneyToCents(body.tax_amount);
  const discountCents = parseMoneyToCents(body.discount_amount);
  const computedTotalCents = Math.max(0, subtotalCents + taxCents - discountCents);
  const totalCents = computedTotalCents;
  const status = typeof body.status === "string" ? body.status : "pending";
  const paidAt = status === "paid" ? (/* @__PURE__ */ new Date()).toISOString() : null;
  await db.prepare(`
    INSERT INTO invoices (id, invoice_number, customer_id, job_id, currency, amount_cents, subtotal_cents, tax_cents, discount_cents, total_cents, line_items_json, due_date, status, paid_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.invoice_number || await nextInvoiceNumber(db),
    body.customer_id,
    body.job_id || null,
    body.currency || "CAD",
    totalCents,
    subtotalCents,
    taxCents,
    discountCents,
    totalCents,
    JSON.stringify(lineItems),
    body.due_date || null,
    status,
    paidAt,
    body.notes || null
  ).run();
  return c.redirect("/admin/invoices");
});
app.get("/invoices/:id", async (c) => {
  const id = c.req.param("id");
  if (id === "new") return c.redirect("/admin/invoices/new");
  return c.redirect(`/admin/invoices/${id}/edit`);
});
app.get("/invoices/:id/edit", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const [invoice, customers, jobs] = await Promise.all([
    db.prepare("SELECT * FROM invoices WHERE id = ?").bind(id).first(),
    db.prepare("SELECT id, first_name, last_name FROM customers ORDER BY last_name, first_name").all(),
    db.prepare(`SELECT j.id, c.first_name || ' ' || c.last_name as customer_name, j.scheduled_date 
                FROM jobs j JOIN customers c ON j.customer_id = c.id ORDER BY j.scheduled_date DESC LIMIT 100`).all()
  ]);
  if (!invoice) {
    return c.redirect("/admin/invoices");
  }
  const lineItems = parsePriceLines(invoice.line_items_json);
  return c.html(InvoiceDetailPage({
    invoice: {
      id: invoice.id,
      invoice_number: invoice.invoice_number || "",
      customer_id: invoice.customer_id,
      job_id: invoice.job_id || null,
      currency: (invoice.currency || "CAD").toUpperCase(),
      due_date: invoice.due_date || null,
      status: invoice.status || "pending",
      notes: invoice.notes || null,
      tax_cents: Number(invoice.tax_cents || 0),
      discount_cents: Number(invoice.discount_cents || 0)
    },
    customers: (customers.results || []).map((row) => ({
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name
    })),
    jobs: (jobs.results || []).map((row) => ({
      id: row.id,
      customer_name: row.customer_name,
      scheduled_date: row.scheduled_date
    })),
    lineItems
  }));
});
app.post("/invoices/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const existingInvoice = await db.prepare("SELECT line_items_json FROM invoices WHERE id = ?").bind(id).first();
  if (!existingInvoice) return c.redirect("/admin/invoices");
  let lineItems = typeof body.line_items_text === "string" ? parseInvoiceLineItems(body.line_items_text) : parsePriceLines(existingInvoice.line_items_json || "[]");
  if (lineItems.length === 0 && body.job_id) {
    const job = await db.prepare("SELECT line_items_json FROM jobs WHERE id = ?").bind(body.job_id).first();
    lineItems = parsePriceLines(job?.line_items_json || "[]");
  }
  const subtotalCents = lineItems.reduce((sum, item) => sum + item.total_cents, 0);
  const taxCents = parseMoneyToCents(body.tax_amount);
  const discountCents = parseMoneyToCents(body.discount_amount);
  const computedTotalCents = Math.max(0, subtotalCents + taxCents - discountCents);
  const totalCents = computedTotalCents;
  const status = typeof body.status === "string" ? body.status : "pending";
  const paidAt = status === "paid" ? (/* @__PURE__ */ new Date()).toISOString() : null;
  await db.prepare(`
    UPDATE invoices 
    SET invoice_number = ?, customer_id = ?, job_id = ?, currency = ?, amount_cents = ?, subtotal_cents = ?, tax_cents = ?, discount_cents = ?, total_cents = ?, line_items_json = ?, due_date = ?, status = ?, paid_at = CASE WHEN ? = 'paid' THEN COALESCE(paid_at, ?) ELSE NULL END, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.invoice_number,
    body.customer_id,
    body.job_id || null,
    body.currency || "CAD",
    totalCents,
    subtotalCents,
    taxCents,
    discountCents,
    totalCents,
    JSON.stringify(lineItems),
    body.due_date || null,
    status,
    status,
    paidAt,
    body.notes || null,
    id
  ).run();
  return c.redirect("/admin/invoices");
});
app.post("/invoices/:id/line-items/add", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const invoice = await db.prepare("SELECT line_items_json FROM invoices WHERE id = ?").bind(id).first();
  if (!invoice) return c.redirect("/admin/invoices");
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const quantity = Math.max(1, Number.parseFloat(String(body.quantity || "1")) || 1);
  const unitPriceCents = parseMoneyToCents(body.unit_price);
  if (!description) return c.redirect(`/admin/invoices/${id}/edit`);
  const lines = parsePriceLines(invoice.line_items_json);
  lines.push(normalizeLine(description, quantity, unitPriceCents, "custom", null, 1));
  await writeInvoiceLines(db, id, lines);
  return c.redirect(`/admin/invoices/${id}/edit`);
});
app.post("/invoices/:id/line-items/delete", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const lineId = typeof body.lineId === "string" ? body.lineId : "";
  if (!lineId) return c.redirect(`/admin/invoices/${id}/edit`);
  const invoice = await db.prepare("SELECT line_items_json FROM invoices WHERE id = ?").bind(id).first();
  if (!invoice) return c.redirect("/admin/invoices");
  const lines = parsePriceLines(invoice.line_items_json).filter((line) => !(line.id === lineId && line.is_custom === 1));
  await writeInvoiceLines(db, id, lines);
  return c.redirect(`/admin/invoices/${id}/edit`);
});
app.post("/invoices/:id/delete", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  await db.prepare("DELETE FROM invoices WHERE id = ?").bind(id).run();
  const isHtmx = Boolean(c.req.header("HX-Request"));
  if (isHtmx) {
    const from = c.req.header("HX-Current-URL") || "";
    if (from.includes(`/invoices/${id}`)) {
      c.header("HX-Redirect", "/admin/invoices");
    }
    return c.body("", 200);
  }
  return c.redirect("/admin/invoices");
});
app.get("/recurring", async (c) => {
  const db = c.env.DB;
  const recurring = await db.prepare(`
    SELECT rb.id, c.first_name || ' ' || c.last_name as customer_name,
           s.name as service_name, rb.frequency, rb.is_active
    FROM recurring_bookings rb
    JOIN customers c ON rb.customer_id = c.id
    LEFT JOIN services s ON rb.service_id = s.id
    ORDER BY rb.created_at DESC
    LIMIT 50
  `).all();
  return c.html(TableView({
    title: "Recurring Bookings",
    columns: ["Customer", "Service", "Frequency", "Active"],
    rows: (recurring.results || []).map((r) => ({
      customer: r.customer_name,
      service: r.service_name || "N/A",
      frequency: r.frequency,
      active: r.is_active ? "active" : "inactive"
    })),
    createUrl: "/admin/recurring/new",
    detailUrlPrefix: "/admin/recurring",
    deleteUrlPrefix: "/admin/recurring"
  }));
});
app.get("/recurring/new", async (c) => {
  const db = c.env.DB;
  const [customers, services, territories] = await Promise.all([
    db.prepare("SELECT id, first_name, last_name FROM customers ORDER BY last_name, first_name").all(),
    db.prepare("SELECT id, name FROM services WHERE is_active = 1 ORDER BY name").all(),
    db.prepare("SELECT id, name FROM territories WHERE is_active = 1 ORDER BY name").all()
  ]);
  const fields = [
    { name: "customer_id", label: "Customer", type: "select", required: true, options: (customers.results || []).map((c2) => ({ value: c2.id, label: `${c2.first_name} ${c2.last_name}` })) },
    { name: "service_id", label: "Service", type: "select", required: true, options: (services.results || []).map((s) => ({ value: s.id, label: s.name })) },
    { name: "territory_id", label: "Territory", type: "select", required: true, options: (territories.results || []).map((t) => ({ value: t.id, label: t.name })) },
    { name: "frequency", label: "Frequency", type: "select", required: true, options: [
      { value: "weekly", label: "Weekly" },
      { value: "biweekly", label: "Biweekly" },
      { value: "monthly", label: "Monthly" }
    ] },
    { name: "day_of_week", label: "Day of Week", type: "select", options: [
      { value: "0", label: "Sunday" },
      { value: "1", label: "Monday" },
      { value: "2", label: "Tuesday" },
      { value: "3", label: "Wednesday" },
      { value: "4", label: "Thursday" },
      { value: "5", label: "Friday" },
      { value: "6", label: "Saturday" }
    ] },
    { name: "scheduled_start_time", label: "Start Time", type: "time" },
    { name: "duration_minutes", label: "Duration (minutes)", type: "number", required: true, value: 60, min: 1 },
    { name: "total_price", label: "Total Price ($)", type: "number", required: true, value: "0.00", min: 0, step: 0.01 },
    { name: "is_active", label: "Active", type: "checkbox", value: true }
  ];
  return c.html(FormView({
    title: "Create Recurring Booking",
    fields,
    submitUrl: "/admin/recurring",
    cancelUrl: "/admin/recurring"
  }));
});
app.post("/recurring", async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const id = generateId();
  const totalPriceCents = Math.round(parseFloat(body.total_price || "0") * 100);
  await db.prepare(`
    INSERT INTO recurring_bookings (id, customer_id, service_id, territory_id, frequency, day_of_week, 
                                    scheduled_start_time, duration_minutes, base_price_cents, total_price_cents, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.customer_id,
    body.service_id,
    body.territory_id,
    body.frequency,
    body.day_of_week ? parseInt(body.day_of_week, 10) : null,
    body.scheduled_start_time || null,
    parseInt(body.duration_minutes, 10) || 60,
    totalPriceCents,
    totalPriceCents,
    body.is_active === "on" ? 1 : 0
  ).run();
  return c.redirect("/admin/recurring");
});
app.get("/recurring/:id", async (c) => {
  const id = c.req.param("id");
  if (id === "new") return c.redirect("/admin/recurring/new");
  return c.redirect(`/admin/recurring/${id}/edit`);
});
app.get("/recurring/:id/edit", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const [recurring, customers, services, territories] = await Promise.all([
    db.prepare("SELECT * FROM recurring_bookings WHERE id = ?").bind(id).first(),
    db.prepare("SELECT id, first_name, last_name FROM customers ORDER BY last_name, first_name").all(),
    db.prepare("SELECT id, name FROM services WHERE is_active = 1 ORDER BY name").all(),
    db.prepare("SELECT id, name FROM territories ORDER BY name").all()
  ]);
  if (!recurring) {
    return c.redirect("/admin/recurring");
  }
  const fields = [
    { name: "customer_id", label: "Customer", type: "select", required: true, value: recurring.customer_id, options: (customers.results || []).map((c2) => ({ value: c2.id, label: `${c2.first_name} ${c2.last_name}` })) },
    { name: "service_id", label: "Service", type: "select", required: true, value: recurring.service_id, options: (services.results || []).map((s) => ({ value: s.id, label: s.name })) },
    { name: "territory_id", label: "Territory", type: "select", required: true, value: recurring.territory_id, options: (territories.results || []).map((t) => ({ value: t.id, label: t.name })) },
    { name: "frequency", label: "Frequency", type: "select", required: true, value: recurring.frequency, options: [
      { value: "weekly", label: "Weekly" },
      { value: "biweekly", label: "Biweekly" },
      { value: "monthly", label: "Monthly" }
    ] },
    { name: "day_of_week", label: "Day of Week", type: "select", value: recurring.day_of_week?.toString(), options: [
      { value: "0", label: "Sunday" },
      { value: "1", label: "Monday" },
      { value: "2", label: "Tuesday" },
      { value: "3", label: "Wednesday" },
      { value: "4", label: "Thursday" },
      { value: "5", label: "Friday" },
      { value: "6", label: "Saturday" }
    ] },
    { name: "scheduled_start_time", label: "Start Time", type: "time", value: recurring.scheduled_start_time },
    { name: "duration_minutes", label: "Duration (minutes)", type: "number", required: true, value: recurring.duration_minutes, min: 1 },
    { name: "total_price", label: "Total Price ($)", type: "number", required: true, value: (recurring.total_price_cents / 100).toFixed(2), min: 0, step: 0.01 },
    { name: "is_active", label: "Active", type: "checkbox", value: Boolean(recurring.is_active) }
  ];
  return c.html(FormView({
    title: "Edit Recurring Booking",
    fields,
    submitUrl: `/admin/recurring/${id}`,
    cancelUrl: "/admin/recurring",
    isEdit: true,
    deleteUrl: `/admin/recurring/${id}/delete`
  }));
});
app.post("/recurring/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const totalPriceCents = Math.round(parseFloat(body.total_price || "0") * 100);
  await db.prepare(`
    UPDATE recurring_bookings 
    SET customer_id = ?, service_id = ?, territory_id = ?, frequency = ?, day_of_week = ?,
        scheduled_start_time = ?, duration_minutes = ?, total_price_cents = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.customer_id,
    body.service_id,
    body.territory_id,
    body.frequency,
    body.day_of_week ? parseInt(body.day_of_week, 10) : null,
    body.scheduled_start_time || null,
    parseInt(body.duration_minutes, 10) || 60,
    totalPriceCents,
    body.is_active === "on" ? 1 : 0,
    id
  ).run();
  return c.redirect("/admin/recurring");
});
app.post("/recurring/:id/delete", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  await db.prepare("DELETE FROM recurring_bookings WHERE id = ?").bind(id).run();
  const isHtmx = Boolean(c.req.header("HX-Request"));
  if (isHtmx) {
    const from = c.req.header("HX-Current-URL") || "";
    if (from.includes(`/recurring/${id}`)) {
      c.header("HX-Redirect", "/admin/recurring");
    }
    return c.body("", 200);
  }
  return c.redirect("/admin/recurring");
});
app.get("/branding", async (c) => {
  const db = c.env.DB;
  const row = await db.prepare("SELECT value FROM settings WHERE key = 'widget_branding'").first();
  let branding = { primaryColor: "#2563eb" };
  if (row) {
    try {
      branding = { ...branding, ...JSON.parse(row.value) };
    } catch {
    }
  }
  return c.html(BrandingPage(branding));
});
app.post("/branding", async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const branding = { primaryColor: body.primaryColor || "#2563eb" };
  await db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('widget_branding', ?, datetime('now'))").bind(JSON.stringify(branding)).run();
  return c.body("", 200);
});
app.get("/settings", async (c) => {
  const db = c.env.DB;
  const settings = await db.prepare("SELECT key, value FROM settings ORDER BY key").all();
  return c.html(TableView({
    title: "Settings",
    columns: ["Key", "Value"],
    rows: (settings.results || []).map((s) => ({
      id: s.key,
      key: s.key,
      value: s.value
    })),
    createUrl: "/admin/settings/new"
  }));
});
app.get("/settings/new", (c) => {
  const fields = [
    { name: "key", label: "Key", required: true },
    { name: "value", label: "Value", type: "textarea", required: true }
  ];
  return c.html(FormView({
    title: "Create Setting",
    fields,
    submitUrl: "/admin/settings",
    cancelUrl: "/admin/settings"
  }));
});
app.post("/settings", async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  await db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
  `).bind(body.key, body.value).run();
  return c.redirect("/admin/settings");
});
app.get("/settings/:key/edit", async (c) => {
  const db = c.env.DB;
  const key = c.req.param("key");
  const setting = await db.prepare("SELECT * FROM settings WHERE key = ?").bind(key).first();
  if (!setting) {
    return c.redirect("/admin/settings");
  }
  const fields = [
    { name: "key", label: "Key", required: true, value: setting.key },
    { name: "value", label: "Value", type: "textarea", required: true, value: setting.value }
  ];
  return c.html(FormView({
    title: "Edit Setting",
    fields,
    submitUrl: `/admin/settings/${key}`,
    cancelUrl: "/admin/settings",
    isEdit: true,
    deleteUrl: `/admin/settings/${key}/delete`
  }));
});
app.post("/settings/:key", async (c) => {
  const db = c.env.DB;
  const oldKey = c.req.param("key");
  const body = await c.req.parseBody();
  if (oldKey !== body.key) {
    await db.prepare("DELETE FROM settings WHERE key = ?").bind(oldKey).run();
  }
  await db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
  `).bind(body.key, body.value).run();
  return c.redirect("/admin/settings");
});
app.post("/settings/:key/delete", async (c) => {
  const db = c.env.DB;
  const key = c.req.param("key");
  await db.prepare("DELETE FROM settings WHERE key = ?").bind(key).run();
  const isHtmx = Boolean(c.req.header("HX-Request"));
  if (isHtmx) {
    const from = c.req.header("HX-Current-URL") || "";
    if (from.includes(`/settings/${key}`)) {
      c.header("HX-Redirect", "/admin/settings");
    }
    return c.body("", 200);
  }
  return c.redirect("/admin/settings");
});
app.get("/push-settings", (c) => {
  return c.html(PushSettingsPage());
});
app.get("/manifest.webmanifest", (c) => {
  return c.text(JSON.stringify(PUSH_MANIFEST), 200, {
    "Content-Type": "application/manifest+json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
  });
});
app.get("/sw.js", (c) => {
  return c.text(PUSH_SERVICE_WORKER_SCRIPT, 200, {
    "Content-Type": "application/javascript; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
  });
});
app.get("/push/vapid-public-key", async (c) => {
  const db = c.env.DB;
  const email = getAuthenticatedStaffEmail(c);
  if (!email) {
    return c.json({ error: "Cloudflare Access user required" }, 403);
  }
  try {
    const publicKey = await getPushVapidPublicKey(db);
    return c.json({ publicKey });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : String(error),
        step: "getPushVapidPublicKey"
      },
      500
    );
  }
});
app.get("/push/status", async (c) => {
  const db = c.env.DB;
  const email = getAuthenticatedStaffEmail(c);
  if (!email) {
    return c.json({ error: "Cloudflare Access user required" }, 403);
  }
  const endpoint = (c.req.query("endpoint") || "").trim();
  try {
    const status = await getPushSubscriptionStatus(db, email, endpoint || void 0);
    return c.json(status);
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : String(error),
        step: "getPushSubscriptionStatus"
      },
      500
    );
  }
});
app.post("/push/subscribe", async (c) => {
  const db = c.env.DB;
  const email = getAuthenticatedStaffEmail(c);
  if (!email) {
    return c.json({ error: "Cloudflare Access user required" }, 403);
  }
  const body = await c.req.json();
  const subscriptionRaw = body.subscription;
  const preferencesRaw = body.preferences;
  if (!subscriptionRaw || typeof subscriptionRaw !== "object" || Array.isArray(subscriptionRaw)) {
    return c.json({ error: "Invalid subscription payload" }, 400);
  }
  const subscriptionRecord = subscriptionRaw;
  const endpoint = typeof subscriptionRecord.endpoint === "string" ? subscriptionRecord.endpoint.trim() : "";
  const keysRaw = subscriptionRecord.keys;
  const keysRecord = keysRaw && typeof keysRaw === "object" && !Array.isArray(keysRaw) ? keysRaw : null;
  const p256dh = typeof keysRecord?.p256dh === "string" ? keysRecord.p256dh.trim() : "";
  const auth = typeof keysRecord?.auth === "string" ? keysRecord.auth.trim() : "";
  if (!endpoint || !p256dh || !auth) {
    return c.json({ error: "Subscription endpoint and keys are required" }, 400);
  }
  const preferencesRecord = preferencesRaw && typeof preferencesRaw === "object" && !Array.isArray(preferencesRaw) ? preferencesRaw : {};
  try {
    await upsertPushSubscription(
      db,
      email,
      {
        endpoint,
        keys: { p256dh, auth }
      },
      {
        notifyNewJobs: preferencesRecord.notifyNewJobs !== false,
        notifyNewMessages: preferencesRecord.notifyNewMessages !== false
      }
    );
    return c.json({ success: true });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : String(error),
        step: "upsertPushSubscription"
      },
      500
    );
  }
});
app.post("/push/unsubscribe", async (c) => {
  const db = c.env.DB;
  const email = getAuthenticatedStaffEmail(c);
  if (!email) {
    return c.json({ error: "Cloudflare Access user required" }, 403);
  }
  const body = await c.req.json();
  const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
  if (!endpoint) return c.json({ success: true });
  try {
    await deactivatePushSubscription(db, email, endpoint);
    return c.json({ success: true });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : String(error),
        step: "deactivatePushSubscription"
      },
      500
    );
  }
});
app.post("/push/test", async (c) => {
  const db = c.env.DB;
  const email = getAuthenticatedStaffEmail(c);
  if (!email) {
    return c.json({ error: "Cloudflare Access user required" }, 403);
  }
  const body = await c.req.json();
  const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
  if (!endpoint) {
    return c.json({ error: "Endpoint is required" }, 400);
  }
  try {
    const result = await enqueueTestPushNotificationAndPing(db, email, endpoint);
    return c.json({ success: true, ...result });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      400
    );
  }
});
app.get("/push/pending", async (c) => {
  const db = c.env.DB;
  const email = getAuthenticatedStaffEmail(c);
  if (!email) {
    return c.json({ notifications: [] }, 403);
  }
  const endpoint = (c.req.query("endpoint") || "").trim();
  if (!endpoint) {
    return c.json({ notifications: [] });
  }
  const limitRaw = Number.parseInt(c.req.query("limit") || "6", 10);
  let notifications = [];
  try {
    notifications = await pullPendingPushNotifications(
      db,
      email,
      endpoint,
      Number.isFinite(limitRaw) ? limitRaw : 6
    );
  } catch (error) {
    return c.json(
      {
        notifications: [],
        error: error instanceof Error ? error.message : String(error),
        step: "pullPendingPushNotifications"
      },
      500
    );
  }
  c.header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  c.header("Pragma", "no-cache");
  c.header("Expires", "0");
  return c.json({ notifications });
});
app.get("/sms-settings", async (c) => {
  const db = c.env.DB;
  const config = await getTwilioConfig(db);
  const templates = await db.prepare("SELECT * FROM sms_templates ORDER BY event_type").all();
  const smsStats = await db.prepare(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as sent,
       SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as received,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
       SUM(segments) as total_segments
     FROM sms_log`
  ).first();
  return c.html(SmsSettingsPage({
    config: config ? { accountSid: config.accountSid, authToken: config.authToken, phoneNumber: config.phoneNumber, enabled: config.enabled } : null,
    templates: templates.results || [],
    stats: smsStats || null
  }));
});
app.post("/sms-settings", async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const config = {
    accountSid: (body.account_sid || "").trim(),
    authToken: (body.auth_token || "").trim(),
    phoneNumber: normalizePhoneE164(body.phone_number) || (body.phone_number || "").trim(),
    enabled: body.enabled === "1"
  };
  await db.prepare(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('twilio_config', ?, datetime('now'))"
  ).bind(JSON.stringify(config)).run();
  return c.redirect("/admin/sms-settings");
});
app.post("/sms-templates/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const bodyTemplate = (body.body_template || "").trim();
  const isActive = body.is_active === "1" ? 1 : 0;
  if (bodyTemplate) {
    await db.prepare(
      "UPDATE sms_templates SET body_template = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(bodyTemplate, isActive, id).run();
  } else {
    await db.prepare(
      "UPDATE sms_templates SET is_active = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(isActive, id).run();
  }
  return c.body("", 200);
});
app.get("/coupons", async (c) => {
  const db = c.env.DB;
  const coupons = await db.prepare(`
    SELECT id, code, discount_type, discount_value, max_uses, current_uses, is_active
    FROM coupons ORDER BY created_at DESC
  `).all();
  return c.html(TableView({
    title: "Coupons",
    columns: ["Code", "Type", "Value", "Uses", "Active"],
    rows: (coupons.results || []).map((cp) => ({
      code: cp.code,
      type: cp.discount_type,
      value: cp.discount_type === "percentage" ? `${cp.discount_value}%` : `$${(cp.discount_value / 100).toFixed(2)}`,
      uses: `${cp.current_uses} / ${cp.max_uses ?? "\u221E"}`,
      active: cp.is_active ? "active" : "inactive"
    })),
    createUrl: "/admin/coupons/new",
    detailUrlPrefix: "/admin/coupons",
    deleteUrlPrefix: "/admin/coupons"
  }));
});
app.get("/coupons/new", (c) => {
  const fields = [
    { name: "code", label: "Code", required: true, placeholder: "SUMMER20" },
    { name: "discount_type", label: "Discount Type", type: "select", required: true, options: [
      { value: "percentage", label: "Percentage" },
      { value: "fixed", label: "Fixed Amount" }
    ] },
    { name: "discount_value", label: "Discount Value (% or $)", type: "number", required: true, min: 0, step: 0.01 },
    { name: "max_uses", label: "Max Uses (leave empty for unlimited)", type: "number", min: 1 },
    { name: "valid_from", label: "Valid From", type: "date" },
    { name: "valid_until", label: "Valid Until", type: "date" },
    { name: "is_active", label: "Active", type: "checkbox", value: true }
  ];
  return c.html(FormView({
    title: "Create Coupon",
    fields,
    submitUrl: "/admin/coupons",
    cancelUrl: "/admin/coupons"
  }));
});
app.post("/coupons", async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const id = generateId();
  await db.prepare(`
    INSERT INTO coupons (id, code, discount_type, discount_value, max_uses, valid_from, valid_until, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.code.toUpperCase(),
    body.discount_type,
    parseInt(body.discount_value, 10) || 0,
    body.max_uses ? parseInt(body.max_uses, 10) : null,
    body.valid_from || null,
    body.valid_until || null,
    body.is_active === "on" ? 1 : 0
  ).run();
  return c.redirect("/admin/coupons");
});
app.get("/coupons/:id", async (c) => {
  const id = c.req.param("id");
  if (id === "new") return c.redirect("/admin/coupons/new");
  return c.redirect(`/admin/coupons/${id}/edit`);
});
app.get("/coupons/:id/edit", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const coupon = await db.prepare("SELECT * FROM coupons WHERE id = ?").bind(id).first();
  if (!coupon) {
    return c.redirect("/admin/coupons");
  }
  const fields = [
    { name: "code", label: "Code", required: true, value: coupon.code },
    { name: "discount_type", label: "Discount Type", type: "select", required: true, value: coupon.discount_type, options: [
      { value: "percentage", label: "Percentage" },
      { value: "fixed", label: "Fixed Amount" }
    ] },
    { name: "discount_value", label: "Discount Value", type: "number", required: true, min: 0, value: coupon.discount_value },
    { name: "max_uses", label: "Max Uses", type: "number", min: 1, value: coupon.max_uses },
    { name: "valid_from", label: "Valid From", type: "date", value: coupon.valid_from },
    { name: "valid_until", label: "Valid Until", type: "date", value: coupon.valid_until },
    { name: "is_active", label: "Active", type: "checkbox", value: Boolean(coupon.is_active) }
  ];
  return c.html(FormView({
    title: "Edit Coupon",
    fields,
    submitUrl: `/admin/coupons/${id}`,
    cancelUrl: "/admin/coupons",
    isEdit: true,
    deleteUrl: `/admin/coupons/${id}/delete`
  }));
});
app.post("/coupons/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  await db.prepare(`
    UPDATE coupons 
    SET code = ?, discount_type = ?, discount_value = ?, max_uses = ?, valid_from = ?, valid_until = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.code.toUpperCase(),
    body.discount_type,
    parseInt(body.discount_value, 10) || 0,
    body.max_uses ? parseInt(body.max_uses, 10) : null,
    body.valid_from || null,
    body.valid_until || null,
    body.is_active === "on" ? 1 : 0,
    id
  ).run();
  return c.redirect("/admin/coupons");
});
app.post("/coupons/:id/delete", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  await db.prepare("DELETE FROM coupons WHERE id = ?").bind(id).run();
  const isHtmx = Boolean(c.req.header("HX-Request"));
  if (isHtmx) {
    const from = c.req.header("HX-Current-URL") || "";
    if (from.includes(`/coupons/${id}`)) {
      c.header("HX-Redirect", "/admin/coupons");
    }
    return c.body("", 200);
  }
  return c.redirect("/admin/coupons");
});
app.get("/webhooks", async (c) => {
  const db = c.env.DB;
  const webhooks = await db.prepare(`
    SELECT id, url, event_type, is_active FROM webhooks ORDER BY created_at DESC
  `).all();
  return c.html(TableView({
    title: "Webhooks",
    columns: ["URL", "Event Type", "Active"],
    rows: (webhooks.results || []).map((w) => ({
      url: w.url,
      eventType: w.event_type,
      active: w.is_active ? "active" : "inactive"
    })),
    createUrl: "/admin/webhooks/new",
    detailUrlPrefix: "/admin/webhooks",
    deleteUrlPrefix: "/admin/webhooks"
  }));
});
app.get("/webhooks/new", (c) => {
  const fields = [
    { name: "url", label: "Webhook URL", required: true, placeholder: "https://example.com/webhook" },
    { name: "event_type", label: "Event Type", type: "select", required: true, options: [
      { value: "job.created", label: "Job Created" },
      { value: "job.updated", label: "Job Updated" },
      { value: "job.assigned", label: "Job Assigned" },
      { value: "job.completed", label: "Job Completed" },
      { value: "job.cancelled", label: "Job Cancelled" },
      { value: "customer.created", label: "Customer Created" },
      { value: "invoice.created", label: "Invoice Created" },
      { value: "invoice.paid", label: "Invoice Paid" }
    ] },
    { name: "is_active", label: "Active", type: "checkbox", value: true }
  ];
  return c.html(FormView({
    title: "Create Webhook",
    fields,
    submitUrl: "/admin/webhooks",
    cancelUrl: "/admin/webhooks"
  }));
});
app.post("/webhooks", async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const id = generateId();
  const secret = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO webhooks (id, url, event_type, secret, is_active)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    id,
    body.url,
    body.event_type,
    secret,
    body.is_active === "on" ? 1 : 0
  ).run();
  return c.redirect("/admin/webhooks");
});
app.get("/webhooks/:id", async (c) => {
  const id = c.req.param("id");
  if (id === "new") return c.redirect("/admin/webhooks/new");
  return c.redirect(`/admin/webhooks/${id}/edit`);
});
app.get("/webhooks/:id/edit", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const webhook = await db.prepare("SELECT * FROM webhooks WHERE id = ?").bind(id).first();
  if (!webhook) {
    return c.redirect("/admin/webhooks");
  }
  const fields = [
    { name: "url", label: "Webhook URL", required: true, value: webhook.url },
    { name: "event_type", label: "Event Type", type: "select", required: true, value: webhook.event_type, options: [
      { value: "job.created", label: "Job Created" },
      { value: "job.updated", label: "Job Updated" },
      { value: "job.assigned", label: "Job Assigned" },
      { value: "job.completed", label: "Job Completed" },
      { value: "job.cancelled", label: "Job Cancelled" },
      { value: "customer.created", label: "Customer Created" },
      { value: "invoice.created", label: "Invoice Created" },
      { value: "invoice.paid", label: "Invoice Paid" }
    ] },
    { name: "is_active", label: "Active", type: "checkbox", value: Boolean(webhook.is_active) }
  ];
  return c.html(FormView({
    title: "Edit Webhook",
    fields,
    submitUrl: `/admin/webhooks/${id}`,
    cancelUrl: "/admin/webhooks",
    isEdit: true,
    deleteUrl: `/admin/webhooks/${id}/delete`
  }));
});
app.post("/webhooks/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  await db.prepare(`
    UPDATE webhooks 
    SET url = ?, event_type = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.url,
    body.event_type,
    body.is_active === "on" ? 1 : 0,
    id
  ).run();
  return c.redirect("/admin/webhooks");
});
app.post("/webhooks/:id/delete", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  await db.prepare("DELETE FROM webhooks WHERE id = ?").bind(id).run();
  const isHtmx = Boolean(c.req.header("HX-Request"));
  if (isHtmx) {
    const from = c.req.header("HX-Current-URL") || "";
    if (from.includes(`/webhooks/${id}`)) {
      c.header("HX-Redirect", "/admin/webhooks");
    }
    return c.body("", 200);
  }
  return c.redirect("/admin/webhooks");
});
app.get("/inbox", async (c) => {
  const db = c.env.DB;
  const { source } = c.req.query();
  let sql = "SELECT id, source, status, first_name, last_name, email, subject, is_read, created_at FROM messages";
  const params = [];
  if (source) {
    sql += " WHERE source = ?";
    params.push(source);
  }
  sql += " ORDER BY created_at DESC LIMIT 100";
  const stmt = db.prepare(sql);
  const messages = await (params.length > 0 ? stmt.bind(...params) : stmt).all();
  const unreadCount = await db.prepare("SELECT COUNT(*) as count FROM messages WHERE is_read = 0").first();
  const rows = (messages.results || []).map((m) => {
    const name = [m.first_name, m.last_name].filter(Boolean).join(" ") || m.email || "-";
    const dateStr = formatTorontoDate(`${m.created_at}Z`, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) || m.created_at;
    return {
      from: m.is_read ? name : `\u25CF ${name}`,
      subject: m.subject || "-",
      source: m.source,
      date: dateStr,
      status: m.status
    };
  });
  const title3 = `Inbox${(unreadCount?.count || 0) > 0 ? ` (${unreadCount?.count})` : ""}`;
  return c.html(TableView({
    title: title3,
    columns: ["From", "Subject", "Source", "Date", "Status"],
    rows,
    rawIds: (messages.results || []).map((m) => m.id),
    detailUrlPrefix: "/admin/inbox",
    deleteUrlPrefix: "/admin/inbox"
  }));
});
async function getInboxSmsContext(db, messageId) {
  const msg = await db.prepare("SELECT phone FROM messages WHERE id = ?").bind(messageId).first();
  const phoneE164 = normalizePhoneE164(msg?.phone);
  let smsHistory = [];
  if (phoneE164) {
    const rows = await db.prepare(
      `SELECT id, direction, body, status, created_at, segments
       FROM sms_log
       WHERE phone_to = ? OR phone_from = ?
       ORDER BY created_at ASC
       LIMIT 100`
    ).bind(phoneE164, phoneE164).all();
    smsHistory = rows.results || [];
  }
  return { phoneE164, smsHistory };
}
__name(getInboxSmsContext, "getInboxSmsContext");
async function getInboxJobContext(db, messageId) {
  const msg = await db.prepare("SELECT phone, metadata FROM messages WHERE id = ?").bind(messageId).first();
  if (!msg) return { jobOptions: [], selectedJobId: null };
  const meta3 = parseJsonObject(msg.metadata);
  const metaCustomerId = typeof meta3?.customer_id === "string" && meta3.customer_id ? meta3.customer_id : null;
  const metaJobId = typeof meta3?.job_id === "string" && meta3.job_id ? meta3.job_id : null;
  const phoneE164 = normalizePhoneE164(msg.phone);
  let customerId = metaCustomerId;
  if (!customerId && phoneE164) {
    const customer = await db.prepare(
      `SELECT id
       FROM customers
       WHERE phone_e164 = ? OR phone = ?
       ORDER BY updated_at DESC
       LIMIT 1`
    ).bind(phoneE164, msg.phone || phoneE164).first();
    customerId = customer?.id || null;
  }
  if (!customerId) {
    return { jobOptions: [], selectedJobId: null };
  }
  const jobs = await db.prepare(
    `SELECT j.id, j.scheduled_date, j.status,
            COALESCE(s.name, j.custom_service_name, 'Service') as service_name
     FROM jobs j
     LEFT JOIN services s ON s.id = j.service_id
     WHERE j.customer_id = ?
     ORDER BY j.updated_at DESC
     LIMIT 20`
  ).bind(customerId).all();
  const jobOptions = (jobs.results || []).map((job) => ({
    id: job.id,
    label: `${job.scheduled_date} \u2022 ${job.service_name} \u2022 ${job.status.replace("_", " ")}`
  }));
  const selectedJobId = jobOptions.some((job) => job.id === metaJobId) ? metaJobId : jobOptions[0]?.id || null;
  return { jobOptions, selectedJobId };
}
__name(getInboxJobContext, "getInboxJobContext");
app.get("/inbox/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const msg = await db.prepare("SELECT * FROM messages WHERE id = ?").bind(id).first();
  if (!msg) return c.redirect("/admin/inbox");
  if (!msg.is_read) {
    await db.prepare("UPDATE messages SET is_read = 1, read_at = datetime('now'), status = CASE WHEN status = 'new' THEN 'read' ELSE status END, updated_at = datetime('now') WHERE id = ?").bind(id).run();
    msg.is_read = 1;
    if (msg.status === "new") msg.status = "read";
  }
  const twilioEnabled = await isTwilioEnabled(db);
  const { phoneE164, smsHistory } = await getInboxSmsContext(db, id);
  const { jobOptions, selectedJobId } = await getInboxJobContext(db, id);
  const completedTaskSmsIds = await getCompletedSmsTaskIds(db, selectedJobId);
  return c.html(MessageDetailPage({
    message: msg,
    smsHistory,
    twilioEnabled,
    phoneE164,
    jobOptions,
    selectedJobId,
    completedTaskSmsIds
  }));
});
app.get("/inbox/:id/sms-thread", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const { smsHistory } = await getInboxSmsContext(db, id);
  const { jobOptions, selectedJobId } = await getInboxJobContext(db, id);
  const completedTaskSmsIds = await getCompletedSmsTaskIds(db, selectedJobId);
  c.header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  c.header("Pragma", "no-cache");
  c.header("Expires", "0");
  return c.html(SmsHistoryList({
    smsHistory,
    messageId: id,
    canCreateTask: jobOptions.length > 0,
    jobOptions,
    selectedJobId,
    completedTaskSmsIds
  }));
});
app.get("/inbox/:id/sms-thread-panel", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const twilioEnabled = await isTwilioEnabled(db);
  const { phoneE164, smsHistory } = await getInboxSmsContext(db, id);
  const { jobOptions, selectedJobId } = await getInboxJobContext(db, id);
  const completedTaskSmsIds = await getCompletedSmsTaskIds(db, selectedJobId);
  c.header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  c.header("Pragma", "no-cache");
  c.header("Expires", "0");
  return c.html(SmsThreadPanel({
    messageId: id,
    smsHistory,
    twilioEnabled,
    phoneE164,
    jobOptions,
    selectedJobId,
    completedTaskSmsIds
  }));
});
app.post("/inbox/:id/sms-reply", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const smsBody = (body.sms_body || "").trim();
  const { phoneE164 } = await getInboxSmsContext(db, id);
  let sendResult = null;
  if (!smsBody) {
    sendResult = { success: false, error: "Message body is required" };
  } else if (!phoneE164) {
    sendResult = { success: false, error: "No valid phone number for this contact" };
  } else {
    const result = await sendDirectSms({ db, to: phoneE164, body: smsBody, messageId: id });
    sendResult = { success: result.success, error: result.error };
    if (result.success) {
      await db.prepare(
        "UPDATE messages SET status = 'replied', replied_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
      ).bind(id).run();
    }
  }
  const twilioEnabled = await isTwilioEnabled(db);
  const { smsHistory } = await getInboxSmsContext(db, id);
  const { jobOptions, selectedJobId } = await getInboxJobContext(db, id);
  const completedTaskSmsIds = await getCompletedSmsTaskIds(db, selectedJobId);
  c.header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  c.header("Pragma", "no-cache");
  c.header("Expires", "0");
  return c.html(SmsThreadPanel({ messageId: id, smsHistory, twilioEnabled, phoneE164, jobOptions, selectedJobId, completedTaskSmsIds, sendResult }));
});
app.post("/inbox/:id/sms-task", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const smsLogId = (body.sms_log_id || "").trim();
  const jobId = (body.job_id || "").trim();
  const taskTitle = toTaskTitle(body.task_title || "");
  const twilioEnabled = await isTwilioEnabled(db);
  const { phoneE164, smsHistory } = await getInboxSmsContext(db, id);
  const { jobOptions, selectedJobId } = await getInboxJobContext(db, id);
  let taskResult = { success: false, error: "Unable to add task" };
  if (!smsLogId) {
    taskResult = { success: false, error: "No SMS message selected" };
  } else if (!taskTitle) {
    taskResult = { success: false, error: "Task title is required" };
  } else if (!jobId) {
    taskResult = { success: false, error: "Select a job first" };
  } else {
    const sms = await db.prepare(
      `SELECT id, direction, body, created_at, phone_to, phone_from
       FROM sms_log
       WHERE id = ?
       LIMIT 1`
    ).bind(smsLogId).first();
    const job = await db.prepare("SELECT notes_json FROM jobs WHERE id = ?").bind(jobId).first();
    if (!sms) {
      taskResult = { success: false, error: "SMS message not found" };
    } else if (!job) {
      taskResult = { success: false, error: "Job not found" };
    } else if (phoneE164 && sms.phone_to !== phoneE164 && sms.phone_from !== phoneE164) {
      taskResult = { success: false, error: "Selected SMS is not part of this thread" };
    } else if (sms.direction !== "inbound") {
      taskResult = { success: false, error: "Only customer messages can become tasks" };
    } else {
      const smsBody = (sms.body || "").trim();
      if (!smsBody) {
        taskResult = { success: false, error: "Selected message has no text" };
      } else {
        const notes = job.notes_json ? JSON.parse(job.notes_json) : [];
        notes.push({
          text: taskTitle,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          completed: 0,
          source: {
            type: "sms",
            sms_log_id: sms.id,
            message_id: id,
            excerpt: smsBody,
            received_at: sms.created_at
          }
        });
        await db.prepare(
          'UPDATE jobs SET notes_json = ?, updated_at = datetime("now") WHERE id = ?'
        ).bind(JSON.stringify(notes), jobId).run();
        const messageMetaRow = await db.prepare("SELECT metadata FROM messages WHERE id = ?").bind(id).first();
        const messageMeta = parseJsonObject(messageMetaRow?.metadata) || {};
        messageMeta.job_id = jobId;
        await db.prepare('UPDATE messages SET metadata = ?, updated_at = datetime("now") WHERE id = ?').bind(JSON.stringify(messageMeta), id).run();
        taskResult = { success: true, message: "Task added to job" };
      }
    }
  }
  c.header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  c.header("Pragma", "no-cache");
  c.header("Expires", "0");
  const activeJobId = jobOptions.some((job) => job.id === jobId) ? jobId : selectedJobId;
  const completedTaskSmsIds = await getCompletedSmsTaskIds(db, activeJobId);
  return c.html(
    SmsThreadPanel({
      messageId: id,
      smsHistory,
      twilioEnabled,
      phoneE164,
      jobOptions,
      selectedJobId: jobId || selectedJobId,
      completedTaskSmsIds,
      taskResult
    })
  );
});
app.post("/inbox/:id/archive", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  await db.prepare("UPDATE messages SET status = 'archived', updated_at = datetime('now') WHERE id = ?").bind(id).run();
  const isHtmx = Boolean(c.req.header("HX-Request"));
  if (isHtmx) {
    c.header("HX-Redirect", "/admin/inbox");
    return c.body("", 200);
  }
  return c.redirect("/admin/inbox");
});
app.post("/inbox/:id/delete", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  await db.prepare("DELETE FROM messages WHERE id = ?").bind(id).run();
  const isHtmx = Boolean(c.req.header("HX-Request"));
  if (isHtmx) {
    const from = c.req.header("HX-Current-URL") || "";
    if (from.includes(`/inbox/${id}`)) {
      c.header("HX-Redirect", "/admin/inbox");
    }
    return c.body("", 200);
  }
  return c.redirect("/admin/inbox");
});
var admin_default = app;

// src/scheduling/pricing.ts
var toMinutes = /* @__PURE__ */ __name((value) => {
  const [hRaw, mRaw] = value.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw ?? 0);
  return h * 60 + m;
}, "toMinutes");
var parseDaysOfWeek = /* @__PURE__ */ __name((days) => {
  if (!days) return [];
  try {
    const parsed = JSON.parse(days);
    if (Array.isArray(parsed)) {
      return parsed.map((v) => Number(v)).filter((v) => Number.isFinite(v));
    }
  } catch {
  }
  return days.split(",").map((v) => Number(v.trim())).filter((v) => Number.isFinite(v));
}, "parseDaysOfWeek");
var matchTimeWindow = /* @__PURE__ */ __name((start, ruleStart, ruleEnd) => {
  if (!ruleStart || !ruleEnd) return false;
  const minute = toMinutes(start);
  const startMin = toMinutes(ruleStart);
  const endMin = toMinutes(ruleEnd);
  if (endMin >= startMin) {
    return minute >= startMin && minute <= endMin;
  }
  return minute >= startMin || minute <= endMin;
}, "matchTimeWindow");
var isRuleApplicable = /* @__PURE__ */ __name((rule, territoryId, date, startTime, bookingDateTime) => {
  if (rule.territory_id && rule.territory_id !== territoryId) {
    return false;
  }
  if (rule.rule_type === "territory") {
    return true;
  }
  if (rule.rule_type === "time_of_day") {
    return matchTimeWindow(startTime, rule.start_time, rule.end_time);
  }
  if (rule.rule_type === "day_of_week") {
    const day = (/* @__PURE__ */ new Date(`${date}T00:00:00`)).getDay();
    const allowed = parseDaysOfWeek(rule.days_of_week);
    return allowed.length === 0 ? false : allowed.includes(day);
  }
  if (rule.rule_type === "lead_time") {
    const diffHours = (bookingDateTime.getTime() - Date.now()) / (1e3 * 60 * 60);
    if (rule.min_hours_ahead !== null && diffHours < rule.min_hours_ahead) {
      return false;
    }
    if (rule.max_hours_ahead !== null && diffHours > rule.max_hours_ahead) {
      return false;
    }
    return true;
  }
  return false;
}, "isRuleApplicable");
async function calculateAdjustedPrice(db, serviceId, basePrice, territoryId, date, startTime) {
  const rulesResult = await db.prepare(
    `SELECT id, service_id, territory_id, rule_type, adjustment_type, adjustment_value, direction,
            days_of_week, start_time, end_time, min_hours_ahead, max_hours_ahead
     FROM price_adjustment_rules
     WHERE is_active = 1
       AND (service_id = ? OR service_id IS NULL)
       AND (territory_id = ? OR territory_id IS NULL)
     ORDER BY created_at ASC`
  ).bind(serviceId, territoryId).all();
  const bookingDateTime = /* @__PURE__ */ new Date(`${date}T${startTime}:00`);
  let runningTotal = basePrice;
  const applied = [];
  for (const rule of rulesResult.results || []) {
    if (!isRuleApplicable(rule, territoryId, date, startTime, bookingDateTime)) {
      continue;
    }
    const directionMultiplier = rule.direction === "decrease" ? -1 : 1;
    let delta = 0;
    if (rule.adjustment_type === "flat") {
      delta = Math.round(Number(rule.adjustment_value || 0)) * directionMultiplier;
    } else if (rule.adjustment_type === "percentage") {
      const pct = Number(rule.adjustment_value || 0) / 100;
      delta = Math.round(runningTotal * pct) * directionMultiplier;
    } else {
      continue;
    }
    runningTotal += delta;
    applied.push({
      id: rule.id,
      rule_type: rule.rule_type,
      adjustment_type: rule.adjustment_type,
      adjustment_value: rule.adjustment_value,
      direction: rule.direction,
      delta,
      total_after_rule: runningTotal
    });
  }
  return {
    total_price: Math.max(0, Math.round(runningTotal)),
    rule_adjustments: applied
  };
}
__name(calculateAdjustedPrice, "calculateAdjustedPrice");

// src/routes/bookings.ts
init_twilio();
var app2 = new Hono2();
var asStringArray = /* @__PURE__ */ __name((value) => {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === "string" && value) return [value];
  return [];
}, "asStringArray");
app2.post("/create", async (c) => {
  try {
    const db = c.env.DB;
    const body = await c.req.json();
    let territoryId = typeof body.territory_id === "string" ? body.territory_id : "";
    if (!territoryId) {
      const territories = await db.prepare(
        "SELECT id, service_area_type, service_area_data FROM territories WHERE is_active = 1"
      ).all();
      for (const territory of territories.results || []) {
        const result = checkServiceArea(
          territory.service_area_type,
          territory.service_area_data,
          {
            postalCode: typeof body.postal_code === "string" ? body.postal_code : void 0,
            lat: typeof body.lat === "number" ? body.lat : void 0,
            lng: typeof body.lng === "number" ? body.lng : void 0
          }
        );
        if (result.within) {
          territoryId = territory.id;
          break;
        }
      }
    }
    if (!territoryId) {
      return c.json({ error: "Address is outside of service area" }, 400);
    }
    const serviceId = String(body.service_id || "");
    const service = await db.prepare(
      `SELECT s.id, s.name, s.base_price_cents, s.base_duration_minutes
       FROM services s
       JOIN territory_services ts ON ts.service_id = s.id
       WHERE s.id = ? AND ts.territory_id = ? AND s.is_active = 1`
    ).bind(serviceId, territoryId).first();
    if (!service) {
      return c.json({ error: "Service unavailable for selected territory" }, 400);
    }
    let customer = null;
    if (typeof body.email === "string" && body.email.trim()) {
      customer = await db.prepare("SELECT id FROM customers WHERE email = ?").bind(body.email.trim()).first();
    }
    if (!customer && typeof body.phone === "string" && body.phone.trim()) {
      customer = await db.prepare("SELECT id FROM customers WHERE phone = ? ORDER BY created_at DESC LIMIT 1").bind(body.phone.trim()).first();
    }
    const phoneE164 = normalizePhoneE164(typeof body.phone === "string" ? body.phone : null);
    const smsConsent = body.sms_consent === true || body.sms_consent === 1 ? 1 : 0;
    let customerId = customer?.id;
    if (!customerId) {
      customerId = crypto.randomUUID();
      await db.prepare(
        `INSERT INTO customers (id, first_name, last_name, email, phone, phone_e164, sms_consent, sms_consent_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).bind(
        customerId,
        body.first_name,
        body.last_name,
        body.email || null,
        body.phone || null,
        phoneE164,
        smsConsent,
        smsConsent ? (/* @__PURE__ */ new Date()).toISOString() : null
      ).run();
    } else if (smsConsent || phoneE164) {
      await db.prepare(
        `UPDATE customers SET
         phone_e164 = COALESCE(?, phone_e164),
         sms_consent = CASE WHEN ? = 1 THEN 1 ELSE sms_consent END,
         sms_consent_at = CASE WHEN ? = 1 AND sms_consent = 0 THEN datetime('now') ELSE sms_consent_at END,
         updated_at = datetime('now')
         WHERE id = ?`
      ).bind(phoneE164, smsConsent, smsConsent, customerId).run();
    }
    const addressId = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO customer_addresses
       (id, customer_id, line_1, line_2, city, state, postal_code, lat, lng, is_default, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      addressId,
      customerId,
      body.address_line1,
      body.address_line2 || null,
      body.city,
      body.province,
      body.postal_code,
      body.lat ?? null,
      body.lng ?? null,
      1
    ).run();
    const selectedModifierIds = asStringArray(body.selected_modifiers);
    let totalPrice = Number(service.base_price_cents || 0);
    let totalDuration = Number(body.duration_minutes || service.base_duration_minutes || 60);
    const jobLineItems = [buildServiceBaseLine(service.name, Number(service.base_price_cents || 0))];
    if (selectedModifierIds.length > 0) {
      const modifierRows = await db.prepare(
        `SELECT id, name, price_adjustment_cents, duration_adjustment_minutes
         FROM service_modifiers
         WHERE service_id = ?
            AND id IN (${selectedModifierIds.map(() => "?").join(", ")})`
      ).bind(serviceId, ...selectedModifierIds).all();
      for (const modifier of modifierRows.results || []) {
        const delta = Number(modifier.price_adjustment_cents || 0);
        totalPrice += delta;
        totalDuration += Number(modifier.duration_adjustment_minutes || 0);
        jobLineItems.push(normalizeLine(modifier.name || "Modifier", 1, delta, "modifier", jobLineItems[0].id, 0));
      }
    }
    const pricing = await calculateAdjustedPrice(
      db,
      serviceId,
      totalPrice,
      territoryId,
      String(body.scheduled_date || ""),
      String(body.scheduled_start_time || "")
    );
    totalPrice = pricing.total_price;
    for (const adjustment of pricing.rule_adjustments) {
      const delta = Number(adjustment.delta || 0);
      if (!delta) continue;
      const kind = String(adjustment.rule_type || "rule").replace(/_/g, " ");
      const direction = delta > 0 ? "+" : "-";
      jobLineItems.push(normalizeLine(`Rule (${kind}) ${direction}`, 1, delta, "rule", jobLineItems[0].id, 0));
    }
    const jobId = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO jobs
        (id, customer_id, service_id, territory_id, customer_address_id, scheduled_date, scheduled_start_time,
         duration_minutes, base_price_cents, total_price_cents, line_items_json, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', datetime('now'), datetime('now'))`
    ).bind(
      jobId,
      customerId,
      serviceId,
      territoryId,
      addressId,
      body.scheduled_date,
      body.scheduled_start_time,
      totalDuration,
      service.base_price_cents,
      totalPrice,
      JSON.stringify(jobLineItems)
    ).run();
    const job = await db.prepare("SELECT * FROM jobs WHERE id = ?").bind(jobId).first();
    const templateVars = {
      first_name: typeof body.first_name === "string" ? body.first_name : "",
      last_name: typeof body.last_name === "string" ? body.last_name : "",
      service_name: service.name,
      date: typeof body.scheduled_date === "string" ? body.scheduled_date : "",
      time: typeof body.scheduled_start_time === "string" ? body.scheduled_start_time : "",
      total: (totalPrice / 100).toFixed(2)
    };
    const baseUrl = new URL(c.req.url).origin;
    c.executionCtx.waitUntil(
      sendJobSms({
        db,
        jobId,
        customerId,
        eventType: "booking.confirmed",
        vars: templateVars,
        statusCallbackUrl: `${baseUrl}/webhooks/twilio/status`
      })
    );
    return c.json(job, 201);
  } catch (error) {
    console.error("booking create error", error);
    return c.json({ error: "Failed to create booking" }, 500);
  }
});
var bookings_default = app2;

// src/routes/categories.ts
var app3 = new Hono2();
app3.get("/", async (c) => {
  try {
    const categories = await c.env.DB.prepare("SELECT * FROM service_categories ORDER BY sort_order, name").all();
    return c.json({ categories: categories.results || [] });
  } catch (error) {
    console.error("categories list error", error);
    return c.json({ error: "Failed to list categories" }, 500);
  }
});
app3.get("/:id", async (c) => {
  try {
    const category = await c.env.DB.prepare("SELECT * FROM service_categories WHERE id = ?").bind(c.req.param("id")).first();
    if (!category) return c.json({ error: "Not found" }, 404);
    return c.json(category);
  } catch (error) {
    console.error("categories get error", error);
    return c.json({ error: "Failed to get category" }, 500);
  }
});
app3.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO service_categories (id, name, sort_order, created_at)
       VALUES (?, ?, ?, datetime('now'))`
    ).bind(id, body.name, body.sort_order || 0).run();
    const created = await c.env.DB.prepare("SELECT * FROM service_categories WHERE id = ?").bind(id).first();
    return c.json(created, 201);
  } catch (error) {
    console.error("categories create error", error);
    return c.json({ error: "Failed to create category" }, 500);
  }
});
app3.patch("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const fields = [];
    const values = [];
    if (body.name !== void 0) {
      fields.push("name = ?");
      values.push(body.name);
    }
    if (body.sort_order !== void 0) {
      fields.push("sort_order = ?");
      values.push(body.sort_order);
    }
    if (fields.length === 0) return c.json({ error: "No fields to update" }, 400);
    values.push(id);
    await c.env.DB.prepare(`UPDATE service_categories SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    const updated = await c.env.DB.prepare("SELECT * FROM service_categories WHERE id = ?").bind(id).first();
    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json(updated);
  } catch (error) {
    console.error("categories patch error", error);
    return c.json({ error: "Failed to update category" }, 500);
  }
});
app3.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await c.env.DB.prepare("UPDATE services SET category_id = NULL WHERE category_id = ?").bind(id).run();
    await c.env.DB.prepare("DELETE FROM service_categories WHERE id = ?").bind(id).run();
    return c.json({ deleted: true });
  } catch (error) {
    console.error("categories delete error", error);
    return c.json({ error: "Failed to delete category" }, 500);
  }
});
var categories_default = app3;

// src/routes/coupons.ts
var app4 = new Hono2();
app4.get("/validate", async (c) => {
  try {
    const db = c.env.DB;
    const code = (c.req.query("code") || "").toUpperCase();
    const subtotalCents = Number(c.req.query("subtotal_cents") || 0);
    if (!code) return c.json({ valid: false, message: "Coupon code is required" }, 400);
    const coupon = await db.prepare(
      `SELECT * FROM coupons
       WHERE code = ?
         AND is_active = 1
         AND (valid_from IS NULL OR valid_from <= date('now'))
         AND (valid_until IS NULL OR valid_until >= date('now'))`
    ).bind(code).first();
    if (!coupon) return c.json({ valid: false, message: "Invalid or expired coupon" }, 404);
    if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
      return c.json({ valid: false, message: "Coupon usage limit reached" }, 400);
    }
    const discount = coupon.discount_type === "percentage" ? Math.round(subtotalCents * (coupon.discount_value / 100)) : Math.round(coupon.discount_value);
    return c.json({
      valid: true,
      coupon,
      discount_cents: Math.max(0, discount),
      total_cents: Math.max(0, subtotalCents - discount)
    });
  } catch (error) {
    console.error("coupon validate error", error);
    return c.json({ error: "Failed to validate coupon" }, 500);
  }
});
app4.get("/", async (c) => {
  try {
    const coupons = await c.env.DB.prepare("SELECT * FROM coupons ORDER BY created_at DESC").all();
    return c.json({ coupons: coupons.results || [] });
  } catch (error) {
    console.error("coupons list error", error);
    return c.json({ error: "Failed to list coupons" }, 500);
  }
});
app4.get("/:id", async (c) => {
  try {
    const coupon = await c.env.DB.prepare("SELECT * FROM coupons WHERE id = ?").bind(c.req.param("id")).first();
    if (!coupon) return c.json({ error: "Not found" }, 404);
    return c.json(coupon);
  } catch (error) {
    console.error("coupons get error", error);
    return c.json({ error: "Failed to get coupon" }, 500);
  }
});
app4.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO coupons
       (id, code, discount_type, discount_value, max_uses, current_uses, valid_from, valid_until, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      id,
      String(body.code || "").toUpperCase(),
      body.discount_type || "percentage",
      body.discount_value || 0,
      body.max_uses ?? null,
      body.valid_from || null,
      body.valid_until || null,
      body.is_active === false ? 0 : 1
    ).run();
    const created = await c.env.DB.prepare("SELECT * FROM coupons WHERE id = ?").bind(id).first();
    return c.json(created, 201);
  } catch (error) {
    console.error("coupons create error", error);
    return c.json({ error: "Failed to create coupon" }, 500);
  }
});
app4.patch("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const fields = [];
    const values = [];
    for (const key of ["code", "discount_type", "discount_value", "max_uses", "current_uses", "valid_from", "valid_until", "is_active"]) {
      if (body[key] !== void 0) {
        fields.push(`${key} = ?`);
        if (key === "code") values.push(String(body[key]).toUpperCase());
        else if (key === "is_active") values.push(body[key] ? 1 : 0);
        else values.push(body[key]);
      }
    }
    if (fields.length === 0) return c.json({ error: "No fields to update" }, 400);
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await c.env.DB.prepare(`UPDATE coupons SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    const updated = await c.env.DB.prepare("SELECT * FROM coupons WHERE id = ?").bind(id).first();
    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json(updated);
  } catch (error) {
    console.error("coupons patch error", error);
    return c.json({ error: "Failed to update coupon" }, 500);
  }
});
app4.delete("/:id", async (c) => {
  try {
    await c.env.DB.prepare("DELETE FROM coupons WHERE id = ?").bind(c.req.param("id")).run();
    return c.json({ deleted: true });
  } catch (error) {
    console.error("coupons delete error", error);
    return c.json({ error: "Failed to delete coupon" }, 500);
  }
});
var coupons_default = app4;

// src/routes/customers.ts
init_twilio();
var app5 = new Hono2();
var asArray = /* @__PURE__ */ __name((value) => {
  if (Array.isArray(value)) return value.filter((v) => Boolean(v && typeof v === "object"));
  return [];
}, "asArray");
var normalizeEmail2 = /* @__PURE__ */ __name((value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}, "normalizeEmail");
app5.get("/", async (c) => {
  try {
    const db = c.env.DB;
    const customers = await db.prepare("SELECT * FROM customers ORDER BY created_at DESC").all();
    const ids = (customers.results || []).map((cst) => cst.id);
    if (ids.length === 0) return c.json({ customers: [] });
    const addressRows = await db.prepare(
      `SELECT * FROM customer_addresses
       WHERE customer_id IN (${ids.map(() => "?").join(", ")})
       ORDER BY is_default DESC, created_at DESC`
    ).bind(...ids).all();
    const addressesByCustomer = /* @__PURE__ */ new Map();
    for (const row of addressRows.results || []) {
      const key = row.customer_id;
      const list = addressesByCustomer.get(key) || [];
      list.push(row);
      addressesByCustomer.set(key, list);
    }
    return c.json({
      customers: (customers.results || []).map((row) => ({
        ...row,
        customer_addresses: addressesByCustomer.get(row.id) || []
      }))
    });
  } catch (error) {
    console.error("customers list error", error);
    return c.json({ error: "Failed to list customers" }, 500);
  }
});
app5.get("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param("id");
    const customer = await db.prepare("SELECT * FROM customers WHERE id = ?").bind(id).first();
    if (!customer) return c.json({ error: "Not found" }, 404);
    const addresses = await db.prepare("SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC").bind(id).all();
    return c.json({ ...customer, customer_addresses: addresses.results || [] });
  } catch (error) {
    console.error("customers get error", error);
    return c.json({ error: "Failed to get customer" }, 500);
  }
});
app5.post("/", async (c) => {
  try {
    const db = c.env.DB;
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const email = normalizeEmail2(body.email);
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const phoneE164 = normalizePhoneE164(phone || null);
    const duplicate = await db.prepare(
      `SELECT id FROM customers
       WHERE (? IS NOT NULL AND LOWER(email) = ?)
          OR (? IS NOT NULL AND phone_e164 = ?)
       LIMIT 1`
    ).bind(email, email, phoneE164, phoneE164).first();
    if (duplicate) return c.json({ error: "Customer already exists" }, 409);
    await db.prepare(
      `INSERT INTO customers (id, first_name, last_name, email, phone, phone_e164, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(id, body.first_name, body.last_name, email, phone || null, phoneE164).run();
    for (const address of asArray(body.customer_addresses)) {
      await db.prepare(
        `INSERT INTO customer_addresses
         (id, customer_id, line_1, line_2, city, state, postal_code, lat, lng, is_default, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(
        crypto.randomUUID(),
        id,
        address.line_1,
        address.line_2 || null,
        address.city,
        address.state,
        address.postal_code,
        address.lat ?? null,
        address.lng ?? null,
        address.is_default ? 1 : 0
      ).run();
    }
    const created = await db.prepare("SELECT * FROM customers WHERE id = ?").bind(id).first();
    return c.json(created, 201);
  } catch (error) {
    console.error("customers create error", error);
    return c.json({ error: "Failed to create customer" }, 500);
  }
});
app5.patch("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param("id");
    const body = await c.req.json();
    const fields = [];
    const values = [];
    const normalizedEmail = body.email !== void 0 ? normalizeEmail2(body.email) : void 0;
    const normalizedPhone = body.phone !== void 0 && typeof body.phone === "string" ? body.phone.trim() : void 0;
    const normalizedPhoneE164 = normalizedPhone !== void 0 ? normalizePhoneE164(normalizedPhone || null) : void 0;
    const duplicate = await db.prepare(
      `SELECT id FROM customers
       WHERE id != ?
         AND ((? IS NOT NULL AND LOWER(email) = ?) OR (? IS NOT NULL AND phone_e164 = ?))
       LIMIT 1`
    ).bind(
      id,
      normalizedEmail !== void 0 ? normalizedEmail : null,
      normalizedEmail !== void 0 ? normalizedEmail : null,
      normalizedPhoneE164 !== void 0 ? normalizedPhoneE164 : null,
      normalizedPhoneE164 !== void 0 ? normalizedPhoneE164 : null
    ).first();
    if (duplicate) return c.json({ error: "Customer already exists" }, 409);
    for (const key of ["first_name", "last_name", "email", "phone"]) {
      if (body[key] !== void 0) {
        fields.push(`${key} = ?`);
        if (key === "email") values.push(normalizedEmail ?? null);
        else if (key === "phone") values.push(normalizedPhone ?? null);
        else values.push(body[key]);
      }
    }
    if (normalizedPhoneE164 !== void 0) {
      fields.push("phone_e164 = ?");
      values.push(normalizedPhoneE164);
    }
    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      values.push(id);
      await db.prepare(`UPDATE customers SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    }
    if (body.customer_addresses !== void 0) {
      await db.prepare("DELETE FROM customer_addresses WHERE customer_id = ?").bind(id).run();
      for (const address of asArray(body.customer_addresses)) {
        await db.prepare(
          `INSERT INTO customer_addresses
           (id, customer_id, line_1, line_2, city, state, postal_code, lat, lng, is_default, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        ).bind(
          crypto.randomUUID(),
          id,
          address.line_1,
          address.line_2 || null,
          address.city,
          address.state,
          address.postal_code,
          address.lat ?? null,
          address.lng ?? null,
          address.is_default ? 1 : 0
        ).run();
      }
    }
    const updated = await db.prepare("SELECT * FROM customers WHERE id = ?").bind(id).first();
    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json(updated);
  } catch (error) {
    console.error("customers patch error", error);
    return c.json({ error: "Failed to update customer" }, 500);
  }
});
app5.delete("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param("id");
    await db.prepare("DELETE FROM customer_addresses WHERE customer_id = ?").bind(id).run();
    await db.prepare("DELETE FROM customers WHERE id = ?").bind(id).run();
    return c.json({ deleted: true });
  } catch (error) {
    console.error("customers delete error", error);
    return c.json({ error: "Failed to delete customer" }, 500);
  }
});
var customers_default = app5;

// src/routes/invoices.ts
var app6 = new Hono2();
var parseMoneyToCents2 = /* @__PURE__ */ __name((value) => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value !== "string") return 0;
  const cleaned = value.trim().replace(/[$,]/g, "");
  if (!cleaned) return 0;
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed * 100));
}, "parseMoneyToCents");
var parseCentsInt = /* @__PURE__ */ __name((value) => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value !== "string") return 0;
  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}, "parseCentsInt");
var parseLineItems = /* @__PURE__ */ __name((value) => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => Boolean(entry && typeof entry === "object" && !Array.isArray(entry))).map((entry) => {
    const description = typeof entry.description === "string" && entry.description.trim() ? entry.description.trim() : "Line item";
    const quantity = typeof entry.quantity === "number" ? entry.quantity : Number.parseFloat(String(entry.quantity || 0));
    const unitPriceCents = typeof entry.unit_price_cents === "number" ? Math.max(0, Math.round(entry.unit_price_cents)) : parseCentsInt(entry.unit_price_cents);
    const safeQty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    return {
      description,
      quantity: safeQty,
      unit_price_cents: unitPriceCents,
      total_cents: Math.round(safeQty * unitPriceCents)
    };
  });
}, "parseLineItems");
var nextInvoiceNumber2 = /* @__PURE__ */ __name(async (db) => {
  const row = await db.prepare("SELECT invoice_number FROM invoices WHERE invoice_number LIKE 'INV-%' ORDER BY invoice_number DESC LIMIT 1").first();
  const suffix = row?.invoice_number ? Number.parseInt(row.invoice_number.replace("INV-", ""), 10) : 0;
  const next = Number.isFinite(suffix) ? suffix + 1 : 1;
  return `INV-${String(next).padStart(6, "0")}`;
}, "nextInvoiceNumber");
app6.get("/", async (c) => {
  try {
    const invoices = await c.env.DB.prepare("SELECT * FROM invoices ORDER BY created_at DESC").all();
    return c.json({ invoices: invoices.results || [] });
  } catch (error) {
    console.error("invoices list error", error);
    return c.json({ error: "Failed to list invoices" }, 500);
  }
});
app6.get("/:id", async (c) => {
  try {
    const invoice = await c.env.DB.prepare("SELECT * FROM invoices WHERE id = ?").bind(c.req.param("id")).first();
    if (!invoice) return c.json({ error: "Not found" }, 404);
    return c.json(invoice);
  } catch (error) {
    console.error("invoices get error", error);
    return c.json({ error: "Failed to get invoice" }, 500);
  }
});
app6.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    if (typeof body.customer_id !== "string" || !body.customer_id.trim()) {
      return c.json({ error: "customer_id is required" }, 400);
    }
    const lineItems = parseLineItems(body.line_items);
    const subtotalCents = lineItems.reduce((sum, item) => sum + item.total_cents, 0);
    const taxCents = body.tax_cents !== void 0 ? parseCentsInt(body.tax_cents) : parseMoneyToCents2(body.tax_amount);
    const discountCents = body.discount_cents !== void 0 ? parseCentsInt(body.discount_cents) : parseMoneyToCents2(body.discount_amount);
    const bodyTotalCents = body.total_cents !== void 0 ? parseCentsInt(body.total_cents) : body.amount_cents !== void 0 ? parseCentsInt(body.amount_cents) : 0;
    const computedTotalCents = Math.max(0, subtotalCents + taxCents - discountCents);
    const totalCents = bodyTotalCents > 0 ? bodyTotalCents : computedTotalCents;
    const status = typeof body.status === "string" ? body.status : "pending";
    const paidAt = status === "paid" ? typeof body.paid_at === "string" && body.paid_at ? body.paid_at : (/* @__PURE__ */ new Date()).toISOString() : null;
    await c.env.DB.prepare(
      `INSERT INTO invoices (
         id, invoice_number, job_id, customer_id, currency,
         amount_cents, subtotal_cents, tax_cents, discount_cents, total_cents,
         line_items_json, due_date, status, paid_at, sent_at, notes,
         external_provider, external_reference, external_sync_status,
         created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      id,
      typeof body.invoice_number === "string" && body.invoice_number.trim() ? body.invoice_number.trim() : await nextInvoiceNumber2(c.env.DB),
      body.job_id || null,
      body.customer_id,
      typeof body.currency === "string" && body.currency.trim() ? body.currency.trim().toUpperCase() : "CAD",
      totalCents,
      subtotalCents,
      taxCents,
      discountCents,
      totalCents,
      JSON.stringify(lineItems),
      body.due_date || null,
      status,
      paidAt,
      status === "sent" ? (/* @__PURE__ */ new Date()).toISOString() : null,
      typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
      typeof body.external_provider === "string" && body.external_provider.trim() ? body.external_provider.trim() : null,
      typeof body.external_reference === "string" && body.external_reference.trim() ? body.external_reference.trim() : null,
      typeof body.external_sync_status === "string" && body.external_sync_status.trim() ? body.external_sync_status.trim() : "local_only"
    ).run();
    const created = await c.env.DB.prepare("SELECT * FROM invoices WHERE id = ?").bind(id).first();
    return c.json(created, 201);
  } catch (error) {
    console.error("invoices create error", error);
    return c.json({ error: "Failed to create invoice" }, 500);
  }
});
app6.patch("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await c.env.DB.prepare("SELECT * FROM invoices WHERE id = ?").bind(id).first();
    if (!existing) return c.json({ error: "Not found" }, 404);
    const mergedCustomerId = typeof body.customer_id === "string" ? body.customer_id : String(existing.customer_id || "");
    if (!mergedCustomerId) return c.json({ error: "customer_id is required" }, 400);
    let existingLineItemsRaw = [];
    try {
      existingLineItemsRaw = JSON.parse(String(existing.line_items_json || "[]"));
    } catch {
      existingLineItemsRaw = [];
    }
    const lineItems = body.line_items !== void 0 ? parseLineItems(body.line_items) : parseLineItems(existingLineItemsRaw);
    const subtotalCents = lineItems.reduce((sum, item) => sum + item.total_cents, 0);
    const taxCents = body.tax_cents !== void 0 ? parseCentsInt(body.tax_cents) : body.tax_amount !== void 0 ? parseMoneyToCents2(body.tax_amount) : parseCentsInt(existing.tax_cents);
    const discountCents = body.discount_cents !== void 0 ? parseCentsInt(body.discount_cents) : body.discount_amount !== void 0 ? parseMoneyToCents2(body.discount_amount) : parseCentsInt(existing.discount_cents);
    const bodyTotalCents = body.total_cents !== void 0 ? parseCentsInt(body.total_cents) : body.amount_cents !== void 0 ? parseCentsInt(body.amount_cents) : 0;
    const computedTotalCents = Math.max(0, subtotalCents + taxCents - discountCents);
    const totalCents = bodyTotalCents > 0 ? bodyTotalCents : computedTotalCents;
    const status = typeof body.status === "string" ? body.status : String(existing.status || "pending");
    const paidAt = status === "paid" ? typeof body.paid_at === "string" && body.paid_at ? body.paid_at : String(existing.paid_at || (/* @__PURE__ */ new Date()).toISOString()) : null;
    const sentAt = status === "sent" ? String(existing.sent_at || (/* @__PURE__ */ new Date()).toISOString()) : null;
    await c.env.DB.prepare(
      `UPDATE invoices
       SET invoice_number = ?,
           job_id = ?,
           customer_id = ?,
           currency = ?,
           amount_cents = ?,
           subtotal_cents = ?,
           tax_cents = ?,
           discount_cents = ?,
           total_cents = ?,
           line_items_json = ?,
           due_date = ?,
           status = ?,
           paid_at = ?,
           sent_at = ?,
           notes = ?,
           external_provider = ?,
           external_reference = ?,
           external_sync_status = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      typeof body.invoice_number === "string" && body.invoice_number.trim() ? body.invoice_number.trim() : String(existing.invoice_number || await nextInvoiceNumber2(c.env.DB)),
      body.job_id !== void 0 ? body.job_id || null : existing.job_id || null,
      mergedCustomerId,
      typeof body.currency === "string" && body.currency.trim() ? body.currency.trim().toUpperCase() : String(existing.currency || "CAD"),
      totalCents,
      subtotalCents,
      taxCents,
      discountCents,
      totalCents,
      JSON.stringify(lineItems),
      body.due_date !== void 0 ? body.due_date || null : existing.due_date || null,
      status,
      paidAt,
      sentAt,
      body.notes !== void 0 ? body.notes || null : existing.notes || null,
      body.external_provider !== void 0 ? body.external_provider || null : existing.external_provider || null,
      body.external_reference !== void 0 ? body.external_reference || null : existing.external_reference || null,
      body.external_sync_status !== void 0 ? body.external_sync_status || "local_only" : existing.external_sync_status || "local_only",
      id
    ).run();
    const updated = await c.env.DB.prepare("SELECT * FROM invoices WHERE id = ?").bind(id).first();
    return c.json(updated);
  } catch (error) {
    console.error("invoices patch error", error);
    return c.json({ error: "Failed to update invoice" }, 500);
  }
});
app6.delete("/:id", async (c) => {
  try {
    await c.env.DB.prepare("DELETE FROM invoices WHERE id = ?").bind(c.req.param("id")).run();
    return c.json({ deleted: true });
  } catch (error) {
    console.error("invoices delete error", error);
    return c.json({ error: "Failed to delete invoice" }, 500);
  }
});
var invoices_default = app6;

// src/routes/jobs.ts
var app7 = new Hono2();
var asStringArray2 = /* @__PURE__ */ __name((value) => {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === "string" && value) return [value];
  return [];
}, "asStringArray");
var maybeAutoCreateInvoice = /* @__PURE__ */ __name(async (db, jobId) => {
  const job = await db.prepare("SELECT customer_id, total_price_cents, line_items_json FROM jobs WHERE id = ?").bind(jobId).first();
  if (!job) return;
  const existing = await db.prepare("SELECT id FROM invoices WHERE job_id = ?").bind(jobId).first();
  if (existing) return;
  const lastInvoice = await db.prepare("SELECT invoice_number FROM invoices WHERE invoice_number LIKE 'INV-%' ORDER BY invoice_number DESC LIMIT 1").first();
  const lastNumber = lastInvoice?.invoice_number ? Number.parseInt(lastInvoice.invoice_number.replace("INV-", ""), 10) : 0;
  const invoiceNumber = `INV-${String((Number.isFinite(lastNumber) ? lastNumber : 0) + 1).padStart(6, "0")}`;
  const storedLines = parsePriceLines(job.line_items_json);
  const effectiveLines = storedLines.length > 0 ? storedLines : [buildServiceBaseLine("Service", job.total_price_cents)];
  const subtotal = subtotalFromLines(effectiveLines);
  const due = /* @__PURE__ */ new Date();
  due.setDate(due.getDate() + 14);
  await db.prepare(
    `INSERT INTO invoices (id, invoice_number, job_id, customer_id, currency, amount_cents, subtotal_cents, tax_cents, discount_cents, total_cents, line_items_json, due_date, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'CAD', ?, ?, 0, 0, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`
  ).bind(
    crypto.randomUUID(),
    invoiceNumber,
    jobId,
    job.customer_id,
    subtotal,
    subtotal,
    subtotal,
    JSON.stringify(effectiveLines),
    due.toISOString().split("T")[0]
  ).run();
}, "maybeAutoCreateInvoice");
app7.get("/", async (c) => {
  try {
    const db = c.env.DB;
    const status = c.req.query("status");
    const clauses = [];
    const params = [];
    if (status) {
      clauses.push("j.status = ?");
      params.push(status);
    }
    const jobs = await (params.length ? db.prepare(
      `SELECT j.*, c.first_name || ' ' || c.last_name as customer_name, s.name as service_name
           FROM jobs j
           JOIN customers c ON c.id = j.customer_id
           LEFT JOIN services s ON s.id = j.service_id
           ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
           ORDER BY j.scheduled_date DESC, j.scheduled_start_time DESC`
    ).bind(...params).all() : db.prepare(
      `SELECT j.*, c.first_name || ' ' || c.last_name as customer_name, s.name as service_name
           FROM jobs j
           JOIN customers c ON c.id = j.customer_id
           LEFT JOIN services s ON s.id = j.service_id
           ORDER BY j.scheduled_date DESC, j.scheduled_start_time DESC`
    ).all());
    const ids = (jobs.results || []).map((j) => j.id);
    if (ids.length === 0) return c.json({ jobs: [] });
    const [providers, notes] = await Promise.all([
      db.prepare(
        `SELECT jp.job_id, tm.id, tm.first_name, tm.last_name
         FROM job_providers jp
         JOIN team_members tm ON tm.id = jp.team_member_id
         WHERE jp.job_id IN (${ids.map(() => "?").join(", ")})`
      ).bind(...ids).all(),
      db.prepare(
        `SELECT id, job_id, content, created_at
         FROM job_notes
         WHERE job_id IN (${ids.map(() => "?").join(", ")})
         ORDER BY created_at DESC`
      ).bind(...ids).all()
    ]);
    const providersByJob = /* @__PURE__ */ new Map();
    for (const row of providers.results || []) {
      const key = row.job_id;
      const list = providersByJob.get(key) || [];
      list.push({ id: row.id, first_name: row.first_name, last_name: row.last_name });
      providersByJob.set(key, list);
    }
    const notesByJob = /* @__PURE__ */ new Map();
    for (const row of notes.results || []) {
      const key = row.job_id;
      const list = notesByJob.get(key) || [];
      list.push(row);
      notesByJob.set(key, list);
    }
    return c.json({
      jobs: (jobs.results || []).map((row) => ({
        ...row,
        job_providers: providersByJob.get(row.id) || [],
        job_notes: notesByJob.get(row.id) || []
      }))
    });
  } catch (error) {
    console.error("jobs list error", error);
    return c.json({ error: "Failed to list jobs" }, 500);
  }
});
app7.get("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param("id");
    const job = await db.prepare("SELECT * FROM jobs WHERE id = ?").bind(id).first();
    if (!job) return c.json({ error: "Not found" }, 404);
    const [providers, notes] = await Promise.all([
      db.prepare(
        `SELECT tm.id, tm.first_name, tm.last_name
         FROM job_providers jp
         JOIN team_members tm ON tm.id = jp.team_member_id
         WHERE jp.job_id = ?`
      ).bind(id).all(),
      db.prepare("SELECT id, content, created_at FROM job_notes WHERE job_id = ? ORDER BY created_at DESC").bind(id).all()
    ]);
    return c.json({ ...job, job_providers: providers.results || [], job_notes: notes.results || [] });
  } catch (error) {
    console.error("jobs get error", error);
    return c.json({ error: "Failed to get job" }, 500);
  }
});
app7.post("/", async (c) => {
  try {
    const db = c.env.DB;
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO jobs
       (id, customer_id, service_id, territory_id, customer_address_id, scheduled_date, scheduled_start_time,
        duration_minutes, base_price_cents, total_price_cents, line_items_json, custom_service_name, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      id,
      body.customer_id,
      body.service_id || null,
      body.territory_id || null,
      body.customer_address_id || null,
      body.scheduled_date,
      body.scheduled_start_time,
      body.duration_minutes || 60,
      body.base_price_cents || 0,
      body.total_price_cents || body.base_price_cents || 0,
      JSON.stringify([buildServiceBaseLine(String(body.custom_service_name || "Service"), Number(body.total_price_cents || body.base_price_cents || 0))]),
      body.custom_service_name || null,
      body.status || "created"
    ).run();
    for (const providerId of asStringArray2(body.provider_ids)) {
      await db.prepare("INSERT INTO job_providers (job_id, team_member_id) VALUES (?, ?)").bind(id, providerId).run();
    }
    for (const note of asStringArray2(body.notes)) {
      await db.prepare("INSERT INTO job_notes (id, job_id, content, created_at) VALUES (?, ?, ?, datetime('now'))").bind(crypto.randomUUID(), id, note).run();
    }
    if (body.status === "complete") {
      await maybeAutoCreateInvoice(db, id);
    }
    const created = await db.prepare("SELECT * FROM jobs WHERE id = ?").bind(id).first();
    return c.json(created, 201);
  } catch (error) {
    console.error("jobs create error", error);
    return c.json({ error: "Failed to create job" }, 500);
  }
});
app7.patch("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param("id");
    const body = await c.req.json();
    const fields = [];
    const values = [];
    const allowed = [
      "customer_id",
      "service_id",
      "territory_id",
      "customer_address_id",
      "scheduled_date",
      "scheduled_start_time",
      "duration_minutes",
      "base_price_cents",
      "total_price_cents",
      "custom_service_name",
      "status",
      "assigned_at",
      "started_at",
      "completed_at",
      "cancelled_at"
    ];
    for (const key of allowed) {
      if (body[key] !== void 0) {
        fields.push(`${key} = ?`);
        values.push(body[key]);
      }
    }
    if (body.total_price_cents !== void 0 || body.custom_service_name !== void 0) {
      const current = await db.prepare("SELECT total_price_cents, custom_service_name, line_items_json FROM jobs WHERE id = ?").bind(id).first();
      if (current) {
        const customLines = parsePriceLines(current.line_items_json).filter((line) => line.is_custom === 1);
        const total = body.total_price_cents !== void 0 ? Number(body.total_price_cents || 0) : Number(current.total_price_cents || 0);
        const serviceName = body.custom_service_name !== void 0 ? String(body.custom_service_name || "Service") : current.custom_service_name || "Service";
        fields.push("line_items_json = ?");
        values.push(JSON.stringify([buildServiceBaseLine(serviceName, total), ...customLines]));
      }
    }
    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      values.push(id);
      await db.prepare(`UPDATE jobs SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    }
    if (body.provider_ids !== void 0) {
      await db.prepare("DELETE FROM job_providers WHERE job_id = ?").bind(id).run();
      for (const providerId of asStringArray2(body.provider_ids)) {
        await db.prepare("INSERT INTO job_providers (job_id, team_member_id) VALUES (?, ?)").bind(id, providerId).run();
      }
    }
    if (body.note !== void 0 && typeof body.note === "string" && body.note.trim()) {
      await db.prepare("INSERT INTO job_notes (id, job_id, content, created_at) VALUES (?, ?, ?, datetime('now'))").bind(crypto.randomUUID(), id, body.note).run();
    }
    if (body.status === "complete") {
      await maybeAutoCreateInvoice(db, id);
    }
    const updated = await db.prepare("SELECT * FROM jobs WHERE id = ?").bind(id).first();
    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json(updated);
  } catch (error) {
    console.error("jobs patch error", error);
    return c.json({ error: "Failed to update job" }, 500);
  }
});
app7.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const db = c.env.DB;
    await db.prepare("DELETE FROM job_notes WHERE job_id = ?").bind(id).run();
    await db.prepare("DELETE FROM job_providers WHERE job_id = ?").bind(id).run();
    await db.prepare("DELETE FROM invoices WHERE job_id = ?").bind(id).run();
    await db.prepare("DELETE FROM jobs WHERE id = ?").bind(id).run();
    return c.json({ deleted: true });
  } catch (error) {
    console.error("jobs delete error", error);
    return c.json({ error: "Failed to delete job" }, 500);
  }
});
var jobs_default = app7;

// src/routes/modifiers.ts
var app8 = new Hono2();
app8.get("/", async (c) => {
  try {
    const serviceId = c.req.query("service_id");
    const sql = serviceId ? "SELECT * FROM service_modifiers WHERE service_id = ? ORDER BY sort_order, name" : "SELECT * FROM service_modifiers ORDER BY created_at DESC";
    const result = serviceId ? await c.env.DB.prepare(sql).bind(serviceId).all() : await c.env.DB.prepare(sql).all();
    return c.json({ modifiers: result.results || [] });
  } catch (error) {
    console.error("modifiers list error", error);
    return c.json({ error: "Failed to list modifiers" }, 500);
  }
});
app8.get("/:id", async (c) => {
  try {
    const modifier = await c.env.DB.prepare("SELECT * FROM service_modifiers WHERE id = ?").bind(c.req.param("id")).first();
    if (!modifier) return c.json({ error: "Not found" }, 404);
    return c.json(modifier);
  } catch (error) {
    console.error("modifiers get error", error);
    return c.json({ error: "Failed to get modifier" }, 500);
  }
});
app8.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO service_modifiers
       (id, service_id, name, description, price_adjustment_cents, duration_adjustment_minutes, is_required, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      id,
      body.service_id,
      body.name,
      body.description || null,
      body.price_adjustment_cents || 0,
      body.duration_adjustment_minutes || 0,
      body.is_required ? 1 : 0,
      body.sort_order || 0
    ).run();
    const created = await c.env.DB.prepare("SELECT * FROM service_modifiers WHERE id = ?").bind(id).first();
    return c.json(created, 201);
  } catch (error) {
    console.error("modifiers create error", error);
    return c.json({ error: "Failed to create modifier" }, 500);
  }
});
app8.patch("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const fields = [];
    const values = [];
    const allowed = [
      "service_id",
      "name",
      "description",
      "price_adjustment_cents",
      "duration_adjustment_minutes",
      "is_required",
      "sort_order"
    ];
    for (const key of allowed) {
      if (body[key] !== void 0) {
        fields.push(`${key} = ?`);
        values.push(key === "is_required" ? body[key] ? 1 : 0 : body[key]);
      }
    }
    if (fields.length === 0) return c.json({ error: "No fields to update" }, 400);
    values.push(id);
    await c.env.DB.prepare(`UPDATE service_modifiers SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    const updated = await c.env.DB.prepare("SELECT * FROM service_modifiers WHERE id = ?").bind(id).first();
    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json(updated);
  } catch (error) {
    console.error("modifiers patch error", error);
    return c.json({ error: "Failed to update modifier" }, 500);
  }
});
app8.delete("/:id", async (c) => {
  try {
    await c.env.DB.prepare("DELETE FROM service_modifiers WHERE id = ?").bind(c.req.param("id")).run();
    return c.json({ deleted: true });
  } catch (error) {
    console.error("modifiers delete error", error);
    return c.json({ error: "Failed to delete modifier" }, 500);
  }
});
var modifiers_default = app8;

// src/routes/recurring-bookings.ts
var app9 = new Hono2();
app9.get("/", async (c) => {
  try {
    const recurring = await c.env.DB.prepare("SELECT * FROM recurring_bookings ORDER BY created_at DESC").all();
    return c.json({ recurring_bookings: recurring.results || [] });
  } catch (error) {
    console.error("recurring list error", error);
    return c.json({ error: "Failed to list recurring bookings" }, 500);
  }
});
app9.get("/:id", async (c) => {
  try {
    const recurring = await c.env.DB.prepare("SELECT * FROM recurring_bookings WHERE id = ?").bind(c.req.param("id")).first();
    if (!recurring) return c.json({ error: "Not found" }, 404);
    return c.json(recurring);
  } catch (error) {
    console.error("recurring get error", error);
    return c.json({ error: "Failed to get recurring booking" }, 500);
  }
});
app9.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO recurring_bookings
       (id, customer_id, service_id, territory_id, frequency, day_of_week, scheduled_start_time,
        duration_minutes, base_price_cents, total_price_cents, is_active, next_scheduled_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      id,
      body.customer_id,
      body.service_id,
      body.territory_id,
      body.frequency,
      body.day_of_week ?? null,
      body.scheduled_start_time || null,
      body.duration_minutes || 60,
      body.base_price_cents || 0,
      body.total_price_cents || body.base_price_cents || 0,
      body.is_active === false ? 0 : 1,
      body.next_scheduled_date || null
    ).run();
    const created = await c.env.DB.prepare("SELECT * FROM recurring_bookings WHERE id = ?").bind(id).first();
    return c.json(created, 201);
  } catch (error) {
    console.error("recurring create error", error);
    return c.json({ error: "Failed to create recurring booking" }, 500);
  }
});
app9.patch("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const fields = [];
    const values = [];
    const allowed = [
      "customer_id",
      "service_id",
      "territory_id",
      "frequency",
      "day_of_week",
      "scheduled_start_time",
      "duration_minutes",
      "base_price_cents",
      "total_price_cents",
      "is_active",
      "next_scheduled_date"
    ];
    for (const key of allowed) {
      if (body[key] !== void 0) {
        fields.push(`${key} = ?`);
        values.push(key === "is_active" ? body[key] ? 1 : 0 : body[key]);
      }
    }
    if (fields.length === 0) return c.json({ error: "No fields to update" }, 400);
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await c.env.DB.prepare(`UPDATE recurring_bookings SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    const updated = await c.env.DB.prepare("SELECT * FROM recurring_bookings WHERE id = ?").bind(id).first();
    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json(updated);
  } catch (error) {
    console.error("recurring patch error", error);
    return c.json({ error: "Failed to update recurring booking" }, 500);
  }
});
app9.delete("/:id", async (c) => {
  try {
    await c.env.DB.prepare("DELETE FROM recurring_bookings WHERE id = ?").bind(c.req.param("id")).run();
    return c.json({ deleted: true });
  } catch (error) {
    console.error("recurring delete error", error);
    return c.json({ error: "Failed to delete recurring booking" }, 500);
  }
});
var recurring_bookings_default = app9;

// node_modules/hono/dist/utils/cookie.js
var validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;
var validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;
var parse = /* @__PURE__ */ __name((cookie, name) => {
  if (name && cookie.indexOf(name) === -1) {
    return {};
  }
  const pairs = cookie.trim().split(";");
  const parsedCookie = {};
  for (let pairStr of pairs) {
    pairStr = pairStr.trim();
    const valueStartPos = pairStr.indexOf("=");
    if (valueStartPos === -1) {
      continue;
    }
    const cookieName = pairStr.substring(0, valueStartPos).trim();
    if (name && name !== cookieName || !validCookieNameRegEx.test(cookieName)) {
      continue;
    }
    let cookieValue = pairStr.substring(valueStartPos + 1).trim();
    if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) {
      cookieValue = cookieValue.slice(1, -1);
    }
    if (validCookieValueRegEx.test(cookieValue)) {
      parsedCookie[cookieName] = cookieValue.indexOf("%") !== -1 ? tryDecode(cookieValue, decodeURIComponent_) : cookieValue;
      if (name) {
        break;
      }
    }
  }
  return parsedCookie;
}, "parse");

// node_modules/hono/dist/helper/cookie/index.js
var getCookie = /* @__PURE__ */ __name((c, key, prefix) => {
  const cookie = c.req.raw.headers.get("Cookie");
  if (typeof key === "string") {
    if (!cookie) {
      return void 0;
    }
    let finalKey = key;
    if (prefix === "secure") {
      finalKey = "__Secure-" + key;
    } else if (prefix === "host") {
      finalKey = "__Host-" + key;
    }
    const obj2 = parse(cookie, finalKey);
    return obj2[finalKey];
  }
  if (!cookie) {
    return {};
  }
  const obj = parse(cookie);
  return obj;
}, "getCookie");

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = /* @__PURE__ */ __name((arrayBuffer, contentType) => {
  const response = new Response(arrayBuffer, {
    headers: {
      "Content-Type": contentType
    }
  });
  return response.formData();
}, "bufferToFormData");

// node_modules/hono/dist/validator/validator.js
var jsonRegex = /^application\/([a-z-\.]+\+)?json(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/;
var multipartRegex = /^multipart\/form-data(;\s?boundary=[a-zA-Z0-9'"()+_,\-./:=?]+)?$/;
var urlencodedRegex = /^application\/x-www-form-urlencoded(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/;
var validator = /* @__PURE__ */ __name((target, validationFunc) => {
  return async (c, next) => {
    let value = {};
    const contentType = c.req.header("Content-Type");
    switch (target) {
      case "json":
        if (!contentType || !jsonRegex.test(contentType)) {
          break;
        }
        try {
          value = await c.req.json();
        } catch {
          const message = "Malformed JSON in request body";
          throw new HTTPException(400, { message });
        }
        break;
      case "form": {
        if (!contentType || !(multipartRegex.test(contentType) || urlencodedRegex.test(contentType))) {
          break;
        }
        let formData;
        if (c.req.bodyCache.formData) {
          formData = await c.req.bodyCache.formData;
        } else {
          try {
            const arrayBuffer = await c.req.arrayBuffer();
            formData = await bufferToFormData(arrayBuffer, contentType);
            c.req.bodyCache.formData = formData;
          } catch (e) {
            let message = "Malformed FormData request.";
            message += e instanceof Error ? ` ${e.message}` : ` ${String(e)}`;
            throw new HTTPException(400, { message });
          }
        }
        const form3 = {};
        formData.forEach((value2, key) => {
          if (key.endsWith("[]")) {
            ;
            (form3[key] ??= []).push(value2);
          } else if (Array.isArray(form3[key])) {
            ;
            form3[key].push(value2);
          } else if (key in form3) {
            form3[key] = [form3[key], value2];
          } else {
            form3[key] = value2;
          }
        });
        value = form3;
        break;
      }
      case "query":
        value = Object.fromEntries(
          Object.entries(c.req.queries()).map(([k, v]) => {
            return v.length === 1 ? [k, v[0]] : [k, v];
          })
        );
        break;
      case "param":
        value = c.req.param();
        break;
      case "header":
        value = c.req.header();
        break;
      case "cookie":
        value = getCookie(c);
        break;
    }
    const res = await validationFunc(value, c);
    if (res instanceof Response) {
      return res;
    }
    c.req.addValidatedData(target, res);
    return await next();
  };
}, "validator");

// node_modules/@hono/zod-validator/dist/index.js
function zValidatorFunction(target, schema, hook, options) {
  return validator(target, async (value, c) => {
    let validatorValue = value;
    if (target === "header" && "_def" in schema || target === "header" && "_zod" in schema) {
      const schemaKeys = Object.keys("in" in schema ? schema.in.shape : schema.shape);
      const caseInsensitiveKeymap = Object.fromEntries(schemaKeys.map((key) => [key.toLowerCase(), key]));
      validatorValue = Object.fromEntries(Object.entries(value).map(([key, value$1]) => [caseInsensitiveKeymap[key] || key, value$1]));
    }
    const result = options && options.validationFunction ? await options.validationFunction(schema, validatorValue) : await schema.safeParseAsync(validatorValue);
    if (hook) {
      const hookResult = await hook({
        data: validatorValue,
        ...result,
        target
      }, c);
      if (hookResult) {
        if (hookResult instanceof Response) return hookResult;
        if ("response" in hookResult) return hookResult.response;
      }
    }
    if (!result.success) return c.json(result, 400);
    return result.data;
  });
}
__name(zValidatorFunction, "zValidatorFunction");
var zValidator = zValidatorFunction;

// node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  __name(assertIs, "assertIs");
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  __name(assertNever, "assertNever");
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  __name(joinValues, "joinValues");
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = /* @__PURE__ */ __name((data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
}, "getParsedType");

// node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = /* @__PURE__ */ __name((obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
}, "quotelessJson");
var ZodError = class _ZodError extends Error {
  static {
    __name(this, "ZodError");
  }
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = /* @__PURE__ */ __name((error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    }, "processError");
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/zod/v3/locales/en.js
var errorMap = /* @__PURE__ */ __name((issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
}, "errorMap");
var en_default = errorMap;

// node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
__name(setErrorMap, "setErrorMap");
function getErrorMap() {
  return overrideErrorMap;
}
__name(getErrorMap, "getErrorMap");

// node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = /* @__PURE__ */ __name((params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
}, "makeIssue");
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
__name(addIssueToContext, "addIssueToContext");
var ParseStatus = class _ParseStatus {
  static {
    __name(this, "ParseStatus");
  }
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = /* @__PURE__ */ __name((value) => ({ status: "dirty", value }), "DIRTY");
var OK = /* @__PURE__ */ __name((value) => ({ status: "valid", value }), "OK");
var isAborted = /* @__PURE__ */ __name((x) => x.status === "aborted", "isAborted");
var isDirty = /* @__PURE__ */ __name((x) => x.status === "dirty", "isDirty");
var isValid = /* @__PURE__ */ __name((x) => x.status === "valid", "isValid");
var isAsync = /* @__PURE__ */ __name((x) => typeof Promise !== "undefined" && x instanceof Promise, "isAsync");

// node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  static {
    __name(this, "ParseInputLazyPath");
  }
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = /* @__PURE__ */ __name((ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
}, "handleResult");
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = /* @__PURE__ */ __name((iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  }, "customMap");
  return { errorMap: customMap, description };
}
__name(processCreateParams, "processCreateParams");
var ZodType = class {
  static {
    __name(this, "ZodType");
  }
  get description() {
    return this._def.description;
  }
  _getType(input3) {
    return getParsedType(input3.data);
  }
  _getOrReturnCtx(input3, ctx) {
    return ctx || {
      common: input3.parent.common,
      data: input3.data,
      parsedType: getParsedType(input3.data),
      schemaErrorMap: this._def.errorMap,
      path: input3.path,
      parent: input3.parent
    };
  }
  _processInputParams(input3) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input3.parent.common,
        data: input3.data,
        parsedType: getParsedType(input3.data),
        schemaErrorMap: this._def.errorMap,
        path: input3.path,
        parent: input3.parent
      }
    };
  }
  _parseSync(input3) {
    const result = this._parse(input3);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input3) {
    const result = this._parse(input3);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = /* @__PURE__ */ __name((val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    }, "getIssueProperties");
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = /* @__PURE__ */ __name(() => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      }), "setError");
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: /* @__PURE__ */ __name((data) => this["~validate"](data), "validate")
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
__name(timeRegexSource, "timeRegexSource");
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
__name(timeRegex, "timeRegex");
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
__name(datetimeRegex, "datetimeRegex");
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
__name(isValidIP, "isValidIP");
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
__name(isValidJWT, "isValidJWT");
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
__name(isValidCidr, "isValidCidr");
var ZodString = class _ZodString extends ZodType {
  static {
    __name(this, "ZodString");
  }
  _parse(input3) {
    if (this._def.coerce) {
      input3.data = String(input3.data);
    }
    const parsedType = this._getType(input3);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input3);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input3.data.length < check.value) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input3.data.length > check.value) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input3.data.length > check.value;
        const tooSmall = input3.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input3, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input3.data)) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input3.data)) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input3.data)) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input3.data)) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input3.data)) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input3.data)) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input3.data)) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input3.data);
        } catch {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input3.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input3.data = input3.data.trim();
      } else if (check.kind === "includes") {
        if (!input3.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input3.data = input3.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input3.data = input3.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input3.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input3.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input3.data)) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input3.data)) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input3.data)) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input3.data)) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input3.data, check.version)) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input3.data, check.alg)) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input3.data, check.version)) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input3.data)) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input3.data)) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input3.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
__name(floatSafeRemainder, "floatSafeRemainder");
var ZodNumber = class _ZodNumber extends ZodType {
  static {
    __name(this, "ZodNumber");
  }
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input3) {
    if (this._def.coerce) {
      input3.data = Number(input3.data);
    }
    const parsedType = this._getType(input3);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input3);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input3.data)) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input3.data < check.value : input3.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input3.data > check.value : input3.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input3.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input3.data)) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input3.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  static {
    __name(this, "ZodBigInt");
  }
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input3) {
    if (this._def.coerce) {
      try {
        input3.data = BigInt(input3.data);
      } catch {
        return this._getInvalidInput(input3);
      }
    }
    const parsedType = this._getType(input3);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input3);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input3.data < check.value : input3.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input3.data > check.value : input3.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input3.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input3.data };
  }
  _getInvalidInput(input3) {
    const ctx = this._getOrReturnCtx(input3);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  static {
    __name(this, "ZodBoolean");
  }
  _parse(input3) {
    if (this._def.coerce) {
      input3.data = Boolean(input3.data);
    }
    const parsedType = this._getType(input3);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input3);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input3.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  static {
    __name(this, "ZodDate");
  }
  _parse(input3) {
    if (this._def.coerce) {
      input3.data = new Date(input3.data);
    }
    const parsedType = this._getType(input3);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input3);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input3.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input3);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input3.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input3.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input3, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input3.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  static {
    __name(this, "ZodSymbol");
  }
  _parse(input3) {
    const parsedType = this._getType(input3);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input3);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input3.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  static {
    __name(this, "ZodUndefined");
  }
  _parse(input3) {
    const parsedType = this._getType(input3);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input3);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input3.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  static {
    __name(this, "ZodNull");
  }
  _parse(input3) {
    const parsedType = this._getType(input3);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input3);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input3.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  static {
    __name(this, "ZodAny");
  }
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input3) {
    return OK(input3.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  static {
    __name(this, "ZodUnknown");
  }
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input3) {
    return OK(input3.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  static {
    __name(this, "ZodNever");
  }
  _parse(input3) {
    const ctx = this._getOrReturnCtx(input3);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  static {
    __name(this, "ZodVoid");
  }
  _parse(input3) {
    const parsedType = this._getType(input3);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input3);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input3.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  static {
    __name(this, "ZodArray");
  }
  _parse(input3) {
    const { ctx, status } = this._processInputParams(input3);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: /* @__PURE__ */ __name(() => newShape, "shape")
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
__name(deepPartialify, "deepPartialify");
var ZodObject = class _ZodObject extends ZodType {
  static {
    __name(this, "ZodObject");
  }
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input3) {
    const parsedType = this._getType(input3);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input3);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input3);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: /* @__PURE__ */ __name((issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }, "errorMap")
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => ({
        ...this._def.shape(),
        ...augmentation
      }), "shape")
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: /* @__PURE__ */ __name(() => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }), "shape"),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => shape, "shape")
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => shape, "shape")
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => newShape, "shape")
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => newShape, "shape")
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: /* @__PURE__ */ __name(() => shape, "shape"),
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: /* @__PURE__ */ __name(() => shape, "shape"),
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  static {
    __name(this, "ZodUnion");
  }
  _parse(input3) {
    const { ctx } = this._processInputParams(input3);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    __name(handleResults, "handleResults");
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = /* @__PURE__ */ __name((type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
}, "getDiscriminator");
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  static {
    __name(this, "ZodDiscriminatedUnion");
  }
  _parse(input3) {
    const { ctx } = this._processInputParams(input3);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
__name(mergeValues, "mergeValues");
var ZodIntersection = class extends ZodType {
  static {
    __name(this, "ZodIntersection");
  }
  _parse(input3) {
    const { status, ctx } = this._processInputParams(input3);
    const handleParsed = /* @__PURE__ */ __name((parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    }, "handleParsed");
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  static {
    __name(this, "ZodTuple");
  }
  _parse(input3) {
    const { status, ctx } = this._processInputParams(input3);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  static {
    __name(this, "ZodRecord");
  }
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input3) {
    const { status, ctx } = this._processInputParams(input3);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  static {
    __name(this, "ZodMap");
  }
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input3) {
    const { status, ctx } = this._processInputParams(input3);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  static {
    __name(this, "ZodSet");
  }
  _parse(input3) {
    const { status, ctx } = this._processInputParams(input3);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    __name(finalizeSet, "finalizeSet");
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  static {
    __name(this, "ZodFunction");
  }
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input3) {
    const { ctx } = this._processInputParams(input3);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    __name(makeArgsIssue, "makeArgsIssue");
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    __name(makeReturnsIssue, "makeReturnsIssue");
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  static {
    __name(this, "ZodLazy");
  }
  get schema() {
    return this._def.getter();
  }
  _parse(input3) {
    const { ctx } = this._processInputParams(input3);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  static {
    __name(this, "ZodLiteral");
  }
  _parse(input3) {
    if (input3.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input3);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input3.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
__name(createZodEnum, "createZodEnum");
var ZodEnum = class _ZodEnum extends ZodType {
  static {
    __name(this, "ZodEnum");
  }
  _parse(input3) {
    if (typeof input3.data !== "string") {
      const ctx = this._getOrReturnCtx(input3);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input3.data)) {
      const ctx = this._getOrReturnCtx(input3);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input3.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  static {
    __name(this, "ZodNativeEnum");
  }
  _parse(input3) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input3);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input3.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input3.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  static {
    __name(this, "ZodPromise");
  }
  unwrap() {
    return this._def.type;
  }
  _parse(input3) {
    const { ctx } = this._processInputParams(input3);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  static {
    __name(this, "ZodEffects");
  }
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input3) {
    const { status, ctx } = this._processInputParams(input3);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: /* @__PURE__ */ __name((arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      }, "addIssue"),
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = /* @__PURE__ */ __name((acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      }, "executeRefinement");
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  static {
    __name(this, "ZodOptional");
  }
  _parse(input3) {
    const parsedType = this._getType(input3);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input3);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  static {
    __name(this, "ZodNullable");
  }
  _parse(input3) {
    const parsedType = this._getType(input3);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input3);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  static {
    __name(this, "ZodDefault");
  }
  _parse(input3) {
    const { ctx } = this._processInputParams(input3);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  static {
    __name(this, "ZodCatch");
  }
  _parse(input3) {
    const { ctx } = this._processInputParams(input3);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  static {
    __name(this, "ZodNaN");
  }
  _parse(input3) {
    const parsedType = this._getType(input3);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input3);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input3.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  static {
    __name(this, "ZodBranded");
  }
  _parse(input3) {
    const { ctx } = this._processInputParams(input3);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  static {
    __name(this, "ZodPipeline");
  }
  _parse(input3) {
    const { status, ctx } = this._processInputParams(input3);
    if (ctx.common.async) {
      const handleAsync = /* @__PURE__ */ __name(async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      }, "handleAsync");
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  static {
    __name(this, "ZodReadonly");
  }
  _parse(input3) {
    const result = this._def.innerType._parse(input3);
    const freeze = /* @__PURE__ */ __name((data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    }, "freeze");
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
__name(cleanParams, "cleanParams");
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
__name(custom, "custom");
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = /* @__PURE__ */ __name((cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params), "instanceOfType");
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = /* @__PURE__ */ __name(() => stringType().optional(), "ostring");
var onumber = /* @__PURE__ */ __name(() => numberType().optional(), "onumber");
var oboolean = /* @__PURE__ */ __name(() => booleanType().optional(), "oboolean");
var coerce = {
  string: /* @__PURE__ */ __name(((arg) => ZodString.create({ ...arg, coerce: true })), "string"),
  number: /* @__PURE__ */ __name(((arg) => ZodNumber.create({ ...arg, coerce: true })), "number"),
  boolean: /* @__PURE__ */ __name(((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })), "boolean"),
  bigint: /* @__PURE__ */ __name(((arg) => ZodBigInt.create({ ...arg, coerce: true })), "bigint"),
  date: /* @__PURE__ */ __name(((arg) => ZodDate.create({ ...arg, coerce: true })), "date")
};
var NEVER = INVALID;

// src/scheduling/timeslots.ts
var toMinutes2 = /* @__PURE__ */ __name((value) => {
  const [hRaw, mRaw] = value.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw ?? 0);
  return h * 60 + m;
}, "toMinutes");
var fromMinutes = /* @__PURE__ */ __name((total) => {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}, "fromMinutes");
var slotFitsWindow = /* @__PURE__ */ __name((slotStartMin, slotEndMin, startTime, endTime) => {
  const startMin = toMinutes2(startTime);
  const endMin = toMinutes2(endTime);
  return slotStartMin >= startMin && slotEndMin <= endMin;
}, "slotFitsWindow");
async function generateTimeslots(db, territoryId, date, durationMinutes, requiredProviderCount, requiredSkills) {
  const providerRows = await db.prepare(
    `SELECT tm.id
     FROM team_members tm
     JOIN team_member_territories tmt ON tmt.team_member_id = tm.id
     WHERE tmt.territory_id = ?
       AND tm.role = 'provider'
       AND tm.is_active = 1
       AND tm.can_be_auto_assigned = 1`
  ).bind(territoryId).all();
  let providers = providerRows.results || [];
  if (requiredSkills.length > 0 && providers.length > 0) {
    const placeholders = requiredSkills.map(() => "?").join(", ");
    const skillRows = await db.prepare(
      `SELECT tms.team_member_id, COUNT(DISTINCT tms.skill_id) AS matched_skill_count
       FROM team_member_skills tms
       WHERE tms.team_member_id IN (${providers.map(() => "?").join(", ")})
         AND tms.skill_id IN (${placeholders})
       GROUP BY tms.team_member_id`
    ).bind(...providers.map((p) => p.id), ...requiredSkills).all();
    const qualified = new Set(
      (skillRows.results || []).filter((row) => Number(row.matched_skill_count) >= requiredSkills.length).map((row) => row.team_member_id)
    );
    providers = providers.filter((provider) => qualified.has(provider.id));
  }
  if (providers.length === 0) {
    const emptySlots = [];
    for (let hour = 8; hour <= 17; hour++) {
      const start = `${String(hour).padStart(2, "0")}:00`;
      const end = fromMinutes(hour * 60 + durationMinutes);
      emptySlots.push({ date, start_time: start, end_time: end, available: false });
    }
    return emptySlots;
  }
  const providerIds = providers.map((provider) => provider.id);
  const dayOfWeek = (/* @__PURE__ */ new Date(`${date}T00:00:00`)).getDay();
  const weeklyPlaceholders = providerIds.map(() => "?").join(", ");
  const [weeklyRows, overrideRows] = await Promise.all([
    db.prepare(
      `SELECT team_member_id, day_of_week, start_time, end_time
       FROM provider_weekly_hours
       WHERE team_member_id IN (${weeklyPlaceholders})
         AND day_of_week = ?`
    ).bind(...providerIds, dayOfWeek).all(),
    db.prepare(
      `SELECT team_member_id, is_available, start_time, end_time
       FROM provider_date_overrides
       WHERE team_member_id IN (${weeklyPlaceholders})
         AND date = ?`
    ).bind(...providerIds, date).all()
  ]);
  const weeklyByProvider = /* @__PURE__ */ new Map();
  for (const row of weeklyRows.results || []) {
    const list = weeklyByProvider.get(row.team_member_id) || [];
    list.push(row);
    weeklyByProvider.set(row.team_member_id, list);
  }
  const overrideByProvider = /* @__PURE__ */ new Map();
  for (const row of overrideRows.results || []) {
    overrideByProvider.set(row.team_member_id, row);
  }
  const slots = [];
  for (let hour = 8; hour <= 17; hour++) {
    const slotStart = hour * 60;
    const slotEnd = slotStart + durationMinutes;
    const availableProviderIds = [];
    for (const provider of providers) {
      const override = overrideByProvider.get(provider.id);
      let available = false;
      if (override) {
        if (override.is_available === 0) {
          available = false;
        } else if (override.start_time && override.end_time) {
          available = slotFitsWindow(slotStart, slotEnd, override.start_time, override.end_time);
        } else {
          available = true;
        }
      } else {
        const weeklyWindows = weeklyByProvider.get(provider.id) || [];
        available = weeklyWindows.some((window) => slotFitsWindow(slotStart, slotEnd, window.start_time, window.end_time));
      }
      if (available) {
        availableProviderIds.push(provider.id);
      }
    }
    const start_time = fromMinutes(slotStart);
    const end_time = fromMinutes(slotEnd);
    const isAvailable = availableProviderIds.length >= requiredProviderCount;
    slots.push({
      date,
      start_time,
      end_time,
      available: isAvailable,
      providers: isAvailable ? availableProviderIds.slice(0, requiredProviderCount) : void 0
    });
  }
  return slots;
}
__name(generateTimeslots, "generateTimeslots");

// src/routes/scheduling.ts
var serviceAreaSchema = external_exports.object({
  postal_code: external_exports.string().optional(),
  lat: external_exports.coerce.number().optional(),
  lng: external_exports.coerce.number().optional(),
  address: external_exports.string().optional()
});
var timeslotSchema = external_exports.object({
  territory_id: external_exports.string(),
  date_from: external_exports.string(),
  date_to: external_exports.string(),
  duration_minutes: external_exports.coerce.number(),
  service_id: external_exports.string().optional()
});
var app10 = new Hono2();
app10.get("/service_area_check", zValidator("query", serviceAreaSchema), async (c) => {
  try {
    const db = c.env?.DB;
    if (!db) {
      return c.json({ error: "Database not available" }, 500);
    }
    const { postal_code, lat, lng } = c.req.valid("query");
    let resolvedLat = lat;
    let resolvedLng = lng;
    let resolvedCity;
    let resolvedProvince;
    if (postal_code && (resolvedLat === void 0 || resolvedLng === void 0)) {
      const token = c.env?.MAPBOX_ACCESS_TOKEN;
      if (token) {
        try {
          const res = await fetch(
            `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(postal_code)}&country=ca&types=postcode,place&limit=1&access_token=${token}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.features && data.features.length > 0) {
              const f = data.features[0];
              resolvedLng = f.geometry.coordinates[0];
              resolvedLat = f.geometry.coordinates[1];
              const ctx = f.properties.context || {};
              resolvedCity = ctx.place?.name;
              resolvedProvince = ctx.region?.region_code;
            }
          }
        } catch {
        }
      }
    }
    const territories = await db.prepare("SELECT * FROM territories WHERE is_active = 1").all();
    let matchingTerritory = null;
    let closestTerritory = null;
    let minDistance = Infinity;
    const postalCodeBufferKm = 5;
    for (const territory of territories.results || []) {
      const result = checkServiceArea(
        territory.service_area_type,
        territory.service_area_data,
        { postalCode: postal_code, lat: resolvedLat, lng: resolvedLng },
        postalCodeBufferKm
      );
      if (result.within) {
        matchingTerritory = territory;
        break;
      }
      if (result.distance !== void 0 && result.distance < minDistance) {
        minDistance = result.distance;
        closestTerritory = territory;
      }
    }
    return c.json({
      within_service_area: matchingTerritory !== null,
      territory: matchingTerritory,
      closest_territory: !matchingTerritory ? closestTerritory : null,
      distance_km: !matchingTerritory && minDistance !== Infinity ? Math.round(minDistance * 100) / 100 : null,
      resolved_city: resolvedCity || null,
      resolved_province: resolvedProvince || null,
      resolved_lat: resolvedLat ?? null,
      resolved_lng: resolvedLng ?? null
    });
  } catch (error) {
    console.error("Service area check error:", error);
    return c.json({ error: "Service area check failed" }, 500);
  }
});
app10.get("/timeslots", zValidator("query", timeslotSchema), async (c) => {
  try {
    const db = c.env?.DB;
    if (!db) {
      return c.json({ error: "Database not available" }, 500);
    }
    const { territory_id, date_from, date_to, duration_minutes, service_id } = c.req.valid("query");
    let requiredProviderCount = 1;
    let requiredSkills = [];
    let serviceBasePrice = 0;
    if (service_id) {
      const service = await db.prepare(`
        SELECT required_provider_count, base_price_cents FROM services WHERE id = ?
      `).bind(service_id).first();
      if (service) {
        requiredProviderCount = service.required_provider_count;
        serviceBasePrice = service.base_price_cents;
      }
      const skills = await db.prepare(`
        SELECT skill_id FROM service_required_skills WHERE service_id = ?
      `).bind(service_id).all();
      requiredSkills = (skills.results || []).map((s) => s.skill_id);
    }
    let hasAdjustmentRules = false;
    if (service_id && serviceBasePrice > 0) {
      const ruleCount = await db.prepare(
        "SELECT COUNT(*) as cnt FROM price_adjustment_rules WHERE is_active = 1 AND (service_id = ? OR service_id IS NULL)"
      ).bind(service_id).first();
      hasAdjustmentRules = (ruleCount?.cnt || 0) > 0;
    }
    const allTimeslots = [];
    const startDate = new Date(date_from);
    const endDate = new Date(date_to);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const timeslots = await generateTimeslots(
        db,
        territory_id,
        dateStr,
        duration_minutes,
        requiredProviderCount,
        requiredSkills
      );
      for (const slot of timeslots) {
        if (slot.available) {
          slot.price = serviceBasePrice;
        }
      }
      if (service_id && serviceBasePrice > 0 && hasAdjustmentRules) {
        for (const slot of timeslots) {
          if (slot.available) {
            const pricing = await calculateAdjustedPrice(
              db,
              service_id,
              serviceBasePrice,
              territory_id,
              dateStr,
              slot.start_time
            );
            slot.price = pricing.total_price;
            slot.price_adjustment = pricing.rule_adjustments;
          }
        }
      }
      allTimeslots.push(...timeslots);
    }
    return c.json({ timeslots: allTimeslots });
  } catch (error) {
    console.error("Timeslots error:", error);
    return c.json({ error: "Timeslots query failed" }, 500);
  }
});
var scheduling_default = app10;

// src/routes/services.ts
var app11 = new Hono2();
var asArray2 = /* @__PURE__ */ __name((value) => {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === "string" && value) return [value];
  return [];
}, "asArray");
app11.get("/", async (c) => {
  try {
    const db = c.env.DB;
    const territoryId = c.req.query("territory_id");
    const active = c.req.query("active");
    let sql = `SELECT s.*, sc.name as category_name
               FROM services s
               LEFT JOIN service_categories sc ON sc.id = s.category_id`;
    const clauses = [];
    const params = [];
    if (territoryId) {
      sql += " JOIN territory_services ts ON ts.service_id = s.id";
      clauses.push("ts.territory_id = ?");
      params.push(territoryId);
    }
    if (active !== void 0) {
      clauses.push("s.is_active = ?");
      params.push(active === "true" ? 1 : 0);
    }
    if (clauses.length) sql += ` WHERE ${clauses.join(" AND ")}`;
    sql += " ORDER BY s.name";
    const servicesRes = await (params.length ? db.prepare(sql).bind(...params) : db.prepare(sql)).all();
    const serviceIds = (servicesRes.results || []).map((row) => row.id);
    if (serviceIds.length === 0) return c.json({ services: [] });
    const placeholders = serviceIds.map(() => "?").join(", ");
    const [modifiersRes, skillsRes] = await Promise.all([
      db.prepare(`SELECT * FROM service_modifiers WHERE service_id IN (${placeholders}) ORDER BY sort_order, name`).bind(...serviceIds).all(),
      db.prepare(
        `SELECT srs.service_id, sk.id, sk.name, sk.description
         FROM service_required_skills srs
         JOIN skills sk ON sk.id = srs.skill_id
         WHERE srs.service_id IN (${placeholders})`
      ).bind(...serviceIds).all()
    ]);
    const modifiersByService = /* @__PURE__ */ new Map();
    for (const row of modifiersRes.results || []) {
      const key = row.service_id;
      const list = modifiersByService.get(key) || [];
      list.push(row);
      modifiersByService.set(key, list);
    }
    const skillsByService = /* @__PURE__ */ new Map();
    for (const row of skillsRes.results || []) {
      const key = row.service_id;
      const list = skillsByService.get(key) || [];
      list.push({ id: row.id, name: row.name, description: row.description });
      skillsByService.set(key, list);
    }
    return c.json({
      services: (servicesRes.results || []).map((row) => ({
        ...row,
        modifiers: modifiersByService.get(row.id) || [],
        required_skills: skillsByService.get(row.id) || []
      }))
    });
  } catch (error) {
    console.error("services list error", error);
    return c.json({ error: "Failed to list services" }, 500);
  }
});
app11.get("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param("id");
    const service = await db.prepare(
      `SELECT s.*, sc.name as category_name
       FROM services s
       LEFT JOIN service_categories sc ON sc.id = s.category_id
       WHERE s.id = ?`
    ).bind(id).first();
    if (!service) return c.json({ error: "Not found" }, 404);
    const [modifiers, skills] = await Promise.all([
      db.prepare("SELECT * FROM service_modifiers WHERE service_id = ? ORDER BY sort_order, name").bind(id).all(),
      db.prepare(
        `SELECT sk.id, sk.name, sk.description
         FROM service_required_skills srs
         JOIN skills sk ON sk.id = srs.skill_id
         WHERE srs.service_id = ?`
      ).bind(id).all()
    ]);
    return c.json({
      ...service,
      modifiers: modifiers.results || [],
      required_skills: skills.results || []
    });
  } catch (error) {
    console.error("services get error", error);
    return c.json({ error: "Failed to get service" }, 500);
  }
});
app11.post("/", async (c) => {
  try {
    const db = c.env.DB;
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const skillIds = asArray2(body.required_skill_ids);
    await db.prepare(
      `INSERT INTO services
       (id, name, description, category_id, base_price_cents, base_duration_minutes, required_provider_count, auto_assign_enabled, auto_assign_method, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      id,
      body.name,
      body.description || null,
      body.category_id || null,
      body.base_price_cents || 0,
      body.base_duration_minutes || 60,
      body.required_provider_count || 1,
      body.auto_assign_enabled ? 1 : 0,
      body.auto_assign_method || "balanced",
      body.is_active === false ? 0 : 1
    ).run();
    for (const skillId of skillIds) {
      await db.prepare("INSERT INTO service_required_skills (service_id, skill_id) VALUES (?, ?)").bind(id, skillId).run();
    }
    const created = await db.prepare("SELECT * FROM services WHERE id = ?").bind(id).first();
    return c.json(created, 201);
  } catch (error) {
    console.error("services create error", error);
    return c.json({ error: "Failed to create service" }, 500);
  }
});
app11.patch("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param("id");
    const body = await c.req.json();
    const fields = [];
    const values = [];
    const allowed = [
      "name",
      "description",
      "category_id",
      "base_price_cents",
      "base_duration_minutes",
      "required_provider_count",
      "auto_assign_enabled",
      "auto_assign_method",
      "is_active"
    ];
    for (const key of allowed) {
      if (body[key] !== void 0) {
        fields.push(`${key} = ?`);
        if (key === "auto_assign_enabled" || key === "is_active") {
          values.push(body[key] ? 1 : 0);
        } else {
          values.push(body[key]);
        }
      }
    }
    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      values.push(id);
      await db.prepare(`UPDATE services SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    }
    if (body.required_skill_ids !== void 0) {
      await db.prepare("DELETE FROM service_required_skills WHERE service_id = ?").bind(id).run();
      for (const skillId of asArray2(body.required_skill_ids)) {
        await db.prepare("INSERT INTO service_required_skills (service_id, skill_id) VALUES (?, ?)").bind(id, skillId).run();
      }
    }
    const updated = await db.prepare("SELECT * FROM services WHERE id = ?").bind(id).first();
    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json(updated);
  } catch (error) {
    console.error("services patch error", error);
    return c.json({ error: "Failed to update service" }, 500);
  }
});
app11.delete("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param("id");
    await db.prepare("DELETE FROM service_required_skills WHERE service_id = ?").bind(id).run();
    await db.prepare("DELETE FROM service_modifiers WHERE service_id = ?").bind(id).run();
    await db.prepare("DELETE FROM territory_services WHERE service_id = ?").bind(id).run();
    await db.prepare("DELETE FROM services WHERE id = ?").bind(id).run();
    return c.json({ deleted: true });
  } catch (error) {
    console.error("services delete error", error);
    return c.json({ error: "Failed to delete service" }, 500);
  }
});
var services_default = app11;

// src/routes/skills.ts
var app12 = new Hono2();
app12.get("/", async (c) => {
  try {
    const skills = await c.env.DB.prepare("SELECT * FROM skills ORDER BY name").all();
    return c.json({ skills: skills.results || [] });
  } catch (error) {
    console.error("skills list error", error);
    return c.json({ error: "Failed to list skills" }, 500);
  }
});
app12.get("/:id", async (c) => {
  try {
    const skill = await c.env.DB.prepare("SELECT * FROM skills WHERE id = ?").bind(c.req.param("id")).first();
    if (!skill) return c.json({ error: "Not found" }, 404);
    return c.json(skill);
  } catch (error) {
    console.error("skills get error", error);
    return c.json({ error: "Failed to get skill" }, 500);
  }
});
app12.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO skills (id, name, description, created_at)
       VALUES (?, ?, ?, datetime('now'))`
    ).bind(id, body.name, body.description || null).run();
    const created = await c.env.DB.prepare("SELECT * FROM skills WHERE id = ?").bind(id).first();
    return c.json(created, 201);
  } catch (error) {
    console.error("skills create error", error);
    return c.json({ error: "Failed to create skill" }, 500);
  }
});
app12.patch("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const fields = [];
    const values = [];
    if (body.name !== void 0) {
      fields.push("name = ?");
      values.push(body.name);
    }
    if (body.description !== void 0) {
      fields.push("description = ?");
      values.push(body.description);
    }
    if (fields.length === 0) return c.json({ error: "No fields to update" }, 400);
    values.push(id);
    await c.env.DB.prepare(`UPDATE skills SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    const updated = await c.env.DB.prepare("SELECT * FROM skills WHERE id = ?").bind(id).first();
    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json(updated);
  } catch (error) {
    console.error("skills patch error", error);
    return c.json({ error: "Failed to update skill" }, 500);
  }
});
app12.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await c.env.DB.prepare("DELETE FROM service_required_skills WHERE skill_id = ?").bind(id).run();
    await c.env.DB.prepare("DELETE FROM team_member_skills WHERE skill_id = ?").bind(id).run();
    await c.env.DB.prepare("DELETE FROM skills WHERE id = ?").bind(id).run();
    return c.json({ deleted: true });
  } catch (error) {
    console.error("skills delete error", error);
    return c.json({ error: "Failed to delete skill" }, 500);
  }
});
var skills_default = app12;

// src/routes/team.ts
var app13 = new Hono2();
var asStringArray3 = /* @__PURE__ */ __name((value) => {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === "string" && value) return [value];
  return [];
}, "asStringArray");
var asObjectArray = /* @__PURE__ */ __name((value) => {
  if (Array.isArray(value)) return value.filter((v) => Boolean(v && typeof v === "object"));
  return [];
}, "asObjectArray");
app13.get("/", async (c) => {
  try {
    const db = c.env.DB;
    const team = await db.prepare("SELECT * FROM team_members ORDER BY last_name, first_name").all();
    const ids = (team.results || []).map((m) => m.id);
    if (ids.length === 0) return c.json({ team_members: [] });
    const placeholders = ids.map(() => "?").join(", ");
    const [hoursRes, skillsRes, territoriesRes] = await Promise.all([
      db.prepare(`SELECT * FROM provider_weekly_hours WHERE team_member_id IN (${placeholders}) ORDER BY day_of_week`).bind(...ids).all(),
      db.prepare(
        `SELECT tms.team_member_id, sk.id, sk.name
         FROM team_member_skills tms
         JOIN skills sk ON sk.id = tms.skill_id
         WHERE tms.team_member_id IN (${placeholders})`
      ).bind(...ids).all(),
      db.prepare(
        `SELECT tmt.team_member_id, t.id, t.name
         FROM team_member_territories tmt
         JOIN territories t ON t.id = tmt.territory_id
         WHERE tmt.team_member_id IN (${placeholders})`
      ).bind(...ids).all()
    ]);
    const byMember = /* @__PURE__ */ __name((rows, key) => {
      const map = /* @__PURE__ */ new Map();
      for (const row of rows) {
        const id = String(row[key]);
        const list = map.get(id) || [];
        list.push(row);
        map.set(id, list);
      }
      return map;
    }, "byMember");
    const hoursMap = byMember(hoursRes.results || [], "team_member_id");
    const skillsMap = byMember(skillsRes.results || [], "team_member_id");
    const territoriesMap = byMember(territoriesRes.results || [], "team_member_id");
    return c.json({
      team_members: (team.results || []).map((member) => ({
        ...member,
        provider_weekly_hours: hoursMap.get(member.id) || [],
        skills: (skillsMap.get(member.id) || []).map((row) => ({ id: row.id, name: row.name })),
        territories: (territoriesMap.get(member.id) || []).map((row) => ({ id: row.id, name: row.name }))
      }))
    });
  } catch (error) {
    console.error("team list error", error);
    return c.json({ error: "Failed to list team members" }, 500);
  }
});
app13.get("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param("id");
    const member = await db.prepare("SELECT * FROM team_members WHERE id = ?").bind(id).first();
    if (!member) return c.json({ error: "Not found" }, 404);
    const [hours, skills, territories] = await Promise.all([
      db.prepare("SELECT * FROM provider_weekly_hours WHERE team_member_id = ? ORDER BY day_of_week").bind(id).all(),
      db.prepare(
        `SELECT sk.id, sk.name
         FROM team_member_skills tms
         JOIN skills sk ON sk.id = tms.skill_id
         WHERE tms.team_member_id = ?`
      ).bind(id).all(),
      db.prepare(
        `SELECT t.id, t.name
         FROM team_member_territories tmt
         JOIN territories t ON t.id = tmt.territory_id
         WHERE tmt.team_member_id = ?`
      ).bind(id).all()
    ]);
    return c.json({
      ...member,
      provider_weekly_hours: hours.results || [],
      skills: skills.results || [],
      territories: territories.results || []
    });
  } catch (error) {
    console.error("team get error", error);
    return c.json({ error: "Failed to get team member" }, 500);
  }
});
app13.post("/", async (c) => {
  try {
    const db = c.env.DB;
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO team_members
       (id, first_name, last_name, email, phone, role, is_active, can_be_auto_assigned, can_edit_availability, auto_assign_priority, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      id,
      body.first_name,
      body.last_name,
      body.email,
      body.phone || null,
      body.role || "provider",
      body.is_active === false ? 0 : 1,
      body.can_be_auto_assigned === false ? 0 : 1,
      body.can_edit_availability ? 1 : 0,
      body.auto_assign_priority || 100
    ).run();
    for (const skillId of asStringArray3(body.skill_ids)) {
      await db.prepare("INSERT INTO team_member_skills (team_member_id, skill_id) VALUES (?, ?)").bind(id, skillId).run();
    }
    for (const territoryId of asStringArray3(body.territory_ids)) {
      await db.prepare("INSERT INTO team_member_territories (team_member_id, territory_id) VALUES (?, ?)").bind(id, territoryId).run();
    }
    for (const hour of asObjectArray(body.provider_weekly_hours)) {
      await db.prepare(
        `INSERT INTO provider_weekly_hours (id, team_member_id, day_of_week, start_time, end_time)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(crypto.randomUUID(), id, hour.day_of_week, hour.start_time, hour.end_time).run();
    }
    const created = await db.prepare("SELECT * FROM team_members WHERE id = ?").bind(id).first();
    return c.json(created, 201);
  } catch (error) {
    console.error("team create error", error);
    return c.json({ error: "Failed to create team member" }, 500);
  }
});
app13.patch("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param("id");
    const body = await c.req.json();
    const fields = [];
    const values = [];
    const updatable = [
      "first_name",
      "last_name",
      "email",
      "phone",
      "role",
      "is_active",
      "can_be_auto_assigned",
      "can_edit_availability",
      "auto_assign_priority"
    ];
    for (const key of updatable) {
      if (body[key] !== void 0) {
        fields.push(`${key} = ?`);
        if (["is_active", "can_be_auto_assigned", "can_edit_availability"].includes(key)) {
          values.push(body[key] ? 1 : 0);
        } else {
          values.push(body[key]);
        }
      }
    }
    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      values.push(id);
      await db.prepare(`UPDATE team_members SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    }
    if (body.skill_ids !== void 0) {
      await db.prepare("DELETE FROM team_member_skills WHERE team_member_id = ?").bind(id).run();
      for (const skillId of asStringArray3(body.skill_ids)) {
        await db.prepare("INSERT INTO team_member_skills (team_member_id, skill_id) VALUES (?, ?)").bind(id, skillId).run();
      }
    }
    if (body.territory_ids !== void 0) {
      await db.prepare("DELETE FROM team_member_territories WHERE team_member_id = ?").bind(id).run();
      for (const territoryId of asStringArray3(body.territory_ids)) {
        await db.prepare("INSERT INTO team_member_territories (team_member_id, territory_id) VALUES (?, ?)").bind(id, territoryId).run();
      }
    }
    if (body.provider_weekly_hours !== void 0) {
      await db.prepare("DELETE FROM provider_weekly_hours WHERE team_member_id = ?").bind(id).run();
      for (const hour of asObjectArray(body.provider_weekly_hours)) {
        await db.prepare(
          `INSERT INTO provider_weekly_hours (id, team_member_id, day_of_week, start_time, end_time)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(crypto.randomUUID(), id, hour.day_of_week, hour.start_time, hour.end_time).run();
      }
    }
    const updated = await db.prepare("SELECT * FROM team_members WHERE id = ?").bind(id).first();
    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json(updated);
  } catch (error) {
    console.error("team patch error", error);
    return c.json({ error: "Failed to update team member" }, 500);
  }
});
app13.delete("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param("id");
    await db.prepare("DELETE FROM provider_weekly_hours WHERE team_member_id = ?").bind(id).run();
    await db.prepare("DELETE FROM provider_date_overrides WHERE team_member_id = ?").bind(id).run();
    await db.prepare("DELETE FROM team_member_skills WHERE team_member_id = ?").bind(id).run();
    await db.prepare("DELETE FROM team_member_territories WHERE team_member_id = ?").bind(id).run();
    await db.prepare("DELETE FROM team_members WHERE id = ?").bind(id).run();
    return c.json({ deleted: true });
  } catch (error) {
    console.error("team delete error", error);
    return c.json({ error: "Failed to delete team member" }, 500);
  }
});
var team_default = app13;

// src/routes/territories.ts
var app14 = new Hono2();
var asArray3 = /* @__PURE__ */ __name((value) => {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === "string" && value) return [value];
  return [];
}, "asArray");
app14.get("/", async (c) => {
  try {
    const db = c.env.DB;
    const active = c.req.query("active");
    const clauses = [];
    const params = [];
    if (active !== void 0) {
      clauses.push("t.is_active = ?");
      params.push(active === "true" ? 1 : 0);
    }
    const sql = `SELECT * FROM territories t ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY t.name`;
    const territories = await (params.length ? c.env.DB.prepare(sql).bind(...params) : c.env.DB.prepare(sql)).all();
    const ids = (territories.results || []).map((row) => row.id);
    if (ids.length === 0) return c.json({ territories: [] });
    const placeholders = ids.map(() => "?").join(", ");
    const [serviceRows, providerRows] = await Promise.all([
      db.prepare(
        `SELECT ts.territory_id, s.id as service_id, s.name
         FROM territory_services ts
         JOIN services s ON s.id = ts.service_id
         WHERE ts.territory_id IN (${placeholders})`
      ).bind(...ids).all(),
      db.prepare(
        `SELECT tmt.territory_id, tm.id as team_member_id, tm.first_name, tm.last_name
         FROM team_member_territories tmt
         JOIN team_members tm ON tm.id = tmt.team_member_id
         WHERE tmt.territory_id IN (${placeholders})`
      ).bind(...ids).all()
    ]);
    const servicesByTerritory = /* @__PURE__ */ new Map();
    for (const row of serviceRows.results || []) {
      const list = servicesByTerritory.get(row.territory_id) || [];
      list.push({ id: row.service_id, name: row.name });
      servicesByTerritory.set(row.territory_id, list);
    }
    const providersByTerritory = /* @__PURE__ */ new Map();
    for (const row of providerRows.results || []) {
      const list = providersByTerritory.get(row.territory_id) || [];
      list.push({ id: row.team_member_id, first_name: row.first_name, last_name: row.last_name });
      providersByTerritory.set(row.territory_id, list);
    }
    return c.json({
      territories: (territories.results || []).map((row) => ({
        ...row,
        territory_services: servicesByTerritory.get(row.id) || [],
        team_member_territories: providersByTerritory.get(row.id) || []
      }))
    });
  } catch (error) {
    console.error("territories list error", error);
    return c.json({ error: "Failed to list territories" }, 500);
  }
});
app14.get("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param("id");
    const territory = await db.prepare("SELECT * FROM territories WHERE id = ?").bind(id).first();
    if (!territory) return c.json({ error: "Not found" }, 404);
    const [services, providers] = await Promise.all([
      db.prepare(
        `SELECT s.id, s.name
         FROM territory_services ts
         JOIN services s ON s.id = ts.service_id
         WHERE ts.territory_id = ?`
      ).bind(id).all(),
      db.prepare(
        `SELECT tm.id, tm.first_name, tm.last_name
         FROM team_member_territories tmt
         JOIN team_members tm ON tm.id = tmt.team_member_id
         WHERE tmt.territory_id = ?`
      ).bind(id).all()
    ]);
    return c.json({
      ...territory,
      territory_services: services.results || [],
      team_member_territories: providers.results || []
    });
  } catch (error) {
    console.error("territories get error", error);
    return c.json({ error: "Failed to get territory" }, 500);
  }
});
app14.post("/", async (c) => {
  try {
    const db = c.env.DB;
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const serviceIds = asArray3(body.service_ids);
    const providerIds = asArray3(body.provider_ids);
    await db.prepare(
      `INSERT INTO territories
       (id, name, timezone, service_area_type, service_area_data, operating_hours, scheduling_policy, max_concurrent_jobs, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      id,
      body.name,
      body.timezone || "America/Toronto",
      body.service_area_type || "zip",
      body.service_area_data || "{}",
      body.operating_hours || "{}",
      body.scheduling_policy || "provider_based",
      body.max_concurrent_jobs ?? null,
      body.is_active === false ? 0 : 1
    ).run();
    for (const serviceId of serviceIds) {
      await db.prepare("INSERT INTO territory_services (territory_id, service_id) VALUES (?, ?)").bind(id, serviceId).run();
    }
    for (const providerId of providerIds) {
      await db.prepare("INSERT INTO team_member_territories (team_member_id, territory_id) VALUES (?, ?)").bind(providerId, id).run();
    }
    const created = await db.prepare("SELECT * FROM territories WHERE id = ?").bind(id).first();
    return c.json(created, 201);
  } catch (error) {
    console.error("territories create error", error);
    return c.json({ error: "Failed to create territory" }, 500);
  }
});
app14.patch("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param("id");
    const body = await c.req.json();
    const fields = [];
    const values = [];
    const updatable = [
      "name",
      "timezone",
      "service_area_type",
      "service_area_data",
      "operating_hours",
      "scheduling_policy",
      "max_concurrent_jobs",
      "is_active"
    ];
    for (const key of updatable) {
      if (body[key] !== void 0) {
        fields.push(`${key} = ?`);
        values.push(key === "is_active" ? body[key] ? 1 : 0 : body[key]);
      }
    }
    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      values.push(id);
      await db.prepare(`UPDATE territories SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    }
    if (body.service_ids !== void 0) {
      await db.prepare("DELETE FROM territory_services WHERE territory_id = ?").bind(id).run();
      for (const serviceId of asArray3(body.service_ids)) {
        await db.prepare("INSERT INTO territory_services (territory_id, service_id) VALUES (?, ?)").bind(id, serviceId).run();
      }
    }
    if (body.provider_ids !== void 0) {
      await db.prepare("DELETE FROM team_member_territories WHERE territory_id = ?").bind(id).run();
      for (const providerId of asArray3(body.provider_ids)) {
        await db.prepare("INSERT INTO team_member_territories (team_member_id, territory_id) VALUES (?, ?)").bind(providerId, id).run();
      }
    }
    const updated = await db.prepare("SELECT * FROM territories WHERE id = ?").bind(id).first();
    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json(updated);
  } catch (error) {
    console.error("territories patch error", error);
    return c.json({ error: "Failed to update territory" }, 500);
  }
});
app14.delete("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param("id");
    await db.prepare("DELETE FROM territory_services WHERE territory_id = ?").bind(id).run();
    await db.prepare("DELETE FROM team_member_territories WHERE territory_id = ?").bind(id).run();
    await db.prepare("DELETE FROM territories WHERE id = ?").bind(id).run();
    return c.json({ deleted: true });
  } catch (error) {
    console.error("territories delete error", error);
    return c.json({ error: "Failed to delete territory" }, 500);
  }
});
var territories_default = app14;

// src/routes/transactions.ts
var app15 = new Hono2();
app15.get("/", async (c) => {
  try {
    const transactions = await c.env.DB.prepare("SELECT * FROM transactions ORDER BY created_at DESC").all();
    return c.json({ transactions: transactions.results || [] });
  } catch (error) {
    console.error("transactions list error", error);
    return c.json({ error: "Failed to list transactions" }, 500);
  }
});
app15.get("/:id", async (c) => {
  try {
    const transaction = await c.env.DB.prepare("SELECT * FROM transactions WHERE id = ?").bind(c.req.param("id")).first();
    if (!transaction) return c.json({ error: "Not found" }, 404);
    return c.json(transaction);
  } catch (error) {
    console.error("transactions get error", error);
    return c.json({ error: "Failed to get transaction" }, 500);
  }
});
app15.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO transactions
       (id, invoice_id, customer_id, amount_cents, type, payment_method, reference, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      id,
      body.invoice_id || null,
      body.customer_id || null,
      body.amount_cents || 0,
      body.type || "charge",
      body.payment_method || null,
      body.reference || null
    ).run();
    const created = await c.env.DB.prepare("SELECT * FROM transactions WHERE id = ?").bind(id).first();
    return c.json(created, 201);
  } catch (error) {
    console.error("transactions create error", error);
    return c.json({ error: "Failed to create transaction" }, 500);
  }
});
app15.patch("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const fields = [];
    const values = [];
    for (const key of ["invoice_id", "customer_id", "amount_cents", "type", "payment_method", "reference"]) {
      if (body[key] !== void 0) {
        fields.push(`${key} = ?`);
        values.push(body[key]);
      }
    }
    if (fields.length === 0) return c.json({ error: "No fields to update" }, 400);
    values.push(id);
    await c.env.DB.prepare(`UPDATE transactions SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    const updated = await c.env.DB.prepare("SELECT * FROM transactions WHERE id = ?").bind(id).first();
    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json(updated);
  } catch (error) {
    console.error("transactions patch error", error);
    return c.json({ error: "Failed to update transaction" }, 500);
  }
});
app15.delete("/:id", async (c) => {
  try {
    await c.env.DB.prepare("DELETE FROM transactions WHERE id = ?").bind(c.req.param("id")).run();
    return c.json({ deleted: true });
  } catch (error) {
    console.error("transactions delete error", error);
    return c.json({ error: "Failed to delete transaction" }, 500);
  }
});
var transactions_default = app15;

// src/routes/messages.ts
var app16 = new Hono2();
var contactSchema = external_exports.object({
  source: external_exports.literal("contact"),
  first_name: external_exports.string().min(1),
  last_name: external_exports.string().min(1),
  email: external_exports.string().email(),
  phone: external_exports.string().min(1),
  postal_code: external_exports.string().min(1),
  reason: external_exports.enum(["bike fitting", "repair", "inquiry", "other"]),
  body: external_exports.string().min(1)
});
var newsletterSchema = external_exports.object({
  source: external_exports.literal("newsletter"),
  email: external_exports.string().email()
});
var registrationSchema = external_exports.object({
  source: external_exports.literal("registration"),
  first_name: external_exports.string().min(1),
  last_name: external_exports.string().min(1),
  email: external_exports.string().email(),
  phone: external_exports.string().min(1),
  postal_code: external_exports.string().min(1),
  metadata: external_exports.object({
    street_address: external_exports.string().optional(),
    apt_suite: external_exports.string().optional(),
    city: external_exports.string().optional(),
    province: external_exports.string().optional(),
    country: external_exports.string().optional(),
    company: external_exports.string().optional(),
    other: external_exports.string().optional()
  }).optional()
});
var messageSchema = external_exports.discriminatedUnion("source", [
  contactSchema,
  newsletterSchema,
  registrationSchema
]);
app16.post("/submit", zValidator("json", messageSchema), async (c) => {
  const db = c.env.DB;
  const data = c.req.valid("json");
  const id = crypto.randomUUID();
  const subject = data.source === "contact" ? `${data.reason.charAt(0).toUpperCase() + data.reason.slice(1)} \u2014 ${data.first_name} ${data.last_name}` : data.source === "newsletter" ? "Newsletter Signup" : `Registration \u2014 ${data.first_name} ${data.last_name}`;
  await db.prepare(`
    INSERT INTO messages (id, source, first_name, last_name, email, phone, postal_code, reason, subject, body, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    data.source,
    "first_name" in data ? data.first_name : null,
    "last_name" in data ? data.last_name : null,
    data.email,
    "phone" in data ? data.phone : null,
    "postal_code" in data ? data.postal_code : null,
    "reason" in data ? data.reason : null,
    subject,
    "body" in data ? data.body : null,
    "metadata" in data && data.metadata ? JSON.stringify(data.metadata) : null
  ).run();
  const sourceLabel = data.source.charAt(0).toUpperCase() + data.source.slice(1);
  const senderLabel = data.source === "newsletter" ? data.email : [
    "first_name" in data ? data.first_name : "",
    "last_name" in data ? data.last_name : ""
  ].filter(Boolean).join(" ").trim() || data.email;
  const messagePreview = (data.source === "contact" ? data.body : subject).replace(/\s+/g, " ").trim().slice(0, 160);
  const title3 = data.source === "newsletter" ? "New newsletter signup" : data.source === "registration" ? `New registration from ${senderLabel}` : `New ${sourceLabel} message from ${senderLabel}`;
  c.executionCtx.waitUntil(
    enqueueAndDispatchPushEvent(db, {
      type: "new_message",
      title: title3,
      body: messagePreview || subject,
      targetUrl: `/admin/inbox/${id}`
    })
  );
  return c.json({ id, message: "Message received" }, 201);
});
app16.get("/", async (c) => {
  const db = c.env.DB;
  const { source, status, cursor, limit = "50" } = c.req.query();
  let sql = "SELECT * FROM messages WHERE 1=1";
  const params = [];
  if (source) {
    sql += " AND source = ?";
    params.push(source);
  }
  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }
  if (cursor) {
    sql += " AND created_at < ?";
    params.push(cursor);
  }
  sql += " ORDER BY created_at DESC LIMIT ?";
  params.push(parseInt(limit, 10));
  const stmt = db.prepare(sql);
  const result = await (params.length > 0 ? stmt.bind(...params) : stmt).all();
  return c.json({
    messages: result.results,
    next_cursor: result.results.length > 0 ? result.results[result.results.length - 1].created_at : null
  });
});
app16.get("/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const msg = await db.prepare("SELECT * FROM messages WHERE id = ?").bind(id).first();
  if (!msg) return c.json({ error: "Not found" }, 404);
  return c.json(msg);
});
app16.patch("/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.json();
  const fields = [];
  const values = [];
  if (body.status) {
    fields.push("status = ?");
    values.push(body.status);
    if (body.status === "replied") {
      fields.push("replied_at = datetime('now')");
    }
  }
  if (body.is_read !== void 0) {
    fields.push("is_read = ?");
    values.push(body.is_read ? 1 : 0);
    if (body.is_read) {
      fields.push("read_at = datetime('now')");
      if (!body.status) {
        fields.push("status = ?");
        values.push("read");
      }
    }
  }
  if (fields.length === 0) return c.json({ error: "No fields to update" }, 400);
  fields.push("updated_at = datetime('now')");
  values.push(id);
  await db.prepare(`UPDATE messages SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
  const updated = await db.prepare("SELECT * FROM messages WHERE id = ?").bind(id).first();
  return c.json(updated);
});
app16.delete("/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  await db.prepare("DELETE FROM messages WHERE id = ?").bind(id).run();
  return c.json({ deleted: true });
});
var messages_default = app16;

// src/routes/webhooks.ts
var app17 = new Hono2();
app17.get("/", async (c) => {
  try {
    const webhooks = await c.env.DB.prepare("SELECT * FROM webhooks ORDER BY created_at DESC").all();
    return c.json({ webhooks: webhooks.results || [] });
  } catch (error) {
    console.error("webhooks list error", error);
    return c.json({ error: "Failed to list webhooks" }, 500);
  }
});
app17.get("/:id", async (c) => {
  try {
    const webhook = await c.env.DB.prepare("SELECT * FROM webhooks WHERE id = ?").bind(c.req.param("id")).first();
    if (!webhook) return c.json({ error: "Not found" }, 404);
    return c.json(webhook);
  } catch (error) {
    console.error("webhooks get error", error);
    return c.json({ error: "Failed to get webhook" }, 500);
  }
});
app17.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO webhooks (id, url, event_type, secret, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      id,
      body.url,
      body.event_type,
      body.secret || crypto.randomUUID(),
      body.is_active === false ? 0 : 1
    ).run();
    const created = await c.env.DB.prepare("SELECT * FROM webhooks WHERE id = ?").bind(id).first();
    return c.json(created, 201);
  } catch (error) {
    console.error("webhooks create error", error);
    return c.json({ error: "Failed to create webhook" }, 500);
  }
});
app17.patch("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const fields = [];
    const values = [];
    for (const key of ["url", "event_type", "secret", "is_active"]) {
      if (body[key] !== void 0) {
        fields.push(`${key} = ?`);
        values.push(key === "is_active" ? body[key] ? 1 : 0 : body[key]);
      }
    }
    if (fields.length === 0) return c.json({ error: "No fields to update" }, 400);
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await c.env.DB.prepare(`UPDATE webhooks SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    const updated = await c.env.DB.prepare("SELECT * FROM webhooks WHERE id = ?").bind(id).first();
    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json(updated);
  } catch (error) {
    console.error("webhooks patch error", error);
    return c.json({ error: "Failed to update webhook" }, 500);
  }
});
app17.delete("/:id", async (c) => {
  try {
    await c.env.DB.prepare("DELETE FROM webhooks WHERE id = ?").bind(c.req.param("id")).run();
    return c.json({ deleted: true });
  } catch (error) {
    console.error("webhooks delete error", error);
    return c.json({ error: "Failed to delete webhook" }, 500);
  }
});
var webhooks_default = app17;

// src/routes/twilio-webhooks.ts
init_twilio();
var app18 = new Hono2();
var parseFormParams = /* @__PURE__ */ __name((rawBody) => {
  const params = {};
  const parsed = new URLSearchParams(rawBody);
  for (const [key, value] of parsed.entries()) {
    params[key] = value;
  }
  return params;
}, "parseFormParams");
app18.post("/status", async (c) => {
  const db = c.env.DB;
  const config = await getTwilioConfig(db);
  if (!config) return c.text("Not configured", 200);
  const rawBody = await c.req.raw.clone().text();
  const params = parseFormParams(rawBody);
  const signature = c.req.header("X-Twilio-Signature") || "";
  const url = new URL(c.req.url);
  const fullUrl = `${url.origin}${url.pathname}`;
  const valid = await validateTwilioSignature(config.authToken, signature, fullUrl, params);
  if (!valid) {
    console.warn("[twilio-webhook] Invalid signature on status callback");
    return c.text("Invalid signature", 403);
  }
  const messageSid = params.MessageSid || params.SmsSid;
  const messageStatus = params.MessageStatus || params.SmsStatus || "";
  const errorCode = params.ErrorCode || "";
  const errorMessage = params.ErrorMessage || "";
  if (messageSid && messageStatus) {
    await updateSmsStatus(db, messageSid, messageStatus, errorCode || void 0, errorMessage || void 0);
  }
  return c.text("", 200);
});
app18.post("/inbound", async (c) => {
  const db = c.env.DB;
  const config = await getTwilioConfig(db);
  if (!config) return c.text('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 200, { "Content-Type": "text/xml" });
  const rawBody = await c.req.raw.clone().text();
  const params = parseFormParams(rawBody);
  const signature = c.req.header("X-Twilio-Signature") || "";
  const url = new URL(c.req.url);
  const fullUrl = `${url.origin}${url.pathname}`;
  const valid = await validateTwilioSignature(config.authToken, signature, fullUrl, params);
  if (!valid) {
    console.warn("[twilio-webhook] Invalid signature on inbound SMS");
    return c.text("Invalid signature", 403);
  }
  const from = params.From || "";
  const to = params.To || "";
  const body = params.Body || "";
  const messageSid = params.MessageSid || "";
  const numSegments = parseInt(params.NumSegments || "1", 10);
  const phoneE164 = normalizePhoneE164(from);
  if (!phoneE164) {
    console.warn(`[twilio-webhook] Could not normalize inbound phone: ${from}`);
    return c.text('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 200, { "Content-Type": "text/xml" });
  }
  const customer = await db.prepare(
    "SELECT id, first_name, last_name, email FROM customers WHERE phone_e164 = ? OR phone = ? ORDER BY updated_at DESC LIMIT 1"
  ).bind(phoneE164, from).first();
  const latestJob = customer?.id ? await db.prepare(
    `SELECT id FROM jobs
       WHERE customer_id = ?
       ORDER BY updated_at DESC
       LIMIT 1`
  ).bind(customer.id).first() : null;
  const inboxMessageId = await ensureSmsInboxMessage({
    db,
    phoneE164,
    customerId: customer?.id || null,
    jobId: latestJob?.id || null,
    firstName: customer?.first_name || null,
    lastName: customer?.last_name || null,
    email: customer?.email || null
  });
  await touchSmsInboxMessage(db, inboxMessageId, body);
  const upperBody = body.toUpperCase().trim();
  if (["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(upperBody)) {
    if (customer) {
      await db.prepare(
        "UPDATE customers SET sms_opted_out = 1, sms_opted_out_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
      ).bind(customer.id).run();
      console.log(`[twilio-webhook] Customer ${customer.id} opted out via ${upperBody}`);
    }
  }
  if (["START", "YES", "UNSTOP"].includes(upperBody)) {
    if (customer) {
      await db.prepare(
        "UPDATE customers SET sms_opted_out = 0, sms_opted_out_at = NULL, updated_at = datetime('now') WHERE id = ?"
      ).bind(customer.id).run();
      console.log(`[twilio-webhook] Customer ${customer.id} opted back in via ${upperBody}`);
    }
  }
  await logSms(db, {
    customerId: customer?.id || null,
    jobId: latestJob?.id || null,
    messageId: inboxMessageId,
    direction: "inbound",
    phoneTo: to,
    phoneFrom: phoneE164,
    body,
    twilioSid: messageSid,
    status: "received",
    segments: numSegments
  });
  const senderLabel = customer ? [customer.first_name || "", customer.last_name || ""].filter(Boolean).join(" ").trim() || phoneE164 : phoneE164;
  const preview = body.replace(/\s+/g, " ").trim().slice(0, 160);
  c.executionCtx.waitUntil(
    enqueueAndDispatchPushEvent(db, {
      type: "new_message",
      title: `New SMS from ${senderLabel}`,
      body: preview || "New inbound SMS received.",
      targetUrl: `/admin/inbox/${inboxMessageId}`
    })
  );
  return c.text('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 200, { "Content-Type": "text/xml" });
});
var twilio_webhooks_default = app18;

// src/widget/embed.ts
var BOOKING_WIDGET_JS = `(function() {
  'use strict';

  var WIDGET_VERSION = '2.0.0';

  function GOATkitWidget(config) {
    this.apiUrl = config.apiUrl || '';
    this.apiKey = config.apiKey || '';
    this.containerId = config.containerId || 'goatkit-widget';
    this.primaryColor = config.primaryColor || '#2563eb';
    this.fontFamily = config.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    this.onComplete = config.onComplete || function() {};
    this.onError = config.onError || function() {};
    this.onStepChange = config.onStepChange || function() {};

    this.state = {
      currentStep: 'zip',
      stepHistory: ['zip'],
      postalCode: '',
      territory: null,
      categories: [],
      selectedCategory: null,
      services: [],
      selectedService: null,
      serviceDetail: null,
      modifierSelections: {},
      timeslots: [],
      selectedDate: null,
      selectedTimeslot: null,
      dateWindowStart: 0,
      address: { line1: '', line2: '', city: '', province: '', postalCode: '' },
      contact: { firstName: '', lastName: '', email: '', phone: '' },
      loading: false,
      error: null,
      summaryExpanded: false,
      smsConsent: false,
      jobId: null
    };

    this._acTimer = null;
    this._acAbort = null;
    this._prevStep = null;
    this.init();
  }

  GOATkitWidget.prototype.init = function() {
    this.injectStyles();
    this.render();
  };

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // CSS
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  GOATkitWidget.prototype.injectStyles = function() {
    if (document.getElementById('zbw-styles')) return;
    var s = document.createElement('style');
    s.id = 'zbw-styles';
    s.textContent = this.getCSS();
    document.head.appendChild(s);
  };

  GOATkitWidget.prototype.getCSS = function() {
    var p = this.primaryColor;
    var f = this.fontFamily;
    return [
      ':root{--zbw-p:' + p + ';--zbw-pl:' + p + '14;--zbw-f:' + f + '}',

      '.zbw-root{font-family:var(--zbw-f);color:#1a1a1a;line-height:1.5;box-sizing:border-box;-webkit-font-smoothing:antialiased}',
      '.zbw-root *,.zbw-root *::before,.zbw-root *::after{box-sizing:inherit}',

      '.zbw-layout{display:flex;flex-direction:column;gap:0;max-width:860px;margin:0 auto}',
      '@media(min-width:768px){.zbw-layout{flex-direction:row;gap:24px}}',

      '.zbw-main{flex:1;min-width:0}',
      '.zbw-sidebar{display:none}',
      '@media(min-width:768px){.zbw-sidebar{display:block;width:280px;flex-shrink:0}}',

      '.zbw-mobile-summary{display:block;margin-bottom:16px}',
      '@media(min-width:768px){.zbw-mobile-summary{display:none}}',
      '.zbw-mobile-summary-btn{width:100%;padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-family:var(--zbw-f);font-size:14px;color:#475569}',
      '.zbw-mobile-summary-btn strong{color:#1a1a1a}',

      '.zbw-progress{margin-bottom:24px}',
      '.zbw-progress-bar{height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden}',
      '.zbw-progress-fill{height:100%;background:var(--zbw-p);border-radius:2px;transition:width .4s ease}',
      '.zbw-progress-text{font-size:12px;color:#94a3b8;margin-top:6px}',

      '.zbw-step{animation:zbw-fadeIn .25s ease}',
      '@keyframes zbw-fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}',

      '.zbw-step-title{font-size:22px;font-weight:700;margin:0 0 4px;color:#0f172a}',
      '.zbw-step-desc{font-size:14px;color:#64748b;margin:0 0 20px}',

      '.zbw-card{padding:16px;border:2px solid #e2e8f0;border-radius:10px;cursor:pointer;transition:all .15s ease;background:#fff}',
      '.zbw-card:hover{border-color:' + p + '66;box-shadow:0 2px 8px rgba(0,0,0,.06)}',
      '.zbw-card.selected{border-color:var(--zbw-p);background:' + p + '08}',
      '.zbw-card-title{font-weight:600;font-size:15px;margin-bottom:2px}',
      '.zbw-card-desc{font-size:13px;color:#64748b;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
      '.zbw-card-meta{display:flex;justify-content:space-between;align-items:center;font-size:14px}',
      '.zbw-card-price{font-weight:700;color:var(--zbw-p)}',
      '.zbw-card-duration{color:#94a3b8;font-size:13px}',
      '.zbw-cards{display:grid;gap:10px;margin-bottom:16px}',

      '.zbw-modifier-card{padding:20px;border:2px solid #e2e8f0;border-radius:10px;cursor:pointer;transition:all .15s ease;background:#fff;text-align:center}',
      '.zbw-modifier-card:hover{border-color:' + p + '66}',
      '.zbw-modifier-card.selected{border-color:var(--zbw-p);background:' + p + '08}',
      '.zbw-modifier-name{font-weight:600;font-size:16px;margin-bottom:4px}',
      '.zbw-modifier-desc{font-size:13px;color:#64748b;margin-bottom:8px}',
      '.zbw-modifier-price{font-weight:700;color:var(--zbw-p);font-size:15px}',

      '.zbw-date-chips{display:flex;align-items:center;gap:6px;margin-bottom:16px;overflow:hidden}',
      '.zbw-date-chip{flex-shrink:0;padding:10px 14px;border:2px solid #e2e8f0;border-radius:10px;cursor:pointer;text-align:center;transition:all .15s;background:#fff;min-width:64px}',
      '.zbw-date-chip:hover{border-color:' + p + '66}',
      '.zbw-date-chip.selected{border-color:var(--zbw-p);background:' + p + '08}',
      '.zbw-date-chip.empty{opacity:.4;pointer-events:none}',
      '.zbw-date-day{font-size:12px;color:#64748b;font-weight:500}',
      '.zbw-date-num{font-size:15px;font-weight:700;margin-top:2px}',
      '.zbw-date-nav{width:32px;height:32px;border-radius:50%;border:1px solid #e2e8f0;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px;color:#475569;transition:all .15s}',
      '.zbw-date-nav:hover{background:#f1f5f9}',
      '.zbw-date-nav:disabled{opacity:.3;cursor:not-allowed}',

      '.zbw-timeslots{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;margin-bottom:16px;max-height:280px;overflow-y:auto}',
      '.zbw-timeslot{padding:12px 8px;border:2px solid #e2e8f0;border-radius:8px;text-align:center;cursor:pointer;transition:all .15s;background:#fff}',
      '.zbw-timeslot:hover{border-color:' + p + '66}',
      '.zbw-timeslot.selected{border-color:var(--zbw-p);background:' + p + '08}',
      '.zbw-timeslot-time{font-weight:600;font-size:14px}',
      '.zbw-timeslot-price{font-size:12px;color:#64748b;margin-top:2px}',

      '.zbw-form-group{margin-bottom:14px}',
      '.zbw-form-group label{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:5px}',
'.zbw-input{width:100%;padding:11px 14px;border:1.5px solid #d1d5db;border-radius:8px;font-size:16px;font-family:var(--zbw-f);color:#1a1a1a;background:#fff;transition:border-color .15s,box-shadow .15s;outline:none}',
      '.zbw-input:focus{border-color:var(--zbw-p);box-shadow:0 0 0 3px ' + p + '1a}',
      '.zbw-input::placeholder{color:#9ca3af}',
      '.zbw-input-error{border-color:#ef4444}',
      'select.zbw-input{appearance:none;background-image:url("data:image/svg+xml,%3Csvg width=\\'10\\' height=\\'6\\' viewBox=\\'0 0 10 6\\' fill=\\'none\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cpath d=\\'M1 1L5 5L9 1\\' stroke=\\'%236b7280\\' stroke-width=\\'1.5\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:36px}',
      '.zbw-ac-wrap{position:relative}',
      '.zbw-ac-list{position:absolute;top:100%;left:0;right:0;background:#fff;border:1.5px solid #d1d5db;border-top:none;border-radius:0 0 8px 8px;z-index:100;max-height:240px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,.1)}',
      '.zbw-ac-list:empty{display:none}',
      '.zbw-ac-item{padding:10px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:background .1s}',
      '.zbw-ac-item:last-child{border-bottom:none}',
      '.zbw-ac-item:hover{background:#f8fafc}',
      '.zbw-ac-main{font-size:14px;font-weight:500;color:#1a1a1a}',
      '.zbw-ac-sub{font-size:12px;color:#64748b;margin-top:1px}',
      '.zbw-row{display:flex;gap:12px}',
      '.zbw-row .zbw-form-group{flex:1}',

      '.zbw-btn{display:inline-flex;align-items:center;justify-content:center;padding:12px 24px;border:none;border-radius:8px;font-size:15px;font-weight:600;font-family:var(--zbw-f);cursor:pointer;transition:all .15s;width:100%}',
      '.zbw-btn-primary{background:var(--zbw-p);color:#fff}',
      '.zbw-btn-primary:hover{opacity:.92}',
      '.zbw-btn-primary:disabled{background:#cbd5e1;cursor:not-allowed}',
      '.zbw-btn-secondary{background:#f1f5f9;color:#475569;margin-top:8px}',
      '.zbw-btn-secondary:hover{background:#e2e8f0}',
      '.zbw-btn-back{background:none;border:none;color:#64748b;font-size:14px;font-weight:500;cursor:pointer;padding:8px 0;font-family:var(--zbw-f);display:inline-flex;align-items:center;gap:4px}',
      '.zbw-btn-back:hover{color:#1a1a1a}',

      '.zbw-error{background:#fef2f2;color:#dc2626;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:14px;border:1px solid #fecaca}',

      '.zbw-summary-panel{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;position:sticky;top:24px}',
      '.zbw-summary-title{font-size:13px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px}',
      '.zbw-summary-service{font-size:16px;font-weight:700;margin-bottom:12px;color:#0f172a}',
      '.zbw-summary-item{display:flex;justify-content:space-between;font-size:13px;padding:4px 0;color:#475569}',
      '.zbw-summary-item.mod{color:#64748b}',
      '.zbw-summary-divider{border:none;border-top:1px solid #e2e8f0;margin:10px 0}',
      '.zbw-summary-total{display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#0f172a}',
      '.zbw-summary-detail{display:flex;align-items:center;gap:8px;font-size:13px;color:#64748b;margin-bottom:6px}',
      '.zbw-summary-detail svg{flex-shrink:0}',

      '.zbw-success{text-align:center;padding:32px 16px}',
      '.zbw-success-icon{width:56px;height:56px;border-radius:50%;background:#dcfce7;margin:0 auto 16px;display:flex;align-items:center;justify-content:center}',
      '.zbw-success-icon svg{color:#16a34a}',
      '.zbw-success h2{font-size:22px;margin:0 0 8px}',
      '.zbw-success p{color:#64748b;font-size:14px;margin:4px 0}',

      '.zbw-skeleton{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:zbw-shimmer 1.5s infinite;border-radius:8px}',
      '@keyframes zbw-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}',
      '.zbw-skeleton-card{height:80px;margin-bottom:10px}',
      '.zbw-skeleton-text{height:14px;margin-bottom:8px;width:60%}',
      '.zbw-skeleton-chip{height:56px;width:64px;border-radius:10px;flex-shrink:0}',

      '[data-theme="dark"] .zbw-root{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-step-title{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-step-desc{color:#a6adc8}',
      '[data-theme="dark"] .zbw-card{background:#1e1e2e;border-color:#313244;color:#cdd6f4}',
      '[data-theme="dark"] .zbw-card:hover{border-color:' + p + '88;box-shadow:0 2px 8px rgba(0,0,0,.3)}',
      '[data-theme="dark"] .zbw-card.selected{border-color:var(--zbw-p);background:' + p + '18}',
      '[data-theme="dark"] .zbw-card-title{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-card-desc{color:#a6adc8}',
      '[data-theme="dark"] .zbw-card-duration{color:#6c7086}',
      '[data-theme="dark"] .zbw-modifier-card{background:#1e1e2e;border-color:#313244;color:#cdd6f4}',
      '[data-theme="dark"] .zbw-modifier-card:hover{border-color:' + p + '88}',
      '[data-theme="dark"] .zbw-modifier-card.selected{border-color:var(--zbw-p);background:' + p + '18}',
      '[data-theme="dark"] .zbw-modifier-name{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-modifier-desc{color:#a6adc8}',
      '[data-theme="dark"] .zbw-date-chip{background:#1e1e2e;border-color:#313244;color:#cdd6f4}',
      '[data-theme="dark"] .zbw-date-chip:hover{border-color:' + p + '88}',
      '[data-theme="dark"] .zbw-date-chip.selected{border-color:var(--zbw-p);background:' + p + '18}',
      '[data-theme="dark"] .zbw-date-day{color:#a6adc8}',
      '[data-theme="dark"] .zbw-date-num{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-date-nav{background:#1e1e2e;border-color:#313244;color:#a6adc8}',
      '[data-theme="dark"] .zbw-date-nav:hover{background:#313244}',
      '[data-theme="dark"] .zbw-timeslot{background:#1e1e2e;border-color:#313244;color:#cdd6f4}',
      '[data-theme="dark"] .zbw-timeslot:hover{border-color:' + p + '88}',
      '[data-theme="dark"] .zbw-timeslot.selected{border-color:var(--zbw-p);background:' + p + '18}',
      '[data-theme="dark"] .zbw-timeslot-time{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-timeslot-price{color:#a6adc8}',
      '[data-theme="dark"] .zbw-input{background:#181825;border-color:#313244;color:#cdd6f4}',
      '[data-theme="dark"] .zbw-input:focus{border-color:var(--zbw-p);box-shadow:0 0 0 3px ' + p + '33}',
      '[data-theme="dark"] .zbw-input::placeholder{color:#6c7086}',
      '[data-theme="dark"] .zbw-form-group label{color:#bac2de}',
      '[data-theme="dark"] .zbw-btn-secondary{background:#313244;color:#bac2de}',
      '[data-theme="dark"] .zbw-btn-secondary:hover{background:#45475a}',
      '[data-theme="dark"] .zbw-btn-back{color:#a6adc8}',
      '[data-theme="dark"] .zbw-btn-back:hover{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-btn-primary:disabled{background:#45475a;color:#6c7086}',
      '[data-theme="dark"] .zbw-error{background:#45475a;color:#f38ba8;border-color:#f38ba866}',
      '[data-theme="dark"] .zbw-progress-bar{background:#313244}',
      '[data-theme="dark"] .zbw-progress-text{color:#6c7086}',
      '[data-theme="dark"] .zbw-summary-panel{background:#181825;border-color:#313244}',
      '[data-theme="dark"] .zbw-summary-title{color:#6c7086}',
      '[data-theme="dark"] .zbw-summary-service{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-summary-item{color:#a6adc8}',
      '[data-theme="dark"] .zbw-summary-divider{border-color:#313244}',
      '[data-theme="dark"] .zbw-summary-total{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-summary-detail{color:#a6adc8}',
      '[data-theme="dark"] .zbw-mobile-summary-btn{background:#181825;border-color:#313244;color:#a6adc8}',
      '[data-theme="dark"] .zbw-mobile-summary-btn strong{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-success h2{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-success p{color:#a6adc8}',
      '[data-theme="dark"] .zbw-ac-list{background:#1e1e2e;border-color:#313244;box-shadow:0 4px 12px rgba(0,0,0,.4)}',
      '[data-theme="dark"] .zbw-ac-item{border-bottom-color:#313244}',
      '[data-theme="dark"] .zbw-ac-item:hover{background:#313244}',
      '[data-theme="dark"] .zbw-ac-main{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-ac-sub{color:#a6adc8}',
      '[data-theme="dark"] .zbw-skeleton{background:linear-gradient(90deg,#313244 25%,#45475a 50%,#313244 75%);background-size:200% 100%}'
    ].join('\\n');
  };

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // UTILITIES
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  GOATkitWidget.prototype.formatPrice = function(cents) {
    if (cents == null) return '--';
    var dollars = Math.abs(cents) / 100;
    var sign = cents < 0 ? '-' : '';
    return sign + '\\$' + dollars.toFixed(dollars % 1 === 0 ? 0 : 2);
  };

  GOATkitWidget.prototype.formatPriceDelta = function(cents) {
    if (!cents) return 'Included';
    return '+\\$' + (Math.abs(cents) / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  };

  GOATkitWidget.prototype.formatTime = function(time24) {
    var parts = time24.split(':');
    var h = parseInt(parts[0], 10);
    var m = parts[1];
    var ampm = h >= 12 ? 'PM' : 'AM';
    return (h % 12 || 12) + ':' + m + ' ' + ampm;
  };

  GOATkitWidget.prototype.formatDate = function(dateStr) {
    var d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { timeZone: 'America/Toronto', weekday: 'short', month: 'short', day: 'numeric' });
  };

  GOATkitWidget.prototype.formatDateShort = function(dateStr) {
    var d = new Date(dateStr + 'T12:00:00');
    return {
      day: d.toLocaleDateString('en-US', { timeZone: 'America/Toronto', weekday: 'short' }),
      date: d.toLocaleDateString('en-US', { timeZone: 'America/Toronto', month: 'short', day: 'numeric' })
    };
  };

  GOATkitWidget.prototype.formatDuration = function(mins) {
    if (mins < 60) return mins + ' min';
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    return m ? h + ' hr ' + m + ' min' : h + ' hr';
  };

  GOATkitWidget.prototype.validatePostalCode = function(code) {
    return /^[A-Za-z]\\d[A-Za-z]\\s?\\d[A-Za-z]\\d$/.test(code.trim());
  };

  GOATkitWidget.prototype.normalizePostalCode = function(code) {
    var clean = code.replace(/\\s/g, '').toUpperCase();
    if (clean.length === 6) return clean.substring(0, 3) + ' ' + clean.substring(3);
    return clean;
  };

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // STATE & NAVIGATION
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  GOATkitWidget.prototype.computeSteps = function() {
    var steps = ['zip'];

    if (this.state.categories.length > 1) {
      steps.push('categories');
    }

    steps.push('services');

    if (this.state.serviceDetail && this.state.serviceDetail.modifiers) {
      for (var i = 0; i < this.state.serviceDetail.modifiers.length; i++) {
        steps.push('modifier_' + i);
      }
    }

    steps.push('datetime');
    steps.push('address');
    steps.push('contact');
    steps.push('success');

    return steps;
  };

  GOATkitWidget.prototype.getStepIndex = function() {
    var steps = this.computeSteps();
    var idx = steps.indexOf(this.state.currentStep);
    return idx >= 0 ? idx : 0;
  };

  GOATkitWidget.prototype.getProgressPercent = function() {
    var steps = this.computeSteps();
    var total = steps.length - 1;
    if (total <= 0) return 0;
    var idx = steps.indexOf(this.state.currentStep);
    if (this.state.currentStep === 'success') return 100;
    return Math.round((idx / (total - 1)) * 100);
  };

  GOATkitWidget.prototype.goToStep = function(stepId) {
    this.state.currentStep = stepId;
    this.state.stepHistory.push(stepId);
    this.state.error = null;
    this.onStepChange(stepId, this.getStepIndex());
    this.render();
  };

  GOATkitWidget.prototype.goBack = function() {
    if (this.state.stepHistory.length <= 1) return;
    this.state.stepHistory.pop();
    this.state.currentStep = this.state.stepHistory[this.state.stepHistory.length - 1];
    this.state.error = null;
    this.render();
  };

  GOATkitWidget.prototype.getRunningTotal = function() {
    var svc = this.state.selectedService;
    if (!svc) return 0;
    var total = svc.base_price_cents || 0;

    var detail = this.state.serviceDetail;
    if (detail && detail.modifiers) {
      for (var i = 0; i < detail.modifiers.length; i++) {
        var mod = detail.modifiers[i];
        if (this.state.modifierSelections[mod.id]) {
          total += (mod.price_adjustment_cents || 0);
        }
      }
    }

    if (this.state.selectedTimeslot && this.state.selectedTimeslot.price) {
      var priceDiff = this.state.selectedTimeslot.price - (svc.base_price_cents || 0);
      if (priceDiff !== 0) total += priceDiff;
    }

    return total;
  };

  GOATkitWidget.prototype.getEffectiveDuration = function() {
    var svc = this.state.selectedService;
    if (!svc) return 0;
    var dur = svc.base_duration_minutes || 0;

    var detail = this.state.serviceDetail;
    if (detail && detail.modifiers) {
      for (var i = 0; i < detail.modifiers.length; i++) {
        var mod = detail.modifiers[i];
        if (this.state.modifierSelections[mod.id]) {
          dur += (mod.duration_adjustment_minutes || 0);
        }
      }
    }
    return dur;
  };

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // API
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  GOATkitWidget.prototype.fetchApi = function(endpoint, options) {
    var self = this;
    var headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['Authorization'] = 'Bearer ' + this.apiKey;

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timeoutId = controller ? setTimeout(function() { controller.abort(); }, 30000) : null;

    var fetchOpts = Object.assign({}, options || {}, { headers: headers });
    if (controller) fetchOpts.signal = controller.signal;

    return fetch(this.apiUrl + endpoint, fetchOpts)
      .then(function(res) {
        if (timeoutId) clearTimeout(timeoutId);
        if (!res.ok) {
          return res.json().catch(function() { return { message: 'Request failed' }; }).then(function(err) {
            var msg = err.message || (typeof err.error === 'string' ? err.error : null) || 'Request failed';
            throw new Error(msg);
          });
        }
        return res.json();
      })
      .catch(function(err) {
        if (timeoutId) clearTimeout(timeoutId);
        if (err.name === 'AbortError') throw new Error('Request timed out');
        throw err;
      });
  };

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // RENDER CORE
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  GOATkitWidget.prototype.render = function() {
    var el = document.getElementById(this.containerId);
    if (!el) return;

    if (this.state.currentStep === 'address' && document.getElementById('zbw-addr1')) {
      this.readAddressFromDOM();
    }
    if (this.state.currentStep === 'contact' && document.getElementById('zbw-fname')) {
      var fn = document.getElementById('zbw-fname');
      var ln = document.getElementById('zbw-lname');
      var em = document.getElementById('zbw-email');
      var ph = document.getElementById('zbw-phone');
      if (fn) this.state.contact.firstName = fn.value;
      if (ln) this.state.contact.lastName = ln.value;
      if (em) this.state.contact.email = em.value;
      if (ph) this.state.contact.phone = ph.value;
    }

    var step = this.state.currentStep;
    var isSuccess = step === 'success';

    var html = '<div class="zbw-root">';

    if (!isSuccess) {
      html += this.renderProgress();
    }

    html += '<div class="zbw-layout">';
    html += '<div class="zbw-main">';

    if (!isSuccess && this.state.selectedService) {
      html += this.renderMobileSummary();
    }

    html += this.renderCurrentStep();
    html += '</div>';

    if (!isSuccess && this.state.selectedService) {
      html += '<div class="zbw-sidebar">' + this.renderSidebar() + '</div>';
    }

    html += '</div></div>';

    el.innerHTML = html;

    var _stepChanged = (this.state.currentStep !== this._prevStep);
    this._prevStep = this.state.currentStep;
    if (!_stepChanged) {
      var _s = el.querySelector('.zbw-step');
      if (_s) _s.style.animation = 'none';
    }

    this.attachEvents();
  };

  GOATkitWidget.prototype.renderProgress = function() {
    var pct = this.getProgressPercent();
    var steps = this.computeSteps().filter(function(s) { return s !== 'success'; });
    var idx = this.getStepIndex();
    var stepNum = Math.min(idx + 1, steps.length);

    return '<div class="zbw-progress">' +
      '<div class="zbw-progress-bar"><div class="zbw-progress-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="zbw-progress-text">Step ' + stepNum + ' of ' + steps.length + '</div>' +
      '</div>';
  };

  GOATkitWidget.prototype.renderSidebar = function() {
    var svc = this.state.selectedService;
    if (!svc) return '';

    var html = '<div class="zbw-summary-panel">';
    html += '<div class="zbw-summary-title">Order Summary</div>';
    html += '<div class="zbw-summary-service">' + this.esc(svc.name) + '</div>';

    html += '<div class="zbw-summary-item"><span>Base price</span><span>' + this.formatPrice(svc.base_price_cents) + '</span></div>';

    var detail = this.state.serviceDetail;
    if (detail && detail.modifiers) {
      for (var i = 0; i < detail.modifiers.length; i++) {
        var mod = detail.modifiers[i];
        if (this.state.modifierSelections[mod.id]) {
          html += '<div class="zbw-summary-item mod"><span>' + this.esc(mod.name) + '</span><span>' + this.formatPriceDelta(mod.price_adjustment_cents) + '</span></div>';
        }
      }
    }

    if (this.state.selectedTimeslot) {
      var ts = this.state.selectedTimeslot;
      html += '<hr class="zbw-summary-divider">';
      html += '<div class="zbw-summary-detail">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
        this.formatDate(ts.date) + ' at ' + this.formatTime(ts.start_time) +
        '</div>';
    }

    if (this.state.address.line1) {
      html += '<div class="zbw-summary-detail">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
        this.esc(this.state.address.line1) +
        '</div>';
    }

    html += '<hr class="zbw-summary-divider">';
    html += '<div class="zbw-summary-item"><span>Duration</span><span>' + this.formatDuration(this.getEffectiveDuration()) + '</span></div>';
    html += '<div class="zbw-summary-total"><span>Total</span><span>' + this.formatPrice(this.getRunningTotal()) + '</span></div>';
    html += '</div>';
    return html;
  };

  GOATkitWidget.prototype.renderMobileSummary = function() {
    var total = this.formatPrice(this.getRunningTotal());
    return '<div class="zbw-mobile-summary">' +
      '<button class="zbw-mobile-summary-btn" data-action="toggleSummary">' +
      '<span>View Summary</span><strong>' + total + '</strong>' +
      '</button>' +
      (this.state.summaryExpanded ? '<div style="margin-top:8px">' + this.renderSidebar() + '</div>' : '') +
      '</div>';
  };

  GOATkitWidget.prototype.renderBackButton = function() {
    return '<button class="zbw-btn-back" data-action="back">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>' +
      'Back</button>';
  };

  GOATkitWidget.prototype.esc = function(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  };

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // STEP ROUTER
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  GOATkitWidget.prototype.renderCurrentStep = function() {
    var step = this.state.currentStep;
    if (step === 'zip') return this.renderZipStep();
    if (step === 'categories') return this.renderCategoriesStep();
    if (step === 'services') return this.renderServicesStep();
    if (step.indexOf('modifier_') === 0) {
      var idx = parseInt(step.split('_')[1], 10);
      return this.renderModifierStep(idx);
    }
    if (step === 'datetime') return this.renderDateTimeStep();
    if (step === 'address') return this.renderAddressStep();
    if (step === 'contact') return this.renderContactStep();
    if (step === 'success') return this.renderSuccessStep();
    return '';
  };

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // STEP 1: ZIP CODE
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  GOATkitWidget.prototype.renderZipStep = function() {
    var html = '<div class="zbw-step">';
    html += '<h2 class="zbw-step-title">Book Online</h2>';
    html += '<p class="zbw-step-desc">Enter your postal code to check availability in your area.</p>';

    if (this.state.error) {
      html += '<div class="zbw-error">' + this.esc(this.state.error) + '</div>';
    }

    html += '<div class="zbw-form-group">';
    html += '<label for="zbw-postal">Postal Code</label>';
    html += '<input type="text" id="zbw-postal" class="zbw-input" maxlength="7" placeholder="K8N 1A1" autocomplete="postal-code" autocapitalize="characters" value="' + this.esc(this.state.postalCode) + '" />';
    html += '</div>';

    html += '<button class="zbw-btn zbw-btn-primary" data-action="checkZip"' + (this.state.loading ? ' disabled' : '') + '>';
    html += this.state.loading ? 'Checking...' : 'Check Availability';
    html += '</button>';

    html += '</div>';
    return html;
  };

  GOATkitWidget.prototype.handleCheckZip = function() {
    var input = document.getElementById('zbw-postal');
    var code = input ? input.value.trim() : '';

    if (!code) {
      this.state.error = 'Please enter a postal code.';
      this.render();
      return;
    }

    if (!this.validatePostalCode(code)) {
      this.state.error = 'Please enter a valid Canadian postal code (e.g. K8N 1A1).';
      this.render();
      return;
    }

    var normalized = this.normalizePostalCode(code);
    this.state.postalCode = normalized;
    this.state.address.postalCode = normalized;
    this.state.loading = true;
    this.state.error = null;
    this.render();

    var self = this;

    this.fetchApi('/v1/scheduling/service_area_check?postal_code=' + encodeURIComponent(normalized))
      .then(function(result) {
        if (result.within_service_area && result.territory) {
          self.state.territory = result.territory;

          if (result.resolved_city) self.state.address.city = result.resolved_city;
          if (result.resolved_province) self.state.address.province = result.resolved_province;
          if (result.resolved_lat && result.resolved_lng) {
            self.state.postalLat = result.resolved_lat;
            self.state.postalLng = result.resolved_lng;
          }

          return self.loadServices();
        } else {
          self.state.loading = false;
          self.state.error = 'Sorry, we don\\u2019t currently service this area.';
          self.render();
        }
      })
      .catch(function(err) {
        self.state.loading = false;
        self.state.error = err.message || 'Something went wrong. Please try again.';
        self.render();
        self.onError(err);
      });
  };

  GOATkitWidget.prototype.loadServices = function() {
    var self = this;
    var tid = this.state.territory.id;

    return this.fetchApi('/v1/services?territory_id=' + tid + '&active=true')
      .then(function(result) {
        var services = result.services || result || [];
        self.state.services = services;

        var catMap = {};
        for (var i = 0; i < services.length; i++) {
          var s = services[i];
          if (s.category_id && s.category_name) {
            catMap[s.category_id] = s.category_name;
          }
        }
        var cats = [];
        for (var cid in catMap) {
          cats.push({ id: cid, name: catMap[cid] });
        }
        self.state.categories = cats;

        self.state.loading = false;

        if (cats.length > 1) {
          self.goToStep('categories');
        } else {
          if (cats.length === 1) {
            self.state.selectedCategory = cats[0].id;
          }
          self.goToStep('services');
        }
      })
      .catch(function(err) {
        self.state.loading = false;
        self.state.error = err.message;
        self.render();
        self.onError(err);
      });
  };

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // STEP 2: CATEGORIES (conditional)
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  GOATkitWidget.prototype.renderCategoriesStep = function() {
    var html = '<div class="zbw-step">';
    html += this.renderBackButton();
    html += '<h2 class="zbw-step-title">What do you need?</h2>';
    html += '<p class="zbw-step-desc">Select a category to view available services.</p>';

    if (this.state.error) html += '<div class="zbw-error">' + this.esc(this.state.error) + '</div>';

    html += '<div class="zbw-cards">';
    for (var i = 0; i < this.state.categories.length; i++) {
      var cat = this.state.categories[i];
      var sel = this.state.selectedCategory === cat.id ? ' selected' : '';
      html += '<div class="zbw-card' + sel + '" data-action="selectCategory" data-id="' + cat.id + '">';
      html += '<div class="zbw-card-title">' + this.esc(cat.name) + '</div>';
      html += '</div>';
    }
    html += '</div>';

    html += '<button class="zbw-btn zbw-btn-primary" data-action="confirmCategory"' + (!this.state.selectedCategory ? ' disabled' : '') + '>Continue</button>';
    html += '</div>';
    return html;
  };

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // STEP 3: SERVICES
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  GOATkitWidget.prototype.renderServicesStep = function() {
    var html = '<div class="zbw-step">';
    html += this.renderBackButton();
    html += '<h2 class="zbw-step-title">Select a Service</h2>';
    html += '<p class="zbw-step-desc">Choose from our available services.</p>';

    if (this.state.error) html += '<div class="zbw-error">' + this.esc(this.state.error) + '</div>';

    if (this.state.loading) {
      html += '<div class="zbw-cards">';
      for (var k = 0; k < 3; k++) html += '<div class="zbw-skeleton zbw-skeleton-card"></div>';
      html += '</div>';
      html += '</div>';
      return html;
    }

    var filtered = this.state.services;
    if (this.state.selectedCategory) {
      filtered = filtered.filter(function(s) { return s.category_id === this.state.selectedCategory; }.bind(this));
    }

    html += '<div class="zbw-cards">';
    for (var i = 0; i < filtered.length; i++) {
      var svc = filtered[i];
      var sel = this.state.selectedService && this.state.selectedService.id === svc.id ? ' selected' : '';
      html += '<div class="zbw-card' + sel + '" data-action="selectService" data-id="' + svc.id + '">';
      html += '<div class="zbw-card-title">' + this.esc(svc.name) + '</div>';
      if (svc.description) html += '<div class="zbw-card-desc">' + this.esc(svc.description) + '</div>';
      html += '<div class="zbw-card-meta">';
      html += '<span class="zbw-card-price">' + this.formatPrice(svc.base_price_cents) + '</span>';
      html += '<span class="zbw-card-duration">' + this.formatDuration(svc.base_duration_minutes) + '</span>';
      html += '</div></div>';
    }
    html += '</div>';

    html += '<button class="zbw-btn zbw-btn-primary" data-action="confirmService"' + (!this.state.selectedService ? ' disabled' : '') + '>' + (this.state.loading ? 'Loading...' : 'Continue') + '</button>';
    html += '</div>';
    return html;
  };

  GOATkitWidget.prototype.handleSelectService = function(serviceId) {
    var svc = this.state.services.find(function(s) { return s.id === serviceId; });
    if (!svc) return;
    var hadService = !!this.state.selectedService;
    this.state.selectedService = svc;
    this.state.modifierSelections = {};
    this.state.timeslots = [];
    this.state.selectedTimeslot = null;
    this.state.selectedDate = null;
    if (!hadService) {
      this.render();
    } else {
      this._toggleCards('selectService', serviceId, 'confirmService');
      this._refreshSidebar();
    }
  };

  GOATkitWidget.prototype.handleConfirmService = function() {
    if (!this.state.selectedService) return;
    var self = this;
    this.state.loading = true;
    this.render();

    this.fetchApi('/v1/services/' + this.state.selectedService.id)
      .then(function(detail) {
        self.state.serviceDetail = detail;
        self.state.loading = false;

        var modifiers = detail.modifiers || [];
        if (modifiers.length > 0) {
          self.goToStep('modifier_0');
        } else {
          self.goToStep('datetime');
        }
      })
      .catch(function(err) {
        self.state.loading = false;
        self.state.error = err.message;
        self.render();
      });
  };

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // STEP 4: MODIFIERS (1 per screen)
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  GOATkitWidget.prototype.renderModifierStep = function(index) {
    var detail = this.state.serviceDetail;
    if (!detail || !detail.modifiers || !detail.modifiers[index]) return '';

    var mod = detail.modifiers[index];
    var isSelected = !!this.state.modifierSelections[mod.id];

    var html = '<div class="zbw-step">';
    html += this.renderBackButton();
    html += '<h2 class="zbw-step-title">' + this.esc(mod.name) + '</h2>';
    if (mod.description) html += '<p class="zbw-step-desc">' + this.esc(mod.description) + '</p>';

    html += '<div class="zbw-modifier-card' + (isSelected ? ' selected' : '') + '" data-action="toggleModifier" data-id="' + mod.id + '">';
    html += '<div class="zbw-modifier-name">' + this.esc(mod.name) + '</div>';
    html += '<div class="zbw-modifier-price">' + this.formatPriceDelta(mod.price_adjustment_cents) + '</div>';
    if (mod.duration_adjustment_minutes) {
      html += '<div style="font-size:13px;color:#64748b;margin-top:4px">+' + mod.duration_adjustment_minutes + ' min</div>';
    }
    html += '</div>';

    var nextStep;
    if (index + 1 < detail.modifiers.length) {
      nextStep = 'modifier_' + (index + 1);
    } else {
      nextStep = 'datetime';
    }

    if (mod.is_required && !isSelected) {
      html += '<button class="zbw-btn zbw-btn-primary" disabled>Select to continue</button>';
    } else {
      html += '<button class="zbw-btn zbw-btn-primary" data-action="nextModifier" data-next="' + nextStep + '">Continue</button>';
    }

    if (!mod.is_required && !isSelected) {
      html += '<button class="zbw-btn zbw-btn-secondary" data-action="nextModifier" data-next="' + nextStep + '">Skip</button>';
    }

    html += '</div>';
    return html;
  };

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // STEP 5: DATE & TIME
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  GOATkitWidget.prototype.renderDateTimeStep = function() {
    var html = '<div class="zbw-step">';
    html += this.renderBackButton();
    html += '<h2 class="zbw-step-title">Choose a Time</h2>';
    html += '<p class="zbw-step-desc">Select your preferred appointment date and time.</p>';

    if (this.state.error) html += '<div class="zbw-error">' + this.esc(this.state.error) + '</div>';

    if (this.state.loading) {
      html += '<div class="zbw-date-chips">';
      for (var k = 0; k < 5; k++) html += '<div class="zbw-skeleton zbw-skeleton-chip"></div>';
      html += '</div>';
      html += '<div class="zbw-skeleton zbw-skeleton-card"></div>';
      html += '<div class="zbw-skeleton zbw-skeleton-card"></div>';
      html += '</div>';
      return html;
    }

    if (this.state.timeslots.length === 0) {
      this.loadTimeslots();
      html += '<div style="text-align:center;padding:40px;color:#64748b">Loading available times...</div>';
      html += '</div>';
      return html;
    }

    var allDates = [];
    var byDate = {};
    for (var i = 0; i < this.state.timeslots.length; i++) {
      var t = this.state.timeslots[i];
      if (!t.available) continue;
      if (!byDate[t.date]) { byDate[t.date] = []; allDates.push(t.date); }
      byDate[t.date].push(t);
    }
    allDates.sort();

    var ws = this.state.dateWindowStart;
    var visibleDates = allDates.slice(ws, ws + 7);
    var selectedDate = this.state.selectedDate || (visibleDates.length > 0 ? visibleDates[0] : null);

    html += '<div class="zbw-date-chips">';
    html += '<button class="zbw-date-nav" data-action="dateNav" data-dir="-1"' + (ws <= 0 ? ' disabled' : '') + '>&lsaquo;</button>';

    for (var d = 0; d < visibleDates.length; d++) {
      var ds = this.formatDateShort(visibleDates[d]);
      var dsel = visibleDates[d] === selectedDate ? ' selected' : '';
      html += '<div class="zbw-date-chip' + dsel + '" data-action="selectDate" data-date="' + visibleDates[d] + '">';
      html += '<div class="zbw-date-day">' + ds.day + '</div>';
      html += '<div class="zbw-date-num">' + ds.date + '</div>';
      html += '</div>';
    }

    html += '<button class="zbw-date-nav" data-action="dateNav" data-dir="1"' + (ws + 7 >= allDates.length ? ' disabled' : '') + '>&rsaquo;</button>';
    html += '</div>';

    var slots = byDate[selectedDate] || [];
    if (slots.length === 0) {
      html += '<div style="text-align:center;padding:24px;color:#94a3b8;font-size:14px">No availability on this date.</div>';
    } else {
      html += '<div class="zbw-timeslots">';
      for (var s = 0; s < slots.length; s++) {
        var sl = slots[s];
        var ssel = this.state.selectedTimeslot && this.state.selectedTimeslot.date === sl.date && this.state.selectedTimeslot.start_time === sl.start_time ? ' selected' : '';
        html += '<div class="zbw-timeslot' + ssel + '" data-action="selectTimeslot" data-date="' + sl.date + '" data-time="' + sl.start_time + '" data-price="' + (sl.price || 0) + '">';
        html += '<div class="zbw-timeslot-time">' + this.formatTime(sl.start_time) + '</div>';
        if (sl.price) html += '<div class="zbw-timeslot-price">' + this.formatPrice(sl.price) + '</div>';
        html += '</div>';
      }
      html += '</div>';
    }

    html += '<button class="zbw-btn zbw-btn-primary" data-action="confirmDatetime"' + (!this.state.selectedTimeslot ? ' disabled' : '') + '>Continue</button>';
    html += '</div>';
    return html;
  };

  GOATkitWidget.prototype.loadTimeslots = function() {
    var self = this;
    self.state.loading = true;
    self.render();

    var today = new Date();
    var dateFrom = today.toISOString().split('T')[0];
    var end = new Date(today);
    end.setDate(end.getDate() + 14);
    var dateTo = end.toISOString().split('T')[0];
    var dur = this.getEffectiveDuration();

    var params = 'territory_id=' + this.state.territory.id +
      '&date_from=' + dateFrom +
      '&date_to=' + dateTo +
      '&duration_minutes=' + dur +
      '&service_id=' + this.state.selectedService.id;

    this.fetchApi('/v1/scheduling/timeslots?' + params)
      .then(function(result) {
        self.state.timeslots = result.timeslots || [];
        self.state.loading = false;
        self.state.selectedDate = null;
        self.state.selectedTimeslot = null;
        self.state.dateWindowStart = 0;
        self.render();
      })
      .catch(function(err) {
        self.state.loading = false;
        self.state.error = err.message;
        self.render();
      });
  };

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // STEP 6: ADDRESS
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  GOATkitWidget.prototype.renderAddressStep = function() {
    var a = this.state.address;
    var provinces = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];

    var html = '<div class="zbw-step">';
    html += this.renderBackButton();
    html += '<h2 class="zbw-step-title">Service Address</h2>';
    html += '<p class="zbw-step-desc">Where should we come?</p>';

    if (this.state.error) html += '<div class="zbw-error">' + this.esc(this.state.error) + '</div>';

    html += '<div class="zbw-form-group zbw-ac-wrap"><label>Street Address *</label><input type="text" class="zbw-input" id="zbw-addr1" autocomplete="address-line1" value="' + this.esc(a.line1) + '" placeholder="Start typing your address..." /><div id="zbw-ac-list" class="zbw-ac-list"></div></div>';
    html += '<div class="zbw-form-group"><label>Apt / Unit</label><input type="text" class="zbw-input" id="zbw-addr2" autocomplete="address-line2" value="' + this.esc(a.line2) + '" /></div>';

    html += '<div class="zbw-row">';
    html += '<div class="zbw-form-group"><label>City *</label><input type="text" class="zbw-input" id="zbw-city" autocomplete="address-level2" value="' + this.esc(a.city) + '" /></div>';
    html += '<div class="zbw-form-group"><label>Province *</label><input type="text" class="zbw-input" id="zbw-prov" autocomplete="address-level1" value="' + this.esc(a.province) + '" placeholder="ON" /></div>';
    html += '</div>';

    html += '<div class="zbw-form-group"><label>Postal Code *</label><input type="text" class="zbw-input" id="zbw-postal2" maxlength="7" autocomplete="postal-code" autocapitalize="characters" value="' + this.esc(a.postalCode) + '" /></div>';

    html += '<button class="zbw-btn zbw-btn-primary" data-action="confirmAddress">Continue</button>';
    html += '</div>';
    return html;
  };

  GOATkitWidget.prototype.readAddressFromDOM = function() {
    var line1 = (document.getElementById('zbw-addr1') || {}).value;
    var line2 = (document.getElementById('zbw-addr2') || {}).value;
    var city = (document.getElementById('zbw-city') || {}).value;
    var prov = (document.getElementById('zbw-prov') || {}).value;
    var postal = (document.getElementById('zbw-postal2') || {}).value;
    if (line1 !== undefined) this.state.address.line1 = line1.trim();
    if (line2 !== undefined) this.state.address.line2 = line2.trim();
    if (city !== undefined) this.state.address.city = city.trim();
    if (prov !== undefined) {
      var provMap = {'alberta':'AB','british columbia':'BC','manitoba':'MB','new brunswick':'NB','newfoundland and labrador':'NL','nova scotia':'NS','northwest territories':'NT','nunavut':'NU','ontario':'ON','prince edward island':'PE','quebec':'QC','saskatchewan':'SK','yukon':'YT'};
      var normalized = provMap[prov.toLowerCase().trim()] || prov.trim();
      this.state.address.province = normalized.length <= 2 ? normalized.toUpperCase() : normalized;
    }
    if (postal !== undefined) this.state.address.postalCode = postal.trim();
  };

  GOATkitWidget.prototype.handleConfirmAddress = function() {
    this.readAddressFromDOM();
    var a = this.state.address;

    if (!a.line1 || !a.city || !a.province || !a.postalCode) {
      this.state.error = 'Please fill in all required fields.';
      this.render();
      return;
    }
    this.goToStep('contact');
  };

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // STEP 7: CONTACT + BOOK
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  GOATkitWidget.prototype.renderContactStep = function() {
    var c = this.state.contact;

    var html = '<div class="zbw-step">';
    html += this.renderBackButton();
    html += '<h2 class="zbw-step-title">Almost Done!</h2>';
    html += '<p class="zbw-step-desc">Enter your contact info to complete your booking.</p>';

    if (this.state.error) html += '<div class="zbw-error">' + this.esc(this.state.error) + '</div>';

    html += '<div class="zbw-row">';
    html += '<div class="zbw-form-group"><label>First Name *</label><input type="text" class="zbw-input" id="zbw-fname" autocomplete="given-name" value="' + this.esc(c.firstName) + '" /></div>';
    html += '<div class="zbw-form-group"><label>Last Name *</label><input type="text" class="zbw-input" id="zbw-lname" autocomplete="family-name" value="' + this.esc(c.lastName) + '" /></div>';
    html += '</div>';
    html += '<div class="zbw-form-group"><label>Email *</label><input type="email" class="zbw-input" id="zbw-email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" value="' + this.esc(c.email) + '" placeholder="you@example.com" /></div>';
    html += '<div class="zbw-form-group"><label>Phone *</label><input type="tel" class="zbw-input" id="zbw-phone" autocomplete="tel" inputmode="tel" value="' + this.esc(c.phone) + '" placeholder="(555) 123-4567" /></div>';

    html += '<div class="zbw-form-group" style="margin-top:8px;">';
    html += '<label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;font-size:13px;line-height:1.4;">';
    html += '<input type="checkbox" id="zbw-sms-consent"' + (this.state.smsConsent ? ' checked' : '') + ' style="margin-top:2px;flex-shrink:0;" />';
    html += '<span style="color:#666;">I agree to receive SMS updates about my booking (appointment reminders, status changes). Msg & data rates may apply. Reply STOP to opt out.</span>';
    html += '</label>';
    html += '</div>';

    html += '<button class="zbw-btn zbw-btn-primary" data-action="submitBooking"' + (this.state.loading ? ' disabled' : '') + '>' + (this.state.loading ? 'Booking...' : 'Book Now') + '</button>';
    html += '</div>';
    return html;
  };

  GOATkitWidget.prototype.handleSubmitBooking = function() {
    if (this.state.submitting) return;

    var fn = (document.getElementById('zbw-fname') || {}).value || '';
    var ln = (document.getElementById('zbw-lname') || {}).value || '';
    var em = (document.getElementById('zbw-email') || {}).value || '';
    var ph = (document.getElementById('zbw-phone') || {}).value || '';
    var smsEl = document.getElementById('zbw-sms-consent');
    var smsConsent = smsEl ? smsEl.checked : false;
    this.state.smsConsent = smsConsent;

    this.state.contact = { firstName: fn.trim(), lastName: ln.trim(), email: em.trim(), phone: ph.trim() };

    if (!fn.trim() || !ln.trim() || !em.trim() || !ph.trim()) {
      this.state.error = 'Please fill in all required fields.';
      this.render();
      return;
    }

    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(em.trim())) {
      this.state.error = 'Please enter a valid email address.';
      this.render();
      return;
    }

    this.state.loading = true;
    this.state.submitting = true;
    this.state.error = null;
    this.render();

    var self = this;
    var svc = this.state.selectedService;
    var ts = this.state.selectedTimeslot;
    var a = this.state.address;

    if (!svc || !ts || !ts.date) {
      this.state.loading = false;
      this.state.error = 'Please go back and select a service and time.';
      this.render();
      return;
    }
    if (!a.line1 || !a.city) {
      this.state.loading = false;
      this.state.error = 'Please go back and fill in your address.';
      this.render();
      return;
    }

    var selectedModIds = [];
    if (this.state.serviceDetail && this.state.serviceDetail.modifiers) {
      for (var i = 0; i < this.state.serviceDetail.modifiers.length; i++) {
        var mod = this.state.serviceDetail.modifiers[i];
        if (this.state.modifierSelections[mod.id]) selectedModIds.push(mod.id);
      }
    }

    this.fetchApi('/v1/bookings/create', {
      method: 'POST',
      body: JSON.stringify({
        first_name: fn.trim(),
        last_name: ln.trim(),
        email: em.trim(),
        phone: ph.trim() || null,
        sms_consent: smsConsent,
        address_line1: a.line1,
        address_line2: a.line2 || null,
        city: a.city,
        province: a.province,
        postal_code: a.postalCode,
        territory_id: self.state.territory.id,
        service_id: svc.id,
        scheduled_date: ts.date,
        scheduled_start_time: ts.start_time,
        duration_minutes: self.getEffectiveDuration(),
        selected_modifiers: selectedModIds,
        lat: a.lat || undefined,
        lng: a.lng || undefined
      })
    })
    .then(function(job) {
      self.state.jobId = job.id;
      self.state.loading = false;
      self.goToStep('success');
      self.onComplete({ jobId: job.id, service: svc.name, date: ts.date, time: ts.start_time });
    })
    .catch(function(err) {
      self.state.loading = false;
      self.state.submitting = false;
      self.state.error = err.message || 'Booking failed. Please try again.';
      self.render();
      self.onError(err);
    });
  };

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // STEP 8: SUCCESS
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  GOATkitWidget.prototype.renderSuccessStep = function() {
    var ts = this.state.selectedTimeslot;
    var svc = this.state.selectedService;
    var html = '<div class="zbw-success">';
    html += '<div class="zbw-success-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg></div>';
    html += '<h2>Booking Confirmed!</h2>';
    html += '<p>Your appointment has been scheduled.</p>';
    if (svc) html += '<p style="font-weight:600;margin-top:12px">' + this.esc(svc.name) + '</p>';
    if (ts) html += '<p>' + this.formatDate(ts.date) + ' at ' + this.formatTime(ts.start_time) + '</p>';
    html += '<p style="color:#94a3b8;font-size:13px;margin-top:16px">Booking ID: ' + (this.state.jobId || '') + '</p>';
    if (this.state.contact.email) {
      html += '<p style="color:#64748b;font-size:13px">Confirmation sent to ' + this.esc(this.state.contact.email) + '</p>';
    }
    html += '</div>';
    return html;
  };

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // TARGETED DOM UPDATES (no full re-render)
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  GOATkitWidget.prototype._toggleCards = function(action, selectedId, confirmAction) {
    var el = document.getElementById(this.containerId);
    if (!el) return;
    var cards = el.querySelectorAll('[data-action="' + action + '"]');
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute('data-id') === selectedId) cards[i].classList.add('selected');
      else cards[i].classList.remove('selected');
    }
    if (confirmAction) {
      var btn = el.querySelector('[data-action="' + confirmAction + '"]');
      if (btn) btn.disabled = !selectedId;
    }
  };

  GOATkitWidget.prototype._refreshSidebar = function() {
    var el = document.getElementById(this.containerId);
    if (!el) return;
    var sidebar = el.querySelector('.zbw-sidebar');
    if (sidebar) sidebar.innerHTML = this.renderSidebar();
    var mBtn = el.querySelector('.zbw-mobile-summary-btn strong');
    if (mBtn) mBtn.textContent = this.formatPrice(this.getRunningTotal());
  };

  GOATkitWidget.prototype._renderSlotsForDate = function(date) {
    var byDate = {};
    for (var i = 0; i < this.state.timeslots.length; i++) {
      var t = this.state.timeslots[i];
      if (!t.available) continue;
      if (!byDate[t.date]) byDate[t.date] = [];
      byDate[t.date].push(t);
    }
    var slots = byDate[date] || [];
    if (slots.length === 0) return '<div style="text-align:center;padding:24px;color:#94a3b8;font-size:14px">No availability on this date.</div>';
    var html = '<div class="zbw-timeslots">';
    for (var s = 0; s < slots.length; s++) {
      var sl = slots[s];
      html += '<div class="zbw-timeslot" data-action="selectTimeslot" data-date="' + sl.date + '" data-time="' + sl.start_time + '" data-price="' + (sl.price || 0) + '">';
      html += '<div class="zbw-timeslot-time">' + this.formatTime(sl.start_time) + '</div>';
      if (sl.price) html += '<div class="zbw-timeslot-price">' + this.formatPrice(sl.price) + '</div>';
      html += '</div>';
    }
    html += '</div>';
    return html;
  };

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // EVENT HANDLING
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  GOATkitWidget.prototype.attachEvents = function() {
    var self = this;
    var container = document.getElementById(this.containerId);
    if (!container) return;

    container.addEventListener('click', function(e) {
      var target = e.target.closest('[data-action]');
      if (!target) return;
      var action = target.getAttribute('data-action');

      switch (action) {
        case 'checkZip': self.handleCheckZip(); break;
        case 'back': self.goBack(); break;
        case 'toggleSummary':
          self.state.summaryExpanded = !self.state.summaryExpanded;
          var sumContent = container.querySelector('.zbw-mobile-summary > div:last-child');
          if (self.state.summaryExpanded && !sumContent) {
            var wrap = container.querySelector('.zbw-mobile-summary');
            if (wrap) { var d = document.createElement('div'); d.style.marginTop = '8px'; d.innerHTML = self.renderSidebar(); wrap.appendChild(d); }
          } else if (!self.state.summaryExpanded && sumContent) {
            sumContent.remove();
          }
          break;
        case 'selectCategory':
          self.state.selectedCategory = target.getAttribute('data-id');
          self.state.selectedService = null;
          self.state.serviceDetail = null;
          self.state.modifierSelections = {};
          self._toggleCards('selectCategory', self.state.selectedCategory, 'confirmCategory');
          break;
        case 'confirmCategory':
          if (self.state.selectedCategory) self.goToStep('services');
          break;
        case 'selectService':
          self.handleSelectService(target.getAttribute('data-id'));
          break;
        case 'confirmService':
          self.handleConfirmService();
          break;
        case 'toggleModifier':
          var mid = target.getAttribute('data-id');
          self.state.modifierSelections[mid] = !self.state.modifierSelections[mid];
          self.render();
          break;
        case 'nextModifier':
          var next = target.getAttribute('data-next');
          self.goToStep(next);
          break;
        case 'dateNav':
          var dir = parseInt(target.getAttribute('data-dir'), 10);
          self.state.dateWindowStart = Math.max(0, self.state.dateWindowStart + dir * 7);
          self.render();
          break;
        case 'selectDate':
          self.state.selectedDate = target.getAttribute('data-date');
          self.state.selectedTimeslot = null;
          var allChips = container.querySelectorAll('[data-action="selectDate"]');
          for (var ci = 0; ci < allChips.length; ci++) {
            if (allChips[ci].getAttribute('data-date') === self.state.selectedDate) allChips[ci].classList.add('selected');
            else allChips[ci].classList.remove('selected');
          }
          var slotsContainer = container.querySelector('.zbw-timeslots') || container.querySelector('[style*="text-align:center"]');
          if (slotsContainer) {
            var wrap = slotsContainer.parentNode;
            var confirmBtn = container.querySelector('[data-action="confirmDatetime"]');
            slotsContainer.outerHTML = self._renderSlotsForDate(self.state.selectedDate);
            if (confirmBtn) confirmBtn.disabled = true;
          }
          break;
        case 'selectTimeslot':
          self.state.selectedTimeslot = {
            date: target.getAttribute('data-date'),
            start_time: target.getAttribute('data-time'),
            price: parseInt(target.getAttribute('data-price'), 10) || 0
          };
          var allSlots = container.querySelectorAll('[data-action="selectTimeslot"]');
          for (var si = 0; si < allSlots.length; si++) {
            if (allSlots[si] === target) allSlots[si].classList.add('selected');
            else allSlots[si].classList.remove('selected');
          }
          var dtBtn = container.querySelector('[data-action="confirmDatetime"]');
          if (dtBtn) dtBtn.disabled = false;
          self._refreshSidebar();
          break;
        case 'confirmDatetime':
          if (self.state.selectedTimeslot) self.goToStep('address');
          break;
        case 'confirmAddress':
          self.handleConfirmAddress();
          break;
        case 'submitBooking':
          self.handleSubmitBooking();
          break;
      }
    });

    var postalInput = container.querySelector('#zbw-postal');
    if (postalInput) {
      postalInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') self.handleCheckZip();
      });
      postalInput.focus();
    }

     var addrInput = container.querySelector('#zbw-addr1');
     if (addrInput) {
        addrInput.addEventListener('input', function() {
          var q = addrInput.value.trim();
          clearTimeout(self._acTimer);
          if (self._acAbort) { self._acAbort.abort(); self._acAbort = null; }
          var list = document.getElementById('zbw-ac-list');
          if (q.length < 3) { if (list) list.innerHTML = ''; return; }
          self._acTimer = setTimeout(function() {
            var ctrl = new AbortController();
            self._acAbort = ctrl;
            var prox = (self.state.postalLng && self.state.postalLat) ? self.state.postalLng + ',' + self.state.postalLat : 'ip';
            var base = String(self.apiUrl || '').replace(/[/]+$/, '');
            var endpoint = base + '/widget/address/search?q=' + encodeURIComponent(q) + '&proximity=' + encodeURIComponent(prox);
            fetch(endpoint, { signal: ctrl.signal, headers: { 'Accept': 'application/json' } })
              .then(function(r) {
                if (!r.ok) throw new Error('Address lookup failed');
                return r.json();
              })
              .then(function(data) {
                self._acAbort = null;
                if (!list) return;
                var features = Array.isArray(data.features) ? data.features : [];
                if (!features.length) { list.innerHTML = ''; return; }
                list.innerHTML = features.map(function(f, i) {
                  var p = f.properties;
                  var ctx = p.context || {};
                  return '<div class="zbw-ac-item" data-ac-idx="' + i + '">' +
                    '<div class="zbw-ac-main">' + (p.name || '') + '</div>' +
                    '<div class="zbw-ac-sub">' + (ctx.place ? ctx.place.name + ', ' : '') + (ctx.region ? ctx.region.region_code + ' ' : '') + (ctx.postcode ? ctx.postcode.name : '') + '</div>' +
                    '</div>';
                }).join('');
                self._acFeatures = features;
              })
              .catch(function(err) {
                self._acAbort = null;
                if (err && err.name === 'AbortError') return;
                if (list) {
                  list.innerHTML = '<div class="zbw-ac-item" style="pointer-events:none;opacity:.8;"><div class="zbw-ac-main">Address autocomplete unavailable</div><div class="zbw-ac-sub">Please try again in a moment.</div></div>';
                }
              });
          }, 300);
        });

      addrInput.addEventListener('blur', function() {
        setTimeout(function() {
          var list = document.getElementById('zbw-ac-list');
          if (list) list.innerHTML = '';
        }, 200);
      });

      container.addEventListener('click', function(e) {
        var item = e.target.closest('.zbw-ac-item');
        if (!item || !self._acFeatures) return;
        var idx = parseInt(item.getAttribute('data-ac-idx'), 10);
        var f = self._acFeatures[idx];
        if (!f) return;
        var p = f.properties;
        var ctx = p.context || {};
        var addr1 = document.getElementById('zbw-addr1');
        var city = document.getElementById('zbw-city');
        var prov = document.getElementById('zbw-prov');
        var postal = document.getElementById('zbw-postal2');
        if (addr1) addr1.value = p.name || '';
        if (city) city.value = ctx.place ? ctx.place.name : '';
        if (prov) prov.value = ctx.region ? ctx.region.region_code : '';
        if (postal) postal.value = ctx.postcode ? ctx.postcode.name : '';
        if (f.geometry && f.geometry.coordinates) {
          self.state.address.lat = f.geometry.coordinates[1];
          self.state.address.lng = f.geometry.coordinates[0];
        }
        self.readAddressFromDOM();
        var list = document.getElementById('zbw-ac-list');
        if (list) list.innerHTML = '';
      });
    }
  };

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // EXPOSE
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  window.GOATkitWidget = GOATkitWidget;

  if (typeof window.GOATkitConfig !== 'undefined') {
    window.goatkitInstance = new GOATkitWidget(window.GOATkitConfig);
  }
})();`;
var BOOKING_WIDGET_POPUP = `(function() {
  var API_URL = 'https://api.unclebike.xyz';
  var PRIMARY_COLOR = '#2563eb';
  var loaded = false;
  var overlay = null;

  function getConfig() {
    return window.GOATkitPopupConfig || {};
  }

  function createOverlay() {
    if (overlay) return overlay;
    var cfg = getConfig();
    var apiUrl = cfg.apiUrl || API_URL;
    var color = cfg.primaryColor || PRIMARY_COLOR;

    overlay = document.createElement('div');
    overlay.id = 'zbw-popup-overlay';
    overlay.innerHTML = '<div id="zbw-popup-backdrop"></div>' +
      '<div id="zbw-popup-container">' +
        '<button id="zbw-popup-close" aria-label="Close">&times;</button>' +
        '<div id="zbw-popup-widget"></div>' +
      '</div>';

    var style = document.createElement('style');
    style.textContent = '#zbw-popup-overlay{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center}' +
      '#zbw-popup-overlay.zbw-open{display:flex}' +
      '#zbw-popup-backdrop{position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5);backdrop-filter:blur(2px)}' +
      '#zbw-popup-container{position:relative;width:94vw;max-width:900px;max-height:min(90dvh,calc(100dvh - 24px));background:#fff;border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,.2);overflow-y:auto;padding:24px;z-index:1}' +
      '#zbw-popup-close{position:absolute;top:12px;right:16px;background:none;border:none;font-size:28px;cursor:pointer;color:#64748b;z-index:2;line-height:1;padding:4px 8px;border-radius:8px;transition:background .15s}' +
      '#zbw-popup-close:hover{background:#f1f5f9;color:#0f172a}' +
      '@media(max-width:640px){#zbw-popup-container{width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;border-radius:0;padding:calc(16px + env(safe-area-inset-top,0px)) calc(12px + env(safe-area-inset-right,0px)) calc(16px + env(safe-area-inset-bottom,0px)) calc(12px + env(safe-area-inset-left,0px))}}' +
      '[data-theme="dark"] #zbw-popup-backdrop{background:rgba(17,17,27,.7)}' +
      '[data-theme="dark"] #zbw-popup-container{background:#1e1e2e;box-shadow:0 24px 64px rgba(0,0,0,.5)}' +
      '[data-theme="dark"] #zbw-popup-close{color:#a6adc8}' +
      '[data-theme="dark"] #zbw-popup-close:hover{background:#313244;color:#cdd6f4}';
    document.head.appendChild(style);
    document.body.appendChild(overlay);

    overlay.querySelector('#zbw-popup-backdrop').addEventListener('click', closePopup);
    overlay.querySelector('#zbw-popup-close').addEventListener('click', closePopup);

    if (!loaded) {
      window.GOATkitConfig = {
        apiUrl: apiUrl,
        containerId: 'zbw-popup-widget',
        primaryColor: color,
        onComplete: function(booking) {
          if (cfg.onComplete) cfg.onComplete(booking);
          setTimeout(closePopup, 2500);
        },
        onError: function(err) { if (cfg.onError) cfg.onError(err); },
        onStepChange: function(step, idx) { if (cfg.onStepChange) cfg.onStepChange(step, idx); }
      };
      var s = document.createElement('script');
      s.src = apiUrl + '/widget/booking-widget.js';
      document.body.appendChild(s);
      loaded = true;
    }

    return overlay;
  }

  function syncPopupViewport() {
    if (!overlay) return;
    var vv = window.visualViewport;
    var viewportHeight = vv ? vv.height : window.innerHeight;
    var viewportTop = vv ? vv.offsetTop : 0;
    var keyboardBottomInset = vv ? Math.max(0, window.innerHeight - (vv.height + vv.offsetTop)) : 0;
    overlay.style.top = viewportTop + 'px';
    overlay.style.bottom = keyboardBottomInset + 'px';
    var container = overlay.querySelector('#zbw-popup-container');
    if (container) {
      var h = Math.max(260, Math.floor(viewportHeight - 24));
      container.style.maxHeight = h + 'px';
    }
  }

  function openPopup() {
    var el = createOverlay();
    el.classList.add('zbw-open');
    document.body.style.overflow = 'hidden';
    syncPopupViewport();
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncPopupViewport);
      window.visualViewport.addEventListener('scroll', syncPopupViewport);
    }
    window.addEventListener('orientationchange', syncPopupViewport);

    if (window.goatkitInstance) {
      window.goatkitInstance.state.currentStep = 'zip';
      window.goatkitInstance.state.stepHistory = ['zip'];
      window.goatkitInstance.state.error = null;
      window.goatkitInstance.state.loading = false;
      window.goatkitInstance.state.submitting = false;
      window.goatkitInstance.render();
    }
  }

  function closePopup() {
    if (overlay) {
      overlay.classList.remove('zbw-open');
      document.body.style.overflow = '';
      overlay.style.top = '';
      overlay.style.bottom = '';
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', syncPopupViewport);
        window.visualViewport.removeEventListener('scroll', syncPopupViewport);
      }
      window.removeEventListener('orientationchange', syncPopupViewport);
    }
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closePopup();
  });

  document.addEventListener('click', function(e) {
    var el = e.target.closest('[data-zbw-open], .zbw-book-btn');
    if (el) { e.preventDefault(); openPopup(); }
  });

  window.GOATkitPopup = { open: openPopup, close: closePopup };

  var cfg = getConfig();
  if (cfg.floatingButton !== false) {
    var ready = function() {
      var btn = document.createElement('button');
      btn.id = 'zbw-floating-btn';
      btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ' + (cfg.floatingButtonText || 'Book Now');
      var color = cfg.primaryColor || PRIMARY_COLOR;
      var s = document.createElement('style');
      s.textContent = '#zbw-floating-btn{position:fixed;bottom:24px;right:24px;z-index:9999;background:' + color + ';color:#fff;border:none;padding:14px 24px;border-radius:50px;font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 4px 16px rgba(0,0,0,.2);transition:transform .15s,box-shadow .15s}' +
        '#zbw-floating-btn:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(0,0,0,.25)}' +
        '#zbw-floating-btn svg{flex-shrink:0}' +
        '@media(max-width:640px){#zbw-floating-btn{bottom:16px;right:16px;padding:12px 20px;font-size:14px}}' +
        '[data-theme="dark"] #zbw-floating-btn{box-shadow:0 4px 16px rgba(0,0,0,.4)}' +
        '[data-theme="dark"] #zbw-floating-btn:hover{box-shadow:0 6px 24px rgba(0,0,0,.5)}';
      document.head.appendChild(s);
      document.body.appendChild(btn);
      btn.addEventListener('click', openPopup);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
    else ready();
  }
})();`;
var BOOKING_WIDGET_DEMO = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
  <title>Booking Widget Demo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; align-items: center; padding: 40px 20px; }
    .demo-header { text-align: center; margin-bottom: 32px; }
    .demo-header h1 { font-size: 28px; color: #0f172a; margin-bottom: 8px; }
    .demo-header p { color: #64748b; font-size: 15px; }
    #goatkit-widget { width: 100%; max-width: 900px; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,.08); padding: 32px; }
    .demo-code { max-width: 900px; width: 100%; margin-top: 40px; background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,.04); }
    .demo-code h3 { font-size: 16px; margin-bottom: 12px; color: #0f172a; }
    .demo-code pre { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; overflow-x: auto; font-size: 13px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="demo-header">
    <h1>Booking Widget</h1>
    <p>Embeddable booking widget for your website</p>
  </div>

  <div id="goatkit-widget"></div>

  <div class="demo-code">
    <h3>Embed on Your Site</h3>
    <pre><code>&lt;div id="goatkit-widget"&gt;&lt;/div&gt;

&lt;script&gt;
  window.GOATkitConfig = {
    apiUrl: 'https://api.unclebike.xyz',
    containerId: 'goatkit-widget',
    primaryColor: '#2563eb',
    onComplete: function(booking) {
      console.log('Booked:', booking);
    }
  };
&lt;/script&gt;
&lt;script src="https://api.unclebike.xyz/widget/booking-widget.js"&gt;&lt;/script&gt;</code></pre>
  </div>

  <script>
    window.GOATkitConfig = {
      apiUrl: window.location.origin,
      containerId: 'goatkit-widget',
      primaryColor: '#2563eb',
      onComplete: function(booking) {
        console.log('Booking completed:', booking);
      },
      onError: function(error) {
        console.error('Booking error:', error);
      },
      onStepChange: function(step, index) {
        console.log('Step:', step, 'Index:', index);
      }
    };
  <\/script>
  <script src="/widget/booking-widget.js"><\/script>
</body>
</html>`;

// src/index.ts
var app19 = new Hono2();
app19.onError((err, c) => {
  console.error("Unhandled error:", err.message, err.stack);
  return c.text(`Error: ${err.message}`, 500);
});
app19.use("/v1/*", cors());
app19.use("/widget/*", cors());
app19.get("/fonts/*", (c) => c.env.ASSETS.fetch(c.req.raw));
app19.get("/images/*", (c) => c.env.ASSETS.fetch(c.req.raw));
app19.get("/admin.js", (c) => c.env.ASSETS.fetch(c.req.raw));
app19.get("/admin.webmanifest", (c) => c.env.ASSETS.fetch(c.req.raw));
app19.get("/admin-sw.js", (c) => c.env.ASSETS.fetch(c.req.raw));
app19.get("/admin-offline.html", (c) => c.env.ASSETS.fetch(c.req.raw));
app19.use("/admin/*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-cache, no-store, must-revalidate");
  c.header("Pragma", "no-cache");
});
app19.use("*", authMiddleware);
app19.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
var getWidgetPrimaryColor = /* @__PURE__ */ __name(async (db) => {
  let primaryColor = "#2563eb";
  try {
    const row = await db.prepare("SELECT value FROM settings WHERE key = 'widget_branding'").first();
    if (row) {
      const branding = JSON.parse(row.value);
      if (branding.primaryColor) primaryColor = branding.primaryColor;
    }
  } catch {
  }
  return primaryColor;
}, "getWidgetPrimaryColor");
var normalizeWidgetFeature = /* @__PURE__ */ __name((f) => {
  const properties = f.properties || {};
  const context = properties.context || {};
  const rawRegion = context.region?.region_code || "";
  const normalizedRegion = rawRegion.startsWith("CA-") ? rawRegion.slice(3) : rawRegion;
  return {
    properties: {
      full_address: properties.full_address || "",
      name: properties.name || "",
      context: {
        place: { name: context.place?.name || "" },
        region: { region_code: normalizedRegion },
        postcode: { name: context.postcode?.name || "" }
      }
    },
    geometry: {
      coordinates: Array.isArray(f.geometry?.coordinates) ? f.geometry.coordinates : [0, 0]
    }
  };
}, "normalizeWidgetFeature");
var normalizeProximity = /* @__PURE__ */ __name((raw2) => {
  if (!raw2) return "ip";
  if (raw2 === "ip") return "ip";
  if (/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(raw2)) return raw2;
  return "ip";
}, "normalizeProximity");
app19.get("/widget/booking-widget.js", async (c) => {
  const primaryColor = await getWidgetPrimaryColor(c.env.DB);
  const js = BOOKING_WIDGET_JS.replace(/'#2563eb'/g, `'${primaryColor}'`);
  return c.text(js, 200, {
    "Content-Type": "application/javascript",
    "Cache-Control": "no-cache, must-revalidate"
  });
});
app19.get("/widget/popup.js", async (c) => {
  const primaryColor = await getWidgetPrimaryColor(c.env.DB);
  const js = BOOKING_WIDGET_POPUP.replace(/'#2563eb'/g, `'${primaryColor}'`);
  return c.text(js, 200, {
    "Content-Type": "application/javascript",
    "Cache-Control": "no-cache, must-revalidate"
  });
});
app19.get("/widget/branding.js", async (c) => {
  const primaryColor = await getWidgetPrimaryColor(c.env.DB);
  const js = `(function(){var c='${primaryColor}';document.documentElement.style.setProperty('--brand-color',c);window.GOATkitBranding={primaryColor:c};var cfg=window.GOATkitPopupConfig;if(cfg)cfg.primaryColor=c;})();`;
  return c.text(js, 200, {
    "Content-Type": "application/javascript",
    "Cache-Control": "no-cache, must-revalidate"
  });
});
app19.get("/widget/demo", async (c) => {
  const primaryColor = await getWidgetPrimaryColor(c.env.DB);
  const html2 = BOOKING_WIDGET_DEMO.replace(/'#2563eb'/g, `'${primaryColor}'`);
  return c.html(html2);
});
app19.get("/widget/address/search", async (c) => {
  const q = (c.req.query("q") || "").trim();
  const proximity = normalizeProximity((c.req.query("proximity") || "").trim());
  if (q.length < 3) {
    return c.json({ features: [] });
  }
  const token = c.env.MAPBOX_ACCESS_TOKEN || "";
  if (!token) {
    return c.json({ features: [] });
  }
  try {
    const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(q)}&country=ca&types=address&limit=5&proximity=${encodeURIComponent(proximity)}&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    if (!res.ok) {
      return c.json({ features: [] });
    }
    const data = await res.json();
    const features = (data.features || []).map(normalizeWidgetFeature);
    return c.json({ features });
  } catch {
    return c.json({ features: [] });
  }
});
var api = new Hono2();
api.route("/territories", territories_default);
api.route("/scheduling", scheduling_default);
api.route("/services", services_default);
api.route("/categories", categories_default);
api.route("/modifiers", modifiers_default);
api.route("/customers", customers_default);
api.route("/team", team_default);
api.route("/skills", skills_default);
api.route("/jobs", jobs_default);
api.route("/recurring-bookings", recurring_bookings_default);
api.route("/invoices", invoices_default);
api.route("/transactions", transactions_default);
api.route("/coupons", coupons_default);
api.route("/webhooks", webhooks_default);
api.route("/bookings", bookings_default);
api.route("/messages", messages_default);
app19.route("/v1", api);
app19.route("/webhooks/twilio", twilio_webhooks_default);
app19.route("/admin", admin_default);
async function sendReminders(db) {
  const { sendJobSms: sendJobSms2, isTwilioEnabled: isTwilioEnabled2 } = await Promise.resolve().then(() => (init_twilio(), twilio_exports));
  if (!await isTwilioEnabled2(db)) return;
  const now = /* @__PURE__ */ new Date();
  const eastern = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" }));
  const todayStr = eastern.toISOString().split("T")[0];
  const tomorrow = new Date(eastern);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const jobs = await db.prepare(
    `SELECT j.id, j.customer_id, j.scheduled_date, j.scheduled_start_time, j.total_price_cents,
            c.first_name, c.last_name,
            COALESCE(s.name, j.custom_service_name, 'Service') as service_name
     FROM jobs j
     JOIN customers c ON c.id = j.customer_id
     LEFT JOIN services s ON s.id = j.service_id
     WHERE j.status IN ('created', 'assigned')
       AND j.scheduled_date IN (?, ?)
       AND c.sms_consent = 1
       AND c.sms_opted_out = 0
       AND c.phone_e164 IS NOT NULL`
  ).bind(todayStr, tomorrowStr).all();
  for (const job of jobs.results || []) {
    const eventType = job.scheduled_date === todayStr ? "reminder.morning_of" : "reminder.day_before";
    const vars = {
      first_name: job.first_name,
      last_name: job.last_name,
      service_name: job.service_name,
      date: job.scheduled_date,
      time: job.scheduled_start_time,
      total: (job.total_price_cents / 100).toFixed(2)
    };
    await sendJobSms2({
      db,
      jobId: job.id,
      customerId: job.customer_id,
      eventType,
      vars,
      skipQuietHours: true
    });
  }
}
__name(sendReminders, "sendReminders");
var index_default = {
  fetch: app19.fetch,
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendReminders(env.DB));
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
