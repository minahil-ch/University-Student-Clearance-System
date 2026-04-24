export interface NotificationData {
  name: string;
  email: string;
  phone: string;
  recipientEmail?: string;
  recipientPhone?: string;
  eventType?: 'form_submission' | 'status_update' | 'portal_alert';
  regNo?: string;
  department?: string;
  status?: 'cleared' | 'issue';
  remarks?: string;
  futureData?: any;
  profile?: any;
}

export async function sendEmailNotification(data: NotificationData) {
  const url = process.env.NEXT_PUBLIC_GAS_WEBHOOK_URL;
  if (!url) {
    console.warn("GAS Webhook URL not configured");
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        token: process.env.NEXT_PUBLIC_GAS_SECRET_TOKEN || "SECURE_KEY_123",
        type: (data.eventType || (data.status ? "status_update" : "form_submission")).toUpperCase(),
        payload: {
          ...data,
          recipient_email: data.recipientEmail || data.email,
          recipient_phone: data.recipientPhone || data.phone,
          reg_no: data.profile?.reg_no || data.regNo,
          department: data.department || data.profile?.department_name
        }
      }),
    });

    return await response.json();
  } catch (error) {
    console.error("Failed to send GAS notification:", error);
  }
}

export async function sendWhatsAppNotification(data: NotificationData) {
  try {
    const response = await fetch('/api/notifications/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      console.warn("Non-JSON response from WhatsApp route:", text.slice(0, 120));
      return { status: "error", message: "Invalid response from WhatsApp service" };
    }
  } catch (error) {
    console.error("Failed to send WhatsApp notification:", error);
  }
}

export async function logNotification() {
  // This would be called to update the notifications table in Supabase
}
