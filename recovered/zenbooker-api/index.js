var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __template = (cooked, raw2) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw2 || cooked.slice()) }));

// ../node_modules/hono/dist/compose.js
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

// ../node_modules/hono/dist/http-exception.js
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

// ../node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// ../node_modules/hono/dist/utils/body.js
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

// ../node_modules/hono/dist/utils/url.js
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

// ../node_modules/hono/dist/request.js
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

// ../node_modules/hono/dist/utils/html.js
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

// ../node_modules/hono/dist/context.js
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

// ../node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// ../node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// ../node_modules/hono/dist/hono-base.js
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
  route(path, app19) {
    const subApp = this.basePath(path);
    app19.routes.map((r) => {
      let handler;
      if (app19.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app19.errorHandler)(c, () => r.handler(c, next))).res, "handler");
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

// ../node_modules/hono/dist/router/reg-exp-router/matcher.js
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

// ../node_modules/hono/dist/router/reg-exp-router/node.js
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

// ../node_modules/hono/dist/router/reg-exp-router/trie.js
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

// ../node_modules/hono/dist/router/reg-exp-router/router.js
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

// ../node_modules/hono/dist/router/smart-router/router.js
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

// ../node_modules/hono/dist/router/trie-router/node.js
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

// ../node_modules/hono/dist/router/trie-router/router.js
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

// ../node_modules/hono/dist/hono.js
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

// ../node_modules/hono/dist/middleware/cors/index.js
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

// ../node_modules/hono/dist/helper/factory/index.js
var createMiddleware = /* @__PURE__ */ __name((middleware) => middleware, "createMiddleware");

// src/middleware/auth.ts
var PUBLIC_PATHS = [
  "/health",
  "/v1/scheduling/service_area_check",
  "/v1/scheduling/timeslots",
  "/v1/services",
  "/v1/coupons/validate",
  "/v1/bookings/create",
  "/v1/messages/submit",
  "/widget/"
];
function isPublicPath(path) {
  return PUBLIC_PATHS.some(
    (publicPath) => path === publicPath || path.startsWith(publicPath + "/") || path.startsWith(publicPath)
  );
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
      const looksLikeLatLng = Math.abs(a) <= 90 && Math.abs(b) <= 180;
      const looksLikeLngLat = Math.abs(a) <= 180 && Math.abs(b) <= 90;
      if (looksLikeLngLat && !looksLikeLatLng) {
        return { lat: b, lng: a };
      }
      if (looksLikeLatLng && looksLikeLngLat) {
        if (a < 0 && b > 0) return { lat: b, lng: a };
        if (a > 0 && b < 0) return { lat: a, lng: b };
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

// ../node_modules/hono/dist/helper/html/index.js
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

// ../node_modules/hono/dist/jsx/constants.js
var DOM_RENDERER = /* @__PURE__ */ Symbol("RENDERER");
var DOM_ERROR_HANDLER = /* @__PURE__ */ Symbol("ERROR_HANDLER");
var DOM_STASH = /* @__PURE__ */ Symbol("STASH");
var DOM_INTERNAL_TAG = /* @__PURE__ */ Symbol("INTERNAL");
var DOM_MEMO = /* @__PURE__ */ Symbol("MEMO");
var PERMALINK = /* @__PURE__ */ Symbol("PERMALINK");

// ../node_modules/hono/dist/jsx/dom/utils.js
var setInternalTagFlag = /* @__PURE__ */ __name((fn) => {
  ;
  fn[DOM_INTERNAL_TAG] = true;
  return fn;
}, "setInternalTagFlag");

// ../node_modules/hono/dist/jsx/dom/context.js
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

// ../node_modules/hono/dist/jsx/context.js
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

// ../node_modules/hono/dist/jsx/intrinsic-element/common.js
var deDupeKeyMap = {
  title: [],
  script: ["src"],
  style: ["data-href"],
  link: ["href"],
  meta: ["name", "httpEquiv", "charset", "itemProp"]
};
var domRenderers = {};
var dataPrecedenceAttr = "data-precedence";

// ../node_modules/hono/dist/jsx/intrinsic-element/components.js
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

// ../node_modules/hono/dist/jsx/children.js
var toArray = /* @__PURE__ */ __name((children) => Array.isArray(children) ? children : [children], "toArray");

// ../node_modules/hono/dist/jsx/intrinsic-element/components.js
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

// ../node_modules/hono/dist/jsx/utils.js
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

// ../node_modules/hono/dist/jsx/base.js
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

// ../node_modules/hono/dist/jsx/dom/intrinsic-element/components.js
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

// ../node_modules/hono/dist/jsx/dom/render.js
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

// ../node_modules/hono/dist/jsx/hooks/index.js
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

// ../node_modules/hono/dist/jsx/dom/hooks/index.js
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

// ../node_modules/hono/dist/jsx/dom/intrinsic-element/components.js
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

// ../node_modules/hono/dist/jsx/dom/jsx-dev-runtime.js
var jsxDEV = /* @__PURE__ */ __name((tag, props, key) => {
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
var Fragment2 = /* @__PURE__ */ __name((props) => jsxDEV("", props, void 0), "Fragment");

// ../node_modules/hono/dist/jsx/dom/components.js
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

// ../node_modules/hono/dist/jsx/streaming.js
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

// ../node_modules/hono/dist/jsx/components.js
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

// src/views/layout.tsx
var _a, _b, _c;
var Layout = /* @__PURE__ */ __name(({ title: title3, children }) => {
  return /* @__PURE__ */ jsx("html", { lang: "en" }, /* @__PURE__ */ jsx("head", null, /* @__PURE__ */ jsx("meta", { charset: "UTF-8" }), /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" }), /* @__PURE__ */ jsx("title", null, title3, " - Zenbooker Admin"), html`<style data-fodt>body{opacity:0}body.ready{opacity:1;transition:opacity .1s}</style>`, /* @__PURE__ */ jsx("script", { src: "https://unpkg.com/htmx.org@1.9.10" }), /* @__PURE__ */ jsx("link", { rel: "stylesheet", href: "https://unpkg.com/franken-ui@2.1.2/dist/css/core.min.css" }), /* @__PURE__ */ jsx("script", { src: "https://unpkg.com/franken-ui@2.1.2/dist/js/core.iife.js" }), /* @__PURE__ */ jsx("script", { src: "https://cdn.tailwindcss.com/3.4.17" }), html(_a || (_a = __template([`<script>tailwind.config = { corePlugins: { preflight: false } };
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
<\/script>`]))), /* @__PURE__ */ jsx("link", { rel: "stylesheet", href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" }), /* @__PURE__ */ jsx("script", { src: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" }), /* @__PURE__ */ jsx("link", { rel: "stylesheet", href: "https://unpkg.com/@geoman-io/leaflet-geoman-free@2.17.0/dist/leaflet-geoman.css" }), /* @__PURE__ */ jsx("script", { src: "https://unpkg.com/@geoman-io/leaflet-geoman-free@2.17.0/dist/leaflet-geoman.js" }), html(_b || (_b = __template([`<script>
/* --- Named handlers for proper cleanup --- */
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
    function toLL(p) { return Array.isArray(p) ? p : [p.lat, p.lng]; }
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
      if (h) h.value = coords.length ? JSON.stringify(coords) : '';
      var c = document.getElementById('gf-count');
      if (c) c.textContent = coords.length + ' pts';
    }

    function enableEdit() {
      if (poly) poly.pm.enable({ allowSelfIntersection: false });
    }

    function loadExisting() {
      if (pts.length >= 3) {
        poly = L.polygon(pts.map(toLL), { color: '#0f3460', fillColor: '#0f3460', fillOpacity: 0.12 }).addTo(map);
        map.fitBounds(poly.getBounds().pad(0.1));
        enableEdit();
        poly.on('pm:edit', syncToHidden);
        poly.on('pm:vertexremoved', syncToHidden);
        syncToHidden();
      }
    }
    loadExisting();

    map.pm.addControls({ position: 'topleft', drawMarker: false, drawCircleMarker: false, drawPolyline: false, drawRectangle: false, drawPolygon: false, drawCircle: false, drawText: false, editMode: false, dragMode: false, cutPolygon: false, removalMode: false, rotateMode: false });
    map.pm.setGlobalOptions({ pathOptions: { color: '#0f3460', fillColor: '#0f3460', fillOpacity: 0.12 } });

    var drawBtn = document.getElementById('gf-draw-btn');
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
}

document.addEventListener('htmx:beforeCleanupElement', function(e) {
  var el = e.detail.elt;
  if (el.id === 'radius-map' && window._radiusMap) {
    /* Remove named input listeners to prevent leaks */
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
    var ids = { 'addr-line1': d.line1, 'addr-city': d.city, 'addr-state': d.state, 'addr-postal': d.postal, 'addr-lat': d.lat, 'addr-lng': d.lng };
    for (var id in ids) { var el = document.getElementById(id); if (el) el.value = ids[id]; }
    var ar = document.getElementById('address-results');
    if (ar) ar.innerHTML = '';
  }
});

document.addEventListener('htmx:afterSettle', function() { setTimeout(initMaps, 50); });
document.addEventListener('DOMContentLoaded', function() { setTimeout(initMaps, 100); });

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
        <\/script>`]))), /* @__PURE__ */ jsx("style", null, `
          *, *::before, *::after { box-sizing: border-box; }
          html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; overscroll-behavior: none; -webkit-font-smoothing: antialiased; }

          @layer base {
            input, select, textarea, button { font-size: 16px; }
            input[type="time"], input[type="date"] { -webkit-appearance: none; appearance: none; }
          }
          /* Custom arrow only for selects NOT styled by Franken UI */
          select:not(.uk-select) { -webkit-appearance: none; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23666' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px; }
          /* Safari: disable tap delay + double-tap zoom on interactive elements */
          a, button, input, select, textarea, label, [role="switch"], [hx-post], [hx-get], [hx-delete] { touch-action: manipulation; }
          /* Safari: smooth momentum scrolling */
          .main-content { -webkit-overflow-scrolling: touch; }
          /* Safari: safe area for notch/home indicator */
          body { padding-env: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }

          .admin-layout { min-height: 100vh; min-height: 100dvh; }

          .desktop-sidebar { display: none; }

          .main-content { flex: 1; padding: 0; min-height: 100vh; min-height: 100dvh; }
          .page-header { background: white; padding: 20px 32px 20px 52px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center; position: -webkit-sticky; position: sticky; top: 0; z-index: 50; }
          .page-header h2 { font-size: 22px; color: #1a1a2e; font-weight: 600; letter-spacing: -0.3px; }
          .page-body { padding: 28px 32px; }

          @media (min-width: 1024px) {
            .admin-layout { display: flex; }
            .desktop-sidebar { display: flex; flex-direction: column; width: 260px; min-width: 260px; background: #1a1a2e; min-height: 100vh; min-height: 100dvh; position: sticky; top: 0; height: 100vh; height: 100dvh; overflow-y: auto; padding: 24px 0; }
            .mobile-menu-btn { display: none !important; }
            .page-header { padding-left: 32px; }
          }

           table { width: 100%; border-collapse: collapse; }

           .leaflet-container img,
           .leaflet-container .leaflet-tile {
             max-width: none !important;
             max-height: none !important;
           }

           .search-box { position: relative; }
           .search-box input { padding-left: 36px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23999' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.242.656a5 5 0 1 1 0-10 5 5 0 0 1 0 10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: 12px center; }
           .search-results { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; max-height: 240px; overflow-y: auto; z-index: 100; box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
           .search-item { padding: 10px 16px; cursor: pointer; border-bottom: 1px solid #f5f5f5; font-size: 14px; }
           .search-item:hover { background: #f5f7ff; }
           .search-item .name { font-weight: 500; }
          .search-item .meta { font-size: 12px; color: #888; margin-top: 2px; }

          .avatar { width: 40px; height: 40px; border-radius: 50%; background: #0f3460; color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 15px; flex-shrink: 0; }
          .avatar-sm { width: 32px; height: 32px; font-size: 13px; }

          .save-indicator { font-size: 12px; font-weight: 500; transition: opacity 0.3s; opacity: 0; margin-left: 8px; }
          .save-ok { color: #16a34a; }
          .save-err { color: #dc2626; }
          .save-pending { color: #888; }
          .autosave .save-indicator, #territory-services .save-indicator, #territory-providers .save-indicator { display: inline-block; }

          .delete-btn { color: #dc2626; background: none; border: 1px solid #fca5a5; padding: 6px 14px; border-radius: 7px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s; }
          .delete-btn:hover { background: #fef2f2; border-color: #dc2626; }

          .mobile-menu-btn { display: flex; align-items: center; justify-content: center; background: none; border: none; color: #1a1a2e; padding: 8px; cursor: pointer; position: fixed; top: 12px; left: 12px; z-index: 100; }

          /* --- Sidebar nav dark theme --- */
          .sidebar-nav { padding: 0 4px; }
          .sidebar-nav .uk-nav-header { color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; padding: 16px 12px 6px; margin: 0; }
          .sidebar-nav .uk-nav-header:first-child { padding-top: 4px; }
          .sidebar-nav .uk-nav-divider { border-color: rgba(255,255,255,0.08); margin: 8px 12px; }
          .sidebar-nav > li > a { color: #8a8fa8; padding: 8px 12px; border-radius: 6px; font-size: 14px; font-weight: 450; transition: all 0.15s; display: block; text-decoration: none; }
          .sidebar-nav > li > a:hover { color: #e0e0e0; background: rgba(255,255,255,0.06); }
          .sidebar-nav > li.uk-active > a { color: #fff; background: rgba(255,255,255,0.1); font-weight: 500; }

          @media (max-width: 768px) {
            .page-header { padding: 14px 16px 14px 52px; gap: 8px; flex-wrap: wrap; }
            .page-header h2 { font-size: 18px; }
            .page-body { padding: 16px; }
          }
        `)), /* @__PURE__ */ jsx("body", null, /* @__PURE__ */ jsx("div", { id: "offcanvas-nav", "data-uk-offcanvas": "mode: slide; overlay: true" }, /* @__PURE__ */ jsx("div", { class: "uk-offcanvas-bar", style: "background: #1a1a2e; width: 260px;" }, /* @__PURE__ */ jsx("button", { class: "uk-offcanvas-close", type: "button", "data-uk-close": true, style: "color: white;" }), /* @__PURE__ */ jsx("h1", { style: "font-size: 18px; margin-bottom: 24px; color: #eee; padding: 0 16px; letter-spacing: -0.3px;" }, "Uncle Bike"), /* @__PURE__ */ jsx("ul", { class: "uk-nav uk-nav-default sidebar-nav", "data-uk-nav": true }, /* @__PURE__ */ jsx("li", { class: "uk-nav-header" }, "Overview"), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin", "hx-get": "/admin", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Dashboard")), /* @__PURE__ */ jsx("li", { class: "uk-nav-divider" }), /* @__PURE__ */ jsx("li", { class: "uk-nav-header" }, "Operations"), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/inbox", "hx-get": "/admin/inbox", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Inbox")), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/jobs", "hx-get": "/admin/jobs", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Jobs")), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/customers", "hx-get": "/admin/customers", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Customers")), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/recurring", "hx-get": "/admin/recurring", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Recurring")), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/invoices", "hx-get": "/admin/invoices", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Invoices")), /* @__PURE__ */ jsx("li", { class: "uk-nav-divider" }), /* @__PURE__ */ jsx("li", { class: "uk-nav-header" }, "Setup"), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/territories", "hx-get": "/admin/territories", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Territories")), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/services", "hx-get": "/admin/services", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Services")), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/team", "hx-get": "/admin/team", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Team")), /* @__PURE__ */ jsx("li", { class: "uk-nav-divider" }), /* @__PURE__ */ jsx("li", { class: "uk-nav-header" }, "Config"), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/branding", "hx-get": "/admin/branding", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Branding")), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/coupons", "hx-get": "/admin/coupons", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Coupons")), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/webhooks", "hx-get": "/admin/webhooks", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Webhooks")), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/settings", "hx-get": "/admin/settings", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Settings"))))), /* @__PURE__ */ jsx("div", { class: "admin-layout" }, /* @__PURE__ */ jsx("aside", { class: "desktop-sidebar" }, /* @__PURE__ */ jsx("h1", { style: "font-size: 18px; margin-bottom: 24px; color: #eee; padding: 0 20px; letter-spacing: -0.3px;" }, "Uncle Bike"), /* @__PURE__ */ jsx("ul", { class: "uk-nav uk-nav-default sidebar-nav", "data-uk-nav": true }, /* @__PURE__ */ jsx("li", { class: "uk-nav-header" }, "Overview"), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin", "hx-get": "/admin", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Dashboard")), /* @__PURE__ */ jsx("li", { class: "uk-nav-divider" }), /* @__PURE__ */ jsx("li", { class: "uk-nav-header" }, "Operations"), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/inbox", "hx-get": "/admin/inbox", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Inbox")), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/jobs", "hx-get": "/admin/jobs", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Jobs")), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/customers", "hx-get": "/admin/customers", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Customers")), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/recurring", "hx-get": "/admin/recurring", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Recurring")), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/invoices", "hx-get": "/admin/invoices", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Invoices")), /* @__PURE__ */ jsx("li", { class: "uk-nav-divider" }), /* @__PURE__ */ jsx("li", { class: "uk-nav-header" }, "Setup"), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/territories", "hx-get": "/admin/territories", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Territories")), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/services", "hx-get": "/admin/services", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Services")), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/team", "hx-get": "/admin/team", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Team")), /* @__PURE__ */ jsx("li", { class: "uk-nav-divider" }), /* @__PURE__ */ jsx("li", { class: "uk-nav-header" }, "Config"), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/branding", "hx-get": "/admin/branding", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Branding")), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/coupons", "hx-get": "/admin/coupons", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Coupons")), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/webhooks", "hx-get": "/admin/webhooks", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Webhooks")), /* @__PURE__ */ jsx("li", null, /* @__PURE__ */ jsx("a", { href: "/admin/settings", "hx-get": "/admin/settings", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Settings")))), /* @__PURE__ */ jsx("main", { class: "main-content", id: "main-content" }, /* @__PURE__ */ jsx("button", { type: "button", class: "mobile-menu-btn", "data-uk-toggle": "target: #offcanvas-nav", "aria-label": "Open menu" }, /* @__PURE__ */ jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2" }, /* @__PURE__ */ jsx("title", null, "Menu"), /* @__PURE__ */ jsx("line", { x1: "3", y1: "6", x2: "21", y2: "6" }), /* @__PURE__ */ jsx("line", { x1: "3", y1: "12", x2: "21", y2: "12" }), /* @__PURE__ */ jsx("line", { x1: "3", y1: "18", x2: "21", y2: "18" }))), /* @__PURE__ */ jsx("div", { id: "page-content" }, children))), html(_c || (_c = __template(["<script>requestAnimationFrame(function(){requestAnimationFrame(function(){document.body.classList.add('ready')})})<\/script>"])))));
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
var TableView = /* @__PURE__ */ __name(({ title: title3, columns, rows, createUrl, detailUrlPrefix, deleteUrlPrefix, rawIds }) => /* @__PURE__ */ jsx(Layout, { title: title3 }, /* @__PURE__ */ jsx("div", { class: "flex items-center justify-between px-8 py-5 bg-white border-b border-border sticky top-0 z-50" }, /* @__PURE__ */ jsx("h2", { class: "text-xl font-semibold" }, title3), createUrl && /* @__PURE__ */ jsx("a", { href: createUrl, class: "uk-btn uk-btn-default", "hx-get": createUrl, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "+ Create New")), /* @__PURE__ */ jsx("div", { class: "p-8" }, /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", null, rows.length === 0 ? /* @__PURE__ */ jsx("div", { class: "text-center py-12 text-muted-foreground" }, /* @__PURE__ */ jsx("p", { class: "mb-4 text-sm" }, "No ", title3.toLowerCase(), " found."), createUrl && /* @__PURE__ */ jsx("a", { href: createUrl, class: "uk-btn uk-btn-default", "hx-get": createUrl, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Create your first")) : /* @__PURE__ */ jsx("div", { class: "uk-overflow-auto" }, /* @__PURE__ */ jsx("table", { class: "uk-table uk-table-divider uk-table-hover uk-table-sm w-full text-sm" }, /* @__PURE__ */ jsx("thead", null, /* @__PURE__ */ jsx("tr", { class: "border-b border-border" }, columns.map((col) => /* @__PURE__ */ jsx("th", { class: "text-left py-3 px-4 font-medium text-muted-foreground", key: col }, col)), /* @__PURE__ */ jsx("th", { class: "text-left py-3 px-4 font-medium text-muted-foreground", style: "width: 100px;" }, "Actions"))), /* @__PURE__ */ jsx("tbody", null, rows.map((row, i) => {
  const displayId = typeof row.id === "string" ? row.id : "";
  const actualId = rawIds ? rawIds[i] : displayId;
  const values = Object.values(row);
  const detailUrl = detailUrlPrefix ? `${detailUrlPrefix}/${actualId}` : null;
  return /* @__PURE__ */ jsx("tr", { class: "border-b border-border hover:bg-muted/50 transition-colors", key: i, style: detailUrl ? "cursor: pointer;" : "" }, values.map((val, j) => /* @__PURE__ */ jsx("td", { class: "py-3 px-4", key: j }, j === 0 && detailUrl ? /* @__PURE__ */ jsx(
    "a",
    {
      href: detailUrl,
      "hx-get": detailUrl,
      "hx-target": "#page-content",
      "hx-select": "#page-content",
      "hx-push-url": "true",
      class: "uk-link font-medium text-primary hover:underline",
      "data-uk-tooltip": typeof val === "string" && val.length === 8 ? `title: ${actualId}` : void 0
    },
    val
  ) : isBadgeStatus(val) ? /* @__PURE__ */ jsx(StatusBadge, { status: val.toLowerCase() }) : val)), /* @__PURE__ */ jsx("td", { class: "py-3 px-4" }, /* @__PURE__ */ jsx("div", { class: "flex items-center gap-2" }, detailUrl && /* @__PURE__ */ jsx("a", { href: detailUrl, class: "uk-btn uk-btn-default uk-btn-sm", "hx-get": detailUrl, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "View"), deleteUrlPrefix && /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      class: "delete-btn",
      "hx-post": `${deleteUrlPrefix}/${actualId}/delete`,
      "hx-confirm": "Are you sure you want to delete this?",
      "hx-target": "closest tr",
      "hx-swap": "delete swap:300ms"
    },
    "Delete"
  ))));
})))))))), "TableView");
var renderField = /* @__PURE__ */ __name((field) => {
  const baseProps = {
    id: field.name,
    name: field.name,
    required: field.required,
    placeholder: field.placeholder
  };
  switch (field.type) {
    case "textarea":
      return /* @__PURE__ */ jsx("textarea", { ...baseProps, rows: 4, class: "uk-textarea" }, field.value || "");
    case "select":
      return /* @__PURE__ */ jsx("select", { ...baseProps, class: "uk-select" }, /* @__PURE__ */ jsx("option", { value: "" }, "Select..."), (field.options || []).map((opt) => /* @__PURE__ */ jsx("option", { key: opt.value, value: opt.value, selected: field.value === opt.value }, opt.label)));
    case "checkbox":
      return /* @__PURE__ */ jsx("div", { class: "flex items-center gap-2" }, /* @__PURE__ */ jsx(
        "input",
        {
          type: "checkbox",
          id: field.name,
          name: field.name,
          checked: Boolean(field.value),
          class: "uk-checkbox"
        }
      ), /* @__PURE__ */ jsx("label", { for: field.name, class: "text-sm" }, field.label));
    case "number":
      return /* @__PURE__ */ jsx(
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
    default:
      return /* @__PURE__ */ jsx(
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
var FormView = /* @__PURE__ */ __name(({ title: title3, fields, submitUrl, cancelUrl, isEdit, deleteUrl }) => /* @__PURE__ */ jsx(Layout, { title: title3 }, /* @__PURE__ */ jsx("div", { class: "flex items-center justify-between px-8 py-5 bg-white border-b border-border" }, /* @__PURE__ */ jsx("h2", { class: "text-xl font-semibold" }, title3)), /* @__PURE__ */ jsx("div", { class: "p-8" }, /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body", style: "max-width: 720px;" }, /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("form", { class: "form", "hx-post": submitUrl, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": cancelUrl }, /* @__PURE__ */ jsx("div", { class: "grid gap-4 sm:grid-cols-2" }, fields.map((field) => {
  if (field.type === "checkbox") {
    const isChecked = Boolean(field.value);
    return /* @__PURE__ */ jsx("label", { class: "uk-form-label flex items-center gap-2 cursor-pointer sm:col-span-2", key: field.name }, /* @__PURE__ */ jsx("input", { type: "checkbox", name: field.name, checked: isChecked, role: "switch", "aria-checked": isChecked ? "true" : "false", class: "uk-toggle-switch uk-toggle-switch-primary" }), field.label);
  }
  const wide = field.type === "textarea" || field.type === "select";
  return /* @__PURE__ */ jsx("div", { class: `grid gap-2${wide ? " sm:col-span-2" : ""}`, key: field.name }, /* @__PURE__ */ jsx("label", { for: field.name, class: "uk-form-label" }, field.label, field.required && " *"), renderField(field));
})), /* @__PURE__ */ jsx("div", { class: "flex items-center gap-3 mt-6 sm:col-span-2" }, /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-primary" }, isEdit ? "Update" : "Create"), /* @__PURE__ */ jsx("a", { href: cancelUrl, class: "uk-btn uk-btn-default", "hx-get": cancelUrl, "hx-target": "#page-content", "hx-push-url": "true" }, "Cancel"), deleteUrl && /* @__PURE__ */ jsx("button", { type: "button", class: "delete-btn", "hx-post": deleteUrl, "hx-confirm": "Are you sure? This cannot be undone.", style: "margin-left: auto;" }, "Delete"))))))), "FormView");
var StatusBadge = /* @__PURE__ */ __name(({ status }) => {
  const normalizedStatus = status.toLowerCase();
  const classMap = {
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
  const labelMap = {
    active: "\u2713",
    inactive: "\u2717"
  };
  const label = labelMap[normalizedStatus] || normalizedStatus.replace("_", " ");
  return /* @__PURE__ */ jsx("span", { class: classMap[normalizedStatus] || "uk-label" }, label);
}, "StatusBadge");

// src/views/branding.tsx
var BrandingPage = /* @__PURE__ */ __name(({ primaryColor }) => {
  const initialColor = /^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : "#2563eb";
  return /* @__PURE__ */ jsx(Layout, { title: "Branding" }, /* @__PURE__ */ jsx("div", { class: "flex items-center justify-between px-8 py-5 bg-white border-b border-border sticky top-0 z-50" }, /* @__PURE__ */ jsx("h2", { class: "text-xl font-semibold" }, "Branding")), /* @__PURE__ */ jsx("div", { class: "p-8" }, /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", { id: "branding-settings" }, /* @__PURE__ */ jsx(
    "form",
    {
      class: "autosave",
      "hx-post": "/admin/branding",
      "hx-swap": "none",
      "hx-trigger": "input delay:500ms, change",
      "hx-sync": "this:queue last"
    },
    /* @__PURE__ */ jsx("div", { class: "flex items-center justify-between mb-4" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold" }, "Widget Appearance"), /* @__PURE__ */ jsx("span", { class: "save-indicator" })),
    /* @__PURE__ */ jsx("div", { class: "grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-end" }, /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "widget-primary-color" }, "Widget Primary Colour"), /* @__PURE__ */ jsx(
      "input",
      {
        id: "widget-primary-color",
        name: "primaryColor",
        type: "color",
        class: "uk-input",
        value: initialColor
      }
    )), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "widget-primary-color-text" }, "Hex Value"), /* @__PURE__ */ jsx(
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
    ))),
    /* @__PURE__ */ jsx("div", { class: "mt-6 grid gap-3" }, /* @__PURE__ */ jsx("span", { class: "uk-form-label mb-0" }, "Live Preview"), /* @__PURE__ */ jsx(
      "button",
      {
        id: "widget-primary-color-preview",
        type: "button",
        class: "uk-btn uk-btn-primary",
        style: `background:${initialColor};border-color:${initialColor};`
      },
      "Book Now"
    ), /* @__PURE__ */ jsx("p", { class: "text-sm text-muted-foreground mb-0" }, "This is how your booking widget buttons will look."))
  )))), /* @__PURE__ */ jsx("script", null, `
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
      `));
}, "BrandingPage");

// src/views/message-detail.tsx
var sourceBadge = /* @__PURE__ */ __name((source) => {
  const cls = {
    contact: "uk-label uk-label-primary",
    newsletter: "uk-label uk-label-secondary",
    registration: "uk-label"
  };
  return /* @__PURE__ */ jsx("span", { class: cls[source] || "uk-label" }, source);
}, "sourceBadge");
var statusBadge = /* @__PURE__ */ __name((status) => {
  const cls = {
    new: "uk-label uk-label-destructive",
    read: "uk-label uk-label-secondary",
    replied: "uk-label uk-label-primary",
    archived: "uk-label"
  };
  return /* @__PURE__ */ jsx("span", { class: cls[status] || "uk-label" }, status);
}, "statusBadge");
var formatDate = /* @__PURE__ */ __name((d) => {
  if (!d) return "-";
  const date = /* @__PURE__ */ new Date(d + "Z");
  return date.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}, "formatDate");
var MessageDetailPage = /* @__PURE__ */ __name(({ message }) => {
  const meta3 = message.metadata ? JSON.parse(message.metadata) : null;
  const senderName = [message.first_name, message.last_name].filter(Boolean).join(" ") || message.email || "Unknown";
  return /* @__PURE__ */ jsx(Layout, { title: `Message \u2014 ${senderName}` }, /* @__PURE__ */ jsx("div", { class: "flex items-center justify-between px-8 py-5 bg-white border-b border-border sticky top-0 z-50" }, /* @__PURE__ */ jsx("div", { class: "flex items-center gap-3" }, /* @__PURE__ */ jsx("h2", { class: "text-xl font-semibold" }, message.subject || "No Subject"), sourceBadge(message.source), statusBadge(message.status)), /* @__PURE__ */ jsx("div", { class: "flex items-center gap-2" }, message.status !== "archived" && /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      class: "uk-btn uk-btn-default uk-btn-sm",
      "hx-post": `/admin/inbox/${message.id}/archive`,
      "hx-target": "#page-content",
      "hx-select": "#page-content"
    },
    "Archive"
  ), /* @__PURE__ */ jsx("a", { href: "/admin/inbox", class: "uk-btn uk-btn-default uk-btn-sm", "hx-get": "/admin/inbox", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Back"))), /* @__PURE__ */ jsx("div", { class: "p-8" }, /* @__PURE__ */ jsx("div", { class: "grid gap-6", style: "max-width: 800px;" }, /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Sender"), /* @__PURE__ */ jsx("div", { class: "grid gap-3 sm:grid-cols-2 text-sm" }, message.first_name && /* @__PURE__ */ jsx("div", null, /* @__PURE__ */ jsx("span", { class: "text-muted-foreground" }, "Name"), /* @__PURE__ */ jsx("p", { class: "font-medium" }, message.first_name, " ", message.last_name)), message.email && /* @__PURE__ */ jsx("div", null, /* @__PURE__ */ jsx("span", { class: "text-muted-foreground" }, "Email"), /* @__PURE__ */ jsx("p", { class: "font-medium" }, /* @__PURE__ */ jsx("a", { href: `mailto:${message.email}`, class: "uk-link" }, message.email))), message.phone && /* @__PURE__ */ jsx("div", null, /* @__PURE__ */ jsx("span", { class: "text-muted-foreground" }, "Phone"), /* @__PURE__ */ jsx("p", { class: "font-medium" }, /* @__PURE__ */ jsx("a", { href: `tel:${message.phone}`, class: "uk-link" }, message.phone))), message.postal_code && /* @__PURE__ */ jsx("div", null, /* @__PURE__ */ jsx("span", { class: "text-muted-foreground" }, "Postal Code"), /* @__PURE__ */ jsx("p", { class: "font-medium" }, message.postal_code)), message.reason && /* @__PURE__ */ jsx("div", null, /* @__PURE__ */ jsx("span", { class: "text-muted-foreground" }, "Reason"), /* @__PURE__ */ jsx("p", { class: "font-medium", style: "text-transform: capitalize;" }, message.reason)), /* @__PURE__ */ jsx("div", null, /* @__PURE__ */ jsx("span", { class: "text-muted-foreground" }, "Received"), /* @__PURE__ */ jsx("p", { class: "font-medium" }, formatDate(message.created_at))))), message.body && /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Message"), /* @__PURE__ */ jsx("div", { class: "text-sm leading-relaxed whitespace-pre-wrap", style: "color: #333;" }, message.body)), meta3 && /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Additional Details"), /* @__PURE__ */ jsx("div", { class: "grid gap-3 sm:grid-cols-2 text-sm" }, meta3.street_address && /* @__PURE__ */ jsx("div", null, /* @__PURE__ */ jsx("span", { class: "text-muted-foreground" }, "Street Address"), /* @__PURE__ */ jsx("p", { class: "font-medium" }, meta3.street_address)), meta3.apt_suite && /* @__PURE__ */ jsx("div", null, /* @__PURE__ */ jsx("span", { class: "text-muted-foreground" }, "Apt/Suite"), /* @__PURE__ */ jsx("p", { class: "font-medium" }, meta3.apt_suite)), meta3.city && /* @__PURE__ */ jsx("div", null, /* @__PURE__ */ jsx("span", { class: "text-muted-foreground" }, "City"), /* @__PURE__ */ jsx("p", { class: "font-medium" }, meta3.city)), meta3.province && /* @__PURE__ */ jsx("div", null, /* @__PURE__ */ jsx("span", { class: "text-muted-foreground" }, "Province"), /* @__PURE__ */ jsx("p", { class: "font-medium" }, meta3.province)), meta3.country && /* @__PURE__ */ jsx("div", null, /* @__PURE__ */ jsx("span", { class: "text-muted-foreground" }, "Country"), /* @__PURE__ */ jsx("p", { class: "font-medium" }, meta3.country)), meta3.company && /* @__PURE__ */ jsx("div", null, /* @__PURE__ */ jsx("span", { class: "text-muted-foreground" }, "Company"), /* @__PURE__ */ jsx("p", { class: "font-medium" }, meta3.company)), meta3.other && /* @__PURE__ */ jsx("div", { class: "sm:col-span-2" }, /* @__PURE__ */ jsx("span", { class: "text-muted-foreground" }, "Other"), /* @__PURE__ */ jsx("p", { class: "font-medium" }, meta3.other)))), /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body", style: "border: 1px dashed #ccc; opacity: 0.6;" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-2" }, "Reply via SMS"), /* @__PURE__ */ jsx("p", { class: "text-sm text-muted-foreground" }, "Twilio integration coming soon. You'll be able to reply to ", message.phone || message.email, " directly from here.")))));
}, "MessageDetailPage");

// src/views/dashboard.tsx
var statusClass = /* @__PURE__ */ __name((status) => {
  const s = status.toLowerCase();
  if (s === "complete") return "uk-label uk-label-primary";
  if (s === "cancelled") return "uk-label uk-label-destructive";
  if (s === "in_progress" || s === "enroute") return "uk-label uk-label-secondary";
  return "uk-label";
}, "statusClass");
var money = /* @__PURE__ */ __name((cents) => `$${(cents / 100).toFixed(2)}`, "money");
var shortDate = /* @__PURE__ */ __name((input3) => {
  const d = new Date(input3);
  return Number.isNaN(d.getTime()) ? input3 : d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}, "shortDate");
var Dashboard = /* @__PURE__ */ __name(({ stats, upcomingJobs, recentBookings }) => {
  const statCards = [
    { label: "Jobs Today", value: stats.todayJobs },
    { label: "Jobs This Week", value: stats.weekJobs },
    { label: "Total Customers", value: stats.totalCustomers },
    { label: "Active Territories", value: stats.activeTerritories },
    { label: "Active Providers", value: stats.activeProviders },
    { label: "Pending Invoices", value: stats.pendingInvoices }
  ];
  return /* @__PURE__ */ jsx(Layout, { title: "Dashboard" }, /* @__PURE__ */ jsx("div", { class: "flex items-center justify-between px-8 py-5 bg-white border-b border-border sticky top-0 z-50" }, /* @__PURE__ */ jsx("h2", { class: "text-xl font-semibold" }, "Dashboard")), /* @__PURE__ */ jsx("div", { class: "p-8" }, /* @__PURE__ */ jsx("div", { class: "grid gap-6" }, /* @__PURE__ */ jsx("div", { class: "grid gap-4 md:grid-cols-2 xl:grid-cols-3" }, statCards.map((card) => /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body", key: card.label }, /* @__PURE__ */ jsx("p", { class: "text-3xl font-semibold leading-none" }, card.value), /* @__PURE__ */ jsx("p", { class: "text-sm text-muted-foreground mt-2" }, card.label)))), /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Upcoming Jobs"), upcomingJobs.length === 0 ? /* @__PURE__ */ jsx("p", { class: "text-sm text-muted-foreground" }, "No upcoming jobs in the next 7 days.") : /* @__PURE__ */ jsx("div", { class: "uk-overflow-auto" }, /* @__PURE__ */ jsx("table", { class: "uk-table uk-table-divider uk-table-hover uk-table-sm w-full text-sm" }, /* @__PURE__ */ jsx("thead", null, /* @__PURE__ */ jsx("tr", null, /* @__PURE__ */ jsx("th", { class: "text-left" }, "Customer"), /* @__PURE__ */ jsx("th", { class: "text-left" }, "Service"), /* @__PURE__ */ jsx("th", { class: "text-left" }, "Date"), /* @__PURE__ */ jsx("th", { class: "text-left" }, "Time"), /* @__PURE__ */ jsx("th", { class: "text-left" }, "Status"))), /* @__PURE__ */ jsx("tbody", null, upcomingJobs.map((job) => /* @__PURE__ */ jsx("tr", { key: job.id }, /* @__PURE__ */ jsx("td", null, /* @__PURE__ */ jsx(
    "a",
    {
      href: `/admin/jobs/${job.id}`,
      class: "uk-link font-medium",
      "hx-get": `/admin/jobs/${job.id}`,
      "hx-target": "#page-content",
      "hx-select": "#page-content",
      "hx-push-url": "true"
    },
    job.customer_name
  )), /* @__PURE__ */ jsx("td", null, job.service_name || "Custom Service"), /* @__PURE__ */ jsx("td", null, shortDate(job.scheduled_date)), /* @__PURE__ */ jsx("td", null, job.scheduled_start_time), /* @__PURE__ */ jsx("td", null, /* @__PURE__ */ jsx("span", { class: statusClass(job.status) }, job.status.replace("_", " "))))))))), /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Recent Bookings"), recentBookings.length === 0 ? /* @__PURE__ */ jsx("p", { class: "text-sm text-muted-foreground" }, "No recent bookings.") : /* @__PURE__ */ jsx("div", { class: "uk-overflow-auto" }, /* @__PURE__ */ jsx("table", { class: "uk-table uk-table-divider uk-table-hover uk-table-sm w-full text-sm" }, /* @__PURE__ */ jsx("thead", null, /* @__PURE__ */ jsx("tr", null, /* @__PURE__ */ jsx("th", { class: "text-left" }, "Customer"), /* @__PURE__ */ jsx("th", { class: "text-left" }, "Service"), /* @__PURE__ */ jsx("th", { class: "text-left" }, "Booked"), /* @__PURE__ */ jsx("th", { class: "text-left" }, "Total"))), /* @__PURE__ */ jsx("tbody", null, recentBookings.map((job) => /* @__PURE__ */ jsx("tr", { key: job.id }, /* @__PURE__ */ jsx("td", null, /* @__PURE__ */ jsx(
    "a",
    {
      href: `/admin/jobs/${job.id}`,
      class: "uk-link font-medium",
      "hx-get": `/admin/jobs/${job.id}`,
      "hx-target": "#page-content",
      "hx-select": "#page-content",
      "hx-push-url": "true"
    },
    job.customer_name
  )), /* @__PURE__ */ jsx("td", null, job.service_name || "Custom Service"), /* @__PURE__ */ jsx("td", null, shortDate(job.created_at)), /* @__PURE__ */ jsx("td", null, money(job.total_price_cents)))))))))));
}, "Dashboard");

// src/views/job-detail.tsx
var STATUS_OPTIONS = ["created", "assigned", "enroute", "in_progress", "complete", "cancelled"];
var statusClass2 = /* @__PURE__ */ __name((status) => {
  if (status === "complete") return "uk-label uk-label-primary";
  if (status === "cancelled") return "uk-label uk-label-destructive";
  if (status === "enroute" || status === "in_progress") return "uk-label uk-label-secondary";
  return "uk-label";
}, "statusClass");
var JobDetailPage = /* @__PURE__ */ __name(({ job, customer, service, territory, team, assignedProviderId, notes, lineItems }) => {
  return /* @__PURE__ */ jsx(Layout, { title: `Job ${job.id}` }, /* @__PURE__ */ jsx("div", { class: "flex items-center justify-between px-8 py-5 bg-white border-b border-border sticky top-0 z-50" }, /* @__PURE__ */ jsx("div", { class: "flex items-center gap-3" }, /* @__PURE__ */ jsx("h2", { class: "text-xl font-semibold" }, "Job ", job.id.slice(0, 8)), /* @__PURE__ */ jsx("span", { class: statusClass2(job.status) }, job.status.replace("_", " "))), /* @__PURE__ */ jsx("a", { href: "/admin/jobs", class: "uk-btn uk-btn-default uk-btn-sm", "hx-get": "/admin/jobs", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Back")), /* @__PURE__ */ jsx("div", { class: "p-8" }, /* @__PURE__ */ jsx("div", { class: "grid gap-6", style: "max-width: 800px;" }, /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx(
    "form",
    {
      class: "autosave",
      "hx-post": `/admin/jobs/${job.id}`,
      "hx-target": "#page-content",
      "hx-select": "#page-content",
      "hx-swap": "none",
      "hx-trigger": "input delay:500ms, change",
      "hx-sync": "this:queue last"
    },
    /* @__PURE__ */ jsx("input", { type: "hidden", name: "_section", value: "details" }),
    /* @__PURE__ */ jsx("div", { class: "flex items-center justify-between mb-4" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold" }, "Details"), /* @__PURE__ */ jsx("span", { class: "save-indicator" })),
    /* @__PURE__ */ jsx("div", { class: "grid gap-4 sm:grid-cols-2" }, /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "scheduled-date" }, "Date"), /* @__PURE__ */ jsx("input", { id: "scheduled-date", name: "scheduled_date", type: "date", class: "uk-input", value: job.scheduled_date })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "scheduled-time" }, "Start Time"), /* @__PURE__ */ jsx("input", { id: "scheduled-time", name: "scheduled_start_time", type: "time", class: "uk-input", value: job.scheduled_start_time })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "duration" }, "Duration (minutes)"), /* @__PURE__ */ jsx("input", { id: "duration", name: "duration_minutes", type: "number", min: 1, class: "uk-input", value: job.duration_minutes })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "base-price" }, "Base Price (cents)"), /* @__PURE__ */ jsx("input", { id: "base-price", name: "base_price_cents", type: "number", min: 0, class: "uk-input", value: job.base_price_cents })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "total-price" }, "Total Price (cents)"), /* @__PURE__ */ jsx("input", { id: "total-price", name: "total_price_cents", type: "number", min: 0, class: "uk-input", value: job.total_price_cents })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "provider-id" }, "Assigned Provider"), /* @__PURE__ */ jsx("select", { id: "provider-id", name: "provider_id", class: "uk-select" }, /* @__PURE__ */ jsx("option", { value: "" }, "Unassigned"), team.map((provider) => /* @__PURE__ */ jsx("option", { key: provider.id, value: provider.id, selected: assignedProviderId === provider.id }, provider.first_name, " ", provider.last_name)))))
  ))), /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Customer"), customer ? /* @__PURE__ */ jsx("div", { class: "grid gap-2 text-sm" }, /* @__PURE__ */ jsx("p", { class: "font-medium" }, customer.first_name, " ", customer.last_name), /* @__PURE__ */ jsx("p", { class: "text-muted-foreground" }, customer.email || "-"), /* @__PURE__ */ jsx("p", { class: "text-muted-foreground" }, customer.phone || "-"), /* @__PURE__ */ jsx("div", null, /* @__PURE__ */ jsx("a", { href: `/admin/customers/${customer.id}/edit`, class: "uk-link", "hx-get": `/admin/customers/${customer.id}/edit`, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Open customer"))) : /* @__PURE__ */ jsx("p", { class: "text-sm text-muted-foreground" }, "No customer linked.")), /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Service & Territory"), /* @__PURE__ */ jsx("div", { class: "grid gap-2 text-sm" }, /* @__PURE__ */ jsx("div", null, /* @__PURE__ */ jsx("span", { class: "text-muted-foreground" }, "Service:"), " ", /* @__PURE__ */ jsx("span", { class: "font-medium" }, service?.name || job.custom_service_name || "Custom Service")), /* @__PURE__ */ jsx("div", null, /* @__PURE__ */ jsx("span", { class: "text-muted-foreground" }, "Territory:"), " ", /* @__PURE__ */ jsx("span", { class: "font-medium" }, territory?.name || "-")))), /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Service Line Items"), lineItems && lineItems.length > 0 ? /* @__PURE__ */ jsx("div", { class: "grid gap-2 text-sm" }, lineItems.map((item, idx) => {
    const name = item.name || "Line item";
    const qty = typeof item.quantity === "number" ? item.quantity : 1;
    const unit = typeof item.unit_price_cents === "number" ? item.unit_price_cents : 0;
    const total = qty * unit;
    return /* @__PURE__ */ jsx("div", { key: idx, class: "flex items-center justify-between border border-border rounded-md px-3 py-2" }, /* @__PURE__ */ jsx("div", null, /* @__PURE__ */ jsx("div", { class: "font-medium" }, name), /* @__PURE__ */ jsx("div", { class: "text-xs text-muted-foreground" }, item.kind || "custom", " \xB7 qty ", qty)), /* @__PURE__ */ jsx("div", { class: "font-mono text-sm" }, "$", (total / 100).toFixed(2)));
  })) : /* @__PURE__ */ jsx("p", { class: "text-sm text-muted-foreground" }, "No line items recorded for this job.")), /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Status"), /* @__PURE__ */ jsx("form", { "hx-post": `/admin/jobs/${job.id}/status`, "hx-target": "#page-content", "hx-select": "#page-content", class: "flex items-end gap-3" }, /* @__PURE__ */ jsx("div", { class: "grid gap-2 flex-1" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "job-status" }, "Job Status"), /* @__PURE__ */ jsx("select", { id: "job-status", name: "status", class: "uk-select" }, STATUS_OPTIONS.map((status) => /* @__PURE__ */ jsx("option", { value: status, selected: job.status === status, key: status }, status.replace("_", " "))))), /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-default" }, "Update Status")))), /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Notes"), /* @__PURE__ */ jsx("div", { class: "grid gap-3 mb-4" }, notes.map((note) => /* @__PURE__ */ jsx("div", { key: note.id, class: "border border-border rounded-md p-3" }, /* @__PURE__ */ jsx("p", { class: "text-sm whitespace-pre-wrap" }, note.content), /* @__PURE__ */ jsx("p", { class: "text-xs text-muted-foreground mt-2" }, new Date(note.created_at).toLocaleString()))), notes.length === 0 && /* @__PURE__ */ jsx("p", { class: "text-sm text-muted-foreground" }, "No notes yet.")), /* @__PURE__ */ jsx("form", { "hx-post": `/admin/jobs/${job.id}/notes`, "hx-target": "#page-content", "hx-select": "#page-content" }, /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "note-content" }, "Add Note"), /* @__PURE__ */ jsx("textarea", { id: "note-content", name: "content", class: "uk-textarea", rows: 3 })), /* @__PURE__ */ jsx("div", { class: "mt-3" }, /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-default" }, "Add Note"))))), /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-3" }, "Delete"), /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      class: "delete-btn",
      "hx-post": `/admin/jobs/${job.id}/delete`,
      "data-confirm": "arm",
      "hx-target": "#page-content"
    },
    "Delete Job"
  ))))));
}, "JobDetailPage");

// src/views/job-wizard.tsx
var hasStep = /* @__PURE__ */ __name((props) => {
  return "step" in props;
}, "hasStep");
var formatDateChip = /* @__PURE__ */ __name((date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
}, "formatDateChip");
var queryFromQuickProps = /* @__PURE__ */ __name((props) => {
  const query = new URLSearchParams();
  if (props.customer?.id) query.set("customer_id", props.customer.id);
  if (props.addressLine1) query.set("address_line1", props.addressLine1);
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
  return /* @__PURE__ */ jsx("div", null, statePairs(state).map((pair) => /* @__PURE__ */ jsx("input", { key: pair.key, type: "hidden", name: pair.key, value: pair.value })));
}, "HiddenWizardStateInputs");
var quickCreateBody = /* @__PURE__ */ __name((props) => {
  const query = queryFromQuickProps(props);
  const selectedService = props.services.find((s) => s.id === props.selectedServiceId);
  return /* @__PURE__ */ jsx("div", { class: "grid gap-6", style: "max-width: 980px;" }, /* @__PURE__ */ jsx("div", { id: "wizard-error-panel" }, props.error && /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body", style: "border: 1px solid #fecaca; background: #fff1f2;" }, /* @__PURE__ */ jsx("p", { class: "text-sm", style: "color: #b91c1c;" }, props.error))), /* @__PURE__ */ jsx("div", { id: "wizard-customer-panel", class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "1. Customer"), /* @__PURE__ */ jsx("div", { class: "grid gap-3 sm:grid-cols-2 items-end" }, /* @__PURE__ */ jsx("div", { class: "grid gap-2 sm:col-span-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "customer-search" }, "Find Customer"), /* @__PURE__ */ jsx("input", { id: "customer-search", name: "q", class: "uk-input", placeholder: "Search name or email", "hx-get": "/admin/api/customers/search", "hx-trigger": "input changed delay:300ms", "hx-target": "#customer-results", autocomplete: "off" }), /* @__PURE__ */ jsx("div", { id: "customer-results" })), /* @__PURE__ */ jsx("div", { class: "sm:col-span-2 text-sm" }, props.customer ? /* @__PURE__ */ jsx("span", { class: "uk-label" }, props.customer.first_name, " ", props.customer.last_name, " (", props.customer.email || "no email", ")") : /* @__PURE__ */ jsx("span", { class: "text-muted-foreground" }, "No customer selected.")))), /* @__PURE__ */ jsx("div", { id: "wizard-address-panel", class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "2. Address"), /* @__PURE__ */ jsx(
    "form",
    {
      "hx-get": "/admin/jobs/new",
      "hx-target": "#page-content",
      "hx-select": "#page-content",
      "hx-push-url": "true",
      class: "grid gap-3"
    },
    props.customer?.id && /* @__PURE__ */ jsx("input", { type: "hidden", name: "customer_id", value: props.customer.id }),
    props.selectedTerritoryId && /* @__PURE__ */ jsx("input", { type: "hidden", name: "territory_id", value: props.selectedTerritoryId }),
    props.selectedServiceId && /* @__PURE__ */ jsx("input", { type: "hidden", name: "service_id", value: props.selectedServiceId }),
    props.selectedDate && /* @__PURE__ */ jsx("input", { type: "hidden", name: "date", value: props.selectedDate }),
    props.selectedTime && /* @__PURE__ */ jsx("input", { type: "hidden", name: "time", value: props.selectedTime }),
    props.selectedProviderId && /* @__PURE__ */ jsx("input", { type: "hidden", name: "provider_id", value: props.selectedProviderId }),
    /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "addr-line1" }, "Address"),
    /* @__PURE__ */ jsx("input", { id: "addr-line1", name: "address_line1", class: "uk-input", value: props.addressLine1 || "", placeholder: "Start typing address", "hx-get": "/admin/api/address/search", "hx-trigger": "input changed delay:300ms", "hx-target": "#address-results" }),
    /* @__PURE__ */ jsx("input", { id: "addr-city", type: "hidden", name: "address_city", value: "" }),
    /* @__PURE__ */ jsx("input", { id: "addr-state", type: "hidden", name: "address_state", value: "" }),
    /* @__PURE__ */ jsx("input", { id: "addr-postal", type: "hidden", name: "address_postal", value: "" }),
    /* @__PURE__ */ jsx("input", { id: "addr-lat", type: "hidden", name: "address_lat", value: "" }),
    /* @__PURE__ */ jsx("input", { id: "addr-lng", type: "hidden", name: "address_lng", value: "" }),
    /* @__PURE__ */ jsx("div", { id: "address-results" }),
    /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-default", style: "width: fit-content;" }, "Use Address")
  )), /* @__PURE__ */ jsx("div", { id: "wizard-territory-panel", class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "3. Territory"), /* @__PURE__ */ jsx("form", { "hx-get": "/admin/jobs/new", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", class: "grid gap-3" }, props.customer?.id && /* @__PURE__ */ jsx("input", { type: "hidden", name: "customer_id", value: props.customer.id }), props.addressLine1 && /* @__PURE__ */ jsx("input", { type: "hidden", name: "address_line1", value: props.addressLine1 }), props.selectedServiceId && /* @__PURE__ */ jsx("input", { type: "hidden", name: "service_id", value: props.selectedServiceId }), props.selectedDate && /* @__PURE__ */ jsx("input", { type: "hidden", name: "date", value: props.selectedDate }), props.selectedTime && /* @__PURE__ */ jsx("input", { type: "hidden", name: "time", value: props.selectedTime }), props.selectedProviderId && /* @__PURE__ */ jsx("input", { type: "hidden", name: "provider_id", value: props.selectedProviderId }), /* @__PURE__ */ jsx("select", { name: "territory_id", class: "uk-select", required: true }, /* @__PURE__ */ jsx("option", { value: "" }, "Select territory..."), props.territories.map((t) => /* @__PURE__ */ jsx("option", { key: t.id, value: t.id, selected: props.selectedTerritoryId === t.id }, t.name))), /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-default", style: "width: fit-content;" }, "Select Territory"))), /* @__PURE__ */ jsx("div", { id: "wizard-service-panel", class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "4. Service"), /* @__PURE__ */ jsx("form", { "hx-get": "/admin/jobs/new", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", class: "grid gap-3" }, props.customer?.id && /* @__PURE__ */ jsx("input", { type: "hidden", name: "customer_id", value: props.customer.id }), props.addressLine1 && /* @__PURE__ */ jsx("input", { type: "hidden", name: "address_line1", value: props.addressLine1 }), props.selectedTerritoryId && /* @__PURE__ */ jsx("input", { type: "hidden", name: "territory_id", value: props.selectedTerritoryId }), props.selectedDate && /* @__PURE__ */ jsx("input", { type: "hidden", name: "date", value: props.selectedDate }), props.selectedTime && /* @__PURE__ */ jsx("input", { type: "hidden", name: "time", value: props.selectedTime }), props.selectedProviderId && /* @__PURE__ */ jsx("input", { type: "hidden", name: "provider_id", value: props.selectedProviderId }), /* @__PURE__ */ jsx("select", { name: "service_id", class: "uk-select", required: true }, /* @__PURE__ */ jsx("option", { value: "" }, "Select service..."), props.services.map((s) => /* @__PURE__ */ jsx("option", { key: s.id, value: s.id, selected: props.selectedServiceId === s.id }, s.name))), selectedService && /* @__PURE__ */ jsx("p", { class: "text-sm text-muted-foreground" }, selectedService.base_duration_minutes, " min \u2022 $", (selectedService.base_price_cents / 100).toFixed(2)), /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-default", style: "width: fit-content;" }, "Select Service"))), /* @__PURE__ */ jsx("div", { id: "wizard-date-panel", class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "5. Date"), /* @__PURE__ */ jsx("div", { class: "flex flex-wrap gap-2" }, props.dates.map((date) => {
    const q = new URLSearchParams(query);
    q.set("date", date);
    q.delete("time");
    q.delete("provider_id");
    const active = props.selectedDate === date;
    return /* @__PURE__ */ jsx(
      "a",
      {
        key: date,
        href: `/admin/jobs/new?${q.toString()}`,
        class: active ? "uk-btn uk-btn-primary uk-btn-sm" : "uk-btn uk-btn-default uk-btn-sm",
        "hx-get": `/admin/jobs/new?${q.toString()}`,
        "hx-target": "#page-content",
        "hx-select": "#page-content",
        "hx-push-url": "true"
      },
      formatDateChip(date)
    );
  }))), /* @__PURE__ */ jsx("div", { id: "wizard-time-panel", class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "6. Time"), props.timeslots.length === 0 ? /* @__PURE__ */ jsx("p", { class: "text-sm text-muted-foreground" }, "Select a service and date first.") : /* @__PURE__ */ jsx("div", { class: "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2" }, props.timeslots.map((time) => {
    const q = new URLSearchParams(query);
    q.set("time", time);
    q.delete("provider_id");
    const active = props.selectedTime === time;
    return /* @__PURE__ */ jsx(
      "a",
      {
        key: time,
        href: `/admin/jobs/new?${q.toString()}`,
        class: active ? "uk-btn uk-btn-primary uk-btn-sm" : "uk-btn uk-btn-default uk-btn-sm",
        "hx-get": `/admin/jobs/new?${q.toString()}`,
        "hx-target": "#page-content",
        "hx-select": "#page-content",
        "hx-push-url": "true"
      },
      time
    );
  }))), /* @__PURE__ */ jsx("div", { id: "wizard-provider-panel", class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "7. Provider"), /* @__PURE__ */ jsx("form", { "hx-get": "/admin/jobs/new", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", class: "grid gap-3" }, props.customer?.id && /* @__PURE__ */ jsx("input", { type: "hidden", name: "customer_id", value: props.customer.id }), props.addressLine1 && /* @__PURE__ */ jsx("input", { type: "hidden", name: "address_line1", value: props.addressLine1 }), props.selectedTerritoryId && /* @__PURE__ */ jsx("input", { type: "hidden", name: "territory_id", value: props.selectedTerritoryId }), props.selectedServiceId && /* @__PURE__ */ jsx("input", { type: "hidden", name: "service_id", value: props.selectedServiceId }), props.selectedDate && /* @__PURE__ */ jsx("input", { type: "hidden", name: "date", value: props.selectedDate }), props.selectedTime && /* @__PURE__ */ jsx("input", { type: "hidden", name: "time", value: props.selectedTime }), /* @__PURE__ */ jsx("select", { name: "provider_id", class: "uk-select" }, /* @__PURE__ */ jsx("option", { value: "" }, "Auto-assign later"), props.providers.map((p) => /* @__PURE__ */ jsx("option", { key: p.id, value: p.id, selected: props.selectedProviderId === p.id }, p.first_name, " ", p.last_name, " ", p.is_available ? "" : "(unavailable)"))), /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-default", style: "width: fit-content;" }, "Select Provider"))), /* @__PURE__ */ jsx("div", { id: "wizard-submit-panel", class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "8. Create Job"), /* @__PURE__ */ jsx("form", { "hx-post": "/admin/jobs/quick-create", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", class: "grid gap-3" }, /* @__PURE__ */ jsx("input", { type: "hidden", name: "customer_id", value: props.customer?.id || "" }), /* @__PURE__ */ jsx("input", { type: "hidden", name: "address_line1", value: props.addressLine1 || "" }), /* @__PURE__ */ jsx("input", { type: "hidden", name: "territory_id", value: props.selectedTerritoryId || "" }), /* @__PURE__ */ jsx("input", { type: "hidden", name: "service_id", value: props.selectedServiceId || "" }), /* @__PURE__ */ jsx("input", { type: "hidden", name: "date", value: props.selectedDate || "" }), /* @__PURE__ */ jsx("input", { type: "hidden", name: "time", value: props.selectedTime || "" }), /* @__PURE__ */ jsx("input", { type: "hidden", name: "provider_id", value: props.selectedProviderId || "" }), /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-primary" }, "Create Job"))), /* @__PURE__ */ jsx("script", null, `
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
      `));
}, "quickCreateBody");
var wizardFlowBody = /* @__PURE__ */ __name((props) => {
  return /* @__PURE__ */ jsx("div", { class: "grid gap-6", style: "max-width: 800px;" }, props.error && /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body", style: "border: 1px solid #fecaca; background: #fff1f2;" }, /* @__PURE__ */ jsx("p", { class: "text-sm", style: "color: #b91c1c;" }, props.error)), props.step === 1 && /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Step 1: Customer & Address"), /* @__PURE__ */ jsx("form", { "hx-post": "/admin/jobs/wizard/step1-address", "hx-target": "#page-content", "hx-select": "#page-content", class: "grid gap-4" }, /* @__PURE__ */ jsx("input", { type: "hidden", name: "customer_id", value: props.state.customer_id || props.customer?.id || "" }), /* @__PURE__ */ jsx("input", { type: "hidden", name: "customer_name", value: props.state.customer_name || `${props.customer?.first_name || ""} ${props.customer?.last_name || ""}`.trim() }), /* @__PURE__ */ jsx("input", { type: "hidden", name: "customer_email", value: props.state.customer_email || props.customer?.email || "" }), /* @__PURE__ */ jsx("div", { class: "text-sm" }, /* @__PURE__ */ jsx("span", { class: "text-muted-foreground" }, "Customer:"), " ", /* @__PURE__ */ jsx("span", { class: "font-medium" }, props.state.customer_name || `${props.customer?.first_name || ""} ${props.customer?.last_name || ""}`.trim() || "Unknown")), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "wizard-address" }, "Address line 1"), /* @__PURE__ */ jsx("input", { id: "wizard-address", name: "address_line1", class: "uk-input", value: props.state.address_line1 || "", "hx-get": "/admin/api/address/search", "hx-trigger": "input changed delay:300ms", "hx-target": "#address-results" }), /* @__PURE__ */ jsx("div", { id: "address-results" })), /* @__PURE__ */ jsx("input", { id: "addr-city", type: "hidden", name: "address_city", value: props.state.address_city || "" }), /* @__PURE__ */ jsx("input", { id: "addr-state", type: "hidden", name: "address_state", value: props.state.address_state || "" }), /* @__PURE__ */ jsx("input", { id: "addr-postal", type: "hidden", name: "address_postal", value: props.state.address_postal || "" }), /* @__PURE__ */ jsx("input", { id: "addr-lat", type: "hidden", name: "address_lat", value: props.state.address_lat || "" }), /* @__PURE__ */ jsx("input", { id: "addr-lng", type: "hidden", name: "address_lng", value: props.state.address_lng || "" }), /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-primary" }, "Continue"))), props.step === 2 && /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Step 2: Service"), /* @__PURE__ */ jsx("form", { "hx-post": "/admin/jobs/wizard/step3", "hx-target": "#page-content", "hx-select": "#page-content", class: "grid gap-4" }, /* @__PURE__ */ jsx(HiddenWizardStateInputs, { state: props.state }), /* @__PURE__ */ jsx("input", { id: "wizard-service-name", type: "hidden", name: "service_name", value: props.state.service_name || "" }), /* @__PURE__ */ jsx("input", { id: "wizard-service-price", type: "hidden", name: "service_price", value: props.state.service_price || "" }), /* @__PURE__ */ jsx("input", { id: "wizard-service-duration", type: "hidden", name: "service_duration", value: props.state.service_duration || "" }), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "wizard-service-id" }, "Select Service"), /* @__PURE__ */ jsx("select", { id: "wizard-service-id", name: "service_id", class: "uk-select", required: true }, /* @__PURE__ */ jsx("option", { value: "" }, "Select..."), (props.services || []).map((service) => /* @__PURE__ */ jsx("option", { key: service.id, value: service.id, selected: props.state.service_id === service.id, "data-name": service.name, "data-price": String(service.base_price_cents), "data-duration": String(service.base_duration_minutes) }, service.name, " ($", (service.base_price_cents / 100).toFixed(2), ", ", service.base_duration_minutes, "m)")))), /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-primary" }, "Continue"), /* @__PURE__ */ jsx("script", null, `
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
            `))), props.step === 3 && /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Step 3: Date & Time"), /* @__PURE__ */ jsx("form", { "hx-post": "/admin/jobs/wizard/step4", "hx-target": "#page-content", "hx-select": "#page-content", class: "grid gap-4" }, /* @__PURE__ */ jsx(HiddenWizardStateInputs, { state: props.state }), /* @__PURE__ */ jsx("div", { class: "grid gap-3 sm:grid-cols-2" }, /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "wizard-date" }, "Date"), /* @__PURE__ */ jsx("input", { id: "wizard-date", type: "date", name: "date", class: "uk-input", value: props.state.date || "", required: true })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "wizard-time" }, "Time"), /* @__PURE__ */ jsx("select", { id: "wizard-time", name: "time", class: "uk-select", required: true }, /* @__PURE__ */ jsx("option", { value: "" }, "Select..."), (props.timeslots || []).map((slot) => /* @__PURE__ */ jsx("option", { key: `${slot.date}-${slot.start_time}`, value: slot.start_time, selected: props.state.time === slot.start_time }, slot.date, " ", slot.start_time, " ", slot.available ? "" : "(unavailable)"))))), /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-primary" }, "Continue"))), props.step === 4 && /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Step 4: Provider"), /* @__PURE__ */ jsx("form", { "hx-post": "/admin/jobs/create", "hx-target": "#page-content", "hx-select": "#page-content", class: "grid gap-4" }, /* @__PURE__ */ jsx(HiddenWizardStateInputs, { state: props.state }), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "wizard-provider" }, "Provider"), /* @__PURE__ */ jsx("select", { id: "wizard-provider", name: "provider_id", class: "uk-select" }, /* @__PURE__ */ jsx("option", { value: "" }, "Auto-assign later"), (props.providers || []).map((provider) => /* @__PURE__ */ jsx("option", { key: provider.id, value: provider.id, selected: props.state.provider_id === provider.id }, provider.first_name, " ", provider.last_name, " ", provider.is_available ? "" : "(unavailable)")))), /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-primary" }, "Create Job"))));
}, "wizardFlowBody");
var JobWizardPage = /* @__PURE__ */ __name((props) => {
  const title3 = hasStep(props) ? `New Job - Step ${props.step}` : "Create Job";
  return /* @__PURE__ */ jsx(Layout, { title: title3 }, /* @__PURE__ */ jsx("div", { class: "flex items-center justify-between px-8 py-5 bg-white border-b border-border sticky top-0 z-50" }, /* @__PURE__ */ jsx("h2", { class: "text-xl font-semibold" }, title3), /* @__PURE__ */ jsx("a", { href: "/admin/jobs", class: "uk-btn uk-btn-default uk-btn-sm", "hx-get": "/admin/jobs", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Back")), /* @__PURE__ */ jsx("div", { class: "p-8" }, hasStep(props) ? wizardFlowBody(props) : quickCreateBody(props)));
}, "JobWizardPage");
var JobWizardSwapBundle = /* @__PURE__ */ __name(({ props, targetId }) => {
  if (hasStep(props)) {
    return wizardFlowBody(props);
  }
  const body = quickCreateBody(props);
  if (targetId === "wizard-customer-panel") return /* @__PURE__ */ jsx("div", { id: "wizard-customer-panel" }, body);
  if (targetId === "wizard-address-panel") return /* @__PURE__ */ jsx("div", { id: "wizard-address-panel" }, body);
  if (targetId === "wizard-territory-panel") return /* @__PURE__ */ jsx("div", { id: "wizard-territory-panel" }, body);
  if (targetId === "wizard-service-panel") return /* @__PURE__ */ jsx("div", { id: "wizard-service-panel" }, body);
  if (targetId === "wizard-date-panel") return /* @__PURE__ */ jsx("div", { id: "wizard-date-panel" }, body);
  if (targetId === "wizard-time-panel") return /* @__PURE__ */ jsx("div", { id: "wizard-time-panel" }, body);
  if (targetId === "wizard-provider-panel") return /* @__PURE__ */ jsx("div", { id: "wizard-provider-panel" }, body);
  if (targetId === "wizard-submit-panel") return /* @__PURE__ */ jsx("div", { id: "wizard-submit-panel" }, body);
  if (targetId === "wizard-error-panel") return /* @__PURE__ */ jsx("div", { id: "wizard-error-panel" }, body);
  return body;
}, "JobWizardSwapBundle");
var CustomerSearchResults = /* @__PURE__ */ __name(({ customers }) => {
  if (!customers.length) {
    return /* @__PURE__ */ jsx("div", { class: "search-results" }, /* @__PURE__ */ jsx("div", { class: "search-item text-muted-foreground" }, "No customers found."));
  }
  return /* @__PURE__ */ jsx("div", { class: "search-results" }, customers.map((customer) => /* @__PURE__ */ jsx(
    "div",
    {
      key: customer.id,
      class: "search-item customer-result",
      "data-id": customer.id,
      "data-name": `${customer.first_name} ${customer.last_name}`,
      "data-email": customer.email || ""
    },
    /* @__PURE__ */ jsx("div", { class: "name" }, customer.first_name, " ", customer.last_name),
    /* @__PURE__ */ jsx("div", { class: "meta" }, customer.email || "No email")
  )));
}, "CustomerSearchResults");
var AddressSearchResults = /* @__PURE__ */ __name(({
  results,
  targetPrefix
}) => {
  if (!results.length) {
    return /* @__PURE__ */ jsx("div", { class: "search-results" }, /* @__PURE__ */ jsx("div", { class: "search-item text-muted-foreground" }, "No addresses found."));
  }
  return /* @__PURE__ */ jsx("div", { class: "search-results" }, results.map((result, i) => /* @__PURE__ */ jsx(
    "div",
    {
      key: `${result.display}-${i}`,
      class: "search-item address-result",
      "data-prefix": targetPrefix || "addr",
      "data-line1": result.line1,
      "data-city": result.city,
      "data-state": result.state,
      "data-postal": result.postal,
      "data-lat": result.lat,
      "data-lng": result.lng
    },
    /* @__PURE__ */ jsx("div", { class: "name" }, result.display || result.line1),
    /* @__PURE__ */ jsx("div", { class: "meta" }, result.city, result.state ? `, ${result.state}` : "", " ", result.postal)
  )));
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
  return /* @__PURE__ */ jsx(Layout, { title: `${member.first_name} ${member.last_name}` }, /* @__PURE__ */ jsx("div", { class: "flex items-center justify-between px-8 py-5 bg-white border-b border-border sticky top-0 z-50" }, /* @__PURE__ */ jsx("div", { class: "flex items-center gap-3" }, /* @__PURE__ */ jsx("h2", { class: "text-xl font-semibold" }, member.first_name, " ", member.last_name), /* @__PURE__ */ jsx("span", { class: member.is_active ? "uk-label uk-label-primary" : "uk-label" }, member.is_active ? "active" : "inactive")), /* @__PURE__ */ jsx("a", { href: "/admin/team", class: "uk-btn uk-btn-default uk-btn-sm", "hx-get": "/admin/team", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Back")), /* @__PURE__ */ jsx("div", { class: "p-8" }, /* @__PURE__ */ jsx("div", { class: "grid gap-6", style: "max-width: 800px;" }, /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx(
    "form",
    {
      class: "autosave",
      "hx-post": `/admin/team/${member.id}`,
      "hx-target": "#page-content",
      "hx-select": "#page-content",
      "hx-swap": "none",
      "hx-trigger": "input delay:500ms, change",
      "hx-sync": "this:queue last"
    },
    /* @__PURE__ */ jsx("input", { type: "hidden", name: "_section", value: "profile" }),
    /* @__PURE__ */ jsx("div", { class: "flex items-center justify-between mb-4" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold" }, "Profile"), /* @__PURE__ */ jsx("span", { class: "save-indicator" })),
    /* @__PURE__ */ jsx("div", { class: "grid gap-4 sm:grid-cols-2" }, /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "first_name" }, "First Name"), /* @__PURE__ */ jsx("input", { id: "first_name", name: "first_name", class: "uk-input", value: member.first_name })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "last_name" }, "Last Name"), /* @__PURE__ */ jsx("input", { id: "last_name", name: "last_name", class: "uk-input", value: member.last_name })), /* @__PURE__ */ jsx("div", { class: "grid gap-2 sm:col-span-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "email" }, "Email"), /* @__PURE__ */ jsx("input", { id: "email", name: "email", type: "email", class: "uk-input", value: member.email })), /* @__PURE__ */ jsx("div", { class: "grid gap-2 sm:col-span-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "phone" }, "Phone"), /* @__PURE__ */ jsx("input", { id: "phone", name: "phone", type: "tel", class: "uk-input", value: member.phone || "" })), /* @__PURE__ */ jsx("div", { class: "grid gap-2 sm:col-span-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "role" }, "Role"), /* @__PURE__ */ jsx("select", { id: "role", name: "role", class: "uk-select" }, /* @__PURE__ */ jsx("option", { value: "manager", selected: member.role === "manager" }, "Manager"), /* @__PURE__ */ jsx("option", { value: "provider", selected: member.role === "provider" }, "Provider"))), /* @__PURE__ */ jsx("label", { class: "uk-form-label flex items-center gap-2 cursor-pointer sm:col-span-2" }, /* @__PURE__ */ jsx("input", { type: "checkbox", name: "can_be_auto_assigned", checked: Boolean(member.can_be_auto_assigned), class: "uk-toggle-switch uk-toggle-switch-primary" }), "Can be auto-assigned"), /* @__PURE__ */ jsx("label", { class: "uk-form-label flex items-center gap-2 cursor-pointer sm:col-span-2" }, /* @__PURE__ */ jsx("input", { type: "checkbox", name: "is_active", checked: Boolean(member.is_active), class: "uk-toggle-switch uk-toggle-switch-primary" }), "Active"))
  ))), /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Weekly Hours"), /* @__PURE__ */ jsx("form", { "hx-post": `/admin/team/${member.id}/hours`, "hx-target": "#page-content", "hx-select": "#page-content" }, /* @__PURE__ */ jsx("div", { class: "grid gap-3" }, DAY_LABELS.map((label, day) => {
    const row = hourMap.get(day);
    const enabled = Boolean(row);
    return /* @__PURE__ */ jsx("div", { class: "grid grid-cols-[60px_1fr_1fr_auto] items-center gap-3", key: label }, /* @__PURE__ */ jsx("span", { class: "text-sm text-muted-foreground" }, label), /* @__PURE__ */ jsx("input", { type: "time", name: `day_${day}_start`, class: "uk-input", value: row?.start_time || "09:00" }), /* @__PURE__ */ jsx("input", { type: "time", name: `day_${day}_end`, class: "uk-input", value: row?.end_time || "17:00" }), /* @__PURE__ */ jsx("label", { class: "flex items-center gap-2 text-sm" }, /* @__PURE__ */ jsx("input", { type: "checkbox", name: `day_${day}_enabled`, class: "uk-checkbox", checked: enabled }), "Enabled"));
  })), /* @__PURE__ */ jsx("div", { class: "mt-4" }, /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-primary" }, "Save Hours"))))), /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Date Overrides"), /* @__PURE__ */ jsx("div", { class: "uk-overflow-auto mb-4" }, /* @__PURE__ */ jsx("table", { class: "uk-table uk-table-divider uk-table-hover uk-table-sm text-sm" }, /* @__PURE__ */ jsx("thead", null, /* @__PURE__ */ jsx("tr", null, /* @__PURE__ */ jsx("th", { class: "text-left" }, "Date"), /* @__PURE__ */ jsx("th", { class: "text-left" }, "Available"), /* @__PURE__ */ jsx("th", { class: "text-left" }, "Hours"), /* @__PURE__ */ jsx("th", { class: "text-left" }, "Action"))), /* @__PURE__ */ jsx("tbody", null, dateOverrides.map((o) => /* @__PURE__ */ jsx("tr", { key: o.id }, /* @__PURE__ */ jsx("td", null, o.date), /* @__PURE__ */ jsx("td", null, o.is_available ? "Yes" : "No"), /* @__PURE__ */ jsx("td", null, o.start_time && o.end_time ? `${o.start_time} - ${o.end_time}` : "-"), /* @__PURE__ */ jsx("td", null, /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      class: "delete-btn",
      "hx-delete": `/admin/team/${member.id}/overrides/${o.id}`,
      "data-confirm": "arm",
      "hx-target": "#page-content",
      "hx-select": "#page-content"
    },
    "Delete"
  )))), dateOverrides.length === 0 && /* @__PURE__ */ jsx("tr", null, /* @__PURE__ */ jsx("td", { colspan: 4, class: "text-muted-foreground" }, "No overrides."))))), /* @__PURE__ */ jsx("form", { "hx-post": `/admin/team/${member.id}/overrides`, "hx-target": "#page-content", "hx-select": "#page-content" }, /* @__PURE__ */ jsx("div", { class: "grid gap-3 sm:grid-cols-2" }, /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "override-date" }, "Date"), /* @__PURE__ */ jsx("input", { id: "override-date", name: "date", type: "date", class: "uk-input", required: true })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "override-available" }, "Availability"), /* @__PURE__ */ jsx("select", { id: "override-available", name: "is_available", class: "uk-select" }, /* @__PURE__ */ jsx("option", { value: "1" }, "Available"), /* @__PURE__ */ jsx("option", { value: "0" }, "Unavailable"))), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "override-start" }, "Start"), /* @__PURE__ */ jsx("input", { id: "override-start", name: "start_time", type: "time", class: "uk-input" })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "override-end" }, "End"), /* @__PURE__ */ jsx("input", { id: "override-end", name: "end_time", type: "time", class: "uk-input" }))), /* @__PURE__ */ jsx("div", { class: "mt-4" }, /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-default" }, "Add Override"))))), /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Skills"), /* @__PURE__ */ jsx("div", { class: "flex flex-wrap items-center gap-2 mb-4" }, skills.map((skill) => /* @__PURE__ */ jsx("form", { key: skill.id, "hx-post": `/admin/team/${member.id}/skills`, "hx-target": "#page-content", "hx-select": "#page-content", class: "flex items-center gap-1" }, /* @__PURE__ */ jsx("input", { type: "hidden", name: "remove_skill_id", value: skill.id }), /* @__PURE__ */ jsx("span", { class: "uk-label" }, skill.name), /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-default uk-btn-sm" }, "x"))), skills.length === 0 && /* @__PURE__ */ jsx("span", { class: "text-sm text-muted-foreground" }, "No skills assigned.")), /* @__PURE__ */ jsx("form", { "hx-post": `/admin/team/${member.id}/skills`, "hx-target": "#page-content", "hx-select": "#page-content", class: "flex items-end gap-3" }, skills.map((skill) => /* @__PURE__ */ jsx("input", { key: skill.id, type: "hidden", name: "skill_ids", value: skill.id })), /* @__PURE__ */ jsx("div", { class: "grid gap-2 flex-1" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "add-skill" }, "Add Skill"), /* @__PURE__ */ jsx("select", { id: "add-skill", name: "skill_ids", class: "uk-select" }, /* @__PURE__ */ jsx("option", { value: "" }, "Select skill..."), allSkills.map((skill) => /* @__PURE__ */ jsx("option", { value: skill.id, key: skill.id }, skill.name)))), /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-default" }, "Add")))), /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", { id: "provider-territories" }, /* @__PURE__ */ jsx("div", { class: "flex items-center justify-between mb-4" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold" }, "Territories"), /* @__PURE__ */ jsx("span", { class: "text-sm text-muted-foreground", id: "provider-territories-count" }, assignedTerritories.length, " assigned"), /* @__PURE__ */ jsx("span", { class: "save-indicator" })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, territories.map((t) => /* @__PURE__ */ jsx("form", { key: t.id }, assignedTerritories.filter((a) => !t.assigned || a.id !== t.id).map((a) => /* @__PURE__ */ jsx("input", { key: a.id, type: "hidden", name: "territory_ids", value: a.id })), /* @__PURE__ */ jsx("label", { class: "flex items-center justify-between gap-3" }, /* @__PURE__ */ jsx("span", { class: "text-sm" }, t.name), /* @__PURE__ */ jsx(
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
  ))))))), /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-3" }, "Delete"), /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      class: "delete-btn",
      "hx-post": `/admin/team/${member.id}/delete`,
      "data-confirm": "arm",
      "hx-target": "#page-content"
    },
    "Delete Team Member"
  ))))));
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
  return /* @__PURE__ */ jsx(Layout, { title: service.name || "Service" }, /* @__PURE__ */ jsx("div", { class: "flex items-center justify-between px-8 py-5 bg-white border-b border-border sticky top-0 z-50" }, /* @__PURE__ */ jsx("div", { class: "flex items-center gap-3" }, /* @__PURE__ */ jsx("h2", { class: "text-xl font-semibold" }, service.name || "Service"), /* @__PURE__ */ jsx("span", { class: service.is_active ? "uk-label uk-label-primary" : "uk-label" }, service.is_active ? "active" : "inactive")), /* @__PURE__ */ jsx("a", { href: "/admin/services", class: "uk-btn uk-btn-default uk-btn-sm", "hx-get": "/admin/services", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Back")), /* @__PURE__ */ jsx("div", { class: "p-8" }, /* @__PURE__ */ jsx("div", { class: "grid gap-6", style: "max-width: 800px;" }, /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx(
    "form",
    {
      class: "autosave",
      "hx-post": `/admin/services/${service.id}`,
      "hx-target": "#page-content",
      "hx-select": "#page-content",
      "hx-swap": "none",
      "hx-trigger": "input delay:500ms, change",
      "hx-sync": "this:queue last"
    },
    /* @__PURE__ */ jsx("input", { type: "hidden", name: "_section", value: "basic" }),
    /* @__PURE__ */ jsx("div", { class: "flex items-center justify-between mb-4" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold" }, "Basic Info"), /* @__PURE__ */ jsx("span", { class: "save-indicator" })),
    /* @__PURE__ */ jsx("div", { class: "grid gap-4 sm:grid-cols-2" }, /* @__PURE__ */ jsx("div", { class: "grid gap-2 sm:col-span-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "service-name" }, "Name"), /* @__PURE__ */ jsx("input", { id: "service-name", name: "name", class: "uk-input", value: service.name })), /* @__PURE__ */ jsx("div", { class: "grid gap-2 sm:col-span-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "service-description" }, "Description"), /* @__PURE__ */ jsx("textarea", { id: "service-description", name: "description", class: "uk-textarea", rows: 3 }, service.description || "")), /* @__PURE__ */ jsx("div", { class: "grid gap-2 sm:col-span-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "service-category" }, "Category"), /* @__PURE__ */ jsx("select", { id: "service-category", name: "category_id", class: "uk-select" }, /* @__PURE__ */ jsx("option", { value: "" }, "Select..."), categories.map((cat) => /* @__PURE__ */ jsx("option", { value: cat.id, selected: service.category_id === cat.id, key: cat.id }, cat.name)))), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "service-price" }, "Base Price (cents)"), /* @__PURE__ */ jsx("input", { id: "service-price", name: "base_price_cents", type: "number", min: 0, class: "uk-input", value: service.base_price_cents })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "service-duration" }, "Duration (minutes)"), /* @__PURE__ */ jsx("input", { id: "service-duration", name: "base_duration_minutes", type: "number", min: 1, class: "uk-input", value: service.base_duration_minutes })), /* @__PURE__ */ jsx("label", { class: "uk-form-label flex items-center gap-2 cursor-pointer sm:col-span-2" }, /* @__PURE__ */ jsx("input", { type: "checkbox", name: "auto_assign_enabled", checked: Boolean(service.auto_assign_enabled), class: "uk-toggle-switch uk-toggle-switch-primary" }), "Auto-assign enabled"), /* @__PURE__ */ jsx("div", { class: "grid gap-2 sm:col-span-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "assign-method" }, "Auto-assign method"), /* @__PURE__ */ jsx("select", { id: "assign-method", name: "auto_assign_method", class: "uk-select" }, /* @__PURE__ */ jsx("option", { value: "balanced", selected: service.auto_assign_method === "balanced" }, "Balanced"), /* @__PURE__ */ jsx("option", { value: "prioritized", selected: service.auto_assign_method === "prioritized" }, "Prioritized"), /* @__PURE__ */ jsx("option", { value: "drive_time", selected: service.auto_assign_method === "drive_time" }, "Drive time"))), /* @__PURE__ */ jsx("label", { class: "uk-form-label flex items-center gap-2 cursor-pointer sm:col-span-2" }, /* @__PURE__ */ jsx("input", { type: "checkbox", name: "is_active", checked: Boolean(service.is_active), class: "uk-toggle-switch uk-toggle-switch-primary" }), "Active"))
  ))), /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Modifiers"), /* @__PURE__ */ jsx("div", { class: "uk-overflow-auto mb-4" }, /* @__PURE__ */ jsx("table", { class: "uk-table uk-table-divider uk-table-hover uk-table-sm text-sm" }, /* @__PURE__ */ jsx("thead", null, /* @__PURE__ */ jsx("tr", null, /* @__PURE__ */ jsx("th", { class: "text-left" }, "Name"), /* @__PURE__ */ jsx("th", { class: "text-left" }, "Price"), /* @__PURE__ */ jsx("th", { class: "text-left" }, "Duration"), /* @__PURE__ */ jsx("th", { class: "text-left" }, "Required"), /* @__PURE__ */ jsx("th", { class: "text-left" }, "Action"))), /* @__PURE__ */ jsx("tbody", null, modifiers.map((mod) => /* @__PURE__ */ jsx("tr", { key: mod.id }, /* @__PURE__ */ jsx("td", null, mod.name), /* @__PURE__ */ jsx("td", null, mod.price_adjustment_cents), /* @__PURE__ */ jsx("td", null, mod.duration_adjustment_minutes, " min"), /* @__PURE__ */ jsx("td", null, mod.is_required ? "Yes" : "No"), /* @__PURE__ */ jsx("td", null, /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      class: "delete-btn",
      "hx-post": `/admin/services/${service.id}/modifiers/${mod.id}/delete`,
      "data-confirm": "arm",
      "hx-target": "#page-content",
      "hx-select": "#page-content"
    },
    "Delete"
  )))), modifiers.length === 0 && /* @__PURE__ */ jsx("tr", null, /* @__PURE__ */ jsx("td", { colspan: 5, class: "text-muted-foreground" }, "No modifiers yet."))))), /* @__PURE__ */ jsx("form", { "hx-post": `/admin/services/${service.id}/modifiers`, "hx-target": "#page-content", "hx-select": "#page-content" }, /* @__PURE__ */ jsx("div", { class: "grid gap-3 sm:grid-cols-2" }, /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "mod-name" }, "Name"), /* @__PURE__ */ jsx("input", { id: "mod-name", name: "name", class: "uk-input", required: true })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "mod-required" }, "Required"), /* @__PURE__ */ jsx("label", { class: "flex items-center gap-2 text-sm" }, /* @__PURE__ */ jsx("input", { id: "mod-required", name: "is_required", type: "checkbox", class: "uk-checkbox" }), "Required")), /* @__PURE__ */ jsx("div", { class: "grid gap-2 sm:col-span-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "mod-description" }, "Description"), /* @__PURE__ */ jsx("input", { id: "mod-description", name: "description", class: "uk-input" })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "mod-price" }, "Price adjustment (cents)"), /* @__PURE__ */ jsx("input", { id: "mod-price", name: "price_adjustment_cents", type: "number", class: "uk-input", value: "0" })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "mod-duration" }, "Duration adjustment (minutes)"), /* @__PURE__ */ jsx("input", { id: "mod-duration", name: "duration_adjustment_minutes", type: "number", class: "uk-input", value: "0" }))), /* @__PURE__ */ jsx("div", { class: "mt-4" }, /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-default" }, "Add Modifier"))))), /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Price Rules"), /* @__PURE__ */ jsx("div", { class: "uk-overflow-auto mb-4" }, /* @__PURE__ */ jsx("table", { class: "uk-table uk-table-divider uk-table-hover uk-table-sm text-sm" }, /* @__PURE__ */ jsx("thead", null, /* @__PURE__ */ jsx("tr", null, /* @__PURE__ */ jsx("th", { class: "text-left" }, "Type"), /* @__PURE__ */ jsx("th", { class: "text-left" }, "Adjustment"), /* @__PURE__ */ jsx("th", { class: "text-left" }, "Details"), /* @__PURE__ */ jsx("th", { class: "text-left" }, "Action"))), /* @__PURE__ */ jsx("tbody", null, priceRules.map((rule) => /* @__PURE__ */ jsx("tr", { key: rule.id }, /* @__PURE__ */ jsx("td", null, rule.rule_type), /* @__PURE__ */ jsx("td", null, rule.direction, " ", rule.adjustment_value, " ", rule.adjustment_type === "percentage" ? "%" : "cents"), /* @__PURE__ */ jsx("td", null, formatRuleDetails(rule)), /* @__PURE__ */ jsx("td", null, /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      class: "delete-btn",
      "hx-post": `/admin/services/${service.id}/rules/${rule.id}/delete`,
      "data-confirm": "arm",
      "hx-target": "#page-content",
      "hx-select": "#page-content"
    },
    "Delete"
  )))), priceRules.length === 0 && /* @__PURE__ */ jsx("tr", null, /* @__PURE__ */ jsx("td", { colspan: 4, class: "text-muted-foreground" }, "No price rules yet."))))), /* @__PURE__ */ jsx("form", { "hx-post": `/admin/services/${service.id}/rules`, "hx-target": "#page-content", "hx-select": "#page-content" }, /* @__PURE__ */ jsx("div", { class: "grid gap-3 sm:grid-cols-2" }, /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "rule-type" }, "Rule Type"), /* @__PURE__ */ jsx("select", { id: "rule-type", name: "rule_type", class: "uk-select" }, /* @__PURE__ */ jsx("option", { value: "time_of_day" }, "Time of Day"), /* @__PURE__ */ jsx("option", { value: "day_of_week" }, "Day of Week"), /* @__PURE__ */ jsx("option", { value: "lead_time" }, "Lead Time"), /* @__PURE__ */ jsx("option", { value: "territory" }, "Territory"))), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "adjustment-type" }, "Adjustment Type"), /* @__PURE__ */ jsx("select", { id: "adjustment-type", name: "adjustment_type", class: "uk-select" }, /* @__PURE__ */ jsx("option", { value: "flat" }, "Flat"), /* @__PURE__ */ jsx("option", { value: "percentage" }, "Percentage"))), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "adjustment-value" }, "Adjustment Value"), /* @__PURE__ */ jsx("input", { id: "adjustment-value", name: "adjustment_value", type: "number", class: "uk-input", value: "0" })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "direction" }, "Direction"), /* @__PURE__ */ jsx("select", { id: "direction", name: "direction", class: "uk-select" }, /* @__PURE__ */ jsx("option", { value: "surcharge" }, "Surcharge"), /* @__PURE__ */ jsx("option", { value: "discount" }, "Discount"))), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "days-of-week" }, "Days of Week (csv)"), /* @__PURE__ */ jsx("input", { id: "days-of-week", name: "days_of_week", class: "uk-input", placeholder: "1,2,3" })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "rule-territory" }, "Territory"), /* @__PURE__ */ jsx("select", { id: "rule-territory", name: "territory_id", class: "uk-select" }, /* @__PURE__ */ jsx("option", { value: "" }, "Any territory"), territories.map((t) => /* @__PURE__ */ jsx("option", { value: t.id, key: t.id }, t.name)))), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "start-time" }, "Start Time"), /* @__PURE__ */ jsx("input", { id: "start-time", name: "start_time", type: "time", class: "uk-input" })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "end-time" }, "End Time"), /* @__PURE__ */ jsx("input", { id: "end-time", name: "end_time", type: "time", class: "uk-input" })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "min-hours" }, "Min Hours Ahead"), /* @__PURE__ */ jsx("input", { id: "min-hours", name: "min_hours_ahead", type: "number", min: 0, class: "uk-input" })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "max-hours" }, "Max Hours Ahead"), /* @__PURE__ */ jsx("input", { id: "max-hours", name: "max_hours_ahead", type: "number", min: 0, class: "uk-input" }))), /* @__PURE__ */ jsx("div", { class: "mt-4" }, /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-default" }, "Add Price Rule"))))), /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Required Skills"), /* @__PURE__ */ jsx("div", { class: "flex flex-wrap gap-2 mb-4" }, requiredSkills.map((skill) => {
    const keep = requiredSkills.filter((s) => s.id !== skill.id);
    return /* @__PURE__ */ jsx("form", { key: skill.id, "hx-post": `/admin/services/${service.id}/skills`, "hx-target": "#page-content", "hx-select": "#page-content", class: "flex items-center gap-1" }, keep.map((s) => /* @__PURE__ */ jsx("input", { key: s.id, type: "hidden", name: "skill_ids", value: s.id })), /* @__PURE__ */ jsx("span", { class: "uk-label" }, skill.name), /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-default uk-btn-sm" }, "x"));
  }), requiredSkills.length === 0 && /* @__PURE__ */ jsx("span", { class: "text-sm text-muted-foreground" }, "No required skills.")), /* @__PURE__ */ jsx("form", { "hx-post": `/admin/services/${service.id}/skills`, "hx-target": "#page-content", "hx-select": "#page-content", class: "flex items-end gap-3" }, requiredSkills.map((skill) => /* @__PURE__ */ jsx("input", { key: skill.id, type: "hidden", name: "skill_ids", value: skill.id })), /* @__PURE__ */ jsx("div", { class: "grid gap-2 flex-1" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "skill-id" }, "Add Skill"), /* @__PURE__ */ jsx("select", { id: "skill-id", name: "skill_ids", class: "uk-select" }, /* @__PURE__ */ jsx("option", { value: "" }, "Select skill..."), allSkills.map((skill) => /* @__PURE__ */ jsx("option", { value: skill.id, key: skill.id }, skill.name)))), /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-default" }, "Add")))), /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-3" }, "Delete"), /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      class: "delete-btn",
      "hx-post": `/admin/services/${service.id}/delete`,
      "data-confirm": "arm",
      "hx-target": "#page-content"
    },
    "Delete Service"
  ))))));
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
  return /* @__PURE__ */ jsx("div", null, /* @__PURE__ */ jsx("form", { "hx-post": `/admin/territories/${tid}/area`, "hx-target": "#page-content", "hx-select": "#page-content" }, /* @__PURE__ */ jsx("input", { type: "hidden", name: "service_area_type", value: "zip" }), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "zip-codes" }, "ZIP/Postal Codes"), /* @__PURE__ */ jsx("textarea", { id: "zip-codes", name: "zip_codes", class: "uk-textarea", rows: 4, placeholder: "K8N1A1, K8N1A2" }, zipCodes.join(", ")), /* @__PURE__ */ jsx("p", { class: "text-sm text-muted-foreground" }, "Comma-separated list.")), /* @__PURE__ */ jsx("div", { class: "mt-4" }, /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-default" }, "Save Service Area"))));
}, "ZipPanel");
var RadiusPanel = /* @__PURE__ */ __name(({ tid, areaData }) => {
  const center = areaData.center || {};
  const lat = Number(center.lat || 44.1628);
  const lng = Number(center.lng || -77.3832);
  const miles = Number(areaData.radius_miles || 10);
  return /* @__PURE__ */ jsx("div", null, /* @__PURE__ */ jsx("form", { "hx-post": `/admin/territories/${tid}/area`, "hx-target": "#page-content", "hx-select": "#page-content" }, /* @__PURE__ */ jsx("input", { type: "hidden", name: "service_area_type", value: "radius" }), /* @__PURE__ */ jsx("div", { class: "grid gap-3 sm:grid-cols-2 mb-4" }, /* @__PURE__ */ jsx("div", { class: "grid gap-2 sm:col-span-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "center-address-search" }, "Address Search"), /* @__PURE__ */ jsx(
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
  ), /* @__PURE__ */ jsx("div", { id: "radius-address-results" })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "center-lat" }, "Center Latitude"), /* @__PURE__ */ jsx("input", { id: "center-lat", name: "center_lat", class: "uk-input", value: lat.toString() })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "center-lng" }, "Center Longitude"), /* @__PURE__ */ jsx("input", { id: "center-lng", name: "center_lng", class: "uk-input", value: lng.toString() })), /* @__PURE__ */ jsx("div", { class: "grid gap-2 sm:col-span-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "radius-miles" }, "Radius (miles)"), /* @__PURE__ */ jsx("input", { id: "radius-miles", name: "radius_miles", type: "number", min: 1, step: 0.1, class: "uk-input", value: miles.toString() }))), /* @__PURE__ */ jsx("div", { id: "radius-map", style: "height: 300px; border: 1px solid #ddd; border-radius: 8px;", "data-lat": lat.toString(), "data-lng": lng.toString(), "data-miles": miles.toString() }), /* @__PURE__ */ jsx("div", { class: "mt-4" }, /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-default" }, "Save Service Area"))));
}, "RadiusPanel");
var GeofencePanel = /* @__PURE__ */ __name(({ tid, areaData }) => {
  const polygon = Array.isArray(areaData.polygon) ? areaData.polygon : [];
  return /* @__PURE__ */ jsx("div", null, /* @__PURE__ */ jsx("form", { "hx-post": `/admin/territories/${tid}/area`, "hx-target": "#page-content", "hx-select": "#page-content" }, /* @__PURE__ */ jsx("input", { type: "hidden", name: "service_area_type", value: "geofence" }), /* @__PURE__ */ jsx("div", { class: "flex items-center gap-2 mb-3" }, /* @__PURE__ */ jsx("button", { id: "gf-draw-btn", type: "button", class: "uk-btn uk-btn-default uk-btn-sm" }, "Draw Polygon"), /* @__PURE__ */ jsx("button", { id: "clear-geofence-btn", type: "button", class: "uk-btn uk-btn-default uk-btn-sm" }, "Clear"), /* @__PURE__ */ jsx("span", { id: "gf-count", class: "text-sm text-muted-foreground" }, polygon.length, " pts")), /* @__PURE__ */ jsx("div", { id: "geofence-map", style: "height: 320px; border: 1px solid #ddd; border-radius: 8px;", "data-points": JSON.stringify(polygon) }), /* @__PURE__ */ jsx("input", { id: "polygon-json-hidden", type: "hidden", name: "polygon_json", value: polygon.length ? JSON.stringify(polygon) : "" }), /* @__PURE__ */ jsx("div", { class: "mt-4" }, /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-default" }, "Save Service Area"))));
}, "GeofencePanel");
var TerritoryDetailPage = /* @__PURE__ */ __name(({ territory, services, providers, isNew }) => {
  const areaData = parseAreaData(territory.service_area_data);
  const zipCodes = (areaData.zip_codes || areaData.zipCodes || []).filter(Boolean);
  const operatingHours = parseOperatingHours(territory.operating_hours);
  const selectedType = territory.service_area_type || "zip";
  const submitUrl = isNew ? "/admin/territories" : `/admin/territories/${territory.id}`;
  const assignedServices = services.filter((s) => s.assigned).length;
  const assignedProviders = providers.filter((p) => p.assigned).length;
  return /* @__PURE__ */ jsx(Layout, { title: isNew ? "Create Territory" : territory.name || "Territory" }, /* @__PURE__ */ jsx("div", { class: "flex items-center justify-between px-8 py-5 bg-white border-b border-border sticky top-0 z-50" }, /* @__PURE__ */ jsx("h2", { class: "text-xl font-semibold" }, isNew ? "Create Territory" : territory.name || "Territory"), /* @__PURE__ */ jsx("a", { href: "/admin/territories", class: "uk-btn uk-btn-default uk-btn-sm", "hx-get": "/admin/territories", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, "Back")), /* @__PURE__ */ jsx("div", { class: "p-8" }, /* @__PURE__ */ jsx("div", { class: "grid gap-6", style: "max-width: 800px;" }, /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Basic Info"), /* @__PURE__ */ jsx("form", { "hx-post": submitUrl, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true" }, !isNew && /* @__PURE__ */ jsx("input", { type: "hidden", name: "_section", value: "basic" }), /* @__PURE__ */ jsx("div", { class: "grid gap-4 sm:grid-cols-2" }, /* @__PURE__ */ jsx("div", { class: "grid gap-2 sm:col-span-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "territory-name" }, "Name"), /* @__PURE__ */ jsx("input", { id: "territory-name", name: "name", class: "uk-input", value: territory.name, required: true })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "territory-timezone" }, "Timezone"), /* @__PURE__ */ jsx("select", { id: "territory-timezone", name: "timezone", class: "uk-select" }, TIMEZONES.map((tz) => /* @__PURE__ */ jsx("option", { value: tz, selected: territory.timezone === tz, key: tz }, tz)))), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "territory-policy" }, "Scheduling Policy"), /* @__PURE__ */ jsx("select", { id: "territory-policy", name: "scheduling_policy", class: "uk-select" }, /* @__PURE__ */ jsx("option", { value: "provider_based", selected: territory.scheduling_policy === "provider_based" }, "Provider based"), /* @__PURE__ */ jsx("option", { value: "manual", selected: territory.scheduling_policy === "manual" }, "Manual"))), /* @__PURE__ */ jsx("label", { class: "uk-form-label flex items-center gap-2 cursor-pointer sm:col-span-2" }, /* @__PURE__ */ jsx("input", { type: "checkbox", name: "is_active", checked: Boolean(territory.is_active), class: "uk-toggle-switch uk-toggle-switch-primary" }), "Active"), isNew && /* @__PURE__ */ jsx("input", { type: "hidden", name: "service_area_type", value: selectedType })), /* @__PURE__ */ jsx("div", { class: "mt-4" }, /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-primary" }, isNew ? "Create" : "Save"))))), !isNew && /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Service Area"), /* @__PURE__ */ jsx("div", { class: "grid gap-3 sm:grid-cols-2 items-end mb-4" }, /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, /* @__PURE__ */ jsx("label", { class: "uk-form-label", for: "area-type" }, "Service Area Type"), /* @__PURE__ */ jsx(
    "select",
    {
      id: "area-type",
      class: "uk-select",
      name: "panel_type",
      "hx-get": `/admin/territories/${territory.id}/area-panel/${selectedType}`,
      "hx-target": "#area-panel",
      "hx-swap": "innerHTML",
      "hx-on:change": `this.setAttribute('hx-get','/admin/territories/${territory.id}/area-panel/' + this.value)`
    },
    /* @__PURE__ */ jsx("option", { value: "zip", selected: selectedType === "zip" }, "ZIP / Postal Codes"),
    /* @__PURE__ */ jsx("option", { value: "radius", selected: selectedType === "radius" }, "Radius"),
    /* @__PURE__ */ jsx("option", { value: "geofence", selected: selectedType === "geofence" }, "Geofence")
  ))), /* @__PURE__ */ jsx("div", { id: "area-panel" }, selectedType === "radius" && RadiusPanel({ tid: territory.id, areaData }), selectedType === "geofence" && GeofencePanel({ tid: territory.id, areaData }), selectedType === "zip" && ZipPanel({ tid: territory.id, zipCodes })))), !isNew && /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-4" }, "Operating Hours"), /* @__PURE__ */ jsx("form", { "hx-post": `/admin/territories/${territory.id}/hours`, "hx-target": "#page-content", "hx-select": "#page-content" }, /* @__PURE__ */ jsx("div", { class: "grid gap-3" }, HOURS.map((d) => {
    const row = operatingHours[d.key] || null;
    return /* @__PURE__ */ jsx("div", { class: "grid grid-cols-[60px_1fr_1fr_auto] gap-3 items-center", key: d.key }, /* @__PURE__ */ jsx("span", { class: "text-sm text-muted-foreground" }, d.label), /* @__PURE__ */ jsx("input", { type: "time", name: `${d.key}_start`, class: "uk-input", value: row?.start || "09:00" }), /* @__PURE__ */ jsx("input", { type: "time", name: `${d.key}_end`, class: "uk-input", value: row?.end || "17:00" }), /* @__PURE__ */ jsx("label", { class: "flex items-center gap-2 text-sm" }, /* @__PURE__ */ jsx("input", { type: "checkbox", name: `${d.key}_enabled`, class: "uk-checkbox", checked: Boolean(row) }), "Enabled"));
  })), /* @__PURE__ */ jsx("div", { class: "mt-4" }, /* @__PURE__ */ jsx("button", { type: "submit", class: "uk-btn uk-btn-default" }, "Save Hours"))))), !isNew && /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", { id: "territory-services" }, /* @__PURE__ */ jsx("div", { class: "flex items-center justify-between mb-4" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold" }, "Services"), /* @__PURE__ */ jsx("span", { id: "territory-services-count", class: "text-sm text-muted-foreground" }, assignedServices, " assigned"), /* @__PURE__ */ jsx("span", { class: "save-indicator" })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, services.map((s) => /* @__PURE__ */ jsx("label", { class: "flex items-center justify-between gap-3", key: s.id }, /* @__PURE__ */ jsx("span", { class: "text-sm" }, s.name), /* @__PURE__ */ jsx(
    "input",
    {
      type: "checkbox",
      class: "uk-checkbox",
      checked: s.assigned,
      "hx-post": `/admin/territories/${territory.id}/services/${s.id}/toggle`,
      "hx-swap": "none"
    }
  )))))), !isNew && /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", { id: "territory-providers" }, /* @__PURE__ */ jsx("div", { class: "flex items-center justify-between mb-4" }, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold" }, "Providers"), /* @__PURE__ */ jsx("span", { id: "territory-providers-count", class: "text-sm text-muted-foreground" }, assignedProviders, " assigned"), /* @__PURE__ */ jsx("span", { class: "save-indicator" })), /* @__PURE__ */ jsx("div", { class: "grid gap-2" }, providers.map((p) => /* @__PURE__ */ jsx("label", { class: "flex items-center justify-between gap-3", key: p.id }, /* @__PURE__ */ jsx("span", { class: "text-sm" }, p.first_name, " ", p.last_name), /* @__PURE__ */ jsx(
    "input",
    {
      type: "checkbox",
      class: "uk-checkbox",
      checked: p.assigned,
      "hx-post": `/admin/territories/${territory.id}/providers/${p.id}/toggle`,
      "hx-swap": "none"
    }
  )))))), !isNew && /* @__PURE__ */ jsx("div", { class: "uk-card uk-card-body" }, /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("h3", { class: "text-base font-semibold mb-3" }, "Delete"), /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      class: "delete-btn",
      "hx-post": `/admin/territories/${territory.id}/delete`,
      "data-confirm": "arm",
      "hx-target": "#page-content"
    },
    "Delete Territory"
  ))))));
}, "TerritoryDetailPage");

// src/routes/admin.ts
var app = new Hono2();
var generateId = /* @__PURE__ */ __name(() => crypto.randomUUID(), "generateId");
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
    recentBookings
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
             s.name as service_name, j.created_at, j.total_price_cents
      FROM jobs j
      JOIN customers c ON j.customer_id = c.id
      LEFT JOIN services s ON j.service_id = s.id
      ORDER BY j.created_at DESC
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
    recentBookings: recentBookings.results || []
  });
  return c.html(dashboardHtml);
});
app.get("/territories", async (c) => {
  const db = c.env.DB;
  const territories = await db.prepare(`
    SELECT id, name, service_area_type, scheduling_policy, is_active
    FROM territories ORDER BY name
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
  return c.redirect(`/admin/territories/${id}`);
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
  return c.redirect(`/admin/territories/${id}`);
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
    { name: "base_price_cents", label: "Base Price (cents)", type: "number", required: true, min: 0 },
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
    parseInt(body.base_price_cents, 10) || 0,
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
      parseInt(body.base_price_cents, 10) || 0,
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
    parseInt(body.base_price_cents, 10) || 0,
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
    parseInt(body.price_adjustment_cents, 10) || 0,
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
    parseInt(body.adjustment_value, 10) || 0,
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
    SELECT id, first_name, last_name, email, phone
    FROM customers ORDER BY created_at DESC LIMIT 50
  `).all();
  return c.html(TableView({
    title: "Customers",
    columns: ["Name", "Email", "Phone"],
    rows: (customers.results || []).map((cust) => ({
      name: `${cust.first_name} ${cust.last_name}`,
      email: cust.email || "-",
      phone: cust.phone || "-"
    })),
    rawIds: (customers.results || []).map((cust) => cust.id),
    createUrl: "/admin/customers/new",
    detailUrlPrefix: "/admin/customers",
    deleteUrlPrefix: "/admin/customers"
  }));
});
app.get("/customers/new", (c) => {
  const fields = [
    { name: "first_name", label: "First Name", required: true },
    { name: "last_name", label: "Last Name", required: true },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Phone", type: "tel" }
  ];
  return c.html(FormView({
    title: "Create Customer",
    fields,
    submitUrl: "/admin/customers",
    cancelUrl: "/admin/customers"
  }));
});
app.post("/customers", async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const id = generateId();
  await db.prepare(`
    INSERT INTO customers (id, first_name, last_name, email, phone)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    id,
    body.first_name,
    body.last_name,
    body.email || null,
    body.phone || null
  ).run();
  return c.redirect("/admin/customers");
});
app.get("/customers/:id/edit", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const customer = await db.prepare("SELECT * FROM customers WHERE id = ?").bind(id).first();
  if (!customer) {
    return c.redirect("/admin/customers");
  }
  const fields = [
    { name: "first_name", label: "First Name", required: true, value: customer.first_name },
    { name: "last_name", label: "Last Name", required: true, value: customer.last_name },
    { name: "email", label: "Email", type: "email", value: customer.email },
    { name: "phone", label: "Phone", type: "tel", value: customer.phone }
  ];
  return c.html(FormView({
    title: "Edit Customer",
    fields,
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
  await db.prepare(`
    UPDATE customers 
    SET first_name = ?, last_name = ?, email = ?, phone = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.first_name,
    body.last_name,
    body.email || null,
    body.phone || null,
    id
  ).run();
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
    FROM team_members ORDER BY last_name, first_name
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
                        duration_minutes, base_price_cents, total_price_cents, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  const q = c.req.query("q") || c.req.query("center_address_q") || "";
  const targetPrefix = c.req.query("center_address_q") ? "radius" : void 0;
  if (q.length < 4) return c.html("");
  try {
    const token = c.env?.MAPBOX_ACCESS_TOKEN || "";
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
  const id = generateId();
  await db.prepare("INSERT INTO customers (id, first_name, last_name, email, phone) VALUES (?, ?, ?, ?, ?)").bind(
    id,
    body.first_name,
    body.last_name,
    body.email || null,
    body.phone || null
  ).run();
  return c.html(JobWizardPage({
    step: 1,
    state: {},
    customer: { id, first_name: body.first_name, last_name: body.last_name, email: body.email, phone: body.phone }
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
    INSERT INTO jobs (id, customer_id, service_id, territory_id, scheduled_date, scheduled_start_time, duration_minutes, base_price_cents, total_price_cents, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  const [customer, service, territory, jobProviders, teamProviders, notes] = await Promise.all([
    job.customer_id ? db.prepare("SELECT id, first_name, last_name, email, phone FROM customers WHERE id = ?").bind(job.customer_id).first() : null,
    job.service_id ? db.prepare("SELECT id, name, description FROM services WHERE id = ?").bind(job.service_id).first() : null,
    job.territory_id ? db.prepare("SELECT id, name FROM territories WHERE id = ?").bind(job.territory_id).first() : null,
    db.prepare("SELECT tm.id, tm.first_name, tm.last_name FROM job_providers jp JOIN team_members tm ON jp.team_member_id = tm.id WHERE jp.job_id = ?").bind(id).all(),
    db.prepare("SELECT id, first_name, last_name FROM team_members WHERE role = 'provider' ORDER BY last_name, first_name").all(),
    db.prepare("SELECT id, content, created_at FROM job_notes WHERE job_id = ? ORDER BY created_at DESC").bind(id).all()
  ]);
  const assignedProviderId = (jobProviders.results || [])[0]?.id;
  let lineItems;
  try {
    const raw2 = job.line_items_json;
    if (typeof raw2 === "string" && raw2.trim()) {
      const parsed = JSON.parse(raw2);
      if (Array.isArray(parsed)) {
        lineItems = parsed;
      }
    }
  } catch {
  }
  const jobModel = job;
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
    notes: (notes.results || []).map((n) => ({
      id: n.id,
      content: n.content,
      created_at: n.created_at
    })),
    lineItems
  }));
});
app.post("/jobs/:id/notes", async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param("id");
  const body = await c.req.parseBody();
  await db.prepare("INSERT INTO job_notes (id, job_id, content) VALUES (?, ?, ?)").bind(generateId(), jobId, body.content).run();
  return c.redirect(`/admin/jobs/${jobId}`);
});
app.post("/jobs/:id/status", async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param("id");
  const body = await c.req.parseBody();
  const status = body.status;
  const updates = [`status = '${status}'`, "updated_at = datetime('now')"];
  if (status === "complete") updates.push("completed_at = datetime('now')");
  if (status === "cancelled") updates.push("cancelled_at = datetime('now')");
  await db.prepare(`UPDATE jobs SET ${updates.join(", ")} WHERE id = ?`).bind(jobId).run();
  if (status === "complete") {
    const job = await db.prepare(
      "SELECT customer_id, total_price_cents, line_items_json FROM jobs WHERE id = ?"
    ).bind(jobId).first();
    if (job) {
      const existingInvoice = await db.prepare(
        "SELECT id FROM invoices WHERE job_id = ?"
      ).bind(jobId).first();
      if (!existingInvoice) {
        const invoiceId = generateId();
        const dueDate = /* @__PURE__ */ new Date();
        dueDate.setDate(dueDate.getDate() + 14);
        await db.prepare(`
          INSERT INTO invoices (id, job_id, customer_id, amount_cents, due_date, status)
          VALUES (?, ?, ?, ?, ?, 'pending')
        `).bind(invoiceId, jobId, job.customer_id, job.total_price_cents, dueDate.toISOString().split("T")[0]).run();
        if (typeof job.line_items_json === "string" && job.line_items_json.trim()) {
          try {
            await db.prepare("UPDATE invoices SET line_items_json = ?, subtotal_cents = amount_cents, total_cents = amount_cents, updated_at = datetime('now') WHERE id = ?").bind(job.line_items_json, invoiceId).run();
          } catch (err) {
            console.warn("admin jobs status: failed to set invoice line_items_json", err);
          }
        }
      }
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
                      duration_minutes, base_price_cents, total_price_cents, custom_service_name, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    const basePriceCents = parseInt(body.base_price_cents, 10) || 0;
    const totalPriceCents2 = parseInt(body.total_price_cents, 10) || 0;
    const providerId = body.provider_id || "";
    await db.prepare(`
      UPDATE jobs
      SET scheduled_date = ?, scheduled_start_time = ?, duration_minutes = ?,
          base_price_cents = ?, total_price_cents = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      body.scheduled_date,
      body.scheduled_start_time,
      duration,
      basePriceCents,
      totalPriceCents2,
      id
    ).run();
    await db.prepare("DELETE FROM job_providers WHERE job_id = ?").bind(id).run();
    if (providerId) {
      await db.prepare("INSERT INTO job_providers (job_id, team_member_id) VALUES (?, ?)").bind(id, providerId).run();
    }
    return c.redirect(`/admin/jobs/${id}`);
  }
  const totalPriceCents = parseInt(body.total_price_cents, 10) || 0;
  await db.prepare(`
    UPDATE jobs 
    SET customer_id = ?, service_id = ?, territory_id = ?, scheduled_date = ?, scheduled_start_time = ?,
        duration_minutes = ?, total_price_cents = ?, custom_service_name = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.customer_id,
    body.service_id || null,
    body.territory_id,
    body.scheduled_date,
    body.scheduled_start_time,
    parseInt(body.duration_minutes, 10) || 60,
    totalPriceCents,
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
    SELECT i.id, c.first_name || ' ' || c.last_name as customer_name,
           i.amount_cents, i.status, i.created_at
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    ORDER BY i.created_at DESC
    LIMIT 50
  `).all();
  return c.html(TableView({
    title: "Invoices",
    columns: ["Customer", "Amount", "Status", "Created"],
    rows: (invoices.results || []).map((i) => ({
      customer: i.customer_name,
      amount: `$${(i.amount_cents / 100).toFixed(2)}`,
      status: i.status,
      created: new Date(i.created_at).toLocaleDateString()
    })),
    createUrl: "/admin/invoices/new",
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
  const fields = [
    { name: "customer_id", label: "Customer", type: "select", required: true, options: (customers.results || []).map((c2) => ({ value: c2.id, label: `${c2.first_name} ${c2.last_name}` })) },
    { name: "job_id", label: "Job (optional)", type: "select", options: (jobs.results || []).map((j) => ({ value: j.id, label: `${j.customer_name} - ${j.scheduled_date}` })) },
    { name: "line_items_json", label: "Line Items (JSON)", type: "textarea", placeholder: '[{"kind":"service","name":"Tune-Up","quantity":1,"unit_price_cents":7500}]' },
    { name: "tax_cents", label: "Tax (cents)", type: "number", min: 0, value: 0 },
    { name: "discount_cents", label: "Discount (cents)", type: "number", min: 0, value: 0 },
    { name: "amount_cents", label: "Amount (cents)", type: "number", required: true, min: 0, placeholder: "If line items provided, amount will be computed" },
    { name: "due_date", label: "Due Date", type: "date" },
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
  const parseLineItems = /* @__PURE__ */ __name((raw2) => {
    if (typeof raw2 !== "string" || !raw2.trim()) return null;
    try {
      const parsed = JSON.parse(raw2);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }, "parseLineItems");
  const computeSubtotal = /* @__PURE__ */ __name((items) => {
    let subtotal = 0;
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const r = item;
      const qty = Math.trunc(Number(r.quantity ?? 1));
      const unit = Math.trunc(Number(r.unit_price_cents ?? 0));
      if (!Number.isFinite(qty) || !Number.isFinite(unit)) continue;
      subtotal += (qty > 0 ? qty : 1) * unit;
    }
    return subtotal;
  }, "computeSubtotal");
  const taxCents = Math.max(0, Math.trunc(Number(body.tax_cents ?? 0)) || 0);
  const discountCents = Math.max(0, Math.trunc(Number(body.discount_cents ?? 0)) || 0);
  const lineItems = parseLineItems(body.line_items_json);
  const subtotalCents = lineItems ? computeSubtotal(lineItems) : null;
  const totalCents = subtotalCents === null ? null : Math.max(0, subtotalCents + taxCents - discountCents);
  const amountCents = totalCents === null ? parseInt(body.amount_cents, 10) || 0 : totalCents;
  await db.prepare(`
    INSERT INTO invoices (id, customer_id, job_id, amount_cents, due_date, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.customer_id,
    body.job_id || null,
    amountCents,
    body.due_date || null,
    body.status || "pending"
  ).run();
  if (lineItems || body.notes || body.tax_cents || body.discount_cents) {
    try {
      const sets = [];
      const vals = [];
      if (lineItems) {
        sets.push("line_items_json = ?");
        vals.push(JSON.stringify(lineItems));
        if (subtotalCents !== null) {
          sets.push("subtotal_cents = ?");
          vals.push(subtotalCents);
          sets.push("tax_cents = ?");
          vals.push(taxCents);
          sets.push("discount_cents = ?");
          vals.push(discountCents);
          sets.push("total_cents = ?");
          vals.push(totalCents);
        }
      }
      if (body.notes) {
        sets.push("notes = ?");
        vals.push(body.notes);
      }
      if (!lineItems && (body.tax_cents || body.discount_cents)) {
        sets.push("tax_cents = ?");
        vals.push(taxCents);
        sets.push("discount_cents = ?");
        vals.push(discountCents);
      }
      if (sets.length) {
        vals.push(id);
        await db.prepare(`UPDATE invoices SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`).bind(...vals).run();
      }
    } catch (err) {
      console.warn("admin invoices create: optional columns update failed", err);
    }
  }
  return c.redirect("/admin/invoices");
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
  const fields = [
    { name: "customer_id", label: "Customer", type: "select", required: true, value: invoice.customer_id, options: (customers.results || []).map((c2) => ({ value: c2.id, label: `${c2.first_name} ${c2.last_name}` })) },
    { name: "job_id", label: "Job (optional)", type: "select", value: invoice.job_id, options: (jobs.results || []).map((j) => ({ value: j.id, label: `${j.customer_name} - ${j.scheduled_date}` })) },
    { name: "line_items_json", label: "Line Items (JSON)", type: "textarea", value: invoice.line_items_json },
    { name: "tax_cents", label: "Tax (cents)", type: "number", min: 0, value: invoice.tax_cents },
    { name: "discount_cents", label: "Discount (cents)", type: "number", min: 0, value: invoice.discount_cents },
    { name: "amount_cents", label: "Amount (cents)", type: "number", required: true, min: 0, value: invoice.amount_cents },
    { name: "due_date", label: "Due Date", type: "date", value: invoice.due_date },
    { name: "status", label: "Status", type: "select", required: true, value: invoice.status, options: [
      { value: "pending", label: "Pending" },
      { value: "sent", label: "Sent" },
      { value: "paid", label: "Paid" },
      { value: "void", label: "Void" }
    ] }
  ];
  return c.html(FormView({
    title: "Edit Invoice",
    fields,
    submitUrl: `/admin/invoices/${id}`,
    cancelUrl: "/admin/invoices",
    isEdit: true,
    deleteUrl: `/admin/invoices/${id}/delete`
  }));
});
app.post("/invoices/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const parseLineItems = /* @__PURE__ */ __name((raw2) => {
    if (typeof raw2 !== "string" || !raw2.trim()) return null;
    try {
      const parsed = JSON.parse(raw2);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }, "parseLineItems");
  const computeSubtotal = /* @__PURE__ */ __name((items) => {
    let subtotal = 0;
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const r = item;
      const qty = Math.trunc(Number(r.quantity ?? 1));
      const unit = Math.trunc(Number(r.unit_price_cents ?? 0));
      if (!Number.isFinite(qty) || !Number.isFinite(unit)) continue;
      subtotal += (qty > 0 ? qty : 1) * unit;
    }
    return subtotal;
  }, "computeSubtotal");
  const taxCents = Math.max(0, Math.trunc(Number(body.tax_cents ?? 0)) || 0);
  const discountCents = Math.max(0, Math.trunc(Number(body.discount_cents ?? 0)) || 0);
  const lineItems = parseLineItems(body.line_items_json);
  const subtotalCents = lineItems ? computeSubtotal(lineItems) : null;
  const totalCents = subtotalCents === null ? null : Math.max(0, subtotalCents + taxCents - discountCents);
  const amountCents = totalCents === null ? parseInt(body.amount_cents, 10) || 0 : totalCents;
  await db.prepare(`
    UPDATE invoices 
    SET customer_id = ?, job_id = ?, amount_cents = ?, due_date = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.customer_id,
    body.job_id || null,
    amountCents,
    body.due_date || null,
    body.status || "pending",
    id
  ).run();
  try {
    const sets = [];
    const vals = [];
    if (lineItems) {
      sets.push("line_items_json = ?");
      vals.push(JSON.stringify(lineItems));
      if (subtotalCents !== null) {
        sets.push("subtotal_cents = ?");
        vals.push(subtotalCents);
        sets.push("tax_cents = ?");
        vals.push(taxCents);
        sets.push("discount_cents = ?");
        vals.push(discountCents);
        sets.push("total_cents = ?");
        vals.push(totalCents);
      }
    }
    if (!lineItems && (body.tax_cents || body.discount_cents)) {
      sets.push("tax_cents = ?");
      vals.push(taxCents);
      sets.push("discount_cents = ?");
      vals.push(discountCents);
    }
    if (sets.length) {
      vals.push(id);
      await db.prepare(`UPDATE invoices SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`).bind(...vals).run();
    }
  } catch (err) {
    console.warn("admin invoices update: optional columns update failed", err);
  }
  return c.redirect("/admin/invoices");
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
    { name: "total_price_cents", label: "Total Price (cents)", type: "number", required: true, value: 0, min: 0 },
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
  const totalPriceCents = parseInt(body.total_price_cents, 10) || 0;
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
    { name: "total_price_cents", label: "Total Price (cents)", type: "number", required: true, value: recurring.total_price_cents, min: 0 },
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
  const totalPriceCents = parseInt(body.total_price_cents, 10) || 0;
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
    { name: "discount_value", label: "Discount Value (percentage or cents)", type: "number", required: true, min: 0 },
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
    const date = /* @__PURE__ */ new Date(`${m.created_at}Z`);
    const dateStr = date.toLocaleDateString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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
  return c.html(MessageDetailPage({
    message: msg
  }));
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

// src/routes/bookings.ts
var app2 = new Hono2();
var asStringArray = /* @__PURE__ */ __name((value) => {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === "string" && value) return [value];
  return [];
}, "asStringArray");
var safeJsonStringify = /* @__PURE__ */ __name((value) => {
  try {
    return JSON.stringify(value ?? []);
  } catch {
    return "[]";
  }
}, "safeJsonStringify");
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
    let customerId = customer?.id;
    if (!customerId) {
      customerId = crypto.randomUUID();
      await db.prepare(
        `INSERT INTO customers (id, first_name, last_name, email, phone, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).bind(
        customerId,
        body.first_name,
        body.last_name,
        body.email || null,
        body.phone || null
      ).run();
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
    const lineItems = [
      {
        kind: "service",
        name: service.name,
        description: null,
        quantity: 1,
        unit_price_cents: Number(service.base_price_cents || 0),
        service_id: service.id,
        modifier_id: null,
        duration_minutes: Number(service.base_duration_minutes || 0)
      }
    ];
    if (selectedModifierIds.length > 0) {
      const modifierRows = await db.prepare(
        `SELECT id, price_adjustment_cents, duration_adjustment_minutes
         FROM service_modifiers
         WHERE service_id = ?
            AND id IN (${selectedModifierIds.map(() => "?").join(", ")})`
      ).bind(serviceId, ...selectedModifierIds).all();
      for (const modifier of modifierRows.results || []) {
        totalPrice += Number(modifier.price_adjustment_cents || 0);
        totalDuration += Number(modifier.duration_adjustment_minutes || 0);
        lineItems.push({
          kind: "modifier",
          name: `Modifier ${String(modifier.id).slice(0, 8)}`,
          description: null,
          quantity: 1,
          unit_price_cents: Number(modifier.price_adjustment_cents || 0),
          service_id: service.id,
          modifier_id: modifier.id,
          duration_minutes: Number(modifier.duration_adjustment_minutes || 0)
        });
      }
    }
    const jobId = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO jobs
       (id, customer_id, service_id, territory_id, customer_address_id, scheduled_date, scheduled_start_time,
        duration_minutes, base_price_cents, total_price_cents, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', datetime('now'), datetime('now'))`
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
      totalPrice
    ).run();
    try {
      await db.prepare("UPDATE jobs SET line_items_json = ?, updated_at = datetime('now') WHERE id = ?").bind(safeJsonStringify(lineItems), jobId).run();
    } catch (err) {
      console.warn("booking create: failed to set jobs.line_items_json", err);
    }
    const job = await db.prepare("SELECT * FROM jobs WHERE id = ?").bind(jobId).first();
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
var app5 = new Hono2();
var asArray = /* @__PURE__ */ __name((value) => {
  if (Array.isArray(value)) return value.filter((v) => Boolean(v && typeof v === "object"));
  return [];
}, "asArray");
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
    await db.prepare(
      `INSERT INTO customers (id, first_name, last_name, email, phone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(id, body.first_name, body.last_name, body.email || null, body.phone || null).run();
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
    for (const key of ["first_name", "last_name", "email", "phone"]) {
      if (body[key] !== void 0) {
        fields.push(`${key} = ?`);
        values.push(body[key]);
      }
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
var asInteger = /* @__PURE__ */ __name((value, fallback) => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}, "asInteger");
var parseLineItemsJson = /* @__PURE__ */ __name((value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    const items = [];
    for (const raw2 of parsed) {
      if (!raw2 || typeof raw2 !== "object") continue;
      const r = raw2;
      const name = typeof r.name === "string" ? r.name.trim() : "";
      if (!name) continue;
      const quantity = asInteger(r.quantity, 1);
      const unit = asInteger(r.unit_price_cents, 0);
      items.push({
        kind: r.kind === "service" || r.kind === "modifier" || r.kind === "custom" ? r.kind : void 0,
        name,
        description: typeof r.description === "string" ? r.description : null,
        quantity: quantity > 0 ? quantity : 1,
        unit_price_cents: unit,
        service_id: typeof r.service_id === "string" ? r.service_id : null,
        modifier_id: typeof r.modifier_id === "string" ? r.modifier_id : null,
        duration_minutes: r.duration_minutes === null || r.duration_minutes === void 0 ? null : asInteger(r.duration_minutes, 0)
      });
    }
    return items;
  } catch {
    return null;
  }
}, "parseLineItemsJson");
var parseLineItemsFromBody = /* @__PURE__ */ __name((body) => {
  if (Array.isArray(body.line_items)) {
    try {
      return parseLineItemsJson(JSON.stringify(body.line_items));
    } catch {
      return null;
    }
  }
  return parseLineItemsJson(body.line_items_json);
}, "parseLineItemsFromBody");
var computeSubtotalCents = /* @__PURE__ */ __name((items) => {
  let subtotal = 0;
  for (const item of items) {
    const qty = Number.isFinite(item.quantity) ? item.quantity : 1;
    const unit = Number.isFinite(item.unit_price_cents) ? item.unit_price_cents : 0;
    subtotal += Math.trunc(qty) * Math.trunc(unit);
  }
  return subtotal;
}, "computeSubtotalCents");
var safeJsonStringify2 = /* @__PURE__ */ __name((value) => {
  try {
    return JSON.stringify(value ?? []);
  } catch {
    return "[]";
  }
}, "safeJsonStringify");
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
    const withParsed = { ...invoice };
    const parsed = parseLineItemsJson(withParsed.line_items_json);
    if (parsed) {
      withParsed.line_items = parsed;
    }
    return c.json(withParsed);
  } catch (error) {
    console.error("invoices get error", error);
    return c.json({ error: "Failed to get invoice" }, 500);
  }
});
app6.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const items = parseLineItemsFromBody(body);
    const taxCents = asInteger(body.tax_cents, 0);
    const discountCents = asInteger(body.discount_cents, 0);
    const subtotalCents = items ? computeSubtotalCents(items) : null;
    const totalCents = subtotalCents === null ? null : Math.max(0, subtotalCents + taxCents - discountCents);
    const amountCents = totalCents === null ? asInteger(body.amount_cents, 0) : totalCents;
    const lineItemsJson = items ? safeJsonStringify2(items) : null;
    await c.env.DB.prepare(
      `INSERT INTO invoices (id, job_id, customer_id, amount_cents, due_date, status, paid_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      id,
      body.job_id || null,
      body.customer_id,
      amountCents,
      body.due_date || null,
      body.status || "pending",
      body.paid_at || null
    ).run();
    if (lineItemsJson !== null || totalCents !== null || subtotalCents !== null || body.notes !== void 0) {
      try {
        const sets = [];
        const vals = [];
        if (lineItemsJson !== null) {
          sets.push("line_items_json = ?");
          vals.push(lineItemsJson);
        }
        if (subtotalCents !== null) {
          sets.push("subtotal_cents = ?");
          vals.push(subtotalCents);
        }
        if (taxCents !== 0 || body.tax_cents !== void 0) {
          sets.push("tax_cents = ?");
          vals.push(taxCents);
        }
        if (discountCents !== 0 || body.discount_cents !== void 0) {
          sets.push("discount_cents = ?");
          vals.push(discountCents);
        }
        if (totalCents !== null) {
          sets.push("total_cents = ?");
          vals.push(totalCents);
        }
        if (body.notes !== void 0) {
          sets.push("notes = ?");
          vals.push(body.notes || null);
        }
        if (sets.length > 0) {
          vals.push(id);
          await c.env.DB.prepare(`UPDATE invoices SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`).bind(...vals).run();
        }
      } catch (err) {
        console.warn("invoices create: optional columns update failed", err);
      }
    }
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
    const fields = [];
    const values = [];
    for (const key of ["job_id", "customer_id", "amount_cents", "due_date", "status", "paid_at"]) {
      if (body[key] !== void 0) {
        fields.push(`${key} = ?`);
        values.push(body[key]);
      }
    }
    const items = parseLineItemsFromBody(body);
    const notes = body.notes !== void 0 ? body.notes : void 0;
    const taxCents = body.tax_cents !== void 0 ? asInteger(body.tax_cents, 0) : asInteger(existing.tax_cents, 0);
    const discountCents = body.discount_cents !== void 0 ? asInteger(body.discount_cents, 0) : asInteger(existing.discount_cents, 0);
    const hasLineItemInput = body.line_items !== void 0 || body.line_items_json !== void 0;
    if (hasLineItemInput) {
      const serialized = safeJsonStringify2(items || []);
      fields.push("line_items_json = ?");
      values.push(serialized);
      const subtotal = computeSubtotalCents(items || []);
      const total = Math.max(0, subtotal + taxCents - discountCents);
      fields.push("subtotal_cents = ?");
      values.push(subtotal);
      fields.push("tax_cents = ?");
      values.push(taxCents);
      fields.push("discount_cents = ?");
      values.push(discountCents);
      fields.push("total_cents = ?");
      values.push(total);
      fields.push("amount_cents = ?");
      values.push(total);
    } else if (body.tax_cents !== void 0 || body.discount_cents !== void 0) {
      const existingItems = parseLineItemsJson(existing.line_items_json);
      if (existingItems) {
        const subtotal = computeSubtotalCents(existingItems);
        const total = Math.max(0, subtotal + taxCents - discountCents);
        fields.push("subtotal_cents = ?");
        values.push(subtotal);
        fields.push("tax_cents = ?");
        values.push(taxCents);
        fields.push("discount_cents = ?");
        values.push(discountCents);
        fields.push("total_cents = ?");
        values.push(total);
        fields.push("amount_cents = ?");
        values.push(total);
      } else {
        fields.push("tax_cents = ?");
        values.push(taxCents);
        fields.push("discount_cents = ?");
        values.push(discountCents);
      }
    }
    if (notes !== void 0) {
      fields.push("notes = ?");
      values.push(notes || null);
    }
    if (fields.length === 0) return c.json({ error: "No fields to update" }, 400);
    fields.push("updated_at = datetime('now')");
    values.push(id);
    try {
      await c.env.DB.prepare(`UPDATE invoices SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    } catch (err) {
      const coreKeys = /* @__PURE__ */ new Set(["job_id", "customer_id", "amount_cents", "due_date", "status", "paid_at"]);
      const coreFields = [];
      const coreValues = [];
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        const k = f.split("=")[0]?.trim();
        if (!k || k === "updated_at") continue;
        if (coreKeys.has(k)) {
          coreFields.push(f);
          coreValues.push(values[i]);
        }
      }
      if (coreFields.length === 0) throw err;
      coreFields.push("updated_at = datetime('now')");
      coreValues.push(id);
      await c.env.DB.prepare(`UPDATE invoices SET ${coreFields.join(", ")} WHERE id = ?`).bind(...coreValues).run();
    }
    const updated = await c.env.DB.prepare("SELECT * FROM invoices WHERE id = ?").bind(id).first();
    if (!updated) return c.json({ error: "Not found" }, 404);
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
  const due = /* @__PURE__ */ new Date();
  due.setDate(due.getDate() + 14);
  const invoiceId = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO invoices (id, job_id, customer_id, amount_cents, due_date, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`
  ).bind(invoiceId, jobId, job.customer_id, job.total_price_cents, due.toISOString().split("T")[0]).run();
  if (typeof job.line_items_json === "string" && job.line_items_json.trim()) {
    try {
      await db.prepare(
        "UPDATE invoices SET line_items_json = ?, subtotal_cents = amount_cents, total_cents = amount_cents, updated_at = datetime('now') WHERE id = ?"
      ).bind(job.line_items_json, invoiceId).run();
    } catch (err) {
      console.warn("maybeAutoCreateInvoice: failed to set invoice line_items_json", err);
    }
  }
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
    const out = (jobs.results || []).map((row) => {
      const model = { ...row };
      if (typeof model.line_items_json === "string" && model.line_items_json.trim()) {
        try {
          const parsed = JSON.parse(model.line_items_json);
          if (Array.isArray(parsed)) model.line_items = parsed;
        } catch {
        }
      }
      return {
        ...model,
        job_providers: providersByJob.get(row.id) || [],
        job_notes: notesByJob.get(row.id) || []
      };
    });
    return c.json({ jobs: out });
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
    const model = { ...job };
    if (typeof model.line_items_json === "string" && model.line_items_json.trim()) {
      try {
        const parsed = JSON.parse(model.line_items_json);
        if (Array.isArray(parsed)) model.line_items = parsed;
      } catch {
      }
    }
    return c.json({ ...model, job_providers: providers.results || [], job_notes: notes.results || [] });
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
        duration_minutes, base_price_cents, total_price_cents, custom_service_name, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
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
      body.custom_service_name || null,
      body.status || "created"
    ).run();
    if (body.line_items !== void 0 || body.line_items_json !== void 0) {
      try {
        const raw2 = Array.isArray(body.line_items) ? JSON.stringify(body.line_items) : String(body.line_items_json || "[]");
        await db.prepare("UPDATE jobs SET line_items_json = ?, updated_at = datetime('now') WHERE id = ?").bind(raw2, id).run();
      } catch (err) {
        console.warn("jobs create: failed to set jobs.line_items_json", err);
      }
    }
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

// ../node_modules/hono/dist/utils/cookie.js
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

// ../node_modules/hono/dist/helper/cookie/index.js
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

// ../node_modules/hono/dist/utils/buffer.js
var bufferToFormData = /* @__PURE__ */ __name((arrayBuffer, contentType) => {
  const response = new Response(arrayBuffer, {
    headers: {
      "Content-Type": contentType
    }
  });
  return response.formData();
}, "bufferToFormData");

// ../node_modules/hono/dist/validator/validator.js
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

// ../node_modules/@hono/zod-validator/dist/index.js
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

// ../node_modules/zod/v3/external.js
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

// ../node_modules/zod/v3/helpers/util.js
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

// ../node_modules/zod/v3/ZodError.js
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

// ../node_modules/zod/v3/locales/en.js
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

// ../node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
__name(setErrorMap, "setErrorMap");
function getErrorMap() {
  return overrideErrorMap;
}
__name(getErrorMap, "getErrorMap");

// ../node_modules/zod/v3/helpers/parseUtil.js
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

// ../node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// ../node_modules/zod/v3/types.js
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
var toMinutes = /* @__PURE__ */ __name((value) => {
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
  const startMin = toMinutes(startTime);
  const endMin = toMinutes(endTime);
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

// src/scheduling/pricing.ts
var toMinutes2 = /* @__PURE__ */ __name((value) => {
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
  const minute = toMinutes2(start);
  const startMin = toMinutes2(ruleStart);
  const endMin = toMinutes2(ruleEnd);
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
        `SELECT srs.service_id, sk.id, sk.name
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
      list.push({ id: row.id, name: row.name, description: null });
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
        `SELECT sk.id, sk.name
         FROM service_required_skills srs
         JOIN skills sk ON sk.id = srs.skill_id
         WHERE srs.service_id = ?`
      ).bind(id).all()
    ]);
    return c.json({
      ...service,
      modifiers: modifiers.results || [],
      required_skills: (skills.results || []).map((row) => ({
        id: row.id,
        name: row.name,
        description: null
      }))
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

// src/widget/embed.ts
var BOOKING_WIDGET_JS = `(function() {
  'use strict';

  var WIDGET_VERSION = '2.0.0';

  function ZenbookerWidget(config) {
    this.apiUrl = config.apiUrl || '';
    this.apiKey = config.apiKey || '';
    this.containerId = config.containerId || 'zenbooker-widget';
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
      jobId: null
    };

    this._acTimer = null;
    this._acAbort = null;
    this._prevStep = null;
    this.init();
  }

  ZenbookerWidget.prototype.init = function() {
    this.injectStyles();
    this.render();
  };

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // CSS
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  ZenbookerWidget.prototype.injectStyles = function() {
    if (document.getElementById('zbw-styles')) return;
    var s = document.createElement('style');
    s.id = 'zbw-styles';
    s.textContent = this.getCSS();
    document.head.appendChild(s);
  };

  ZenbookerWidget.prototype.getCSS = function() {
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
      '.zbw-input{width:100%;padding:11px 14px;border:1.5px solid #d1d5db;border-radius:8px;font-size:15px;font-family:var(--zbw-f);color:#1a1a1a;background:#fff;transition:border-color .15s,box-shadow .15s;outline:none}',
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

  ZenbookerWidget.prototype.formatPrice = function(cents) {
    if (cents == null) return '--';
    var dollars = Math.abs(cents) / 100;
    var sign = cents < 0 ? '-' : '';
    return sign + '\\$' + dollars.toFixed(dollars % 1 === 0 ? 0 : 2);
  };

  ZenbookerWidget.prototype.formatPriceDelta = function(cents) {
    if (!cents) return 'Included';
    return '+\\$' + (Math.abs(cents) / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  };

  ZenbookerWidget.prototype.formatTime = function(time24) {
    var parts = time24.split(':');
    var h = parseInt(parts[0], 10);
    var m = parts[1];
    var ampm = h >= 12 ? 'PM' : 'AM';
    return (h % 12 || 12) + ':' + m + ' ' + ampm;
  };

  ZenbookerWidget.prototype.formatDate = function(dateStr) {
    var d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  ZenbookerWidget.prototype.formatDateShort = function(dateStr) {
    var d = new Date(dateStr + 'T12:00:00');
    return { day: d.toLocaleDateString('en-US', { weekday: 'short' }), date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
  };

  ZenbookerWidget.prototype.formatDuration = function(mins) {
    if (mins < 60) return mins + ' min';
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    return m ? h + ' hr ' + m + ' min' : h + ' hr';
  };

  ZenbookerWidget.prototype.validatePostalCode = function(code) {
    return /^[A-Za-z]\\d[A-Za-z]\\s?\\d[A-Za-z]\\d$/.test(code.trim());
  };

  ZenbookerWidget.prototype.normalizePostalCode = function(code) {
    var clean = code.replace(/\\s/g, '').toUpperCase();
    if (clean.length === 6) return clean.substring(0, 3) + ' ' + clean.substring(3);
    return clean;
  };

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // STATE & NAVIGATION
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  ZenbookerWidget.prototype.computeSteps = function() {
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

  ZenbookerWidget.prototype.getStepIndex = function() {
    var steps = this.computeSteps();
    var idx = steps.indexOf(this.state.currentStep);
    return idx >= 0 ? idx : 0;
  };

  ZenbookerWidget.prototype.getProgressPercent = function() {
    var steps = this.computeSteps();
    var total = steps.length - 1;
    if (total <= 0) return 0;
    var idx = steps.indexOf(this.state.currentStep);
    if (this.state.currentStep === 'success') return 100;
    return Math.round((idx / (total - 1)) * 100);
  };

  ZenbookerWidget.prototype.goToStep = function(stepId) {
    this.state.currentStep = stepId;
    this.state.stepHistory.push(stepId);
    this.state.error = null;
    this.onStepChange(stepId, this.getStepIndex());
    this.render();
  };

  ZenbookerWidget.prototype.goBack = function() {
    if (this.state.stepHistory.length <= 1) return;
    this.state.stepHistory.pop();
    this.state.currentStep = this.state.stepHistory[this.state.stepHistory.length - 1];
    this.state.error = null;
    this.render();
  };

  ZenbookerWidget.prototype.getRunningTotal = function() {
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

  ZenbookerWidget.prototype.getEffectiveDuration = function() {
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

  ZenbookerWidget.prototype.fetchApi = function(endpoint, options) {
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

  ZenbookerWidget.prototype.render = function() {
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

  ZenbookerWidget.prototype.renderProgress = function() {
    var pct = this.getProgressPercent();
    var steps = this.computeSteps().filter(function(s) { return s !== 'success'; });
    var idx = this.getStepIndex();
    var stepNum = Math.min(idx + 1, steps.length);

    return '<div class="zbw-progress">' +
      '<div class="zbw-progress-bar"><div class="zbw-progress-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="zbw-progress-text">Step ' + stepNum + ' of ' + steps.length + '</div>' +
      '</div>';
  };

  ZenbookerWidget.prototype.renderSidebar = function() {
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

  ZenbookerWidget.prototype.renderMobileSummary = function() {
    var total = this.formatPrice(this.getRunningTotal());
    return '<div class="zbw-mobile-summary">' +
      '<button class="zbw-mobile-summary-btn" data-action="toggleSummary">' +
      '<span>View Summary</span><strong>' + total + '</strong>' +
      '</button>' +
      (this.state.summaryExpanded ? '<div style="margin-top:8px">' + this.renderSidebar() + '</div>' : '') +
      '</div>';
  };

  ZenbookerWidget.prototype.renderBackButton = function() {
    return '<button class="zbw-btn-back" data-action="back">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>' +
      'Back</button>';
  };

  ZenbookerWidget.prototype.esc = function(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  };

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // STEP ROUTER
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  ZenbookerWidget.prototype.renderCurrentStep = function() {
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

  ZenbookerWidget.prototype.renderZipStep = function() {
    var html = '<div class="zbw-step">';
    html += '<h2 class="zbw-step-title">Book Online</h2>';
    html += '<p class="zbw-step-desc">Enter your postal code to check availability in your area.</p>';

    if (this.state.error) {
      html += '<div class="zbw-error">' + this.esc(this.state.error) + '</div>';
    }

    html += '<div class="zbw-form-group">';
    html += '<label for="zbw-postal">Postal Code</label>';
    html += '<input type="text" id="zbw-postal" class="zbw-input" maxlength="7" placeholder="K8N 1A1" value="' + this.esc(this.state.postalCode) + '" />';
    html += '</div>';

    html += '<button class="zbw-btn zbw-btn-primary" data-action="checkZip"' + (this.state.loading ? ' disabled' : '') + '>';
    html += this.state.loading ? 'Checking...' : 'Check Availability';
    html += '</button>';

    html += '</div>';
    return html;
  };

  ZenbookerWidget.prototype.handleCheckZip = function() {
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

  ZenbookerWidget.prototype.loadServices = function() {
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

  ZenbookerWidget.prototype.renderCategoriesStep = function() {
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

  ZenbookerWidget.prototype.renderServicesStep = function() {
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

  ZenbookerWidget.prototype.handleSelectService = function(serviceId) {
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

  ZenbookerWidget.prototype.handleConfirmService = function() {
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

  ZenbookerWidget.prototype.renderModifierStep = function(index) {
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

  ZenbookerWidget.prototype.renderDateTimeStep = function() {
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

  ZenbookerWidget.prototype.loadTimeslots = function() {
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

  ZenbookerWidget.prototype.renderAddressStep = function() {
    var a = this.state.address;
    var provinces = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];

    var html = '<div class="zbw-step">';
    html += this.renderBackButton();
    html += '<h2 class="zbw-step-title">Service Address</h2>';
    html += '<p class="zbw-step-desc">Where should we come?</p>';

    if (this.state.error) html += '<div class="zbw-error">' + this.esc(this.state.error) + '</div>';

    html += '<div class="zbw-form-group zbw-ac-wrap"><label>Street Address *</label><input type="text" class="zbw-input" id="zbw-addr1" autocomplete="off" value="' + this.esc(a.line1) + '" placeholder="Start typing your address..." /><div id="zbw-ac-list" class="zbw-ac-list"></div></div>';
    html += '<div class="zbw-form-group"><label>Apt / Unit</label><input type="text" class="zbw-input" id="zbw-addr2" value="' + this.esc(a.line2) + '" /></div>';

    html += '<div class="zbw-row">';
    html += '<div class="zbw-form-group"><label>City *</label><input type="text" class="zbw-input" id="zbw-city" value="' + this.esc(a.city) + '" /></div>';
    html += '<div class="zbw-form-group"><label>Province *</label><input type="text" class="zbw-input" id="zbw-prov" value="' + this.esc(a.province) + '" placeholder="ON" /></div>';
    html += '</div>';

    html += '<div class="zbw-form-group"><label>Postal Code *</label><input type="text" class="zbw-input" id="zbw-postal2" maxlength="7" value="' + this.esc(a.postalCode) + '" /></div>';

    html += '<button class="zbw-btn zbw-btn-primary" data-action="confirmAddress">Continue</button>';
    html += '</div>';
    return html;
  };

  ZenbookerWidget.prototype.readAddressFromDOM = function() {
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

  ZenbookerWidget.prototype.handleConfirmAddress = function() {
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

  ZenbookerWidget.prototype.renderContactStep = function() {
    var c = this.state.contact;

    var html = '<div class="zbw-step">';
    html += this.renderBackButton();
    html += '<h2 class="zbw-step-title">Almost Done!</h2>';
    html += '<p class="zbw-step-desc">Enter your contact info to complete your booking.</p>';

    if (this.state.error) html += '<div class="zbw-error">' + this.esc(this.state.error) + '</div>';

    html += '<div class="zbw-row">';
    html += '<div class="zbw-form-group"><label>First Name *</label><input type="text" class="zbw-input" id="zbw-fname" value="' + this.esc(c.firstName) + '" /></div>';
    html += '<div class="zbw-form-group"><label>Last Name *</label><input type="text" class="zbw-input" id="zbw-lname" value="' + this.esc(c.lastName) + '" /></div>';
    html += '</div>';
    html += '<div class="zbw-form-group"><label>Email *</label><input type="email" class="zbw-input" id="zbw-email" value="' + this.esc(c.email) + '" placeholder="you@example.com" /></div>';
    html += '<div class="zbw-form-group"><label>Phone *</label><input type="tel" class="zbw-input" id="zbw-phone" value="' + this.esc(c.phone) + '" placeholder="(555) 123-4567" /></div>';

    html += '<button class="zbw-btn zbw-btn-primary" data-action="submitBooking"' + (this.state.loading ? ' disabled' : '') + '>' + (this.state.loading ? 'Booking...' : 'Book Now') + '</button>';
    html += '</div>';
    return html;
  };

  ZenbookerWidget.prototype.handleSubmitBooking = function() {
    if (this.state.submitting) return;

    var fn = (document.getElementById('zbw-fname') || {}).value || '';
    var ln = (document.getElementById('zbw-lname') || {}).value || '';
    var em = (document.getElementById('zbw-email') || {}).value || '';
    var ph = (document.getElementById('zbw-phone') || {}).value || '';

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

  ZenbookerWidget.prototype.renderSuccessStep = function() {
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

  ZenbookerWidget.prototype._toggleCards = function(action, selectedId, confirmAction) {
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

  ZenbookerWidget.prototype._refreshSidebar = function() {
    var el = document.getElementById(this.containerId);
    if (!el) return;
    var sidebar = el.querySelector('.zbw-sidebar');
    if (sidebar) sidebar.innerHTML = this.renderSidebar();
    var mBtn = el.querySelector('.zbw-mobile-summary-btn strong');
    if (mBtn) mBtn.textContent = this.formatPrice(this.getRunningTotal());
  };

  ZenbookerWidget.prototype._renderSlotsForDate = function(date) {
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

  ZenbookerWidget.prototype.attachEvents = function() {
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
          fetch('https://api.mapbox.com/search/geocode/v6/forward?q=' + encodeURIComponent(q) + '&country=ca&types=address&limit=5&proximity=' + prox + '&access_token=pk.eyJ1IjoidGlsbGV5IiwiYSI6IlFhX1ZUYm8ifQ.Dr4lrivYwl5ZTnuAdMqzVg', { signal: ctrl.signal })
            .then(function(r) { return r.json(); })
            .then(function(data) {
              if (!list) return;
              if (!data.features || !data.features.length) { list.innerHTML = ''; return; }
              list.innerHTML = data.features.map(function(f, i) {
                var p = f.properties;
                var ctx = p.context || {};
                return '<div class="zbw-ac-item" data-ac-idx="' + i + '">' +
                  '<div class="zbw-ac-main">' + (p.name || '') + '</div>' +
                  '<div class="zbw-ac-sub">' + (ctx.place ? ctx.place.name + ', ' : '') + (ctx.region ? ctx.region.region_code + ' ' : '') + (ctx.postcode ? ctx.postcode.name : '') + '</div>' +
                  '</div>';
              }).join('');
              self._acFeatures = data.features;
            })
            .catch(function() {});
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

  window.ZenbookerWidget = ZenbookerWidget;

  if (typeof window.ZenbookerConfig !== 'undefined') {
    window.zenbookerInstance = new ZenbookerWidget(window.ZenbookerConfig);
  }
})();`;
var BOOKING_WIDGET_POPUP = `(function() {
  var API_URL = 'https://api.unclebike.xyz';
  var PRIMARY_COLOR = '#2563eb';
  var loaded = false;
  var overlay = null;

  function getConfig() {
    return window.ZenbookerPopupConfig || {};
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
    style.textContent = '#zbw-popup-overlay{position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;display:none;align-items:center;justify-content:center}' +
      '#zbw-popup-overlay.zbw-open{display:flex}' +
      '#zbw-popup-backdrop{position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5);backdrop-filter:blur(2px)}' +
      '#zbw-popup-container{position:relative;width:94vw;max-width:900px;max-height:90vh;background:#fff;border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,.2);overflow-y:auto;padding:24px;z-index:1}' +
      '#zbw-popup-close{position:absolute;top:12px;right:16px;background:none;border:none;font-size:28px;cursor:pointer;color:#64748b;z-index:2;line-height:1;padding:4px 8px;border-radius:8px;transition:background .15s}' +
      '#zbw-popup-close:hover{background:#f1f5f9;color:#0f172a}' +
      '@media(max-width:640px){#zbw-popup-container{width:100vw;max-width:100vw;height:100vh;max-height:100vh;border-radius:0;padding:16px 12px}}' +
      '[data-theme="dark"] #zbw-popup-backdrop{background:rgba(17,17,27,.7)}' +
      '[data-theme="dark"] #zbw-popup-container{background:#1e1e2e;box-shadow:0 24px 64px rgba(0,0,0,.5)}' +
      '[data-theme="dark"] #zbw-popup-close{color:#a6adc8}' +
      '[data-theme="dark"] #zbw-popup-close:hover{background:#313244;color:#cdd6f4}';
    document.head.appendChild(style);
    document.body.appendChild(overlay);

    overlay.querySelector('#zbw-popup-backdrop').addEventListener('click', closePopup);
    overlay.querySelector('#zbw-popup-close').addEventListener('click', closePopup);

    if (!loaded) {
      window.ZenbookerConfig = {
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

  function openPopup() {
    var el = createOverlay();
    el.classList.add('zbw-open');
    document.body.style.overflow = 'hidden';

    if (window.zenbookerInstance) {
      window.zenbookerInstance.state.currentStep = 'zip';
      window.zenbookerInstance.state.stepHistory = ['zip'];
      window.zenbookerInstance.state.error = null;
      window.zenbookerInstance.state.loading = false;
      window.zenbookerInstance.state.submitting = false;
      window.zenbookerInstance.render();
    }
  }

  function closePopup() {
    if (overlay) {
      overlay.classList.remove('zbw-open');
      document.body.style.overflow = '';
    }
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closePopup();
  });

  document.addEventListener('click', function(e) {
    var el = e.target.closest('[data-zbw-open], .zbw-book-btn');
    if (el) { e.preventDefault(); openPopup(); }
  });

  window.ZenbookerPopup = { open: openPopup, close: closePopup };

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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Widget Demo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 40px 20px; }
    .demo-header { text-align: center; margin-bottom: 32px; }
    .demo-header h1 { font-size: 28px; color: #0f172a; margin-bottom: 8px; }
    .demo-header p { color: #64748b; font-size: 15px; }
    #zenbooker-widget { width: 100%; max-width: 900px; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,.08); padding: 32px; }
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

  <div id="zenbooker-widget"></div>

  <div class="demo-code">
    <h3>Embed on Your Site</h3>
    <pre><code>&lt;div id="zenbooker-widget"&gt;&lt;/div&gt;

&lt;script&gt;
  window.ZenbookerConfig = {
    apiUrl: 'https://api.unclebike.xyz',
    containerId: 'zenbooker-widget',
    primaryColor: '#2563eb',
    onComplete: function(booking) {
      console.log('Booked:', booking);
    }
  };
&lt;/script&gt;
&lt;script src="https://api.unclebike.xyz/widget/booking-widget.js"&gt;&lt;/script&gt;</code></pre>
  </div>

  <script>
    window.ZenbookerConfig = {
      apiUrl: window.location.origin,
      containerId: 'zenbooker-widget',
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
var app18 = new Hono2();
app18.onError((err, c) => {
  console.error("Unhandled error:", err.message, err.stack);
  return c.text(`Error: ${err.message}`, 500);
});
app18.use("/v1/*", cors());
app18.use("/widget/*", cors());
app18.use("*", authMiddleware);
app18.get("/health", (c) => {
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
app18.get("/widget/booking-widget.js", async (c) => {
  const primaryColor = await getWidgetPrimaryColor(c.env.DB);
  const js = BOOKING_WIDGET_JS.replace(/'#2563eb'/g, `'${primaryColor}'`);
  return c.text(js, 200, {
    "Content-Type": "application/javascript",
    "Cache-Control": "no-cache, must-revalidate"
  });
});
app18.get("/widget/popup.js", async (c) => {
  const primaryColor = await getWidgetPrimaryColor(c.env.DB);
  const js = BOOKING_WIDGET_POPUP.replace(/'#2563eb'/g, `'${primaryColor}'`);
  return c.text(js, 200, {
    "Content-Type": "application/javascript",
    "Cache-Control": "no-cache, must-revalidate"
  });
});
app18.get("/widget/branding.js", async (c) => {
  const primaryColor = await getWidgetPrimaryColor(c.env.DB);
  const js = `(function(){var c='${primaryColor}';document.documentElement.style.setProperty('--brand-color',c);window.ZenbookerBranding={primaryColor:c};var cfg=window.ZenbookerPopupConfig;if(cfg)cfg.primaryColor=c;})();`;
  return c.text(js, 200, {
    "Content-Type": "application/javascript",
    "Cache-Control": "no-cache, must-revalidate"
  });
});
app18.get("/widget/demo", async (c) => {
  const primaryColor = await getWidgetPrimaryColor(c.env.DB);
  const html2 = BOOKING_WIDGET_DEMO.replace(/'#2563eb'/g, `'${primaryColor}'`);
  return c.html(html2);
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
app18.route("/v1", api);
app18.route("/admin", admin_default);
var index_default = app18;
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
