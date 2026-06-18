import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";

const result = await registerEntitySecretCiphertext({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET,
});

console.log("Done:", JSON.stringify(result, null, 2));
