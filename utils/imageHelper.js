const isBase64Image = (value) => {
  return (
    typeof value === 'string' &&
    /^data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
  );
};

module.exports = {
  isBase64Image,
};