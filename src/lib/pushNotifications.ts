import { supabase } from "@/integrations/supabase/client";

let cachedVapidPublic: string | null = null;
async function getVapidPublicKey(): Promise<string> {
  if (cachedVapidPublic) return cachedVapidPublic;
  const { data } = await supabase.functions.invoke('get-vapid-key');
  cachedVapidPublic = (data as any)?.publicKey || '';
  return cachedVapidPublic;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushResult = { ok: boolean; reason?: 'unsupported' | 'preview' | 'no_vapid' | 'permission_denied' | 'sw_redirect' | 'error'; message?: string };

function isPreviewHost() {
  const h = typeof location !== 'undefined' ? location.hostname : '';
  return h.startsWith('id-preview--') || h.startsWith('preview--') || h.endsWith('.lovableproject.com');
}

export async function registerPushNotifications(userId: string): Promise<PushResult> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported', message: 'المتصفح لا يدعم الإشعارات. جرّب Chrome على أندرويد أو Safari على iOS 16.4+ بعد تثبيت التطبيق للشاشة الرئيسية.' };
  }
  if (isPreviewHost()) {
    return { ok: false, reason: 'preview', message: 'الإشعارات لا تعمل داخل معاينة المحرر. افتح التطبيق من الرابط الرسمي (vance.lovable.app) أو بعد تثبيته كتطبيق.' };
  }

  try {
    const publicKey = await getVapidPublicKey();
    if (!publicKey) {
      return { ok: false, reason: 'no_vapid', message: 'مفتاح الإشعارات غير مُهيّأ. تواصل مع الإدارة.' };
    }

    let registration: ServiceWorkerRegistration;
    try {
      registration = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });
    } catch (e: any) {
      if (String(e?.message || '').includes('redirect')) {
        return { ok: false, reason: 'sw_redirect', message: 'تعذّر تسجيل خدمة الإشعارات (إعادة توجيه). افتح التطبيق من الرابط الرسمي بدون إعادة توجيه.' };
      }
      throw e;
    }
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { ok: false, reason: 'permission_denied', message: 'تم رفض إذن الإشعارات. فعّلها يدوياً من إعدادات الموقع في المتصفح.' };
    }

    const subscription = await (registration as any).pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const subJson = subscription.toJSON();

    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subJson.endpoint!,
      keys: subJson.keys as any,
    }, { onConflict: 'user_id,endpoint' });

    return { ok: true };
  } catch (error: any) {
    console.error('Failed to register push notifications:', error);
    return { ok: false, reason: 'error', message: error?.message || 'فشل غير متوقع' };
  }
}

export async function unregisterPushNotifications() {
  if (!('serviceWorker' in navigator)) return;
  
  const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
  if (registration) {
    const subscription = await (registration as any).pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
  }
}