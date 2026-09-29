const mongoose = require("mongoose");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const Store = require("../models/storeModel");
const User = require("../models/userModel");
const SellerNotification = require("../models/sellerNotificationModel");

const {
    sendOrderConfirmationEmail
} = require("../utils/sendEmail");

const {
    calculateItemGST,
    calculateOrderTotals
} = require("../utils/gstCalculator");

const {
    resolveOrderRequestMetadata
} = require("../utils/orderRequestMetadata");

const ORDER_STATUS = [
    "Pending",
    "Confirmed",
    "Shipped",
    "Delivered",
    "Cancelled",
];

const PAYMENT_METHODS = [
    "cod",
    "razorpay",
];

const getUserId = (req) => {
    return req.user?._id || req.user?.id;
};

const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

const requireRole = async (userId, allowedRoles) => {
    if (!userId) {
        const error = new Error("Authentication required");
        error.status = 401;
        throw error;
    }

    const user = await User.findById(userId);

    if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
    }

    if (!allowedRoles.includes(user.role)) {
        const error = new Error(
            `Only ${allowedRoles.join(" or ")} can access this resource`
        );
        error.status = 403;
        throw error;
    }

    return user;
};

const toAttributeObject = (attributes) => {
    if (attributes instanceof Map) {
        return Object.fromEntries(attributes);
    }

    if (attributes?.toObject) {
        return attributes.toObject();
    }

    return attributes &&
        typeof attributes === "object" &&
        !Array.isArray(attributes)
        ? attributes
        : {};
};

const attributesMatch = (
    catalogAttributes,
    selectedAttributes
) => {
    const catalog = toAttributeObject(catalogAttributes);
    const selected = toAttributeObject(selectedAttributes);

    const catalogEntries = Object.entries(catalog)
        .sort(([left], [right]) => left.localeCompare(right));

    const selectedEntries = Object.entries(selected)
        .sort(([left], [right]) => left.localeCompare(right));

    return (
        catalogEntries.length === selectedEntries.length &&
        catalogEntries.every(
            ([key, value], index) =>
                key === selectedEntries[index][0] &&
                String(value) ===
                String(selectedEntries[index][1])
        )
    );
};


/* =========================================================
   NORMALIZE ORDER ITEMS
========================================================= */

