import { NextRequest, NextResponse } from "next/server";
import { ChatService } from "@/services/chat-service";

export async function GET(request: NextRequest) {
  try {
    const chatService = new ChatService();

    // Get all chats
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
