import dotenv from 'dotenv';
dotenv.config({ path: '/Users/juhilsavani/Desktop/hackmnd26/backend/.env' });

async function listModels() {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
  const data = await response.json();
  if (data.models) {
      const models15 = data.models.filter(m => m.name.includes('1.5'));
      if (models15.length > 0) {
          console.log("Found Gemini 1.5 models:");
          for (const m of models15) {
            console.log(`  ${m.name}  →  methods: ${m.supportedGenerationMethods.join(', ')}`);
          }
      } else {
          console.log("No Gemini 1.5 models found.");
      }
      console.log("\n--- All flash models ---");
      const flash = data.models.filter(m => m.name.includes('flash'));
      for (const m of flash) {
        console.log(`  ${m.name}  →  methods: ${m.supportedGenerationMethods.join(', ')}`);
      }
  } else {
      console.log("Error:", data);
  }
}
listModels();
