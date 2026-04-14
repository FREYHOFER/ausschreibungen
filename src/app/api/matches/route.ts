import { NextRequest, NextResponse } from "next/server";
import { getCompanies, getTenderById, getTenders } from "@/lib/domain/repository";
import {
  calculateMatchesForAllTenders,
  calculateMatchesForTender,
} from "@/lib/matching/score";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenderId = searchParams.get("tenderId");

  const companies = getCompanies();

  if (tenderId) {
    const tender = getTenderById(tenderId);

    if (!tender) {
      return NextResponse.json(
        { error: "Tender wurde nicht gefunden." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      tender,
      matches: calculateMatchesForTender(tender, companies),
      generatedAt: new Date().toISOString(),
    });
  }

  const tenders = getTenders();

  return NextResponse.json({
    tenders,
    matchesByTender: calculateMatchesForAllTenders(tenders, companies),
    generatedAt: new Date().toISOString(),
  });
}
