require("dotenv").config();

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const app = express();

app.use(express.json({limit:"1mb"}));
app.use(express.static(path.join(__dirname, "public")));

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

app.post("/api/create-order", async (req, res) => {
  try{
    const amount = Number(req.body.amount);

    if(!Number.isFinite(amount) || amount <= 0){
      return res.status(400).json({error:"Invalid order amount"});
    }

    /*
      PRODUCTION NOTE:
      Do not trust the browser's amount in a live store.
      Fetch official artwork prices from your database here,
      recalculate the order total on the server, and confirm
      that each original artwork is still available.
    */

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `studiom_${Date.now()}`
    });

    res.json({
      key: process.env.RAZORPAY_KEY_ID,
      order
    });

  }catch(error){
    console.error(error);
    res.status(500).json({error:"Unable to create Razorpay order"});
  }
});

app.post("/api/verify-payment", (req, res) => {
  try{
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const ok = expected === razorpay_signature;

    if(!ok){
      return res.status(400).json({ok:false});
    }

    /*
      PRODUCTION NEXT STEPS:
      - save the verified order in Firestore/database
      - mark the artwork sold/reserved
      - email order confirmation
      - create invoice
      - trigger shipping workflow
    */

    res.json({ok:true});

  }catch(error){
    console.error(error);
    res.status(500).json({ok:false});
  }
});

app.get("*", (req,res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`StudioM running at http://localhost:${PORT}`);
});
