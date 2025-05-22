import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
    try {
        const { question } = await req.json();

        if (!question) {
            return NextResponse.json({ error: "Missing question parameter" }, { status: 400 });
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are an AI that generates sermon outlines based on Bible questions." },
                {
                    role: "user",
                    content: `Generate a sermon outline based on this question: "${question}". 
                    Include the following in JSON format: 
                    {"title": "Sermon Title", "verses": ["Verse 1", "Verse 2", "Verse 3"], "outline": ["Point 1", "Point 2", "Point 3"]}.`
                },
            ],
            max_tokens: 300,
        });

        let sermon;
        try {
            sermon = JSON.parse(response.choices[0]?.message?.content?.trim() || "{}");

            if (!sermon.title || !sermon.verses || !sermon.outline) {
                sermon = { title: "Sermon Not Available", verses: [], outline: [] };
            }
        } catch (error) {
            sermon = { title: "Sermon Not Available", verses: [], outline: [] };
        }

        return NextResponse.json(sermon);
    } catch (error) {
        console.error("Error generating sermon:", error);
        return NextResponse.json({ error: "Error processing request" }, { status: 500 });
    }
}