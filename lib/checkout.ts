export function getCheckoutUrl(variantId: string, userId: string, email: string): string {
  const base = variantId === process.env.NEXT_PUBLIC_LMS_VARIANT_SIMULATOR
    ? `https://seawolfprep.lemonsqueezy.com/checkout/buy/${process.env.NEXT_PUBLIC_LMS_VARIANT_SIMULATOR}`
    : `https://seawolfprep.lemonsqueezy.com/checkout/buy/${process.env.NEXT_PUBLIC_LMS_VARIANT_SIMULATOR_SOLVER}`
  
  const params = new URLSearchParams({
    'checkout[custom][user_id]': userId,
    'checkout[email]': email,
  })

  return `${base}?${params.toString()}`
}
