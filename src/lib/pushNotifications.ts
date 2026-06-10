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

export async function registerPushNotifications(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported');
    return false;
  }

  try {
    const publicKey = await getVapidPublicKey();
    if (!publicKey) {
      console.warn('VAPID public key not configured');
      return false;
    }
    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw-push.js');
    await navigator.serviceWorker.ready;

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }

    // Subscribe to push
    const subscription = await (registration as any).pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const subJson = subscription.toJSON();

    // Save subscription to database
    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subJson.endpoint!,
      keys: subJson.keys as any,
    }, {
      onConflict: 'user_id,endpoint',
    });

    return true;
  } catch (error) {
    console.error('Failed to register push notifications:', error);
    return false;
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