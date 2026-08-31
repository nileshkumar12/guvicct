const Order = require("../models/orderModel");
const User = require("../models/userModel");
const Store = require("../models/storeModel");
const Product = require("../models/productModel");
const Review = require("../models/reviewModel");

exports.getAdminDashboard = async (req, res) => {
    try {
        const now = new Date();
        const currentMonthStart = new Date(
            now.getFullYear(),
            now.getMonth(), 1);

        const previousMonthStart = new Date(
            now.getFullYear(),
            now.getMonth() - 1, 1);

        const currentMonthEnd = new Date(
            now.getFullYear(),
            now.getMonth() + 1, 1);

        const [totalOrders, totalUsers, totalSellers, activeSellers, activeProducts] = await Promise.all([
            Order.countDocuments(),
            User.countDocuments({
                role: "buyer"
            }),

            User.countDocuments({
                role: "seller"
            }),

            Store.countDocuments({
                status: "active"
            }),

            Product.countDocuments({
                stock: {
                    $gt: 0
                }
            })
        ]);

        const totalRevenueResult = await Order.aggregate([
            {
                $match: {
                    paymentStatus: "Paid"
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: "$total"
                    }
                }
            }
        ]);

        const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;
        const currentMonthRevenueResult =
            await Order.aggregate([
                {
                    $match: {
                        paymentStatus: "Paid",
                        createdAt: {
                            $gte: currentMonthStart,
                            $lt: currentMonthEnd
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        revenue: {
                            $sum: "$total"
                        }
                    }
                }
            ]);

        const currentMonthRevenue = currentMonthRevenueResult[0]?.revenue || 0;

        const previousMonthRevenueResult =
            await Order.aggregate([
                {
                    $match: {
                        paymentStatus: "Paid",
                        createdAt: {
                            $gte: previousMonthStart,
                            $lt: currentMonthStart
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        revenue: {
                            $sum: "$total"
                        }
                    }
                }
            ]);

        const previousMonthRevenue = previousMonthRevenueResult[0]?.revenue || 0;
        let revenueGrowth = 0;

        if (previousMonthRevenue > 0) {
            revenueGrowth =
                ((currentMonthRevenue - previousMonthRevenue) /
                    previousMonthRevenue) *
                100;
        }

        const currentMonthOrders = await Order.countDocuments({
            createdAt: {
                $gte: currentMonthStart,
                $lt: currentMonthEnd
            }
        });

        const previousMonthOrders = await Order.countDocuments({
            createdAt: {
                $gte: previousMonthStart,
                $lt: currentMonthStart
            }
        });

        let orderGrowth = 0;

        if (previousMonthOrders > 0) {
            orderGrowth =
                ((currentMonthOrders - previousMonthOrders) /
                    previousMonthOrders) *
                100;
        }

        const currentMonthUsers = await User.countDocuments({
            role: "buyer",
            createdAt: {
                $gte: currentMonthStart,
                $lt: currentMonthEnd
            }
        });

        const previousMonthUsers = await User.countDocuments({
            role: "buyer",
            createdAt: {
                $gte: previousMonthStart,
                $lt: currentMonthStart
            }
        });

        let userGrowth = 0;

        if (previousMonthUsers > 0) {
            userGrowth =
                ((currentMonthUsers - previousMonthUsers) /
                    previousMonthUsers) *
                100;
        }

        const currentMonthSellers = await User.countDocuments({
            role: "seller",
            createdAt: {
                $gte: currentMonthStart,
                $lt: currentMonthEnd
            }
        });

        const previousMonthSellers = await User.countDocuments({
            role: "seller",
            createdAt: {
                $gte: previousMonthStart,
                $lt: currentMonthStart
            }
        });

        let sellerGrowth = 0;

        if (previousMonthSellers > 0) {
            sellerGrowth =
                ((currentMonthSellers - previousMonthSellers) /
                    previousMonthSellers) *
                100;
        }

        const deliveredOrders = await Order.countDocuments({
            status: "Delivered"
        });

        const successfulOrderRate =
            totalOrders > 0
                ? (deliveredOrders / totalOrders) * 100
                : 0;

        const ratingResult = await Review.aggregate([
            {
                $match: {
                    status: "APPROVED"
                }
            },
            {
                $group: {
                    _id: null,
                    averageRating: {
                        $avg: "$rating"
                    }
                }
            }
        ]);

        const averageRating =
            ratingResult[0]?.averageRating || 0;

        const customerSatisfaction =
            (averageRating / 5) * 100;

        const monthlyRevenue = await Order.aggregate([
            {
                $match: {
                    paymentStatus: "Paid"
                }
            },
            {
                $group: {
                    _id: {
                        month: {
                            $month: "$createdAt"
                        },
                        year: {
                            $year: "$createdAt"
                        }
                    },

                    revenue: {
                        $sum: "$total"
                    }
                }
            },
            {
                $sort: {
                    "_id.year": 1,
                    "_id.month": 1
                }
            }
        ]);


        const recentOrders = await Order.find()
            .populate("user", "name email")
            .populate("items.seller", "name email")
            .populate("items.store", "storeName")
            .sort({
                createdAt: -1
            })
            .limit(5)
            .lean();


        const topSellers = await Order.aggregate([
            {
                $match: {
                    paymentStatus: "Paid"
                }
            },

            {
                $unwind: "$items"
            },

            {
                $group: {
                    _id: "$items.seller",

                    revenue: {
                        $sum: "$items.total"
                    },

                    orders: {
                        $addToSet: "$_id"
                    }
                }
            },

            {
                $sort: {
                    revenue: -1
                }
            },

            {
                $limit: 5
            },

            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "seller"
                }
            },

            {
                $unwind: "$seller"
            },

            {
                $lookup: {
                    from: "stores",
                    localField: "_id",
                    foreignField: "owner",
                    as: "store"
                }
            },

            {
                $unwind: {
                    path: "$store",
                    preserveNullAndEmptyArrays: true
                }
            },

            {
                $project: {
                    _id: 0,
                    sellerId: "$seller._id",
                    sellerName: "$seller.name",
                    sellerEmail: "$seller.email",
                    storeName: "$store.storeName",
                    status: "$store.status",
                    revenue: 1,
                    orderCount: {
                        $size: "$orders"
                    }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            stats: {
                totalRevenue,
                totalOrders,
                totalUsers,
                totalSellers
            },
            growth: {
                revenue: Number(revenueGrowth.toFixed(2)),
                orders: Number(orderGrowth.toFixed(2)),
                users: Number(userGrowth.toFixed(2)),
                sellers: Number(sellerGrowth.toFixed(2))
            },

            platform: {
                activeSellers,
                totalSellers,
                activeProducts,
                successfulOrders: Number(
                    successfulOrderRate.toFixed(2)
                ),
                customerSatisfaction: Number(
                    customerSatisfaction.toFixed(2)
                )
            },

            revenueOverview: monthlyRevenue,
            recentOrders,
            topSellers
        });

    } catch (error) {
        console.error(
            "Admin dashboard error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load admin dashboard",
            error: error.message
        });
    }
};