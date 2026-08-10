const Store = require("../models/storeModel");

exports.createStore = async (req, res) => {
  try {
    const sellerId = req.user._id;

    const {
      storeName,
      slug,
      logo,
      banner,
      description,
      phone,
      email,
      address,
      gstNumber,
      category,
      panNumber,
      openingTime,
      closingTime,
    } = req.body;


    if (!storeName) {
      return res.status(400).json({
        success: false,
        message: "Store name is required",
      });
    }


    const existingStore = await Store.findOne({
      owner: sellerId,
    });

    if (existingStore) {
      return res.status(409).json({
        success: false,
        message: "You already have a store",
        store: existingStore,
      });
    }


    const storeSlug =
      slug ||
      storeName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");


    const existingSlug = await Store.findOne({
      slug: storeSlug,
    });

    if (existingSlug) {
      return res.status(409).json({
        success: false,
        message: "Store slug already exists",
      });
    }

    const store = await Store.create({
      owner: sellerId,
      storeName,
      slug: storeSlug,
      logo: logo || "",
      banner: banner || "",
      description: description || "",
      phone: phone || "",
      email: email || "",
      address: address || {},
      gstNumber: gstNumber || "",
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Store created successfully",
      store,
    });
  } catch (error) {
    console.error("Create Store Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create store",
      error: error.message,
    });
  }
};

exports.getMyStore = async (req, res) => {
  try {
    const sellerId = req.user._id;

    const store = await Store.findOne({
      owner: sellerId,
    }).populate("owner", "name email");

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    return res.status(200).json({
      success: true,
      store,
    });
  } catch (error) {
    console.error("Get My Store Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch store",
      error: error.message,
    });
  }
};


exports.getStoreById = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id).populate(
      "owner",
      "name email"
    );

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    return res.status(200).json({
      success: true,
      store,
    });
  } catch (error) {
    console.error("Get Store Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch store",
      error: error.message,
    });
  }
};


exports.getStoreBySlug = async (req, res) => {
  try {
    const store = await Store.findOne({
      slug: req.params.slug,
      status: "active",
    }).populate("owner", "name");

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    return res.status(200).json({
      success: true,
      store,
    });
  } catch (error) {
    console.error("Get Store By Slug Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch store",
      error: error.message,
    });
  }
};



exports.updateMyStore = async (req, res) => {
  try {
    const sellerId = req.user._id;

    const {
      storeName,
      slug,
      logo,
      banner,
      description,
      phone,
      email,
      address,
      gstNumber,
       category,
      panNumber,
      openingTime,
      closingTime,
    } = req.body;

    const store = await Store.findOne({
      owner: sellerId,
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    // Check slug uniqueness
    if (slug && slug !== store.slug) {
      const existingSlug = await Store.findOne({
        slug: slug.toLowerCase(),
        _id: { $ne: store._id },
      });

      if (existingSlug) {
        return res.status(409).json({
          success: false,
          message: "Store slug already exists",
        });
      }

      store.slug = slug.toLowerCase();
    }

    if (storeName !== undefined) {
      store.storeName = storeName;
    }

    if (logo !== undefined) {
      store.logo = logo;
    }

    if (banner !== undefined) {
      store.banner = banner;
    }

    if (description !== undefined) {
      store.description = description;
    }

    if (phone !== undefined) {
      store.phone = phone;
    }

    if (email !== undefined) {
      store.email = email;
    }

    if (address !== undefined) {
      store.address = address;
    }

    if (gstNumber !== undefined) {
      store.gstNumber = gstNumber;
    }

    if (category !== undefined) {
      store.category = category;
    } 

     if (closingTime !== undefined) {
      store.closingTime = closingTime;
    } 

     if (openingTime !== undefined) {
      store.openingTime = openingTime;
    } 

     if (panNumber !== undefined) {
      store.panNumber = panNumber;
    } 


    await store.save();

    return res.status(200).json({
      success: true,
      message: "Store updated successfully",
      store,
    });
  } catch (error) {
    console.error("Update Store Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update store",
      error: error.message,
    });
  }
};


exports.deleteMyStore = async (req, res) => {
  try {
    const sellerId = req.user._id;

    const store = await Store.findOne({
      owner: sellerId,
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    await Store.findByIdAndDelete(store._id);

    return res.status(200).json({
      success: true,
      message: "Store deleted successfully",
    });
  } catch (error) {
    console.error("Delete Store Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete store",
      error: error.message,
    });
  }
};