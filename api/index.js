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

// เช็คว่ามี Channel Secret หรือไม่ ถ้ามีให้ใช้ line.middleware เสมอ
const middlewareHandler = process.env.LINE_CHANNEL_SECRET 
  ? line.middleware(config) 
  : (req, res, next) => next();

app.post('/api', middlewareHandler, express.json(), async (req, res) => {
  try {
    const events = req.body.events;

    // หาก LINE กด Verify ปุ่มส้ม events จะเป็น array ว่าง ให้ตอบ 200 ทันที
    if (!Array.isArray(events)) {
      return res.status(400).json({ code: 400, result: "fail", message: "events must be an array" });
    }

    for (const event of events) {
      const { type, source, message } = event;
      const userId = source?.userId;

      if (!userId) continue;

      if (type === 'message' && message?.type === 'text') {
        const text = message.text ? message.text.trim() : '';

        if (text.toLowerCase().startsWith('gw')) {
          try {
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