const normalizeOrderItems = async (
    items,
    customerState = ""
) => {

    const groupedItems = new Map();
    const gstBreakups = [];
    const sellerIds = new Set();

    for (const item of items) {

        /* =====================================================
           PRODUCT
        ===================================================== */

        const rawProductId =
            item?.productId ||
            item?.product ||
            item?._id;

        const incomingProductId =
            typeof rawProductId === "object" &&
                rawProductId !== null
                ? rawProductId._id || rawProductId.id
                : rawProductId;

        if (!incomingProductId) {
            const error = new Error(
                "Product ID is required"
            );

            error.status = 400;
            throw error;
        }

        if (!isValidObjectId(incomingProductId)) {
            const error = new Error(
                `Invalid product ID: ${incomingProductId}`
            );

            error.status = 400;
            throw error;
        }

        const product = await Product.findById(
            incomingProductId
        )
            .select(
                "_id name price seller store stock hsnCode gstRate priceIncludesGST variants addons"
            )
            .populate(
                "store",
                "address"
            );

        if (!product) {
            const error = new Error(
                `Product not found: ${incomingProductId}`
            );

            error.status = 404;
            throw error;
        }

        if (
            !product.seller ||
            !isValidObjectId(product.seller)
        ) {
            const error = new Error(
                `Product seller is missing for product: ${product.name}`
            );

            error.status = 400;
            throw error;
        }

        if (
            !product.store ||
            !isValidObjectId(
                product.store?._id ||
                product.store
            )
        ) {
            const error = new Error(
                `Product store is missing for product: ${product.name}`
            );

            error.status = 400;
            throw error;
        }


        /* =====================================================
           QUANTITY
        ===================================================== */

        const quantity = Number(
            item?.quantity ??
            item?.qty ??
            1
        );

        if (
            !Number.isInteger(quantity) ||
            quantity <= 0
        ) {
            const error = new Error(
                `Invalid quantity for product: ${product.name}`
            );

            error.status = 400;
            throw error;
        }


        /* =====================================================
           VARIANT
           Supports:

           variant
           selectedVariant
           variantId
           variant_id
           variantSku
           sku
           variantAttributes
           selectedAttributes
        ===================================================== */

        const variantInput =
            item?.variant &&
                typeof item.variant === "object"
                ? item.variant
                : {};

        const selectedVariantInput =
            item?.selectedVariant &&
                typeof item.selectedVariant === "object"
                ? item.selectedVariant
                : {};


        /* -----------------------------------------------------
           VARIANT ID
        ----------------------------------------------------- */

        const requestedVariantId = String(
            item?.variantId ||
            item?.variant_id ||
            variantInput.variantId ||
            variantInput._id ||
            variantInput.id ||
            selectedVariantInput.variantId ||
            selectedVariantInput._id ||
            selectedVariantInput.id ||
            ""
        );


        /* -----------------------------------------------------
           VARIANT SKU
        ----------------------------------------------------- */

        const requestedSku = String(
            item?.variantSku ||
            item?.variantSKU ||
            item?.sku ||
            variantInput.sku ||
            selectedVariantInput.sku ||
            ""
        );


        /* -----------------------------------------------------
           VARIANT ATTRIBUTES
        ----------------------------------------------------- */

        const requestedAttributes =
            item?.variantAttributes ||
            item?.selectedAttributes ||
            variantInput.attributes ||
            selectedVariantInput.attributes ||
            item?.attributes ||
            {};

        const hasSelectedAttributes =
            Object.keys(
                toAttributeObject(
                    requestedAttributes
                )
            ).length > 0;


        const hasVariantSelection =
            Boolean(
                requestedVariantId ||
                requestedSku ||
                hasSelectedAttributes
            );


        const variants =
            product.variants || [];

        let variant = null;


        /* -----------------------------------------------------
           PRODUCT HAS VARIANTS
        ----------------------------------------------------- */

        if (
            variants.length &&
            !hasVariantSelection
        ) {
            const error = new Error(
                `A variant must be selected for product: ${product.name}`
            );

            error.status = 400;
            throw error;
        }


        /* -----------------------------------------------------
           FIND SELECTED VARIANT
        ----------------------------------------------------- */

        if (hasVariantSelection) {

            variant = variants.find(
                (candidate) => {

                    const candidateId =
                        String(
                            candidate._id ||
                            candidate.variantId ||
                            ""
                        );


                    /* Variant ID */

                    if (
                        requestedVariantId &&
                        requestedVariantId !== candidateId &&
                        requestedVariantId !==
                        String(
                            candidate.sku || ""
                        )
                    ) {
                        return false;
                    }


                    /* Variant SKU */

                    if (
                        requestedSku &&
                        requestedSku !==
                        String(
                            candidate.sku || ""
                        )
                    ) {
                        return false;
                    }


                    /* Variant Attributes */

                    if (
                        hasSelectedAttributes &&
                        !attributesMatch(
                            candidate.attributes,
                            requestedAttributes
                        )
                    ) {
                        return false;
                    }


                    return true;
                }
            );


            if (!variant) {

                const error = new Error(
                    `Selected variant is unavailable for product: ${product.name}`
                );

                error.status = 400;
                throw error;
            }
        }


        /* =====================================================
           ADDONS
        ===================================================== */

        const requestedAddons =
            item?.addons ??
            item?.selectedAddons ??
            [];

        if (!Array.isArray(requestedAddons)) {

            const error = new Error(
                `Invalid addons for product: ${product.name}`
            );

            error.status = 400;
            throw error;
        }

        const selectedAddons = new Map();

        for (const selection of requestedAddons) {

            const rawAddonId =
                typeof selection === "object" &&
                    selection !== null
                    ? selection.addonId ||
                    selection._id ||
                    selection.id
                    : selection;


            const addon =
                (product.addons || [])
                    .find(
                        (candidate) =>
                            String(candidate._id) ===
                            String(rawAddonId)
                    );


            if (
                !addon ||
                addon.status !== "active"
            ) {
                const error = new Error(
                    `Selected addon is unavailable for product: ${product.name}`
                );

                error.status = 400;
                throw error;
            }


            const addonQuantity = Number(
                typeof selection === "object"
                    ? selection.quantity ?? 1
                    : 1
            );


            if (
                !Number.isInteger(addonQuantity) ||
                addonQuantity < 1 ||
                addonQuantity >
                Number(addon.maxQuantity || 1)
            ) {
                const error = new Error(
                    `Invalid addon quantity for ${addon.name}`
                );

                error.status = 400;
                throw error;
            }


            const key =
                String(addon._id);

            const previous =
                selectedAddons.get(key);

            const combinedQuantity =
                addonQuantity +
                (previous?.quantity || 0);


            if (
                combinedQuantity >
                Number(addon.maxQuantity || 1)
            ) {
                const error = new Error(
                    `Invalid addon quantity for ${addon.name}`
                );

                error.status = 400;
                throw error;
            }


            selectedAddons.set(
                key,
                {
                    addonId: key,
                    name: addon.name,
                    price: Number(addon.price),
                    quantity: combinedQuantity,
                }
            );
        }


        /* =====================================================
           GROUP SAME PRODUCT + VARIANT + ADDONS
        ===================================================== */

        const normalizedVariantId =
            variant
                ? String(
                    variant._id ||
                    variant.variantId ||
                    variant.sku
                )
                : "";

        const variantAttributes =
            variant
                ? toAttributeObject(
                    variant.attributes
                )
                : {};

        const addons =
            [...selectedAddons.values()]
                .sort(
                    (left, right) =>
                        left.addonId.localeCompare(
                            right.addonId
                        )
                );


        const key = JSON.stringify([
            String(product._id),
            normalizedVariantId,
            addons.map(
                (addon) => [
                    addon.addonId,
                    addon.quantity
                ]
            ),
        ]);


        const grouped =
            groupedItems.get(key);


        if (grouped) {

            grouped.quantity += quantity;

        } else {

            groupedItems.set(
                key,
                {
                    product,
                    quantity,
                    variant,

                    variantId:
                        normalizedVariantId,

                    variantSku:
                        variant?.sku || "",

                    variantName:
                        variant
                            ? variant.name ||
                            Object.entries(
                                variantAttributes
                            )
                                .map(
                                    ([name, value]) =>
                                        `${name}: ${value}`
                                )
                                .join(" / ") ||
                            variant.sku ||
                            ""
                            : "",

                    variantAttributes,

                    addons,
                }
            );
        }
    }


    /* =========================================================
       CREATE ORDER ITEMS
    ========================================================= */

    const orderItems = [];

    let subtotal = 0;


    for (
        const grouped of groupedItems.values()
    ) {

        const {
            product,
            quantity,
            variant,
            addons
        } = grouped;


        /* -----------------------------------------------------
           STOCK
        ----------------------------------------------------- */

        const stock =
            variant
                ? variant.stock
                : product.stock;


        if (
            stock !== undefined &&
            stock !== null &&
            quantity > Number(stock)
        ) {

            const error = new Error(
                `Insufficient stock for product: ${product.name}. Available stock: ${stock}`
            );

            error.status = 400;
            throw error;
        }


        /* -----------------------------------------------------
           PRICE
        ----------------------------------------------------- */

        const basePrice =
            Number(
                variant?.price ??
                product.price
            );


        if (
            !Number.isFinite(basePrice) ||
            basePrice < 0 ||
            addons.some(
                (addon) =>
                    !Number.isFinite(
                        addon.price
                    ) ||
                    addon.price < 0
            )
        ) {

            const error = new Error(
                `Invalid price for product: ${product.name}`
            );

            error.status = 400;
            throw error;
        }


        const price =
            basePrice +
            addons.reduce(
                (sum, addon) =>
                    sum +
                    addon.price *
                    addon.quantity,
                0
            );


        /* -----------------------------------------------------
           ADDON SNAPSHOT
        ----------------------------------------------------- */

        const addonSnapshots =
            addons.map(
                (addon) => ({
                    ...addon,
                    total:
                        addon.price *
                        addon.quantity *
                        quantity,
                })
            );


        /* -----------------------------------------------------
           GST
        ----------------------------------------------------- */

        const gst =
            calculateItemGST({
                price,
                quantity,
                gstRate:
                    product.gstRate || 0,
                priceIncludesGST:
                    !!product.priceIncludesGST,
                sellerState:
                    product.store?.address?.state ||
                    "",
                customerState,
            });


        const total =
            price * quantity;

        subtotal += total;

        gstBreakups.push(gst);


        /* =====================================================
           ORDER ITEM

           IMPORTANT:
           Save both:

           1. nested variant snapshot
           2. existing flat variant fields

           This keeps compatibility with existing schema/UI.
        ===================================================== */

        orderItems.push({

            product:
                product._id,

            seller:
                product.seller,

            store:
                product.store?._id ||
                product.store,

            productName:
                product.name,


            /* -------------------------------------------------
               VARIANT SNAPSHOT
            ------------------------------------------------- */

            variant:
                grouped.variantId ||
                    grouped.variantSku ||
                    Object.keys(
                        grouped.variantAttributes || {}
                    ).length
                    ? {
                        variantId:
                            grouped.variantId ||
                            null,

                        sku:
                            grouped.variantSku ||
                            "",

                        name:
                            grouped.variantName ||
                            "",

                        attributes:
                            grouped.variantAttributes ||
                            {},

                        price:
                            Number(
                                variant?.price ??
                                product.price
                            ),
                    }
                    : null,


            /* -------------------------------------------------
               FLAT VARIANT FIELDS
            ------------------------------------------------- */

            variantId:
                grouped.variantId,

            variantSku:
                grouped.variantSku,

            variantName:
                grouped.variantName,

            variantAttributes:
                grouped.variantAttributes,


            /* -------------------------------------------------
               ADDONS
            ------------------------------------------------- */

            addons:
                addonSnapshots,


            /* -------------------------------------------------
               QUANTITY / PRICE
            ------------------------------------------------- */

            quantity,

            price,

            total,


            /* -------------------------------------------------
               GST
            ------------------------------------------------- */

            hsnCode:
                product.hsnCode || "",

            gstRate:
                product.gstRate || 0,

            taxableAmount:
                gst.taxableAmount,

            cgstAmount:
                gst.cgstAmount,

            sgstAmount:
                gst.sgstAmount,

            igstAmount:
                gst.igstAmount,

            gstAmount:
                gst.gstAmount,
        });


        if (product.seller) {
            sellerIds.add(
                String(product.seller)
            );
        }
    }


    return {
        orderItems,
        subtotal,
        gstBreakups,
        sellerIds: [
            ...sellerIds
        ],
    };
};


