import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { storeUserRegistry } from "@/lib/chat-api-helpers";

/**
 * Store user's chat registry ID after they create it via wallet
 * POST /api/chat/registry
 * Body: { registryId: string }
 */
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

    const { registryId } = await request.json();

    if (!registryId) {
      return NextResponse.json(
        { error: "Missing required field: registryId" },
        { status: 400 }
      );
    }

    // Validate registry ID format (basic check)
    if (!registryId.startsWith('0x') || registryId.length !== 66) {
      return NextResponse.json(
        { error: "Invalid registry ID format" },
        { status: 400 }
      );
    }

    // Store registry ID
    await storeUserRegistry(user.userAddr, registryId);

    return NextResponse.json({
      success: true,
      message: "Registry ID stored successfully",
      registryId,
    });
  } catch (error: any) {
    console.error("Error storing registry ID:", error);
    return NextResponse.json(
      { error: error.message || "Failed to store registry ID" },
      { status: 500 }
    );
  }
}
