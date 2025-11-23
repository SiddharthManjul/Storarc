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

    const { chatId } = await request.json();

    if (!chatId) {
      return NextResponse.json(
        { error: "Missing required field: chatId" },
        { status: 400 }
      );
    }

    // Get user-specific chat service
    const chatService = await getUserChatService(user.userAddr);

    // Check and renew if needed (lazy renewal on access)
    const renewed = await chatService.checkAndRenewChat(chatId);
    if (renewed) {
      console.log(`Chat ${chatId} was renewed during load`);
    }

    // Load chat data
    const chatData = await chatService.loadChat(chatId);

    // Update last activity in metadata (marks as active)
    await chatService.updateChatActivity(chatId);

    // Get expiry info
    const expiryInfo = await chatService.getChatExpiryInfo(chatId);

    return NextResponse.json({
      success: true,
      chat: chatData,
      expiryInfo,
      renewed, // Inform client if chat was renewed
    });
  } catch (error: any) {
    console.error("Error loading chat:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load chat" },
      { status: 500 }
    );
  }
}
