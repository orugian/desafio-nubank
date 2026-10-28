import { NextResponse } from "next/server";
import { listarPersonas } from "@/dados";

export async function GET() {
  return NextResponse.json(listarPersonas());
}
