const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function testEmail() {
  const url = process.env.NEXT_PUBLIC_GAS_WEBHOOK_URL;
  console.log("URL:", url);

  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        token: process.env.NEXT_PUBLIC_GAS_SECRET_TOKEN || "SECURE_KEY_123",
        type: "STATUS_UPDATE",
        payload: {
          name: "Test User",
          email: "minahilch821@gmail.com",
          phone: "12345",
          recipient_email: "minahilch821@gmail.com",
          recipient_phone: "12345",
          reg_no: "SP23-BSE-000",
          department: "admin",
          sender_email: "no-reply@cui.edu.pk",
          status: "cleared",
          remarks: "Testing email functionality"
        }
      }),
    });

    const data = await response.json();
    console.log("Response:", data);
  } catch (error) {
    console.error("Failed:", error);
  }
}

testEmail();
