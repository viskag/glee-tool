import clientPromise from "../../../lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const studies = await db.collection("studies").find({}).sort({ updatedAt: -1 }).toArray();

    return NextResponse.json({ studies });
  } catch (error) {
    console.error("MongoDB GET studies error:", error);
    return NextResponse.json({ error: "Failed to fetch studies from MongoDB." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || !body.name || !body.questions || !body.id) {
      return NextResponse.json({ error: "Invalid study payload." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const payload = {
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await db.collection("studies").updateOne(
      { id: body.id },
      { $set: payload },
      { upsert: true }
    );

    return NextResponse.json({
      ok: true,
      id: body.id,
      acknowledged: result.acknowledged,
      updatedAt: payload.updatedAt,
    });
  } catch (error) {
    console.error("MongoDB POST studies error:", error);
    return NextResponse.json({ error: "Failed to save study to MongoDB." }, { status: 500 });
  }
}