/* =========================================================
   SELLER PRODUCT IDS
========================================================= */

const getSellerProductIds =
    async (sellerId) => {

        const products =
            await Product.find({
                seller: sellerId,
            }).select("_id");

        return products.map(
            (product) => product._id
        );
    };


/* =========================================================
   SHIPPING ADDRESS
========================================================= */

const normalizeShippingAddress =
    (shippingAddress = {}) => ({

        line1:
            shippingAddress.line1 ||
            shippingAddress.addressLine1 ||
            shippingAddress.address ||
            shippingAddress.street ||
            "",

        line2:
            shippingAddress.line2 ||
            shippingAddress.addressLine2 ||
            "",

        city:
            shippingAddress.city ||
            "",

        state:
            shippingAddress.state ||
            "",

        postalCode:
            shippingAddress.postalCode ||
            shippingAddress.zipCode ||
            shippingAddress.zip ||
            shippingAddress.pincode ||
            "",

        country:
            shippingAddress.country ||
            "India",
    });


/* =========================================================
   PLACE ORDER
========================================================= */

exports.placeOrder =
    async (req, res) => {

        try {

            const userId =
                getUserId(req);


            if (!userId) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Authentication required",
                });
            }


            const {
                items,
                shippingAddress,
                paymentMethod,
                paymentType,
                paymentProvider,
                razorpayMethod,
                cardNetwork,
                cardType,
                cardLast4,
                cardIssuer,
                bankName,
                shippingCost = 0,
                discount = 0,
                razorpayOrderId,
                razorpayPaymentId,
                razorpaySignature,
            } = req.body || {};


            if (
                !Array.isArray(items) ||
                items.length === 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Order items are required",
                });
            }


            const normalizedShippingAddress =
                normalizeShippingAddress(
                    shippingAddress
                );


            if (
                !normalizedShippingAddress.line1 ||
                !normalizedShippingAddress.city ||
                !normalizedShippingAddress.state ||
                !normalizedShippingAddress.postalCode
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Complete shipping address is required",
                });
            }


            const resolvedPaymentMethod =
                String(
                    paymentMethod || "cod"
                )
                    .trim()
                    .toLowerCase();


            if (
                !PAYMENT_METHODS.includes(
                    resolvedPaymentMethod
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        `paymentMethod must be one of: ${PAYMENT_METHODS.join(", ")}`,
                });
            }


            /* =================================================
               RAZORPAY VALIDATION
            ================================================= */

            if (
                resolvedPaymentMethod ===
                "razorpay"
            ) {

                if (
                    !razorpayOrderId ||
                    !razorpayPaymentId ||
                    !razorpaySignature
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "Razorpay order ID, payment ID and signature are required",
                    });
                }
            }


            /* =================================================
               DEBUG - RAW ORDER ITEMS
            ================================================= */

            console.log(
                "========================================"
            );

            console.log(
                "ORDER API RAW ITEMS:"
            );

            console.log(
                JSON.stringify(
                    items.map(
                        (item) => ({
                            product:
                                item?.product ||
                                item?.productId,

                            variantId:
                                item?.variantId,

                            variantSku:
                                item?.variantSku,

                            variant:
                                item?.variant,

                            selectedVariant:
                                item?.selectedVariant,

                            variantAttributes:
                                item?.variantAttributes,

                            addons:
                                item?.addons,

                            quantity:
                                item?.quantity,
                        })
                    ),
                    null,
                    2
                )
            );

            console.log(
                "========================================"
            );


            /* =================================================
               NORMALIZE
            ================================================= */

            const {
                orderItems,
                subtotal,
                gstBreakups,
                sellerIds,
            } =
                await normalizeOrderItems(
                    items,
                    normalizedShippingAddress.state
                );


            const safeSubtotal =
                Number.isFinite(
                    Number(subtotal)
                )
                    ? Number(subtotal)
                    : 0;


            const safeShippingCost =
                Math.max(
                    0,
                    Number(shippingCost) || 0
                );


            /* =================================================
               GST TOTAL
            ================================================= */

            const gstTotals =
                calculateOrderTotals({
                    items:
                        gstBreakups,

                    shippingCost:
                        safeShippingCost,

                    discount,
                });


            const safeDiscount =
                gstTotals.discount;

            const positiveShippingCost =
                gstTotals.shippingCost;

            const total =
                gstTotals.grandTotal;


            const isRazorpay =
                resolvedPaymentMethod ===
                "razorpay";


            const requestMetadata =
                await resolveOrderRequestMetadata(
                    req
                );


            /* =================================================
               CREATE ORDER
            ================================================= */

            const order =
                await Order.create({

                    user:
                        userId,

                    items:
                        orderItems,

                    requestMetadata,

                    shippingAddress:
                        normalizedShippingAddress,

                    paymentMethod:
                        resolvedPaymentMethod,

                    paymentType:
                        isRazorpay
                            ? String(
                                paymentType ||
                                "Unknown"
                            )
                            : "Cash on Delivery",

                    paymentProvider:
                        isRazorpay
                            ? String(
                                paymentProvider ||
                                "Razorpay"
                            )
                            : null,

                    razorpayMethod:
                        isRazorpay
                            ? String(
                                razorpayMethod ||
                                ""
                            )
                            : null,

                    cardNetwork:
                        isRazorpay
                            ? String(
                                cardNetwork ||
                                ""
                            )
                            : null,

                    cardType:
                        isRazorpay
                            ? String(
                                cardType ||
                                ""
                            )
                            : null,

                    cardLast4:
                        isRazorpay
                            ? String(
                                cardLast4 ||
                                ""
                            )
                            : null,

                    cardIssuer:
                        isRazorpay
                            ? String(
                                cardIssuer ||
                                ""
                            )
                            : null,

                    bankName:
                        isRazorpay
                            ? String(
                                bankName ||
                                ""
                            )
                            : null,

                    paymentStatus:
                        isRazorpay
                            ? "Paid"
                            : "Pending",

                    razorpayOrderId:
                        isRazorpay
                            ? String(
                                razorpayOrderId
                            )
                            : null,

                    razorpayPaymentId:
                        isRazorpay
                            ? String(
                                razorpayPaymentId
                            )
                            : null,

                    razorpaySignature:
                        isRazorpay
                            ? String(
                                razorpaySignature
                            )
                            : null,

                    subtotal:
                        safeSubtotal,

                    discount:
                        safeDiscount,

                    shippingCost:
                        positiveShippingCost,

                    tax:
                        gstTotals.gstAmount,

                    taxableAmount:
                        gstTotals.taxableAmount,

                    cgstAmount:
                        gstTotals.cgstAmount,

                    sgstAmount:
                        gstTotals.sgstAmount,

                    igstAmount:
                        gstTotals.igstAmount,

                    gstAmount:
                        gstTotals.gstAmount,

                    total,

                    grandTotal:
                        total,

                    status:
                        isRazorpay
                            ? "Confirmed"
                            : "Pending",
                });


            /* =================================================
               POPULATE ORDER
            ================================================= */

            const populatedOrder =
                await Order.findById(
                    order._id
                )
                    .populate(
                        "user",
                        "name email"
                    )
                    .populate(
                        "items.product",
                        "name price image"
                    );


            console.log(
                "Order created:",
                order.orderNumber
            );


            /* =================================================
               SELLER NOTIFICATIONS
            ================================================= */

            if (
                sellerIds.length > 0
            ) {

                const notifications =
                    sellerIds.map(
                        (sellerId) => ({
                            seller:
                                sellerId,

                            order:
                                order._id,

                            type:
                                "NEW_ORDER",

                            title:
                                "New Order Received",

                            message:
                                `You have received a new order #${order.orderNumber}`,

                            isRead:
                                false,
                        })
                    );


                try {

                    await SellerNotification
                        .insertMany(
                            notifications
                        );

                } catch (
                notifyError
                ) {

                    console.error(
                        "Seller notification error:",
                        notifyError
                    );
                }
            }


            /* =================================================
               EMAIL
            ================================================= */

            if (
                populatedOrder?.user?.email
            ) {

                sendOrderConfirmationEmail(
                    populatedOrder
                )
                    .then((info) => {

                        console.log(
                            "Order confirmation email sent:",
                            populatedOrder.orderNumber
                        );

                        console.log(
                            "Message ID:",
                            info?.messageId
                        );

                    })
                    .catch(
                        (emailError) => {

                            console.error(
                                "Order confirmation email error:",
                                emailError.message
                            );
                        }
                    );

            } else {

                console.error(
                    "Order confirmation email skipped: user email not found"
                );
            }


            /* =================================================
               RESPONSE
            ================================================= */

            return res.status(201).json({

                success: true,

                message:
                    "Order placed successfully",

                order:
                    populatedOrder ||
                    order,
            });


        } catch (error) {

            console.error(
                "Place order error:",
                error
            );

            return res.status(
                error.status || 500
            ).json({

                success: false,

                message:
                    error.message ||
                    "Failed to place order",
            });
        }
    };


