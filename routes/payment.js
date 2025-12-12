const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { getDb } = require("../utils/db");

// Create Checkout Session
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { loanId, userEmail, amount } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Loan Application Fee` },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `http://localhost:5173/dashboard/my-loans?success=true&loanId=${loanId}`,
      cancel_url: `http://localhost:5173/dashboard/my-loans?canceled=true`,
      metadata: { loanId, userEmail },
    });

    res.json({ id: session.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

module.exports = router;
