import Stripe from "stripe";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useCallback } from "react";
import { stripePromise } from "./stripe.services.ts";

export const Preorder = () => {
  // TODO stripe says to do this on the server, double check to see if this is safe to do here
  const fetchClientSecret = useCallback(async () => {
    "use server";
    const stripe = new Stripe(import.meta.env.VITE_STRIPE_PRIVATE_KEY);
    const res = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: "Peach Pod Preorder",
            description: "100% refundable until we ship.",
          },
          unit_amount: 2000,
        },
        quantity: 1,
      }],
      mode: "payment",
      ui_mode: "embedded",
      return_url: `${import.meta.env.VITE_SERVER_BASE_URL}?session_id={CHECKOUT_SESSION_ID}`, // TODO add a "thank you!" page
    });
    return res.client_secret || "";
  }, []);
  
  const options = { fetchClientSecret };
  
  return (
    <section id="checkout" className={"p-2"}>
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={options}
      >
        <EmbeddedCheckout/>
      </EmbeddedCheckoutProvider>
    </section>
  )
}