require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN || "change-me";

const jobs = [];

function auth(req, res, next) {
    const authHeader = req.headers.authorization || "";
    if (authHeader !== `Bearer ${BRIDGE_TOKEN}`) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
    }
    next();
}

app.get("/health", (req, res) => {
    const pending = jobs.filter(j => j.status === "pending").length;
    const dispatched = jobs.filter(j => j.status === "dispatched").length;
    const done = jobs.filter(j => j.status === "success").length;
    const failed = jobs.filter(j => j.status === "failed").length;

    res.json({
        ok: true,
        queue: {
            pending,
            dispatched,
            done,
            failed
        }
    });
});

app.get("/demo/add-test-job", (req, res) => {
    const job = {
        id: crypto.randomUUID(),
        target: "studio",
        status: "pending",
        goal: "Crear carpeta y bloque de prueba",
        ops: [
            {
                op: "create_folder",
                path: "Workspace",
                name: "AITest"
            },
            {
                op: "create_part",
                path: "Workspace/AITest",
                name: "Block01",
                properties: {
                    Anchored: true,
                    Size: [8, 1, 8],
                    Position: [0, 5, 0],
                    Color: [255, 0, 0]
                }
            }
        ],
        createdAt: new Date().toISOString()
    };

    jobs.push(job);
    res.json({ ok: true, message: "Trabajo de prueba creado", job });
});

app.post("/v1/commands", auth, (req, res) => {
    const body = req.body || {};

    const job = {
        id: crypto.randomUUID(),
        target: body.target || "studio",
        status: "pending",
        goal: body.goal || "Sin objetivo",
        ops: Array.isArray(body.ops) ? body.ops : [],
        createdAt: new Date().toISOString()
    };

    jobs.push(job);

    res.json({
        ok: true,
        message: "Trabajo guardado",
        job_id: job.id
    });
});

app.get("/v1/commands/next", auth, (req, res) => {
    const job = jobs.find(j => j.status === "pending" && j.target === "studio");

    if (!job) {
        return res.json({ ok: true, job: null });
    }

    job.status = "dispatched";
    job.dispatchedAt = new Date().toISOString();

    res.json({ ok: true, job });
});

app.post("/v1/commands/:id/result", auth, (req, res) => {
    const job = jobs.find(j => j.id === req.params.id);

    if (!job) {
        return res.status(404).json({ ok: false, error: "job not found" });
    }

    job.status = req.body.status || "success";
    job.logs = req.body.logs || [];
    job.finishedAt = new Date().toISOString();

    res.json({ ok: true, message: "Resultado guardado" });
});

app.get("/jobs", (req, res) => {
    res.json({ ok: true, jobs });
});

app.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
});
