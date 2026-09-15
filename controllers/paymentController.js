const crypto = require('crypto')
const  Razorpay= require('razorpay')
const Product = require('../models/productModel')
const { calculateItemGST, calculateOrderTotals } = require('../utils/gstCalculator')


const razorpay =new Razorpay({key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET,	})

const createRazorpayOrder =
	async (req, res) => {
		try {

			const { items, shippingAddress, shippingCost = 0, discount = 0, currency = 'INR',} = req.body

			let numericAmount

			if (Array.isArray(items) && items.length > 0) {
				// Recalculate the payable amount from product + GST data, never trust a client supplied amount
				const gstBreakups = []
				const customerState = shippingAddress?.state || ''
				for (const item of items) {
					const productId = item?.productId || item?.product || item?._id
					const product = await Product.findById(productId)
						.select('_id name price store gstRate priceIncludesGST')
						.populate('store', 'address')
					if (!product) {
						return res.status(404).json({
							success: false,
							message: `Product not found: ${productId}`,
						})
					}
					const quantity = Number(item?.quantity)
					if (!Number.isInteger(quantity) || quantity <= 0) {
						return res.status(400).json({
							success: false,
							message: `Invalid quantity for product: ${product.name}`,
						})
					}
					gstBreakups.push(calculateItemGST({
						price: Number(product.price),
						quantity,
						gstRate: product.gstRate || 0,
						priceIncludesGST: !!product.priceIncludesGST,
						sellerState: product.store?.address?.state || '',
						customerState,
					}))
				}
				const totals = calculateOrderTotals({ items: gstBreakups, shippingCost, discount })
				numericAmount = totals.grandTotal
			} else {
				const { amount } = req.body
				numericAmount = Number(amount)
			}

			if (!Number.isFinite(numericAmount) ||numericAmount <= 0) {
				return res.status(400)
					.json({
						success: false,
						message: 'Invalid payment amount.',
					})
			}

			const razorpayOrder = await razorpay.orders.create({
					amount: Math.round(	numericAmount *	100	),
					currency,
					receipt: `receipt_${Date.now()}`,
				})

			return res.json({success: true,	keyId: process.env.RAZORPAY_KEY_ID,	order: {
					id: razorpayOrder.id,
					amount: razorpayOrder.amount,
					currency: razorpayOrder.currency,
				},
			})

		} catch (error) {
			console.error('Razorpay create order error:',error)
			return res.status(error.status || 500)
				.json({
					success: false,
					message: error.message ||'Unable to create Razorpay order.',
				})
		}
	}



const verifyRazorpayPayment =
	async (req, res) => {
		try {

			const {	razorpay_order_id,	razorpay_payment_id, razorpay_signature,} = req.body
			if (!razorpay_order_id ||	!razorpay_payment_id ||	!razorpay_signature	) {
				return res.status(400)
					.json({
						success: false,
						verified: false,
						message: 'Missing Razorpay payment information.',
					})
			}

			const generatedSignature =
				crypto.createHmac('sha256',	process.env .RAZORPAY_KEY_SECRET)
				.update(
					`${razorpay_order_id}|${razorpay_payment_id}`
				).digest('hex')

			const isValid =	generatedSignature === razorpay_signature

			if (!isValid) {
				return res.status(400)
					.json({
						success: false,
						verified: false,
						message: 'Invalid Razorpay signature.',
					})
			}

			let payment = await razorpay.payments.fetch(razorpay_payment_id);

			if (payment.status === "authorized") {
				payment = await razorpay.payments.capture(
					razorpay_payment_id,
					payment.amount,
					payment.currency
				);
			}

			if (!payment || payment.status !== "captured") {
				return res.status(400).json({
					success: false,
					verified: false,
					message: `Razorpay payment was not captured: ${payment?.status || "unknown"}`,
				});
			}

			console.log("Razorpay payment details:", payment);

			const razorpayMethod = payment?.method || null;

			const paymentTypeMap = {
				card: "Card",
				upi: "UPI",
				netbanking: "Net Banking",
				wallet: "Wallet",
				emi: "EMI",
				paylater: "Pay Later",
			};

			const paymentType = paymentTypeMap[razorpayMethod] || razorpayMethod || "Unknown";
			const cardNetwork = razorpayMethod === "card"  ? payment?.card?.network || null : null;
			const cardType = razorpayMethod === "card" ? payment?.card?.type || null : null;
			const cardLast4 = razorpayMethod === "card"  ? payment?.card?.last4 || null : null;
			const cardIssuer = razorpayMethod === "card" ? payment?.card?.issuer || null : null;
			const bankName = razorpayMethod === "netbanking" ? payment?.bank || null : null;
			return res.json({
				success: true,
				verified: true,
				razorpayOrderId: razorpay_order_id,
				razorpayPaymentId: razorpay_payment_id,
				razorpaySignature: razorpay_signature,
				razorpay_order_id,
				razorpay_payment_id,
				razorpay_signature,
				paymentProvider: "Razorpay",
				paymentType,
				razorpayMethod,
				cardNetwork,
				cardType,
				cardLast4,
				cardIssuer,
				bankName,
			});

		} catch (error) {
			console.error( 'Razorpay verification error:', error )

			return res.status(500)
				.json({
					success: false,
					verified: false,
					message: error.message || 'Payment verification failed.',
				})
		}
	}


module.exports = {createRazorpayOrder, verifyRazorpayPayment,}