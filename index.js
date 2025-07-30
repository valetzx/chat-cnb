const express = require("express");
const bodyParser = require("body-parser");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

require("dotenv").config();

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const CNB_TOKEN = process.env.CNB_TOKEN;

app.post("/api/query", async (req, res) => {
  const { question, repo } = req.body;

  if (!CNB_TOKEN || !question || !repo) {
    return res.status(400).json({ error: "参数缺失或未配置 CNB_TOKEN" });
  }

  try {
    const response = await fetch(
      `https://api.cnb.cool/${repo}/-/knowledge/base/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CNB_TOKEN}`,
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

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ AI Chat CNB at http://localhost:${PORT}`);
});
