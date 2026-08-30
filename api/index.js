require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const BASE_URL = process.env.BASE_URL;

// ย้าย Middleware ตรวจสอบ Signature ไว้ใช้เฉพาะ Route
const middlewareHandler = process.env.NODE_ENV === 'production' 
  ? line.middleware(config) 
  : (req, res, next) => next();

// 1. วาง line.middleware ก่อน express.json()
// 2. express.json() จะทำงานเมื่อเป็นด่านถัดไปเท่านั้น เพื่อไม่ให้ไปกวน Raw Body ของ LINE
app.post('/api', middlewareHandler, express.json(), async (req, res) => {
  try {
    const events = req.body.events;

    // รองรับกรณี LINE กด Verify (จะส่ง events: [] มา)
    if (!Array.isArray(events)) {
      return res.status(400).json({ code: 400, result: "fail", message: "events must be an array" });
    }

    for (const event of events) {
      const { type, source, message } = event;
      const userId = source?.userId;

      if (!userId) continue;

      if (type === 'message' && message?.type === 'text') {
        const text = message.text ? message.text.trim() : '';

        // เช็คว่าขึ้นต้นด้วย gw หรือ GW
        if (text.toLowerCase().startsWith('gw')) {
          try {
            // ยิง External API เท่านั้น (ไม่ส่ง replyMessage กลับ LINE)
            await axios.post(`${BASE_URL}/gwcenter/api/v1/servicelineoa/matchuserline/`, {
              userId: userId,
              message: text
            });
          } catch (apiErr) {
            console.error('Call External API Error:', apiErr.response?.data || apiErr.message);
          }
        }
      }
    }

    // ส่ง 200 OK กลับไปให้ LINE Platform เสมอ
    return res.status(200).json({ code: 200, result: "success", message: "", data: 0 });
  } catch (error) {
    console.error('Webhook Error:', error.message);
    return res.status(500).json({ code: 500, result: "error", message: error.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;