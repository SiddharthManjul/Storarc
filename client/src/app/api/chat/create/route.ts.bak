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

    const { chatId, title, initialMessage } = await request.json();

    if (!chatId || !title || !initialMessage) {
      return NextResponse.json(
        { error: "Missing required fields: chatId, title, initialMessage" },
        { status: 400 }
      );
    }

    // Get user-specific chat service
    const chatService = await getUserChatService(user.userAddr);

    // If no registry, user needs to create one first
    if (!chatService) {
      return NextResponse.json(
        {
          error: "No chat registry found",
          needsRegistry: true,
          message: "Please create your chat registry first via wallet"
        },
        { status: 403 }
      );
    }

    // Create the message object
    const message: Message = {
      id: initialMessage.id || Date.now().toString(),
      role: initialMessage.role,
      content: initialMessage.content,
      timestamp: initialMessage.timestamp || Date.now(),
      sources: initialMessage.sources,
    };

    await chatService.createChat(chatId, title, message);

    return NextResponse.json({
      success: true,
      chatId,
      message: "Chat created successfully",
    });
  } catch (error: any) {
    console.error("Error creating chat:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create chat" },
      { status: 500 }
    );
  }
}
