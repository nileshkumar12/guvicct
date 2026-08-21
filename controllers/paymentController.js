const crypto = require('crypto')
const Razorpay = require('razorpay')


const razorpay =
	new Razorpay({
		key_id: process.env.RAZORPAY_KEY_ID,

		key_secret: process.env.RAZORPAY_KEY_SECRET,
	})


/*
|--------------------------------------------------------------------------
| CREATE RAZORPAY ORDER
|--------------------------------------------------------------------------
*/

const createRazorpayOrder =
	async (req, res) => {

		try {

			const {
				amount,
				currency = 'INR',
			} = req.body

			const numericAmount =
				Number(amount)

			if (
				!Number.isFinite(
					numericAmount
				) ||
				numericAmount <= 0
			) {

				return res
					.status(400)
					.json({
						success: false,

						message: 'Invalid payment amount.',
					})
			}

			const razorpayOrder =
				await razorpay.orders.create({
					amount: Math.round(
						numericAmount *
						100
					),

					currency,

					receipt: `receipt_${Date.now()}`,
				})

			return res.json({
				success: true,

				keyId: process.env
					.RAZORPAY_KEY_ID,

				order: {
					id: razorpayOrder.id,

					amount: razorpayOrder.amount,

					currency: razorpayOrder.currency,
				},
			})

		} catch (error) {

			console.error(
				'Razorpay create order error:',
				error
			)

			return res
				.status(500)
				.json({
					success: false,

					message: error.message ||
						'Unable to create Razorpay order.',
				})
		}
	}


/*
|--------------------------------------------------------------------------
| VERIFY RAZORPAY PAYMENT
|--------------------------------------------------------------------------
*/

const verifyRazorpayPayment =
	async (req, res) => {

		try {

			const {
				razorpay_order_id,
				razorpay_payment_id,
				razorpay_signature,
			} = req.body

			if (
				!razorpay_order_id ||
				!razorpay_payment_id ||
				!razorpay_signature
			) {

				return res
					.status(400)
					.json({
						success: false,

						verified: false,

						message: 'Missing Razorpay payment information.',
					})
			}

			const generatedSignature =
				crypto
				.createHmac(
					'sha256',
					process.env
					.RAZORPAY_KEY_SECRET
				)
				.update(
					`${razorpay_order_id}|${razorpay_payment_id}`
				)
				.digest('hex')

			const isValid =
				generatedSignature ===
				razorpay_signature

			if (!isValid) {

				return res
					.status(400)
					.json({
						success: false,

						verified: false,

						message: 'Invalid Razorpay signature.',
					})
			}

			/*
			 * IMPORTANT:
			 *
			 * This endpoint only verifies
			 * the payment.
			 *
			 * It does NOT create the ecommerce
			 * order.
			 */

			return res.json({

				success: true,

				verified: true,

				razorpayOrderId: razorpay_order_id,

				razorpayPaymentId: razorpay_payment_id,

				razorpaySignature: razorpay_signature,

				razorpay_order_id,

				razorpay_payment_id,

				razorpay_signature,
			})

		} catch (error) {

			console.error(
				'Razorpay verification error:',
				error
			)

			return res
				.status(500)
				.json({
					success: false,

					verified: false,

					message: error.message ||
						'Payment verification failed.',
				})
		}
	}


module.exports = {
	createRazorpayOrder,
	verifyRazorpayPayment,
}