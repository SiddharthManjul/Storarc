import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { getUserChatService } from "@/lib/chat-api-helpers";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required. Please login first." },
        { status: 401 }
      );
    }

    const { chatId, isImportant } = await request.json();

    if (!chatId || typeof isImportant !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields: chatId, isImportant" },
        { status: 400 }
      );
    }

    // Get user-specific chat service
    const chatService = await getUserChatService(user.userAddr);

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
