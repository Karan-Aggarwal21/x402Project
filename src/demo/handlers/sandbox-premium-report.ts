// OWNER: DEMO · x402 seller, $2.00. THE OVER-LIMIT TRAP. Demo D2 and D6 both hit this.
import { NextResponse } from "next/server";
import { PREMIUM_REPORT } from "@/demo/sandbox/data";
import { withSandboxPayment } from "@/demo/sandbox/middleware";

const seller = async () => NextResponse.json(PREMIUM_REPORT);

const paid = withSandboxPayment("/api/sandbox/premium-report", seller);
export { paid as GET, paid as POST };
