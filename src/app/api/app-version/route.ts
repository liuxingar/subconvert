export const dynamic = "force-dynamic";

export function GET() {
  const version = process.env.APP_VERSION || "0.1.0-local";
  return Response.json({
    version,
    releaseVersion: version.split("+")[0],
    buildSha: "local",
    buildVersion: version
  });
}
