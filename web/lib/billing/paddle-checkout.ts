import { initializePaddle, type Paddle } from "@paddle/paddle-js";

let paddlePromise: Promise<Paddle | undefined> | null = null;

export function paddleEnvironment(clientToken: string): "sandbox" | "production" {
  return clientToken.startsWith("live_") ? "production" : "sandbox";
}

export function extractPaddleTransactionId(checkoutUrl: string): string | null {
  try {
    const url = new URL(checkoutUrl);
    const ptxn = url.searchParams.get("_ptxn");
    if (ptxn) {
      return ptxn;
    }
  } catch {
    // Fall through to regex.
  }

  const match = checkoutUrl.match(/txn_[a-zA-Z0-9]+/);
  return match?.[0] ?? null;
}

export async function openPaddleCheckoutOverlay(options: {
  clientToken: string;
  transactionId: string;
  successUrl: string;
  onCompleted?: (transactionId: string) => void;
  onClosed?: () => void;
}): Promise<void> {
  paddlePromise ??= initializePaddle({
    token: options.clientToken,
    environment: paddleEnvironment(options.clientToken),
    eventCallback(event) {
      if (event.name === "checkout.completed") {
        const transactionId =
          typeof event.data === "object" && event.data && "transaction_id" in event.data
            ? String((event.data as { transaction_id?: string }).transaction_id ?? options.transactionId)
            : options.transactionId;
        options.onCompleted?.(transactionId);
      }

      if (event.name === "checkout.closed") {
        options.onClosed?.();
      }
    },
  });

  const paddle = await paddlePromise;
  if (!paddle) {
    throw new Error("Could not load checkout.");
  }

  paddle.Checkout.open({
    transactionId: options.transactionId,
    settings: {
      displayMode: "overlay",
      theme: "light",
      allowLogout: false,
      successUrl: options.successUrl,
    },
  });
}
