import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { getUserChatService } from "@/lib/chat-api-helpers";

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required. Please login first." },
        { status: 401 }
      );
    }

    // Get user-specific chat service
    const chatService = await getUserChatService(user.userAddr);

    // Get all chats for this user
    const chats = await chatService.getAllChats();

    return NextResponse.json({
      success: true,
      chats,
      total: chats.length,
    });
  } catch (error: any) {
    console.error("Error listing chats:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list chats" },
      { status: 500 }
    );
  }
}
