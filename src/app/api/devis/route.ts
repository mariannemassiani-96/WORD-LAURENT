import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/devis — list all devis
export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, name, reference, client_nom, created_at, updated_at FROM devis ORDER BY updated_at DESC"
    )
    .all();
  return NextResponse.json(rows);
}

// POST /api/devis — create or update a devis
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { id, name, config } = body;

  if (!config) {
    return NextResponse.json({ error: "config is required" }, { status: 400 });
  }

  const db = getDb();
  const devisId = id || Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  const devisName = name || `${config.client?.nom || "Sans nom"} - ${config.reference || "Nouveau"}`;

  db.prepare(
    `INSERT INTO devis (id, name, reference, client_nom, data, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       reference = excluded.reference,
       client_nom = excluded.client_nom,
       data = excluded.data,
       updated_at = datetime('now')`
  ).run(devisId, devisName, config.reference || "", config.client?.nom || "", JSON.stringify(config));

  return NextResponse.json({ id: devisId, name: devisName });
}
