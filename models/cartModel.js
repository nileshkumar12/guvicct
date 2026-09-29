const mongoose = require('mongoose');

const selectedAddonSchema = new mongoose.Schema(
  {
    addonId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    name: {
      type: String,
      trim: true,
      default: '',
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    total: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const selectedVariantSchema = new mongoose.Schema(
  {
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    sku: {
      type: String,
      trim: true,
      default: '',
    },

    name: {
      type: String,
      trim: true,
      default: '',
    },

    attributes: {
      type: Map,
      of: String,
      default: {},
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    image: {
      type: String,
      default: '',
    },

    images: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    productName: {
      type: String,
      trim: true,
      default: '',
    },

    productImage: {
      type: String,
      default: '',
    },


    brand: {
      brandId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },

      name: {
        type: String,
        trim: true,
        default: '',
      },

      slug: {
        type: String,
        trim: true,
        default: '',
      },

      logo: {
        type: String,
        default: '',
      },
    },

    variant: {
      type: selectedVariantSchema,
      default: null,
    },


    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    variantSku: {
      type: String,
      trim: true,
      default: '',
    },


    selectedAttributes: {
      type: Map,
      of: String,
      default: {},
    },


    addons: {
      type: [selectedAddonSchema],
      default: [],
    },


    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },


    price: {
      type: Number,
      required: true,
      min: 0,
    },


    addonTotal: {
      type: Number,
      default: 0,
      min: 0,
    },


    total: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: true,
    timestamps: true,
  }
);



const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'carts',
  }
);

module.exports = mongoose.model('Cart', cartSchema);
