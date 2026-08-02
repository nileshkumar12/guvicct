exports.createProduct = async (req, res) => {
  try {
    const seller = await requireSeller(req.user.id);

      const {
      name,
      description,
      category,
      brand,
      price,
      rating,
      stock,
    } = req.body || {};


    if (!name || !category || !price) {
      return res.status(400).json({
        success: false,
        message: 'Name, category and price are required',
      });
    }

 const image = req.file ? `/uploads/${req.file.filename}` : '';

    const product = await Product.create({
      name,
      description,
      category,
      brand,
      price,
      rating,
      stock,
      image,
      seller: seller._id,
    });

    return res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server Error',
    });
  }
};