/* =========================================================
   BUYER ORDERS
========================================================= */

exports.buyerOrders =
    async (req, res) => {

        try {

            const userId =
                getUserId(req);


            if (
                req.user?.role === "seller" ||
                req.query?.sellerId
            ) {
                return exports.sellerOrders(
                    req,
                    res
                );
            }


            if (!userId) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Authentication required",
                });
            }


            const orders =
                await Order.find({
                    user: userId,
                })
                    .populate(
                        "items.product"
                    )
                    .sort({
                        createdAt: -1,
                    });


            return res.status(200).json({

                success: true,

                count:
                    orders.length,

                data:
                    orders,
            });


        } catch (error) {

            console.error(
                "Buyer orders error:",
                error
            );

            return res.status(
                error.status || 500
            ).json({

                success: false,

                message:
                    error.message ||
                    "Failed to fetch orders",
            });
        }
    };


exports.orderHistory =
    exports.buyerOrders;


/* =========================================================
   ORDER DETAILS
========================================================= */

exports.orderDetails =
    async (req, res) => {

        try {

            const userId =
                getUserId(req);

            const orderId =
                req.params.id;


            if (!userId) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Authentication required",
                });
            }


            if (
                !isValidObjectId(
                    orderId
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid order ID",
                });
            }


            const order =
                await Order.findOne({
                    _id: orderId,
                    user: userId,
                })
                    .populate(
                        "items.product"
                    );


            if (!order) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Order not found",
                });
            }


            return res.status(200).json({

                success: true,

                data:
                    order,
            });


        } catch (error) {

            console.error(
                "Order details error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Failed to fetch order details",
            });
        }
    };


