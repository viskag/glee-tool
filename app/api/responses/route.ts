import clientPromise from "../../../lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const questionnaireId = new URL(request.url).searchParams.get("questionnaireId");
    if (!questionnaireId) {
      return NextResponse.json({ error: "questionnaireId is required." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const responses = await db.collection("responses").find({ "questionnaire.id": questionnaireId }).sort({ submittedAt: -1 }).toArray();

    return NextResponse.json({ responses });
  } catch (error) {
    console.error("MongoDB GET responses error:", error);
    return NextResponse.json({ error: "Failed to fetch responses from MongoDB." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.responseId || body.format !== "glee-participant-response" || !body.questionnaire?.id || !body.answers) {
      return NextResponse.json({ error: "Invalid participant response payload." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const responses = db.collection("responses");
    await responses.createIndex({ "questionnaire.id": 1, submittedAt: -1 });

    const result = await responses.updateOne(
      { responseId: body.responseId },
      { $setOnInsert: { ...body, savedAt: new Date().toISOString() } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, responseId: body.responseId, acknowledged: result.acknowledged });
  } catch (error) {
    console.error("MongoDB POST responses error:", error);
    return NextResponse.json({ error: "Failed to save participant response to MongoDB." }, { status: 500 });
  }
}
