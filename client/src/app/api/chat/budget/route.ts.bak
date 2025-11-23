import { NextRequest, NextResponse } from "next/server";
import { ChatService } from "@/services/chat-service";

// Get renewal budget balance
export async function GET(request: NextRequest) {
  try {
    const chatService = new ChatService();

    const balance = await chatService.getRenewalBudget();

    return NextResponse.json({
      success: true,
      balance,
      balanceInSui: balance / 1_000_000_000,
    });
  } catch (error: any) {
    console.error("Error getting renewal budget:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get renewal budget" },
      { status: 500 }
    );
  }
}

// Add funds to renewal budget
export async function POST(request: NextRequest) {
  try {
    const { amountInSui } = await request.json();

    if (!amountInSui || amountInSui <= 0) {
      return NextResponse.json(
        { error: "Invalid amount. Must be positive number" },
        { status: 400 }
      );
    }

    const chatService = new ChatService();

    await chatService.addRenewalBudget(amountInSui);

    return NextResponse.json({
      success: true,
      message: `Added ${amountInSui} SUI to renewal budget`,
    });
  } catch (error: any) {
    console.error("Error adding renewal budget:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add renewal budget" },
      { status: 500 }
    );
  }
}
