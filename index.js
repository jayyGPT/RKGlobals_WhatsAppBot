const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const SHEET_ID = '1ewXpk13b-ZQw4EgtOZ82ik-ivwKbT18wFf68cwh685I';

app.use(bodyParser.json());

const userSessions = {};

// Webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified!");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Webhook verification failed");
    res.sendStatus(403);
  }
});

// Main webhook for WhatsApp messages
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object) {
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const sender = message?.from;
    const text = message?.text?.body?.trim();

    if (sender && text) {
      console.log(`📩 Message from ${sender}: ${text}`);
      await handleMessage(sender, text);
    }

    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// Handle message logic
async function handleMessage(sender, text) {
  if (!userSessions[sender]) {
    userSessions[sender] = { step: 0, data: [] };
    return sendMessage(sender, "Welcome to RK Globals! Please enter your *PAN Number*:");
  }

  const session = userSessions[sender];

  if (session.step === 0) {
    session.data[0] = text.toUpperCase();
    session.step++;
    return sendMessage(sender, "✅ PAN received.\nNow enter your *Aadhar Number*:");
  }

  if (session.step === 1) {
    session.data[1] = text;
    session.step++;
    return sendMessage(sender, "✅ Aadhar received.\nPlease enter your *Date of Birth* (YYYY-MM-DD):");
  }

  if (session.step === 2) {
    session.data[2] = text;
    session.step++;
    session.data.unshift(sender); // Add phone number at start
    await addToGoogleSheet(session.data);
    delete userSessions[sender];
    return sendMessage(sender, "🎉 KYC complete! Thank you for registering with RK Globals.");
  }
}

// Send WhatsApp message
function sendMessage(to, message) {
  return axios.post(
    'https://graph.facebook.com/v19.0/742259758960108/messages',
    {
      messaging_product: "whatsapp",
      to,
      text: { body: message },
    },
    {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  ).then(() => {
    console.log("📤 Message sent");
  }).catch(err => {
    console.error("❌ Error sending message:", err.response?.data || err.message);
  });
}

// Add row to Google Sheets
async function addToGoogleSheet(data) {
  const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});


  const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A:D',
    valueInputOption: 'RAW',
    requestBody: {
      values: [data], // [phone, PAN, Aadhar, DOB]
    },
  });

  console.log("✅ KYC data stored in Google Sheets");
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running at http://localhost:${PORT}`);
});
