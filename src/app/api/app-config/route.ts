export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    displayTimeZone: process.env.SUBBOOST_DISPLAY_TIME_ZONE || null
  });
}
