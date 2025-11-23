import { NextRequest, NextResponse } from "next/server";
import { Message } from "@/services/chat-service";
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

    const { chatId, message } = await request.json();

    if (!chatId || !message) {
      return NextResponse.json(
        { error: "Missing required fields: chatId, message" },
        { status: 400 }
      );
    }

    // Get user-specific chat service
    const chatService = await getUserChatService(user.userAddr);

    // Create the message object
    const newMessage: Message = {
      id: message.id || Date.now().toString(),
      role: message.role,
      content: message.content,
      timestamp: message.timestamp || Date.now(),
      sources: message.sources,
    };

    // Add message (automatically updates last_activity in metadata)
    await chatService.addMessage(chatId, newMessage);

    return NextResponse.json({
      success: true,
      message: "Message added successfully",
    });
  } catch (error: any) {
    console.error("Error adding message:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add message" },
      { status: 500 }
    );
  }
}
