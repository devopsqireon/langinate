import { initializePaddle, Paddle } from '@paddle/paddle-js'

// Paddle configuration
export const PADDLE_CONFIG = {
  environment: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
  token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
  priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID!,
  productId: process.env.NEXT_PUBLIC_PADDLE_PRODUCT_ID!,
}

let paddleInstance: Paddle | null = null

export async function getPaddle(): Promise<Paddle | null> {
  if (paddleInstance) {
    return paddleInstance
  }

  try {
    paddleInstance = await initializePaddle({
      environment: PADDLE_CONFIG.environment as 'sandbox' | 'production',
      token: PADDLE_CONFIG.token,
    })

    return paddleInstance
  } catch (error) {
    console.error('Failed to initialize Paddle:', error)
    return null
  }
}

export function openCheckout(priceId: string, email?: string, customData?: any) {
  return new Promise(async (resolve, reject) => {
    try {
      const paddle = await getPaddle()
      if (!paddle) {
        reject(new Error('Paddle not initialized'))
        return
      }

      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: email ? { email } : undefined,
        customData: customData || {},
        settings: {
          displayMode: 'overlay',
          theme: 'light',
          locale: 'en',
          successUrl: `${window.location.origin}/subscription?success=true`,
        },
        successCallback: (data) => {
          console.log('Checkout success:', data)
          resolve(data)
        },
        closeCallback: () => {
          console.log('Checkout closed')
          reject(new Error('Checkout closed'))
        },
      })
    } catch (error) {
      console.error('Checkout error:', error)
      reject(error)
    }
  })
}
