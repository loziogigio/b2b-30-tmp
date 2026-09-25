/**
 * vinc.data — the only API portal scripts get for data models.
 * Plain ES2017, inlined in <head> before the portal's custom scripts.
 * It holds no credentials: each script's token comes from its own tag.
 * Spec: vinc-plans/cs/specs/2026-09-24-portal-script-data-design.md §5.9
 */
import { ERP_STATIC_STORAGE_KEY } from '@/framework/basic-rest/utils/static';

const SDK = `(function () {
  'use strict';
  var w = window;
  if (w.vinc && w.vinc.data) return;
  var STORAGE_KEY = __STORAGE_KEY__;
  var BASE = '/api/portal-data/';
  var MODEL_RE = /^[a-z][a-z0-9_]{0,39}$/;
  var ID_RE = /^[a-f0-9]{24}$/;

  function VincDataError(status, code, message, fields) {
    var e = new Error(message || code);
    e.name = 'VincDataError';
    e.status = status;
    e.code = code;
    e.fields = fields || null;
    return e;
  }

  function workingContext() {
    try {
      var raw = w.localStorage.getItem(STORAGE_KEY);
      var s = raw ? JSON.parse(raw) : null;
      var out = {};
      if (s && typeof s.customer_code === 'string' && s.customer_code && s.customer_code !== '0') out.customer_code = s.customer_code;
      if (s && typeof s.address_code === 'string' && s.address_code && s.address_code !== '0') out.address_code = s.address_code;
      return out;
    } catch (e) {
      return {};
    }
  }

  function queryString(opts) {
    var p = new URLSearchParams();
    var ctx = workingContext();
    Object.keys(ctx).forEach(function (k) { p.set(k, ctx[k]); });
    if (opts) {
      if (opts.page != null) p.set('page', String(opts.page));
      if (opts.limit != null) p.set('limit', String(opts.limit));
      if (opts.sort) p.set('sort', String(opts.sort));
      var filter = opts.filter;
      if (filter && typeof filter === 'object') {
        Object.keys(filter).forEach(function (field) {
          var v = filter[field];
          if (Array.isArray(v)) {
            p.set('filter[' + field + '][in]', v.join(','));
          } else if (v !== null && typeof v === 'object') {
            Object.keys(v).forEach(function (op) {
              var x = v[op];
              p.set('filter[' + field + '][' + op + ']', Array.isArray(x) ? x.join(',') : String(x));
            });
          } else {
            p.set('filter[' + field + ']', String(v));
          }
        });
      }
    }
    var s = p.toString();
    return s ? '?' + s : '';
  }

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  function send(token, method, path, data) {
    if (!token) return Promise.reject(VincDataError(401, 'NOT_AUTHENTICATED', 'Not logged in'));
    var headers = { 'Accept': 'application/json', 'x-vinc-script-token': token };
    var init = { method: method, credentials: 'same-origin', headers: headers };
    if (data !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify({ data: data });
    }
    return fetch(BASE + path, init).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (json) {
        if (!res.ok) {
          var err = json && json.error;
          throw VincDataError(res.status, (err && err.code) || 'UPSTREAM_ERROR', (err && err.message) || 'Request failed', err && err.fields);
        }
        return json;
      });
    }, function () {
      throw VincDataError(0, 'NETWORK_ERROR', 'Network error');
    });
  }

  function invalid(message) {
    return Promise.reject(VincDataError(0, 'INVALID_REQUEST', message));
  }

  function connect(el) {
    if (!el || typeof el.getAttribute !== 'function' || !el.getAttribute('data-vinc-script')) {
      throw VincDataError(0, 'NO_SCRIPT_CONTEXT', 'Call vinc.data.connect(document.currentScript) at the top level of a script that has data access');
    }
    var scriptId = el.getAttribute('data-vinc-script');
    var token = el.getAttribute('data-vinc-token') || '';
    el.removeAttribute('data-vinc-token');
    return Object.freeze({
      scriptId: scriptId,
      list: function (model, opts) {
        if (!MODEL_RE.test(model)) return invalid('Invalid model name');
        return send(token, 'GET', model + queryString(opts || {})).then(function (j) {
          return { items: j.items, pagination: j.pagination };
        });
      },
      get: function (model, id) {
        if (!MODEL_RE.test(model)) return invalid('Invalid model name');
        if (!ID_RE.test(id)) return invalid('Invalid record id');
        return send(token, 'GET', model + '/' + id + queryString()).then(function (j) { return j.record; });
      },
      create: function (model, data) {
        if (!MODEL_RE.test(model)) return invalid('Invalid model name');
        if (!isPlainObject(data)) return invalid('data must be an object');
        return send(token, 'POST', model + queryString(), data).then(function (j) { return j.record; });
      },
      update: function (model, id, changes) {
        if (!MODEL_RE.test(model)) return invalid('Invalid model name');
        if (!ID_RE.test(id)) return invalid('Invalid record id');
        if (!isPlainObject(changes)) return invalid('changes must be an object');
        return send(token, 'PATCH', model + '/' + id + queryString(), changes).then(function (j) { return j.record; });
      }
    });
  }

  var api = Object.freeze({ version: 1, connect: connect });
  var ns = w.vinc && typeof w.vinc === 'object' ? w.vinc : {};
  Object.defineProperty(ns, 'data', { value: api, writable: false, configurable: false, enumerable: true });
  w.vinc = ns;
})();`;

export const PORTAL_DATA_SDK_SOURCE = SDK.replace(
  '__STORAGE_KEY__',
  JSON.stringify(ERP_STATIC_STORAGE_KEY),
);