/* =========================================================
   SELLER ORDERS
========================================================= */

exports.sellerOrders =
    async (req, res) => {

        try {

            const userId =
                getUserId(req);


            const seller =
                await requireRole(
                    userId,
                    [
                        "seller",
                        "admin"
                    ]
                );


            const sellerProductIds =
                await getSellerProductIds(
                    seller._id
                );


            if (
                sellerProductIds.length === 0
            ) {

                return res.status(200).json({

                    success: true,

                    count: 0,

                    data: [],
                });
            }


            const orders =
                await Order.find({

                    "items.product": {
                        $in:
                            sellerProductIds,
                    },

                })
                    .populate(
                        "items.product"
                    )
                    .populate(
                        "user",
                        "name email role"
                    )
                    .sort({
                        createdAt: -1,
                    });


            return res.status(200).json({

                success: true,

                count:
                    orders.length,

                data:
                    orders,
            });


        } catch (error) {

            console.error(
                "Seller orders error:",
                error
            );

            return res.status(
                error.status || 500
            ).json({

                success: false,

                message:
                    error.message ||
                    "Failed to fetch seller orders",
            });
        }
    };


/* =========================================================
   UPDATE SELLER ORDER STATUS
========================================================= */

exports.updateSellerOrderStatus =
    async (req, res) => {

        try {

            const userId =
                getUserId(req);

            const orderId =
                req.params.id;


            const seller =
                await requireRole(
                    userId,
                    [
                        "seller",
                        "admin"
                    ]
                );


            const {
                status
            } =
                req.body || {};


            if (
                !ORDER_STATUS.includes(
                    status
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        `status must be one of: ${ORDER_STATUS.join(", ")}`,
                });
            }


            if (
                !isValidObjectId(
                    orderId
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order ID",
                });
            }


            const sellerProductIds =
                await getSellerProductIds(
                    seller._id
                );


            if (
                sellerProductIds.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "No products found for this seller",
                });
            }


            const order =
                await Order.findOne({

                    _id:
                        orderId,

                    "items.product": {
                        $in:
                            sellerProductIds,
                    },

                })
                    .populate(
                        "items.product"
                    );


            if (!order) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found",
                });
            }


            if (
                order.status ===
                "Cancelled" &&
                status !== "Cancelled"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Cancelled orders cannot be updated",
                });
            }


            if (
                order.status ===
                "Delivered" &&
                status !== "Delivered"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Delivered orders cannot be changed",
                });
            }


            order.status =
                status;

            await order.save();


            return res.status(200).json({

                success: true,

                message:
                    "Order status updated successfully",

                data:
                    order,
            });


        } catch (error) {

            console.error(
                "Update seller order status error:",
                error
            );

            return res.status(
                error.status || 500
            ).json({

                success: false,

                message:
                    error.message ||
                    "Failed to update order status",
            });
        }
    };


