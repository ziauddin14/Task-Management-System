import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isPushSupported,
  urlBase64ToUint8Array,
  registerServiceWorker,
  getExistingSubscription,
  subscribeBrowserToPush,
  unsubscribeBrowserFromPush,
} from '../../src/utils/pushNotifications.js';

describe('isPushSupported', () => {
  it('returns false when serviceWorker/PushManager/Notification are not available (jsdom default — no stubbing)', () => {
    expect(isPushSupported()).toBe(false);
  });
});

describe('urlBase64ToUint8Array', () => {
  it('decodes a base64url string into the correct raw bytes', () => {
    // 'A' is byte 65 (0x41); 'QQ' is its base64url encoding without padding.
    const result = urlBase64ToUint8Array('QQ');
    expect(Array.from(result)).toEqual([65]);
  });

  it('handles the -/_ base64url alphabet correctly (not standard base64 +//)', () => {
    // Bytes [0xfb, 0xff, 0xff] standard-base64-encode to "+///" — base64url uses "-___" instead.
    const result = urlBase64ToUint8Array('-___');
    expect(Array.from(result)).toEqual([0xfb, 0xff, 0xff]);
  });
});

describe('browser-dependent functions when push IS supported (stubbed)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.PushManager;
    delete window.Notification;
    delete navigator.serviceWorker;
  });

  function stubSupport({ registration = null, getRegistration } = {}) {
    window.PushManager = function PushManager() {};
    window.Notification = { permission: 'default' };
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: vi.fn().mockResolvedValue(registration),
        getRegistration: vi.fn().mockResolvedValue(getRegistration !== undefined ? getRegistration : registration),
        ready: Promise.resolve(registration),
      },
      configurable: true,
    });
  }

  it('isPushSupported returns true once serviceWorker/PushManager/Notification all exist', () => {
    stubSupport({ registration: {} });
    expect(isPushSupported()).toBe(true);
  });

  it('registerServiceWorker calls navigator.serviceWorker.register with /sw.js', async () => {
    stubSupport({ registration: { scope: '/' } });
    const reg = await registerServiceWorker();
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    expect(reg).toEqual({ scope: '/' });
  });

  it('getExistingSubscription returns null when there is no service worker registration at all', async () => {
    stubSupport({ getRegistration: null });
    const sub = await getExistingSubscription();
    expect(sub).toBeNull();
  });

  it("getExistingSubscription returns the registration's current pushManager subscription", async () => {
    const fakeSubscription = { endpoint: 'https://push.test/abc' };
    const registration = { pushManager: { getSubscription: vi.fn().mockResolvedValue(fakeSubscription) } };
    stubSupport({ getRegistration: registration });

    const sub = await getExistingSubscription();
    expect(sub).toBe(fakeSubscription);
  });

  it('subscribeBrowserToPush subscribes with userVisibleOnly:true and a converted Uint8Array key', async () => {
    const fakeSubscription = { endpoint: 'https://push.test/abc', toJSON: () => ({ endpoint: 'https://push.test/abc' }) };
    const registration = { pushManager: { subscribe: vi.fn().mockResolvedValue(fakeSubscription) } };
    stubSupport({ getRegistration: registration });

    const result = await subscribeBrowserToPush('QQ');

    expect(registration.pushManager.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true, applicationServerKey: expect.any(Uint8Array) })
    );
    expect(result).toBe(fakeSubscription);
  });

  it('subscribeBrowserToPush registers a new worker when none exists yet, instead of throwing', async () => {
    const fakeSubscription = { endpoint: 'https://push.test/abc' };
    const registration = { pushManager: { subscribe: vi.fn().mockResolvedValue(fakeSubscription) } };
    stubSupport({ getRegistration: null, registration });

    const result = await subscribeBrowserToPush('QQ');
    expect(result).toBe(fakeSubscription);
  });

  it('unsubscribeBrowserFromPush unsubscribes and returns the endpoint', async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    const fakeSubscription = { endpoint: 'https://push.test/abc', unsubscribe };
    const registration = { pushManager: { getSubscription: vi.fn().mockResolvedValue(fakeSubscription) } };
    stubSupport({ getRegistration: registration });

    const endpoint = await unsubscribeBrowserFromPush();

    expect(unsubscribe).toHaveBeenCalled();
    expect(endpoint).toBe('https://push.test/abc');
  });

  it('unsubscribeBrowserFromPush returns null (no-op) when there is nothing to unsubscribe', async () => {
    stubSupport({ getRegistration: null });
    const endpoint = await unsubscribeBrowserFromPush();
    expect(endpoint).toBeNull();
  });
});
