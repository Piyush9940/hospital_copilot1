import Razorpay from "razorpay";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const createError = (message, statusCode = 500) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const validateRazorpayConfig = () => {
    if (!RAZORPAY_KEY_ID || typeof RAZORPAY_KEY_ID !== "string" || !RAZORPAY_KEY_ID.trim()) {
        throw createError("RAZORPAY_KEY_ID is missing in environment variables", 500);
    }

    if (
        !RAZORPAY_KEY_SECRET ||
        typeof RAZORPAY_KEY_SECRET !== "string" ||
        !RAZORPAY_KEY_SECRET.trim()
    ) {
        throw createError("RAZORPAY_KEY_SECRET is missing in environment variables", 500);
    }
};

let razorpayInstance = null;

/**
 * Returns singleton Razorpay instance
 * @returns {Razorpay}
 */
export const getRazorpayInstance = () => {
    try {
        validateRazorpayConfig();

        if (!razorpayInstance) {
            razorpayInstance = new Razorpay({
                key_id: RAZORPAY_KEY_ID,
                key_secret: RAZORPAY_KEY_SECRET,
            });
        }

        return razorpayInstance;
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw createError(`Failed to initialize Razorpay: ${error.message}`, 500);
    }
};

/**
 * Create Razorpay order
 * @param {Object} options
 * @param {number} options.amount - Amount in rupees
 * @param {string} options.currency
 * @param {string} options.receipt
 * @param {Object} options.notes
 * @returns {Promise<Object>}
 */
export const createRazorpayOrder = async ({
    amount,
    currency = "INR",
    receipt,
    notes = {},
}) => {
    try {
        const razorpay = getRazorpayInstance();

        if (amount === undefined || amount === null || isNaN(amount)) {
            throw createError("Valid amount is required", 400);
        }

        const numericAmount = Number(amount);

        if (numericAmount <= 0) {
            throw createError("Amount must be greater than 0", 400);
        }

        if (!currency || typeof currency !== "string" || !currency.trim()) {
            throw createError("Currency is required", 400);
        }

        if (!receipt || typeof receipt !== "string" || !receipt.trim()) {
            throw createError("Receipt is required", 400);
        }

        if (typeof notes !== "object" || Array.isArray(notes) || notes === null) {
            throw createError("Notes must be a valid object", 400);
        }

        const order = await razorpay.orders.create({
            amount: Math.round(numericAmount * 100),
            currency: currency.trim().toUpperCase(),
            receipt: receipt.trim(),
            notes,
        });

        if (!order || !order.id) {
            throw createError("Failed to create Razorpay order", 500);
        }

        return order;
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        if (error?.error?.description) {
            throw createError(`Razorpay order creation failed: ${error.error.description}`, 500);
        }

        throw createError(`Failed to create Razorpay order: ${error.message}`, 500);
    }
};

/**
 * Fetch Razorpay payment by payment ID
 * @param {string} paymentId
 * @returns {Promise<Object>}
 */
export const fetchRazorpayPayment = async (paymentId) => {
    try {
        const razorpay = getRazorpayInstance();

        if (!paymentId || typeof paymentId !== "string" || !paymentId.trim()) {
            throw createError("Payment ID is required", 400);
        }

        const payment = await razorpay.payments.fetch(paymentId.trim());

        if (!payment || !payment.id) {
            throw createError("Payment not found on Razorpay", 404);
        }

        return payment;
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        if (error?.error?.description) {
            throw createError(`Failed to fetch payment: ${error.error.description}`, 500);
        }

        throw createError(`Failed to fetch payment: ${error.message}`, 500);
    }
};

/**
 * Fetch Razorpay order by order ID
 * @param {string} orderId
 * @returns {Promise<Object>}
 */
export const fetchRazorpayOrder = async (orderId) => {
    try {
        const razorpay = getRazorpayInstance();

        if (!orderId || typeof orderId !== "string" || !orderId.trim()) {
            throw createError("Order ID is required", 400);
        }

        const order = await razorpay.orders.fetch(orderId.trim());

        if (!order || !order.id) {
            throw createError("Order not found on Razorpay", 404);
        }

        return order;
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        if (error?.error?.description) {
            throw createError(`Failed to fetch order: ${error.error.description}`, 500);
        }

        throw createError(`Failed to fetch order: ${error.message}`, 500);
    }
};

/**
 * Verify basic payment signature presence
 * Full signature verification should be done in controller/service using crypto.
 * @param {Object} payload
 * @returns {boolean}
 */
export const validateRazorpaySignaturePayload = (payload) => {
    try {
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
            throw createError("Valid signature payload is required", 400);
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload;

        if (!razorpay_order_id || typeof razorpay_order_id !== "string") {
            throw createError("razorpay_order_id is required", 400);
        }

        if (!razorpay_payment_id || typeof razorpay_payment_id !== "string") {
            throw createError("razorpay_payment_id is required", 400);
        }

        if (!razorpay_signature || typeof razorpay_signature !== "string") {
            throw createError("razorpay_signature is required", 400);
        }

        return true;
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw createError(`Invalid Razorpay signature payload: ${error.message}`, 400);
    }
};

export default {
    getRazorpayInstance,
    createRazorpayOrder,
    fetchRazorpayPayment,
    fetchRazorpayOrder,
    validateRazorpaySignaturePayload,
};