/* =========================================================
   ADMIN ORDERS
========================================================= */

exports.adminOrders =
    async (req, res) => {

        try {

            const userId =
                getUserId(req);


            await requireRole(
                userId,
                ["admin"]
            );


            const orders =
                await Order.find()
                    .populate(
                        "items.product"
                    )
                    .populate(
                        "user",
                        "name email role"
                    )
                    .sort({
                        createdAt: -1,
                    });


            return res.status(200).json({

                success: true,

                count:
                    orders.length,

                data:
                    orders,
            });


        } catch (error) {

            console.error(
                "Admin orders error:",
                error
            );

            return res.status(
                error.status || 500
            ).json({

                success: false,

                message:
                    error.message ||
                    "Failed to fetch orders",
            });
        }
    };


/* =========================================================
   ADMIN ORDER DETAILS
========================================================= */

exports.adminOrderDetails =
    async (req, res) => {

        try {

            const userId =
                getUserId(req);

            const orderId =
                req.params.id;


            await requireRole(
                userId,
                ["admin"]
            );


            if (
                !isValidObjectId(
                    orderId
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order ID",
                });
            }


            const order =
                await Order.findById(
                    orderId
                )
                    .populate(
                        "items.product"
                    )
                    .populate(
                        "user",
                        "name email role"
                    );


            if (!order) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found",
                });
            }


            return res.status(200).json({

                success: true,

                data:
                    order,
            });


        } catch (error) {

            console.error(
                "Admin order details error:",
                error
            );

            return res.status(
                error.status || 500
            ).json({

                success: false,

                message:
                    error.message ||
                    "Failed to fetch order details",
            });
        }
    };


