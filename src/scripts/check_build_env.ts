if (!process.env.FMP_API_KEY) {
    console.error("\n🛑 BUILD ERROR: FMP_API_KEY is missing in environment.");
    console.error("   Ensure .env or .env.local exists before building.\n");
    process.exit(1);
}
console.log("✅ Build Environment Validated.");
