import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "EduExam AI Backend is running"
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    status: "healthy"
  });
});

export default app;