/* =========================================================
   CANCEL ORDER
========================================================= */

exports.cancelOrder =
    async (req, res) => {

        try {

            const userId =
                getUserId(req);

            const orderId =
                req.params.id;


            if (!userId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required",
                });
            }


            if (
                !isValidObjectId(
                    orderId
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order ID",
                });
            }


            const order =
                await Order.findOne({

                    _id:
                        orderId,

                    user:
                        userId,
                });


            if (!order) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found",
                });
            }


            if (
                order.status ===
                "Cancelled"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Order already cancelled",
                });
            }


            if (
                [
                    "Shipped",
                    "Delivered"
                ].includes(
                    order.status
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        `Order cannot be cancelled after it is ${order.status.toLowerCase()}`,
                });
            }


            order.status =
                "Cancelled";

            await order.save();


            return res.status(200).json({

                success: true,

                message:
                    "Order cancelled successfully",

                data:
                    order,
            });


        } catch (error) {

            console.error(
                "Cancel order error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Failed to cancel order",
            });
        }
    };


/* =========================================================
   DELETE BUYER ORDER HISTORY
========================================================= */

exports.deleteBuyerOrderHistory =
    async (req, res) => {

        try {

            const userId =
                getUserId(req);

            const orderId =
                req.params.id;


            if (!userId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required",
                });
            }


            if (
                !isValidObjectId(
                    orderId
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order ID",
                });
            }


            const order =
                await Order.findOne({

                    _id:
                        orderId,

                    user:
                        userId,
                });


            if (!order) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found",
                });
            }


            /* Only delivered orders
               can be removed. */

            if (
                order.status !==
                "Delivered"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Only delivered orders can be deleted from history",
                });
            }


            await Order.deleteOne({

                _id:
                    order._id,
            });


            return res.status(200).json({

                success: true,

                message:
                    "Order removed from history",
            });


        } catch (error) {

            console.error(
                "Delete buyer order history error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Failed to delete order history",
            });
        }
    };