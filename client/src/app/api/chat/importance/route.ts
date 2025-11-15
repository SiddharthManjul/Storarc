import { NextRequest, NextResponse } from "next/server";
import { ChatService } from "@/services/chat-service";

export async function POST(request: NextRequest) {
  try {
    const { chatId, isImportant } = await request.json();

    if (!chatId || typeof isImportant !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields: chatId, isImportant" },
        { status: 400 }
      );
    }

    const chatService = new ChatService();

    await chatService.setChatImportance(chatId, isImportant);

    return NextResponse.json({
      success: true,
      message: `Chat ${isImportant ? "marked as" : "unmarked from"} important`,
    });
  } catch (error: any) {
    console.error("Error setting chat importance:", error);
    return NextResponse.json(
      { error: error.message || "Failed to set chat importance" },
      { status: 500 }
    );
  }
}
