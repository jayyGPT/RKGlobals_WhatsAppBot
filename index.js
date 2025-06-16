// index.js

const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config(); // Loads variables from .env

const app = express();
const PORT = process.env.PORT || 3000;

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

app.use(bodyParser.json());

// Meta Webhook Verification Route
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


// WhatsApp Message Receiver
app.post('/webhook', (req, res) => {
  const body = req.body;

  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const message = body.entry[0].changes[0].value.messages[0];
      const sender = message.from;
      const text = message.text?.body;

      console.log("📩 Message received:", text);

      // Here you can call your KYC logic
      sendMessage(sender, "Welcome to RK Globals! Please start KYC by sending your PAN.");
    }

    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// Helper function to send a WhatsApp message
const axios = require('axios');
function sendMessage(to, message) {
  axios.post(
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
  ).then(response => {
    console.log("📤 Message sent");
  }).catch(err => {
    console.error("❌ Error sending message:", err.response?.data || err.message);
  });
}

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running at http://localhost:${PORT}`);
});
