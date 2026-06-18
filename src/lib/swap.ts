import { encodeFunctionData, parseUnits, toHex } from "viem";
import type { EIP1193Provider } from "viem";
import { TOKENS, ONELIQ_ROUTER, WUSDC_ADDRESS, type TokenSymbol } from "./tokens";

const routerAbi = [
  {
    name: "swapExactETHForTokens",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    name: "swapExactTokensForETH",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
] as const;

const erc20Abi = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

async function sendTx(
  provider: EIP1193Provider,
  account: `0x${string}`,
  to: `0x${string}`,
  data: `0x${string}`,
  value?: bigint,
  gasLimit: bigint = 5000000n,
) {
  return provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: account,
        to,
        data,
        gas: toHex(gasLimit),
        ...(value ? { value: toHex(value) } : {}),
      },
    ],
  }) as Promise<`0x${string}`>;
}

export async function swapTokens(
  provider: EIP1193Provider,
  account: `0x${string}`,
  fromToken: TokenSymbol,
  toToken: TokenSymbol,
  amount: string,
  gasLimit?: bigint,
) {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 10);
  const amountIn = parseUnits(amount, TOKENS[fromToken].decimals);

  if (fromToken === "USDC" && toToken === "EURC") {
    const data = encodeFunctionData({
      abi: routerAbi,
      functionName: "swapExactETHForTokens",
      args: [0n, [WUSDC_ADDRESS, TOKENS.EURC.address], account, deadline],
    });
    const txHash = await sendTx(provider, account, ONELIQ_ROUTER, data, amountIn, gasLimit);
    return { txHash, explorerUrl: `https://testnet.arcscan.app/tx/${txHash}` };
  }

  if (fromToken === "EURC" && toToken === "USDC") {
    const approveData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [ONELIQ_ROUTER, amountIn],
    });
    await sendTx(provider, account, TOKENS.EURC.address, approveData, undefined, gasLimit);

    const swapData = encodeFunctionData({
      abi: routerAbi,
      functionName: "swapExactTokensForETH",
      args: [amountIn, 0n, [TOKENS.EURC.address, WUSDC_ADDRESS], account, deadline],
    });
    const txHash = await sendTx(provider, account, ONELIQ_ROUTER, swapData, undefined, gasLimit);
    return { txHash, explorerUrl: `https://testnet.arcscan.app/tx/${txHash}` };
  }

  throw new Error(`Unsupported swap pair: ${fromToken} -> ${toToken}`);
}
