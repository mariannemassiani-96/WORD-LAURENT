import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/devis/[id] — get one devis
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const row = db.prepare("SELECT * FROM devis WHERE id = ?").get(id) as
    | { data: string }
    | undefined;

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ...row, config: JSON.parse(row.data) });
}

// DELETE /api/devis/[id] — delete a devis
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM devis WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
