// Uniswap V2 fallback router/factory deployed by Arc Foundation on Arc Testnet
// (https://oneliq.xyz/docs)
export const ONELIQ_ROUTER = "0x48a9bd1644ac67fbef4183261c466bea3eb333fc" as const;

// Wrapped USDC (native gas token) used as the router's "WETH"-equivalent
export const WUSDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;

export const TOKENS = {
  USDC: {
    symbol: "USDC",
    // Native currency of Arc Testnet (used as gas token)
    address: "native" as const,
    decimals: 18,
  },
  EURC: {
    symbol: "EURC",
    address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as const,
    decimals: 6,
  },
  cirBTC: {
    symbol: "cirBTC",
    // Address not confirmed yet — fill in once available from Arc Docs.
    address: "" as const,
    decimals: 8,
  },
} as const;

export type TokenSymbol = keyof typeof TOKENS;
