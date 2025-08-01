const express = require("express");
const bodyParser = require("body-parser");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

app.post("/api/query", async (req, res) => {
  const { question, repo, token } = req.body;

  if (!token || !question || !repo) {
    return res.status(400).json({ error: "参数缺失：需要提供 token、question 和 repo" });
  }

  try {
    const response = await fetch(
      `https://api.cnb.cool/${repo}/-/knowledge/base/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ query: question }),
      },
    );

    const data = await response.json();

    if (!Array.isArray(data)) {
      return res.status(500).json({ error: "API 返回格式错误", raw: data });
    }

    const replies = data.map((item) => ({
      score: item.score,
      content: item.chunk,
      link: item.metadata?.permalink || null,
    }));

    res.json({ replies });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "查询失败" });
  }
});

app.post("/api/ai/chat", async (req, res) => {
  const { repo, token, messages, model, stream } = req.body;

  if (!token || !repo || !messages) {
    return res.status(400).json({ error: "参数缺失：需要提供 token、repo 和 messages" });
  }

  try {
    const requestBody = {
      messages,
      model: model || "gpt-3.5-turbo",
      stream: stream || false
    };

    const response = await fetch(
      `https://api.cnb.cool/${repo}/-/ai/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          accept: stream ? "text/event-stream" : "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).json({ 
        error: `AI API 请求失败: ${response.status}`, 
        details: errorData 
      });
    }

    // 如果是流式响应
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

      // 将上游的流式响应转发给客户端
      response.body.pipe(res);
    } else {
      // 非流式响应
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error("AI chat error:", error);
    res.status(500).json({ error: "AI 对话请求失败" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ AI Chat CNB at http://localhost:${PORT}`);
});
