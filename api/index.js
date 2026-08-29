const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const BASE_URL = process.env.BASE_URL;

const client = new line.Client(config);

app.post('/api', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events;

    if (!Array.isArray(events)) {
      return res.status(400).json({ code: 400, result: "fail", message: "events must be an array" });
    }

    for (const event of events) {
      const { type, replyToken, source, message } = event;
      const userId = source?.userId;

      if (!userId) continue;

      if (type === 'message' && message?.type === 'text') {
        const text = message.text ? message.text.trim() : '';

        // เช็คว่าขึ้นต้นด้วย gw หรือ GW
        if (text.toLowerCase().startsWith('gw')) {
          try {
            // ยิง API ไปแมตช์ข้อมูล
            const apiResponse = await axios.post(`${BASE_URL}/gwcenter/api/v1/servicelineoa/matchuserline/`, {
              userId: userId,
              message: text
            });

            const resultProcess = apiResponse.data;

            if (resultProcess?.result === true) {
              const successMsg = `${text} เชื่อมต่อกับ ${resultProcess.message} เรียบร้อยแล้ว`;
              
              await client.replyMessage(replyToken, {
                type: 'text',
                text: successMsg
              });
            }
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

module.exports = app;